"""Destination-only HTTP proxy. Agent containers have no external route.

TLS CONNECT is opaque: approved hosts may receive arbitrary data. This does not
classify remote actions or inject credentials. Policy is mounted read-only from
the host, never from an agent volume. Logs omit paths, headers and body data.
"""
import datetime
import http.server
import ipaddress
import json
import os
import pathlib
import re
import select
import socket
import socketserver
import threading
import time
import urllib.parse

POLICY = pathlib.Path('/run/ibot-egress/policy.json')
LIMIT = threading.BoundedSemaphore(32)
HOST = re.compile(r'(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$', re.I)

class Denied(Exception):
    pass

def allowed_hosts(file=POLICY):
    try:
        data = json.loads(file.read_text())
        hosts = data['hosts']
        if not isinstance(hosts, list) or len(hosts) > 100:
            return set()
        if any(not isinstance(host, str) or not HOST.fullmatch(host) for host in hosts):
            return set()
        return {host.lower() for host in hosts}
    except (OSError, ValueError, KeyError, TypeError):
        return set()

def destination(host, port, hosts):
    host = host.lower()
    if not HOST.fullmatch(host) or host not in hosts or port not in (80, 443):
        raise Denied()
    # Resolve once and connect to that numeric address, avoiding a second DNS lookup.
    addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    if not addresses:
        raise Denied()
    for address in addresses:
        ip = ipaddress.ip_address(address[4][0])
        if not ip.is_global or ip.is_multicast or ip.is_reserved:
            raise Denied()
    return addresses[0][4][0]

def connect_target(value):
    match = re.fullmatch(r'([a-z0-9.-]+):443', value, re.I)
    if not match or not HOST.fullmatch(match[1]):
        raise Denied()
    return match[1].lower(), 443

def audit(host, port, method, decision):
    print(json.dumps({'time': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                      'host': host if HOST.fullmatch(host) else '[invalid]',
                      'port': port, 'method': method, 'decision': decision}), flush=True)

class Proxy(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.0'
    rbufsize = 0
    def log_message(self, *args):
        pass  # Base logging contains the request path, which can contain secrets.

    def handle_one_request(self):
        self.connection.settimeout(20)
        super().handle_one_request()

    def transfer(self, upstream, host):
        sockets = [self.connection, upstream]
        deadline = time.monotonic() + 120
        while host in allowed_hosts() and time.monotonic() < deadline:
            readable, _, _ = select.select(sockets, [], [], 1)
            if not readable:
                continue
            for source in readable:
                data = source.recv(65536)
                if not data:
                    return
                (upstream if source is self.connection else self.connection).sendall(data)

    def proxy(self, tunnel=False):
        host, port = '[invalid]', 0
        dispatched = False
        upstream = None
        if not LIMIT.acquire(blocking=False):
            self.send_error(503, 'Gateway busy')
            return
        try:
            if tunnel:
                host, port = connect_target(self.path)
            else:
                url = urllib.parse.urlsplit(self.path)
                if url.scheme != 'http' or url.username or url.password or url.fragment:
                    raise Denied()
                host, port = url.hostname or '', url.port or 80
                if port != 80:
                    raise Denied()
            ip = destination(host, port, allowed_hosts())
            if host not in allowed_hosts():
                raise Denied()
            upstream = socket.create_connection((ip, port), timeout=20)
            if host not in allowed_hosts():
                raise Denied()
            if tunnel:
                self.send_response(200, 'Connection established')
                self.end_headers()
                dispatched = True
                audit(host, port, 'CONNECT', 'allow')
                self.transfer(upstream, host)
            else:
                if self.headers.get('Transfer-Encoding') or self.headers.get('Upgrade'):
                    raise Denied()
                lengths = self.headers.get_all('Content-Length') or ['0']
                if len(lengths) != 1 or not re.fullmatch(r'\d+', lengths[0]):
                    raise Denied()
                size = int(lengths[0])
                if size > 64 * 1024 * 1024:
                    raise Denied()
                body = self.rfile.read(size)
                if len(body) != size or host not in allowed_hosts():
                    raise Denied()
                path = urllib.parse.urlunsplit(('', '', url.path or '/', url.query, ''))
                headers = [(key, value) for key, value in self.headers.items()
                           if key.lower() not in ('host', 'connection', 'proxy-connection', 'proxy-authorization', 'keep-alive', 'upgrade', 'te', 'trailer')]
                if any('\r' in value or '\n' in value for _, value in headers):
                    raise Denied()
                request = f'{self.command} {path} HTTP/1.0\r\nHost: {host}\r\nConnection: close\r\n'
                request += ''.join(f'{key}: {value}\r\n' for key, value in headers) + '\r\n'
                upstream.sendall(request.encode('latin1') + body)
                dispatched = True
                audit(host, port, self.command, 'allow')
                while host in allowed_hosts():
                    data = upstream.recv(65536)
                    if not data:
                        break
                    self.connection.sendall(data)
        except (Denied, OSError, ValueError):
            if not dispatched:
                audit(host, port, 'CONNECT' if tunnel else self.command, 'deny')
                self.send_error(403, 'Destination blocked. Review this bot\'s allowed hosts in Settings > Computers.')
        finally:
            if upstream:
                upstream.close()
            self.close_connection = True
            LIMIT.release()

    def do_CONNECT(self):
        self.proxy(True)
    do_GET = do_POST = do_PUT = do_PATCH = do_DELETE = do_HEAD = do_OPTIONS = proxy

class DesktopForward(socketserver.BaseRequestHandler):
    """Published loopback desktop ingress; fixed workspace target, never a proxy."""
    def handle(self):
        try:
            with socket.create_connection(('workspace', 6080), timeout=10) as upstream:
                sockets = [self.request, upstream]
                while True:
                    readable, _, _ = select.select(sockets, [], [], 60)
                    if not readable:
                        return
                    for source in readable:
                        data = source.recv(65536)
                        if not data:
                            return
                        (upstream if source is self.request else self.request).sendall(data)
        except OSError:
            pass

class DesktopServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

if __name__ == '__main__':
    desktop = DesktopServer(('0.0.0.0', 6080), DesktopForward)
    threading.Thread(target=desktop.serve_forever, daemon=True).start()
    server = http.server.ThreadingHTTPServer(('0.0.0.0', 3128), Proxy)
    server.daemon_threads = True
    server.serve_forever()
