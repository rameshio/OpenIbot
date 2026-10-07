/** User-confirmed exact DNS names. Subdomains require separate grants. */
export function normalizeNetworkHosts(input:unknown):string[]{
 if(!Array.isArray(input)||input.length>100)throw new Error('Choose at most 100 exact host names.');
 const hosts=input.map(value=>{
  if(typeof value!=='string'||value.length>253||value!==value.trim()||!/^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/i.test(value)||/\.(?:local|localhost|internal)$/i.test(value))throw new Error('Use exact public host names without URLs, ports, paths or wildcards.');
  return value.toLowerCase();
 });
 return [...new Set(hosts)];
}
