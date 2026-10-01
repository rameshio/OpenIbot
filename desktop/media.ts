import type {MediaModel, ProviderSettings} from '../shared/types';
import {jsonRequest, normalizeApiKey, validateEndpoint} from './providers';
export type MediaPurpose = 'image' | 'transcription';
export function mediaProviderSupports(provider: string, purpose: MediaPurpose) {
  return (purpose==='image'?['openrouter','openai']:['openrouter','openai','groq','compatible','litellm']).includes(provider);
}
function context(settings: ProviderSettings, key: string, purpose: MediaPurpose) {
  if (!mediaProviderSupports(settings.provider,purpose)) throw new Error(`Choose a saved ${purpose==='image'?'OpenRouter or OpenAI':'OpenRouter, OpenAI, Groq, or compatible'} connection for this feature.`);
  const apiKey=normalizeApiKey(key); if (!apiKey) throw new Error('Save an API key for this connection in Settings → Models.');
  return {base:validateEndpoint(settings.baseUrl),headers:{authorization:`Bearer ${apiKey}`}};
}
export async function listMediaModels(settings: ProviderSettings, key: string, purpose: MediaPurpose, signal: AbortSignal): Promise<MediaModel[]> {
  const {base,headers}=context(settings,key,purpose);
  const url=new URL(`${base}${settings.provider==='openrouter'&&purpose==='image'?'/images/models':'/models'}`);
  if(settings.provider==='openrouter'&&purpose==='transcription')url.searchParams.set('output_modalities','transcription');
  const result=await jsonRequest(url.toString(),{headers},signal);
  if(!Array.isArray(result.data))throw new Error('The provider did not return a model list. Enter the model ID from its documentation.');
  return [...new Map<string,MediaModel>(result.data.filter((item:any)=>typeof item.id==='string'&&item.id.length<240&&(
    settings.provider==='openrouter'?(!item.architecture?.output_modalities||item.architecture.output_modalities.includes(purpose==='image'?'image':'transcription')):
    purpose==='image'?/^gpt-image-|^dall-e-3$/.test(item.id):/transcrib|whisper/i.test(item.id)
  )).map((item:any)=>[item.id,{id:item.id,name:typeof item.name==='string'?item.name.slice(0,240):item.id}])).values()].slice(0,500).sort((a,b)=>a.name.localeCompare(b.name));
}
export function validateAudio(data: unknown, format: unknown) {
  if(typeof data!=='string'||data.length<16||data.length>3_000_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data))throw new Error('The voice recording is empty or too large. Record a shorter message.');
  if(!['webm','wav','mp3','ogg','m4a','flac'].includes(String(format)))throw new Error('Unsupported recording format.');
  return {data,format:String(format)};
}
export async function transcribeAudio(settings: ProviderSettings, key: string, model: string, audio: unknown, format: unknown, language: string, signal: AbortSignal) {
  const {base,headers}=context(settings,key,'transcription'), recording=validateAudio(audio,format);
  let init:RequestInit;
  if(settings.provider==='openrouter')init={method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({model,input_audio:recording,response_format:'json',...(language!=='auto'?{language:language.split('-')[0]}:{})})};
  else {const body=new FormData();body.set('model',model);body.set('response_format','json');body.set('file',new Blob([Buffer.from(recording.data,'base64')],{type:`audio/${recording.format}`}),`voice.${recording.format}`);if(language!=='auto')body.set('language',language.split('-')[0]);init={method:'POST',headers,body};}
  const result=await jsonRequest(`${base}/audio/transcriptions`,init,signal);
  if(typeof result.text!=='string')throw new Error('The provider returned no transcript. Try recording again.');
  return {text:result.text.trim().slice(0,50_000)};
}
export async function generateAvatar(settings: ProviderSettings, key: string, model: string, description: string, signal: AbortSignal) {
  const {base,headers}=context(settings,key,'image');
  const prompt=`Create one original, charming bot avatar for a premium desktop assistant. Square composition, a single clear silhouette, expressive eyes, soft tactile shading, generous space around the character, no text or letters. User's character description: ${description}`;
  const body:Record<string,unknown>={model,prompt,n:1};
  if(settings.provider==='openai'){body.size='1024x1024';if(model==='dall-e-3')body.response_format='b64_json';else body.output_format='png';}
  else {body.aspect_ratio='1:1';body.output_format='png';}
  // Generation is intentionally not retried: a retry could spend credits twice.
  const response=await fetch(`${base}${settings.provider==='openrouter'?'/images':'/images/generations'}`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify(body),redirect:'error',signal});
  if(!response.ok){const status=response.status;throw new Error(`Avatar generation returned HTTP ${status}. ${status===401?'Check this connection’s API key.':status===402||status===429?'Check its credits and usage limits.':'Check image-model access in your provider account.'}`);}
  const result=await response.json(), item=result.data?.[0];
  if(typeof item?.b64_json!=='string'||item.b64_json.length>28_000_000||!/^[A-Za-z0-9+/]+={0,2}$/.test(item.b64_json))throw new Error('The provider did not return a supported avatar image. Choose another image model.');
  const mime=item.media_type??'image/png';if(!['image/png','image/jpeg','image/webp'].includes(mime))throw new Error('Choose a raster image model; vector outputs cannot be used as a bot avatar.');
  return `data:${mime};base64,${item.b64_json}`;
}
