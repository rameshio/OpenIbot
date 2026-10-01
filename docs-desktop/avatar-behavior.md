# Avatar behavior and black theme · 0.5.1

Reference read on October 1, 2026: https://www.grokbotexplained.app/avatar-system
Primary product behavior: https://x.ai/news/designing-grok-bot

The guide describes eight silhouettes, sixteen expressions, twelve colors and fifteen still previews of motion states. Still exports cannot supply the original proprietary animations. Its linked community renderer is a reconstruction, not xAI's production engine.

## Implementation

The framework-free MIT-licensed renderer from https://github.com/jeremy-prt/bloub is pinned in `renderer/avatar-engine/UPSTREAM.txt`. Its full license is shipped in `assets/licenses/bloub-MIT.txt`. I Bot's React integration, clock, status mapping, contrast, settings and theme are local adaptations. Upstream Vue UI and media exports are not included.

All sixteen expressions are selectable by clicking the bot's own avatar. Existing eight shape identifiers and saved identities remain valid; the renderer maps them to circle, pebble, capsule, hexagon, cloud, squircle, triangle and droplet. Existing muted colors remain available alongside the reference's twelve vivid colors.

| I Bot status | Avatar behavior |
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
