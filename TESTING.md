# Baseline and verification

Verification date: October 1, 2026, America/Chicago. Working directory: `C:\Users\rames\OneDrive\Desktop\IBot`.

## Baseline

Initialized a new local Git repository on branch `main`. There was no usable existing repository/history to repair. Baseline commit: **`ea0efe090783d803d862a3d88baac05cac589798`**, `chore: establish source baseline with local data exclusions`. It contains 166 files: the current application source, retained legacy source/tests, dependency manifest/lockfile, assets, documentation including `AUDIT.md`, and the expanded `.gitignore`. No remote was added and nothing was pushed.

Application source, dependency versions, dependency lockfile, and test implementations were not changed. Existing tests were run before producing this report; no new feature was implemented and no new tests/dependencies were added. The production build was regenerated solely to test the current source instead of stale bundles. Generated output remains ignored. This report is committed separately from the source baseline so that its results can identify the exact tested commit.

### Excluded from the baseline

These existing paths were reported as ignored by Git:

- `node_modules/`, `.next/`, `dist-desktop/`, `dist-renderer/`.
- `release/`, `release-auth/`, `release-avatar/`, `release-options/`, `release-premium/`, `release-providers/`, `release-video/`.
- `artifacts/`, `test-results/`, `tsconfig.tsbuildinfo`.

The ignore rules also protect future copies of:

- Build/cache/test output: `dist/`, `out/`, `release-*/`, `coverage/`, `playwright-report/`, `*.tsbuildinfo`, `__pycache__/`, `*.py[cod]`, and `*.log`.
- Local secrets/configuration: `.env*` except `.env.example`, `.npmrc`, `.credentials*`, `secrets/`, `secrets*.json`, `credentials*.json`, `desktop-secrets.json*`, `*.pem`, `*.key`, `*.p12`, and `*.pfx`.
- App state/profile/imports: `state.json*`, `state.before-*.json`, `runtime/`, `app-data/`, `userdata/`, `user-data/`, and `imports/`.
- Docker volume/disk copies: `docker-data/`, `docker-volumes/`, `volumes/`, `*.vhd`, and `*.vhdx`.

`.env.example` is tracked; all its assignments were empty at baseline. `package-lock.json` and source assets are intentionally tracked. A credential-pattern preflight checked staged text without printing matches/content; it found no matches for the checked provider/token/private-key patterns. This is a heuristic, not proof that every possible secret format is absent. Representative state, credential, dependency, build, and volume paths were checked with `git check-ignore` before testing.

## Actual data locations and OneDrive

Only paths/metadata were inspected; no live state or credential contents were displayed. `IBOT_DATA_DIR` was not set in the invoking environment. The default profile directory and both files below exist; the inspected profile directory was not a junction or symbolic link.

| Data | Absolute Windows path | Within the repo's OneDrive tree? |
|---|---|---|
| Application state | `C:\Users\rames\AppData\Roaming\I Bot\state.json` | No |
| State backup | `C:\Users\rames\AppData\Roaming\I Bot\state.json.bak` | No |
| Runtime VNC credentials | `C:\Users\rames\AppData\Roaming\I Bot\runtime\desktop-secrets.json` | No |
| Docker named-volume backing disk | `C:\Users\rames\AppData\Local\Docker\wsl\disk\docker_data.vhdx` | No |
| Other Docker WSL system disk found | `C:\Users\rames\AppData\Local\Docker\wsl\main\ext4.vhdx` | No |
| Repository, including `.git` and installed dependencies | `C:\Users\rames\OneDrive\Desktop\IBot` | Yes, under the provided OneDrive Desktop location |
| Desktop smoke-test profile for this run | `C:\Users\rames\AppData\Local\Temp\ibot-desktop-test-CCIiHJ` | No |
| Docker integration profile for this run | `C:\Users\rames\AppData\Local\Temp\ibot-runtime-test-6Z2dCh` | No |

Docker is using its Linux engine, WSL integration, context `desktop-linux`, and daemon root `/var/lib/docker`. Named volumes are Linux filesystems inside Docker's managed virtual disk, **not ordinary per-volume Windows folders**. The Windows backing disk above exists; `docker volume inspect` returned the Linux mountpoints below for the default I Bot profile's installation (`28cab317c81a`). Do not invent Windows drive-letter equivalents or manipulate the live VHDX to edit files. Use the Docker/runtime file interfaces.

| Volume name | Actual Linux mountpoint inside Docker |
|---|---|
| `ibot-28cab317c81a-6c841ee00e850f19-home` | `/var/lib/docker/volumes/ibot-28cab317c81a-6c841ee00e850f19-home/_data` |
| `ibot-28cab317c81a-6c841ee00e850f19-work` | `/var/lib/docker/volumes/ibot-28cab317c81a-6c841ee00e850f19-work/_data` |
| `ibot-28cab317c81a-9285827b8031a1db-home` | `/var/lib/docker/volumes/ibot-28cab317c81a-9285827b8031a1db-home/_data` |
| `ibot-28cab317c81a-9285827b8031a1db-work` | `/var/lib/docker/volumes/ibot-28cab317c81a-9285827b8031a1db-work/_data` |
| `ibot-28cab317c81a-ca51069f07e1e53d-home` | `/var/lib/docker/volumes/ibot-28cab317c81a-ca51069f07e1e53d-home/_data` |
| `ibot-28cab317c81a-ca51069f07e1e53d-work` | `/var/lib/docker/volumes/ibot-28cab317c81a-ca51069f07e1e53d-work/_data` |
| `ibot-28cab317c81a-d81364735fd81543-home` | `/var/lib/docker/volumes/ibot-28cab317c81a-d81364735fd81543-home/_data` |
| `ibot-28cab317c81a-d81364735fd81543-work` | `/var/lib/docker/volumes/ibot-28cab317c81a-d81364735fd81543-work/_data` |

These names are selected by installation label, not by reading user state. Other historical/test installations also have volumes. Bot home volumes include browser profiles and VNC material; work volumes contain task files. See `desktop/main.ts:11–13`, `desktop/main.ts:56–64`, `desktop/store.ts:22–24`, `desktop/runtime.ts:106–109`, `desktop/runtime.ts:117–135`, `desktop/runtime.ts:220–229`, and `containers/entrypoint.sh:4–10`.

**OneDrive risk:** `.git` is inside the sync tree, where concurrent cloud synchronization/conflict resolution or hydration can interfere with Git's transactional files. `node_modules` and generated builds create many changing files, leading to unnecessary sync work and possible hydration/locking problems. `.gitignore` affects Git only; it does not prevent OneDrive uploads of ignored secrets, `.env` files, profiles, or exported volumes. No such upload was demonstrated. Current sync activity and any independent AppData backup/sync product are **UNKNOWN**; the inspected app data and Docker disk paths are outside the supplied OneDrive root.

Recommended future repository location: **`C:\Users\rames\source\IBot`**, outside OneDrive. Keep application data in AppData and Docker disks in Docker's managed local storage. Use a Git remote for source backup and a separate private backup process for application data. Do not copy active `.git`, `node_modules`, or Docker disks while writers are running. No relocation or data migration was performed here. The app hashes the app-data path into Docker resource names, so changing `IBOT_DATA_DIR` later requires an intentional workspace migration (`desktop/runtime.ts:106–114`).

## Tests actually run

Environment: Windows, PowerShell, Node **v24.16.0**, npm **11.13.0**, Git **2.54.0.windows.1**. Installed Electron **44.4.1**, Playwright test **1.63.0**, tsx **4.23.13**, and Vite **8.3.0**. No install or upgrade was performed. Docker workspace image `ibot-workspace:local` was already present; its inspected image ID was `sha256:e09041685932c58fecfb4c596dc593348a11c71bfbd289cbadb125aa2f6f5876`.

| Command | Passed | Failed | Skipped | Exit | Result |
|---|---:|---:|---:|---:|---|
| `npm test` | 33 | 0 | 1 | 0 | 34 Node test cases; opt-in Docker case skipped as designed. No cancelled/todo cases. Reported duration 2.731 seconds. |
| `npm run build` | 1 build | 0 | 0 | 0 | Fresh Electron/preload bundles and Vite renderer; 2,144 modules transformed, Vite duration 1.13 seconds. This is preparation, not an extra test case. |
| `npm run test:desktop` | 1 smoke scenario; 9 reported checks | 0 | Docker branch not selected | 0 | Freshly built local Electron app, two launches, isolated temporary profile. Script is assertion-based and does not expose a Node/Playwright test-case count. |
| `IBOT_RUNTIME_INTEGRATION=1` with `tsx --test tests-desktop/runtime-integration.test.ts` | 1 | 0 | 0 | 0 | Real Docker test, run with the local installed `tsx.cmd`; reported duration 82.917 seconds. No cancelled/todo cases. |

The desktop scenario reported these nine checks: desktop boot, empty real state, built-in avatars, bot creation, provider setup gate, theme/motion, group chat, memory, and restart persistence. It did not use Docker or a packaged release. `IBOT_RUNTIME_INTEGRATION`, `IBOT_TEST_EXECUTABLE`, and `IBOT_DEV_URL` were cleared in that test command's process environment; no persistent environment settings were changed. The test itself supplies its own temporary `IBOT_DATA_DIR`. The normal profile's `state.json` hash was unchanged after the unit/build/desktop checks.

### Failure classification

- **Real failures:** none in the completed unit/build/desktop runs.
- **Flaky failures:** none observed; a single green run does not establish absence of flakiness.
- **Environment failures:** none in the completed runs. The ordinary suite's one Docker skip is an expected opt-in exclusion, not a failure.
- **Docker integration failures:** none. Its opt-in case passed separately. No failures were fixed and no test assertions or configuration were changed.

Raw process output was captured in memory and only summaries/selected metadata were surfaced. No live credential contents or full Docker inspection/environment dumps were logged. Ignored `artifacts/baseline-unit-summary.txt` and `artifacts/baseline-docker-summary.txt` contain test names and aggregate counts; `artifacts/desktop/` contains screenshots from the isolated fixture profile. This checked-in report carries the durable results; ignored artifacts are not part of Git history.

Docker verified computers `ibot-bd42423776b8-f0e73a291355d70f` and `ibot-bd42423776b8-f028a5f223afc47f` in a separate test installation. Both were confirmed stopped with exit code 0 after teardown. Their home/work volumes and temporary profile are retained by the existing test, not deleted. No user installation's containers were stopped by this test. The default profile's `state.json` hash was also confirmed unchanged after all requested checks.

## Current versus legacy scripts

| Command/file | Status | Purpose/prerequisites | Run in this baseline? |
|---|---|---|---|
| `npm run dev` → `scripts/dev.mjs` | Current | Vite at `http://127.0.0.1:5177`, bundle main/preload, start Electron. | No |
| `npm run build` → `scripts/build.mjs` | Current | Produce `dist-desktop/` and `dist-renderer/`; excludes old Next app. | Yes |
| `npm start` → `scripts/launch.mjs` | Current | Launch local Electron from existing bundles; does not build. | Via smoke script's Electron launch, not this command |
| `npm run desktop` | Current | Build then launch. | No |
| `npm run typecheck` | Current | TypeScript for `renderer/`, `desktop/`, `shared/`, desktop tests, and Vite config. | No |
| `npm test` | Current | `tsx --test tests-desktop/*.test.ts`; fake/local-fixture model/provider tests, optional real runtime case. | Yes |
| `npm run test:desktop` → `scripts/test-desktop.mjs` | Current | General Electron smoke test; Docker UI branch only when explicitly enabled. Requires a fresh build. | Yes, without Docker |
| `npm run test:providers` → `scripts/test-providers-desktop.mjs` | Current | Electron provider UI against local HTTP fixtures; temporary profile; requires build. | No |
| `npm run test:options` → `scripts/test-options-desktop.mjs` | Current | Electron media/MCP/voice/export UI with fixtures and fake audio device; requires build. | No |
| `npm run test:avatars` → `scripts/test-avatars-desktop.mjs` | Current | Electron avatar/settings/motion UI; temporary profile; requires build. | No |
| `tests-desktop/runtime-integration.test.ts` | Current, opt-in | Real Docker isolation/file bridge/cancellation/persistence; requires Linux engine and prebuilt workspace image. | Yes, separately |
| `npm run package` / `npm run package:dir` | Current | Build and package Windows portable/unpacked Electron app. | No |
| `scripts/verify-premium.mjs` | Current auxiliary desktop check | Direct Electron visual/UI assertions, fixture state, screenshots; no npm alias. Requires build. | No |
| `scripts/generate-icon.py` | Current auxiliary asset tool | Regenerates tracked icons; uses Python/Pillow. Not a test. | No |
| `playwright.config.ts` and `tests/workspace.e2e.ts` | Legacy web E2E | Expects port 3000 and invokes `npm run dev`, which now launches the desktop app at 5177. This is a real configuration mismatch, not a test failure observed here. | No |
| Other `tests/*.test.ts` | Legacy web unit/integration tests | Old session, provider adapters, task execution, storage, and run-event behavior under `src/`. Excluded from current `npm test`. | No |
| `next.config.ts`, `next-env.d.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.env.example` | Retained legacy web configuration/template | Next/Tailwind/session settings; no current npm web-start/lint command, and no Next dependency in current manifest. Vite explicitly disables PostCSS plugins. | No |

Evidence: `package.json:12–47`, `scripts/build.mjs:1–5`, `scripts/dev.mjs:5–9`, `scripts/launch.mjs:1–5`, `scripts/test-desktop.mjs:6–13`, `scripts/test-desktop.mjs:49–91`, `tests-desktop/runtime-integration.test.ts:8–15`, `tsconfig.json:16–19`, `vite.config.mts:5–8`, `playwright.config.ts:3–17`, and `README.md:87`.

## Reproducing later checks

Run from the repository root with the existing installed dependencies. After a fresh clone, install from the committed lockfile using `npm ci`; do not add or upgrade packages merely to run these checks.

```powershell
# Confirm the source revision and clean working tree first.
git rev-parse HEAD
git status --short

# These overrides must not select a stale packaged build or real user profile.
# Changes are local to this shell; use a fresh test shell when possible.
Remove-Item Env:IBOT_RUNTIME_INTEGRATION, Env:IBOT_TEST_EXECUTABLE, Env:IBOT_DEV_URL -ErrorAction SilentlyContinue
npm test
npm run build
npm run test:desktop

# Optional, with Docker Linux engine and ibot-workspace:local already available.
try {
    $env:IBOT_RUNTIME_INTEGRATION = '1'
    & .\node_modules\.bin\tsx.cmd --test tests-desktop/runtime-integration.test.ts
} finally {
    Remove-Item Env:IBOT_RUNTIME_INTEGRATION -ErrorAction SilentlyContinue
}
```

For later feature work: first add a test that demonstrates the requested change; use small patches; keep the existing suite green; document why any new dependency is needed; review the Git diff before committing. Never print provider keys, connector tokens, runtime passwords, authenticated desktop URLs, or live state dumps. Existing capabilities should be extended instead of duplicated. Record files changed, commands/counts, and open risks for each task.

## Open risks and limits

- OneDrive exposure/locking risk remains until the repository is deliberately moved; Git ignores do not change sync policy. No source remote or off-machine Git backup is configured by this task.
- This verifies baseline source with installed dependencies and local generated bundles. Windows packaged release parity, code signing, real provider access, real connected-account permissions, and live secret isolation remain unverified.
- The old Playwright port mismatch is documented and deliberately unchanged. Typecheck and additional provider/options/avatar UI scripts were not run; do not infer that they passed.
- The green unit suite uses injected models/runtime or local fixtures and cannot establish adversarial prompt-injection safety, exact crash recovery, or actual Windows credential-vault guarantees. The architectural risks in `AUDIT.md` remain open.
- Tests retain temporary profiles, screenshots, and potentially test Docker volumes for inspection. These are local runtime artifacts excluded from the baseline; no unrelated user containers/volumes were deleted.

Files changed for this task: `.gitignore` and new `TESTING.md`, plus creation of Git metadata. Test/build execution refreshed ignored generated artifacts. Application source and dependency files were unchanged.

## Effect authorization validation — 2026-10-01

This section records the later authorization change; the baseline results above remain historical. The audit's four-transport approval limitation was reproduced before implementation. Media was rechecked and is user-only IPC, so no agent media tools were introduced. See `docs-desktop/effects.md` for the effect inventory, defaults, migration and enforcement boundaries.

Tests were added first. The initial focused suite exposed missing authorization on mutations and missing grant/policy behavior. Later regressions were demonstrated before repair: computer dispatch lost its runtime guard, provisioning persisted a credential after revocation, and a null rule array allowed an invalid settings request. Each now passes. Test credentials are explicit local fixtures; live credentials and state were never printed.

| Command | Pass | Fail | Skip | Result |
|---|---:|---:|---:|---|
| `npm test` | 53 | 0 | 2 | 55 tests; both skips require opt-in Docker |
| Focused effects tests, included above | 20 | 0 | 0 | Grant bindings, lifecycle, precedence, revocation, unknown effects and transport coverage |
| `npm run typecheck` | — | 0 | — | Exit 0 |
| `npm run build` | — | 0 | — | Exit 0 |
| `npm run test:desktop` | 9 checks | 0 | 0 | Development desktop smoke and restart persistence |
| `npm run test:options` | 17 checks | 0 | 0 | Local provider/MCP fixtures; connector class selection, policy revision and restart persistence |
| Opt-in `tsx --test tests-desktop/runtime-integration.test.ts` | 2 | 0 | 0 | Real Docker isolation, files, cancellation, restart and revoked credential provisioning; 80.40 seconds |
| `git diff --check` | — | 0 | — | No whitespace errors |

Docker checks used `IBOT_RUNTIME_INTEGRATION=1` only in their test shell. Desktop UI checks cleared runtime/dev-server/packaged-executable overrides, used disposable profiles, and exercised the built development application. The normal app's `state.json` SHA-256 still matched the baseline after testing. No dependencies were added or upgraded. No legacy Next.js source was changed.

Files changed: new `desktop/effects.ts`, `desktop/engine-effects.ts`, `tests-desktop/effects.test.ts` and `docs-desktop/effects.md`; extended `desktop/engine.ts`, `desktop/main.ts`, `desktop/runtime.ts`, `desktop/providers.ts`, `desktop/connectors.ts`, `desktop/store.ts`, `shared/types.ts`, `renderer/Marketplace.tsx`, `renderer/Settings.tsx`, `tests-desktop/engine.test.ts`, `tests-desktop/runtime-integration.test.ts`, `scripts/test-options-desktop.mjs` and this file. Generated bundles/screenshots remain ignored. The original orchestration test retains its assertions and now explicitly allows the local effects it intends to exercise.

Open risks: raw shell/browser/computer effects remain `execute` and cannot enforce semantic send/delete or network destinations without the planned egress gateway. Remote connector behavior must honor the user's assigned class. Existing connectors start unclassified and must be classified before agent use. Grants are process-local and expire; restart does not restore approval authority. Approval history is not an append-only audit log, and this change does not add credential brokering or exactly-once crash recovery. Packaged release parity and live account permissions were not tested. Existing OneDrive and baseline audit risks remain open except where this change explicitly addresses authorization.

## Approval card validation — 2026-10-01

Tests preceded the card follow-up: missing live presentation and host-side rejection of non-read Always allow were reproduced as failures; rendered component tests initially failed because the new extracted components were absent. The connector regression verifies restart persistence, changed schema revocation, and that a saved read confirmation cannot override a block. Existing policy precedence and exact grant matching in `desktop/effects.ts` were unchanged by this follow-up.

| Command | Pass | Fail | Skip | Result |
|---|---:|---:|---:|---|
| `npm test` | 59 | 0 | 2 | 61 tests; opt-in Docker tests skipped |
| Effects tests, included above | 23 | 0 | 0 | Presentation without disk payload, chat isolation, read confirmation/restart/schema/block coverage |
| Rendered approval/message tests, included above | 3 | 0 | 0 | Class/purpose/target/raw args, all non-read classes, spend highlight, empty/attachment-only messages |
| `npm run typecheck` | — | 0 | — | Exit 0 |
| `npm run build` | — | 0 | — | Exit 0 |
| `npm run test:desktop` | 9 checks | 0 | 0 | Existing desktop smoke |
| `node scripts/test-approvals-desktop.mjs` | 9 checks | 0 | 0 | Actual cards, chat reuse/new chat, confirmed reads/restart/schema, spend and decline; local HTTP fixtures, no Docker |
| `git diff --check` | — | 0 | — | No whitespace errors |

New current script: `scripts/test-approvals-desktop.mjs`; build first, then run the command above. It creates a disposable profile, uses only local provider/MCP fixtures, and keeps screenshots under ignored `artifacts/approvals`. Read/spend screenshots were visually inspected. Docker, packaged release, options and live-provider checks were not rerun for this follow-up; earlier results are historical.

Files changed in this follow-up: `desktop/engine.ts`, `desktop/engine-tools.ts`, `desktop/engine-effects.ts`, `shared/types.ts`, `renderer/App.tsx`, `renderer/premium.css`, `tests-desktop/effects.test.ts`, `docs-desktop/effects.md`, this file; new `renderer/ApprovalCard.tsx`, `renderer/MessageBody.tsx`, `tests-desktop/approval-ui.test.ts`, `scripts/test-approvals-desktop.mjs`. No dependencies were added. Prior authorization changes remain in the same uncommitted review tree.

Open risks: model purpose is advisory and may be inaccurate; raw arguments remain authoritative and visible. Model-omitted purposes use a labeled host fallback. Always allow confirms a read contract for future arguments, persists a classification receipt, and issues exact expiring grants; a dishonest remote connector can violate its classification. Chat grants last at most 24 hours and still require identical arguments. Policies/classes/schema changes revoke read confirmations. Egress, credential brokering, append-only audit history, packaged parity and OneDrive risks remain open.

## Connector classification validation — 2026-10-01

New tests preceded implementation. The missing classification module/view failed first. Additional regression tests reproduced missing legacy definition metadata and ignored output-schema changes before those were fixed. Server hints now remain suggestions, legacy/unconfirmed/new definitions ask, and only explicit user confirmation binds a class to the current definition. The existing engine transport test now declines the unconfirmed approval and verifies no connector call happened; its remaining policy/transport assertions are unchanged.

| Command | Pass | Fail | Skip | Result |
|---|---:|---:|---:|---|
| `npm test` | 64 | 0 | 2 | 66 tests; Docker remains opt-in |
| Connector classification tests, included above | 4 | 0 | 0 | Hint distrust/forced ask, legacy reconfirmation, retained class, input/output schema/name/description revocation, new tools, stale confirmation and ambiguous catalog revocation |
| Connector classification rendered UI test, included above | 1 | 0 | 0 | Suggestion/confirmation separation and explicit user control |
| `npm run typecheck` | — | 0 | — | Exit 0 |
| `npm run build` | — | 0 | — | Exit 0 |
| `npm run test:options` | 17 checks | 0 | 0 | Marketplace confirmation and restart, plus existing options checks |
| `node scripts/test-approvals-desktop.mjs` | 10 checks | 0 | 0 | Settings classification with zero tool calls; existing approval/grant/schema/spend checks |
| `npm run test:desktop` | 9 checks | 0 | 0 | Existing desktop smoke |
| `git diff --check` | — | 0 | — | No whitespace errors |

Two UI-script selector failures were test maintenance: the Settings button is labeled App settings, and the new schema details added a nested summary. Both locators were corrected and their suites rerun. No product failure was hidden. UI checks use isolated profiles and local provider/MCP fixtures; the normal profile remains unchanged. The currently installed cached tool inventory was read from the normal profile without contacting Apify. It contains one connection and zero saved tool definitions; live server tools are UNKNOWN. See `docs-desktop/effects.md` for the inventory.

Files changed in this follow-up: new `desktop/connector-effects.ts`, `renderer/ConnectorToolClasses.tsx`, `tests-desktop/connector-classification.test.ts`, `tests-desktop/connector-classification-ui.test.ts`; extended `desktop/effects.ts`, `desktop/engine-effects.ts`, `desktop/engine.ts`, `shared/types.ts`, `renderer/Settings.tsx`, `renderer/Marketplace.tsx`, `tests-desktop/effects.test.ts`, `scripts/test-options-desktop.mjs`, `scripts/test-approvals-desktop.mjs`, `docs-desktop/effects.md` and this file. No dependencies were added. Earlier authorization/card work remains in the same uncommitted tree.

Open risks: classification depends on a user-confirmed contract and cannot verify a remote implementation. Unobserved server changes between explicit catalog refreshes remain UNKNOWN. The deliberately conservative provisional send class also enforces write blocks but does not implement network egress or cost enforcement. Legacy class records without a definition hash need reconfirmation. Docker, packaged release and real account permissions were not rerun for this classification follow-up; earlier Docker results remain historical. Existing OneDrive, credential and auditing risks remain open.

## Repeated authorization card recheck — 2026-10-01

Re-read `AUDIT.md` gap 3 and Control, then traced the current tool registry, effect classifier/authorizer, mutation/transport dispatch, policy changes, user actor envelope and media paths. The requested feature already exists, including the later scoped cards and conservative connector classifications. No missing card requirement was reproduced, so no duplicate implementation or behavior change was made. Media remains user-only IPC and unknown model effects remain denied.

Fresh commands: `npm test` — 66 tests, 64 pass, 0 fail, 2 expected Docker skips; `npm run typecheck` — exit 0; `git diff --check` — exit 0. Build, desktop UI, Docker and live connectors were not rerun because this recheck changed only documentation. Their earlier results remain historical.

Files changed for this recheck: `docs-desktop/effects.md` and `TESTING.md`. Application/test/dependency files were unchanged by this turn; earlier work remains uncommitted. Open risks remain egress control for execute effects, trust in remote connector behavior, credential isolation, durable audit/replay and OneDrive exposure. This recheck does not claim those separate audit gaps are resolved.

## Approval-card and connector lifecycle verification — 2026-10-01

Rechecked the six requested requirements against source and named tests instead of relying on an earlier screenshot or completion claim. Existing card presentation, grants and spend styling were verified. Added dedicated per-connector Refresh tools, saved connector catalog activity, startup discovery and once-per-connector-per-run discovery before execution. New lifecycle tests and invisible-message/Refresh UI assertions failed before implementation, then passed. Added simultaneous read/spend rendering and Activity rendering assertions. No dependencies changed; tests use isolated profiles and local fixtures without contacting installed remote connectors.

| Command | Pass | Fail | Skip | Result |
|---|---:|---:|---:|---|
| `npm test` | 66 | 0 | 2 | 68 tests, including two new connector lifecycle tests; final repeat passed |
| `npm run typecheck` | — | 0 | — | Exit 0 |
| `npm run build` | — | 0 | — | Exit 0; fresh built renderer used for UI checks |
| `npm run test:desktop` | 9 checks | 0 | 0 | No Docker required |
| `npm run test:options` | 17 checks | 0 | 0 | Existing settings/marketplace regression checks |
| `node scripts/test-approvals-desktop.mjs` | 11 checks | 0 | 0 | List-only Refresh, card fields/scopes, no bubble, restart/schema invalidation, spend, decline |
| `git diff --check` | — | 0 | — | Checked before committing |

One approval desktop attempt failed a numeric assertion and its retry passed. The test's send helper could return before the new IPC run started, allowing the idle check to observe the previous state. It now waits for the submitted user message before testing idle; the complete fixture passed again. The precise original failure cause was not captured, so attribution to that race remains an inference. Fresh `artifacts/approvals/read-card.png` was visually inspected and shows the current class, labeled purpose, target, raw arguments and scope buttons with no empty assistant bubble. Screenshots are ignored generated artifacts.

Current verification changes: `desktop/engine.ts`, `shared/types.ts`, `renderer/ConnectorToolClasses.tsx`, `renderer/MessageBody.tsx`, `tests-desktop/approval-ui.test.ts`, `tests-desktop/connector-classification-ui.test.ts`, `tests-desktop/connector-classification.test.ts`, new `tests-desktop/connector-lifecycle.test.ts`, `scripts/test-approvals-desktop.mjs`, `docs-desktop/effects.md` and this document. Earlier authorization, grant, classification, UI and supporting tests in the current tree are included in the review branch commits rather than discarded. Implementation evidence for each requirement is recorded in `docs-desktop/effects.md`.

Review branch: `review/authorization`, created from `main`. Core authorization/classification/discovery share engine and type changes and are committed together; renderer/UI checks and documentation are separate commits. No merge or push requested/performed. No secret, runtime state, dependency directory, build output or screenshot is staged.

Open risks: packaged release and real connector/account behavior were not tested in this verification (**UNKNOWN**). Docker was not rerun; its two tests remain opt-in skips and earlier integration results are historical. Server implementation trust and changes after a run's first discovery remain outside these checks. Egress, credential isolation, durable audit/replay and OneDrive risks from the audit remain open.

## Video reference: bot names, creation and main bot — 2026-10-01

Inspected the supplied 114-second recording with sampled frames, including the pinned primary bot and its replacement menu. Messages inside the recording were treated as reference content, not instructions to perform their tasks. Existing name editing (`BotDialog`/`bot.update`), manual bot creation, and Chief's authorized `create_bot` tool were retained. Added accessible per-bot options for Rename, Make main bot, and Create new bot, reusing existing dialogs. The main bot appears in a separate starred sidebar card and is starred in the recipient/chat header. A user-only `bot.setMain` IPC persists the selection; default new chats and group selection use it. Existing chats keep their bot IDs and names are changed without replacing identity, memory or workspace. Legacy profiles default to Chief without changing bot order or granting permissions.

Tests were written and run first: both failed for missing main-bot state/navigation, then passed after implementation. The rendered navigation test uses a fixture avatar image to avoid invoking the browser animation clock during static rendering; the desktop fixture exercises actual animated avatars. The engine test also verifies that a model run routes to the selected main bot, invalid IDs do not change selection, and names/selection survive restart. Existing orchestration tests still cover Chief creating and delegating to specialists.

| Command | Pass | Fail | Skip | Result |
|---|---:|---:|---:|---|
| `npm test` | 68 | 0 | 2 | 70 tests; Docker remains opt-in |
| `npm run typecheck` | — | 0 | — | Exit 0 |
| `npm run build` | — | 0 | — | Exit 0; existing large-chunk warning remains |
| `node scripts/test-bots-desktop.mjs` | 9 checks | 0 | 0 | Rename/create/replace/star/default recipient/restart, no renderer errors |
| `npm run test:desktop` | 9 checks | 0 | 0 | Existing smoke suite unchanged and green |
| `git diff --check` | — | 0 | — | No whitespace errors |

Files changed: `desktop/engine.ts`, `desktop/main.ts`, `desktop/store.ts`, `shared/types.ts`, new `shared/bots.ts`, `renderer/App.tsx`, `renderer/Dialogs.tsx`, `renderer/premium.css`, new `renderer/BotNavigation.tsx`, `tests-desktop/main-bot.test.ts`, `tests-desktop/bot-navigation-ui.test.ts`, `scripts/test-bots-desktop.mjs`, `docs-desktop/effects.md` and this file. No dependencies were added. Generated video-review frames and the visually inspected `artifacts/bots/main-bot.png` are ignored; the normal user profile was not modified by the isolated tests.

Open risks: packaged release and real-provider specialist creation were not exercised in this follow-up (**UNKNOWN**); the existing local orchestration fixture passed. Main-bot selection changes the default recipient, not permissions or a bot's saved specialist instructions. The original recording's other menus (such as deletion, unread and hide) are outside the requested name/create/main-bot scope. Existing audit risks remain open. Changes stay on `review/authorization`; no merge or push.


## Research report implementation — October 2, 2026

Scope: the report-selected security/recovery stage, scoped Markdown memory and explicit routing. Source baseline: `a8e0694` on `review/authorization`; implementation changes are recorded in subsequent commits on that branch. No dependency additions/upgrades or lockfile changes. The research follow-up adds only an offline evaluation script to package.json. Tests use isolated temporary profiles; production credentials/profile/volumes were not opened or pruned. The workspace image tag was rebuilt for the new Docker containment layout.

| Command/check | Final result | Notes |
| --- | --- | --- |
| `npm test` | 92 cases: 90 pass, 0 fail, 2 Docker skips | Includes existing tests and new journal, crash, recovery, verifier, context, memory, routing and per-bot-profile coverage |
| `npm run typecheck` | Pass | Final runtime/type changes checked |
| `npm run build` | Pass | Existing >500 kB renderer bundle warning remains |
| `npm run test:desktop` | Pass, 12 named checks | Electron startup/restart, real Windows safeStorage synthetic encryption, note edit/rollback/delete and Activity UI |
| `npm run test:options` | Pass, 17 named checks | Existing appearance, model/media, connector classification, voice, export and restart flows |
| `IBOT_RUNTIME_INTEGRATION=1 npx tsx --test tests-desktop/runtime-integration.test.ts` | 2 pass, 0 fail | Real Docker, ~43.6 seconds; separate computers, file bridge, profiles, credentials, screenshot, command cancellation, exact-host HTTPS and revocation, DNS/direct-route denial |
| `python -m unittest tests-desktop/egress_proxy_test.py` | 5 pass, 0 fail | Malformed/default denial, exact hosts, private/metadata/mixed addresses, DNS pinning, port/authority validation and log fields |
| Electron Node SQLite probe | Pass | Actual Electron process reported Node 24.21.0 and built-in DatabaseSync; no SQLite dependency added |

Tests were added before the corresponding core implementations. Initial missing-module failures and a pre-isolation credential-file assertion established failures before those implementations. The targeted verifier test initially completed incorrectly instead of pausing, then passed after read-only/verdict enforcement. The taint persistence test initially failed to receive an approval, then passed after context enforcement. The per-bot model test initially used the global profile, then passed after profile binding.

Observed failures during iteration: Docker default subnet pools were exhausted (environment allocation issue); explicit small internal subnets resolved allocation. The initial internal-network viewer had no reachable published ingress (implementation failure); the fixed-target gateway viewer solved it. The first note rollback UI check read the old form before its asynchronous refresh (test synchronization failure); waiting for completed form refresh fixed it, and the subsequent desktop runs passed. These failures are not hidden in the final pass counts.

The Docker-enabled full desktop teaching script, packaged executable, all action crash boundaries, ten-minute real-time teaching cap, network/VPN overlap on other machines, and production vendor endpoints were not exercised for this change: UNKNOWN. Docker remains opt-in in npm test. Existing legacy browser/Next.js tests remain historical and their port-3000 config does not test the current Electron app. See docs-desktop/research-implementation.md for migration guidance and open risks; passing these targeted tests does not establish the complete report architecture.


## Research follow-up and clean review snapshot — October 2, 2026

Canonical validation used a Git archive of `32f0ec2` in `C:\Users\rames\AppData\Local\Temp\ibot-review-validation-uaushj38`, with the existing node_modules linked in; no dependency installation or production profile access. `3893d8b` differs only by normalizing the committed App.tsx line endings. Documentation changes after it do not change behavior. These clean-snapshot counts supersede shared-working-tree counts for this delivery: another task is editing avatars in the same checkout.

| Command | Pass | Fail | Skip | Result |
| --- | ---: | ---: | ---: | --- |
| `npm test` | 94 | 0 | 2 | 96 cases in tracked snapshot; Docker is opt-in |
| `npm run typecheck` | — | 0 | — | Exit 0 |
| `npm run build` | — | 0 | — | Exit 0; existing >500 kB bundle warning |
| `npm run test:desktop` | 12 checks | 0 | 0 | Real Electron, isolated profile; persistence, Windows safeStorage, note UI and Activity |
| `npm run test:options` | 17 checks | 0 | 0 | Isolated local fixtures; settings, connector confirmation, voice and restart |
| `npm run eval:memory` | 10 | 0 | 0 | Synthetic retrieval only; same harness against `ace4345` passed 5/10 |
| `python -m unittest tests-desktop/egress_proxy_test.py` | 5 | 0 | 0 | Rerun against tracked snapshot |
| `git diff --check a8e0694 HEAD` | — | 0 | — | Committed patch checked in actual repository |

The two real Docker integration tests passed earlier in this implementation stage (see preceding table); runtime code did not change during the memory follow-up. They were not rerun in the clean snapshot. No live provider, private connector or externally billed job was called during the research evaluation.

Tests added before retrieval fixes demonstrated missing-evidence fallback, oversized source-note loss, incorrect historical retrieval and unsafe non-finite budgets. A later regression showed common question words retrieving unrelated notes; filtering those words fixed it. The first evaluation-module import failed because top-level await was incompatible with the test loader; the entry point now uses an explicit promise and both the unit gate and CLI pass. The first clean snapshot failed type checking/build because App.tsx had an avatar import whose files belonged to concurrent work. The committed import/provider wrapper was removed without overwriting the working file; clean validation then passed. The Git-only snapshot correction initially introduced CRLF blob line endings; normalization resolved the whitespace check. These were implementation/test failures, not dismissed as flaky.

Source notes now use overlapping original-text chunks, time and scope filtering before ranking, provenance, bounded evidence and no unrelated fallback. Automatically retrieved notes activate the authorization context guard before any model-controlled write. A ten-case local check is not LongMemEval answer accuracy, a security proof or a measured production recall result. Primary sources and decisions are in docs-desktop/research-decisions.md.

Open risks: host provider/MCP traffic is outside the container proxy; approved GUI actions can access desktop browser state; no orphan-run watchdog/full transactional run database; secret detection remains heuristic; memory lexical recall and character/token estimates remain limited. Packaged release, real vendor endpoints, complete crash-boundary coverage and the real-time teaching cap remain UNKNOWN. Separate avatar work is preserved and excluded from these commits. No merge or push.

Changed-file inventory for this report/research delivery, relative to `a8e0694`:

```text
.gitignore
TESTING.md
containers/Dockerfile
containers/chromium-egress.conf
containers/egress_proxy.py
desktop/action-journal.ts
desktop/desktop-broker.ts
desktop/effects.ts
desktop/engine-effects.ts
desktop/engine-tools.ts
desktop/engine.ts
desktop/main.ts
desktop/memory.ts
desktop/routing.ts
desktop/runtime.ts
desktop/store.ts
desktop/verification.ts
docs-desktop/effects.md
docs-desktop/research-decisions.md
docs-desktop/research-implementation.md
package.json
renderer/ActivityPanel.tsx
renderer/App.tsx
renderer/BotDetails.tsx
renderer/Computer.tsx
renderer/Dialogs.tsx
renderer/MemoryPanel.tsx
renderer/NetworkPolicy.tsx
renderer/Settings.tsx
scripts/eval-memory.d.mts
scripts/eval-memory.mjs
scripts/test-desktop.mjs
shared/network-policy.ts
shared/types.ts
tests-desktop/action-journal.test.ts
tests-desktop/authorization-context.test.ts
tests-desktop/desktop-broker.test.ts
tests-desktop/egress_proxy_test.py
tests-desktop/engine.test.ts
tests-desktop/memory-evaluation.test.ts
tests-desktop/memory.test.ts
tests-desktop/network-policy.test.ts
tests-desktop/recovery.test.ts
tests-desktop/routing.test.ts
tests-desktop/runtime-integration.test.ts
tests-desktop/verification.test.ts
```


## Screenshot follow-up: incomplete approval and connector retries — October 2, 2026

The supplied screenshot shows an unclassified approval with no presentation/arguments, unknown connector tool messages, and a declined action followed by another request. The exact live-process cause is UNKNOWN: current authorization denies unclassified effects before requesting approval, and startup invalidates old pending requests. An older running main process paired with newer renderer files is a plausible explanation, not established evidence. No production state, credentials or connector tools were inspected/called.

Confirmed and corrected in source:

- `settings.update` returned the raw stored snapshot, dropping temporary approval presentation. It now returns the same decorated snapshot as state.get/events. Raw arguments remain process-only and are absent from state.json.
- An identical confirmed read reused for a chat lost its grant when successful reference retrieval marked the chat untrusted. Read grants now tolerate that flag transition; writes still require a new grant. Exact arguments, class, policy, target, scopes and expiry remain checked.
- Identical denied actions asked again within a run. A run-local fingerprint set now rejects that retry; it is discarded with the run. Changed requests and new runs remain distinct. This is not a general proof against equivalent actions through different tools.
- Invalid connector calls now validate against the freshly listed catalog before requesting an action approval. Errors identify available tool names and direct users to Refresh tools. Unknown tools are never called or auto-confirmed.
- Legacy/incomplete cards show Approval unavailable and recovery guidance with only Dismiss request. Missing arguments or class cannot enable Allow controls; arguments are never reconstructed or invented.

Five new regression tests failed before their fixes, then passed. The desktop approval fixture initially failed its repeated-read count (1 versus 2); focused unit tests separately proved the taint/grant defect. A clean-checkout retry also showed its idle helper returning before the run finished (a subsequent snapshot was still running). The helper now explicitly awaits resolved IPC state before testing the condition; the exact cross-context Promise mechanism is UNKNOWN. The fixture now expects no second approval for an identical denied call. Final shared-tree unit count: 105 total, 103 pass, 0 fail, 2 Docker skips; type checking and build pass. The isolated tracked snapshot at `be27b30` passes 101 tests total: 99 pass, 0 fail, 2 Docker skips; type checking/build pass. Both snapshots exclude production profiles. The shared tree additionally includes separate uncommitted avatar tests. No dependencies changed; Docker was not rerun because execution/container code is unchanged. Existing bundle-size warning remains.

Files changed: desktop/engine.ts, desktop/effects.ts, renderer/ApprovalCard.tsx, tests-desktop/effects.test.ts, tests-desktop/approval-ui.test.ts, tests-desktop/connector-lifecycle.test.ts, scripts/test-approvals-desktop.mjs and this document. Separate avatar/App/MessageBody edits are preserved outside these commits. Branch: review/authorization; no push or merge.

To load the fixed main process, quit I Bot completely (including the tray) and reopen the updated build. Renderer reload alone does not replace the running engine. A separately installed executable requires a rebuilt package; packaged/live-provider verification is UNKNOWN.


Final screenshot follow-up UI verification: `node scripts/test-approvals-desktop.mjs` passed all **11 checks** in the isolated tracked checkout with the `d3caeff` fixture and `be27b30` application build. The read card screenshot was visually inspected: class, labeled model-generated purpose, actual target, raw arguments and all eligible scopes are visible. The final fixture waits for resolved engine state and then card removal; both earlier timing failures are recorded above. The shared working checkout also passed this fixture. No real connector tool or provider was called. Committed-patch whitespace check passed. Build output in the workspace was refreshed; the user's already-running engine was not forcibly stopped or modified.


## Installed app update — October 2, 2026

Updated the running `release-avatar/win-unpacked/I Bot.exe` deployment with a complete Electron 44.4.1 package, replacing backend, renderer and bundled containers together. Previous avatar deployment tooling intentionally retained its backend while replacing UI; this established a version mismatch, although the exact original approval's live cause remains UNKNOWN. Existing source/avatar work was preserved and included in the built renderer, without committing those separate working edits.

Validation: typecheck/build passed; `electron-builder --win --dir --x64 --config.directories.output=artifacts/app-update-20261002` succeeded; the actual packaged executable passed all 12 checks in `scripts/test-desktop.mjs` using an isolated temporary profile. Packaged main.cjs was byte-compared with the compiled workspace backend and matches. Deployed app.asar SHA256: `89BBE85ADF67547230F9FCE847BC8493DBAD35DB025F7E2800DE649EE6449858`.

The old app was quit through Local profile → Quit I Bot using Computer Use, allowing engine shutdown to save and pause outstanding work. No forced termination or manual profile/secret editing. Renamed the old package to `release-avatar/win-unpacked.before-full-update-20261002-1716` and moved the verified full package to the original launch path. No package/profile files were deleted. Reopened that executable and visually verified the saved chats/bots, model selection and Memory notes control; the stale active-run indicator is gone. Outstanding work must be resumed explicitly by the user.

Files changed: generated application package under release-avatar/win-unpacked (ignored), prior package backup (ignored), build artifacts (ignored), and this TESTING.md record. No new source/dependency changes in this update. Application version remains 0.5.1; the package hash identifies this build. Live vendor tools/provider authentication and packaged approval fixture remain UNKNOWN/not rerun; source approval fixture already passed 11 checks. No push/merge.
