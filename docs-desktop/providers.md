# Provider connections

Settings → Models → Add provider follows three steps: select the provider,
enter its API key, then load and choose a model. Save & use connection stores it
and makes it active. Keep multiple accounts for the same provider by giving them
different names. The model button beside the message composer searches models
across saved connections and switches immediately, without restarting I Bot.
An existing run retains the provider, model, and key captured when it started.

There are 41 presets covering direct APIs, model gateways, and local servers.
They include NVIDIA NIM, OpenRouter, OpenAI, Anthropic, Gemini, xAI, DeepSeek,
Mistral, Groq, Together, Fireworks, Cerebras, DeepInfra, Hugging Face, Novita,
Nebius, GMI, Arcee, Upstage, Moonshot, MiniMax, Z.ai, Zhipu, Alibaba, StepFun,
Xiaomi, Tencent, Kilo, OpenCode Zen, Ollama Cloud, and local Ollama, LM Studio,
vLLM/SGLang, llama.cpp, and LiteLLM. Regional and coding-plan endpoints have
separate presets. Custom OpenAI-compatible connections accept another service's
base endpoint. Local and custom servers may omit the key if they allow it.

The UI uses real model-list responses, rather than a fixed list of model names.
OpenRouter first verifies the credential with `/key`, then loads its authenticated
`/models/user` catalog, respecting account preferences. Only after the key is
accepted, an unavailable account catalog can fall back to `/models`; the UI
explicitly labels this as the public catalog. OpenRouter pagination uses offsets.
Anthropic pagination uses `after_id`; OpenAI-compatible endpoints
use `/models`, including Gemini's documented compatibility endpoint. Known
image-only and embedding entries are excluded. Names, context sizes, and tool
support appear only when the provider reports them. An explicitly chat-only
model receives no tools; an unknown capability is not presented as verified.

Some providers, plans, and private deployments do not expose a model catalog.
The editor offers manual model IDs, clearly marked as unchecked. Discovery does
not make generation requests, confirm remaining credits, or guarantee access
to every listed model. Rejected OpenRouter keys stop discovery without loading
a public catalog. Key names, hashes, and management keys cannot replace a regular
chat API secret. The editor links to OpenRouter Keys and explains a rejected key
beside the key field. Consumer subscription/OAuth sign-in,
AWS signing, and project-based cloud authentication are not API-key presets.

Common paste wrappers (matching quotes, a `Bearer` prefix, and API-key environment
assignments) are removed before sending or saving a key. Malformed pasted text is
rejected without displaying it. Keys stay in Electron's main process after saving
and are encrypted with Windows
credential storage. The renderer receives only a saved-key flag. A saved key
can be reused only for the same connection, provider, and normalized endpoint.
Model-list redirects are rejected; arbitrary provider error bodies are never
displayed. Discovery alone does not save keys or change the active connection.
Older single-provider profiles migrate automatically, preserving conversations.

References checked on September 30, 2026:

- [Hermes provider setup and switching](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/integrations/providers.md), plus the installed Hermes provider descriptors.
- [OpenAI authentication and models](https://developers.openai.com/api/reference/overview).
- [Anthropic model listing and pagination](https://platform.claude.com/docs/en/api/models/list).
- [Gemini OpenAI compatibility and model discovery](https://ai.google.dev/gemini-api/docs/openai).
- [OpenRouter account-filtered catalog](https://github.com/OpenRouterTeam/typescript-sdk/blob/main/src/funcs/modelsListForUser.ts).
- [OpenRouter key verification](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key).
- [OpenRouter public catalog](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties).
- [OpenRouter management keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys).
- [NVIDIA LLM APIs](https://docs.api.nvidia.com/nim/reference/llm-apis).
- [Groq compatibility](https://console.groq.com/docs/openai).
- [Together compatibility](https://docs.together.ai/docs/inference/openai-compatibility).
- [Nebius quickstart](https://docs.tokenfactory.nebius.com/quickstart).
- [Hugging Face chat completion](https://huggingface.co/docs/inference-providers/tasks/chat-completion).

Automated adapter tests use local HTTP fixtures, including native Responses and
Messages requests, Chat Completions, authenticated discovery, error handling,
key isolation, migration, and persistence. No private provider key is required
for these tests. Public unauthenticated probes confirmed NVIDIA returned a
catalog and OpenRouter's account catalog required authentication. This is not
an end-to-end generation certification for all providers or accounts.
