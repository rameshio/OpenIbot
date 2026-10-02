import {createHash} from 'node:crypto';
import type {AppSettings, Effect, EffectApprovalDecision, EffectClass, EffectGrant} from '../shared/types';

export const effectClasses: EffectClass[]=['read','write','send','spend','delete','upload','persist','execute','admin'];
/** Stable JSON hashing; neither arguments nor credentials are logged by this module. */
export function argsHash(value:unknown):string {
  const canonical=(input:any):any=>Array.isArray(input)?input.map(canonical):input&&typeof input==='object'?Object.fromEntries(Object.keys(input).sort().map(key=>[key,canonical(input[key])])):input;
  return createHash('sha256').update(JSON.stringify(canonical(value)) ?? 'null').digest('hex');
}
export function effectDecision(effect:Effect, settings:AppSettings):'allow'|'deny'|'ask' {
  if(effect.actor==='user')return 'allow';
  if(!effect.class||!effectClasses.includes(effect.class)||!['agent','system'].includes(effect.actor))return 'deny';
  const keys=new Set(['*',effect.id,effect.class]);
  if(['shell','browser','computer','connector'].includes(effect.transport))keys.add(effect.transport);
  // Persistent changes are writes; uploads also disclose data and can write remote state.
  if(['persist','admin','upload','delete'].includes(effect.class))keys.add('write');
  if(effect.class==='upload'){keys.add('send');keys.add('read');}
  if(effect.id==='model.request'){keys.add('send');keys.add('upload');}
  if(effect.connectorId)keys.add(`connector:${effect.connectorId}:${effect.class}`);
  // Unknown remote tools may both disclose and mutate. Server hints cannot relax review.
  if(effect.unconfirmedConnector){keys.add('write');if(effect.connectorId)keys.add(`connector:${effect.connectorId}:write`);}
  const policies=settings.rules.filter(rule=>keys.has(rule.action)).map(rule=>rule.policy);
  if(policies.includes('block'))return 'deny';
  if(effect.unconfirmedConnector)return 'ask';
  if(policies.includes('ask'))return 'ask';
  if(policies.includes('allow')||!settings.autoReview||effect.defaultPolicy==='allow')return 'allow';
  return 'ask';
}

export function createEffectAuthorizer(options:{settings:()=>AppSettings;now:()=>number;request:(effect:Effect,policyVersion:number)=>Promise<EffectApprovalDecision>}) {
  type StoredGrant={effect:Effect;grant:EffectGrant;used:boolean};
  const grants:StoredGrant[]=[];
  const version=()=>options.settings().policyVersion;
  const denied=(effect:Effect)=>new Error(!effect.class||!effectClasses.includes(effect.class)?'Unclassified effect denied.':`Blocked by your ${['shell','browser','computer','connector'].includes(effect.transport)?effect.transport:effect.class} action rule (${effect.class}).`);
  function matches(stored:StoredGrant,effect:Effect,hash:string,ownDispatch=false):boolean {
    const {grant,used,effect:original}=stored;
    return (!used||ownDispatch)&&grant.policyVersion===version()&&Date.parse(grant.expiresAt)>options.now()&&
      grant.effectClass===effect.class&&grant.target===effect.target&&grant.argsHash===hash&&
      argsHash(grant.dataScope)===argsHash(effect.dataScope)&&original.id===effect.id&&original.transport===effect.transport&&original.actor===effect.actor&&original.actorId===effect.actorId&&
      (grant.scope==='until'||(grant.scope==='chat'?original.chatId===effect.chatId:original.chatId===effect.chatId&&original.taskId===effect.taskId));
  }
  async function authorizeEffect(input:Effect) {
    const effect=structuredClone(input),hash=argsHash(effect.args),policyVersion=version();
    const decision=effectDecision(effect,options.settings());
    if(decision==='deny')throw denied(effect);
    let stored:StoredGrant|undefined;
    if(decision==='ask') {
      stored=grants.find(item=>matches(item,effect,hash));
      if(!stored){
        const response=await options.request(effect,policyVersion);
        // Approval never overrides a new policy, even if it now allows the effect.
        if(version()!==policyVersion)throw new Error('The action policy changed. Request a new approval.');
        if(effectDecision(effect,options.settings())==='deny')throw denied(effect);
        if(!response.approved)throw new Error('The user denied this action. Do not retry it through another tool.');
        const scope=response.scope??'once';
        if(!['once','chat','task','until'].includes(scope))throw new Error('Invalid grant scope.');
        const expiresAt=response.expiresAt??new Date(options.now()+5*60_000).toISOString();
        if(!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=options.now()||Date.parse(expiresAt)>options.now()+24*60*60_000)throw new Error('Invalid or expired grant.');
        stored={effect,grant:{effectClass:effect.class!,target:effect.target,argsHash:hash,dataScope:effect.dataScope,policyVersion,scope,expiresAt},used:false};
        // Expired/revoked grants are discarded; grants are process-local and never restored.
        for(let i=grants.length-1;i>=0;i--)if(grants[i].used||grants[i].grant.policyVersion!==version()||Date.parse(grants[i].grant.expiresAt)<=options.now())grants.splice(i,1);
        grants.push(stored);
      }
    }
    let dispatched=false;
    const validate=()=>{
      if(effect.actor==='user')return;
      if(version()!==policyVersion)throw new Error('The action policy changed. Request a new approval.');
      const current=effectDecision(effect,options.settings());if(current==='deny')throw denied(effect);
      if(stored&&Date.parse(stored.grant.expiresAt)<=options.now())throw new Error('The action grant expired. Request a new approval.');
      if(current==='ask'&&(!stored||!matches(stored,effect,hash,dispatched&&stored.grant.scope==='once')))throw new Error('No matching action grant. Request a new approval.');
    };
    validate();
    return {grant:stored?structuredClone(stored.grant):undefined,validate,
      // Validate and invoke without an intervening await: this is the dispatch boundary.
      execute<T>(work:()=>T):T {if(dispatched)throw new Error('This authorization was already dispatched.');validate();dispatched=true;if(stored?.grant.scope==='once')stored.used=true;return work();},
    };
  }
  return {authorizeEffect,invalidate(){grants.length=0;}};
}
