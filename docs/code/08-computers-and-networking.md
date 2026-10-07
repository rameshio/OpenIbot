# 08 — Linux computers, files, and networking

## Why Docker is involved

Each bot's computer is a Linux container, managed by [desktop/runtime.ts](../../desktop/runtime.ts). Docker Desktop's Linux engine supplies containers, internal networks, and persistent named volumes. Windows hosts Electron; Linux runs the bot's shell, graphical desktop, browser, and task files.

An image is the reusable installed environment. A container is a running/stopped instance of that image. A volume preserves data beyond the lifetime of a container process. Runtime names and ownership labels include an installation identity derived from the data directory and a bot identity, helping prevent accidental reuse of another installation's resources.

## Runtime service

`createRuntime` implements the `RuntimeService` contract in [shared/types.ts](../../shared/types.ts). Main and engine use it for status, image build, ensure/start, inspect, stop, shell execution, file operations, screen capture, computer control, and sharing/import/export.

`ensure` provisions or starts a bot's resources and coordinates simultaneous requests. Docker calls use validated identifiers, arguments, ownership checks, timeouts, and cancellation where supported. A workspace error is surfaced as state/error data rather than a simulated screen.

## The image and desktop

[Dockerfile](../../containers/Dockerfile) installs Debian tools, Python helpers, Chromium, Xvfb, Openbox, x11vnc, noVNC, and websockify. It creates the non-root `bot` user and copies application helpers.

[entrypoint.sh](../../containers/entrypoint.sh) waits for a separately injected VNC password, creates the password file, removes stale process/profile locks, starts the virtual display and desktop programs, and serves the noVNC websocket bridge. Xvfb is the virtual screen; Openbox manages windows; VNC transmits the screen/input; noVNC makes that available through a browser view. Raw VNC stays inside the container and the published viewer port is bound to host loopback.

[Computer.tsx](../../renderer/Computer.tsx) exposes screen, files, and terminal tabs. [desktop.html](../../containers/desktop.html) is the customized viewer. Human takeover pauses agent work through the engine; returning to automated work requires explicit resume.

## Files and commands

The task directory is `/workspace`. [workspace_files.py](../../containers/workspace_files.py) implements validated file operations with directory-descriptor/path handling. Host-side validators reject unsupported paths and bot IDs. [run_command.py](../../containers/run_command.py) implements command jobs and process-group cancellation. [desktop-broker.ts](../../desktop/desktop-broker.ts) converts supported pointer, typing, key, scroll, and browser actions into argument lists.

Picking a Windows file copies it into controlled app imports before the engine transfers it to a bot. Exporting uses a native destination dialog. A file reference can have an owning `botId`; opening it should use that bot's computer. Sharing files requires explicit runtime transfer between workspaces.

Teaching captures pointer/navigation steps and stores workflow instructions as a skill. It does not store typed text for blind credential replay. Review the recording and instructions before depending on a taught workflow.

## Network policy

[shared/network-policy.ts](../../shared/network-policy.ts) validates exact public DNS host names. Wildcards, URLs, ports, paths, and internal-name forms are not accepted. Subdomains need their own entries. [NetworkPolicy.tsx](../../renderer/NetworkPolicy.tsx) exposes those choices.

Runtime provisions the bot's internal network and an egress gateway. [egress_proxy.py](../../containers/egress_proxy.py) reads a host-mounted policy and checks destinations. [chromium-egress.conf](../../containers/chromium-egress.conf) routes Chromium through that proxy. The proxy cannot inspect encrypted TLS contents; allowing a host allows data to be sent there. Network host approval does not establish whether a remote operation reads, writes, sends, or spends.

## Example

Opening a bot's computer invokes `workspace.start`. Runtime verifies/provisions its container, volumes, gateway, and policy, starts services, and returns viewer metadata. The renderer loads the viewer. A shell tool uses the same bot's runtime and returns stdout, stderr, and exit code; it does not run in the Windows repository directory.

## When changing runtime

Document resource ownership, paths, image changes, persistence, cancellation, and networking implications. Real Docker integration is needed for claims about container behavior. Changing `IBOT_DATA_DIR` changes installation resource identity; moving it requires an intentional data/workspace migration.
