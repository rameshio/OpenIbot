# Local Linux computers

`createRuntime({dataDir, resourcesDir, onUpdate?})` implements the `RuntimeService` in `shared/types.ts`. `resourcesDir` can point to the app resource directory containing `containers/`, or directly to `containers/`. Build the image once using Settings → Computers → Build Linux image. Docker Desktop must run Linux containers. The app does not install or upgrade Docker itself.

Each bot gets a labelled, unprivileged Debian container, a private Docker network, and separate named volumes for `/workspace` and `/home/bot`. The home volume includes the Chromium browser profile. Stopping the computer preserves both volumes. Names include a hash of the application data path and bot ID, so development/test installations do not attach to the user's existing bots. Every existing resource is checked against installation and bot labels before use.

The image includes Openbox, Chromium, a file manager, terminal, Python, curl, git, xdotool, and a noVNC computer viewer. Commands run in `/workspace` as UID 1000. They have a 120-second timeout, 2 MiB output limit per stream, and process-group cancellation. Long-running user-managed services can be started deliberately in the bot's terminal. The default container limits are two CPUs, 2 GiB RAM with no additional swap, 256 processes, and 256 MiB shared memory. Bots have no host folders mounted and no Docker socket; capabilities are dropped and privilege escalation is disabled. Chromium's inner sandbox is disabled to work inside this unprivileged container, so the Docker boundary is the browser's isolation boundary.

Only noVNC is published, on a random `127.0.0.1` host port. Raw VNC listens on container loopback. A unique eight-character VNC password is stored in `<dataDir>/runtime/desktop-secrets.json`, outside the app's renderer-persisted state. Credentials enter the container through stdin. The transient desktop URL includes the credential in its URL fragment; the wrapper clears the fragment immediately after reading it. Do not persist or log that URL. Treat the application data directory as private, because standard VNC credentials are local access credentials, not a remote-access security system.

`desktop.html` uses the bundled noVNC RFB API. Query options: `view_only=true` disables mouse/keyboard control, and `teach=true` records normalized pointer clicks and selected navigation keys (never letters, password text, clipboard, or typed values). It sends `ibot-teach-event` messages to its embedding parent. The app must validate both the sender origin against the current desktop URL and the message source against that specific iframe. Recorded steps require the user's explanation to become a useful reusable skill; they are not a video or complete automatic demonstration recorder.

File operations use a fixed `/workspace` root with directory-relative descriptors and `O_NOFOLLOW` for every component; traversal, symlinks, hard links, devices, and pipes are rejected. Imports/exports are limited to 64 MiB, and text previews to 2 MiB. Native host source/destination paths must be selected by Electron dialogs; never expose arbitrary host file paths as agent tools.

Run unit tests with `npm test`. To run actual Docker isolation, persistence, symlink, import/export, screenshot, and cancellation checks in PowerShell:

```powershell
$env:IBOT_RUNTIME_INTEGRATION = '1'
npx tsx --test tests-desktop/runtime-integration.test.ts
Remove-Item Env:IBOT_RUNTIME_INTEGRATION
```

Integration tests stop their labelled test computers when finished and retain test data under the printed temporary directory. They do not delete or stop unrelated containers. The image stays available. Local routines and bots require the PC, Docker Desktop, and the OpenIbot background process to remain running; this release does not provide an always-on cloud computer.

Reference documentation: [Docker resource limits](https://docs.docker.com/engine/containers/resource_constraints/), [localhost port publishing](https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/), and [noVNC embedding](https://github.com/novnc/noVNC/blob/master/docs/EMBEDDING.md).
