// One capped animation clock for every visible avatar; thumbnails stay frozen.
type Listener=(time:number)=>void;
const listeners=new Set<Listener>();
let request=0,last=0;
export const avatarTime=()=>performance.now()/1000;
function tick(ms:number) {
 request=0;
 if(document.hidden||!listeners.size)return;
 if(ms-last>=1000/30){last=ms;for(const listener of listeners)listener(ms/1000);}
 request=requestAnimationFrame(tick);
}
export function animateAvatar(listener:Listener) {
 listeners.add(listener);
 if(!request&&!document.hidden)request=requestAnimationFrame(tick);
 return()=>{listeners.delete(listener);if(!listeners.size&&request){cancelAnimationFrame(request);request=0;}};
}
const subscribers=new Set<()=>void>();
let observer:MutationObserver|undefined;
const media=window.matchMedia('(prefers-reduced-motion: reduce)');
export const motionSnapshot=()=>document.hidden?'hidden':media.matches?'reduced':document.documentElement.dataset.motion??'full';
function notify(){for(const callback of subscribers)callback();}
export function watchMotion(callback:()=>void) {
 subscribers.add(callback);
 if(subscribers.size===1){observer=new MutationObserver(notify);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});media.addEventListener('change',notify);document.addEventListener('visibilitychange',notify);}
 return()=>{subscribers.delete(callback);if(!subscribers.size){observer?.disconnect();observer=undefined;media.removeEventListener('change',notify);document.removeEventListener('visibilitychange',notify);}};
}
