"""Run a bot shell command with bounded output, timeout, and group cancellation."""
import json
import os
import re
import selectors
import signal
import subprocess
import sys
import time

JOBS = "/tmp/ibot-jobs"
OUTPUT_LIMIT = 2 * 1024 * 1024


def job_path(identifier):
    if not re.fullmatch(r"[a-f0-9-]{36}", identifier):
        raise ValueError("Invalid command identifier")
    return os.path.join(JOBS, identifier + ".pid")


def stop_group(pid):
    try:
        os.killpg(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


def cancel(identifier):
    path = job_path(identifier)
    try:
        with open(path) as file:
            pid = int(file.read())
        if pid > 1:
            stop_group(pid)
    except FileNotFoundError:
        # Cancellation can arrive before the shell has been spawned.
        with open(path + ".cancel", "w") as file:
            file.write("cancelled")


def run(request):
    os.makedirs(JOBS, mode=0o700, exist_ok=True)
    path = job_path(request["id"])
    if os.path.exists(path + ".cancel"):
        os.unlink(path + ".cancel")
        return {"stdout": "", "stderr": "Command cancelled", "exitCode": 130}
    command = request["command"]
    if not isinstance(command, str) or len(command) > 131072:
        raise ValueError("Command is too long")
    child = subprocess.Popen(["/bin/bash", "-lc", command], cwd="/workspace",
                             stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                             stderr=subprocess.PIPE, start_new_session=True)
    with open(path, "w") as file:
        file.write(str(child.pid))
    if os.path.exists(path + ".cancel"):
        stop_group(child.pid)
    selector = selectors.DefaultSelector()
    selector.register(child.stdout, selectors.EVENT_READ, "stdout")
    selector.register(child.stderr, selectors.EVENT_READ, "stderr")
    output = {"stdout": bytearray(), "stderr": bytearray()}
    deadline = time.monotonic() + min(600, max(1, request.get("timeout", 120)))
    timed_out = False
    truncated = False
    try:
        while selector.get_map():
            if time.monotonic() >= deadline:
                timed_out = True
                stop_group(child.pid)
                deadline = float("inf")
            for key, _ in selector.select(0.2):
                chunk = os.read(key.fd, 65536)
                if not chunk:
                    selector.unregister(key.fileobj)
                    continue
                remaining = OUTPUT_LIMIT - len(output[key.data])
                output[key.data].extend(chunk[:max(0, remaining)])
                if len(chunk) > remaining:
                    truncated = True
                    stop_group(child.pid)
        exit_code = child.wait()
        result = {name: data.decode("utf-8", "replace") for name, data in output.items()}
        if timed_out:
            result["stderr"] += "\nCommand exceeded the 120-second runtime limit."
        if truncated:
            result["stderr"] += "\nCommand stopped: output exceeded 2 MiB per stream."
        result["exitCode"] = 124 if timed_out else (137 if truncated else exit_code)
        return result
    finally:
        selector.close()
        child.stdout.close()
        child.stderr.close()
        for file_path in (path, path + ".cancel"):
            try:
                os.unlink(file_path)
            except FileNotFoundError:
                pass


if __name__ == "__main__":
    try:
        if len(sys.argv) == 3 and sys.argv[1] == "--cancel":
            cancel(sys.argv[2])
        else:
            print(json.dumps(run(json.load(sys.stdin))))
    except Exception as error:
        print(json.dumps({"stdout": "", "stderr": str(error), "exitCode": 1}))
        sys.exit(1)
