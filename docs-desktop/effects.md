# Effect authorization

This extends the existing main-process approval path. The original audit was rechecked against the source: the old `authorize()` covered shell, browser, computer and connector tools; local mutations bypassed it; policy was checked before waiting only. Media is **user IPC only**, not an agent tool. No agent media capability was added.

`shared/types.ts` defines `Effect`, `EffectGrant` and decisions. Host classifications live in `desktop/engine-effects.ts:toolEffect`. `desktop/effects.ts:createEffectAuthorizer` owns the single `authorizeEffect(effect)` implementation. `desktop/engine.ts` supplies the existing approval resolver/UI and guards every agent tool before dispatch. A model cannot supply its actor, class, scope or grant through tool arguments.

## Agent-reachable inventory

Classes describe the effect of the trusted entry point, not guessed intent inside arbitrary commands. The actor is `agent` for explicit model tool calls. Supporting operations are `system` and use the same authorizer. Internal chat/status/usage/approval bookkeeping is a system consequence of an authorized operation, not a separate user-facing permission prompt.

| Effect ID | Agent tool / operation | Transport | Class | Actor | Enforcement |
|---|---|---|---|---|---|
| `bot.create` | `create_bot` | internal state | admin | agent | `toolEffect` → engine dispatch → authorizer, immediately before `createBot` |
| `bot.delegate` | `delegate`, `message_bot` | in-process handoff | send | agent | Same dispatcher, before handing task/context to `runAgent` |
| `file.list` | `list_files` | Docker file bridge | read | agent | Dispatcher; runtime guard before bridge invocation |
| `file.read` | `read_file` | Docker file bridge | read | agent | Dispatcher; runtime guard before bridge invocation |
| `file.write` | `write_file` | Docker file bridge | write | agent | Dispatcher; guard after provisioning and before bridge invocation |
| `file.share` | `share_file` | source/recipient Docker file bridges | upload | agent | Dispatcher; guards before source read and recipient write; scope includes both bot paths |
| `shell.execute` | `run_shell` | Docker shell runner | execute | agent | Dispatcher; guard after provisioning and immediately before Docker command |
| `browser.open` | `browser_open` | Docker shell → Chromium | execute | agent | Same as shell; target includes requested URL |
| `computer.control` | `computer` | Docker shell → xdotool | execute | agent | Same as shell; input actions/coordinates/text bound in arguments |
| `computer.screenshot` | `screenshot` | Docker screenshot capture | read | agent | Dispatcher and guard before screenshot command |
| `memory.write` | `save_memory` | bot state | persist | agent | Dispatcher immediately before replacement/save |
| `skill.write` | `save_skill` | bot skill state | persist | agent | Dispatcher immediately before creation/save; model cannot supply an existing skill ID or other bots' assignments |
| `routine.write` | `schedule_routine` | routine state | persist | agent | Dispatcher immediately before creation/save; model cannot supply an existing routine ID or other bot's identity |
| `connector.call` | `connector_call` | HTTP MCP | definition-bound confirmed class; otherwise provisional send, ask | agent | Dispatcher and recheck after MCP initialization, immediately before `tools/call`; missing/unknown tools still denied |
| `workspace.ensure` | provision/start supporting a tool | Docker resources and local runtime credentials | admin | system | Authorizer; guard before network/volume/container creation, start and credential injection |
| `model.request` | coordinator/specialist/reviewer inference | provider HTTP | spend (also matches send/upload rules) | system | Authorizer before model call; provider guard before each fetch/retry; credentials excluded from hashed payload |
| `file.import` | transfer a user-selected attachment into a bot workspace | native import → Docker file bridge | upload | system | Authorizer before transfer; guards before reading imported source and bridge write |
| `bot.create` | automatic verifier creation | internal state | admin | system | Authorizer immediately before creation |
| `file.read` | collect another bot's evidence for verification | Docker file bridge | read | system | Authorizer with owning bot in scope; guard before bridge invocation |
| unclassified | any unknown tool, including attempts to invoke `media.*`, `settings.update` or other IPC commands as a tool | unknown | absent | agent | Authorizer denies even with `autoReview=false` or wildcard allow |

The file bridge retains traversal/link checks; authorization does not replace them. Sharing includes disclosure, a source read and recipient write. Its upload class therefore also matches `read`, `write` and `send` rules. Reads cannot be smuggled into sharing to escape a read block. Persist/admin/delete classes also match `write`. Shell/browser/computer always remain `execute`: a `send` or `delete` rule cannot identify equivalent raw shell/browser behavior. Destination/data control requires a later egress gateway.

Read-only local tools, model inference, and supporting system operations have a host-defined default allow so that reading and the user-started conversation do not require an approval every turn. Explicit block/ask rules override these defaults. New agent mutations/delegation require approval with review enabled unless an allow rule applies. These defaults are selected by the dispatcher, never the model.

## User IPC inventory

After sender validation in `desktop/main.ts`, every invoke request receives a host-created envelope with **`actor: user`**. `engine.invoke` accepts only user context; effect-related actor metadata in the input payload cannot change it. User operations remain direct and retain the existing IPC allowlist, dialog, endpoint, size and path validation. A scheduler has actor `system`; its model/tool work goes through the authorizer above. None of this is a new audit log or persisted attribution system.

| Effect/IPC IDs | Transport | Class | Actor | Enforcement |
|---|---|---|---|---|
| `state.get`, `app.info`, `runtime.status`, `workspace.inspect` | main process/local Docker | read | user | Validated IPC, direct |
| `bot.create`, `bot.update`, `bot.setMain` | state | admin / persist | user | Engine user context, direct; main-bot selection is user-only and absent from the model tool registry |
| `chat.create`, `chat.send`, `chat.resume`, `routine.run` | state/run initiation | admin / execute | user | Engine user context; ensuing system/model/agent work uses effect authorization |
| `chat.pause`, `media.cancel` | cancellation | admin | user | Engine user context, direct cancellation |
| `chat.delete`, `routine.delete`, `skill.delete`, `provider.delete`, `connector.delete` | state/credential removal | delete | user | Engine user context; connector removal invalidates policy/grants |
| `settings.update`, `approval.resolve`, `connector.classify` | policy/approval state | admin | user | Engine user context; policy version and stale resolver checks |
| `routine.save`, `skill.save`, `skill.install` | state | persist | user | Engine user context, direct |
| `provider.save`, `provider.activate`, `connector.save` | connection/secret state | admin | user | Engine user context, scoped encrypted storage; connector changes invalidate grants |
| `provider.discover`, `provider.test`, `media.models`, `connector.test` | provider/MCP HTTP | read | user | Engine user context and endpoint validation; connector catalog changes revoke classifications/grants |
| `media.generate` | image provider HTTP | spend | user | Engine user context, explicit user UI; no model tool |
| `media.transcribe` | audio provider HTTP | upload / spend | user | Engine user context, explicit user UI; no model tool |
| `connector.authorize` | OAuth/browser/HTTP → encrypted storage | admin | user | Validated IPC, OAuth state/PKCE, direct; authority changes invalidate grants |
| `workspace.start`, `workspace.stop`, `runtime.build` | Docker | admin | user | Main-process direct runtime calls |
| `workspace.exec` | Docker shell | execute | user | Main-process direct runtime call |
| `workspace.files`, `workspace.read`, `workspace.screenshot` | Docker bridge/capture | read | user | Main-process direct runtime calls |
| `workspace.write` | Docker file bridge | write | user | Main-process direct runtime call, existing path validation |
| `workspace.export`, `chat.export` | native dialog → host file | write | user | Native save dialog; agent cannot choose a host destination |
| `files.pick`, `avatar.pick` | native dialog → app imports/image processing | read / write | user | Native open dialog and validation |
| `files.open`, `app.open-data`, `external.open` | native shell | execute | user | IPC/path/URL checks, direct |
| `voice.microphone`, native window controls | Electron permission/window | admin | user | Existing trusted sender/permission handlers |
| screen “take control” / teaching clicks | noVNC iframe | execute | user | Authenticated localhost viewer, existing source/origin checks; not model IPC |

Effect lists deliberately include media and the file bridge even though media is not agent-reachable. New agent entry points must construct a trusted classified Effect and use `authorizeEffect`; simply adding an IPC string to model tools is denied.

## Rules and grants

Decision precedence is **block → ask → allow**. A matching block denies regardless of wildcard allow, disabled review or prior grant. Ask requires a valid grant. Allow permits the effect unless policy changes before dispatch.

Rules can match `*`, a class (`read`, `write`, `send`, `spend`, `delete`, `upload`, `persist`, `execute`, `admin`), an effect ID (`memory.write`, `routine.write`, etc.), the retained legacy transport (`shell`, `computer`, `browser`, `connector`), or `connector:<connector-id>:<class>`. This keeps existing four-category policies and the existing Allow/Decline UI.

Connector tools without a current user confirmation ask before dispatch, including legacy classes without a definition hash. Settings → Connectors and Marketplace → Installed → Tools and assigned bots share the same classification view. It shows each saved tool's description/schema, advisory suggestion and confirmed class. Selecting a class does not save it; the user must click Confirm class. Read/write rules apply independently per connector after confirmation. Server annotations and classifications never confer authority. A remote tool's actual behavior still depends on the server honoring the user-confirmed contract; classification is not server sandboxing.

A grant carries exactly:

```text
{ effectClass, target, argsHash, dataScope, policyVersion,
  scope: once | chat | task | until, expiresAt }
```

Arguments are canonically serialized (object keys sorted) and SHA-256 hashed. Reuse additionally binds the initiating actor/bot, effect ID and transport. There is no wildcard argument/target/scope matching. `once` authorizes one dispatch; `chat` may reuse the exact binding in the same conversation; `task` binds it to a random run ID; `until` can span runs/conversations for the same actor and exact binding until expiry. Every scope has an expiry (maximum 24 hours). The approval UI offers Allow once (five minutes) and Allow for this chat (24 hours). Changed arguments, including a changed model purpose, require a new chat grant.

Every submitted rule update bumps persisted `settings.policyVersion`, even if its rule array is equal. Review-toggle changes and connector classifications/authority/catalog changes also bump it. The model cannot update this version. Old profiles migrate to version 1. Pending approvals become denied and their resolvers are removed; old grants are discarded. Grants are process-local, never restored on restart. Approval history may retain a summary/binding, which is not executable authority.

Policy is checked before approval, immediately after its wait, and again without an intervening await at dispatch. Optional guard callbacks repeat validation after asynchronous provisioning, before bridge/command work, after MCP initialization, and before provider retries. Expiry, policy revision and cancellation can stop future dispatch; an already dispatched external action cannot be undone by a later policy edit. No exactly-once recovery or egress restriction is claimed.

## Verification

`tests-desktop/effects.test.ts` tests denied file/memory/skill/schedule writes, existing approval resolution, pending policy revocation, execute rules across all three raw transports, provisioning races, unknown tools/effects, exact argument/target/actor/data-scope/transport matching, canonical hashes, grant expiry and lifecycle, settings-update validation, file-share disclosure/read/write blocks, and real local-fixture MCP read/write classification and revocation during initialization. The original orchestration test now explicitly allows its intended local mutations; its evidence, restart and verification assertions are retained.

No dependencies were added. This change does not implement the planned egress gateway, semantic inference for shell/browser/computer, durable grant replay, append-only auditing or credential brokering.

Validation on 2026-10-01: `npm test` has 53 passes, no failures and two opt-in Docker skips (including 20 effect tests); typecheck/build pass; desktop smoke passes nine checks; options UI passes 17 checks including connector classification/restart; the separate Docker run passes both integration tests. Additional regression coverage checks all three execute transports at their asynchronous runtime boundary, provider retry revocation, and revocation before runtime credential persistence. Full commands, counts and remaining risks are recorded in `TESTING.md`.

## Approval cards and safe read confirmations

`renderer/ApprovalCard.tsx` displays the authoritative effect class, purpose, target and raw arguments. Spend has its own highlighted card and charge warning; it is never combined with reads. Optional `approvalPurpose` in each model tool schema requests one plain-language sentence tied to the tool arguments and user request. Model-provided purposes are explicitly labeled model-generated and untrusted. Older/model-omitted purposes use an honestly labeled host fallback. Purpose never changes the effect classification, rules, target or raw payload. System operations without model tool metadata also use a host fallback.

Pending payloads and purpose text live only in the engine's presentation map and are added to emitted/read snapshots. Raw arguments are always visible in a scrollable, escaped JSON panel; they are never replaced by the purpose. Presentation data is not serialized into `state.json` or approval history and is discarded when the decision completes. Provider credentials remain excluded from model request arguments before hashing or display. An old card without current payload disables allow choices and must be requested again.

Always allow this tool appears only for a classified read tool, and requires a separate user confirmation that it is read-only. It saves a `readToolConfirmations` classification receipt bound to the bot/actor, effect/transport, tool definition/schema, connector endpoint and policy version. This confirmation intentionally covers future argument variants for that tool. It issues individual `until` grants with the exact current target, arguments hash, data scope and expiry through the existing authorizer; it does not create wildcard grants or change any action rules. Block still beats every approval. Spend/send/delete/upload/admin and all other non-read classes are rejected by the host as well as omitted from this control.

Read confirmations survive restart; executable grants do not. Any policy/classification/connector catalog or authority change discards confirmations alongside existing grants. Changed schemas therefore require classification and confirmation again. Built-in tools bind their host tool definition hash. Users can revoke confirmations by changing the relevant classification or action policy. A confirmation is trust in a read contract, not proof that a remote server cannot send, mutate, or charge. There is no cost estimation or new egress enforcement in this UI change.

`renderer/MessageBody.tsx` omits empty or whitespace-only messages and omits text bubbles for attachment-only messages while retaining the attachments. On 2026-10-01 the later card change passed 59 unit tests with two expected Docker skips, including 23 effects tests and three rendered component tests; the desktop approval fixture passed nine checks and the existing desktop smoke passed nine checks. Build/typecheck passed. Docker was not rerun for the card-only follow-up; its earlier results above remain historical.

## Connector classification authority — 2026-10-01

`desktop/connector-effects.ts` normalizes the cached catalog. MCP `readOnlyHint`, `destructiveHint`, `openWorldHint` and a server-supplied `effectClass` are suggestions only. Recognized claims are displayed as `suggestedClass`; when absent, communication wording suggests send and other tools suggest write. Neither suggestion nor tool wording selects an authoritative class. All unconfirmed remote tools are provisionally **send**, because whether they can reach other people is unknown. They also match write blocks and `connector:ID:write` blocks. The decision is ask even with review disabled or wildcard/class allow; block still wins. Unknown tools/endpoints remain denied. An approval for an unconfirmed tool does not classify it or offer Always allow.

Confirmation is stored under `connector.id` as the pair `toolEffects[tool.name]` and `toolEffectHashes[tool.name]`. The SHA-256 definition hash covers tool name, description, input schema and output schema, with canonical object-key ordering. `confirmedConnectorClass` recomputes the hash before trusting the class. A stale UI hash is rejected at confirmation. Classes/hashes in connector save payloads, catalogs, annotations or model arguments are ignored as authority. No legacy class is automatically confirmed.

Catalog refresh retains a confirmation only for an identical name/input schema/output schema/description; renames, description changes, schema changes and new tools need confirmation and ask again. URL changes discard bindings. Catalog/authority/class changes also revoke pending approvals, grants and saved Always allow receipts through the existing policy version mechanism. Unchanged confirmed tools keep their class, including across restart. Duplicate/empty tool names are rejected, and cached class authority and grants are revoked rather than ambiguously reused.

Classification controls operate on the saved catalog and call only `connector.classify`. The separate per-connector Refresh tools button requests `tools/list` and persists definitions; MCP initialization/authentication may precede the list request, but no `tools/call` occurs. Enabled saved connectors are also re-listed at app-session start, and each run re-lists a connector before its first tool call. Changed definitions revoke confirmation and grants, with activity recorded in the chat and the connector's Activity view. Failed discovery revokes cached authority and stops that dispatch. Unobserved server changes between catalog refreshes are **UNKNOWN**; this cannot establish that a server's implementation matches a confirmed schema or read contract. Destination control, cost controls and remote behavior enforcement remain separate work.

### Currently installed connector tools

Inventory source: read-only inspection of the normal profile's saved `C:\Users\rames\AppData\Roaming\OpenIbot\state.json` on 2026-10-01. Only connector/tool metadata was inspected; secrets were not printed and the connection was not contacted. Disposable test fixtures are excluded.

| Connector | Saved tool | Suggested class | Needs user confirmation |
|---|---|---|---|
| Apify (`5cd1c149-3ff7-4f0f-ba50-56890eb20e75`) | No tools in the saved catalog (0) | UNKNOWN — catalog not discovered | UNKNOWN — every newly discovered tool will require confirmation |

There are zero currently saved installed tool definitions to enumerate. The tools available on the live Apify server are UNKNOWN; this task did not discover them or call them.

## Recheck of the repeated authorization card — 2026-10-01

The original `AUDIT.md` gap 3 and Control plane describe the earlier implementation, not the current tree. This card was already implemented and subsequently extended; rechecking it found no missing application change to make. The inventory above covers all model tools, supporting system effects and user-only media/file IPC. `shared/types.ts:11–17` defines effects/grants; `desktop/engine.ts:165–226` authorizes every tool before its switch and dispatches through a validated lease. The legacy shell/computer/browser/connector selectors remain in `desktop/effects.ts:11–26`; raw shell/browser/computer retain execute classification in `desktop/engine-effects.ts:17–19`. Unknown model tools remain denied, while the later connector card deliberately gives known but unconfirmed catalog tools a conservative send classification and ask decision.

`desktop/effects.ts` binds exact target, argument hash, data scope, actor/context, version and expiry, checks again after the approval wait, and validates immediately at dispatch. Rule submissions increment `policyVersion` and revoke pending approvals/grants in `desktop/engine.ts:135–138` and `desktop/engine.ts:356–372`. Runtime, MCP and provider guards additionally check after asynchronous preparation or before retries. `desktop/main.ts:92–97` constructs the user actor after sender validation; user IPC stays direct. Media is user-only in `desktop/engine.ts:400–401` and absent from the model tool registry. `renderer/ApprovalCard.tsx:17–21` retains decline/approval choices with the later scoped UI.

Fresh validation for this recheck: `npm test` passed 64 of 66 tests, with no failures and two expected opt-in Docker skips; `npm run typecheck` exited 0. No application, test or dependency files changed for this recheck. Existing authorization tests cover the card's requested cases. Earlier desktop/Docker results remain historical. Egress restrictions, server implementation trust and durable audit/replay remain the documented open limits.

## Approval and discovery evidence — subsequent verification, 2026-10-01

This verification supersedes the earlier card-completion claim for the six requirements below. Existing presentation/scopes/spend behavior was checked against source and the rebuilt desktop fixture. Invisible/comment-only messages gained coverage and filtering. Dedicated Refresh tools, startup/per-run discovery, and catalog activity were missing and were added with failing tests first. No dependencies were added.

| Requirement | Implementation file:line range | Named test |
|---|---|---|
| Class, labeled model purpose, target and raw arguments | `renderer/ApprovalCard.tsx:7–15`; `desktop/engine.ts:118–131` | `card renders authoritative class, advisory purpose, target, raw arguments and scopes`; `approval presentation exposes authoritative class, purpose, target and current arguments without persisting payload` |
| Once/chat/tool choices; tool choice only for confirmed reads | `renderer/ApprovalCard.tsx:9–20`; `desktop/engine.ts:453–463` | `chat approval reuses exact calls only in its chat and always approval is rejected for writes`; `saved read confirmation survives restart, issues exact grants, and changed connector schema revokes it`; rendered card tests above/below |
| Separate spend cards and charge highlight | `renderer/ApprovalCard.tsx:10–12`; `renderer/premium.css:144–145`; `renderer/App.tsx:61` | `always allow is absent for every non-read class and spend is distinct` |
| No empty visible-text bubble; attachments retained | `renderer/MessageBody.tsx:8–14` | `empty assistant tool-only messages render no article or bubble; attachments remain visible` |
| Persist discovered definitions; per-connector list-only Refresh tools | `renderer/ConnectorToolClasses.tsx:15–19`; `desktop/engine.ts:166–177,471–474`; `desktop/store.ts:66–71` | `Refresh tools persists definitions and performs only tools/list without invoking a tool`; `classification view distinguishes suggestion, missing confirmation and explicit user controls` |
| Startup/first-call re-list, changed-definition revocation and visible activity | `desktop/engine.ts:151–183,189,355–356`; `renderer/ConnectorToolClasses.tsx:18` | `session start and first connector call per run relist tools, revoke changed definitions and log activity`; `classification view distinguishes suggestion, missing confirmation and explicit user controls` |

All named tests are in `tests-desktop/approval-ui.test.ts`, `tests-desktop/effects.test.ts`, `tests-desktop/connector-lifecycle.test.ts` and `tests-desktop/connector-classification-ui.test.ts`. Lifecycle fixtures record MCP methods and prove listing does not execute tools, definitions reach disk, restart refreshes, each new run refreshes once, and changed tools wait for approval before dispatch. The rendered classification test checks the Activity view. Startup discovery is a system lifecycle action on enabled saved connections; per-run discovery is authorized as a read catalog effect before the separately classified tool call. Activity summaries contain no arguments or credentials and retain the most recent 50 connector events (the view shows 10).

Fresh validation: 68 tests, 66 pass, zero fail, two opt-in Docker skips; build/typecheck pass; desktop smoke 9 checks, options 17 checks, approval fixture 11 checks. The screenshots in ignored `artifacts/approvals/` show the current built renderer using disposable local fixtures. Installed packaged builds and real remote connector behavior are **UNKNOWN** for this verification. Automatic discovery reduces the stale-definition window but cannot detect a server change after its first-call refresh within a run.

## Research upgrade extensions

| Effect ID | Tool or operation | Transport | Class | Actor | Enforcement |
| --- | --- | --- | --- | --- | --- |
| `memory.search` | `search_memory` | Host Markdown/SQLite FTS | read | agent | Classified dispatcher, scoped retrieval |
| `memory.note.write` | `save_memory_note` | Host Markdown/revisions/FTS | persist | agent | Classified dispatcher, bot/chat scope validation, journal |
| `memory.list`, `memory.save`, `memory.revisions`, `memory.rollback`, `memory.delete` | Notes panel | Trusted IPC | read / persist / delete | user | Sender and input validation; direct user command |
| `activity.get`, `activity.reconcile` | Activity panel | Trusted IPC/SQLite | read / admin | user | Sender checks; only uncertain actions reconciled |
| `bot.takeover` | Computer control/teaching/terminal/file-edit entry | Trusted IPC | admin | user | Pauses current bot owner before user operation |
| Bot host policy edit | Settings → Computers | Trusted IPC/host policy file | admin | user | Exact-host normalization, policy-version invalidation, runtime policy update |

Browser/computer execution now uses a typed main-process broker into the isolated desktop sidecar in production; fake runtimes retain their existing test fallback. Raw execution is still class execute. Network containment applies to container traffic; host provider/MCP traffic is outside this destination proxy.

After untrusted tool content enters a chat, subsequent agent non-read effects ask even under broad allow rules. Blocks still win, and pending leases recheck context before dispatch. This chat-level conservative guard is not full information-flow tracking. The verifier is restricted to confirmed read effects and cannot use raw execution tools. See research-implementation.md for exact residual limitations.


## Chat-driven bot management — October 2, 2026

| Effect ID | Tool/transport | Class | Actor | Enforcement |
| --- | --- | --- | --- | --- |
| bot.list | list_bots / internal | read | agent | authorizeEffect then metadata-only active/removed inventory |
| bot.update | update_bot / internal | write | agent | authorizeEffect, draft validation and guard before committing name/role/instructions |
| bot.delete | delete_bots / internal | delete | agent | authorizeEffect, host-expanded exact target IDs/names in card; runtime stops and guarded recoverable removal |
| bot.restore | restore_bot / internal | admin | agent | authorizeEffect; bot limit applies, schedules remain disabled |
| bot.setMain | set_main_bot / internal | admin | agent | authorizeEffect; existing active ID only |
| bot.delete / bot.restore | user-only IPC | delete / admin | user | main IPC allowlist; same validated mutations |

Chief can perform these actions instead of pretending that delegation changes saved bot identity. update_bot accepts only name, role and instructions, preventing it from smuggling host network settings through a write classification. All specialists is resolved before asking: the approval displays actual IDs/names and a later-created bot cannot be removed by that grant. Main/current executing bots are retained; busy targets must be paused before removal. Recoverable removal disables associated routines, preserves chat bot IDs/history, notes, skills, connector assignments and Docker volumes, and stops associated containers. It is not erasure of personal data. list_bots(includeArchived=true) and restore_bot expose recovery; no automatic resumption of routines. Removing a bot does not turn its bot-specific connector/skill assignments into global access. Agent delete/admin rules, tainted-context review and exact grant binding remain enforced. Legacy removed-bot-only conversations cannot run until that bot is restored. Missing Docker/runtime stop capability can prevent removal; failures leave active records intact, though previously stopped containers may need restarting. No permanent purge or unrestricted Windows/credential access was added.
