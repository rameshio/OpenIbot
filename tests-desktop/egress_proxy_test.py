import importlib.util
import io
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('egress', ROOT / 'containers' / 'egress_proxy.py')
egress = importlib.util.module_from_spec(spec)
spec.loader.exec_module(egress)

class EgressTests(unittest.TestCase):
    def test_policy_is_empty_on_missing_or_malformed_file(self):
        with tempfile.TemporaryDirectory() as folder:
            file = pathlib.Path(folder) / 'policy.json'
            self.assertEqual(egress.allowed_hosts(file), set())
            file.write_text('{bad')
            self.assertEqual(egress.allowed_hosts(file), set())
            file.write_text(json.dumps({'hosts': ['example.com']}))
            self.assertEqual(egress.allowed_hosts(file), {'example.com'})

    def test_unapproved_host_never_resolves_and_no_suffix_grants(self):
        with patch.object(egress.socket, 'getaddrinfo') as dns:
            for host in ['evil.com', 'sub.example.com', 'example.com.evil.com']:
                with self.assertRaises(egress.Denied):
                    egress.destination(host, 443, {'example.com'})
            dns.assert_not_called()

    def test_private_reserved_mixed_and_metadata_addresses_are_denied(self):
        for ip in ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.0.1', '169.254.169.254', '0.0.0.0', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '224.0.0.1']:
            with patch.object(egress.socket, 'getaddrinfo', return_value=[(2, 1, 6, '', (ip, 443))]):
                with self.assertRaises(egress.Denied, msg=ip):
                    egress.destination('example.com', 443, {'example.com'})
        with patch.object(egress.socket, 'getaddrinfo', return_value=[(2, 1, 6, '', ('93.184.216.34', 443)), (2, 1, 6, '', ('127.0.0.1', 443))]):
            with self.assertRaises(egress.Denied):
                egress.destination('example.com', 443, {'example.com'})

    def test_resolution_returns_pinned_address_and_only_web_ports(self):
        with patch.object(egress.socket, 'getaddrinfo', return_value=[(2, 1, 6, '', ('93.184.216.34', 443))]) as dns:
            self.assertEqual(egress.destination('example.com', 443, {'example.com'}), '93.184.216.34')
            dns.assert_called_once()
        for port in [22, 25, 8080]:
            with self.assertRaises(egress.Denied):
                egress.destination('example.com', port, {'example.com'})

    def test_authority_validation_and_logs_never_include_request_data(self):
        for authority in ['user:secret@example.com:443', 'example.com:22', 'example.com:443/path', 'example.com\r\nHost:evil.com']:
            with self.assertRaises(egress.Denied):
                egress.connect_target(authority)
        self.assertEqual(egress.connect_target('Example.COM:443'), ('example.com', 443))
        with patch('sys.stdout', new_callable=io.StringIO) as output:
            egress.audit('example.com', 443, 'CONNECT', 'deny')
            record = json.loads(output.getvalue())
            self.assertEqual(set(record), {'time', 'host', 'port', 'method', 'decision'})

if __name__ == '__main__':
    unittest.main()
