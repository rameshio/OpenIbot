# 03 — Data, saved state, and recovery

## The shared data model

[shared/types.ts](../../shared/types.ts) is the desktop contract. The renderer and engine use the same names, which helps prevent one side expecting different data from the other.

| Object | Meaning | Important fields |
|---|---|---|
| `Bot` | A persistent identity | ID, role, instructions, memory, appearance, status, optional model connection/network hosts |
| `Chat` | A conversation with one or more bots | ID, participant IDs, status, timestamps, untrusted-context marker |
| `Message` | A saved conversation item | Chat ID, optional bot ID, role, content, attachments |
| `Attachment` | A reference to a file | Name, path, size, optional owning bot |
| `Routine` | A saved schedule | Bot ID, prompt, days, local time, timezone, enablement |
| `Skill` | Reusable instructions | Instructions, assigned bot IDs, installed flag, source |
| `ProviderConnection` | A saved model connection | Provider, endpoint, model, catalog, credential-presence flag |
| `Approval` | A requested action decision | Pending/approved/denied status, effect details, grant |
| `Connector` | A connected MCP app | URL, tools, assigned bots, credential-presence flag, classifications |
| `UsageRecord` | Provider-reported token use | Bot/chat/model identifiers and input/output counts |
| `AppState` | The visible application snapshot | Lists of the objects above plus settings and main bot ID |

IDs connect objects. For example, a message's `chatId` identifies its conversation, while `botId` identifies the bot that produced it. A name can change without breaking these references.

`BotConversation` is the response contract for `bot.createBlank`: `{bot, chat}`. It lets the UI select exactly the chat created for a new bot. Its welcome question is saved as an ordinary assistant message. No new stored schema version or migration is needed; existing bot/chat/message records are reused.

## Where data lives

[main.ts](../../desktop/main.ts) explicitly keeps `%APPDATA%/I Bot` as OpenIbot's default user-data and browser-session location. An application name normally changes Electron's default folder, so pinning the old path prevents the rename from opening an empty profile. `IBOT_DATA_DIR` overrides both paths before the single-instance lock. There is no copying, profile migration, or change to bot IDs, credentials, SQLite databases, Docker volume ownership, or saved state. **Open app data** in the profile menu opens the actual directory.

| Storage | What it contains | Owner |
|---|---|---|
| `state.json` and `state.json.bak` | Application state, encrypted secret strings, routine slots | [Store](../../desktop/store.ts) |
| `memory/*.md` | Authoritative structured memory notes | [MemoryStore](../../desktop/memory.ts) |
| Memory revision JSON and `memory/index.sqlite` | Revision history and rebuilt full-text search index | MemoryStore |
| `action-journal.sqlite` | Action outcomes, routes, and policy/audit events | [ActionJournal](../../desktop/action-journal.ts) |
| Runtime files under user data | Runtime configuration and VNC secret material | [Runtime](../../desktop/runtime.ts) |
| Docker home/work volumes | Bot browser profiles and workspace files | Docker runtime |

These paths describe application storage, not files to commit to the source repository.

## How a state update becomes durable

The engine mutates its state, then publishes. Store writes a complete snapshot to a unique temporary file with flushing, copies the prior state to a backup if present, then renames the temporary file into place. `snapshot()` returns a structured clone of visible state. The encrypted `secrets` dictionary is outside `AppState` and is not returned through that snapshot.

Main supplies encryption/decryption using Electron `safeStorage`. A provider connection's `hasKey` reports whether a credential exists; it is not the key. Encryption depends on the platform facility and does not make every saved chat or file encrypted.

## Restart and recovery

Store validates loaded state. If primary state is invalid and its backup is usable, the invalid file is quarantined and backup state is recovered. If neither is usable, startup fails while preserving both. Validation checks a defined set of shapes and identifiers; it is not a complete schema check for every possible field.

Previously running chats become paused, active bot statuses become idle, and pending approvals become denied. Saved conversations survive; process-local execution and authorization are not restored. The action journal changes unfinished dispatched actions to `uncertain`. The engine blocks restarting affected work until the person reconciles it through Activity.

Removing a bot archives its identity and disables its routines; it retains history, notes, and workspace data for restoration. Deleting a chat removes conversation data through its engine handler. These operations have different meanings; neither should be described as erasing all bot files.

## Example

A person renames Chief. The UI sends `bot.update` with Chief's ID and name. The engine updates that bot, publishes, and Store saves. Messages still refer to the same bot ID. Main broadcasts the new snapshot, and navigation displays the new name.

## When changing data

Document added/removed fields, defaults, migration behavior, storage location, and compatibility with existing profiles. Update persistence/recovery tests where behavior changes. Never put real saved profile contents or credentials into documentation examples.
