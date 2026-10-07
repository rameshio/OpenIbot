import type {MemoryStore} from '../desktop/memory';
export interface MemoryEvaluation {kind:string;passed:number;total:number;results:{name:string;pass:boolean;characters:number}[];}
export function evaluateMemory(Store?:typeof MemoryStore):Promise<MemoryEvaluation>;
