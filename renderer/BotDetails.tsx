import {MemoryPanel} from './MemoryPanel';
import {useEffect, useMemo, useState} from 'react';
import {ArrowUpRight, Check, ChevronRight, Clock, FileText, Folder, Monitor, Play, Plus, Settings} from 'lucide-react';
import type {AppState, Attachment, Bot, DesktopAPI, Routine, RuntimeStatus, WorkspaceInfo} from '../shared/types';
import {Avatar} from './Avatar';
import {AvatarEditor} from './AvatarEditor';

type Tab = 'details' | 'library' | 'computer';
type ComputerTab = 'screen' | 'files' | 'terminal';
interface Props {
  invoke: DesktopAPI['invoke'];
  bot: Bot; state: AppState; routines: Routine[]; workspace: WorkspaceInfo | null;
  runtime: RuntimeStatus | null; screenshot: string; busy: boolean; status: string;
  onSettings: () => void; onRuntimeSettings: () => void; onMarketplace: () => void;
  onRoutine: (routine?: Routine) => void; onRunRoutine: (routine: Routine) => void;
  onToggleRoutine: (routine: Routine) => void; onFile: (file: Attachment) => void;
  onComputer: (tab: ComputerTab) => void;
}
function scheduleLabel(routine: Routine) {
  const names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const days=routine.days.length===7?'Every day':routine.days.join(',')==='1,2,3,4,5'?'Weekdays':routine.days.map(day=>names[day]).join(', ');
  return `${days} at ${routine.time}`;
}

export function BotDetails({bot, state, invoke, routines, workspace, runtime, screenshot, busy, status, onSettings, onRuntimeSettings, onMarketplace, onRoutine, onRunRoutine, onToggleRoutine, onFile, onComputer}: Props) {
  const [tab, setTab]=useState<Tab>('details');
  const [memoryOpen,setMemoryOpen]=useState(false);
  const [appearance,setAppearance]=useState(false);
  useEffect(()=>{setTab('details');setAppearance(false);},[bot.id]);
  useEffect(()=>{if(!appearance)return;const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setAppearance(false);document.querySelector<HTMLButtonElement>('.profile-avatar-button')?.focus();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[appearance]);
  const files=useMemo(()=>{
    const chats=new Set(state.chats.filter(chat=>chat.botIds.includes(bot.id)).map(chat=>chat.id));
    const unique=new Map<string, Attachment>();
    for(const message of state.messages) if(chats.has(message.chatId)) for(const file of message.attachments??[]) unique.set(`${file.botId??'local'}:${file.path}`,file);
    return [...unique.values()].reverse();
  },[state.chats,state.messages,bot.id]);
  const skills=state.skills.filter(skill=>skill.installed&&(!skill.botIds.length||skill.botIds.includes(bot.id)));
  const tabs: {id: Tab; label: string}[]=[{id:'details',label:'Details'},{id:'library',label:'Library'},{id:'computer',label:'Computer'}];
  return <aside className="details-rail">
    {memoryOpen&&<MemoryPanel bot={bot} invoke={invoke} onClose={()=>setMemoryOpen(false)}/>}
    <header className="bot-panel-header"><span>Bot details</span><button className="icon-button" aria-label="Bot settings" title="Bot settings" onClick={onSettings}><Settings size={17}/></button></header>
    <div className="bot-profile"><button className="profile-avatar-button" aria-label={`Customize ${bot.name}'s avatar`} aria-expanded={appearance} onClick={()=>setAppearance(!appearance)}><Avatar bot={bot} size={76}/></button><h2>{bot.name}</h2><p title={bot.role}>{bot.role}</p></div>
    {appearance&&<div className="appearance-scroll"><AvatarEditor key={bot.id} bot={bot} state={state} invoke={invoke} onClose={()=>setAppearance(false)}/></div>}
    <nav className="bot-detail-tabs" hidden={appearance} role="tablist" aria-label={`${bot.name}'s details`}>
      {tabs.map((item,index)=><button key={item.id} id={`bot-tab-${item.id}`} role="tab" aria-selected={tab===item.id} aria-controls={`bot-panel-${item.id}`} tabIndex={tab===item.id?0:-1} onClick={()=>setTab(item.id)} onKeyDown={event=>{
        const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;
        if(next>=0){event.preventDefault();setTab(tabs[next].id);document.getElementById(`bot-tab-${tabs[next].id}`)?.focus();}
      }}>{item.label}{item.id==='library'&&files.length>0&&<span className="tab-count">{files.length}</span>}</button>)}
    </nav>
    <div className="details-scroll" hidden={appearance} role="tabpanel" id={`bot-panel-${tab}`} aria-labelledby={`bot-tab-${tab}`} tabIndex={0}>
      {tab==='details'&&<>
        <section className="routines-section"><div className="section-heading"><h3>Routines</h3><button className="icon-button" aria-label="Add routine" onClick={()=>onRoutine()}><Plus size={15}/></button></div>
          {routines.length?<div className="routine-list">{routines.map(routine=><div className={'routine-row '+(!routine.enabled?'disabled':'')} key={routine.id}>
            <button className="routine-summary" onClick={()=>onRoutine(routine)}><strong>{routine.name}</strong><small>{scheduleLabel(routine)}</small>{routine.lastStatus&&<small>{routine.lastStatus}</small>}</button>
            <button className="routine-toggle" role="switch" aria-label={`Enable ${routine.name}`} aria-checked={routine.enabled} onClick={()=>onToggleRoutine(routine)}><span/></button>
            <button className="icon-button routine-run" aria-label={`Run ${routine.name}`} title="Run now" onClick={()=>onRunRoutine(routine)}><Play size={12}/></button>
          </div>)}</div>:<div className="detail-empty"><Clock size={19}/><p>Good work can become a routine.</p><button onClick={()=>onRoutine()}>Schedule something<Plus size={13}/></button></div>}
        </section>
        <section className="memory-section"><div className="section-heading"><h3>Remembered preferences</h3><button className="icon-button" aria-label="Edit standing instructions" onClick={onSettings}><Plus size={15}/></button></div><p>{bot.memory||'Tell your bot what to remember. Your preferences stay with it.'}</p><button className="button" onClick={()=>setMemoryOpen(true)}>Memory notes</button></section>
        <section className="skills-section"><div className="section-heading"><h3>Skills</h3><button className="icon-button" aria-label="Manage bot skills" onClick={onMarketplace}><Plus size={15}/></button></div>{skills.length?skills.map(skill=><button key={skill.id} onClick={onMarketplace}><Check size={13}/>{skill.name}<ChevronRight size={12}/></button>):<p className="detail-help">Add a skill to give {bot.name} a new way to work.</p>}</section>
      </>}
      {tab==='library'&&<>
        <section><div className="section-heading"><h3>Shared files</h3><span className="detail-count">{files.length}</span></div><p className="detail-help library-caption">Files shared in {bot.name}’s conversations.</p>{files.length?<div className="library-list">{files.map(file=><button key={`${file.botId??'local'}:${file.path}`} onClick={()=>onFile(file)}><span className="library-file-icon"><FileText size={18}/></span><span><strong>{file.name}</strong><small>{file.size?`${(file.size/1024).toFixed(1)} KB`:'Open in computer'}</small></span><ArrowUpRight size={13}/></button>)}</div>:<div className="detail-empty library-empty"><Folder size={25}/><strong>A place for the work.</strong><p>Documents and deliverables appear here when they’re shared.</p></div>}</section>
        <button className="detail-wide-button" onClick={()=>onComputer('files')}><Folder size={15}/>Browse workspace files<ArrowUpRight size={14}/></button>
      </>}
      {tab==='computer'&&<>
        <section className="computer-section"><div className="section-heading"><h3>{bot.name}’s computer</h3><span className={'small-status '+(workspace?.status==='running'?'working':'idle')}/></div><button className={'desktop-thumbnail '+(screenshot?'has-image':'')} disabled={busy} aria-label={`Open ${bot.name}'s computer`} onClick={()=>onComputer('screen')}>
          {screenshot?<img src={screenshot} alt={`${bot.name}'s live Linux desktop`}/>:<><span className="computer-glyph"><Monitor size={28}/></span><strong>{busy?'Starting computer…':workspace?.status==='error'?'Computer needs attention':'Your bot’s own space'}</strong><small>Browser · files · terminal</small></>}<span className="thumbnail-open"><ArrowUpRight size={14}/></span>
        </button><div className="computer-caption"><span className={'connection-status '+(workspace?.status==='running'?'online':'')}><i/>{workspace?.status==='running'?'Linux · Running':workspace?.status==='stopped'?'Linux · Stopped':'Linux · Not started'}</span><button disabled={busy} onClick={()=>onComputer('screen')}>{busy?'Starting…':workspace?.status==='running'?'Open':'Start'}<ArrowUpRight size={12}/></button></div>
          {runtime&&!runtime.imageReady&&<button className="setup-computer" onClick={onRuntimeSettings}>{runtime.available?'Set up Linux computers':'Connect Linux runtime'}<ChevronRight size={13}/></button>}
        </section><p className="detail-help">A separate browser and files for {bot.name}. Work stays here between conversations.</p><div className="computer-shortcuts"><button onClick={()=>onComputer('files')}><Folder size={16}/>Files<ArrowUpRight size={12}/></button><button onClick={()=>onComputer('terminal')}><Monitor size={16}/>Terminal<ArrowUpRight size={12}/></button></div>
      </>}
    </div><footer className="details-footer"><span className={'small-status '+bot.status}/>{status}</footer>
  </aside>;
}
