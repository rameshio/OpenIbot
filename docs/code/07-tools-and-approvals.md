# 07 — Tools, authorization, and action evidence

## Definition, classification, execution

Tools are structured operations exposed to the model. [engine-tools.ts](../../desktop/engine-tools.ts) lists names, descriptions, and JSON argument schemas. [engine-effects.ts](../../desktop/engine-effects.ts) translates a requested tool into a host-defined effect. [engine.ts](../../desktop/engine.ts), in `executeTool`, validates and dispatches supported operations.

| Tool group | Examples | Result |
|---|---|---|
| Bot management | `list_bots`, `create_bot`, `update_bot`, `delete_bots`, `restore_bot`, `set_main_bot` | Saved identities and team management |
| Handoffs | `delegate`, `message_bot` | Another bot's actual response |
| Workspace files | `list_files`, `read_file`, `write_file`, `share_file` | Lists, contents, writes, or transfers |
| Computer | `run_shell`, `browser_open`, `computer`, `screenshot` | Command output or screen data |
| Memory/instructions | `save_memory`, `search_memory`, `save_memory_note`, `save_skill` | Saved preferences, evidence, or instructions |
| Scheduling | `schedule_routine` | A saved local routine |
| Connected apps | `connector_call` | A remote MCP tool result |

The optional model-provided `approvalPurpose` explains intent to the person. It is advisory text; it cannot assign a trusted effect class or grant permissions.

## Effect classes

An effect describes actor, operation, transport, target, arguments, chat/task, and data scope. Classes are `read`, `write`, `send`, `spend`, `delete`, `upload`, `persist`, `execute`, and `admin`. Model requests themselves can disclose context and spend tokens, so they also pass through authorization.

[effects.ts](../../desktop/effects.ts) returns allow, deny, or ask. Matching block rules take priority. Missing/unknown classifications are denied. Unconfirmed connector tools and agent mutations after untrusted context require review. Other matching rules, automatic-review settings, and host-provided defaults affect the decision. These rules have overlapping keys: an upload can match send/write/read rules, for example.

Trusted human commands are dispatched separately from agent tools. Main creates the user actor after checking the IPC sender; the model or renderer cannot simply put `actor: 'user'` in arguments to bypass the classified tool path.

## What an approval grants

`createEffectAuthorizer` binds a grant to effect identity, actor, target, stable argument hash, data scope, policy version, and expiration. Scope can be once, chat, task, or until. Broader scope does not authorize arbitrary different arguments. Grants are process-local and are not restored after a restart.

The authorizer returns a lease with `validate` and `execute`. At dispatch it checks the current policy and grant again, then invokes the operation. One lease cannot be dispatched twice. Policy changes, expiration, cancellation checks, or newly untrusted context can invalidate an earlier decision.

Example: approving a particular `write_file` does not approve a different path/content. A changed argument hash needs a matching authorization. Denial is returned as a tool error; the engine also tracks denied effects so the model is instructed not to evade the decision.

## Approval and activity screens

[ApprovalCard.tsx](../../renderer/ApprovalCard.tsx) shows the proposed action and sends `approval.resolve`. Settings expose rules. [ActivityPanel.tsx](../../renderer/ActivityPanel.tsx) displays routes, actions, and journal events. [ActionJournal](../../desktop/action-journal.ts) stores trusted metadata and hashes rather than raw tool payloads/URL strings. This journal design does not imply that conversation history contains no tool output.

An action starts as dispatched, then becomes succeeded or failed. On startup an unfinished action becomes uncertain. Reconciliation records that a person has addressed that uncertainty; it is not evidence that a remote send/payment was automatically reversed. Inspect the real result before repeating an irreversible operation.

## Verification

[verification.ts](../../desktop/verification.ts) parses JSON with a verdict and nonempty evidence-bearing checks. A pass requires every check to pass. Invalid output becomes unknown. The engine uses this parser for its verifier flow described in [the execution guide](05-chat-and-engine.md).

Removal-only runs use deterministic checks against active/archived bot records and disabled routines, and produce a factual host summary without creating a reviewer. Mixed runs retain the normal review limits, but cannot automatically recreate a reviewer after removal. Model reviewers receive recent history/tool results plus current bot metadata and can request `list_bots`; their read-only effect restrictions still apply. This change does not bypass deletion approval, blocked rules, target binding, or runtime stop validation.

## When adding a tool

Update its schema, effect mapping, execution validation/handler, cancellation/dispatch checks, and tests. Explain the actual effect and example result here. Never describe a tool as read-only based solely on its name or a remote server's hint.
