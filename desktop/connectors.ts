import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {Client, StreamableHTTPClientTransport, UnauthorizedError, type OAuthClientProvider, type OAuthClientInformationContext, type StoredOAuthClientInformation, type StoredOAuthTokens, type OAuthDiscoveryState} from '@modelcontextprotocol/client';
import {validateEndpoint} from './providers';
export interface ConnectorCredentials {serverUrl:string;redirectUrl:string;clients:Record<string,StoredOAuthClientInformation>;tokens:Record<string,StoredOAuthTokens>;issuer?:string;discovery?:OAuthDiscoveryState;}
type Save=(data:ConnectorCredentials)=>void;
function oauthProvider(data:ConnectorCredentials,save:Save,redirect:(url:URL)=>Promise<void>,state:string):OAuthClientProvider {
  let verifier='';
  const issuer=(ctx?:OAuthClientInformationContext)=>ctx?.issuer??data.issuer;
  return {redirectUrl:data.redirectUrl,clientMetadata:{client_name:'OpenIbot Desktop',redirect_uris:[data.redirectUrl],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none',application_type:'native'},state:()=>state,
    clientInformation:ctx=>ctx?data.clients[ctx.issuer]:undefined,
    saveClientInformation:(client,ctx)=>{if(!ctx)throw new Error('Missing authorization issuer.');data.clients[ctx.issuer]=client;save(data);},
    tokens:ctx=>{const id=issuer(ctx);return id?data.tokens[id]:undefined;},
    saveTokens:(tokens,ctx)=>{const id=issuer(ctx);if(!id)throw new Error('Missing authorization issuer.');data.issuer=id;data.tokens[id]=tokens;save(data);},
    redirectToAuthorization:redirect,saveCodeVerifier:value=>{verifier=value;},codeVerifier:()=>{if(!verifier)throw new Error('Authorization expired.');return verifier;},
    saveDiscoveryState:value=>{data.discovery=value;save(data);},discoveryState:()=>data.discovery,
    invalidateCredentials:scope=>{if(scope==='all'||scope==='tokens')data.tokens={};if(scope==='all'||scope==='client')data.clients={};if(scope==='all'||scope==='discovery')delete data.discovery;save(data);}
  };
}
function clientAndTransport(url:string,signal:AbortSignal,authProvider?:OAuthClientProvider|{token:()=>Promise<string|undefined>}) {
  const client=new Client({name:'OpenIbot',version:'0.5.0'});
  const transport=new StreamableHTTPClientTransport(new URL(validateEndpoint(url)),{authProvider,fetch:(input,init)=>fetch(input,{...init,redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(60_000),...(init?.signal?[init.signal]:[])])})});
  return {client,transport};
}
async function toolCatalog(client:Client,signal:AbortSignal) {
  const tools:any[]=[];let cursor:string|undefined;const cursors=new Set<string>();
  for(let page=0;page<30;page++) {const result=await client.listTools(cursor?{cursor}:{},{signal,timeout:30_000});tools.push(...result.tools);if(tools.length>1000)throw new Error('The app exposes too many tools. Narrow its catalog before connecting.');cursor=result.nextCursor;if(!cursor)return tools;if(cursors.has(cursor))break;cursors.add(cursor);}
  throw new Error('The app returned an incomplete tool catalog.');
}
export async function callConnector(url:string,token:string,credentials:ConnectorCredentials|undefined,save:Save,method:string,params:any,signal:AbortSignal,beforeCall?:()=>void) {
  if(credentials&&credentials.serverUrl!==url)throw new Error('Sign in again for the new app endpoint.');
  const provider=credentials?oauthProvider(structuredClone(credentials),save,async()=>{throw new Error('Sign in to this app again from Marketplace.');},''): {token:async()=>token||undefined};
  const {client,transport}=clientAndTransport(url,signal,provider);
  try{await client.connect(transport);beforeCall?.();return method==='tools/list'?{tools:await toolCatalog(client,signal)}:await client.callTool(params,{signal,timeout:60_000});}
  catch(error){if(signal.aborted)throw new Error('App request cancelled.');if(error instanceof UnauthorizedError)throw new Error('This app needs authorization. Use Sign in or update its access token in Marketplace.');throw new Error('The app request failed. Check its connection, permissions, and tool arguments in Marketplace.');}
  finally{await client.close().catch(()=>{});}
}
export async function signInConnector(url:string,open:(url:string)=>Promise<void>,signal:AbortSignal):Promise<{credentials:ConnectorCredentials;tools:any[]}> {
  const serverUrl=validateEndpoint(url),state=randomBytes(24).toString('hex');
  let accept:(params:URLSearchParams)=>void=()=>{};
  const callback=new Promise<URLSearchParams>(resolve=>{accept=resolve;});
  const server=createServer((request,response)=>{
    response.setHeader('Content-Type','text/plain; charset=utf-8');response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');
    const target=new URL(request.url??'','http://127.0.0.1');
    if(request.method!=='GET'||target.pathname!=='/callback'||target.searchParams.get('state')!==state){response.writeHead(400);response.end('This sign-in link is invalid. Return to OpenIbot and try again.');return;}
    response.end('Sign-in received. You can close this tab and return to OpenIbot.');accept(target.searchParams);
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const address=server.address();if(!address||typeof address==='string'){server.close();throw new Error('Could not prepare browser sign-in.');}
  const credentials:ConnectorCredentials={serverUrl,redirectUrl:`http://127.0.0.1:${address.port}/callback`,clients:{},tokens:{}};
  const provider=oauthProvider(credentials,()=>{},async url=>{if(url.protocol!=='https:'&&!(serverUrl.startsWith('http://127.0.0.1:')&&url.hostname==='127.0.0.1'))throw new Error('The app supplied an insecure sign-in address.');await open(url.toString());},state);
  let {client,transport}=clientAndTransport(serverUrl,signal,provider);
  let abort:()=>void=()=>{};
  try{
    try{await client.connect(transport);}catch(error){if(!(error instanceof UnauthorizedError))throw error;
      const params=await Promise.race([callback,new Promise<never>((_,reject)=>{abort=()=>reject(new Error('Sign-in cancelled.'));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();})]);
      if(params.has('error')||!params.get('code'))throw new Error('Sign-in was not approved.');
      await transport.finishAuth(params);await client.close().catch(()=>{});
      ({client,transport}=clientAndTransport(serverUrl,signal,provider));await client.connect(transport);
    }
    const tools=await toolCatalog(client,signal);
    if(!credentials.issuer||!credentials.tokens[credentials.issuer]?.access_token)throw new Error('This endpoint did not return an OAuth token. Use an access token for this app.');
    return {credentials,tools};
  }catch{throw new Error(signal.aborted?'Browser sign-in cancelled or timed out.':'Browser sign-in could not be completed. Check the app’s setup guide; some services require a registered client or an access token.');}
  finally{signal.removeEventListener('abort',abort);server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await client.close().catch(()=>{});}
}
