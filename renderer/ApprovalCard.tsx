import {useState} from 'react';
import {ShieldCheck} from 'lucide-react';
import type {Approval} from '../shared/types';

export function ApprovalCard({approval,botName,resolve}:{approval:Approval;botName:string;resolve:(args:Record<string,unknown>)=>Promise<void>}) {
 const [busy,setBusy]=useState(false);
 const effectClass=approval.effect?.class,view=approval.presentation;
 const decide=async(args:Record<string,unknown>)=>{if(busy)return;setBusy(true);try{await resolve({id:approval.id,...args});}finally{setBusy(false);}};
 const always=effectClass==='read'&&view?.alwaysEligible;
 return <section className={'approval-card'+(effectClass==='spend'?' approval-spend':'')} aria-label={`${effectClass??'Unclassified'} approval`}>
  <div><ShieldCheck size={20}/><strong>{botName} needs your decision</strong><span className="approval-class">{effectClass??'Unclassified'}</span></div>
  {effectClass==='spend'&&<p className="approval-cost">May incur charges — review the job and its arguments.</p>}
  <p className="approval-purpose">{view?.purpose??'Purpose unavailable.'}<small>{view?.purposeSource==='model'?'Model-generated — verify against the raw arguments.':'Host summary — model-generated purpose unavailable.'}</small></p>
  <p><strong>Target: </strong>{view?.target??approval.effect?.target??'Unknown'}</p>
  <p><strong>Raw arguments</strong></p><pre aria-label="Raw arguments">{view?JSON.stringify(view.args,null,2):'Arguments unavailable. Decline and request a fresh approval.'}</pre>
  <p className="approval-scope-help">Chat approvals reuse identical arguments in this chat for up to 24 hours. Tool or policy changes require approval again.</p>
  <footer><button className="button" disabled={busy} onClick={()=>void decide({approved:false})}>Decline</button>
   <button className="button" disabled={busy||!view} onClick={()=>void decide({approved:true,scope:'once'})}>Allow once</button>
   <button className="button" disabled={busy||!view} onClick={()=>void decide({approved:true,scope:'chat'})}>Allow for this chat</button>
   {always&&<button className="button primary" disabled={busy} onClick={()=>{if(window.confirm(`Confirm this tool is read-only: ${view.target}. Allow future calls by this bot, including changed arguments, until its classification, schema or policy changes?`))void decide({approved:true,alwaysTool:true});}}>Always allow this tool</button>}
  </footer>
 </section>;
}
