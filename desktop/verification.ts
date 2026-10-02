export interface Verification {verdict:'pass'|'fail'|'unknown';checks:{name:string;status:'pass'|'fail'|'unknown';evidence:string}[];}
/** A malformed verdict or unsupported completion claim fails closed. */
export function parseVerification(text:string):Verification{
 try{const value=JSON.parse(text);if(!['pass','fail','unknown'].includes(value.verdict)||!Array.isArray(value.checks)||!value.checks.length||value.checks.some((check:any)=>typeof check?.name!=='string'||!['pass','fail','unknown'].includes(check.status)||typeof check.evidence!=='string'||!check.evidence.trim()))throw new Error();
  if(value.verdict==='pass'&&value.checks.some((check:any)=>check.status!=='pass'))throw new Error();return value;
 }catch{return {verdict:'unknown',checks:[{name:'Structured verification',status:'unknown',evidence:'The verifier did not return a valid supported verdict.'}]};}
}
