# Grok Bot comparison — October 2, 2026

Inspected the open Grok Bot desktop application through its native UI: main bot, Library, Computer and the existing Job Hunt team. Navigation only; no prompts sent, jobs started, connected tools called, settings saved or files shared. A tab's first capture sometimes showed the preceding view; observations below were checked against a subsequent capture.

| Observed Grok behavior | Existing IBot implementation | Improvement delivered |
| --- | --- | --- |
| Pinned main bot with a star; specialists beneath it | `renderer/BotNavigation.tsx`, `shared/bots.ts` already implement main-bot selection and menus | Retained existing behavior |
| Specialist rows show a short recent update or document summary | Rows previously showed only the bot's status | `renderer/bot-activity.ts` and `renderer/BotNavigation.tsx`: latest visible individual assistant reply or attachment preview; active/error states take priority |
| Team chat is a sidebar entry alongside specialists | Group creation and team strip existed in `renderer/Dialogs.tsx` and `renderer/App.tsx`; removing Conversations removed access to saved groups | `renderer/TeamNavigation.tsx` and `renderer/App.tsx`: Teams rows, create-team control, title/member search and latest-updated ordering; no Conversations section |
| Details has editable name/label controls | Bot settings and Rename menu already edit name/role in `renderer/Dialogs.tsx` | Existing capability retained; inline editing not added |
| Library tab describes files/pages/apps; selected main bot's library was empty | `renderer/BotDetails.tsx` already lists shared attachments and workspace files | No duplication; Grok's file generation behavior was not exercised |
| Computer tab displays a screen tile with Open computer | `renderer/BotDetails.tsx` and `renderer/Computer.tsx` already expose Linux screen/files/terminal | No workspace started during comparison |
| Group Details mentions routines; Members tab is visible | IBot team strip selects members; routines editable in BotDetails | Existing capabilities retained |

Reference-app claims about background work, Gmail/GitHub access, memory and delegation are **UNKNOWN** as runtime guarantees: chat text is not execution evidence. Grok's authorization, credential isolation, recovery and actual tool behavior were not inspected. IBot approval/containment rules are unchanged.

Tests: `tests-desktop/bot-activity.test.ts` verifies reply isolation, hidden tool-call exclusion, attachment summaries, active-state priority, team filtering/order/search and archived-member exclusion. `scripts/test-bot-activity-desktop.mjs` uses an isolated local profile and synthetic saved reply to verify previews, team and individual navigation, search, no Conversations section and unchanged saved chat/message IDs. Production data is not manually edited.

Limits: older individual chats remain stored but have no history picker. Teams containing removed bots stay hidden until restoration. Previews are shortened plain text, not unread receipts or evidence that work succeeded. Concurrent avatar work is preserved separately.
