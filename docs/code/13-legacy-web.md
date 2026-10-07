# 13 — The retained Next.js web application

## Status

`src/`, `tests/`, and Next.js-related configuration belong to the older web application. They remain useful history/reference, but the current desktop build selects `renderer/`, `desktop/`, and `shared/`. The current package does not declare Next.js as an active dependency, and `node_modules/next/dist/docs/` was unavailable during this documentation review. No Next.js code was changed.

Before writing Next.js code, follow the root [AGENTS.md](../../AGENTS.md): read the installed version's relevant guide from `node_modules/next/dist/docs/`. Restoring a runnable web app needs an intentional dependency/configuration decision; the presence of old source is not enough.

## Older architecture

| Location | Role in the retained implementation |
|---|---|
| `src/app/layout.tsx`, `globals.css` | Root document and web styles |
| `src/app/(workspace)/layout.tsx`, `[[...slug]]/page.tsx` | Workspace shell and catch-all page routing |
| `src/components/ibot-app.tsx` | Web application composition |
| `src/components/layout/` | Sidebar and top navigation |
| `src/components/chat/`, `agents/`, `workspace/` | Composer/model choice, agent teams, task graph/output/inspection |
| `src/components/providers/`, `settings/`, `ui/` | Web connections/settings and reusable controls |
| `src/lib/state/` | Browser workspace/connection stores, validation, run client, and event handling |
| `src/app/api/session/route.ts` | Local web session API |
| `src/app/api/connections/route.ts` | Provider credential test/disconnect API |
| `src/app/api/runs/route.ts` | Validated run requests and streamed run events |
| `src/lib/server/session.ts` | Session identity, credentials, local-request checks, and errors |
| `src/lib/server/providers/` | Provider adapters, errors, types, and SSE parsing |
| `src/lib/server/execution/` | Plan/request validation and task execution |
| `src/lib/mock/task-engine.ts` | Simulated task generation/advancement utilities |
| `src/types/index.ts`, `src/lib/models.ts` | Web task/model contracts and model identifiers |

SSE means server-sent events: streamed server output read by the run client. It is different from the desktop application's Electron state broadcasts.

## The older run path

Web UI state creates a task request. The run client calls `/api/runs`. The route asserts local access, loads the session, validates the request and exact connected models, resolves credentials, and checks active/reused runs. Execution validates a team/dependency plan, calls provider adapters, and emits events consumed by browser state.

The retained runner explicitly instructs models that this web run has no tools and must not claim browsing, code execution, or external verification. It is therefore different from the active desktop engine's Docker/tool execution. The mock task engine is a third, simulated path; it should not be used to explain real desktop bot outcomes.

## How to read the retained files

Start with [ibot-app.tsx](../../src/components/ibot-app.tsx), [workspace-store.ts](../../src/lib/state/workspace-store.ts), [run-client.ts](../../src/lib/state/run-client.ts), and [runs/route.ts](../../src/app/api/runs/route.ts). Follow [runner.ts](../../src/lib/server/execution/runner.ts) for orchestration and [validation.ts](../../src/lib/server/execution/validation.ts) for constraints. The [older redesign notes](../workspace-redesign.md) and [provider notes](../provider-api-notes.md) describe historical design decisions.

## When changing retained code

Label whether the work restores web execution, modifies reference code, or migrates behavior into desktop. Do not imply default desktop checks compile/test the web tree. Update this section and the file reference if legacy files are removed or made active.
