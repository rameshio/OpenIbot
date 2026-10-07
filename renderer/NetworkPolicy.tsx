import {useEffect,useState} from 'react';
import type {Bot,DesktopAPI} from '../shared/types';
export function NetworkPolicy({bot,invoke}:{bot:Bot;invoke:DesktopAPI['invoke']}){
 const [hosts,setHosts]=useState((bot.networkHosts??[]).join('\n')),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>setHosts((bot.networkHosts??[]).join('\n')),[bot.networkHosts]);
 const save=async()=>{setBusy(true);setError('');try{await invoke('bot.update',{id:bot.id,networkHosts:hosts.split(/\r?\n/).map(host=>host.trim()).filter(Boolean)});}catch{setError('Use exact public host names, one per line. URLs, IP addresses and wildcards are not allowed.');}finally{setBusy(false);}};
 return <div className="settings-section"><h4>{bot.name}: allowed internet hosts</h4><p className="settings-help">No hosts are allowed by default. Add each site and API host explicitly; subdomains need their own entry. Approved sites can receive data. HTTPS content is encrypted and is not inspected by this destination filter. Provider and connector connections have separate approval rules.</p><label>Allowed hosts<textarea aria-label={`Allowed hosts for ${bot.name}`} rows={3} value={hosts} onChange={event=>setHosts(event.target.value)} placeholder="example.com&#10;api.example.com"/></label><button className="panels-button" disabled={busy} onClick={()=>void save()}>Save allowed hosts for {bot.name}</button>{error&&<p role="alert">{error}</p>}</div>;
}
