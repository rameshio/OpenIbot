import {useEffect, useRef, useState} from 'react';
import {Check, ChevronDown, LoaderCircle, Plus, Search} from 'lucide-react';
import type {AppSettings, DesktopAPI} from '../shared/types';
import {providerName} from '../shared/providers';
import {errorText} from './Dialogs';

export function ModelSwitcher({settings, invoke, onManage, onError}: {settings: AppSettings; invoke: DesktopAPI['invoke']; onManage: () => void; onError: (error: string) => void}) {
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus();
    const close = (event: MouseEvent) => {if (!ref.current?.contains(event.target as Node)) setOpen(false);};
    const key = (event: KeyboardEvent) => {if (event.key === 'Escape') {setOpen(false); trigger.current?.focus();}};
    document.addEventListener('mousedown', close); document.addEventListener('keydown', key);
    return () => {document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key);};
  }, [open]);
  async function activate(id: string, model: string) {
    setBusy(true);
    try {await invoke('provider.activate', {id, model}); setOpen(false); trigger.current?.focus();} catch (cause) {onError(errorText(cause));} finally {setBusy(false);}
  }
  const connections = settings.connections.map(connection => {
    const choices = [{id: connection.model, name: connection.models.find(model => model.id === connection.model)?.name ?? connection.model}, ...connection.models.filter(model => model.id !== connection.model)];
    const terms = search.toLowerCase();
    return {connection, choices: choices.filter(model => `${connection.name} ${providerName(connection.provider)} ${model.name} ${model.id}`.toLowerCase().includes(terms))};
  }).filter(item => item.choices.length);
  return <div className="model-switcher" ref={ref}><button ref={trigger} className="model-button" aria-haspopup={settings.connections.length ? 'dialog' : undefined} aria-expanded={open} onClick={() => {if (!settings.connections.length) onManage(); else {setSearch(''); setOpen(!open);}}} title={settings.provider.model ? providerName(settings.provider.provider) + ' · ' + settings.provider.model : undefined}>{settings.provider.model || 'Connect a model'}<ChevronDown size={13}/></button>
    {open && <div className="model-switcher-popover" role="dialog" aria-label="Choose a model"><header><strong>Your models</strong>{busy && <LoaderCircle className="spin" size={15}/>}</header><div className="provider-search"><Search size={15}/><input ref={searchInput} aria-label="Search saved models" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a provider or model"/></div><div className="model-switcher-list">{connections.map(({connection, choices}) => <section key={connection.id}><h4>{connection.name}<span>{providerName(connection.provider)}</span></h4>{choices.slice(0, search ? 60 : 5).map(model => <button key={model.id} disabled={busy} onClick={() => void activate(connection.id, model.id)} aria-label={'Use ' + model.id + ' from ' + connection.name} className={connection.id === settings.activeConnectionId && model.id === settings.provider.model ? 'selected' : ''}><span>{model.name}<small>{model.id !== model.name ? model.id : ''}</small></span>{connection.id === settings.activeConnectionId && model.id === settings.provider.model && <Check size={15}/>}</button>)}{choices.length > (search ? 60 : 5) && <small className="model-switcher-more">Search to see more models</small>}</section>)}{!connections.length && <p className="panels-muted">No matching models.</p>}</div><footer><button onClick={() => {setOpen(false); onManage();}}><Plus size={15}/>Manage providers</button></footer><small className="model-switcher-note">Changes apply to your next run.</small></div>}
  </div>;
}
