# 12 — Development, build, packaging, and checks

## Normal commands

Use PowerShell from the repository root. [package.json](../../package.json) is the authoritative list of npm commands.

| Command | What it does |
|---|---|
| `npm install` | Installs the project's declared dependencies |
| `npm run dev` | Builds desktop/preload, starts Vite, launches Electron against it |
| `npm run typecheck` | Checks the desktop/shared/renderer/test TypeScript include set without emitting files |
| `npm test` | Runs `tests-desktop/*.test.ts` through tsx and Node's test runner |
| `npm run build` | Builds desktop/preload bundles and production renderer |
| `npm start` | Launches Electron using existing built output |
| `npm run desktop` | Builds then starts |
| `npm run test:desktop` | Runs the desktop smoke script against an app fixture |
| `npm run test:providers` | Runs provider interface verification |
| `npm run test:options` | Runs options interface verification |
| `npm run test:avatars` | Runs avatar desktop verification |
| `npm run eval:memory` | Runs memory retrieval evaluation |
| `npm run package:dir` | Builds and packages an unpacked Windows application |
| `npm run package` | Builds a Windows x64 portable release |

Docker Desktop with the Linux engine is needed for actual bot computers and opt-in runtime integration. Model/connector integration also needs those services and appropriate account configuration. Unit tests can substitute model/runtime implementations; a passing substitute test is not a live-provider check.

## Build outputs

[build.mjs](../../scripts/build.mjs) bundles main into `dist-desktop/main.cjs` and preload into `dist-desktop/preload.cjs`; Electron remains external to those bundles. Vite writes `dist-renderer/`. Electron Builder packages those bundles, assets, and `package.json`, with `containers/` as extra resources. Release output goes under `release/`. The npm package is `openibot-desktop`, the product is OpenIbot, the unpacked executable is `OpenIbot.exe`, and portable releases use `OpenIbot-${version}-${arch}.exe`. Windows application ID `app.ibot.desktop` is retained for upgrade compatibility.

Generated output is not the source of truth. Editing `dist-renderer` can be overwritten by the next build. `npm start` alone can run stale bundles. The development script bundles native source when started; restart development after native backend/preload changes so it uses rebuilt code.

## Choosing useful checks

| Change | Appropriate evidence |
|---|---|
| Documentation only | Local link checks, source/file coverage, wording review, diff review |
| Pure helper or state logic | Relevant unit tests and typecheck |
| Chat, approval, or provider contracts | Relevant engine/authorization/provider tests and build |
| UI behavior | Relevant desktop fixture and visual/interaction checks |
| Runtime/container policy | Runtime/network tests plus opt-in real Docker verification when needed |
| Packaging/startup | Build, package, and launch the intended executable |

Many feature scripts can also be invoked directly as `node scripts/<name>.mjs`; only some have npm aliases. Read the script before running it, including its temporary profile, executable selection, and prerequisites.

`node scripts/test-onboarding-desktop.mjs` verifies direct creation through the sidebar, recipient menu, and main bot menu; it checks the saved question, focused composer, first answer routing, limits, and restart persistence. It uses a local model fixture and an isolated profile. Desktop boot scripts wait for the composer rather than the removed welcome heading. `tests-desktop/bot-onboarding.test.ts` covers the corresponding engine contracts without a real provider or Docker runtime.

The root [README](../../README.md) documents `IBOT_RUNTIME_INTEGRATION` and `IBOT_TEST_EXECUTABLE`. Test profiles should be isolated from the normal profile. Tests using real containers or packaged executables can leave generated artifacts; report what was actually exercised.

## Historical results and limits

[TESTING.md](../../TESTING.md) records earlier commands/results and their tested snapshots. Do not reuse those counts as current evidence. The current default `npm test` does not execute retained `tests/` web tests or the standalone Python egress test automatically. A skipped opt-in test should be reported as skipped, with its prerequisite, rather than called a pass.

### Beginner demo media

`node scripts/create-demo.mjs` captures the built desktop application in a temporary `IBOT_DATA_DIR` profile with `IBOT_TEST=1`. It waits for current controls, opens model setup without entering credentials, fills a study-plan draft, and creates a bot using the real direct-creation command. For the result screen only, it sends a renderer snapshot containing explicitly labeled sample messages; this illustrates Markdown display without a live model response. No normal profile is read, no provider is connected and no computer is started. The app closes before the script removes its own verified temporary directory. Four source PNGs go to `docs/assets/demo/`.

`python scripts/render-demo.py` uses Pillow (a Python image library) to combine those PNGs with beginner captions and the packaged icon. `base` draws the shared card and `render` creates five cards, encodes five six-second segments with FFmpeg, and joins them into `openibot-demo.mp4`. A temporary render directory holds segments and is removed automatically. Inputs must be captured first after `npm run build`. Prerequisites: Windows Segoe UI fonts, Python/Pillow and FFmpeg on PATH. Outputs are documentation media, not packaged runtime features; no saved-data schema or application API changes. The MP4 is silent, H.264, 30 fps and 1600×1000, with a small centered zoom per card. Sample answers remain labeled in both the screenshot and [user guide](../demo.md).

The renderer accepts `FFMPEG_BINARY` to select a current FFmpeg executable when PATH points to an older version without the required filters.

After encoding the MP4, `render` also creates `openibot-demo.gif` with FFmpeg's `palettegen` and `paletteuse` filters (these select and apply the GIF's limited color palette). The 960×600 preview loops at five frames per second and shows the same 30-second content. The README and beginner guide embed this image for inline animation, and link the MP4 with `?raw=true` for download rather than opening its GitHub file page. The GIF has no playback controls; the full-resolution MP4 remains available for controlled playback.

## When changing tooling

Update commands, entry/output paths, prerequisites, packaging contents, and validation selection here. Record exact checks and results in the [change log](CHANGELOG.md). Distinguish source review, typecheck, unit tests, desktop fixtures, live services, and packaged-app checks.

## Flat sidebar checks

`node scripts/test-sidebar-desktop.mjs` checks the two top actions, collapsed search, no section headings, preserved conversations, group creation access, and opening/filtering groups in the same list. `node scripts/test-onboarding-desktop.mjs` also checks that the top plus opens a saved greeting without a creation dialog or details rail. These scripts use disposable profiles; they do not create bots in your normal profile. Set `IBOT_TEST_EXECUTABLE` to an unpacked executable to test the package instead of the development entry point.

The bot navigation desktop fixture also exercises the three-dot Delete menu: cancel leaves the identity active; confirmation archives it, filters its teams, retains conversation history, and returns the displayed deleted-bot chat to the main bot. It verifies the main-bot explanation and disabled confirmation, plus persistence after restart.

`node scripts/test-branding-desktop.mjs` verifies OpenIbot branding and profile compatibility. A test-only launcher sets a disposable appData folder so it can exercise the actual default `I Bot` path without touching the normal profile. It checks saved bots/chats, the browser-session path, decryption of a synthetic saved model credential against a local catalog server, About text, and the explicit profile override. Set `IBOT_OLD_TEST_EXECUTABLE` to an earlier I Bot build to seed the profile, and `IBOT_TEST_EXECUTABLE` to the new package for the final startup check.

`node scripts/verify-premium.mjs` checks the generated interface icon, flat sidebar, dark/light themes, Settings/Marketplace/dialogs, compact and focused window layouts, keyboard detail tabs, routine changes, shared file display and avatar motion. Its screenshot messages and extra demo bots exist only in a temporary fixture profile. Screenshots disable CSS transition capture so theme images show the settled state. The icon master and design concept remain in `docs/design/`; only the packaged PNG/ICO and local renderer asset are needed at runtime.

The bot navigation fixture waits for a deletion result or a visible error. When the real Docker runtime is unavailable, it verifies that the dialog reports the failure and the bot remains saved, and reports successful stop/archive/group-filtering checks as skipped. With Docker available it runs those success assertions. An unavailable Docker service is not silently treated as a successful bot removal.
