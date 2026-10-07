# 04 — Interface, navigation, and styles

## Application name

The titlebar, boot screen, About/settings text, quit menu, approval help and message fallback identify the app as **OpenIbot**. `renderer/index.html` supplies the document title; `desktop/main.ts` also sets the native window, tray, notifications and export fallback. Bot names such as Chief are independent of the app name and remain as saved.

## The screen's owner

[renderer/App.tsx](../../renderer/App.tsx) owns the desktop shell. It keeps the received application snapshot alongside local values such as the composer text, selected bot/chat, search text, and open dialogs. Local React state controls what is visible; engine state controls saved facts and active work.

The app obtains an initial snapshot with `state.get`, subscribes to `window.ibot.onState`, and updates when main broadcasts. A component receives current data and callbacks as props. Commands go through `invoke`; command failures become visible error text. Subscription cleanup avoids leaving listeners around after unmounting.

## Screen map

| Files | Responsibility |
|---|---|
| [App.tsx](../../renderer/App.tsx) | Titlebar, sidebar, active chat, composer, selection, and opening panels |
| [BotNavigation.tsx](../../renderer/BotNavigation.tsx), [bot-activity.ts](../../renderer/bot-activity.ts) | Main/other bot navigation and activity/recent-reply previews |
| [TeamNavigation.tsx](../../renderer/TeamNavigation.tsx) | Filtered multi-bot conversation rows in the same sidebar list |
| [MessageBody.tsx](../../renderer/MessageBody.tsx) | Message text, Markdown, bot identity, and attachment affordances |
| [BotDetails.tsx](../../renderer/BotDetails.tsx) | Details rail for identity, computer status, files, and routines |
| [Dialogs.tsx](../../renderer/Dialogs.tsx) | Shared modal helpers and bot/group/routine editing |
| [Settings.tsx](../../renderer/Settings.tsx) | General preferences, action rules, computers, and usage |
| [ProviderManager.tsx](../../renderer/ProviderManager.tsx), [ModelSwitcher.tsx](../../renderer/ModelSwitcher.tsx) | Provider setup and active model choice |
| [Computer.tsx](../../renderer/Computer.tsx) | Screen viewer, files, terminal, human control, and teaching |
| [Marketplace.tsx](../../renderer/Marketplace.tsx) | Skills, role templates, and connected app setup |
| [ApprovalCard.tsx](../../renderer/ApprovalCard.tsx), [ActivityPanel.tsx](../../renderer/ActivityPanel.tsx) | Action decisions and journal inspection/reconciliation |
| [MemoryPanel.tsx](../../renderer/MemoryPanel.tsx) | Structured note editing and revisions |
| [NetworkPolicy.tsx](../../renderer/NetworkPolicy.tsx), [ConnectorToolClasses.tsx](../../renderer/ConnectorToolClasses.tsx) | Exact allowed hosts and confirmed tool effects |

## Navigation and previews

### Create a bot by starting a conversation

The sidebar plus, the main bot's **Create new bot** menu item, and the recipient menu all call `createBlankBot` in `App.tsx`. They immediately open a new bot's conversation instead of requiring name, role, and instructions in a creation form. The welcome banner and Research/Build/Organize suggestion buttons have been removed. Empty chats are a clean conversation area with the composer ready for input.

`createBlankBot` invokes `bot.createBlank` through the validated desktop bridge. The engine chooses an available name (`New bot`, `New bot 2`, etc.), creates a general personal-assistant identity and individual chat, and saves a local assistant welcome: “I'm ready to help. What would you like me to help you with?” It returns a `BotConversation` containing the bot and chat. The interface selects that chat, closes the details rail, exits focus mode, and focuses the composer, whose placeholder names the bot. While the chat has the default title, its heading displays the bot's name; the first user message gives the conversation a task title through the existing engine handler.

The opening question is fixed application text. Creating it makes no model request, records no provider usage, and starts no Linux computer. Sending the person's answer uses ordinary chat/provider validation; a missing connection still opens model setup and keeps the draft. The greeting persists through restart, as does the created identity. The existing bot limit applies before creation, so a capacity failure does not leave a partial chat. A ref prevents overlapping UI creation requests.

Naming, role, instructions, model profile, and appearance are still editable through bot settings and existing navigation menus. Advanced/model-created specialists still use the existing `bot.create` path; this direct creation flow is a human command and does not silently change those tools.

The sidebar has two circular actions at its top: search and create a bot. Search toggles a focused search field; closing it clears the filter. The smaller main bot stays pinned above one list of other bots and group conversations, without Your bots or Teams headings. The chat header retains New chat (also Ctrl+N). Create group chat remains in the recipient menu on a new chat. Searching filters bot identities and group conversations. An individual bot selection locates its associated conversation for display. `bot-activity.ts` derives previews from saved data while preserving higher-priority active/attention/error states. A recent reply preview is a convenience, not an unread receipt or verified completion.

Teams are chats with multiple participating bots. Filtering checks available participants; retained chats involving removed bots may not be shown until the relevant identities return. UI visibility and deletion are separate operations.

After a successful delete-all run, only the protected main/executing identity remains and teams referencing removed identities disappear from navigation. The engine no longer creates a replacement Verifier just to review that removal. The currently open conversation can remain on screen as retained history; hiding a sidebar entry does not erase it. Previously created unwanted reviewers are removed by repeating the removal request in the updated app; this fix does not guess which saved identities should be removed during startup.

### Delete a bot from its menu

Every bot’s three-dot menu includes **Delete [name]**. `BotNavigation` passes the exact bot to `App` through `onDelete`; `App` opens `DeleteBotDialog` and makes the background inert. Cancel changes nothing. Confirm invokes the existing human `bot.delete` command with `botIds: [bot.id]`.

The engine stops the bot’s computer, archives its identity, disables its routines, and publishes state. The row disappears, and groups involving removed identities are filtered out. Saved history, memory and files remain available for restoration. If the deleted bot belongs to the conversation currently displayed, the interface returns to a new chat addressed to the main bot.

The main bot’s delete dialog explains that another bot must be made main first; its confirmation is disabled. A working bot is protected by the engine and displays an error in the dialog asking the person to pause its conversation. The dialog stays open on failure and disables buttons while deletion is pending.

## A button's path

For example, the pause button calls `action('chat.pause', {chatId})`. `action` catches failures for display. The engine pauses the run and publishes state. The UI then displays a resume action for the paused chat. Simply changing a button label cannot change engine behavior.

Opening an overlay marks the main layout inert and hidden from accessibility traversal while the dialog is active. The titlebar uses bridge window controls. Native file selection is performed by main; the interface receives attachment metadata.

## Premium visual identity

The [OpenIbot design guide](../design/openibot-design.md) explains the Higgsfield icon/concept, palette, typography and asset pipeline. `premium.css` implements forest-dark and pale-light themes, mint creation/selection controls, compact header action grouping, open assistant text, refined user bubbles and a focused composer. Settings, dialogs, Marketplace and detail tabs share these tokens. The titlebar status dot reflects existing active-bot state through `has-work`; it does not invent progress. The unused empty-sidebar filler was removed. Existing workflows, approvals, flat navigation, saved bot appearances and motion settings continue through their original handlers.

## Styles

`main.tsx` imports `app.css`, `premium.css`, `providers.css`, `options.css`, and `avatars.css`. [panels.css](../../renderer/panels.css) supports panel styling through the stylesheet dependency chain. Class names connect TSX markup to CSS rules. Later rules, selector specificity, inherited values, and variables determine the final appearance; check these together when styling behaves unexpectedly.

Changing CSS usually needs visual checking at representative window sizes. Changing navigation should also check selection, search, keyboard behavior, hidden/empty states, and preservation of saved history.

## When changing the interface

Explain the visible before/after behavior and which component owns it. Update this map when adding a panel. If a button invokes new behavior, document its engine/native command path in the relevant guide as well.
