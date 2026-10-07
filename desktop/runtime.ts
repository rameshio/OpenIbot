import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import type { CommandResult, RuntimeService, RuntimeStatus, WorkspaceFile, WorkspaceInfo } from '../shared/types';
import {normalizeNetworkHosts} from '../shared/network-policy';
import {desktopCommand} from './desktop-broker';

const IMAGE = 'ibot-workspace:local';
const MANAGED_LABEL = 'app.ibot.managed';
const INSTALL_LABEL = 'app.ibot.installation';
const BOT_LABEL = 'app.ibot.bot';
const EGRESS_LABEL = 'app.ibot.egress';
const MAX_FILE_BYTES = 64 * 1024 * 1024;

export function validateBotId(botId: string): string {
  if (typeof botId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(botId)) {
    throw new Error('Invalid bot identifier.');
  }
  return botId;
}

export function validateWorkspacePath(value: string, allowRoot = true): string {
  if (typeof value !== 'string' || value.length > 4096 || /[\0\\]/.test(value)) throw new Error('Invalid workspace path.');
  if (value !== '/workspace' && !value.startsWith('/workspace/')) throw new Error('Files must be inside /workspace.');
  const parts = value.split('/');
  if (parts.some(part => part === '..' || part === '.')) throw new Error('Workspace path traversal is not allowed.');
  const clean = parts.filter(Boolean).join('/');
  if (!allowRoot && clean === 'workspace') throw new Error('A workspace file name is required.');
  return `/${clean}`;
}

interface RunOptions { input?: string | Buffer; timeout?: number; limit?: number; onLog?: (line: string) => void; }
interface DockerObject {
  Id?: string;
  State?: { Running?: boolean; Health?: { Status?: string } };
  Config?: { Labels?: Record<string, string> };
  Labels?: Record<string, string>;
  NetworkSettings?: { Ports?: Record<string, { HostIp: string; HostPort: string }[] | null> };
  Internal?: boolean;
}
export interface RuntimeOptions {
  dataDir: string;
  resourcesDir: string;
  onUpdate?: (workspace: WorkspaceInfo) => void;
  networkHosts?: (botId:string)=>string[];
}

function dockerExecutable(): string {
  if (process.platform !== 'win32') return 'docker';
  const candidates = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Docker', 'resources', 'bin', 'docker.exe'),
  ];
  return candidates.find(candidate => existsSync(candidate)) || 'docker.exe';
}

/** All host operations use an argv array with shell:false. Shell access only
 * occurs inside the selected, labelled, unprivileged Linux container. */
function runDocker(args: string[], options: RunOptions = {}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(dockerExecutable(), args, { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let size = 0;
    let done = false;
    const finishError = (error: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      child.kill();
      reject(error);
    };
    const timer = setTimeout(() => finishError(new Error(`Docker operation timed out after ${Math.round((options.timeout || 30000) / 1000)} seconds.`)), options.timeout || 30000);
    child.on('error', error => finishError(new Error(`Docker Desktop is unavailable: ${error.message}`)));
    for (const [stream, target] of [[child.stdout, 'stdout'], [child.stderr, 'stderr']] as const) {
      stream.setEncoding('utf8');
      stream.on('data', (data: string) => {
        size += Buffer.byteLength(data);
        if (size > (options.limit || 8 * 1024 * 1024)) {
          finishError(new Error('Docker operation exceeded its output limit.'));
          return;
        }
        if (target === 'stdout') stdout += data;
        else stderr += data;
        options.onLog?.(data);
      });
    }
    child.stdin.on('error', () => { /* Early Docker failures are reported by exit. */ });
    child.on('close', code => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? 1 });
    });
    child.stdin.end(options.input);
  });
}

function failure(result: CommandResult): string {
  return (result.stderr || result.stdout || `Docker exited with code ${result.exitCode}`).trim().slice(0, 3000);
}
async function checked(args: string[], options?: RunOptions): Promise<CommandResult> {
  const result = await runDocker(args, options);
  if (result.exitCode !== 0) throw new Error(failure(result));
  return result;
}
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function createRuntime(options: RuntimeOptions): RuntimeService {
  const installation = createHash('sha256').update(path.resolve(options.dataDir).toLowerCase()).digest('hex').slice(0, 12);
  const runtimeDir = path.join(options.dataDir, 'runtime');
  const secretsFile = path.join(runtimeDir, 'desktop-secrets.json');
  const pending = new Map<string, Promise<WorkspaceInfo>>();
  const ready = new Map<string, WorkspaceInfo>();
  let building: Promise<RuntimeStatus> | undefined;
  const sessionPasswords=new Map<string,string>();
  const resourceName = (botId: string) => `ibot-${installation}-${createHash('sha256').update(validateBotId(botId)).digest('hex').slice(0, 16)}`;
  const labels = (botId: string) => ['--label', `${MANAGED_LABEL}=true`, '--label', `${INSTALL_LABEL}=${installation}`, '--label', `${BOT_LABEL}=${botId}`];
  const update = (info: WorkspaceInfo) => { options.onUpdate?.(info); return info; };
  const policyWrites=new Map<string,Promise<void>>();
  async function setNetworkPolicy(botId:string,input:string[]){
    const hosts=normalizeNetworkHosts(input),directory=path.join(runtimeDir,'egress',resourceName(botId));
    const prior=policyWrites.get(botId)??Promise.resolve();
    const write=prior.catch(()=>{}).then(async()=>{
      await mkdir(directory,{recursive:true,mode:0o755});
      const file=path.join(directory,'policy.json'),temporary=`${file}.${randomUUID()}.tmp`;
      try {await writeFile(temporary,JSON.stringify({hosts}),{mode:0o644,flag:'wx'});await rename(temporary,file);}
      catch(error){await unlink(file).catch(()=>{});await unlink(temporary).catch(()=>{});throw error;}
    });policyWrites.set(botId,write);try{await write;}finally{if(policyWrites.get(botId)===write)policyWrites.delete(botId);}
  }

  async function ensureGateway(botId:string,beforeEffect?:()=>void){
    const base=resourceName(botId),network=`${base}-restricted`,gateway=`${base}-egress`;
    beforeEffect?.();await setNetworkPolicy(botId,options.networkHosts?.(botId)??[]);beforeEffect?.();
    const existing=await lookup('network',network);
    if(existing){verifyOwner(existing,botId);if(!existing.Internal)throw new Error('The bot network is not internal. Refusing unrestricted execution.');}
    else {
      // Docker's default /16 allocations exhaust quickly for per-bot networks.
      // Each private /29 needs only a bridge, a workspace and its gateway.
      const start=parseInt(createHash('sha256').update(network).digest('hex').slice(0,4),16)%8192;
      for(let attempt=0;attempt<32;attempt++){
        const slot=(start+attempt)%8192,subnet=`10.203.${Math.floor(slot/32)}.${(slot%32)*8}/29`;
        beforeEffect?.();const created=await runDocker(['network','create',...labels(botId),'--driver','bridge','--internal','--subnet',subnet,network]);
        if(created.exitCode===0)break;
        if(attempt===31||!/overlap/i.test(created.stderr))throw new Error(failure(created));
      }
    }
    let object=await lookup('container',gateway);
    if(object){verifyOwner(object,botId);if(object.Config?.Labels?.[EGRESS_LABEL]!=='2')throw new Error('The gateway configuration is unsupported.');}
    else {
      beforeEffect?.();await checked(['create','--name',gateway,...labels(botId),'--label',`${EGRESS_LABEL}=2`,
        '--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges=true','--read-only',
        '--cpus','0.5','--memory','256m','--pids-limit','64','--network','bridge','--no-healthcheck',
        '--publish','127.0.0.1::6080',
        '--log-opt','max-size=5m','--log-opt','max-file=3',
        '--mount',`type=bind,source=${path.join(runtimeDir,'egress',base)},target=/run/ibot-egress,readonly`,
        '--entrypoint','python3','--restart','no',IMAGE,'/opt/ibot/egress_proxy.py']);
      beforeEffect?.();await checked(['network','connect','--alias','egress',network,gateway]);object=await lookup('container',gateway);
    }
    if(!object?.State?.Running){beforeEffect?.();await checked(['start',gateway]);}
    return network;
  }

  async function secret(botId: string, beforeEffect?:()=>void): Promise<string> {
    validateBotId(botId);beforeEffect?.();
    if(!sessionPasswords.has(botId)){
      // Legacy host passwords are generated desktop credentials, not account tokens.
      // The new sidecar owns VNC files; only this host process retains the session password.
      await unlink(secretsFile).catch(error=>{if(error.code!=='ENOENT')throw new Error('Legacy desktop credentials could not be removed.');});
      beforeEffect?.();sessionPasswords.set(botId,randomBytes(12).toString('base64url').slice(0,8));
    }
    return sessionPasswords.get(botId)!;
  }

  function verifyOwner(object: DockerObject, botId: string): void {
    const actual = object.Config?.Labels || object.Labels || {};
    if (actual[MANAGED_LABEL] !== 'true' || actual[INSTALL_LABEL] !== installation || actual[BOT_LABEL] !== botId) {
      throw new Error('Refusing to access a Docker resource that is not owned by this bot and this OpenIbot installation.');
    }
  }
  async function lookup(kind: 'container' | 'network' | 'volume', name: string): Promise<DockerObject | undefined> {
    const result = await runDocker([kind, 'inspect', name]);
    if (result.exitCode !== 0) {
      if (/no such (?:object|container|network|volume)|not found|does not exist/i.test(result.stderr)) return undefined;
      throw new Error(failure(result));
    }
    return (JSON.parse(result.stdout) as DockerObject[])[0];
  }

  async function inspect(botId: string, beforeEffect?:()=>void): Promise<WorkspaceInfo> {
    validateBotId(botId);
    const name = resourceName(botId);
    try {
      const object = await lookup('container', name);
      if (!object){ready.delete(botId);return { botId, status: 'not-created' };}
      verifyOwner(object, botId);
      if (!object.State?.Running){ready.delete(botId);return { botId, status: 'stopped', containerName: name };}
      if(object.Config?.Labels?.[EGRESS_LABEL]!=='2')throw new Error('This computer uses a legacy unrestricted network. Stop it, then start it to upgrade; workspace files are preserved.');
      const gateway=await lookup('container',`${name}-egress`);if(!gateway)throw new Error('The trusted network gateway is missing.');verifyOwner(gateway,botId);
      const binding = gateway.NetworkSettings?.Ports?.['6080/tcp']?.find(port => port.HostIp === '127.0.0.1');
      if (!binding || !/^\d{1,5}$/.test(binding.HostPort)) throw new Error('This bot computer is missing its local desktop port.');
      if(!sessionPasswords.has(botId))throw new Error('This desktop belongs to an earlier app session. Start the computer to reconnect safely.');
      const desktop=await lookup('container',`${name}-desktop`);if(!desktop?.State?.Running)throw new Error('The isolated desktop is not running. Start the computer.');verifyOwner(desktop,botId);
      const password = await secret(botId,beforeEffect);
      const desktopUrl = `http://127.0.0.1:${binding.HostPort}/desktop.html#password=${encodeURIComponent(password)}`;
      if (desktop.State!.Health?.Status === 'unhealthy') return { botId, status: 'error', containerName: name, error: 'The Linux desktop is not responding. Stop and restart this computer.' };
      return { botId, status: desktop.State!.Health?.Status === 'starting' ? 'starting' : 'running', containerName: name, desktopUrl };
    } catch (error) {
      ready.delete(botId);
      return { botId, status: 'error', error: (error as Error).message };
    }
  }

  async function status(): Promise<RuntimeStatus> {
    try {
      const result = await runDocker(['info', '--format', '{{.OSType}}'], { timeout: 12000 });
      if (result.exitCode !== 0) return { available: false, imageReady: false, building: !!building, message: 'Start Docker Desktop in Linux-container mode to run bot computers. ' + failure(result) };
      if (result.stdout.trim() !== 'linux') return { available: false, imageReady: false, message: 'Switch Docker Desktop to Linux containers.' };
      const image = await runDocker(['image', 'inspect', IMAGE, '--format', '{{index .Config.Labels "app.ibot.egress-image"}}']);
      const ready=image.exitCode===0&&image.stdout.trim()==='2';
      return { available: true, imageReady: ready, building: !!building, message: ready ? 'Linux computers are ready. Each bot has its own persistent computer and network gateway.' : 'Build the updated Linux computer image in Settings to enable the network gateway.' };
    } catch (error) {
      return { available: false, imageReady: false, building: !!building, message: (error as Error).message };
    }
  }

  async function buildImage(onLog?: (line: string) => void): Promise<RuntimeStatus> {
    if (building) return building;
    building = (async () => {
      const current = await status();
      if (!current.available) return current;
      const candidates = [path.join(options.resourcesDir, 'containers'), options.resourcesDir];
      const context = candidates.find(candidate => existsSync(path.join(candidate, 'Dockerfile')));
      if (!context) throw new Error('The Linux computer build files are missing from this installation.');
      onLog?.('Building the Linux computer image. The first build downloads Debian, Chromium, and desktop tools.\n');
      await checked(['build', '--pull', '--tag', IMAGE, '--label', 'app.ibot.workspace-image=1', context], { timeout: 30 * 60 * 1000, limit: 32 * 1024 * 1024, onLog });
      return { available: true, imageReady: true, building: false, message: 'Linux computer image built successfully.' };
    })();
    try { return await building; } finally { building = undefined; }
  }

  async function ensureResource(kind: 'network' | 'volume', name: string, botId: string, beforeEffect?:()=>void): Promise<void> {
    const existing = await lookup(kind, name);
    if (existing) { verifyOwner(existing, botId); return; }
    beforeEffect?.();
    await checked(kind === 'network'
      ? ['network', 'create', ...labels(botId), '--driver', 'bridge', '--opt', 'com.docker.network.bridge.enable_icc=false', name]
      : ['volume', 'create', ...labels(botId), name]);
  }

  async function provision(botId: string, beforeEffect?:()=>void): Promise<WorkspaceInfo> {
    const name = resourceName(botId);
    update({ botId, status: 'starting', containerName: name });
    const current = await status();
    if (!current.available) throw new Error(current.message);
    if (!current.imageReady) throw new Error('Build the Linux computer image in Settings → Computers first.');
    const coldSession=!sessionPasswords.has(botId);
    const password = await secret(botId,beforeEffect);
    let object = await lookup('container', name);
    if (object) verifyOwner(object, botId);
    if(object&&object.Config?.Labels?.[EGRESS_LABEL]!=='2'){
      if(object.State?.Running)throw new Error('Stop this legacy computer before upgrading its network. Workspace files are preserved.');
      beforeEffect?.();await checked(['rm',name]);object=undefined;
    }
    const network=await ensureGateway(botId,beforeEffect);
    if (!object) {
      await ensureResource('volume', `${name}-shellhome`, botId,beforeEffect);
      await ensureResource('volume', `${name}-work`, botId,beforeEffect);
      beforeEffect?.();
      await checked(['create', '--name', name, ...labels(botId), '--hostname', 'ibot',
        '--label',`${EGRESS_LABEL}=2`,
        '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges=true',
        '--cpus', '2', '--memory', '2g', '--memory-swap', '2g', '--pids-limit', '256', '--shm-size', '256m',
        '--network', network, '--network-alias','agent','--dns','127.0.0.1',
        '--env','HTTP_PROXY=http://egress:3128','--env','HTTPS_PROXY=http://egress:3128',
        '--env','http_proxy=http://egress:3128','--env','https_proxy=http://egress:3128','--env','NO_PROXY=localhost,127.0.0.1',
        '--mount', `type=volume,source=${name}-shellhome,target=/home/bot`,
        '--mount', `type=volume,source=${name}-work,target=/workspace`,
        '--no-healthcheck','--entrypoint','/usr/bin/tini','--restart','no',IMAGE,'--','sleep','infinity']);
      object = await lookup('container', name);
    }
    if (!object?.State?.Running) {
      beforeEffect?.();
      await checked(['start', name]);
    }
    await ensureResource('volume',`${name}-home`,botId,beforeEffect);
    const desktopName=`${name}-desktop`;let desktop=await lookup('container',desktopName);
    if(desktop)verifyOwner(desktop,botId);
    if(!desktop){
      beforeEffect?.();await checked(['create','--name',desktopName,...labels(botId),'--label',`${EGRESS_LABEL}=2`,
        '--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges=true',
        '--cpus','2','--memory','2g','--pids-limit','256','--shm-size','256m',
        '--network',network,'--network-alias','workspace','--dns','127.0.0.1',
        '--env','HTTP_PROXY=http://egress:3128','--env','HTTPS_PROXY=http://egress:3128',
        '--env','http_proxy=http://egress:3128','--env','https_proxy=http://egress:3128',
        '--mount',`type=volume,source=${name}-home,target=/home/bot`,
        '--mount',`type=volume,source=${name}-work,target=/workspace`,
        '--restart','no',IMAGE]);desktop=await lookup('container',desktopName);
    }
    if(desktop?.State?.Running&&coldSession){beforeEffect?.();await checked(['stop','--time','5',desktopName]);desktop.State.Running=false;}
    if(!desktop?.State?.Running){
      beforeEffect?.();await checked(['start',desktopName]);
      // Only the trusted host can inject credentials into the isolated desktop.
      beforeEffect?.();await checked(['exec','-i',desktopName,'python3','-c','import os,sys; fd=os.open("/tmp/ibot-vnc-secret",os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW,0o600); os.write(fd,sys.stdin.buffer.read(64)); os.close(fd)'],{input:`${password}\n`});
    }
    const deadline = Date.now() + 75000;
    while (Date.now() < deadline) {
      const info = await inspect(botId,beforeEffect);
      if (info.status === 'error' || info.status === 'stopped') throw new Error(info.error || 'The Linux computer stopped while starting.');
      if (info.desktopUrl) {
        try {
          const response = await fetch(info.desktopUrl.split('#')[0], { signal: AbortSignal.timeout(1500) });
          if (response.ok) {
            const vnc = await runDocker(['exec', desktopName, 'python3', '-c', 'import socket; s=socket.create_connection(("127.0.0.1",5900),2); assert s.recv(3)==b"RFB"; s.close()'], { timeout: 5000 });
            if (vnc.exitCode === 0) {const running=update({ ...info, status: 'running' });ready.set(botId,running);return running;}
          }
        } catch { /* Wait for desktop, VNC, and websocket proxy to become ready. */ }
      }
      await pause(500);
    }
    throw new Error('Linux computer startup timed out. Check Docker Desktop resources and retry.');
  }

  async function ensure(botId: string, beforeEffect?:()=>void): Promise<WorkspaceInfo> {
    validateBotId(botId);
    beforeEffect?.();
    if (pending.has(botId)) return pending.get(botId)!;
    if (ready.has(botId)) return structuredClone(ready.get(botId)!);
    const promise = provision(botId,beforeEffect).catch(error => {
      update({ botId, status: 'error', error: (error as Error).message });
      throw error;
    }).finally(() => pending.delete(botId));
    pending.set(botId, promise);
    return promise;
  }

  async function stop(botId: string): Promise<void> {
    validateBotId(botId);
    ready.delete(botId);
    await pending.get(botId)?.catch(() => undefined);
    const name = resourceName(botId);
    const object = await lookup('container', name);
    if (object){verifyOwner(object, botId);if (object.State?.Running) await checked(['stop', '--time', '8', name], { timeout: 20000 });}
    const desktop=await lookup('container',`${name}-desktop`);if(desktop){verifyOwner(desktop,botId);if(desktop.State?.Running)await checked(['stop','--time','5',`${name}-desktop`],{timeout:15000});}
    const gateway=await lookup('container',`${name}-egress`);if(gateway){verifyOwner(gateway,botId);if(gateway.State?.Running)await checked(['stop','--time','3',`${name}-egress`],{timeout:10000});}
    update({ botId, status: 'stopped', containerName: name });
  }

  async function exec(botId: string, command: string, signal?: AbortSignal, beforeEffect?:()=>void): Promise<CommandResult> {
    validateBotId(botId);
    if (typeof command !== 'string' || command.length > 131072 || command.includes('\0')) throw new Error('Invalid Linux command.');
    if (signal?.aborted) throw new Error('Command cancelled.');
    await ensure(botId,beforeEffect);
    if (signal?.aborted) throw new Error('Command cancelled.');
    const name = resourceName(botId);
    const identifier = randomUUID();
    const cancel = () => { void runDocker(['exec', name, 'python3', '/opt/ibot/run_command.py', '--cancel', identifier], { timeout: 10000 }).catch(() => undefined); };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      beforeEffect?.();
      const result = await checked(['exec', '-i', name, 'python3', '/opt/ibot/run_command.py'], { input: JSON.stringify({ id: identifier, command, timeout: 120 }), timeout: 140000, limit: 12 * 1024 * 1024 });
      if (signal?.aborted) throw new Error('Command cancelled.');
      const value = JSON.parse(result.stdout) as CommandResult;
      if (typeof value.stdout !== 'string' || typeof value.stderr !== 'string' || typeof value.exitCode !== 'number') throw new Error('The bot computer returned an invalid command result.');
      return value;
    } finally { signal?.removeEventListener('abort', cancel); }
  }

  async function computer(botId:string,args:Record<string,unknown>,signal?:AbortSignal,beforeEffect?:()=>void):Promise<CommandResult>{
    const command=desktopCommand(args);validateBotId(botId);signal?.throwIfAborted();await ensure(botId,beforeEffect);signal?.throwIfAborted();beforeEffect?.();return checked(['exec',`${resourceName(botId)}-desktop`,...command]);
  }

  async function files<T>(botId: string, request: Record<string, unknown>, beforeEffect?:()=>void): Promise<T> {
    validateBotId(botId);
    validateWorkspacePath(String(request.path));
    await ensure(botId,beforeEffect);
    beforeEffect?.();
    const result = await runDocker(['exec', '-i', resourceName(botId), 'python3', '/opt/ibot/workspace_files.py'], { input: JSON.stringify(request), timeout: 90000, limit: MAX_FILE_BYTES * 2 });
    let payload: { ok: boolean; result: T; error?: string };
    try { payload = JSON.parse(result.stdout); } catch { throw new Error(failure(result)); }
    if (!payload.ok || result.exitCode !== 0) throw new Error(payload.error || failure(result));
    return payload.result;
  }

  async function readBytes(botId: string, file: string, beforeEffect?:()=>void): Promise<Buffer> {
    const result = await files<{ data: string }>(botId, { op: 'read', path: validateWorkspacePath(file, false) },beforeEffect);
    return Buffer.from(result.data, 'base64');
  }
  async function writeBytes(botId: string, file: string, bytes: Buffer, beforeEffect?:()=>void): Promise<void> {
    validateWorkspacePath(file, false);
    if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('Files must be smaller than 64 MiB.');
    await files(botId, { op: 'write', path: file, data: bytes.toString('base64') },beforeEffect);
  }

  return {
    status, buildImage, ensure, inspect, stop, exec, setNetworkPolicy,
    computer,
    openBrowser:(botId,url,signal,beforeEffect)=>{return computer(botId,{action:'open',url},signal,beforeEffect);},
    listFiles: (botId: string, directory = '/workspace',beforeEffect?:()=>void) => files<WorkspaceFile[]>(botId, { op: 'list', path: validateWorkspacePath(directory) },beforeEffect),
    readFile: async (botId, file,beforeEffect) => {
      const bytes = await readBytes(botId, file,beforeEffect);
      if (bytes.length > 2 * 1024 * 1024) throw new Error('Text preview is limited to 2 MiB. Export this file instead.');
      if (bytes.includes(0)) throw new Error('This is a binary file. Use Save to PC to open it.');
      try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new Error('This file is not UTF-8 text. Use Save to PC to open it.'); }
    },
    writeFile: (botId, file, content,beforeEffect) => writeBytes(botId, file, Buffer.from(content, 'utf8'),beforeEffect),
    shareFile: async (sourceBotId, sourcePath, targetBotId, targetPath,beforeEffect) => {
      await writeBytes(targetBotId, targetPath, await readBytes(sourceBotId, sourcePath,beforeEffect),beforeEffect);
    },
    importFile: async (botId, source, name,beforeEffect) => {
      validateBotId(botId);
      if (typeof name !== 'string' || !name || /[\/\\\0]/.test(name) || name === '.' || name === '..') throw new Error('Invalid import file name.');
      const info = await stat(source);
      if (!info.isFile() || info.size > MAX_FILE_BYTES) throw new Error('Choose a regular file smaller than 64 MiB.');
      beforeEffect?.();
      await writeBytes(botId, `/workspace/${name}`, await readFile(source),beforeEffect);
    },
    exportFile: async (botId, file, destination) => {
      const bytes = await readBytes(botId, file);
      // Destination is supplied only by Electron's native save dialog, never by bots.
      await writeFile(destination, bytes);
    },
    screenshot: async (botId,beforeEffect) => {
      validateBotId(botId);
      await ensure(botId,beforeEffect);
      beforeEffect?.();
      const result = await checked(['exec', `${resourceName(botId)}-desktop`, 'python3', '-c', 'from PIL import ImageGrab; import io,base64; image=ImageGrab.grab(xdisplay=":0"); image.thumbnail((1440,900)); out=io.BytesIO(); image.save(out,format="JPEG",quality=78); print(base64.b64encode(out.getvalue()).decode())'], { timeout: 15000 });
      const data = result.stdout.trim();
      if (!/^[A-Za-z0-9+/]+=*$/.test(data)) throw new Error('The desktop screenshot was invalid.');
      return `data:image/jpeg;base64,${data}`;
    },
  };
}
