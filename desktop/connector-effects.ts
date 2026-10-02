import type {Connector,ConnectorTool,EffectClass} from '../shared/types';
import {argsHash,effectClasses} from './effects';

export const connectorDefinitionHash=(tool:ConnectorTool)=>argsHash({name:tool.name,description:tool.description,inputSchema:tool.inputSchema,outputSchema:tool.outputSchema});
/** All server hints are display suggestions. None confer read authority. */
export function normalizeConnectorTool(input:any):ConnectorTool {
 const name=typeof input.name==='string'?input.name:'',description=typeof input.description==='string'?input.description:'';
 const annotations=Object.fromEntries(['readOnlyHint','destructiveHint','openWorldHint'].filter(key=>typeof input.annotations?.[key]==='boolean').map(key=>[key,input.annotations[key]]));
 const suggestedClass:EffectClass=effectClasses.includes(input.effectClass)?input.effectClass:annotations.destructiveHint?'delete':annotations.readOnlyHint?'read':/send|message|email|invite|publish|notify|share/i.test(name+' '+description)?'send':'write';
 const tool:ConnectorTool={name,description,inputSchema:input.inputSchema,outputSchema:input.outputSchema,annotations,suggestedClass};
 tool.definitionHash=connectorDefinitionHash(tool);return tool;
}
export function confirmedConnectorClass(connector:Connector,tool:ConnectorTool):EffectClass|undefined {
 const value=Object.hasOwn(connector.toolEffects??{},tool.name)?connector.toolEffects?.[tool.name]:undefined;
 return value&&effectClasses.includes(value)&&Object.hasOwn(connector.toolEffectHashes??{},tool.name)&&connector.toolEffectHashes?.[tool.name]===connectorDefinitionHash(tool)?value:undefined;
}
