# 14 — Source and supporting file reference

Inventory reviewed October 7, 2026. Read the numbered guides for code paths and examples. Generated output, dependencies, private profiles, and release artifacts are excluded. Export names are search anchors, not proof that an operation was executed. src/ and tests/ are retained web code outside the default desktop build/tests.

## Desktop backend

| File | Responsibility and code anchors |
|---|---|
| [desktop/action-journal.ts](../../desktop/action-journal.ts) | SQLite routes/actions/audit records and uncertain-action reconciliation. Anchors: `ActionJournal`. |
| [desktop/connector-effects.ts](../../desktop/connector-effects.ts) | Remote tool normalization, definition hashes, and classification validity. Anchors: `connectorDefinitionHash`, `normalizeConnectorTool`, `confirmedConnectorClass`. |
| [desktop/connectors.ts](../../desktop/connectors.ts) | MCP client/transport, discovery/calls, and OAuth sign-in. Anchors: `ConnectorCredentials`, `callConnector`, `signInConnector`. |
| [desktop/desktop-broker.ts](../../desktop/desktop-broker.ts) | Supported computer actions converted to validated argument lists. Anchors: `desktopCommand`. |
| [desktop/effects.ts](../../desktop/effects.ts) | Effect policy, argument hashes, grants, revalidation, and dispatch. Anchors: `effectClasses`, `argsHash`, `effectDecision`, `createEffectAuthorizer`. |
| [desktop/engine-effects.ts](../../desktop/engine-effects.ts) | Model tool requests classified into host-defined effects. Anchors: `toolEffect`. |
| [desktop/engine-schedule.ts](../../desktop/engine-schedule.ts) | Routine time/day/timezone validation and scheduling calculations. Anchors: `validateRoutine`, `routineSlot`, `nextRoutineRun`. |
| [desktop/engine-tools.ts](../../desktop/engine-tools.ts) | Model-facing tool definitions, workspace paths, and quoting. Anchors: `agentTools`, `workspacePath`, `shellQuote`. |
| [desktop/engine.ts](../../desktop/engine.ts) | Application commands, model turns, tools, approvals, delegation, and routines. Anchors: `EngineOptions`, `createEngine`. |
| [desktop/main.ts](../../desktop/main.ts) | Native startup, window, tray, IPC validation, and native commands. |
| [desktop/media.ts](../../desktop/media.ts) | Media model discovery, audio validation/transcription, and avatar generation. Anchors: `MediaPurpose`, `mediaProviderSupports`, `listMediaModels`, `validateAudio`, `transcribeAudio`. |
| [desktop/memory.ts](../../desktop/memory.ts) | Authoritative Markdown notes, revisions, and scoped SQLite search. Anchors: `MemoryScope`, `MemoryNote`, `MemoryEvidence`, `rejectMemorySecrets`, `MemoryStore`. |
| [desktop/preload.ts](../../desktop/preload.ts) | Restricted window.ibot bridge and subscription cleanup. |
| [desktop/providers.ts](../../desktop/providers.ts) | Provider catalog or model adapter helpers (see its owning directory). Anchors: `ToolDefinition`, `ToolCall`, `ModelMessage`, `ModelRequest`, `ModelResult`. |
| [desktop/routing.ts](../../desktop/routing.ts) | Leading explicit bot/skill reference parsing and availability checks. Anchors: `routeMessage`. |
| [desktop/runtime.ts](../../desktop/runtime.ts) | Docker lifecycle, ownership, workspaces, commands, files, and egress gateways. Anchors: `validateBotId`, `validateWorkspacePath`, `RuntimeOptions`, `createRuntime`. |
| [desktop/store.ts](../../desktop/store.ts) | Initial state, JSON persistence/backups, and interrupted-state recovery. Anchors: `StoredData`, `initialState`, `Store`. |
| [desktop/verification.ts](../../desktop/verification.ts) | Structured verifier verdict validation and unknown fallback. Anchors: `Verification`, `parseVerification`. |

## Shared desktop contracts/catalogs

| File | Responsibility and code anchors |
|---|---|
| [shared/app-catalog.ts](../../shared/app-catalog.ts) | Connected-app metadata and setup links. Anchors: `CatalogApp`, `appCatalog`. |
| [shared/bots.ts](../../shared/bots.ts) | Specialist role templates. Anchors: `mainBot`. |
| [shared/identity.ts](../../shared/identity.ts) | Avatar choices and voice defaults. Anchors: `avatarExpressions`, `avatarShapes`, `avatarAccessories`, `avatarColors`, `defaultVoice`. |
| [shared/network-policy.ts](../../shared/network-policy.ts) | Exact public hostname normalization/rejection. Anchors: `normalizeNetworkHosts`. |
| [shared/providers.ts](../../shared/providers.ts) | Provider catalog or model adapter helpers (see its owning directory). Anchors: `ProviderDefinition`, `providerCatalog`, `providerDefinition`, `providerName`. |
| [shared/types.ts](../../shared/types.ts) | Desktop domain objects, effect/approval types, runtime service, and window bridge contracts. Anchors: `BotStatus`, `AvatarShape`, `AvatarAccessory`, `AvatarExpression`, `Bot`. |

## Desktop renderer and avatar engine

| File | Responsibility and code anchors |
|---|---|
| [renderer/ActivityPanel.tsx](../../renderer/ActivityPanel.tsx) | Journal routes/actions/events and uncertain-result reconciliation. Anchors: `ActivityPanel`. |
| [renderer/app.css](../../renderer/app.css) | Desktop app styling; inspect selectors and imports with the component. |
| [renderer/App.tsx](../../renderer/App.tsx) | Desktop shell, live state, composer, selection, and panel coordination. Anchors: `App`. |
| [renderer/ApprovalCard.tsx](../../renderer/ApprovalCard.tsx) | Action presentation and approve/decline/scope controls. Anchors: `ApprovalCard`. |
| [renderer/avatar-behavior.ts](../../renderer/avatar-behavior.ts) | SVG identity/activity mapping, labels, eye colors, and behavior helpers. Anchors: `expressionFor`, `shapeFor`, `activityFor`, `activityLabels`, `eyeColor`. |
| [renderer/avatar-clock.ts](../../renderer/avatar-clock.ts) | Animation/motion preference subscriptions. Anchors: `avatarTime`, `animateAvatar`, `motionSnapshot`, `watchMotion`. |
| [renderer/avatar-engine/decor.ts](../../renderer/avatar-engine/decor.ts) | Procedural avatar decor helpers/data; used by the SVG engine described in guide 11. Anchors: `DotRender`, `ArcSpec`, `ArcRender`, `ArcSeed`, `arcRender`. |
| [renderer/avatar-engine/engine.ts](../../renderer/avatar-engine/engine.ts) | Application commands, model turns, tools, approvals, delegation, and routines. Anchors: `RenderedEye`, `BotFrame`, `Look`, `BotEngine`. |
| [renderer/avatar-engine/expressions.ts](../../renderer/avatar-engine/expressions.ts) | Procedural avatar expressions helpers/data; used by the SVG engine described in guide 11. Anchors: `ExpressionId`, `BotExpression`, `EXPRESSIONS`, `EXPRESSION_BY_ID`, `DEFAULT_EXPRESSION`. |
| [renderer/avatar-engine/eyefit.ts](../../renderer/avatar-engine/eyefit.ts) | Procedural avatar eyefit helpers/data; used by the SVG engine described in guide 11. Anchors: `decalageDesYeux`, `POUR_TESTS`. |
| [renderer/avatar-engine/face.ts](../../renderer/avatar-engine/face.ts) | Procedural avatar face helpers/data; used by the SVG engine described in guide 11. Anchors: `EYE_SPLIT`, `EYE_W`, `EYE_H`, `REST_GAZE`, `EyePose`. |
| [renderer/avatar-engine/math.ts](../../renderer/avatar-engine/math.ts) | Procedural avatar math helpers/data; used by the SVG engine described in guide 11. Anchors: `TAU`, `clamp`, `lerp`, `Easing`, `easings`. |
| [renderer/avatar-engine/profiles.ts](../../renderer/avatar-engine/profiles.ts) | Procedural avatar profiles helpers/data; used by the SVG engine described in guide 11. Anchors: `PROFILE_SAMPLES`, `PROFILES`, `ProfileName`. |
| [renderer/avatar-engine/repere.ts](../../renderer/avatar-engine/repere.ts) | Procedural avatar repere helpers/data; used by the SVG engine described in guide 11. Anchors: `RAYON`, `DEMI_VIEWBOX`. |
| [renderer/avatar-engine/shape.ts](../../renderer/avatar-engine/shape.ts) | Procedural avatar shape helpers/data; used by the SVG engine described in guide 11. Anchors: `Point`, `Silhouette`, `silhouette`, `circle`, `blend`. |
| [renderer/avatar-engine/skins.ts](../../renderer/avatar-engine/skins.ts) | Procedural avatar skins helpers/data; used by the SVG engine described in guide 11. Anchors: `ShapeId`, `BotShape`, `SHAPES`, `SHAPE_BY_ID`, `DEFAULT_SHAPE`. |
| [renderer/avatar-engine/states.ts](../../renderer/avatar-engine/states.ts) | Procedural avatar states helpers/data; used by the SVG engine described in guide 11. Anchors: `EyeCfg`, `Pose`, `StateId`, `StateDef`, `STATES`. |
| [renderer/avatar-engine/UPSTREAM.txt](../../renderer/avatar-engine/UPSTREAM.txt) | Imported avatar code's upstream revision identifier. |
| [renderer/Avatar.tsx](../../renderer/Avatar.tsx) | Selects custom/Grok/SVG drawing and adds accessories/status labels. Anchors: `Avatar`. |
| [renderer/AvatarDrawing.tsx](../../renderer/AvatarDrawing.tsx) | Procedural SVG rendering and explicit-motion drawing path. Anchors: `AvatarDrawing`. |
| [renderer/AvatarEditor.tsx](../../renderer/AvatarEditor.tsx) | Saved appearance editing, previews, custom images, and generation. Anchors: `AvatarEditor`. |
| [renderer/avatars.css](../../renderer/avatars.css) | Desktop avatars styling; inspect selectors and imports with the component. |
| [renderer/bot-activity.ts](../../renderer/bot-activity.ts) | Derives status and recent reply/file previews from saved conversations. Anchors: `botActivity`, `teamChats`. |
| [renderer/BotDetails.tsx](../../renderer/BotDetails.tsx) | Bot detail rail, computer/file status, and routines. Anchors: `BotDetails`. |
| [renderer/BotNavigation.tsx](../../renderer/BotNavigation.tsx) | Main/specialist bot navigation, creation, editing, and main selection. Anchors: `BotNavigation`. |
| [renderer/Computer.tsx](../../renderer/Computer.tsx) | Linux screen, file, terminal, human takeover, and teaching interface. Anchors: `Computer`. |
| [renderer/ConnectorToolClasses.tsx](../../renderer/ConnectorToolClasses.tsx) | Remote tool effect classification and definition confirmations. Anchors: `ConnectorToolClasses`. |
| [renderer/conversation-avatar.ts](../../renderer/conversation-avatar.ts) | Open-chat temporary cues, reply heuristics, and expiration. Anchors: `ConversationCue`, `ConversationAvatarContext`, `replyPose`, `conversationCues`. |
| [renderer/Dialogs.tsx](../../renderer/Dialogs.tsx) | Modal/error helpers and bot/group/routine forms. Anchors: `errorText`, `Modal`, `BotDialog`, `RoutineDialog`, `GroupDialog`. |
| [renderer/grok-behavior.ts](../../renderer/grok-behavior.ts) | Combines saved silhouette/expression with activity reactions. Anchors: `grokPose`, `grokActivity`, `grokRest`, `grokReaction`. |
| [renderer/grok-poses.ts](../../renderer/grok-poses.ts) | Declarative reference-derived pose geometry and types. Anchors: `GrokEye`, `GrokPose`, `grokPoses`, `grokPlayOrder`. |
| [renderer/GrokDrawing.tsx](../../renderer/GrokDrawing.tsx) | Default avatar drawing, visibility, blinking, celebrations, and cues. Anchors: `GrokDrawing`. |
| [renderer/index.html](../../renderer/index.html) | Vite HTML renderer entry and React root element. |
| [renderer/main.tsx](../../renderer/main.tsx) | Mounts React App and loads desktop CSS. |
| [renderer/Marketplace.tsx](../../renderer/Marketplace.tsx) | Skills, role templates, and MCP app setup. Anchors: `Marketplace`. |
| [renderer/MemoryPanel.tsx](../../renderer/MemoryPanel.tsx) | Memory notes, revisions, editing, rollback, and deletion. Anchors: `MemoryPanel`. |
| [renderer/MessageBody.tsx](../../renderer/MessageBody.tsx) | Markdown messages, identity labels, and attachment actions. Anchors: `MessageBody`. |
| [renderer/ModelSwitcher.tsx](../../renderer/ModelSwitcher.tsx) | Composer model/connection selection. Anchors: `ModelSwitcher`. |
| [renderer/NetworkPolicy.tsx](../../renderer/NetworkPolicy.tsx) | Per-bot exact-host policy interface. Anchors: `NetworkPolicy`. |
| [renderer/options.css](../../renderer/options.css) | Desktop options styling; inspect selectors and imports with the component. |
| [renderer/panels.css](../../renderer/panels.css) | Desktop panels styling; inspect selectors and imports with the component. |
| [renderer/premium.css](../../renderer/premium.css) | Desktop premium styling; inspect selectors and imports with the component. |
| [renderer/ProviderManager.tsx](../../renderer/ProviderManager.tsx) | Provider draft/discovery/selection and connection saving. Anchors: `ProviderManager`. |
| [renderer/providers.css](../../renderer/providers.css) | Desktop providers styling; inspect selectors and imports with the component. |
| [renderer/Settings.tsx](../../renderer/Settings.tsx) | General settings, action policy, computers, and usage. Anchors: `PanelDialog`, `PanelNotice`, `Settings`. |
| [renderer/TeamNavigation.tsx](../../renderer/TeamNavigation.tsx) | Team conversation filtering/navigation and creation. Anchors: `TeamNavigation`. |
| [renderer/VoiceTools.tsx](../../renderer/VoiceTools.tsx) | Microphone/transcription, voice preferences, spoken replies, and cleanup. Anchors: `VoiceTools`. |

## Linux image and helpers

| File | Responsibility and code anchors |
|---|---|
| [containers/.dockerignore](../../containers/.dockerignore) | Files excluded from the Docker build context. |
| [containers/chromium-egress.conf](../../containers/chromium-egress.conf) | Chromium flags routing traffic through the egress proxy. |
| [containers/desktop.html](../../containers/desktop.html) | Custom noVNC viewer and control/teaching integration. |
| [containers/Dockerfile](../../containers/Dockerfile) | Linux workspace packages, bot user, helpers, and healthcheck. |
| [containers/egress_proxy.py](../../containers/egress_proxy.py) | Policy-backed destination proxy with host/address checks. Anchors: `Denied`, `allowed_hosts`, `destination`, `connect_target`, `audit`. |
| [containers/entrypoint.sh](../../containers/entrypoint.sh) | VNC secret setup, desktop/browser startup, and websocket viewer. |
| [containers/openbox-menu.xml](../../containers/openbox-menu.xml) | Linux window-manager menu. |
| [containers/run_command.py](../../containers/run_command.py) | Linux command jobs and process-group cancellation. Anchors: `job_path`, `stop_group`, `cancel`, `run`. |
| [containers/workspace_files.py](../../containers/workspace_files.py) | Validated Linux workspace file operations. Anchors: `components`, `open_directory`, `run`. |
| [containers/workspace-welcome.html](../../containers/workspace-welcome.html) | Local welcome page in the Linux browser. |

## Build and verification scripts

| File | Responsibility and code anchors |
|---|---|
| [scripts/build.mjs](../../scripts/build.mjs) | esbuild main/preload bundles and Vite production build. |
| [scripts/dev.mjs](../../scripts/dev.mjs) | Local Vite server, native bundles, and Electron development launch. |
| [scripts/eval-memory.d.mts](../../scripts/eval-memory.d.mts) | Memory evaluation module type declarations. Anchors: `MemoryEvaluation`, `evaluateMemory`. |
| [scripts/eval-memory.mjs](../../scripts/eval-memory.mjs) | Memory retrieval evaluation scenarios. Anchors: `evaluateMemory`. |
| [scripts/generate-icon.py](../../scripts/generate-icon.py) | Application icon generation. |
| [scripts/import-grok-poses.mjs](../../scripts/import-grok-poses.mjs) | Imports declarative pose data from supplied reference HTML. Anchors: `GrokEye`, `GrokPose`. |
| [scripts/launch.mjs](../../scripts/launch.mjs) | Launches Electron from existing built output. |
| [scripts/test-approvals-desktop.mjs](../../scripts/test-approvals-desktop.mjs) | Desktop fixture/interaction checks for approvals desktop; read launch/profile/prerequisite handling. |
| [scripts/test-avatars-desktop.mjs](../../scripts/test-avatars-desktop.mjs) | Desktop fixture/interaction checks for avatars desktop; read launch/profile/prerequisite handling. |
| [scripts/test-bot-activity-desktop.mjs](../../scripts/test-bot-activity-desktop.mjs) | Desktop fixture/interaction checks for bot activity desktop; read launch/profile/prerequisite handling. |
| [scripts/test-bot-management-desktop.mjs](../../scripts/test-bot-management-desktop.mjs) | Desktop fixture/interaction checks for bot management desktop; read launch/profile/prerequisite handling. |
| [scripts/test-bots-desktop.mjs](../../scripts/test-bots-desktop.mjs) | Desktop fixture/interaction checks for bots desktop; read launch/profile/prerequisite handling. |
| [scripts/test-desktop.mjs](../../scripts/test-desktop.mjs) | Desktop fixture/interaction checks for desktop; read launch/profile/prerequisite handling. |
| [scripts/test-options-desktop.mjs](../../scripts/test-options-desktop.mjs) | Desktop fixture/interaction checks for options desktop; read launch/profile/prerequisite handling. |
| [scripts/test-providers-desktop.mjs](../../scripts/test-providers-desktop.mjs) | Desktop fixture/interaction checks for providers desktop; read launch/profile/prerequisite handling. |
| [scripts/test-sidebar-desktop.mjs](../../scripts/test-sidebar-desktop.mjs) | Desktop fixture/interaction checks for sidebar desktop; read launch/profile/prerequisite handling. |
| [scripts/update-avatar-package.mjs](../../scripts/update-avatar-package.mjs) | Specialized existing-package renderer refresh with backend byte checks. |
| [scripts/verify-premium.mjs](../../scripts/verify-premium.mjs) | Desktop visual verification and artifact generation. |

## Desktop tests

| File | Responsibility and code anchors |
|---|---|
| [tests-desktop/action-journal.test.ts](../../tests-desktop/action-journal.test.ts) | Desktop action journal scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/approval-ui.test.ts](../../tests-desktop/approval-ui.test.ts) | Desktop approval ui scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/authorization-context.test.ts](../../tests-desktop/authorization-context.test.ts) | Desktop authorization context scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/avatar.test.ts](../../tests-desktop/avatar.test.ts) | Desktop avatar scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/bot-activity.test.ts](../../tests-desktop/bot-activity.test.ts) | Desktop bot activity scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/bot-management.test.ts](../../tests-desktop/bot-management.test.ts) | Desktop bot management scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/bot-navigation-ui.test.ts](../../tests-desktop/bot-navigation-ui.test.ts) | Desktop bot navigation ui scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/connector-classification-ui.test.ts](../../tests-desktop/connector-classification-ui.test.ts) | Desktop connector classification ui scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/connector-classification.test.ts](../../tests-desktop/connector-classification.test.ts) | Desktop connector classification scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/connector-lifecycle.test.ts](../../tests-desktop/connector-lifecycle.test.ts) | Desktop connector lifecycle scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/desktop-broker.test.ts](../../tests-desktop/desktop-broker.test.ts) | Desktop desktop broker scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/effects.test.ts](../../tests-desktop/effects.test.ts) | Desktop effects scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/egress_proxy_test.py](../../tests-desktop/egress_proxy_test.py) | Desktop egress_proxy_test scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. Anchors: `EgressTests`. |
| [tests-desktop/engine.test.ts](../../tests-desktop/engine.test.ts) | Desktop engine scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/grok-avatar.test.ts](../../tests-desktop/grok-avatar.test.ts) | Desktop grok avatar scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/main-bot.test.ts](../../tests-desktop/main-bot.test.ts) | Desktop main bot scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/memory-evaluation.test.ts](../../tests-desktop/memory-evaluation.test.ts) | Desktop memory evaluation scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/memory.test.ts](../../tests-desktop/memory.test.ts) | Desktop memory scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/network-policy.test.ts](../../tests-desktop/network-policy.test.ts) | Desktop network policy scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/options.test.ts](../../tests-desktop/options.test.ts) | Desktop options scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/providers.test.ts](../../tests-desktop/providers.test.ts) | Desktop providers scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/recovery.test.ts](../../tests-desktop/recovery.test.ts) | Desktop recovery scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/routing.test.ts](../../tests-desktop/routing.test.ts) | Desktop routing scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/runtime-integration.test.ts](../../tests-desktop/runtime-integration.test.ts) | Desktop runtime integration scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/runtime.test.ts](../../tests-desktop/runtime.test.ts) | Desktop runtime scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |
| [tests-desktop/verification.test.ts](../../tests-desktop/verification.test.ts) | Desktop verification scenarios; read assertions for precise coverage. TS tests run with npm test; Python proxy checks run separately. |

## Retained web source

| File | Responsibility and code anchors |
|---|---|
| [src/app/(workspace)/[[...slug]]/page.tsx](<../../src/app/(workspace)/[[...slug]]/page.tsx>) | Retained catch-all web workspace page entry. Anchors: `Page`. |
| [src/app/(workspace)/layout.tsx](<../../src/app/(workspace)/layout.tsx>) | Retained workspace route layout. Anchors: `WorkspaceLayout`. |
| [src/app/api/connections/route.ts](../../src/app/api/connections/route.ts) | Retained provider test/disconnect API and session credential updates. Anchors: `runtime`, `dynamic`, `POST`. |
| [src/app/api/runs/route.ts](../../src/app/api/runs/route.ts) | Retained local run API, validation, session checks, cancellation, and event streaming. Anchors: `runtime`, `dynamic`, `maxDuration`, `POST`, `DELETE`. |
| [src/app/api/session/route.ts](../../src/app/api/session/route.ts) | Retained local web session API. Anchors: `runtime`, `dynamic`, `GET`, `POST`. |
| [src/app/globals.css](../../src/app/globals.css) | Retained web globals styling; inspect selectors and imports with the component. |
| [src/app/icon.svg](../../src/app/icon.svg) | Retained web icon asset. |
| [src/app/layout.tsx](../../src/app/layout.tsx) | Retained root document, metadata, and global wrapper. Anchors: `metadata`, `RootLayout`. |
| [src/components/agents/agent-card.tsx](../../src/components/agents/agent-card.tsx) | Retained web agent card component; see guide 13 for its screen group and data path. Anchors: `roleIcons`, `modelColors`, `modelColor`, `formatElapsed`, `AgentStatus`. |
| [src/components/agents/agent-details-panel.tsx](../../src/components/agents/agent-details-panel.tsx) | Retained web agent details panel component; see guide 13 for its screen group and data path. Anchors: `AgentDetailsPanel`. |
| [src/components/agents/agent-grid.tsx](../../src/components/agents/agent-grid.tsx) | Retained web agent grid component; see guide 13 for its screen group and data path. Anchors: `AgentGrid`. |
| [src/components/agents/agent-team-builder.tsx](../../src/components/agents/agent-team-builder.tsx) | Retained web agent team builder component; see guide 13 for its screen group and data path. Anchors: `AgentTeamBuilder`. |
| [src/components/brand.tsx](../../src/components/brand.tsx) | Retained web brand component; see guide 13 for its screen group and data path. Anchors: `BrandMark`, `ProviderMark`. |
| [src/components/chat/chat-input.tsx](../../src/components/chat/chat-input.tsx) | Retained web chat input component; see guide 13 for its screen group and data path. Anchors: `ChatInput`. |
| [src/components/chat/model-selector.tsx](../../src/components/chat/model-selector.tsx) | Retained web model selector component; see guide 13 for its screen group and data path. Anchors: `MODELS`, `ModelSelector`. |
| [src/components/home-screen.tsx](../../src/components/home-screen.tsx) | Retained web home screen component; see guide 13 for its screen group and data path. Anchors: `STARTERS`, `HomeScreen`. |
| [src/components/ibot-app.tsx](../../src/components/ibot-app.tsx) | Retained web ibot app component; see guide 13 for its screen group and data path. Anchors: `IBotApp`. |
| [src/components/layout/sidebar.tsx](../../src/components/layout/sidebar.tsx) | Retained web sidebar component; see guide 13 for its screen group and data path. Anchors: `NAV_ITEMS`, `Sidebar`. |
| [src/components/layout/top-navigation.tsx](../../src/components/layout/top-navigation.tsx) | Retained web top navigation component; see guide 13 for its screen group and data path. Anchors: `TopNavigation`. |
| [src/components/library-screens.tsx](../../src/components/library-screens.tsx) | Retained web library screens component; see guide 13 for its screen group and data path. Anchors: `ChatsScreen`, `AgentsScreen`, `WorkflowsScreen`. |
| [src/components/providers/connections-screen.tsx](../../src/components/providers/connections-screen.tsx) | Retained web connections screen component; see guide 13 for its screen group and data path. Anchors: `ConnectionsScreen`. |
| [src/components/providers/provider-card.tsx](../../src/components/providers/provider-card.tsx) | Retained web provider card component; see guide 13 for its screen group and data path. Anchors: `Provider`, `ProviderCard`. |
| [src/components/settings/settings-screen.tsx](../../src/components/settings/settings-screen.tsx) | Retained web settings screen component; see guide 13 for its screen group and data path. Anchors: `SettingsScreen`. |
| [src/components/ui/badge.tsx](../../src/components/ui/badge.tsx) | Retained web badge component; see guide 13 for its screen group and data path. |
| [src/components/ui/button.tsx](../../src/components/ui/button.tsx) | Retained web button component; see guide 13 for its screen group and data path. |
| [src/components/ui/dialog.tsx](../../src/components/ui/dialog.tsx) | Retained web dialog component; see guide 13 for its screen group and data path. |
| [src/components/ui/dropdown-menu.tsx](../../src/components/ui/dropdown-menu.tsx) | Retained web dropdown menu component; see guide 13 for its screen group and data path. |
| [src/components/ui/input.tsx](../../src/components/ui/input.tsx) | Retained web input component; see guide 13 for its screen group and data path. |
| [src/components/ui/label.tsx](../../src/components/ui/label.tsx) | Retained web label component; see guide 13 for its screen group and data path. |
| [src/components/ui/progress.tsx](../../src/components/ui/progress.tsx) | Retained web progress component; see guide 13 for its screen group and data path. |
| [src/components/ui/select.tsx](../../src/components/ui/select.tsx) | Retained web select component; see guide 13 for its screen group and data path. |
| [src/components/ui/separator.tsx](../../src/components/ui/separator.tsx) | Retained web separator component; see guide 13 for its screen group and data path. |
| [src/components/ui/sheet.tsx](../../src/components/ui/sheet.tsx) | Retained web sheet component; see guide 13 for its screen group and data path. |
| [src/components/ui/skeleton.tsx](../../src/components/ui/skeleton.tsx) | Retained web skeleton component; see guide 13 for its screen group and data path. |
| [src/components/ui/switch.tsx](../../src/components/ui/switch.tsx) | Retained web switch component; see guide 13 for its screen group and data path. |
| [src/components/ui/tabs.tsx](../../src/components/ui/tabs.tsx) | Retained web tabs component; see guide 13 for its screen group and data path. |
| [src/components/ui/textarea.tsx](../../src/components/ui/textarea.tsx) | Retained web textarea component; see guide 13 for its screen group and data path. |
| [src/components/ui/tooltip.tsx](../../src/components/ui/tooltip.tsx) | Retained web tooltip component; see guide 13 for its screen group and data path. |
| [src/components/workspace/task-graph.tsx](../../src/components/workspace/task-graph.tsx) | Retained web task graph component; see guide 13 for its screen group and data path. Anchors: `TaskGraph`. |
| [src/components/workspace/task-output.tsx](../../src/components/workspace/task-output.tsx) | Retained web task output component; see guide 13 for its screen group and data path. Anchors: `TaskOutput`. |
| [src/components/workspace/task-status.tsx](../../src/components/workspace/task-status.tsx) | Retained web task status component; see guide 13 for its screen group and data path. Anchors: `TaskStatus`. |
| [src/components/workspace/task-workspace.tsx](../../src/components/workspace/task-workspace.tsx) | Retained web task workspace component; see guide 13 for its screen group and data path. Anchors: `TaskWorkspace`. |
| [src/components/workspace/work-inspector.tsx](../../src/components/workspace/work-inspector.tsx) | Retained web work inspector component; see guide 13 for its screen group and data path. Anchors: `downloadTaskFile`, `OutputFileRow`, `WorkInspector`. |
| [src/components/workspace/workspace-tabs.tsx](../../src/components/workspace/workspace-tabs.tsx) | Retained web workspace tabs component; see guide 13 for its screen group and data path. Anchors: `WorkspaceTab`, `WorkspaceTabs`. |
| [src/lib/mock/task-engine.ts](../../src/lib/mock/task-engine.ts) | Retained simulated tasks: creation, validation, progression, stop, and retry. Anchors: `DEFAULT_TEAM`, `validateTeam`, `createTask`, `advanceTask`, `stopTask`. |
| [src/lib/models.ts](../../src/lib/models.ts) | Retained web model/provider identifiers, exact-ID validation, and display helpers. Anchors: `PROVIDERS`, `isProviderId`, `isExactModelId`, `modelKey`, `parseModelKey`. |
| [src/lib/server/execution/index.ts](../../src/lib/server/execution/index.ts) | Exports retained run execution and validation contracts. |
| [src/lib/server/execution/runner.ts](../../src/lib/server/execution/runner.ts) | Retained text-only team task planning/execution and event emission. Anchors: `ExecuteRunOptions`, `executeRun`. |
| [src/lib/server/execution/validation.ts](../../src/lib/server/execution/validation.ts) | Retained run/plan bounds and dependency validation. Anchors: `EXECUTION_LIMITS`, `ExecutionError`, `validatePlan`, `manualPlan`, `validateRunRequest`. |
| [src/lib/server/providers/errors.ts](../../src/lib/server/providers/errors.ts) | Retained provider/cancellation error classification. Anchors: `ProviderErrorCode`, `ProviderError`, `cancellationError`, `providerResponseError`. |
| [src/lib/server/providers/index.ts](../../src/lib/server/providers/index.ts) | Retained provider adapter construction and HTTP conversions. Anchors: `createProviderAdapter`. |
| [src/lib/server/providers/sse.ts](../../src/lib/server/providers/sse.ts) | Retained provider server-sent-event parsing. Anchors: `ServerSentEvent`, `consumeSSE`. |
| [src/lib/server/providers/types.ts](../../src/lib/server/providers/types.ts) | Retained provider adapter request/result/Fetcher contracts. Anchors: `GenerateInput`, `GenerateResult`, `ProviderAdapter`, `Fetcher`. |
| [src/lib/server/session.ts](../../src/lib/server/session.ts) | Retained local session/credential access, request checks, JSON limits, and HTTP errors. Anchors: `HttpError`, `WorkspaceSession`, `COOKIE`, `assertLocalRequest`, `readJson`. |
| [src/lib/state/connection-store.ts](../../src/lib/state/connection-store.ts) | Retained browser connection initialization and local API actions. Anchors: `localApi`, `initializeConnections`, `connectionActions`, `getConnections`, `useConnections`. |
| [src/lib/state/run-client.ts](../../src/lib/state/run-client.ts) | Retained browser run start/stop and event-stream consumption. Anchors: `createLiveTask`, `consumeRunStream`, `executeClientRun`, `cancelClientRun`, `cancelAllRuns`. |
| [src/lib/state/run-events.ts](../../src/lib/state/run-events.ts) | Retained streamed run-event parsing and task-state reduction. Anchors: `parseRunEvent`, `applyRunEvent`, `interruptTask`, `followUpContext`. |
| [src/lib/state/validation.ts](../../src/lib/state/validation.ts) | Retained task/team/file validation, cleaning, and serialization. Anchors: `phases`, `record`, `count`, `isUsage`, `isTeamMember`. |
| [src/lib/state/workspace-store.ts](../../src/lib/state/workspace-store.ts) | Retained browser workspace hydration, updates, persistence, and subscriptions. Anchors: `hydrateWorkspace`, `getWorkspace`, `workspaceActions`, `useWorkspace`. |
| [src/lib/utils.ts](../../src/lib/utils.ts) | Retained CSS class-name composition helper. Anchors: `cn`. |
| [src/types/index.ts](../../src/types/index.ts) | Retained agents/tasks/plans/models and run-event contracts. Anchors: `ModelId`, `ProviderId`, `ExecutionMode`, `RunMode`, `ModelRef`. |

## Retained web tests

| File | Responsibility and code anchors |
|---|---|
| [tests/execution.test.ts](../../tests/execution.test.ts) | Retained web execution verification; outside current default desktop tests. |
| [tests/provider-adapters.test.ts](../../tests/provider-adapters.test.ts) | Retained web provider adapters verification; outside current default desktop tests. |
| [tests/run-events.test.ts](../../tests/run-events.test.ts) | Retained web run events verification; outside current default desktop tests. |
| [tests/session.test.ts](../../tests/session.test.ts) | Retained web session verification; outside current default desktop tests. |
| [tests/storage-validation.test.ts](../../tests/storage-validation.test.ts) | Retained web storage validation verification; outside current default desktop tests. |
| [tests/task-engine.test.ts](../../tests/task-engine.test.ts) | Retained web task engine verification; outside current default desktop tests. |
| [tests/task-output.test.ts](../../tests/task-output.test.ts) | Retained web task output verification; outside current default desktop tests. |
| [tests/workspace.e2e.ts](../../tests/workspace.e2e.ts) | Retained web workspace.e2e verification; outside current default desktop tests. |

## Existing design/feature documentation

| File | Responsibility and code anchors |
|---|---|
| [docs-desktop/avatar-behavior.md](../../docs-desktop/avatar-behavior.md) | Existing avatar behavior notes; distinguish implementation, plans, and dated evidence. |
| [docs-desktop/effects.md](../../docs-desktop/effects.md) | Existing effects notes; distinguish implementation, plans, and dated evidence. |
| [docs-desktop/grok-comparison.md](../../docs-desktop/grok-comparison.md) | Existing grok comparison notes; distinguish implementation, plans, and dated evidence. |
| [docs-desktop/providers.md](../../docs-desktop/providers.md) | Existing providers notes; distinguish implementation, plans, and dated evidence. |
| [docs-desktop/research-decisions.md](../../docs-desktop/research-decisions.md) | Existing research decisions notes; distinguish implementation, plans, and dated evidence. |
| [docs-desktop/research-implementation.md](../../docs-desktop/research-implementation.md) | Existing research implementation notes; distinguish implementation, plans, and dated evidence. |
| [docs-desktop/runtime.md](../../docs-desktop/runtime.md) | Existing runtime notes; distinguish implementation, plans, and dated evidence. |
| [docs-desktop/verification.md](../../docs-desktop/verification.md) | Existing verification notes; distinguish implementation, plans, and dated evidence. |
| [docs-desktop/video-options-plan.md](../../docs-desktop/video-options-plan.md) | Existing video options plan notes; distinguish implementation, plans, and dated evidence. |
| [docs/provider-api-notes.md](../../docs/provider-api-notes.md) | Existing provider api notes notes; distinguish implementation, plans, and dated evidence. |
| [docs/workspace-redesign.md](../../docs/workspace-redesign.md) | Existing workspace redesign notes; distinguish implementation, plans, and dated evidence. |

## Assets

| File | Responsibility and code anchors |
|---|---|
| [assets/icon.ico](../../assets/icon.ico) | Windows application icon asset. |
| [assets/icon.png](../../assets/icon.png) | Application icon image asset. |
| [assets/licenses/bloub-MIT.txt](../../assets/licenses/bloub-MIT.txt) | License for imported avatar code. |

## Root configuration/guidance

| File | Responsibility and code anchors |
|---|---|
| [.env.example](../../.env.example) | Placeholder provider/environment names; no real credentials. |
| [.gitignore](../../.gitignore) | Version-control exclusions for builds, dependencies, profiles, and secrets. |
| [AGENTS.md](../../AGENTS.md) | Contributor instructions and required documentation updates. |
| [AUDIT.md](../../AUDIT.md) | Historical repository audit report and evidence. |
| [CLAUDE.md](../../CLAUDE.md) | Additional repository contributor guidance. |
| [components.json](../../components.json) | Retained web component generator settings. |
| [eslint.config.mjs](../../eslint.config.mjs) | Retained lint setup; no current npm lint alias. |
| [next-env.d.ts](../../next-env.d.ts) | Retained Next.js TypeScript environment declarations. |
| [next.config.ts](../../next.config.ts) | Retained Next.js configuration outside the desktop build. |
| [package-lock.json](../../package-lock.json) | Locked npm dependency resolutions. |
| [package.json](../../package.json) | Active scripts, dependencies, executable entry, and packaging configuration. |
| [playwright.config.ts](../../playwright.config.ts) | Retained web Playwright setup, separate from desktop fixtures. |
| [postcss.config.mjs](../../postcss.config.mjs) | Retained web PostCSS setup; Vite uses its own plugin configuration. |
| [README.md](../../README.md) | Product setup/workflows and handbook navigation. |
| [TESTING.md](../../TESTING.md) | Historical verification evidence tied to specific snapshots. |
| [tsconfig.json](../../tsconfig.json) | TypeScript options and desktop include set. |
| [vite.config.mts](../../vite.config.mts) | Renderer root, dev host/port, and build output. |

## New onboarding files

| File | Responsibility and code anchors |
|---|---|
| [scripts/test-onboarding-desktop.mjs](../../scripts/test-onboarding-desktop.mjs) | Direct bot creation, saved question, composer focus, first-answer routing, capacity limits, and restart verification against an isolated desktop fixture. |
| [tests-desktop/bot-onboarding.test.ts](../../tests-desktop/bot-onboarding.test.ts) | Engine tests for provider-free bot/chat/greeting creation, distinct names, capacity failure, persistence, and first-answer model context. |

## Branding compatibility check

| File | Responsibility and code anchors |
|---|---|
| [scripts/test-branding-desktop.mjs](../../scripts/test-branding-desktop.mjs) | Real Electron startup checks for the OpenIbot name, legacy profile/session directory, saved identities/chats, encrypted credential continuity, About text and explicit profile override. Uses disposable profiles and a local catalog fixture. |

## Premium design assets

| File | Responsibility and code anchors |
|---|---|
| [docs/design/openibot-design.md](../design/openibot-design.md) | Palette, typography, icon generation provenance, contrast evidence and implementation/maintenance guide. |
| [docs/design/openibot-icon-master.png](../design/openibot-icon-master.png) | Higgsfield-generated transparent 1024-pixel source for the application icon. |
| [docs/design/openibot-ui-concept.png](../design/openibot-ui-concept.png) | Higgsfield-generated visual direction; illustrative UI rather than live application state. |

## Handbook files

All docs/code/ sections are indexed in [the handbook entry](README.md). Keep this inventory current with new/renamed/deleted source files and record behavior changes in [the log](CHANGELOG.md) following [the maintenance guide](15-maintenance.md).
