# 11 — Avatars, reactions, and voice

## Application icon

The application icon is separate from each bot’s saved avatar. Higgsfield generated the new open-ring mark; the [design guide](../design/openibot-design.md) records its provenance and icon sizes. `assets/icon.png` supplies the native window/tray and CSS brand mark, while `assets/icon.ico` supplies the packaged Windows executable. Replacing the application icon does not rewrite any bot’s shape, image, expression, name or saved color.

## Saved appearance versus temporary reaction

Bot identity includes shape, color, optional image/accessory, and expression. [shared/identity.ts](../../shared/identity.ts) supplies choices and voice defaults. [AvatarEditor.tsx](../../renderer/AvatarEditor.tsx) edits them; the engine validates and saves appearance. Main's `normalizeAvatar` reads allowed image formats, crops to a square, and resizes to 256 by 256 pixels. This path is separate from animated vector/CSS avatars.

[Avatar.tsx](../../renderer/Avatar.tsx) chooses the drawing: a custom image when present, `AvatarDrawing` when explicit motion is supplied, otherwise the current `GrokDrawing` path. It also renders accessories, CSS variables, and accessible identity/status labels.

## Current Grok-style drawing

This name refers to local reference-inspired appearance, not a dependency on the xAI model or the Grok application runtime. [grok-poses.ts](../../renderer/grok-poses.ts) holds declarative geometry. [grok-behavior.ts](../../renderer/grok-behavior.ts) combines saved shape/expression with activity poses. [GrokDrawing.tsx](../../renderer/GrokDrawing.tsx) renders body/eyes/decoration and handles visibility, blinking, celebration, and cue expiration.

`grokRest` builds the saved resting identity. `grokReaction` preserves its silhouette and changes face/activity details. `grokActivity` maps idle/thinking/working/waiting/error/done to activity poses. Explicit pose previews are a separate selection path.

[conversation-avatar.ts](../../renderer/conversation-avatar.ts) computes temporary cues for participants in the open chat. Sending, draft typing, recent user input, and a recent bot reply can trigger a reaction. Recent message cues expire after eight seconds. `replyPose` uses text/attachment heuristics: a question can produce a listening pose, a file reply a file-related pose, and failure language a sad pose. These heuristics do not verify success or change saved identity.

GrokDrawing prioritizes non-idle activity over conversation cues; short completion celebrations are temporary. Visibility and motion preferences control animated behavior. [avatar-clock.ts](../../renderer/avatar-clock.ts) and [avatars.css](../../renderer/avatars.css) participate in motion behavior. Quiet/frozen previews avoid normal live activity.

## The retained SVG engine

[AvatarDrawing.tsx](../../renderer/AvatarDrawing.tsx) and [avatar-behavior.ts](../../renderer/avatar-behavior.ts) use `avatar-engine/` for procedural geometry, faces, states, and transitions. Its upstream/license notes identify provenance. It remains relevant for explicit motion drawing and supporting tests even though the default live path currently uses GrokDrawing.

[import-grok-poses.mjs](../../scripts/import-grok-poses.mjs) extracts the declarative table from a supplied reference HTML. [update-avatar-package.mjs](../../scripts/update-avatar-package.mjs) refreshes renderer content in a specific existing package and checks that the backend bytes match. It is specialized tooling, not the normal full-package build workflow.

## Voice and media

[VoiceTools.tsx](../../renderer/VoiceTools.tsx) controls microphone recording, transcription, text insertion/sending, and speech synthesis of replies. Main grants a short audio-only permission window following `voice.microphone`. Hiding the window triggers a voice-stop event; component cleanup releases tracks, cancels requests, and stops speech.

[desktop/media.ts](../../desktop/media.ts) handles supported media-model discovery, audio validation/transcription, and avatar image generation. The engine's media jobs use cancellation IDs and timeouts. Audio is transcribed through a selected supported provider; reply speech uses the environment's speech-synthesis voices. The voice mode is not the same as a dedicated full-duplex realtime model API.

## When changing identity/audio

Document saved fields separately from transient cues, priority/expiration, motion preferences, and image handling. Check editor previews, navigation, messages, high/low contrast colors, quiet mode, and current activity. Voice changes need microphone cleanup, cancellation, context switching, and provider failure checks. Existing [avatar notes](../../docs-desktop/avatar-behavior.md) provide deeper visual history.
