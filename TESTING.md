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
