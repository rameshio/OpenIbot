"""Workspace file bridge. Every component is opened relative to a pinned dirfd.

No symlink traversal, host mounts, or caller-selected filesystem root. Commands
inside the bot may use its home, but this attachment bridge only exposes workspace.
"""
import base64
import json
import os
import stat
import sys

ROOT = "/workspace"
MAX_BYTES = 64 * 1024 * 1024


def components(path):
    if not isinstance(path, str) or "\x00" in path or "\\" in path:
        raise ValueError("Invalid workspace path")
    if path != ROOT and not path.startswith(ROOT + "/"):
        raise ValueError("Path must be inside /workspace")
    parts = path[len(ROOT):].split("/")
    if any(part in ("..", ".") for part in parts):
        raise ValueError("Path traversal is not allowed")
    return [part for part in parts if part]


def open_directory(parts, create=False):
    current = os.open(ROOT, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        for part in parts:
            if create:
                try:
                    os.mkdir(part, mode=0o700, dir_fd=current)
                except FileExistsError:
                    pass
            following = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=current)
            os.close(current)
            current = following
        return current
    except BaseException:
        os.close(current)
        raise


def run(request):
    operation = request.get("op")
    parts = components(request.get("path", ROOT))
    if operation == "list":
        directory = open_directory(parts)
        try:
            result = []
            for name in sorted(os.listdir(directory)):
                info = os.stat(name, dir_fd=directory, follow_symlinks=False)
                if not (stat.S_ISREG(info.st_mode) or stat.S_ISDIR(info.st_mode)):
                    continue
                result.append({"name": name, "path": "/".join([ROOT] + parts + [name]),
                               "directory": stat.S_ISDIR(info.st_mode), "size": info.st_size})
            return result
        finally:
            os.close(directory)
    if not parts:
        raise ValueError("A file name is required")
    if operation not in ("read", "write"):
        raise ValueError("Unknown workspace operation")
    parent = open_directory(parts[:-1], create=operation == "write")
    try:
        if operation == "read":
            handle = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=parent)
            with os.fdopen(handle, "rb") as file:
                info = os.fstat(file.fileno())
                if not stat.S_ISREG(info.st_mode) or info.st_nlink > 1:
                    raise ValueError("Only regular, non-linked workspace files may be read")
                if info.st_size > MAX_BYTES:
                    raise ValueError("File exceeds 64 MiB limit")
                data = file.read(MAX_BYTES + 1)
                if len(data) > MAX_BYTES:
                    raise ValueError("File exceeds 64 MiB limit")
                return {"data": base64.b64encode(data).decode("ascii")}
        data = base64.b64decode(request["data"], validate=True)
        if len(data) > MAX_BYTES:
            raise ValueError("File exceeds 64 MiB limit")
        # Do not truncate until after checking for special files and hard links.
        handle = os.open(parts[-1], os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK,
                         0o600, dir_fd=parent)
        with os.fdopen(handle, "wb") as file:
            info = os.fstat(file.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink > 1:
                raise ValueError("Only regular, non-linked workspace files may be written")
            file.truncate(0)
            file.write(data)
        return {"written": len(data)}
    finally:
        os.close(parent)


if __name__ == "__main__":
    try:
        request = json.loads(sys.stdin.buffer.read(MAX_BYTES * 2))
        print(json.dumps({"ok": True, "result": run(request)}))
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error)}))
        sys.exit(1)
