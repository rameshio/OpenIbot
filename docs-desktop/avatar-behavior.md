# Avatar behavior and black theme · 0.5.1

## Supplied HTML animation integration · October 2, 2026

Live built-in avatars now use `GrokDrawing.tsx`, a scoped React/CSS adaptation of the supplied `grok-bot.html` and `grok-bot.md`. The 22 declarative poses are recorded in `grok-poses.ts`; the HTML's page controls and scripts are not loaded into the application. Body geometry morphs over 620 ms, eyes transition independently over 220–380 ms, and automatic resting blinks last 180 ms.

The saved body shape stays stable through every conversation and activity state. Thinking looks up; working shows the two colored orbit rings; waiting shows attentive eyes with a blue attention badge; blocked shows sad eyes with a red badge. Completion briefly shows happy eyes before returning to the resting expression. Pointed bodies keep their eyes inside the silhouette. Historical message portraits and appearance previews stay still, so a new message or background task cannot change older portraits or obscure the shape being customized. Loading an already completed profile starts settled.

Expressions change automatically on the bot in the open conversation. Typing makes it attentive; sending makes it thoughtful; a new user message makes it squint as it reads. Recent replies trigger a short wink, a happy completion, an attentive clarification question, a ready pose for a file, or a sad failure reaction. These cues expire after eight seconds and do not replay old messages or change saved identity. Active runtime states take priority over conversational cues. There is no separate animation gallery or manual expression picker; the appearance editor keeps shape, color, accessories, upload, and generation controls. Existing saved expressions remain compatible.

CSS runs bobbing, pulses, shaking, and rings; timers handle blinking and the end of brief reactions. Off-screen avatars pause their CSS animations and stop blinking. Hidden windows, reduced motion, motion Off, and static thumbnails disable animation and transitions. The existing licensed SVG engine remains available for explicitly requested legacy motion poses; its license is still shipped.

Verification: `npm run typecheck`, `npm run build`, `node --import tsx --test tests-desktop/avatar.test.ts tests-desktop/grok-avatar.test.ts`, and `npm run test:avatars`.

## Previous SVG implementation

The following records the previous default renderer and its research provenance; the HTML integration above supersedes its live behavior and clock description.

Reference read on October 1, 2026: https://www.grokbotexplained.app/avatar-system
Primary product behavior: https://x.ai/news/designing-grok-bot

The guide describes eight silhouettes, sixteen expressions, twelve colors and fifteen still previews of motion states. Still exports cannot supply the original proprietary animations. Its linked community renderer is a reconstruction, not xAI's production engine.

## Implementation

The framework-free MIT-licensed renderer from https://github.com/jeremy-prt/bloub is pinned in `renderer/avatar-engine/UPSTREAM.txt`. Its full license is shipped in `assets/licenses/bloub-MIT.txt`. OpenIbot's React integration, clock, status mapping, contrast, settings and theme are local adaptations. Upstream Vue UI and media exports are not included.

All sixteen expressions are selectable by clicking the bot's own avatar. Existing eight shape identifiers and saved identities remain valid; the renderer maps them to circle, pebble, capsule, hexagon, cloud, squircle, triangle and droplet. Existing muted colors remain available alongside the reference's twelve vivid colors.

| OpenIbot status | Avatar behavior |
| --- | --- |
| Idle | Chosen expression, gentle gaze drift and blinking |
| Thinking | Three moving dots |
| Working | Depth-sorted rotating orbit rings |
| Waiting | Blue attention marker |
| Error | Alert gesture; accessible Blocked label |
| Done | One completion burst, then return to the chosen resting face |

The renderer supports all fifteen reference states. The live roster uses actual engine status; it never cycles through fake work. A completion loaded from a saved profile starts settled. Photos and generated images retain their own artwork with an external activity ring or attention marker.

Successful bot replies record a completion timestamp so the short gesture remains visible if a status update returns the bot to idle. A completed bot settles visually even while its saved status remains Done. The upstream deterministic blink schedule repeats for long-running desktop sessions. These are the two local behavior adaptations; upstream animation files otherwise remain pinned.

The existing failed-run status drives the blocked avatar until another run changes it; pausing returns to idle. The upstream license and repository commit are recorded with the shipped assets.

One shared 30 fps clock drives visible avatars. Off-screen avatars unsubscribe; hidden windows stop; editor thumbnails are static. Reduced motion and motion Off show static activity poses and stop the clock. The operating system's reduced-motion preference also applies. No audio, model call or network request is needed to animate avatars.

The dark theme now uses neutral black (#080808), charcoal surfaces and soft-white controls. Light mode remains available. Black bot bodies have contrasting eyes and a subtle outline.

## Verification

Run `npm run typecheck`, `npm test`, `npm run build`, `npm run test:avatars`, and `node scripts/verify-premium.mjs`. The avatar suite checks all shape/expression/state combinations, persistence, rejected edits, animation changes, motion Off/reduced/OS settings, completion settling, uploaded artwork, compact layout and isolated packaged execution. All tests use temporary profiles; no provider credentials or user's conversations enter fixtures.
