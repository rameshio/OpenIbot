# Desktop release verification

Initial runtime release verified on Windows with Docker Desktop's Linux engine,
September 30, 2026. Subsequent release checks are recorded below.

- TypeScript checking and production build passed.
- Eight offline tests passed for orchestration, delegated workspace ownership,
  verification, durable memory, approvals, cancellation, schedules, credentials,
  appearance, identifiers, and attachment paths.
- The separate real Docker integration test passed: two independent computers,
  isolated files and home directories, binary file handoffs, file-bridge checks,
  screenshots, command cancellation, and persistence after a computer restart.
- The packaged Windows app passed its desktop checks: boot, bot creation,
  group chats, model setup gate, theme and motion, remembered instructions,
  persistence after restarting, Linux screen connection, terminal commands,
  file editing, demonstrated clicks, and saving a taught skill.

The computer interaction check uses a visible window. Model orchestration tests
use an injected test model and do not spend provider credits. No live model
generation or external connected account was verified without user credentials.

Evidence: `artifacts/runtime-integration.log`,
`artifacts/packaged-desktop.log`, `artifacts/packaged-linux-desktop.log`, and
screenshots in `artifacts/desktop/`. The portable executable's SHA-256 checksum
is saved in `release/SHA256SUMS.txt`.

The working desktop shortcut is `C:\Users\rames\OneDrive\Desktop\OpenIbot.lnk`.
It opens `release-auth/win-unpacked/I Bot.exe`. The current portable release
is `release-auth/I-Bot-0.4.1-x64.exe`, with its checksum in
`release-auth/SHA256SUMS.txt`.

## Premium UI update, version 0.3.0

Higgsfield Grok Image generated the design reference successfully (job
`b79d0eab-d78c-4f00-8c0e-118c9b7df049`). Its concept and brief are saved in
`artifacts/design/`. The desktop renderer implements warm graphite and ivory
themes, sage controls, an editorial greeting, shaded animated bot identities,
and matching settings, marketplace, conversation, and computer surfaces.

The production build, TypeScript check, and packaged desktop smoke checks passed.
`scripts/verify-premium.mjs` checks both themes, settings, marketplace, inline bot
settings, compact and focused layouts, composer visibility, and renderer errors.
Screenshots are in `artifacts/design/premium-*.png`; the conversation screenshot
uses explicitly identified test fixtures in a temporary profile. No preview data
is added to the user's profile. Linux runtime behavior is unchanged from the
previously verified release. This update did not repeat the Docker integration
test or spend model-provider credits for bot execution.

## Video reference update, version 0.3.1

The supplied 81-second Grok Bot capture was reviewed through frames sampled
across the recording, full-size conversation frames, and a dense avatar motion
sequence. Review artifacts are in `artifacts/video-reference/`.

The update adds a centered bot profile with keyboard-accessible Details, Library,
and Computer tabs; durable routine switches; shared conversation attachments;
workspace file and terminal shortcuts; conversation date markers; and expandable
long tool results. Avatar eyes now sit directly on each colored silhouette,
with separate blink phases, gentle turning, and activity expressions. Avatars
remain built into bots and respect the existing motion preferences.

TypeScript checking, the production build, desktop smoke checks, and the focused
UI verification passed. The UI checks also verify routine switches against saved
state, file visibility in Library, working-avatar animation, and disabling motion.
The preview conversation and routine are confined to temporary test profiles.
The user's stored conversations, bots, and model settings are preserved.

The packaged 0.3.1 app also passed real Linux screen connection, terminal,
workspace file editing, demonstrated clicks, and saving a taught skill. Evidence:
`artifacts/design/packaged-video-desktop-check.log`. Background controls are inert
and hidden from assistive technology while a full computer view or dialog is
open. The desktop shortcut for that release started the verified 0.3.1 package.

## API provider connections, version 0.4.0

The new editor has 41 API-key/local presets and editable endpoints. It discovers
models before requiring a model selection, saves multiple encrypted connections,
and switches providers/models from the composer. Existing runs retain their
original provider and credential. See `providers.md` for behavior and sources.

TypeScript and the production build passed. The offline suite passed 17 tests;
the separate real Docker integration test was skipped in this update because
the Linux runtime was unchanged. Nine new provider tests cover catalog discovery,
native API adapters, pagination, error redaction, redirect rejection, independent
keys, migration, persistence, and switching during a run. API responses in these
tests come from explicit local fixtures, rather than paid generation requests.

The packaged 0.4.0 executable passed the full provider UI test and the desktop
smoke test, with logs in `artifacts/providers/packaged-provider-check.log` and
`artifacts/providers/packaged-desktop-check.log`. UI checks cover adding two
connections, discovery before selection, saved-key reuse, invalid-key errors,
model search, quick switching, manual IDs, removal, compact layout, and restart
persistence. The existing premium UI checks also passed both themes, settings,
marketplace, detail tabs, routine switches, library, and avatar motion.

Screenshots in `artifacts/providers/` use an isolated temporary profile and
explicitly named fixture models. No fixture data enters the user's profile.
The live user profile was backed up before reopening the new app. Its one bot,
two chats, four messages, existing selected model, and encrypted API credential
were preserved. The older model configuration became one saved connection.

The desktop shortcut for 0.4.0 targeted `release-providers/win-unpacked/I Bot.exe`.
That portable release is `release-providers/I-Bot-0.4.0-x64.exe`, with a SHA-256
checksum in `release-providers/SHA256SUMS.txt`.

## OpenRouter connection handling, version 0.4.1

OpenRouter discovery now verifies a regular secret key with `/key` before loading
the account catalog. Rejected keys stop discovery and show an actionable error
beside the key field. A verified key can load an explicitly labeled public
catalog if the account catalog endpoint is unavailable. Key names, hashes, and
management keys cannot replace a regular model API secret. Common pasted quotes,
Bearer prefixes, and API-key environment assignments are normalized before use.

TypeScript and the production build passed. The offline suite passed 23 tests;
the separate real Docker integration test was skipped because the runtime is
unchanged. New checks cover rejected keys without fallback, management keys,
paste normalization, verified catalog fallback, offset pagination, and identifying
catalog errors after successful key verification. No paid model request was made.

The packaged 0.4.1 app passed the full provider UI test and desktop smoke test.
Evidence is in `artifacts/providers/packaged-auth-check.log` and
`artifacts/providers/packaged-auth-desktop-check.log`. The key error and verified
fallback screenshots in `artifacts/providers/` were visually inspected and use
an isolated temporary profile with explicit fixture models. The user's masked,
unsaved OpenRouter key could not be tested from the supplied screenshot.

The user's idle app was backed up, reopened, and verified as responding on 0.4.1.
Its complete stored state, encrypted secrets, and routine slots were unchanged;
the profile had one bot, three chats, six messages, and no saved connections at
the time of update. The shortcut targets `release-auth/win-unpacked/I Bot.exe`.
The portable release and SHA-256 checksum are in `release-auth/`.
