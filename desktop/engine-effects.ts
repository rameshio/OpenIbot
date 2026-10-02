import type {AppState, Bot, Effect} from '../shared/types';
import type {ToolCall} from './providers';
import {agentTools,workspacePath} from './engine-tools';
import {argsHash} from './effects';
import {confirmedConnectorClass,connectorDefinitionHash} from './connector-effects';

/** Host-owned classifications. Model arguments cannot supply actor/class/grants. */
export function toolEffect(call:ToolCall,bot:Bot,run:{id:string;chatId:string},state:AppState):Effect {
  const args=call.arguments;
  const definition=agentTools.find(tool=>tool.name===call.name);
  const effect:Effect={id:call.name,transport:'internal',actor:'agent',actorId:bot.id,chatId:run.chatId,taskId:run.id,target:`bot:${bot.id}`,args,dataScope:[`bot:${bot.id}`],...(definition?{toolName:call.name,toolSchemaHash:argsHash(definition)}:{})};
  switch(call.name){
    case 'create_bot':return {...effect,id:'bot.create',class:'admin',target:'bots'};
    case 'delegate':case 'message_bot':return {...effect,id:'bot.delegate',transport:'delegation',class:'send',target:`bot:${String(args.botId)}`,dataScope:[`bot:${bot.id}`,`bot:${String(args.botId)}`]};
    case 'list_files':case 'read_file':case 'write_file':return {...effect,id:call.name==='list_files'?'file.list':call.name==='read_file'?'file.read':'file.write',transport:'file',class:call.name==='write_file'?'write':'read',target:`bot:${bot.id}:${workspacePath(args.path)}`,...(call.name!=='write_file'?{defaultPolicy:'allow' as const}:{})};
    case 'share_file':return {...effect,id:'file.share',transport:'file',class:'upload',target:`bot:${String(args.targetBotId)}:${workspacePath(args.targetPath)}`,dataScope:[`bot:${bot.id}:${workspacePath(args.path)}`,`bot:${String(args.targetBotId)}:${workspacePath(args.targetPath)}`]};
    case 'run_shell':return {...effect,id:'shell.execute',transport:'shell',class:'execute'};
    case 'browser_open':return {...effect,id:'browser.open',transport:'browser',class:'execute',target:String(args.url)};
    case 'computer':return {...effect,id:'computer.control',transport:'computer',class:'execute'};
    case 'screenshot':return {...effect,id:'computer.screenshot',transport:'screen',class:'read',defaultPolicy:'allow'};
    case 'save_memory':return {...effect,id:'memory.write',transport:'memory',class:'persist'};
    case 'save_skill':return {...effect,id:'skill.write',transport:'skill',class:'persist',target:`bot:${bot.id}:skill:${String(args.id??args.name)}`};
    case 'schedule_routine':return {...effect,id:'routine.write',transport:'routine',class:'persist',target:`bot:${bot.id}:routine:${String(args.id??args.name)}`};
    case 'connector_call':{
      const connector=state.connectors.find(item=>item.id===args.connectorId&&item.enabled&&(!item.botIds.length||item.botIds.includes(bot.id)));
      const tool=connector?.tools.find(item=>item.name===args.name);
      const confirmed=connector&&tool?confirmedConnectorClass(connector,tool):undefined,hash=tool?connectorDefinitionHash(tool):undefined;
      return {...effect,id:'connector.call',transport:'connector',class:tool?confirmed??'send':undefined,unconfirmedConnector:!!tool&&!confirmed,connectorId:connector?.id,toolName:tool?.name,toolSchemaHash:hash,target:connector&&tool?`${connector.id}:${connector.url}:${tool.name}:${hash}`:'unknown-connector',dataScope:[`bot:${bot.id}`,`connector:${String(args.connectorId)}`]};
    }
    default:return effect; // Deliberately unclassified, including user-only media/IPC commands.
  }
}
