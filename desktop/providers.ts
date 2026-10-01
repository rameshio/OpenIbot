import type { AvailableModel, ModelDiscovery, ProviderSettings } from '../shared/types';
import { providerDefinition } from '../shared/providers';

export interface ToolDefinition { name: string; description: string; parameters: Record<string, unknown>; }
export interface ToolCall { id: string; name: string; arguments: Record<string, unknown>; }
export interface ModelMessage { role: 'user' | 'assistant' | 'tool'; content: string; calls?: ToolCall[]; callId?: string; rawOutput?: unknown[]; image?: string; }
export interface ModelRequest { settings: ProviderSettings; apiKey: string; system: string; messages: ModelMessage[]; tools: ToolDefinition[]; signal: AbortSignal; onRetry?: (message: string)=>void; }
export interface ModelResult { text: string; calls: ToolCall[]; inputTokens: number; outputTokens: number; rawOutput?: unknown[]; }
export type ModelClient = (request: ModelRequest)=>Promise<ModelResult>;
type Json = Record<string, any>;
class ProviderHttpError extends Error { constructor(readonly status: number, message: string) {super(message);} }

/** Accept common paste wrappers; never log or return the normalized credential. */
export function normalizeApiKey(value: string): string {
  let key = value.trim();
  const assignment = /^(?:export\s+)?(?:[A-Z][A-Z0-9_]*_API_KEY|API_KEY)\s*=\s*(.*)$/i.exec(key);
  if (assignment) key = assignment[1].trim();
  const unquote = (text: string) => text.length > 1 && ['"', "'"].includes(text[0]) && text.at(-1) === text[0] ? text.slice(1, -1).trim() : text;
  key = unquote(unquote(key).replace(/^Bearer\s+/i, '').trim());
  if (key.length > 8192 || /\s|\0/.test(key)) throw new Error('Paste only the full API secret key, without a command or other text.');
  return key;
}

export function validateEndpoint(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash) throw new Error('Use a base URL without credentials, query, or fragment.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Use HTTPS, or HTTP on localhost for a local model.');
  return url.toString().replace(/\/$/, '');
}
function argumentsOf(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') { try { const parsed = JSON.parse(value); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return { __invalid_arguments: value }; } }
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export async function jsonRequest(url: string, init: RequestInit, signal: AbortSignal, retry?: (message:string)=>void): Promise<Json> {
  for (let attempt = 0; ; attempt++) {
    signal.throwIfAborted();
    const timed = AbortSignal.any([signal, AbortSignal.timeout(120_000)]);
    let response: Response;
    try { response = await fetch(url, { ...init, signal: timed, redirect: 'error' }); }
    catch (error) { if (signal.aborted) throw error; throw new Error('Could not reach the provider. Check the endpoint and network connection. Redirects are not followed.'); }
    const body = await response.text();
    if (!response.ok) {
      if ([429, 502, 503, 504].includes(response.status) && attempt < 2) {
        retry?.(`Provider returned ${response.status}; retrying (${attempt + 1}/2).`);
        await new Promise<void>((resolve, reject) => { const stop = () => { clearTimeout(timer); reject(signal.reason); }; const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, 1000 * 2 ** attempt); signal.addEventListener('abort', stop, { once: true }); });
        continue;
      }
      // The server may echo submitted headers/content; never include arbitrary response bodies in renderer errors.
      let message = `Provider returned HTTP ${response.status}`;
      try { const data = JSON.parse(body); const type = data.error?.type || data.error?.code; if (['authentication_error', 'invalid_api_key', 'permission_error', 'permission_denied', 'rate_limit_error', 'rate_limit_exceeded', 'insufficient_quota', 'invalid_request_error', 'not_found_error', 'overloaded_error'].includes(type)) message += ` (${type})`; } catch { /* HTTP code suffices */ }
      const help = response.status === 401 ? 'The provider did not accept the API key. Check that it is complete, active, and issued for the selected provider.' : response.status === 402 ? 'Check your account credits or billing with the provider.' : response.status === 403 ? 'This key or account does not have permission for this request.' : 'Check your model, endpoint, and provider account in Settings.';
      throw new ProviderHttpError(response.status, `${message}. ${help}`);
    }
    try { return JSON.parse(body); } catch { throw new Error('The provider returned an invalid JSON response.'); }
  }
}
function headers(settings: ProviderSettings, apiKey: string): Record<string,string> {
  return providerDefinition(settings.provider)?.protocol === 'messages' ? { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } : { 'content-type': 'application/json', ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) };
}
export const callModel: ModelClient = async (request) => {
  const { settings, system, messages, tools, signal, onRetry } = request;
  const apiKey = normalizeApiKey(request.apiKey);
  if (!settings.model.trim()) throw new Error('Choose a model in Settings before starting a chat.');
  const protocol = providerDefinition(settings.provider)?.protocol;
  if (!protocol) throw new Error('Unsupported model provider.');
  if (!apiKey && !providerDefinition(settings.provider)?.keyOptional) throw new Error('Connect your model API key in Settings first.');
  const base = validateEndpoint(settings.baseUrl);
  let body: Json; let endpoint: string;
  if (protocol === 'responses') {
    const input = messages.flatMap<unknown>((message) => {
      if (message.role === 'tool') return [{ type: 'function_call_output', call_id: message.callId, output: message.content }, ...(message.image ? [{ role: 'user', content: [{ type: 'input_image', image_url: message.image, detail: 'auto' }] }] : [])];
      if (message.role === 'assistant' && message.rawOutput) return message.rawOutput;
      return [{ role: message.role, content: message.content }];
    });
    body = { model: settings.model, instructions: system, input, store: false, include: ['reasoning.encrypted_content'], tools: tools.map(t => ({ type: 'function', ...t, strict: false })) };
    endpoint = `${base}/responses`;
  } else if (protocol === 'messages') {
    const converted = messages.map(message => message.role === 'tool' ? { role: 'user', content: [{ type: 'tool_result', tool_use_id: message.callId, content: message.image ? [{type:'text',text:message.content},{type:'image',source:{type:'base64',media_type:message.image.startsWith('data:image/jpeg')?'image/jpeg':'image/png',data:message.image.split(',')[1]}}] : message.content }] } : { role: message.role, content: [...(message.content ? [{ type: 'text', text: message.content }] : []), ...(message.calls || []).map(call => ({ type: 'tool_use', id: call.id, name: call.name, input: call.arguments }))] });
    body = { model: settings.model, max_tokens: 8192, system, messages: converted, tools: tools.map(t => ({ name: t.name, description: t.description, input_schema: t.parameters })) };
    endpoint = `${base}/messages`;
  } else {
    const converted = messages.flatMap<unknown>(message => message.role === 'tool' ? [{ role: 'tool', tool_call_id: message.callId, content: message.content }, ...(message.image ? [{ role: 'user', content: [{type:'image_url', image_url:{url:message.image}}] }] : [])] : [{ role: message.role, content: message.content || null, ...(message.calls?.length ? { tool_calls: message.calls.map(call => ({ id: call.id, type: 'function', function: { name: call.name, arguments: JSON.stringify(call.arguments) } })) } : {}) }]);
    body = { model: settings.model, messages: [{ role: 'system', content: system }, ...converted], tools: tools.map(t => ({ type: 'function', function: t })), stream: false };
    endpoint = `${base}/chat/completions`;
  }
  if (!tools.length) delete body.tools;
  const result = await jsonRequest(endpoint, { method: 'POST', headers: headers(settings, apiKey), body: JSON.stringify(body) }, signal, onRetry);
  if (protocol === 'responses') {
    const output: Json[] = result.output || [];
    if (result.status === 'failed' || result.error) throw new Error('The model could not complete this response. Check the provider dashboard.');
    return { text: output.filter(v => v.type === 'message').flatMap(v => v.content || []).filter(v => v.type === 'output_text' || v.type === 'refusal').map(v => v.text || v.refusal || '').join('\n'), calls: output.filter(v => v.type === 'function_call').map(v => ({ id: v.call_id, name: v.name, arguments: argumentsOf(v.arguments) })), inputTokens: result.usage?.input_tokens || 0, outputTokens: result.usage?.output_tokens || 0, rawOutput: output };
  }
  if (protocol === 'messages') return { text: (result.content || []).filter((v:Json)=>v.type==='text').map((v:Json)=>v.text).join('\n'), calls: (result.content || []).filter((v:Json)=>v.type==='tool_use').map((v:Json)=>({id:v.id,name:v.name,arguments:argumentsOf(v.input)})), inputTokens:result.usage?.input_tokens || 0,outputTokens:result.usage?.output_tokens || 0 };
  const message = result.choices?.[0]?.message;
  if (!message) throw new Error('The provider returned no message.');
  return { text: message.content || '', calls: (message.tool_calls || []).map((v:Json)=>({id:v.id,name:v.function.name,arguments:argumentsOf(v.function.arguments)})), inputTokens:result.usage?.prompt_tokens || 0, outputTokens:result.usage?.completion_tokens || 0 };
};
export async function discoverModels(settings: ProviderSettings, apiKey: string): Promise<ModelDiscovery> {
  const definition = providerDefinition(settings.provider);
  if (!definition) throw new Error('Unsupported model provider.');
  apiKey = normalizeApiKey(apiKey);
  if (!apiKey && !definition.keyOptional) throw new Error('Enter your provider API key to load models.');
  const base = validateEndpoint(settings.baseUrl);
  // OpenRouter's account catalog respects this key's provider/privacy preferences.
  const url = new URL(`${base}/models${settings.provider === 'openrouter' ? '/user' : ''}`);
  const signal = AbortSignal.timeout(30_000), models = new Map<string, AvailableModel>(), cursors = new Set<string>();
  let catalog: 'account' | 'public' | undefined;
  if (settings.provider === 'openrouter') {
    let keyInfo: Json;
    try {keyInfo = await jsonRequest(`${base}/key`, {headers: headers(settings, apiKey)}, signal);}
    catch (error) {
      if (error instanceof ProviderHttpError && error.status === 401) throw new Error('OpenRouter rejected this API key (HTTP 401). Copy the full secret key from OpenRouter Keys, or create a new regular API key. A key name or key hash will not work.');
      throw error;
    }
    if (!keyInfo.data || typeof keyInfo.data !== 'object' || Array.isArray(keyInfo.data) || typeof keyInfo.data.is_management_key !== 'boolean') throw new Error('OpenRouter key verification returned an unexpected response. Check the API endpoint.');
    if (keyInfo.data.is_management_key === true || keyInfo.data.is_provisioning_key === true) throw new Error('This is an OpenRouter management key. Create a regular API key for chatting with models.');
    catalog = 'account';
  }
  for (let page = 0; page < 30; page++) {
    let result: Json;
    try {result = await jsonRequest(url.toString(), {headers: headers(settings, apiKey)}, signal);}
    catch (error) {
      // A successful /key check is required before using the public catalog.
      // Some gateways/key scopes cannot expose the account-filtered endpoint.
      if (catalog !== 'account' || page !== 0 || !(error instanceof ProviderHttpError) || ![401, 403, 404, 405, 501].includes(error.status)) {
        if (catalog) throw new Error(`OpenRouter accepted your API key, but loading its model catalog failed. ${error instanceof Error ? error.message : 'Retry model discovery.'}`);
        throw error;
      }
      catalog = 'public'; url.pathname = url.pathname.replace(/\/user$/, '');
      try {result = await jsonRequest(url.toString(), {headers: headers(settings, apiKey)}, signal);}
      catch (failure) {throw new Error(`OpenRouter accepted your API key, but loading its model catalog failed. ${failure instanceof Error ? failure.message : 'Retry model discovery.'}`);}
    }
    const items: Json[] = Array.isArray(result) ? result : Array.isArray(result.data) ? result.data : [];
    if (!Array.isArray(result) && !Array.isArray(result.data)) throw new Error('This endpoint did not return a model catalog. Enter a model ID manually or check the API endpoint.');
    for (const item of items) {
      if (typeof item.id !== 'string' || !item.id.trim() || item.id.length > 240) continue;
      const outputs = item.architecture?.output_modalities;
      if (Array.isArray(outputs) && !outputs.includes('text')) continue;
      if (item.type && !['model', 'chat', 'language', 'text', 'multimodal'].includes(item.type)) continue;
      if (/(^|[\/_-])(embedding|embed|rerank|whisper|tts|dall-e|stable-diffusion|flux)([\/_-]|$)/i.test(item.id)) continue;
      const name = typeof item.name === 'string' ? item.name : typeof item.display_name === 'string' ? item.display_name : item.id;
      const context = item.context_length ?? item.max_input_tokens ?? item.context_window;
      const tools = typeof item.supports_function_calling === 'boolean' ? item.supports_function_calling : Array.isArray(item.supported_parameters) ? item.supported_parameters.includes('tools') : typeof item.capabilities?.tool_use?.supported === 'boolean' ? item.capabilities.tool_use.supported : undefined;
      models.set(item.id, {id: item.id, name: name.slice(0, 240), ...(Number.isFinite(context) && context > 0 ? {contextLength: context} : {}), ...(tools !== undefined ? {tools} : {})});
    }
    if (models.size > 5000) throw new Error('The model catalog is too large. Narrow it at your provider or enter a model ID manually.');
    if (!Array.isArray(result) && catalog && typeof result.total_count === 'number' && models.size < result.total_count && Array.isArray(result.data) && result.data.length) {
      // OpenRouter uses offsets; ignore filtered-out entries when advancing.
      const offset = Number(url.searchParams.get('offset') || 0) + result.data.length;
      if (offset < result.total_count) {if (page === 29) throw new Error('The provider returned an incomplete model catalog. Retry or enter a model ID manually.'); url.searchParams.set('offset', String(offset)); continue;}
    }
    if (Array.isArray(result) || !result.has_more) break;
    const cursor = result.last_id ?? items.at(-1)?.id;
    if (typeof cursor !== 'string' || cursors.has(cursor) || page === 29) throw new Error('The provider returned an incomplete model catalog. Retry or enter a model ID manually.');
    cursors.add(cursor); url.searchParams.set(definition.protocol === 'messages' ? 'after_id' : 'after', cursor);
  }
  if (!models.size) throw new Error('No chat models were returned. Check your account access or enter a model ID manually.');
  const message = catalog === 'public' ? 'OpenRouter accepted your API key. Its account-filtered catalog is unavailable, so this is the public model catalog. Model access and billing are checked when you send a message.' : catalog === 'account' ? 'OpenRouter accepted your API key. Models loaded from your account catalog. Model access and billing are checked when you send a message.' : 'Models loaded from your provider. Availability and billing are confirmed when you send a message.';
  return {models: [...models.values()].sort((a, b) => Number(b.tools === true) - Number(a.tools === true) || a.name.localeCompare(b.name)), message, ...(catalog ? {keyVerified: true, catalog} : {})};
}
export async function testProvider(settings: ProviderSettings, apiKey: string) {
  const result = await discoverModels(settings, apiKey);
  return {ok: true, message: result.message, models: result.models.map(model => model.id)};
}
