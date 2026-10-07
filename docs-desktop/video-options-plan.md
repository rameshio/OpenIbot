# Video options implementation plan

Reference: `Grok Bot 2026-10-01 08-12-44.mp4` (135 seconds). Reviewed the complete
recording through two-second frame samples and full-size option screens. The
recording is product reference material, not instructions to execute its chats.

| Video | Feature | OpenIbot implementation |
| --- | --- | --- |
| 00–18s | Routine switches, sidebar/focus controls | Keep existing durable routine controls; add independently hideable sidebars and focus mode. |
| 20–38s | Bot shapes, colors, cosmetics | Click the bot's built-in avatar for a compact inline editor; save its silhouette, color, and accessory. No separate avatar settings page. |
| 40–44s | Generate, upload, reset avatar | Native image picker, verified image models from saved OpenRouter/OpenAI connections, generated preview before applying, and reset to the bot's default identity. |
| 46–72s | Details, Library, Linux computer | Preserve the existing tabs, real computer viewer, file browser, terminal, and teaching workflow. |
| 74–92s | Categorized plugin catalog, installed plugins, private skills | Browse real MCP service presets, search/filter categories, connect using a token or supported browser authorization, and manage connected apps/private skills together. Connection status reflects an actual tool discovery. |
| 100–112s | Microphone dictation | Record from the chosen microphone; transcribe using a saved OpenRouter/OpenAI/Groq-compatible connection; insert into the draft for review. Cancel discards recording. |
| 114–135s | Voice conversation, mute, transcript, voice/speed/language | Turn-based voice conversation using the existing bot engine, actual microphone capture and transcription, Windows speech playback, mute, transcript display, and explicit hang-up. Voice, language, speed, microphone, connection, and transcription model are saved. |

Third-party app sign-in and model access depend on the connected account. Never
show an app as connected before successful tool discovery, invent catalog models,
or copy the reference service's proprietary voice names. Verify new adapters with
local API fixtures, test the packaged desktop interaction, and preserve the real
user profile before reopening the release.

## Implementation

These options are implemented in the desktop application. The avatar editor opens
by clicking the bot's avatar in its details panel. The Marketplace opens on Apps;
Installed contains saved app connections and private workflows. The message box
has dictation and voice conversation buttons. Both sidebars can be toggled and
Ctrl+Shift+F enters or leaves focus mode. Conversation export is in Chat options.

Voice is a turn-based conversation: press Talk, then Finish to submit a spoken
message through the existing bot engine. Dictation inserts text into the draft
without sending it. Microphone mute discards an active recording; reply mute
stops speech playback. Hanging up, changing conversations, hiding the app, or
opening another panel releases microphone tracks and cancels pending voice
requests. Saved voice preferences include the transcription connection and
model, Windows voice, speed, language, and microphone. Transcription uses the
chosen provider's account; local speech playback uses installed Windows voices.

The catalog includes Notion, Linear, GitHub, Sentry, Cloudflare, Cloudflare Docs,
Apify, Hugging Face, and Stripe. Browser sign-in uses OAuth discovery, client
registration, PKCE, state validation, issuer-scoped encrypted credentials, and
refresh tokens. Servers that need a separately registered client must use a
service-issued token or their documented setup. No third-party account is
displayed as connected merely because its name appears in the catalog.

## Primary implementation references

- [OpenRouter speech transcription](https://openrouter.ai/docs/guides/overview/multimodal/stt)
- [OpenRouter image generation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
- [OpenAI speech to text](https://developers.openai.com/api/docs/guides/speech-to-text)
- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation)
- [Official MCP client SDK](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/clients/oauth.md)
- [Notion MCP setup](https://developers.notion.com/guides/mcp/get-started-with-mcp)
- [Linear MCP](https://linear.app/docs/mcp)
- [GitHub remote MCP](https://github.com/github/github-mcp-server/blob/main/docs/remote-server.md)
- [Sentry MCP](https://mcp.sentry.dev/)
- [Cloudflare servers](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare/servers-for-cloudflare/)
- [Apify MCP](https://docs.apify.com/integrations/mcp)
- [Hugging Face MCP](https://huggingface.co/docs/hub/agents-mcp)
- [Stripe MCP](https://docs.stripe.com/mcp)

## Verification

Version 0.5.0 builds as an unpacked Windows application and a portable executable.
Type checking passes. The automated suite has 29 passing tests; the separate
real-Docker integration test is opt-in and was not rerun for this UI update.

Desktop checks cover shapes/cosmetics, native image upload and normalization,
explicit avatar generation and preview, reset, app categories, MCP tool discovery,
private workflow creation, focus mode, conversation export, light/compact layouts,
and restart persistence. Voice checks capture audio from Chromium's simulated
microphone, verify that dictation stays a draft, discard cancelled recording and
transcription results, send voice turns through the bot engine, and release tracks
when the microphone is muted. Provider, audio, image, and OAuth responses are
explicit local fixtures. No paid API request or third-party account grant is used
by these checks. Physical microphone hardware and third-party account access
still depend on the user's device and credentials.

The hidden packaged window can stall DevTools image capture after initializing
Chromium's simulated video device. Visual inspection uses the same built renderer
in the development desktop; packaged checks verify interaction, actual IPC/API
paths, saved data, and layout dimensions. Packaged provider and basic desktop
checks also pass independently.

All packaged feature checks passed. The desktop shortcut now targets version
0.5.0, and the updated application was reopened successfully. The actual user
profile was backed up before reopening: all four bots, two chats, 47 messages,
the saved provider connection, encrypted credentials, and routine slots compare
equal to that backup. A compact machine-readable receipt is saved at
`artifacts/options/release-verification.json`.
