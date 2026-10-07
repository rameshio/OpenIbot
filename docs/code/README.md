# OpenIbot code handbook

This handbook explains the repository from the beginning: what the application does, what each part of its code means, and where to go when changing it. It describes the source in the working tree reviewed on **October 2, 2026 (America/Chicago)**, including existing uncommitted avatar work. It is an explanation of source behavior, not a claim that every feature has been tested against a live service or that an installed executable contains these exact files.

## Read in this order

| Guide | What you will learn |
|---|---|
| [01 — Basics](01-basics.md) | Programming terms and how to read TypeScript and React |
| [02 — Architecture and startup](02-architecture.md) | Which application runs, its layers, and how the window opens |
| [03 — Data and storage](03-data-and-storage.md) | Bots, chats, messages, credentials, snapshots, and recovery |
| [04 — Interface and navigation](04-interface.md) | Screens, components, state, dialogs, and styles |
| [05 — Chat and bot execution](05-chat-and-engine.md) | A complete message journey, model turns, routing, and delegation |
| [06 — Models and providers](06-models-and-providers.md) | Connections, API adapters, model discovery, and usage |
| [07 — Tools and approvals](07-tools-and-approvals.md) | Tool definitions, action classification, grants, and verification |
| [08 — Linux computers and networking](08-computers-and-networking.md) | Docker, files, commands, screen control, and network policy |
| [09 — Memory, skills, and routines](09-memory-skills-routines.md) | What a bot remembers and how repeated work starts |
| [10 — Connected apps](10-connectors.md) | MCP tools, tokens, OAuth, and tool catalog changes |
| [11 — Avatars and voice](11-avatars-and-voice.md) | Saved appearance, animation, conversation reactions, and audio |
| [12 — Build and testing](12-build-and-testing.md) | Development commands, packaging, and useful verification |
| [13 — Retained web application](13-legacy-web.md) | The older Next.js source and its separate task system |
| [14 — File reference](14-file-reference.md) | A navigable inventory of source, tests, scripts, and supporting files |
| [15 — Keeping this handbook current](15-maintenance.md) | How every future code change must update its explanation |
| [Change log](CHANGELOG.md) | Dated records of what changed, why, and how it was checked |

## How to use a section

Start with its purpose, follow its source links, and read the worked example. A source link opens the actual implementation. Function names are search anchors; they remain more useful than line numbers when code moves. Guides explain responsibilities and important behavior rather than duplicating every source line. The file reference covers individual files and related groups.

For a change, read the relevant guide first, then update the guide and change log in the same work. [The maintenance guide](15-maintenance.md) includes a reusable template. The repository's [AGENTS.md](../../AGENTS.md) also requires this workflow for future coding agents.

## Other documentation

The root [README](../../README.md) explains running the product. [TESTING.md](../../TESTING.md) contains historical verification evidence; its old counts do not certify the current tree. Existing [desktop implementation notes](../../docs-desktop/runtime.md) and [web design notes](../workspace-redesign.md) provide additional context. Planning documents describe intent; source and current checks establish actual implementation.
