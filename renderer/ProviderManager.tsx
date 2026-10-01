import {useState} from 'react';
import {Check, ChevronRight, KeyRound, LoaderCircle, Pencil, Plus, RefreshCw, Search, Trash2, X} from 'lucide-react';
import type {AppSettings, AvailableModel, DesktopAPI, ModelDiscovery, ProviderConnection} from '../shared/types';
import {providerCatalog, providerDefinition, providerName} from '../shared/providers';
import {errorText} from './Dialogs';

export function ProviderManager({settings, invoke}: {settings: AppSettings; invoke: DesktopAPI['invoke']}) {
  const [editing, setEditing] = useState<string | null>(settings.connections.length ? null : 'new');
  const [provider, setProvider] = useState('openrouter');
  const [baseUrl, setBaseUrl] = useState(providerDefinition('openrouter')!.baseUrl);
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [model, setModel] = useState('');
  const [discoveryId, setDiscoveryId] = useState<string>();
  const [modelSearch, setModelSearch] = useState('');
  const [manual, setManual] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState('');
  const [keyVerified, setKeyVerified] = useState(false);
  const [catalog, setCatalog] = useState<ModelDiscovery['catalog']>();
  const definition = providerDefinition(provider)!;
  const previous = settings.connections.find(item => item.id === editing);
  const savedKey = !!previous?.hasKey && previous.provider === provider && previous.baseUrl.replace(/\/$/, '') === baseUrl.trim().replace(/\/$/, '');
  const canConnect = !!baseUrl.trim() && (!!apiKey.trim() || savedKey || definition.keyOptional);
  const matching = models.filter(item => `${item.id} ${item.name}`.toLowerCase().includes(modelSearch.toLowerCase()));
  const visibleModels = matching.slice(0, 150);
  const selected = models.find(item => item.id === model);
  function invalidate() {setModels([]); setModel(''); setDiscoveryId(undefined); setMessage(''); setError(''); setModelSearch(''); setKeyVerified(false); setCatalog(undefined);}
  function edit(connection?: ProviderConnection) {
    setEditing(connection?.id ?? 'new'); setProvider(connection?.provider ?? 'openrouter');
    setBaseUrl(connection?.baseUrl ?? providerDefinition('openrouter')!.baseUrl); setName(connection?.name ?? '');
    setApiKey(''); setModels(connection?.models ?? []); setModel(connection?.model ?? '');
    setManual(!!connection && !connection.models.some(item => item.id === connection.model));
    setDiscoveryId(undefined); setModelSearch(''); setError(''); setMessage(''); setRemoving('');
    setKeyVerified(false); setCatalog(undefined);
  }
  async function perform(id: string, action: () => Promise<void>) {
    setBusy(id); setError(''); setMessage('');
    try {await action();} catch (cause) {setError(errorText(cause));} finally {setBusy('');}
  }
  async function load() {
    setKeyVerified(false); setCatalog(undefined);
    await perform('load', async () => {
      const result = await invoke<ModelDiscovery>('provider.discover', {provider, baseUrl: baseUrl.trim(), ...(previous ? {id: previous.id} : {}), apiKey});
      setModels(result.models); setDiscoveryId(result.discoveryId); setManual(false); setModelSearch('');
      setModel(result.models.some(item => item.id === model) ? model : ''); setMessage(result.message);
      setKeyVerified(result.keyVerified === true); setCatalog(result.catalog);
    });
  }
  async function save() {
    await perform('save', async () => {
      await invoke('provider.save', {provider, name, baseUrl: baseUrl.trim(), model: model.trim(), apiKey, discoveryId, ...(previous ? {id: previous.id} : {newConnection: true})});
      setApiKey(''); setEditing(null); setMessage('Connection saved. Your bots will use it for their next run.');
    });
  }
  return <div className="provider-manager">
    <div className="provider-section-heading"><div><h3>Your connections</h3><p>Keep your providers together. Switch whenever you need.</p></div><button className="panels-button" disabled={!!busy} onClick={() => edit()}><Plus size={15}/>Add provider</button></div>
    {!!settings.connections.length && <div className="provider-connections">{settings.connections.map(connection => <article key={connection.id} className={'provider-connection ' + (connection.id === settings.activeConnectionId ? 'is-active' : '')}>
      <span className="provider-monogram" aria-hidden="true">{providerName(connection.provider).slice(0, 1)}</span><div className="provider-connection-copy"><strong>{connection.name}</strong><span>{providerName(connection.provider)}</span><small title={connection.model}>{connection.model}</small></div>
      <div className="provider-connection-actions">{connection.id === settings.activeConnectionId ? <span className="provider-active"><Check size={12}/>In use</span> : <button className="panels-button" disabled={!!busy} onClick={() => void perform(connection.id, async () => {await invoke('provider.activate', {id: connection.id}); setMessage('Switched to ' + connection.name + '.');})}>Use</button>}<button className="panels-icon" aria-label={'Edit ' + connection.name} disabled={!!busy} onClick={() => edit(connection)}><Pencil size={14}/></button><button className="panels-icon" aria-label={'Remove ' + connection.name} disabled={!!busy} onClick={() => setRemoving(connection.id)}><Trash2 size={14}/></button></div>
      {removing === connection.id && <div className="provider-remove"><p>Remove this connection and its saved key?</p><button className="panels-button" disabled={!!busy} onClick={() => setRemoving('')}>Keep</button><button className="panels-button" disabled={!!busy} onClick={() => void perform('remove', async () => {await invoke('provider.delete', {id: connection.id}); if (editing === connection.id) setEditing(null); setRemoving(''); setMessage('Connection removed.');})}>Remove connection</button></div>}
    </article>)}</div>}
    {error && !editing && <div className="panels-notice panels-error" role="alert">{error}</div>}
    {message && <div className="panels-notice panels-success" role="status"><Check size={16}/>{message}</div>}
    {editing && <form className="provider-editor" onSubmit={event => {event.preventDefault(); void save();}}>
      <header><div><span className="provider-eyebrow">{previous ? 'EDIT CONNECTION' : 'NEW CONNECTION'}</span><h3>A model for your next idea.</h3></div>{!!settings.connections.length && <button type="button" className="panels-icon" aria-label="Cancel connection edit" disabled={!!busy} onClick={() => {setEditing(null); setApiKey('');}}><X size={18}/></button>}</header>
      <fieldset disabled={!!busy}><legend><span>1</span>Choose a provider</legend><div className="provider-fields"><label>Provider<select aria-label="Provider" value={provider} onChange={event => {const next = providerDefinition(event.target.value)!; setProvider(next.id); setBaseUrl(next.baseUrl); setApiKey(''); setManual(false); invalidate();}}>{['Direct APIs', 'Model gateways', 'Local & custom'].map(group => <optgroup label={group} key={group}>{providerCatalog.filter(item => item.group === group).map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</optgroup>)}</select></label><label><span>Connection name <small>· Optional</small></span><input aria-label="Connection name" value={name} maxLength={80} onChange={event => setName(event.target.value)} placeholder={definition.name}/></label></div></fieldset>
      <fieldset disabled={!!busy}><legend><span>2</span>Connect your account</legend><label>API key {savedKey && !apiKey.trim() && <span className="provider-key-saved"><Check size={12}/>Saved</span>}<input aria-label="API key" type="password" value={apiKey} onChange={event => {setApiKey(event.target.value); invalidate();}} autoComplete="off" spellCheck={false} placeholder={savedKey ? 'Leave blank to keep your saved key' : definition.keyOptional ? 'Optional if your server does not require a key' : 'Paste your provider API key'}/></label>{error && <div className="panels-notice panels-error provider-inline-error" role="alert">{error}</div>}{provider === 'openrouter' && <div className="provider-key-help"><small>Use the full secret key from OpenRouter, rather than its name or hash.</small><button type="button" className="provider-text-button" disabled={!!busy} onClick={() => void perform('keys', async () => {await invoke('external.open', {url: 'https://openrouter.ai/settings/keys'});})}>Open OpenRouter Keys<ChevronRight size={13}/></button></div>}{keyVerified && <div className="provider-key-status" role="status" aria-label="Key accepted"><Check size={13}/>Key accepted<span>{catalog === 'public' ? 'Public model catalog' : 'Account model catalog'}</span></div>}<details className="provider-endpoint" open={provider === 'compatible'}><summary>API endpoint</summary><label><span className="sr-only">API endpoint</span><input aria-label="API endpoint" type="url" required value={baseUrl} onChange={event => {setBaseUrl(event.target.value); invalidate();}} spellCheck={false}/></label></details><div className="provider-load-row"><small><KeyRound size={13}/>Keys are stored encrypted on this computer.</small><button type="button" className="panels-button panels-primary" disabled={!canConnect || !!busy} onClick={() => void load()}>{busy === 'load' ? <LoaderCircle size={15} className="spin"/> : <RefreshCw size={15}/>}Load models</button></div></fieldset>
      <fieldset disabled={!!busy}><legend><span>3</span>Choose your model</legend>{!!models.length && !manual ? <><div className="provider-search"><Search size={15}/><input aria-label="Search models" value={modelSearch} onChange={event => setModelSearch(event.target.value)} placeholder={`Search ${models.length} available models`}/></div><select className="provider-model-list" aria-label="Available models" size={6} value={model} onChange={event => setModel(event.target.value)}><option value="" disabled>Choose a model</option>{model && !visibleModels.some(item => item.id === model) && <option value={model}>{selected?.name ?? model} · Selected</option>}{visibleModels.map(item => <option key={item.id} value={item.id}>{item.name}{item.tools === true ? ' · Tools' : item.tools === false ? ' · Chat only' : ''}</option>)}</select><div className="provider-model-meta"><span>{matching.length} model{matching.length === 1 ? '' : 's'}{matching.length > 150 ? ' · Showing 150; search to narrow' : ''}</span>{selected?.contextLength && <span>{Math.round(selected.contextLength / 1000).toLocaleString()}k context</span>}</div>{selected && <small className="provider-model-id">{selected.id}</small>}</> : manual ? <label>Model ID<input aria-label="Model ID" required value={model} maxLength={240} onChange={event => setModel(event.target.value)} placeholder="Enter the exact model ID" spellCheck={false} autoComplete="off"/><small>Manual models have not been checked against the provider catalog.</small></label> : <div className="provider-model-empty"><Search size={19}/><p>Load your provider’s models, then choose one here.</p></div>}
      <button type="button" className="provider-text-button" onClick={() => {setManual(!manual); setModel('');}}>{manual ? 'Choose from the model list' : 'Enter a model ID manually'}<ChevronRight size={13}/></button><small className="provider-model-help">{selected?.tools === false ? 'This model reports no tool support. Choose a model with tools for bot actions.' : 'Choose a model with tool calling for browser, terminal, and team work.'}{definition.hint && ' ' + definition.hint}</small></fieldset>
      <footer><span>Use this connection for new runs.</span><button className="panels-button panels-primary" disabled={!!busy || !canConnect || !model.trim()}>{busy === 'save' ? 'Saving…' : 'Save & use connection'}<ChevronRight size={15}/></button></footer>
    </form>}
    <p className="provider-footnote">{providerCatalog.length} provider presets, plus editable endpoints. Your provider manages model access, usage charges, and limits. Refresh models when its catalog changes.</p>
  </div>;
}
