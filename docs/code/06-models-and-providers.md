# 06 — Models, connections, and provider adapters

## Three separate things

A provider is a service or compatible endpoint. A model is an exact identifier exposed by that service. A connection combines provider, endpoint, model, saved catalog, and a separately encrypted credential. A bot may select a connection; otherwise the run uses the application selection.

[shared/providers.ts](../../shared/providers.ts) defines presets, protocol choice, and optional-key behavior. [ProviderManager.tsx](../../renderer/ProviderManager.tsx) builds and saves connections. [ModelSwitcher.tsx](../../renderer/ModelSwitcher.tsx) changes the selected connection/model. [desktop/providers.ts](../../desktop/providers.ts) performs requests and discovery.

## The common adapter contract

`ModelRequest` contains settings, the decrypted key, system instructions, messages, tools, a cancellation signal, and callbacks for retries and dispatch checks. `ModelResult` contains response text, tool calls, token counts, and optional raw output. The engine uses this common contract while the adapter converts it into provider-specific HTTP data.

| Protocol | Conversion in `callModel` |
|---|---|
| Responses | Uses `/responses`, instructions, input items, function outputs, optional images, and retained raw response items |
| Messages | Converts tool requests/results and image content into the messages protocol |
| Chat | Uses the compatible chat-completions request/response structure |

The protocol comes from the preset definition. The Gemini preset currently uses Google's OpenAI-compatible endpoint through the chat adapter; there is no separate native Gemini generation adapter in this desktop module. Similar-looking provider names or model names do not imply the same HTTP format.

## Discovery versus generation

`discoverModels` loads a catalog where available and returns model choices and explanatory metadata. Account/private and public catalogs have different meanings. Discovery is not a completion request and does not demonstrate successful generation, actual billing, or tool support for every listed model. Manual model IDs cover services without usable catalogs.

The engine validates provider drafts, handles discover/save/activate/delete commands, encrypts stored credentials, and clears relevant selections when connections are removed. `testProvider` and discovery behavior must be read according to their actual implementation; a “loaded” catalog should not be presented as proof that a paid request will work.

## Requests and failures

`normalizeApiKey` validates key text; `validateEndpoint` validates service endpoints. `jsonRequest` centralizes request errors, bounded retries, and cancellation. Its `beforeRequest` callback lets the authorizer revalidate before a request or retry is dispatched. Errors shown to a person should explain the problem without revealing credential material.

Token usage is based on provider response data saved by the engine. This is not a price calculation. A selected model marked as lacking tools receives no tool definitions and is limited to text work. Unknown capability metadata is different from an explicit “tools unsupported” value.

## Example change

Adding a preset normally touches `shared/providers.ts`, any necessary adapter behavior in `desktop/providers.ts`, provider tests, and the UI's setup behavior. Explain endpoint/protocol/key requirements here. Changing only a preset label does not implement a new protocol.

## When updating this guide

Document new protocol behavior, request shapes, discovery caveats, credential handling, and captured-run selection behavior. Existing detailed [provider notes](../../docs-desktop/providers.md) complement this introduction; verify external API claims against current official documentation when changing integrations.
