import { build } from 'esbuild';
import { build as viteBuild } from 'vite';
await build({entryPoints:['desktop/main.ts'],bundle:true,platform:'node',format:'cjs',target:'node22',external:['electron'],outfile:'dist-desktop/main.cjs',sourcemap:true});
await build({entryPoints:['desktop/preload.ts'],bundle:true,platform:'node',format:'cjs',target:'node22',external:['electron'],outfile:'dist-desktop/preload.cjs'});
await viteBuild();
