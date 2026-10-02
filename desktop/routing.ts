import type {AppState} from '../shared/types';
export function routeMessage(content:string,state:AppState,defaultBotId:string){
 // Only leading explicit references are routing commands; addresses and paths in prose are data.
 let rest=content.trimStart(),botId=defaultBotId,explicit=false;const skillIds:string[]=[];
 while(rest.startsWith('@')||rest.startsWith('/')){
  const match=rest.match(/^([@/])(?:"([^"]+)"|([A-Za-z0-9_.-]+))(?:\s+|$)/);if(!match)break;
  const name=(match[2]??match[3]).toLowerCase();rest=rest.slice(match[0].length);
  if(match[1]==='@'){if(explicit)throw new Error('Choose one bot per message.');const bots=state.bots.filter(bot=>bot.id.toLowerCase()===name||bot.name.toLowerCase()===name);if(!bots.length)throw new Error('Unknown bot reference.');if(bots.length!==1)throw new Error('Ambiguous bot name; use its ID.');botId=bots[0].id;explicit=true;}
  else{const skills=state.skills.filter(skill=>skill.installed&&(skill.id.toLowerCase()===name||skill.name.toLowerCase()===name));if(skills.length!==1)throw new Error('Skill is not available or its name is ambiguous.');skillIds.push(skills[0].id);}
 }
 for(const id of skillIds){const skill=state.skills.find(skill=>skill.id===id)!;if(skill.botIds.length&&!skill.botIds.includes(botId))throw new Error('Skill is not available to this bot.');}
 return {botId,skillIds:[...new Set(skillIds)],reason:explicit?'explicit-bot':skillIds.length?'explicit-skill':'chat-default',content:rest};
}
