import {useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {BarChart3, Check, Cpu, Download, FolderOpen, LoaderCircle, Monitor, Plus, RefreshCw, Settings as SettingsIcon, ShieldCheck, Trash2, X} from 'lucide-react';
import type {ActionRule, AppSettings, AppState, DesktopAPI, RuntimeStatus, WorkspaceInfo} from '../shared/types';
import {Avatar} from './Avatar';
import {errorText} from './Dialogs';
import {ConnectorToolClasses} from './ConnectorToolClasses';
import {ProviderManager} from './ProviderManager';

type Section = 'connectors' | 'general' | 'models' | 'computers' | 'usage' | 'updates';
type Invoke = DesktopAPI['invoke'];
interface Props {state: AppState; onClose: () => void; invoke: Invoke; runtime: RuntimeStatus | null; onRefreshRuntime: () => void; initialSection?: Section;}
const sections = [{id: 'connectors', label: 'Connectors', Icon: ShieldCheck}, {id: 'general', label: 'General', Icon: SettingsIcon}, {id: 'models', label: 'Models', Icon: Cpu}, {id: 'computers', label: 'Computers', Icon: Monitor}, {id: 'usage', label: 'Usage', Icon: BarChart3}, {id: 'updates', label: 'Updates', Icon: Download}] as const;

export function PanelDialog({title, onClose, children, className = ''}: {title: string; onClose: () => void; children: ReactNode; className?: string}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const prior = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, input, select')?.focus();
    const key = (event: KeyboardEvent) => {
      if (ref.current?.querySelector('[role="dialog"]')) return;
      const editor = ref.current?.querySelector<HTMLElement>('.market-form-overlay');
      if (event.key === 'Escape' && editor) {event.preventDefault(); editor.querySelector<HTMLButtonElement>('header button')?.click(); return;}
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const nodes = Array.from((editor ?? ref.current)?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]') ?? []).filter(node => node.offsetParent !== null);
      const first = nodes[0], last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last?.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first?.focus();}
    };
    document.addEventListener('keydown', key);
    return () => {document.removeEventListener('keydown', key); prior?.focus();};
  }, []);
  return <div className="panels-backdrop" onMouseDown={event => {if (event.target === event.currentTarget) onClose();}}><div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={'panels-dialog ' + className}><button className="panels-close" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose}><X size={20}/></button>{children}</div></div>;
}

export function PanelNotice({error, message}: {error?: string; message?: string}) {return error ? <div className="panels-notice panels-error" role="alert">{error}</div> : message ? <div className="panels-notice panels-success" role="status"><Check size={16}/>{message}</div> : null;}
function Toggle({label, checked, onChange, disabled}: {label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean}) {return <button type="button" role="switch" aria-label={label} aria-checked={checked} className="panels-toggle" onClick={() => onChange(!checked)} disabled={disabled}><span/></button>;}
function Row({label, description, children}: {label: string; description?: string; children: ReactNode}) {return <div className="settings-row"><div><strong>{label}</strong>{description && <p>{description}</p>}</div>{children}</div>;}

export function Settings({state, onClose, invoke, runtime, onRefreshRuntime, initialSection = 'general'}: Props) {
  const [section, setSection] = useState<Section>(initialSection);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [zone, setZone] = useState(state.settings.timezone);
  const [ruleAction, setRuleAction] = useState('');
  const [rulePolicy, setRulePolicy] = useState<ActionRule['policy']>('ask');
  const [workspaces, setWorkspaces] = useState<Record<string, WorkspaceInfo>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [appInfo, setAppInfo] = useState<{version: string; dataDir: string; packaged: boolean} | null>(null);
  const settings = state.settings;
  const usage = state.usage;
  const inputTokens = usage.reduce((sum, record) => sum + record.inputTokens, 0);
  const outputTokens = usage.reduce((sum, record) => sum + record.outputTokens, 0);
  useEffect(() => {setSection(initialSection);}, [initialSection]);
  useEffect(() => {void invoke<{version: string; dataDir: string; packaged: boolean}>('app.info').then(setAppInfo).catch(() => {});}, [invoke]);
  useEffect(() => {return window.ibot.onRuntimeLog(line => setLogs(old => [...old, line].slice(-80)));}, []);
  useEffect(() => {
    if (section !== 'computers') return;
    let live = true;
    const inspect = async () => {
      const results = await Promise.all(state.bots.map(async bot => {
        try {return await invoke<WorkspaceInfo>('workspace.inspect', {botId: bot.id});}
        catch (cause) {return {botId: bot.id, status: 'error', error: errorText(cause)} as WorkspaceInfo;}
      }));
      if (live) setWorkspaces(Object.fromEntries(results.map(item => [item.botId, item])));
    };
    void inspect(); const interval = setInterval(() => void inspect(), 10000);
    return () => {live = false; clearInterval(interval);};
  }, [section, state.bots.length, invoke]);
  async function perform(id: string, action: () => Promise<unknown>, success?: string) {
    setBusy(id); setError(''); setMessage('');
    try {await action(); if (success) setMessage(success);} catch (cause) {setError(errorText(cause));} finally {setBusy('');}
  }
  const update = (patch: Partial<AppSettings>, id = 'settings') => void perform(id, () => invoke('settings.update', {settings: patch}));
  async function workspaceAction(botId: string, action: 'start' | 'stop') {
    await perform(botId, async () => {
      await invoke('workspace.' + action, {botId});
      const info = await invoke<WorkspaceInfo>('workspace.inspect', {botId});
      setWorkspaces(old => ({...old, [botId]: info})); onRefreshRuntime();
    });
  }
  function addRule() {
    const action = ruleAction.trim(); if (!action) return;
    void perform('add-rule', async () => {await invoke('settings.update', {settings: {rules: [...settings.rules, {id: crypto.randomUUID(), action, policy: rulePolicy}]}}); setRuleAction('');});
  }
  return <PanelDialog title="Settings" onClose={onClose} className="settings-dialog"><nav className="settings-nav" aria-label="Settings sections"><div className="settings-nav-title">Settings</div>{sections.map(({id, label, Icon}) => <button key={id} className={section === id ? 'active' : ''} aria-current={section === id ? 'page' : undefined} onClick={() => {setSection(id); setError(''); setMessage('');}}><Icon size={18}/>{label}</button>)}<div className="settings-nav-footer">I Bot <span>{appInfo ? 'v' + appInfo.version : 'Desktop'}</span></div></nav><main className="settings-content"><header className="settings-heading"><h2>{sections.find(item => item.id === section)?.label}</h2><p>{{connectors: 'Review tool suggestions and confirm their classes yourself.', general: 'Make I Bot feel at home.', models: 'Choose the model your bots work with.', computers: 'A persistent Linux computer for every bot.', usage: 'Model activity recorded on this computer.', updates: 'Your installed desktop application.'}[section]}</p></header><PanelNotice error={error} message={message}/>
      {section === 'general' && <>
        <section className="settings-section"><h3>Appearance</h3><div className="settings-card"><Row label="Theme"><select aria-label="Theme" disabled={!!busy} value={settings.theme} onChange={event => update({theme: event.target.value as AppSettings['theme']})}><option value="dark">Dark</option><option value="light">Light</option><option value="system">Follow system</option></select></Row><Row label="Motion" description="Subtle movement and expressions for your bots."><select aria-label="Motion" disabled={!!busy} value={settings.motion} onChange={event => update({motion: event.target.value as AppSettings['motion']})}><option value="full">Full</option><option value="reduced">Reduced</option><option value="off">Off</option></select></Row></div></section>
        <section className="settings-section"><h3>Desktop</h3><div className="settings-card"><Row label="Keep running in the background" description="Closing the window keeps bots and routines running in the system tray."><Toggle label="Keep running in the background" checked={settings.closeToTray} disabled={!!busy} onChange={value => update({closeToTray: value})}/></Row><Row label="Desktop notifications" description="Notify me when my attention is needed."><Toggle label="Desktop notifications" checked={settings.notifications} disabled={!!busy} onChange={value => update({notifications: value})}/></Row><Row label="Timezone" description="Default timezone for new routines."><form className="settings-inline-form" onSubmit={event => {event.preventDefault(); update({timezone: zone.trim()});}}><input aria-label="Timezone" required value={zone} onChange={event => setZone(event.target.value)} placeholder="America/Chicago"/><button className="panels-button" disabled={!!busy || zone === settings.timezone}>Save</button></form></Row></div></section>
        <section className="settings-section"><h3>Bot behavior</h3><div className="settings-card"><Row label="Review actions" description="Apply your action rules before bots use tools."><Toggle label="Review actions" checked={settings.autoReview} disabled={!!busy} onChange={value => update({autoReview: value})}/></Row><Row label="Maximum number of bots" description="The limit on saved bots, including specialists Chief creates."><input aria-label="Maximum number of bots" className="settings-number" type="number" min={1} max={30} disabled={!!busy} defaultValue={settings.maxBots} onBlur={event => {const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 30 && value !== settings.maxBots) update({maxBots: value});}}/></Row><Row label="Model turns per run" description="Total model turns shared across the team before a run pauses."><input aria-label="Model turns per run" className="settings-number" type="number" min={3} max={200} disabled={!!busy} defaultValue={settings.maxSteps} onBlur={event => {const value = Number(event.target.value); if (Number.isInteger(value) && value >= 3 && value <= 200 && value !== settings.maxSteps) update({maxSteps: value});}}/></Row></div></section>
        <section className="settings-section"><h3>Action rules</h3><div className="settings-card settings-rules"><p className="panels-muted">Choose an action category for an enforced rule. Other phrases are saved as guidance for the bots.</p>{settings.rules.map(rule => <div className="settings-rule" key={rule.id}><ShieldCheck size={15}/><span>{rule.action}</span><select aria-label={`Policy for ${rule.action}`} disabled={!!busy} value={rule.policy} onChange={event => update({rules: settings.rules.map(item => item.id === rule.id ? {...item, policy: event.target.value as ActionRule['policy']} : item)})}><option value="ask">Ask first</option><option value="allow">Allow</option><option value="block">Block</option></select><button className="panels-icon" aria-label={`Remove rule ${rule.action}`} disabled={!!busy} onClick={() => update({rules: settings.rules.filter(item => item.id !== rule.id)})}><Trash2 size={15}/></button></div>)}<form className="settings-rule-form" onSubmit={event => {event.preventDefault(); addRule();}}><label>When a bot wants to<input required value={ruleAction} onChange={event => setRuleAction(event.target.value)} placeholder="Choose a category or write guidance" list="settings-rule-actions" maxLength={500}/><datalist id="settings-rule-actions"><option value="shell">Terminal commands</option><option value="computer">Computer control</option><option value="browser">Browser actions</option><option value="connector">Connected app tools</option><option value="read">Read data</option><option value="write">Write data</option><option value="send">Send data</option><option value="spend">Model or service spending</option><option value="delete">Delete data</option><option value="upload">Upload or share files</option><option value="persist">Save memory, skills or routines</option><option value="execute">Shell, browser and computer execution</option><option value="admin">Create bots or manage workspaces</option><option value="*">All actions</option></datalist><small>Classes and effect IDs are enforced. Legacy shell, computer, browser, connector and * still work. For one app, use connector:ID:read or connector:ID:write.</small></label><div><select aria-label="New rule policy" value={rulePolicy} onChange={event => setRulePolicy(event.target.value as ActionRule['policy'])}><option value="ask">Ask first</option><option value="allow">Allow automatically</option><option value="block">Block</option></select><button className="panels-button" disabled={!!busy || !ruleAction.trim()}><Plus size={15}/>Add rule</button></div></form></div></section>
      </>}
      {section === 'connectors' && <><p className="settings-help">Server claims are suggestions only. Unconfirmed tools ask first as provisional send effects, including write restrictions. Confirm only after reviewing the tool definition and account permissions. Classification never calls a tool.</p>{state.connectors.length?state.connectors.map(connector=><section className="settings-section" key={connector.id}><h3>{connector.name}</h3><ConnectorToolClasses connector={connector} invoke={invoke}/></section>):<p>No installed connectors.</p>}</>}
      {section === 'models' && <ProviderManager settings={settings} invoke={invoke}/>}
      {section === 'computers' && <>
        <section className="settings-section"><h3>Linux runtime</h3><div className="settings-card"><Row label={runtime?.imageReady ? 'Linux runtime ready' : runtime?.available ? 'Prepare the bot computer image' : 'Docker runtime'} description={runtime?.message ?? 'Checking runtime…'}><span className={'panels-status ' + (runtime?.imageReady ? 'good' : '')}>{runtime?.imageReady ? 'Ready' : runtime?.available ? 'Setup needed' : 'Unavailable'}</span></Row><div className="settings-runtime-actions"><button className="panels-button" disabled={!!busy} onClick={onRefreshRuntime}><RefreshCw size={14}/>Check again</button><button className="panels-button panels-primary" disabled={!!busy || !runtime?.available || runtime?.building} onClick={() => void perform('build-runtime', async () => {setLogs([]); await invoke('runtime.build'); onRefreshRuntime();}, 'Linux computer image is ready.')} >{busy === 'build-runtime' || runtime?.building ? <LoaderCircle size={14} className="spin"/> : <Download size={14}/>} {busy === 'build-runtime' || runtime?.building ? 'Preparing image…' : runtime?.imageReady ? 'Rebuild image' : 'Prepare Linux computers'}</button></div>{logs.length > 0 && <details className="settings-build-logs" open={busy === 'build-runtime'}><summary>Runtime output</summary><pre>{logs.join('\n')}</pre></details>}</div><p className="settings-help">Linux computers run in separate Docker containers with persistent files. Keep Docker Desktop and I Bot running for scheduled work.</p></section>
        <section className="settings-section"><h3>Your bot computers</h3><div className="settings-card">{state.bots.map(bot => {const info = workspaces[bot.id]; const running = info?.status === 'running'; return <div className="settings-computer" key={bot.id}><Avatar bot={bot} size={38} quiet/><div><strong>{bot.name}</strong><p>{info?.error ?? (info?.status === 'not-created' ? 'Not created yet' : info?.status === 'running' ? 'Running · Linux workspace' : info?.status === 'stopped' ? 'Stopped · Files preserved' : info?.status === 'starting' ? 'Starting…' : info ? 'Unavailable' : 'Checking…')}</p></div><button className="panels-button" disabled={!!busy || (!running && !runtime?.imageReady)} onClick={() => void workspaceAction(bot.id, running ? 'stop' : 'start')}>{busy === bot.id ? <LoaderCircle className="spin" size={14}/> : null}{running ? 'Stop' : 'Start'}</button></div>;})}</div></section>
      </>}
      {section === 'usage' && <>
        <div className="settings-stats"><div><span>Model requests</span><strong>{usage.length.toLocaleString()}</strong></div><div><span>Input tokens</span><strong>{inputTokens.toLocaleString()}</strong></div><div><span>Output tokens</span><strong>{outputTokens.toLocaleString()}</strong></div></div><p className="settings-help">Recorded totals from provider responses. Costs and remaining credit are available in your provider account.</p><section className="settings-section"><h3>Recent requests</h3>{usage.length ? <div className="settings-table-wrap"><table className="settings-usage-table"><thead><tr><th>Bot / model</th><th>Input</th><th>Output</th><th>Time</th></tr></thead><tbody>{[...usage].reverse().slice(0,50).map(record => <tr key={record.id}><td>{state.bots.find(bot => bot.id === record.botId)?.name ?? 'Bot'}<small>{record.model}</small></td><td>{record.inputTokens.toLocaleString()}</td><td>{record.outputTokens.toLocaleString()}</td><td>{new Date(record.createdAt).toLocaleString([], {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'})}</td></tr>)}</tbody></table></div> : <div className="panels-empty"><BarChart3 size={28}/><h4>No model usage yet</h4><p>Usage appears here after your bots make model requests.</p></div>}</section>
      </>}
      {section === 'updates' && <>
        <div className="settings-about"><span className="brand-mark"><i/><i/></span><h3>I Bot</h3><p>{appInfo ? `Version ${appInfo.version}` : 'Reading version…'}</p><span className="panels-status">{appInfo?.packaged ? 'Desktop build' : 'Local development build'}</span></div><section className="settings-section"><h3>Application</h3><div className="settings-card"><Row label="Updates" description="This build is updated by installing a new desktop release. An automatic update service is not configured."><Download size={18}/></Row><Row label="Local app data" description="Conversations, bot instructions, skills, and settings are saved on this computer."><button className="panels-button" onClick={() => void perform('app-data', () => invoke('app.open-data'))}><FolderOpen size={14}/>Open folder</button></Row></div></section>
      </>}
    </main></PanelDialog>;
}
