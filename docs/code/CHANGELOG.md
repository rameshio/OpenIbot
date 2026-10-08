# Code and documentation change log

Use [the maintenance workflow](15-maintenance.md) for new entries. Newest entries go first. This log begins with the handbook task; it does not reconstruct undocumented prior changes. Earlier evidence is in [TESTING.md](../../TESTING.md) and existing feature notes.

## 2026-10-07 — Beginner demo video and guide images

Status: implemented documentation media and regeneration tooling; working tree.

Reason: users need a short, easy explanation of how to start using OpenIbot. Before: the README had screenshots but no short video or dedicated illustrated beginner guide. After: the README links a silent 30-second captioned demo and `docs/demo.md`, with five matching guide images explaining model setup, a task draft, direct bot creation and answer review. The final answer is explicitly labeled illustrative sample content rather than a live model result.

Files and path: `scripts/create-demo.mjs` launches the built Electron app in its own temporary profile, opens actual controls, captures four source screenshots with `shot`, and broadcasts a renderer-only sample result snapshot. `scripts/render-demo.py` reads those PNGs and `assets/icon.png`; `base` draws captions and `render` saves five 1600×1000 PNGs, encodes five six-second segments and joins a 30 fps H.264 MP4 with FFmpeg. Outputs live in `docs/assets/demo/`. `docs/demo.md` explains the steps, sample-content limits and prerequisites. `README.md` exposes the guide and media to users. The tooling is listed in [the file reference](14-file-reference.md) and explained in [build and testing](12-build-and-testing.md).

Compatibility: application source, IPC contracts, saved-data schemas and packaged files are unchanged. The capture uses `IBOT_DATA_DIR` and `IBOT_TEST=1`, never connects a provider or starts a computer, closes Electron and removes only the specific temporary profile created by that invocation. The illustrated result is not saved to the engine. Rendering requires Python/Pillow, Windows Segoe UI fonts and a current FFmpeg build; `FFMPEG_BINARY` can override an older executable on PATH. There is no audio track or in-app tutorial.

Verification: `npm run build` passes with the existing large-bundle advisory. `node scripts/create-demo.mjs` passes its assertions for an empty provider list, two bots after actual creation and zero renderer errors. `python scripts/render-demo.py` succeeds with FFmpeg 8.1.2 selected via `FFMPEG_BINARY`. Visually inspected all five final images and the source sample-result screen. FFprobe confirms H.264, 1600×1000, 30 fps, 900 frames, exactly 30 seconds and a 1,886,795-byte MP4; decoding the complete video with FFmpeg reports no errors. Node syntax check and Python compilation pass. No live-provider, Docker or packaged-app run is claimed; capture uses the freshly built development entry point. Runtime tests were not repeated because runtime behavior did not change.

## 2026-10-07 — Higgsfield identity and premium workspace

Status: implemented; working tree.

Reason: the user requested a premium application redesign and a new icon using Higgsfield. Before: the product used the earlier orange mascot mark, a mostly gray palette and decorative serif headings. After: a generated mint open-ring icon identifies OpenIbot; forest-dark and pale-light themes, clean system typography, refined composer/model controls, selected rows, header actions, file/activity cards and matching settings/dialog surfaces give it one coherent identity. The flat sidebar and immediate new-bot conversations remain, and empty-sidebar filler is removed.

Files and path: `renderer/premium.css` owns the palette/components and imports `assets/icon.png` for `.brand-mark`; `renderer/App.tsx` adds a titlebar activity class from existing state and removes the filler; `desktop/main.ts` uses the matching initial background; `assets/icon.png` and `assets/icon.ico` replace native/Windows icons. Higgsfield generation → saved master → deterministic PNG/ICO size conversion → Vite local image bundle and Electron/Builder native icon. Added the three design-guide/source files listed in [the inventory](14-file-reference.md). `scripts/verify-premium.mjs` now creates demo specialists only in its fixture, checks the new mark/flat list, selects the main bot through current navigation, and captures settled screenshots.

Compatibility: no dependencies, IPC, databases, provider settings or profile paths change. Bot identity/appearance and existing tool authorization stay intact. The UI concept’s example activity and verification badge are not copied as fabricated runtime data. Installed assets are local and do not require Higgsfield at runtime. Existing generated-message history remains saved.

Higgsfield: the account reported 28 credits with unlimited trial generation unavailable. Icon, UI concept and transparent icon refinement completed; quoted total four credits, observed remaining balance 24. Job provenance and design instructions are in [the design guide](../design/openibot-design.md).

Verification: typecheck/build pass. The initial design desktop script passes all eleven original workflow/layout checks plus its new flat-list and icon assertions. Inspected conversation, light and compact screenshots. The six palette contrast checks pass (minimum 4.91 for supporting text). PNG transparency and all ICO sizes were verified during conversion. The settled design fixture passes thirteen checks; direct onboarding passes ten. Navigation passes twelve checks, including main-bot protection, cancellation and the Docker-unavailable error/preservation path. Successful real computer-stop/archive/group filtering could not be repeated because Docker Desktop’s Linux daemon is unavailable; the script now reports that prerequisite explicitly, waits for a bounded runtime result and checks the error rather than claiming successful removal. Full npm test has 119 cases, 117 pass, zero failures and two opt-in skips, including successful archival engine cases with controlled runtime fixtures. The packaged UI fixture also passes all thirteen checks. The portable and unpacked builds were created at `release-openibot-premium/`; their backend and PNG/ICO bytes match the source build. All 395 handbook/design links resolve. The OpenIbot desktop shortcut now targets the premium executable; the old link is backed up in `artifacts/openibot-premium/`. Quit the prior idle app through its profile menu and reopened the new build through the desktop shortcut. Live verification confirmed the new forest/mint appearance and icon with Jarvis, existing bots and retained group history; no profile data was manually changed.

Documentation: updated interface, avatars/icon, build/checks, file reference, and this log. Relevant engine/storage guides remain accurate: saved data and execution handlers are unchanged.

## 2026-10-07 — Rename the application to OpenIbot

Status: implemented; working tree.

Reason: the user requested OpenIbot as the product name. Before: the desktop interface, native window/tray/notifications, package metadata and release filenames identified the product as I Bot. After: current application labels and new release output use OpenIbot; npm metadata uses `openibot-desktop`.

Files and path: `package.json` and its lockfile define the renamed product/package and portable filename; `desktop/main.ts` sets the native name, window/tray/notifications/export labels and explicitly chooses the legacy profile path before locking; desktop engine/store/runtime/connector text and renderer titlebar/HTML/settings/dialog/message/approval text use OpenIbot. The avatar showcase and current handbook/README use the new name. Added `scripts/test-branding-desktop.mjs` for real startup and saved-profile compatibility. Existing dated changelog and release-path references remain historical.

How it works: Electron reads package metadata → main sets OpenIbot as its name → main creates/selects `%APPDATA%/I Bot` (or explicit `IBOT_DATA_DIR`) for both userData and sessionData → the existing engine loads the same saved state, keys, notes and workspace identity → the renamed renderer/tray are displayed. Package build → `OpenIbot.exe` and `OpenIbot-${version}-${arch}.exe`.

Compatibility: no profile copying, database/schema change, dependency update or Docker resource rename. The Windows ID `app.ibot.desktop`, `ibot:` protocol, `window.ibot` bridge, `IBOT_*` environment variables and persisted internal identifiers remain compatible. Existing bot names are independent of the product name. Creating the selected profile folder before overriding Electron paths also supports fresh installations.

Documentation: updated [basics](01-basics.md), [architecture](02-architecture.md), [storage](03-data-and-storage.md), [interface](04-interface.md), [build/checks](12-build-and-testing.md), [file reference](14-file-reference.md), the handbook entry, current desktop feature notes and root README. Execution, runtime and connector guides were reviewed: their code paths remain unchanged apart from the product text. Typecheck and production build pass. Full npm test: 119 cases, 117 pass, zero failures and two opt-in skips. The branding fixture passes eight checks against a profile seeded by the old executable, including legacy default/session paths and decryption of a synthetic saved credential. Lock metadata is consistent; all 379 handbook links resolve. The eight branding checks also pass with the new packaged executable. Its bundled native code byte-matches the production build and package metadata reads OpenIbot. Renamed the existing desktop shortcut to OpenIbot and repointed it to `release-openibot/win-unpacked/OpenIbot.exe`; kept a copy of the old shortcut under `artifacts/openibot-rename/`. No user profile files were manually edited. Electron Builder successfully created `release-openibot/OpenIbot-0.5.1-x64.exe` and `release-openibot/win-unpacked/OpenIbot.exe`. The first shortcut check opened the older application; replaced the inherited link with a fresh shortcut pointing to the renamed executable, and quit the old idle app through its profile menu. No user bots or conversations were edited. The fresh desktop shortcut launched `release-openibot/win-unpacked/OpenIbot.exe`; the native window and titlebar display OpenIbot, and the live profile still contains Jarvis and the existing bots and group history.

## 2026-10-03 — Delete bot in the sidebar menu

Status: implemented; working tree.

Reason: bots could be removed through the engine’s management tools, but their sidebar menus had no human delete option.

Before: menus only offered editing, main-bot selection, and creation. After: every bot menu includes Delete [name], which opens an explicit confirmation. Cancel keeps the bot. Confirm removes it from navigation using the existing archival deletion command; saved conversations, memory, files and restoration support are retained. The main-bot dialog explains how to select another main bot before deletion. Working-bot errors remain visible in the dialog.

Files and path: `renderer/BotNavigation.tsx` adds `onDelete` and the menu action; `renderer/App.tsx` owns the dialog target, modal/background state, and returns to the main bot after removing a participant in the displayed chat; `renderer/Dialogs.tsx` adds `DeleteBotDialog` with busy/error handling; `premium.css` distinguishes the deletion action. Menu → exact bot ID → confirmation → `bot.delete({botIds:[id]})` → computer stop/archive/routine disable → state publication → updated navigation. No new IPC command, dependency, schema, migration, or automatic user-profile deletion was added.

Checks: updated `scripts/test-bots-desktop.mjs` for cancellation, archival deletion, main-bot protection, preserved history, filtered groups and restart persistence. Updated `tests-desktop/bot-navigation-ui.test.ts` for the new callback/menu and current creation label. Typecheck/build pass; full npm test has 119 cases, 117 pass, zero failures and two opt-in skips. The desktop bot navigation script passes fourteen checks in both development and the packaged build, including the new deletion flows. Updated the usual desktop shortcut target `release-avatar/win-unpacked`, preserved the prior build at `release-avatar/win-unpacked.before-delete-menu-20261003`, and confirmed its app.asar SHA-256 matches the tested package. Reopened through the existing desktop shortcut in Explorer, confirmed the Jarvis profile and its bots remain, and visually verified Delete Verifier in the live three-dot menu without deleting any user bot.

## 2026-10-02 — Top creation button and a flat sidebar

Status: implemented; working tree.

Reason: the user requested the open Grok Bot layout rather than the old creation form and separate Your bots/Teams sidebar subsections. The normal running executable was still the earlier build in `release-avatar/win-unpacked`.

Before: the sidebar had a large New chat button, always-visible search, a large boxed main bot, and separate headings with creation buttons. Direct creation existed in the source but the running older package still showed the form.

After: two circular top actions provide search and instant bot creation. Search expands and focuses its field; collapsing it clears the filter. The smaller main bot remains pinned above one unlabelled list of bots and group conversations. New chat remains in the chat header and on Ctrl+N; Create group chat remains in the recipient menu. New bot creation hides the details rail and immediately opens the saved question and focused composer. Settings can still be opened afterwards.

Files and path: `renderer/App.tsx` owns search visibility, top buttons, selection and creation; `BotNavigation.tsx` renders smaller avatars without the Your bots heading; `TeamNavigation.tsx` renders group rows without a Teams section; `premium.css` styles the compact controls and main bot. Top plus → existing `createBlankBot` → human `bot.createBlank` IPC → saved bot/chat/greeting → selected chat with details hidden. No engine/storage schema changes, migrations, or dependency changes were needed. Existing history and identities are retained.

Verification: inspected the open Grok Bot using the computer-use skill and reviewed the new bot screenshot. Typecheck and production build pass. Development desktop smoke passes twelve checks and bot navigation passes nine. Packaged onboarding passes ten checks, including no modal/details rail and no section headings; packaged sidebar passes eight checks, including group access and search. Packaged bot management also passes nine checks, including no recreated verifier and hiding removed organizer teams. Updated the desktop shortcut target in `release-avatar/win-unpacked` after quitting the idle old app through its profile menu; retained the old build at `release-avatar/win-unpacked.before-flat-sidebar-20261002-2239`. Installed app.asar SHA-256 matches the tested package. Reopened the usual shortcut target and visually confirmed the top search/plus, flat list and removed presets. On 2026-10-03, verified the app reopened through the usual desktop path with Jarvis and the current saved conversations, showing the updated top controls and flat list. A helper-launched instance initially showed a different saved profile; it was quit without editing identities or profile files. The final user-opened instance confirms the expected Jarvis profile remains available. See [interface](04-interface.md) and [build/checks](12-build-and-testing.md).

## 2026-10-02 — Create a new bot directly in conversation

Status: implemented; working tree.

Reason: the reference video shows direct creation followed by a bot asking what the person wants help with. The requested desktop flow should not open a configuration form or show the old “What should … work on?” welcome and preset research/build/organize menu.

Before: Create a bot opened a form requiring name/role, then selected an empty screen with a welcome banner and suggestions. No opening question was saved in a real conversation.

After: creation from the sidebar, main-bot menu, or recipient menu immediately creates an ordinary personal assistant, opens its chat, saves “I'm ready to help. What would you like me to help you with?”, and focuses the named composer. Names are distinct (`New bot`, `New bot 2`, etc.). The old welcome and suggestion buttons are gone. Bot settings remain available after creation. The opening question needs no model/API key; the first answer uses normal model setup and execution.

Files and code: `desktop/main.ts` allows the human `bot.createBlank` command; `desktop/engine.ts` creates identity/chat/local greeting; `shared/types.ts` adds the `BotConversation` response type; `renderer/App.tsx` routes creation through `createBlankBot` and removes the welcome/presets. Added `tests-desktop/bot-onboarding.test.ts` and `scripts/test-onboarding-desktop.mjs`. Updated existing desktop scripts to wait for the composer instead of the removed welcome heading; smoke/navigation scripts now exercise immediate creation and later editing. The bot navigation fixture also uses the current Search bots label.

How it works: create click → validated IPC → engine identity and chat records → saved local welcome → response with exact bot/chat IDs → selected conversation and focused composer → user answer through the existing provider/run path. Capacity checks occur before creation. No greeting generation request, Docker computer, automatic team, or verifier is started.

Documentation: updated [interface](04-interface.md), [contracts/storage](03-data-and-storage.md), [execution](05-chat-and-engine.md), [build/checks](12-build-and-testing.md), [file reference](14-file-reference.md), and the root README.

Verification: reviewed sampled video frames and the final question screen; inspected the resulting desktop screenshot. Three new engine tests pass. Full `npm test`: 119 cases, 117 pass, zero failures, two opt-in skips. Typecheck/build pass. The new onboarding desktop fixture passes ten checks; general desktop smoke passes twelve; bot navigation passes nine. Initial UI assertions were scoped to the conversation and level-one heading because the saved question also appears in the sidebar preview and the name also appears in the details panel. These were selector fixes, not suppressed checks. The existing bundle-size warning remains nonfatal.

Packaging: refreshed the full Windows app at `release-bot-removal/win-unpacked/I Bot.exe`. The packaged app passes the ten onboarding checks, twelve general smoke checks, and nine deletion/management checks. Its bundled backend byte-matches the build. Reviewed the screenshot at `artifacts/bot-onboarding/new-bot-conversation.png`. Handbook links and inventory coverage were checked: zero broken links and all 227 source/supporting files listed. Existing builder duplicate-reference warnings remain nonfatal.

Compatibility and remaining limits: uses existing bot/chat/message records; no schema migration or new dependency. Existing profiles and prior deletion/verifier fixes are preserved. The opening question is local application text, not a model-generated response. Live provider/Docker behavior was not reverified; fixtures use a local model response. The currently running older app was left untouched; quit it and open the updated executable to use this flow with the existing profile. No commit or push performed.

## 2026-10-02 — Stop deletion from recreating a Verifier

Status: implemented; working tree.

Reason: deleting all specialists recreated a Verifier during automatic review, leaving a bot and a team visible. The reviewer received the oldest eight conversation items and searched an empty workspace instead of the actual deletion result.

Before: successful `delete_bots` was treated like any tool-based deliverable and could create a new persistent reviewer. Its incomplete context could incorrectly fail verification and pause an already-completed removal.

After: removal-only runs (listing/deletion tools) check saved active/archived IDs and disabled routines, then generate an accurate removal/retention summary without a model reviewer. Empty repeated removals also avoid creating bots. Mixed work can use an existing retained reviewer but never automatically creates one after a successful removal. Reviews receive latest history/tool results, current bot metadata, and the read-only `list_bots` tool.

Files and code: `desktop/engine.ts` — `Run`, `executeTool`, `runAgent`, and `startRun`; `tests-desktop/bot-management.test.ts` — four new regression scenarios; `scripts/test-bot-management-desktop.mjs` — removal at normal bot capacity and organizer-team visibility checks.

How it works: approved tool dispatch archives selected bot IDs → the run records successful removal → `startRun` verifies saved state and summarizes actual retained identities → existing team filtering hides chats referencing archived bots. Records remain recoverable; the main/executing bot remains protected. Mixed work still reports when independent verification is unavailable.

Documentation: updated [execution](05-chat-and-engine.md), [tools/verification](07-tools-and-approvals.md), and [interface](04-interface.md) explanations. No source files were added/removed/renamed, so the existing file inventory still covers the change.

Verification: the first two new deletion regressions failed on the old code because an extra bot remained. After the fix, all eight management tests pass. `npm run typecheck` and `npm run build` pass. Full `npm test`: 116 cases, 114 pass, zero failures, two opt-in skips. Desktop management fixture: nine checks pass, including approval, no replacement Verifier, hidden organizer team, factual summary, and restoration. A new reviewer-context assertion was corrected to parse JSON-encoded tool history, then the full suite was rerun successfully. The existing build bundle-size warning remains nonfatal.

Packaging: built a full Windows application at `release-bot-removal/win-unpacked/I Bot.exe`. The same nine management desktop checks and the twelve-check general desktop smoke scenario pass against this packaged executable using isolated temporary profiles. Its bundled backend byte-matches the fresh build. The previously running `release-avatar` executable remains untouched and needs to be quit before opening the updated app. The updated app uses the same default user-data directory, so its normal profile/history remain available. Existing Electron Builder duplicate-reference warnings remain nonfatal.

Compatibility and remaining limits: no schema migration, dependency changes, authorization relaxation, or automatic cleanup of existing live-profile bots. Existing unwanted reviewers can be removed with the updated app. Historical conversations are retained, and an open conversation may remain visible after its team entry disappears. Docker/live-provider workflows were not rerun; model requests in regression/UI checks use deterministic fixtures. Existing unrelated avatar/UI work was preserved.

Commit: working tree; no commit or push performed.

## 2026-10-02 — Establish a beginner code handbook

Status: documentation only; working tree.

Reason: make the project understandable from scratch and require future changes to carry an explanation of the updated code.

Before: the repository had setup instructions, feature/design notes, and verification reports, but no single ordered beginner handbook spanning the active desktop code and retained web application.

After: `docs/code/` provides separate guides for basic syntax, architecture/startup, data/storage, interface, chat execution, providers, tools/approvals, Linux/networking, memory/skills/routines, connected apps, avatars/voice, build/testing, retained web code, and file responsibilities. A maintenance guide and repository instructions define how to update these explanations with future changes.

Files and code: new handbook Markdown files; navigation added to root `README.md`; contributor documentation requirement added to `AGENTS.md`. No runtime source was changed by this task. Existing uncommitted UI/avatar edits were preserved and described as current working-tree behavior, not attributed to this task.

How it works: readers start at `docs/code/README.md`, follow numbered section guides and source links, and use the file reference to locate implementation. Future contributors revise the relevant explanation and record reason, before/after behavior, code path, verification, and compatibility here.

Verification: source/manifests were inspected; local Markdown links, source inventory coverage, and documentation diff were checked. Runtime tests/build/package were not run because this task changes documentation only. This entry does not certify the current executable or live integrations.

Compatibility and remaining limits: no application data migration or dependency changes. Documentation upkeep is a contributor requirement rather than an installed automatic monitor. Retained Next.js guides were unavailable under `node_modules/next/dist/docs/`; no Next.js source was edited.
