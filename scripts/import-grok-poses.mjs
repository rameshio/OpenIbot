// Import only the declarative pose table from the user-supplied reference.
import fs from 'node:fs';
import vm from 'node:vm';
const html = fs.readFileSync(process.argv[2], 'utf8');
const table = html.match(/const items = (\[[\s\S]*?\n\]);/);
if (!table) throw new Error('Missing reference pose table');
const poses = vm.runInNewContext(`const eye=(l,t,w,h,rot)=>({l,t,w,h,rot}); ${table[0]} items;`, {}, {timeout:1000});
const header = `// Poses transcribed from the supplied grok-bot.html. No page scripts are bundled.
export interface GrokEye { l:string; t:string; w:string; h:string; rot:number }
export interface GrokPose {
 id:string; group:string; name:string; how:string;
 body:{w:number;h:number;radius:string;clip:string;rot:number;x:number;y:number;motion:string};
 eyes:boolean; L?:GrokEye; R?:GrokEye; smile?:boolean; brow?:boolean; orbit?:boolean; spark?:boolean;
 mark?:{w:number;h:number;top:string;radius:string};
}
`;
fs.writeFileSync('renderer/grok-poses.ts', header + 'export const grokPoses: GrokPose[] = ' + JSON.stringify(poses,null,2) + ';\n' +
 `export const grokPlayOrder = ['glance','blink','glance','squint','look','up','wide','wink','sleepy','sad','happy','circle','egg','widebody','pill','alert','bang','dot','triangle','square','drop','working','dizzy','glance'];\n`);
