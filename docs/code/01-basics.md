# 01 — Start from the basics

## What code does here

OpenIbot is a Windows desktop application. You type an instruction into a chat. The application sends context to an AI model, interprets its response, and can execute supported tools. Bots have saved identities, memory, and separate Linux computers. An AI model supplies decisions and text; ordinary application code controls storage, permissions, tool execution, and the screen.

## Languages and building blocks

| Term | Meaning in this repository |
|---|---|
| JavaScript | The language executed by Electron's Node.js process and the browser-like renderer |
| TypeScript (`.ts`) | JavaScript with checks describing expected data shapes |
| TSX (`.tsx`) | TypeScript that includes JSX, the syntax used to describe React interface elements |
| React | Builds the interface from components and redraws it when their data changes |
| Electron | Combines a native desktop process with a Chromium-based interface |
| Node.js | Provides filesystem, process, crypto, and other host capabilities |
| CSS | Controls colors, spacing, layout, and animation |
| Python / Bash | Implement helpers inside the Linux computer image |
| JSON | A structured data format used for settings, API requests, and saved state |
| Markdown | The readable text format used for this handbook and memory notes |
| Dependency | An external package listed in `package.json` |
| Build | Turns source files into bundles the application can execute |

## Read this real contract

The [shared types](../../shared/types.ts) include:

```ts
export type BotStatus = 'idle' | 'thinking' | 'working' | 'waiting' | 'done' | 'error';
```

`export` lets other files import the definition. `type` gives a name to a description of data. The vertical bars mean “one of these choices.” This definition says that a bot's status should be one of six strings. It does not start a bot or save anything. TypeScript checks help during development; incoming data still needs runtime validation.

An `interface`, such as `Bot`, describes fields in an object. `id: string` requires text. `modelConnectionId?: string` makes a field optional; the question mark means it can be absent. An array such as `Bot[]` is a list of bot objects.

## Read this real interface call

```ts
await invoke('chat.send', { chatId, content: content.trim(), attachments: voice ? [] : attachments });
```

This call appears in [App.tsx](../../renderer/App.tsx). `invoke` is a function: reusable code called with inputs. The first input names the action. The object supplies its arguments. `trim()` removes surrounding whitespace. `voice ? [] : attachments` chooses an empty list for voice input and the current attachments otherwise. `await` waits for the asynchronous command response. It does not mean the entire bot run has finished; the engine starts work and sends later state updates.

## React concepts used throughout the interface

A component is a function that returns interface elements. Props are its inputs: for example, `Avatar` receives a bot and a size. `useState` keeps local interface values such as an open dialog or typed draft. `useEffect` connects lifecycle work such as subscriptions and timers; its cleanup removes them. A ref retains a value or points to an element without itself requesting a redraw. Context shares data with descendants, such as conversation avatar cues.

Promises represent work that finishes later. `try`/`catch` handles failures. `AbortController` lets pause and shutdown signal cancellation. Imports connect files; exports identify functions or types other files can use. Start with a function's callers and return value before reading its internal details.

## Common distinctions

Chat history is saved conversation data. A run is one period of active work in a chat. A tool call is a structured request from the model for an application operation. An effect describes what that operation would do so policy can evaluate it. A bot status is a UI-visible state, not proof of a correct deliverable. A test is executable evidence for a particular behavior, not a guarantee about all behaviors.

## If this section changes

Update it when introducing another language, application layer, or recurring concept. Keep examples tied to real source and explain each new term before using it in other guides.
