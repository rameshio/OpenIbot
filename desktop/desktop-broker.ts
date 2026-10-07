/** Narrow host broker: typed argv, never shell evaluation in the browser cell. */
export function desktopCommand(args:Record<string,unknown>):string[]{
 const text=typeof args.text==='string'?args.text:'';
 const coordinate=(value:unknown)=>{if(!Number.isInteger(value)||Number(value)<0||Number(value)>16384)throw new Error('Invalid screen coordinates.');return String(value);};
 switch(args.action){
  case 'open':{const url=new URL(String(args.url));if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Use an HTTP(S) browser URL without credentials.');return ['xdg-open',url.toString()];}
  case 'move':case 'click':case 'double_click':return ['xdotool','mousemove',coordinate(args.x),coordinate(args.y),...(args.action==='move'?[]:args.action==='click'?['click','1']:['click','--repeat','2','--delay','150','1'])];
  case 'type':if(text.length>20000||text.includes('\0'))throw new Error('Invalid typing request.');return ['xdotool','type','--clearmodifiers','--',text];
  case 'key':if(!text||text.length>100||!/^[A-Za-z0-9_+ -]+$/.test(text))throw new Error('Invalid key combination.');return ['xdotool','key','--clearmodifiers',text];
  case 'scroll':return ['xdotool','click','--repeat',String(Math.max(1,Math.min(20,Number(args.amount)||3))),text==='up'?'4':'5'];
  default:throw new Error('Unsupported computer action.');
 }
}
