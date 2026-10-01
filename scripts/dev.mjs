import {createServer} from 'vite';
import {build} from 'esbuild';
import {spawn} from 'node:child_process';
import electron from 'electron';
const server=await createServer();await server.listen();
for(const [input,output] of [['main.ts','main.cjs'],['preload.ts','preload.cjs']])await build({entryPoints:['desktop/'+input],outfile:'dist-desktop/'+output,bundle:true,platform:'node',format:'cjs',target:'node22',external:['electron'],sourcemap:true});
const env={...process.env,IBOT_DEV_URL:'http://127.0.0.1:5177'};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(electron,['.'],{env,stdio:'inherit',windowsHide:false});
child.on('exit',async(code)=>{await server.close();process.exit(code??0);});
