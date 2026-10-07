# 09 — Memory, skills, and routines

## Three kinds of reusable context

Memory stores information. A skill stores instructions for doing a kind of work. A routine stores when to start a prompt. They can work together, but saving one does not automatically create the others.

## Memory

A bot has a short saved `memory` field and can also use structured notes. [MemoryStore](../../desktop/memory.ts) makes Markdown authoritative and builds a disposable SQLite FTS5 search index. FTS means full-text search: words are matched against indexed text. This implementation does not require a vector database or an embedding API.

Notes have an ID, scope, owner, topic, content, origin, and validity timestamps. Scope is user, project, bot, or chat. Visibility is filtered by the corresponding identifiers. The human editing commands support all defined scopes; agent note tools restrict writes to their bot/chat scope.

Origin distinguishes user, agent, and tainted notes. External/tool context can taint agent-written memory; saved reference data must not become higher-priority instructions. `rejectMemorySecrets` rejects recognizable credential patterns, but pattern checking cannot prove that every possible secret is absent.

`save` writes a revision history and the current note. `rollback` saves a prior revision as a new user-origin version. `retrieve` refreshes the index, extracts meaningful query words, searches visible chunks, applies validity times and a character budget, and returns text with evidence references. `asOf` can query the version valid at a supplied ISO timestamp. The estimated token count is an approximation, not provider usage.

[MemoryPanel.tsx](../../renderer/MemoryPanel.tsx) uses list/save/revisions/rollback/delete commands. Deleting a note removes its current file/revision file and updates the index. It does not delete related historical chat text.

## Skills

The `Skill` contract includes name, description, instructions, bot assignments, install state, and source (`builtin`, `taught`, `custom`). Store creates a few built-in starting skills. [Marketplace.tsx](../../renderer/Marketplace.tsx) exposes installation/assignment. Engine `saveSkill` and skill commands manage saved instructions. The system prompt includes relevant installed skills.

A skill is guidance for a model, not executable application code or a promise of deterministic replay. Built-in skills can be uninstalled rather than deleted. Bot role templates in [shared/bots.ts](../../shared/bots.ts) are separate from learned memories and skill instructions.

## Routines

[engine-schedule.ts](../../desktop/engine-schedule.ts) validates time, weekdays, and timezone, calculates matching schedule slots, and finds the next run. The engine checks schedules every 15 seconds while active. It saves used slots so one matching minute does not start the same routine repeatedly.

`runRoutine` creates a conversation, adds the saved prompt, and starts ordinary engine execution. Busy bots are skipped with an explanation. The routine records status and next run. A manual routine run also checks availability. Routines missed while the app was closed, including a matching startup minute, are not caught up automatically. The computer must be awake and the app process running.

Example: a weekday 09:00 routine in a chosen timezone launches a saved research prompt. The bot still needs a usable provider, available tools/computer, and any required action approvals. Saving the schedule does not bypass these checks.

## When changing these systems

Explain note visibility/revisions and retrieval limits for memory changes. Explain assignment/installation for skills. Explain timezone, duplicate prevention, busy bots, startup, and missed-run behavior for schedule changes. Use memory evaluation and schedule tests when those algorithms change.
