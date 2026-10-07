import {useState} from 'react';
import type {Connector,ConnectorTool,DesktopAPI,EffectClass} from '../shared/types';

function ToolClass({connector,tool,invoke}:{connector:Connector;tool:ConnectorTool;invoke:DesktopAPI['invoke']}) {
 const confirmed=tool.definitionHash&&connector.toolEffectHashes?.[tool.name]===tool.definitionHash?connector.toolEffects?.[tool.name]:undefined;
 const [selected,setSelected]=useState<EffectClass|''>(confirmed??''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async(effectClass?:EffectClass)=>{setBusy(true);setError('');try{await invoke('connector.classify',{id:connector.id,name:tool.name,definitionHash:tool.definitionHash,effectClass});if(!effectClass)setSelected('');}catch{setError('The class could not be saved. Refresh the view and review the current definition.');}finally{setBusy(false);}};
 return <li><strong>{tool.name}</strong><p>{tool.description}</p><p>Suggested class: <strong>{tool.suggestedClass??'UNKNOWN'}</strong> <small>(server hint or host suggestion; not authority)</small></p>
  <p>{confirmed?`Confirmed class: ${confirmed}`:'Needs your confirmation — provisional send, ask first.'}</p>
  <details><summary>Tool schema</summary><pre>{JSON.stringify({inputSchema:tool.inputSchema??{},...(tool.outputSchema?{outputSchema:tool.outputSchema}:{})},null,2)}</pre></details>
  <label>Effect class<select aria-label={`Effect class for ${connector.name} / ${tool.name}`} disabled={busy} value={selected} onChange={event=>setSelected(event.target.value as EffectClass|'')}><option value="">Select a class to confirm</option>{['read','write','send','spend','delete','upload','persist','execute','admin'].map(value=><option key={value} value={value}>{value}</option>)}</select></label>
  <button className="panels-button" disabled={busy||!selected} onClick={()=>void save(selected as EffectClass)}>Confirm class</button>{confirmed&&<button className="panels-text-button" disabled={busy} onClick={()=>void save()}>Remove confirmation</button>}{error&&<p role="alert">{error}</p>}
 </li>;
}
export function ConnectorToolClasses({connector,invoke}:{connector:Connector;invoke:DesktopAPI['invoke']}) {
 const [refreshing,setRefreshing]=useState(false),[error,setError]=useState('');
 const refresh=async()=>{setRefreshing(true);setError('');try{await invoke('connector.test',{id:connector.id});}catch{setError('Tool discovery failed. Check this connection and refresh again.');}finally{setRefreshing(false);}};
 return <><button className="panels-button" disabled={refreshing} onClick={()=>void refresh()}>Refresh tools</button><p className="settings-help">Refresh requests tools/list and saves definitions; it never calls a tool. Confirming a class uses the saved definition.</p>{error&&<p role="alert">{error}</p>}{connector.tools.length?<ul className="market-tool-list">{connector.tools.map(tool=><ToolClass key={`${tool.name}:${tool.definitionHash??'legacy'}:${connector.toolEffectHashes?.[tool.name]??''}`} connector={connector} tool={tool} invoke={invoke}/>)}</ul>:<p>No discovered tools.</p>}{connector.catalogEvents?.length?<details className="connector-activity"><summary>Activity</summary><ul>{connector.catalogEvents.slice(-10).map(event=><li key={event.id}><time>{new Date(event.createdAt).toLocaleString()}</time> {event.summary}</li>)}</ul></details>:null}</>;
}
