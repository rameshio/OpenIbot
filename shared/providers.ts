/** API-key presets. Account/subscription OAuth services need a separate sign-in flow. */
export interface ProviderDefinition {
  id: string; name: string; baseUrl: string; group: 'Direct APIs' | 'Model gateways' | 'Local & custom';
  protocol: 'responses' | 'messages' | 'chat'; keyOptional?: boolean; hint?: string;
}
const direct = (id: string, name: string, baseUrl: string, protocol: ProviderDefinition['protocol'] = 'chat', hint?: string): ProviderDefinition => ({id, name, baseUrl, protocol, group: 'Direct APIs', hint});
const gateway = (id: string, name: string, baseUrl: string): ProviderDefinition => ({id, name, baseUrl, protocol: 'chat', group: 'Model gateways'});
const local = (id: string, name: string, baseUrl: string): ProviderDefinition => ({id, name, baseUrl, protocol: 'chat', group: 'Local & custom', keyOptional: true});
export const providerCatalog: ProviderDefinition[] = [
  direct('openai', 'OpenAI', 'https://api.openai.com/v1', 'responses'),
  direct('anthropic', 'Anthropic · Claude', 'https://api.anthropic.com/v1', 'messages'),
  direct('gemini', 'Google · Gemini', 'https://generativelanguage.googleapis.com/v1beta/openai'),
  direct('xai', 'xAI · Grok', 'https://api.x.ai/v1'),
  gateway('openrouter', 'OpenRouter', 'https://openrouter.ai/api/v1'),
  gateway('nvidia', 'NVIDIA · NIM', 'https://integrate.api.nvidia.com/v1'),
  direct('deepseek', 'DeepSeek', 'https://api.deepseek.com/v1'),
  direct('mistral', 'Mistral AI', 'https://api.mistral.ai/v1'),
  gateway('groq', 'Groq', 'https://api.groq.com/openai/v1'),
  gateway('together', 'Together AI', 'https://api.together.ai/v1'),
  gateway('fireworks', 'Fireworks AI', 'https://api.fireworks.ai/inference/v1'),
  gateway('cerebras', 'Cerebras', 'https://api.cerebras.ai/v1'),
  gateway('deepinfra', 'DeepInfra', 'https://api.deepinfra.com/v1/openai'),
  gateway('huggingface', 'Hugging Face', 'https://router.huggingface.co/v1'),
  gateway('novita', 'Novita AI', 'https://api.novita.ai/openai/v1'),
  gateway('nebius', 'Nebius Token Factory', 'https://api.tokenfactory.nebius.com/v1'),
  gateway('gmi', 'GMI Cloud', 'https://api.gmi-serving.com/v1'),
  direct('arcee', 'Arcee AI', 'https://api.arcee.ai/api/v1'),
  direct('upstage', 'Upstage · Solar', 'https://api.upstage.ai/v1'),
  direct('moonshot', 'Moonshot · Kimi', 'https://api.moonshot.ai/v1'),
  direct('moonshot-cn', 'Moonshot · China', 'https://api.moonshot.cn/v1'),
  direct('minimax', 'MiniMax', 'https://api.minimax.io/anthropic/v1', 'messages', 'Some endpoints do not publish a model catalog. Manual model entry is available.'),
  direct('minimax-cn', 'MiniMax · China', 'https://api.minimaxi.com/anthropic/v1', 'messages'),
  direct('zai', 'Z.ai · GLM', 'https://api.z.ai/api/paas/v4'),
  direct('zai-coding', 'Z.ai · Coding Plan', 'https://api.z.ai/api/coding/paas/v4'),
  direct('zhipu', 'Zhipu AI · China', 'https://open.bigmodel.cn/api/paas/v4'),
  direct('alibaba', 'Alibaba · Qwen', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'),
  direct('alibaba-cn', 'Alibaba · Qwen China', 'https://dashscope.aliyuncs.com/compatible-mode/v1'),
  direct('alibaba-coding', 'Alibaba · Coding Plan', 'https://coding-intl.dashscope.aliyuncs.com/v1'),
  direct('stepfun', 'StepFun', 'https://api.stepfun.com/v1'),
  direct('xiaomi', 'Xiaomi · MiMo', 'https://api.xiaomimimo.com/v1'),
  gateway('tencent', 'Tencent · TokenHub', 'https://tokenhub.tencentmaas.com/v1'),
  gateway('kilocode', 'Kilo Gateway', 'https://api.kilo.ai/api/gateway'),
  gateway('opencode', 'OpenCode Zen', 'https://opencode.ai/zen/v1'),
  direct('ollama-cloud', 'Ollama Cloud', 'https://ollama.com/v1'),
  local('ollama', 'Ollama · Local', 'http://127.0.0.1:11434/v1'),
  local('lmstudio', 'LM Studio', 'http://127.0.0.1:1234/v1'),
  local('vllm', 'vLLM / SGLang', 'http://127.0.0.1:8000/v1'),
  local('llamacpp', 'llama.cpp', 'http://127.0.0.1:8080/v1'),
  local('litellm', 'LiteLLM Proxy', 'http://127.0.0.1:4000/v1'),
  local('compatible', 'Custom · OpenAI-compatible', 'http://127.0.0.1:1234/v1'),
];
export const providerDefinition = (id: string) => providerCatalog.find(provider => provider.id === id);
export const providerName = (id: string) => providerDefinition(id)?.name ?? id;
