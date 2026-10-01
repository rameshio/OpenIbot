import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {callModel, discoverModels, normalizeApiKey, validateEndpoint} from '../desktop/providers';
import {createEngine, type EngineOptions} from '../desktop/engine';
import {initialState, Store} from '../desktop/store';
import {providerCatalog} from '../shared/providers';
import type {Chat, ModelDiscovery, ProviderConnection, RuntimeService} from '../shared/types';

async function server(t: test.TestContext, handler: (request: IncomingMessage, response: ServerResponse)=>void) {
  const instance = createServer(handler); await new Promise<void>(resolve => instance.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => {instance.close(() => resolve()); instance.closeAllConnections();}));
  return `http://127.0.0.1:${(instance.address() as {port: number}).port}/v1`;
}
const json = (response: ServerResponse, data: unknown, status = 200) => {response.writeHead(status, {'content-type': 'application/json'}); response.end(JSON.stringify(data));};
async function setup() {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ibot-providers-'));
  const options: EngineOptions = {dataDir, runtime: {} as RuntimeService, emit: () => {}, scheduler: false, encrypt: value => Buffer.from(value).toString('hex'), decrypt: value => Buffer.from(value, 'hex').toString()};
  return {options, engine: createEngine(options)};
}

test('catalog covers NVIDIA, OpenRouter, native APIs and local servers with unique valid endpoints', () => {
  assert.equal(new Set(providerCatalog.map(item => item.id)).size, providerCatalog.length);
  assert(providerCatalog.length >= 40);
  for (const item of providerCatalog) assert.equal(validateEndpoint(item.baseUrl), item.baseUrl);
  for (const id of ['nvidia', 'openrouter', 'anthropic', 'gemini', 'ollama', 'compatible']) assert(providerCatalog.some(item => item.id === id));
});

test('model discovery runs before choosing a model, normalizes metadata and follows Anthropic pagination', async t => {
  const requests: {url: string; key?: string}[] = [];
  const baseUrl = await server(t, (request, response) => {
    requests.push({url: request.url!, key: request.headers['x-api-key'] as string});
    if (!request.url?.includes('after_id')) json(response, {data: [{id: 'claude-a', display_name: 'Claude A', max_input_tokens: 100000, capabilities: {tool_use: {supported: true}}}], has_more: true, last_id: 'claude-a'});
    else json(response, {data: [{id: 'claude-b', display_name: 'Claude B'}], has_more: false});
  });
  const result = await discoverModels({provider: 'anthropic', model: '', baseUrl, hasKey: false}, 'anthropic-test-only');
  assert.deepEqual(result.models.map(item => item.id), ['claude-a', 'claude-b']);
  assert.equal(result.models[0].contextLength, 100000); assert.equal(result.models[0].tools, true);
  assert(requests[1].url.includes('after_id=claude-a')); assert(requests.every(item => item.key === 'anthropic-test-only'));
});

test('OpenRouter uses account-filtered discovery and excludes image/embedding catalogs', async t => {
  const baseUrl = await server(t, (request, response) => {
    if (request.url === '/v1/key') {assert.equal(request.headers.authorization, 'Bearer router-test-only'); json(response, {data: {is_management_key: false, label: 'secret-that-must-not-reach-ui'}}); return;}
    assert.equal(request.url, '/v1/models/user'); assert.equal(request.headers.authorization, 'Bearer router-test-only');
    json(response, {data: [{id: 'maker/agent', name: 'Agent', context_length: 128000, supported_parameters: ['tools'], architecture: {output_modalities: ['text']}}, {id: 'maker/image', architecture: {output_modalities: ['image']}}, {id: 'maker/embedding-large'}, {id: 'maker/chat', supported_parameters: []}]});
  });
  const result = await discoverModels({provider: 'openrouter', model: '', baseUrl, hasKey: true}, 'router-test-only');
  assert.deepEqual(result.models.map(item => item.id), ['maker/agent', 'maker/chat']); assert.equal(result.models[1].tools, false);
  assert.equal(result.keyVerified, true); assert.equal(result.catalog, 'account'); assert(!JSON.stringify(result).includes('secret-that-must-not-reach-ui'));
});

test('API key paste wrappers are normalized without leaking credentials', () => {
  const secret = 'sk-or-v1-fixture-only';
  for (const value of [secret, `  ${secret}\n`, `"${secret}"`, `'${secret}'`, `Bearer ${secret}`, `OPENROUTER_API_KEY="${secret}"`, `export OPENROUTER_API_KEY='Bearer ${secret}'`]) assert.equal(normalizeApiKey(value), secret);
  for (const value of ['Authorization: Bearer fixture', 'fixture key', 'fixture\nkey', 'fixture\0key']) assert.throws(() => normalizeApiKey(value), error => {assert(error instanceof Error); assert(!error.message.includes(value)); return true;});
});

test('an OpenRouter key-check 401 stops discovery and cannot become public-catalog success', async t => {
  const calls: string[] = [], secret = 'sk-or-v1-rejected-fixture';
  const baseUrl = await server(t, (request, response) => {calls.push(request.url!); json(response, {error: {message: secret, type: secret}}, 401);});
  await assert.rejects(discoverModels({provider: 'openrouter', model: '', baseUrl, hasKey: false}, secret), error => {
    assert(error instanceof Error); assert(error.message.includes('OpenRouter rejected this API key (HTTP 401)')); assert(error.message.includes('key hash')); assert(!error.message.includes(secret)); return true;
  });
  assert.deepEqual(calls, ['/v1/key']);
});

test('a verified OpenRouter key can use an explicitly labeled public catalog when account discovery is unavailable', async t => {
  for (const status of [401, 403, 404, 405, 501]) {
    const calls: string[] = [];
    const baseUrl = await server(t, (request, response) => {
      calls.push(request.url!); assert.equal(request.headers.authorization, 'Bearer verified-fixture');
      if (request.url === '/v1/key') json(response, {data: {is_management_key: false, label: 'sensitive-label'}});
      else if (request.url === '/v1/models/user') json(response, {error: {message: 'filtered catalog unavailable'}}, status);
      else json(response, {data: [{id: 'public-model'}]});
    });
    const result = await discoverModels({provider: 'openrouter', model: '', baseUrl, hasKey: false}, 'Bearer verified-fixture');
    assert.deepEqual(calls, ['/v1/key', '/v1/models/user', '/v1/models']); assert.equal(result.catalog, 'public'); assert.equal(result.keyVerified, true);
    assert(result.message.includes('public model catalog')); assert(!JSON.stringify(result).includes('sensitive-label'));
  }
});

test('OpenRouter management credentials and unexpected key-check responses are not accepted as model keys', async t => {
  for (const data of [{is_management_key: true}, {is_management_key: false, is_provisioning_key: true}, {}, [{id: 'wrong-endpoint'}]]) {
    const calls: string[] = [];
    const baseUrl = await server(t, (request, response) => {calls.push(request.url!); json(response, {data});});
    await assert.rejects(discoverModels({provider: 'openrouter', model: '', baseUrl, hasKey: false}, 'fixture-key'), /management key|unexpected response/);
    assert.deepEqual(calls, ['/v1/key']);
  }
});

test('OpenRouter model catalogs advance offsets without returning key metadata', async t => {
  const calls: string[] = [];
  const baseUrl = await server(t, (request, response) => {
    calls.push(request.url!);
    if (request.url === '/v1/key') json(response, {data: {is_management_key: false}});
    else if (request.url?.includes('offset=1')) json(response, {data: [{id: 'second-model'}], total_count: 2});
    else json(response, {data: [{id: 'first-model'}], total_count: 2});
  });
  const result = await discoverModels({provider: 'openrouter', model: '', baseUrl, hasKey: true}, 'fixture-key');
  assert.equal(result.models.length, 2); assert.deepEqual(calls, ['/v1/key', '/v1/models/user', '/v1/models/user?offset=1']);
});

test('a failed catalog after OpenRouter accepts the key reports the failing stage accurately', async t => {
  const baseUrl = await server(t, (request, response) => {
    if (request.url === '/v1/key') json(response, {data: {is_management_key: false}});
    else json(response, {error: {message: 'must-not-display-provider-body'}}, 400);
  });
  await assert.rejects(discoverModels({provider: 'openrouter', model: '', baseUrl, hasKey: true}, 'fixture-key'), error => {assert(error instanceof Error); assert(error.message.includes('OpenRouter accepted your API key, but loading its model catalog failed')); assert(error.message.includes('400')); assert(!error.message.includes('must-not-display-provider-body')); return true;});
});

test('discovery rejects authentication failures, redirects and empty catalogs without echoing credentials', async t => {
  let redirected = 0;
  const target = await server(t, (_request, response) => {redirected++; json(response, {data: [{id: 'never'}]});});
  const baseUrl = await server(t, (request, response) => {
    if (request.url?.startsWith('/v1/redirect')) {response.writeHead(302, {location: target + '/models'}); response.end();}
    else if (request.url?.startsWith('/v1/empty')) json(response, {data: []});
    else json(response, {error: {message: 'private-test-secret-123', type: 'private-test-secret-123'}}, 401);
  });
  const settings = {provider: 'compatible', model: '', baseUrl, hasKey: true};
  await assert.rejects(discoverModels(settings, 'private-test-secret-123'), error => {assert(error instanceof Error); assert(error.message.includes('401')); assert(!error.message.includes('private-test-secret-123')); return true;});
  await assert.rejects(discoverModels({...settings, baseUrl: baseUrl + '/redirect'}, 'private-test-secret-123'), /Redirects/); assert.equal(redirected, 0);
  await assert.rejects(discoverModels({...settings, baseUrl: baseUrl + '/empty'}, ''), /No chat models/);
});

test('profiles keep independent encrypted keys, reuse keys only for the same endpoint, switch and persist', async t => {
  const {engine, options} = await setup(); t.after(() => engine.shutdown());
  const requests: string[] = [];
  const baseUrl = await server(t, (request, response) => {requests.push(request.headers.authorization || ''); json(response, {data: [{id: 'model-a'}, {id: 'model-b'}]});});
  const firstDiscovery = await engine.invoke('provider.discover', {provider: 'nvidia', baseUrl, apiKey: 'nvidia-private-test'}) as ModelDiscovery;
  assert.equal(engine.getState().settings.connections.length, 0, 'Discovery does not save a key or change the active provider');
  const first = await engine.invoke('provider.save', {provider: 'nvidia', baseUrl, apiKey: 'nvidia-private-test', model: 'model-a', discoveryId: firstDiscovery.discoveryId, newConnection: true}) as ProviderConnection;
  const second = await engine.invoke('provider.save', {provider: 'openrouter', model: 'maker/agent', apiKey: 'router-private-test', newConnection: true}) as ProviderConnection;
  await engine.invoke('provider.activate', {id: first.id, model: 'model-b'});
  await engine.invoke('provider.discover', {id: first.id}); assert.equal(requests.at(-1), 'Bearer nvidia-private-test');
  const before = engine.getState();
  await assert.rejects(engine.invoke('provider.discover', {id: first.id, baseUrl: baseUrl + '/other'}), /Enter your provider API key/);
  assert.deepEqual(engine.getState(), before, 'Failed discovery leaves saved profiles untouched');
  await assert.rejects(engine.invoke('provider.save', {id: first.id, baseUrl: baseUrl + '/other', model: 'model-a'}), /Enter an API key/);
  assert.deepEqual(engine.getState(), before);
  const serialized = JSON.stringify(engine.getState()), stored = await readFile(path.join(options.dataDir, 'state.json'), 'utf8');
  for (const key of ['nvidia-private-test', 'router-private-test']) {assert(!serialized.includes(key)); assert(!stored.includes(key));}
  await engine.shutdown(); const restored = createEngine(options); t.after(() => restored.shutdown());
  assert.equal(restored.getState().settings.connections.length, 2); assert.equal(restored.getState().settings.provider.model, 'model-b');
  await restored.invoke('provider.activate', {id: second.id}); assert.equal(restored.getState().settings.provider.provider, 'openrouter');
  await restored.invoke('provider.delete', {id: second.id}); assert.equal(restored.getState().settings.activeConnectionId, first.id);
  await restored.invoke('provider.delete', {id: first.id}); assert.equal(restored.getState().settings.provider.model, ''); assert.deepEqual(JSON.parse(await readFile(path.join(options.dataDir, 'state.json'), 'utf8')).secrets, {});
});

test('a discovery token cannot be reused with a different key or endpoint', async t => {
  const {engine} = await setup(); t.after(() => engine.shutdown());
  const baseUrl = await server(t, (_request, response) => json(response, {data: [{id: 'model-a'}]}));
  const discovery = await engine.invoke('provider.discover', {provider: 'compatible', baseUrl, apiKey: 'first-key-test'}) as ModelDiscovery;
  await assert.rejects(engine.invoke('provider.save', {provider: 'compatible', baseUrl, apiKey: 'different-key-test', model: 'model-a', discoveryId: discovery.discoveryId}), /Load models again/);
  assert.equal(engine.getState().settings.connections.length, 0);
});

test('older single-provider profiles migrate without decrypting or losing conversations', async () => {
  const {options} = await setup(), state = initialState();
  state.settings.provider = {provider: 'openai', model: 'legacy-model', baseUrl: 'https://api.openai.com/v1', hasKey: true};
  delete (state.settings as Partial<typeof state.settings>).connections;
  state.chats.push({id: 'saved-chat', title: 'Keep this', botIds: ['chief'], status: 'idle', createdAt: '', updatedAt: ''});
  const ciphertext = options.encrypt('legacy-test-key'); await writeFile(path.join(options.dataDir, 'state.json'), JSON.stringify({state, secrets: {provider: ciphertext}, routineSlots: {}}));
  const store = new Store(options.dataDir), id = store.data.state.settings.activeConnectionId!;
  assert.equal(store.data.state.settings.connections.length, 1); assert.equal(store.data.secrets['provider:' + id], ciphertext); assert(!store.data.secrets.provider); assert.equal(store.data.state.chats[0].id, 'saved-chat');
});

test('all request protocols reach the selected endpoint with the right authentication and tools', async t => {
  const requests: {url: string; auth?: string; key?: string; body: any}[] = [];
  const baseUrl = await server(t, (request, response) => {
    let raw = ''; request.on('data', data => raw += data); request.on('end', () => {
      requests.push({url: request.url!, auth: request.headers.authorization, key: request.headers['x-api-key'] as string, body: JSON.parse(raw)});
      if (request.url === '/v1/responses') json(response, {output: [{type: 'message', content: [{type: 'output_text', text: 'Responses works'}]}]});
      else if (request.url === '/v1/messages') json(response, {content: [{type: 'text', text: 'Messages works'}]});
      else json(response, {choices: [{message: {content: 'Chat works'}}]});
    });
  });
  for (const provider of ['openai', 'anthropic', 'nvidia', 'gemini', 'minimax']) {
    const result = await callModel({settings: {provider, model: 'test-model', baseUrl, hasKey: true}, apiKey: 'adapter-test', system: 'Test system', messages: [{role: 'user', content: 'Hello'}], tools: [{name: 'test_tool', description: 'Testing', parameters: {type: 'object'}}], signal: new AbortController().signal});
    assert(result.text.endsWith('works'));
    const request = requests.at(-1)!; assert.equal(request.body.model, 'test-model'); assert.equal(request.body.tools.length, 1);
    if (['anthropic', 'minimax'].includes(provider)) {assert.equal(request.key, 'adapter-test'); assert.equal(request.url, '/v1/messages');} else {assert.equal(request.auth, 'Bearer adapter-test'); assert.equal(request.url, provider === 'openai' ? '/v1/responses' : '/v1/chat/completions');}
  }
});

test('switching providers while a run is active leaves the run on its original key and model', async t => {
  const {engine, options} = await setup(); await engine.shutdown();
  let release!: () => void; const wait = new Promise<void>(resolve => release = resolve), seen: {provider: string; key: string; model: string}[] = [];
  const running = createEngine({...options, modelClient: async request => {seen.push({provider: request.settings.provider, key: request.apiKey, model: request.settings.model}); await wait; return {text: 'Done', calls: [], inputTokens: 1, outputTokens: 1};}}); t.after(() => running.shutdown());
  const first = await running.invoke('provider.save', {provider: 'nvidia', model: 'first-model', apiKey: 'first-run-key'}) as ProviderConnection;
  const second = await running.invoke('provider.save', {provider: 'openrouter', model: 'second-model', apiKey: 'second-run-key', newConnection: true}) as ProviderConnection;
  await running.invoke('provider.activate', {id: first.id}); const chat = await running.invoke('chat.create', {botIds: ['chief']}) as Chat;
  await running.invoke('chat.send', {chatId: chat.id, content: 'Hello'}); await running.invoke('provider.activate', {id: second.id}); release();
  for (let i = 0; i < 50 && running.getState().chats[0].status === 'running'; i++) await new Promise(resolve => setTimeout(resolve, 10));
  assert.deepEqual(seen, [{provider: 'nvidia', model: 'first-model', key: 'first-run-key'}]); assert.equal(running.getState().settings.provider.provider, 'openrouter');
  assert.equal(running.getState().usage[0].provider, 'nvidia');
});
