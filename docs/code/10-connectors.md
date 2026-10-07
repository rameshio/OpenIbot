# 10 — Connected apps and MCP

## What a connector means

MCP is the Model Context Protocol. In this app a connector stores an MCP server URL, optional catalog identity, authentication state, assigned bots, discovered tools, and confirmed effect classes. [shared/app-catalog.ts](../../shared/app-catalog.ts) provides setup choices; it does not itself connect accounts or implement every remote service.

[desktop/connectors.ts](../../desktop/connectors.ts) creates an MCP client/transport, discovers tools, calls tools, and supports sign-in. The engine owns saved connector state and encrypted credential persistence. [Marketplace.tsx](../../renderer/Marketplace.tsx) presents setup; [ConnectorToolClasses.tsx](../../renderer/ConnectorToolClasses.tsx) presents classifications.

## Authentication

Token authentication uses a stored encrypted token. OAuth opens a browser authorization flow, uses a local callback, and saves returned client/token/discovery information through the engine's encrypted-secret handling. `hasToken` is visible metadata; credential contents remain in the desktop process. Authorizing a connection is separate from approving an individual remote tool effect.

## Tool discovery and changes

`toolCatalog` obtains remote tool definitions. [connector-effects.ts](../../desktop/connector-effects.ts) normalizes definitions, computes a stable definition hash, and verifies whether a saved class still matches that definition. Descriptions and schemas are part of the definition, so changing them can invalidate confirmation.

The engine refreshes enabled catalogs at session startup and validates catalog state during runs. It records changes and prevents stale confirmation from relaxing review. Remote hints such as read-only annotations can inform suggestions, but are not trusted permission grants.

## One remote tool call

1. The model requests `connector_call` with a connector ID, tool name, and arguments.
2. The engine checks that the connector is enabled and available to that bot and that the tool is present in the current catalog.
3. Host classification creates an effect, including connector/tool definition identity.
4. Authorization applies relevant rules and confirmations; unknown effects require review.
5. The MCP client calls the remote tool with cancellation and a dispatch check.
6. The actual result is returned to the model and relevant activity appears in the conversation/journal.

Remote responses are reference data. They can introduce untrusted context and cannot redefine local action policy. A successful local call does not prove every remote side effect was reversible or that the result text is accurate.

## When changing connectors

Document protocol/authentication changes, assigned-bot access, catalog-refresh behavior, definition hashes, and action classification. Test changed catalogs and credentials as well as success cases. Never paste real tokens, OAuth responses, or connected-account data into examples.
