# I Bot desktop

A Windows desktop app for directing persistent AI bots through chat. Start a conversation, describe an outcome, and let Chief coordinate specialists. Each bot has its own memory and Linux computer. Animated avatars are built into bot identities; appearance can be changed in an individual bot's settings.

## Run the desktop app

```powershell
npm install
npm run desktop
```

For development, use `npm run dev`. This starts the desktop window and a local Vite development server; the packaged app does not need a web server.

```powershell
npm run typecheck
npm test
npm run test:desktop
npm run test:providers
npm run package
```

To verify the screen viewer, terminal, file editor, and teaching recorder against
the packaged app with real Linux computers:

```powershell
$env:IBOT_RUNTIME_INTEGRATION = '1'
$env:IBOT_TEST_EXECUTABLE = (Resolve-Path 'release/win-unpacked/I Bot.exe').Path
npm run test:desktop
Remove-Item Env:IBOT_RUNTIME_INTEGRATION, Env:IBOT_TEST_EXECUTABLE
```

The portable Windows executable is created in `release/`. `npm run package:dir` creates an unpacked executable in `release/win-unpacked/`.

## Connect a model

Open **Settings → Models → Add provider**, choose a provider, enter its API key,
and click **Load models**. Search the returned catalog, select a model, then
**Save & use connection**. Keep multiple connections and switch between their
models using the button beside the chat composer. Changes apply to new runs;
running work retains its original connection.

There are 41 presets, including NVIDIA, OpenRouter, OpenAI, Anthropic, Gemini,
xAI, Groq, DeepSeek, Mistral, and local servers. Endpoints are editable, and
custom OpenAI-compatible services are supported. If a service does not publish
a catalog, enter its model ID manually. Discovery makes no generation request;
actual model access and billing are confirmed when sending a message.
See [provider behavior and sources](docs-desktop/providers.md).

Keys are encrypted through Electron safeStorage using the Windows account's encryption facility. They stay in the desktop process and are not returned to the chat renderer. Model credentials are separate from this Codex session.

## Linux computers

Docker Desktop with the Linux engine is required. In **Settings → Computers**, build the workspace image once. Opening a bot's computer or starting a bot's work provisions its own environment.

Each environment has a graphical Linux desktop, Chromium, terminal, files, an isolated browser profile, and persistent Docker volumes. The app exposes the computer through a password-protected noVNC session bound to localhost. Bot shell commands run inside that bot's container.

Local Docker computers run while this Windows computer is awake and Docker is available. Closing the app to the system tray keeps the coordinator and schedules running. Quitting the app stops coordination. This version does not host an always-on cloud service.

## Workflows

- **New chat:** describe an outcome to Chief or choose another bot.
- **Team conversation:** bots can be added to a group, exchange messages, and hand off files.
- **Bot settings:** edit role, instructions, remembered preferences, color, and avatar shape.
- **Computer:** inspect the screen, take control, read and edit files, or run terminal commands.
- **Teach a task:** record pointer/navigation steps, add workflow instructions, and save a reusable skill. Typed text is intentionally not recorded; the saved skill is a guide for the bot, not blind coordinate replay.
- **Routines:** choose days, a time, and a timezone for recurring work.
- **Marketplace:** install built-in skills, create bots from role templates, and connect supported MCP servers.
- **Action review:** approve or decline actions in the conversation; configure rules in settings.
- **Usage:** inspect recorded provider token usage. No estimated billing amounts are invented.

Bot roles and example skills are starting points. The app begins with Chief and no simulated messages, runs, or connected accounts.

## Data and structure

Application state lives under Electron's user-data directory (normally `%APPDATA%/I Bot`). **Profile menu → Open app data** opens the exact location. Bot workspace files and browser profiles live in Docker volumes.

- `renderer/` — desktop chat interface and computer viewer
- `desktop/main.ts` — native window, IPC boundary, dialogs, credential encryption, tray
- `desktop/engine.ts` — orchestration, tools, routines, approvals
- `desktop/store.ts` — persistent state
- `desktop/providers.ts` — model adapters
- `desktop/runtime.ts` — per-bot Linux lifecycle and file access
- `containers/` — Linux desktop image and noVNC viewer
- `shared/types.ts` — shared desktop contracts
- `tests-desktop/` and `scripts/test-desktop.mjs` — runtime, engine, and desktop verification

The previous Next.js application's source is excluded from this build. The old package configuration was backed up to `artifacts/previous-web-config.zip`; it is not included in the desktop release.
