# 05 — From a message to bot work

## The coordinator

[desktop/engine.ts](../../desktop/engine.ts) creates the application's coordinator through `createEngine`. It combines saved state, memory, providers, tools, authorization, routines, and notifications through the supplied callbacks. Its `invoke` handles human application commands. Its `executeTool` handles model-requested actions.

## A complete message journey

For a bot created through the UI, `bot.createBlank` first creates its identity and an individual chat with a saved local welcome question. There is no model run during that step. The first answer then follows the normal `chat.send` path below, including the greeting in its context. Configured specialist creation and model tools remain separate from this human onboarding action.

1. The person types in [App.tsx](../../renderer/App.tsx). `send` creates a chat if needed, then invokes `chat.send` with content and attachments.
2. Preload sends IPC to main. Main validates the sender/command and creates trusted user invocation metadata.
3. The engine's `chat.send` handler validates the chat/input, saves a user message, and starts a run.
4. `startRun` checks for uncertain prior actions, an already-running chat, a busy primary bot, and missing model configuration/credentials.
5. [routing.ts](../../desktop/routing.ts) selects a bot and relevant skills. The journal records the route. Model connection details are copied into the run; changes to the active connection later do not replace that run's captured profile.
6. Attachments imported by the native picker are validated and copied into the primary bot's Linux workspace under controlled names. Their metadata then points to the owning workspace.
7. Recent saved messages become model history. `systemPrompt` supplies the bot role, instructions, relevant memory/skills, and execution rules.
8. `runAgent` authorizes a model request, calls the provider adapter, saves reported token usage, and adds the response to history.
9. A text-only result can complete the bot turn. Tool requests go through `executeTool`; results are returned to model history so the next turn can use actual output.
10. A run using only bot listing/deletion receives a host-generated removal summary checked against saved bot state. Other tool work may receive an independent verifier pass when turn/bot capacity allows. The final response or verification pause is saved. State updates continually reach the renderer.

## What a run contains

A run has an ID, chat ID, cancellation controller, maximum turns, current turn count, active bot set, captured provider profiles, connector checks, and denied effects. `runs` tracks active conversations; `owners` stops one bot from simultaneously working in different runs. These maps are process-local. Chat/message/state records persist separately.

`maxSteps` bounds the model loop. Each turn increments the counter. Reaching the limit produces an error explaining that saved work remains and the person can explicitly resume. An empty model response and an oversized batch of tool calls also fail explicitly.

## Delegation

Routing recognizes leading explicit `@bot` and `/skill` references, including quoted names. For example, `@chief /skill-research compare these sources` chooses Chief and an installed matching skill. A reference embedded in ordinary prose is data rather than a routing command. Unknown/ambiguous references or unavailable skills produce errors; routing is not an automatic semantic guess about which specialist seems suitable.

The model can request `delegate` or `message_bot`. The engine supplies bounded context to another bot and awaits its actual response. When every call in a batch is a delegation to a different bot, execution uses batches of up to three in parallel. Other tool calls run sequentially. Delegation depth and bot ownership checks constrain recursive work.

A specialist can have its own model connection. Creating a specialist saves a bot identity; delegation itself does not rename or reconfigure an existing bot. Shared files must be transferred through supported file operations because workspaces are separate.

## Pause, resume, and errors

`pause` marks the chat paused, aborts its controller, declines pending run approvals, and waits for the run to settle. Human takeover uses this pause path before control. Resume is explicit and starts from saved conversation context, not a restored in-memory model loop. Errors become saved error messages and status changes. A caught tool failure is also reported to the model as an error result unless cancellation/staleness ends the run.

Reading external output can mark a chat as having untrusted context. That marker affects subsequent authorization; it does not mean all later text is false.

## Verification limits

For successful removal runs that requested only `list_bots` and `delete_bots`, `startRun` checks that every removed ID is absent from active bots, present in archived bots, and has no enabled routine. It generates the final removal/retention summary from actual state, replacing the model's draft. Even an empty repeated deletion follows this path. Checking application state avoids asking a reviewer to find deletion evidence in an unrelated Linux workspace.

`Run.requestedTools` records attempted tool names and `Run.removedBots` records successful removal targets, including an empty successful removal. These are process-local execution facts, not new profile fields. If removal is mixed with other work, that work does not receive the removal-only summary; a retained Verifier may review it, but the engine does not automatically create a new Verifier after any successful removal in that run.

This fixes the earlier behavior where deleting all specialists immediately created a replacement reviewer and a visible team. Existing team filtering hides conversations referencing archived participants while retaining their IDs and history. The main/current executing bot is still protected from removal; this operation archives specialists rather than purging their data.

For other tool work, when capacity remains, the engine can use a separate Verifier bot with restricted tools and file excerpts. Its context includes the latest 100 model-history items (including the latest user request and successful tool results) and current active/archived bot metadata. Earlier code incorrectly sent only the oldest eight items. Reviewers are also offered the read-only `list_bots` tool. A malformed/unknown/failing verdict pauses delivery for follow-up. If no eligible verifier or turn budget remains, the engine reports that independent verification was not performed. A model-produced verdict is not equivalent to running the developer test suite.

## When changing execution

Document when the change triggers, what state is saved, whether existing runs behave differently, and what happens on cancellation/restart. Use engine and integration tests for orchestration changes. Update [tools](07-tools-and-approvals.md) if dispatch or verification rules change.
