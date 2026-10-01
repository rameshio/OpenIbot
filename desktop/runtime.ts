import { spawn } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { CommandResult, RuntimeService, RuntimeStatus, WorkspaceFile, WorkspaceInfo } from '../shared/types';

const IMAGE = 'ibot-workspace:local';
const MANAGED_LABEL = 'app.ibot.managed';
const INSTALL_LABEL = 'app.ibot.installation';
const BOT_LABEL = 'app.ibot.bot';
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
}
export interface RuntimeOptions {
  dataDir: string;
  resourcesDir: string;
  onUpdate?: (workspace: WorkspaceInfo) => void;
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
  let building: Promise<RuntimeStatus> | undefined;
  let secretsChain: Promise<unknown> = Promise.resolve();
  const resourceName = (botId: string) => `ibot-${installation}-${createHash('sha256').update(validateBotId(botId)).digest('hex').slice(0, 16)}`;
  const labels = (botId: string) => ['--label', `${MANAGED_LABEL}=true`, '--label', `${INSTALL_LABEL}=${installation}`, '--label', `${BOT_LABEL}=${botId}`];
  const update = (info: WorkspaceInfo) => { options.onUpdate?.(info); return info; };

  async function secret(botId: string): Promise<string> {
    validateBotId(botId);
    const job = secretsChain.then(async () => {
      await mkdir(runtimeDir, { recursive: true, mode: 0o700 });
      let secrets: Record<string, string> = {};
      try {
        const value = JSON.parse(await readFile(secretsFile, 'utf8'));
        if (value && typeof value === 'object' && !Array.isArray(value)) secrets = value;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Desktop credentials could not be read. Restore the runtime credentials file before starting this bot.');
      }
      if (typeof secrets[botId] === 'string' && /^[a-zA-Z0-9_-]{8}$/.test(secrets[botId])) return secrets[botId];
      // Standard VNC authentication uses only the first eight characters.
      const password = randomBytes(12).toString('base64url').slice(0, 8);
      Object.defineProperty(secrets, botId, { value: password, enumerable: true, configurable: true, writable: true });
      const temporary = `${secretsFile}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(secrets), { mode: 0o600, flag: 'wx' });
      await rename(temporary, secretsFile);
      return password;
    });
    secretsChain = job.catch(() => undefined);
    return job;
  }

  function verifyOwner(object: DockerObject, botId: string): void {
    const actual = object.Config?.Labels || object.Labels || {};
    if (actual[MANAGED_LABEL] !== 'true' || actual[INSTALL_LABEL] !== installation || actual[BOT_LABEL] !== botId) {
      throw new Error('Refusing to access a Docker resource that is not owned by this bot and this I Bot installation.');
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

  async function inspect(botId: string): Promise<WorkspaceInfo> {
    validateBotId(botId);
    const name = resourceName(botId);
    try {
      const object = await lookup('container', name);
      if (!object) return { botId, status: 'not-created' };
      verifyOwner(object, botId);
      if (!object.State?.Running) return { botId, status: 'stopped', containerName: name };
      const binding = object.NetworkSettings?.Ports?.['6080/tcp']?.find(port => port.HostIp === '127.0.0.1');
      if (!binding || !/^\d{1,5}$/.test(binding.HostPort)) throw new Error('This bot computer is missing its local desktop port.');
      const password = await secret(botId);
      const desktopUrl = `http://127.0.0.1:${binding.HostPort}/desktop.html#password=${encodeURIComponent(password)}`;
      if (object.State.Health?.Status === 'unhealthy') return { botId, status: 'error', containerName: name, error: 'The Linux desktop is not responding. Stop and restart this computer.' };
      return { botId, status: object.State.Health?.Status === 'starting' ? 'starting' : 'running', containerName: name, desktopUrl };
    } catch (error) {
      return { botId, status: 'error', error: (error as Error).message };
    }
  }

  async function status(): Promise<RuntimeStatus> {
    try {
      const result = await runDocker(['info', '--format', '{{.OSType}}'], { timeout: 12000 });
      if (result.exitCode !== 0) return { available: false, imageReady: false, building: !!building, message: 'Start Docker Desktop in Linux-container mode to run bot computers. ' + failure(result) };
      if (result.stdout.trim() !== 'linux') return { available: false, imageReady: false, message: 'Switch Docker Desktop to Linux containers.' };
      const image = await runDocker(['image', 'inspect', IMAGE, '--format', '{{.Id}}']);
      return { available: true, imageReady: image.exitCode === 0, building: !!building, message: image.exitCode === 0 ? 'Linux computers are ready. Each bot has its own persistent computer.' : 'Docker is running. Build the Linux computer image once to get started.' };
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

  async function ensureResource(kind: 'network' | 'volume', name: string, botId: string): Promise<void> {
    const existing = await lookup(kind, name);
    if (existing) { verifyOwner(existing, botId); return; }
    await checked(kind === 'network'
      ? ['network', 'create', ...labels(botId), '--driver', 'bridge', '--opt', 'com.docker.network.bridge.enable_icc=false', name]
      : ['volume', 'create', ...labels(botId), name]);
  }

  async function provision(botId: string): Promise<WorkspaceInfo> {
    const name = resourceName(botId);
    update({ botId, status: 'starting', containerName: name });
    const current = await status();
    if (!current.available) throw new Error(current.message);
    if (!current.imageReady) throw new Error('Build the Linux computer image in Settings → Computers first.');
    const password = await secret(botId);
    let object = await lookup('container', name);
    if (object) verifyOwner(object, botId);
    if (!object) {
      await ensureResource('network', `${name}-net`, botId);
      await ensureResource('volume', `${name}-home`, botId);
      await ensureResource('volume', `${name}-work`, botId);
      await checked(['create', '--name', name, ...labels(botId), '--hostname', 'ibot',
        '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges=true',
        '--cpus', '2', '--memory', '2g', '--memory-swap', '2g', '--pids-limit', '256', '--shm-size', '256m',
        '--network', `${name}-net`, '--publish', '127.0.0.1::6080',
        '--mount', `type=volume,source=${name}-home,target=/home/bot`,
        '--mount', `type=volume,source=${name}-work,target=/workspace`,
        '--restart', 'no', IMAGE]);
      object = await lookup('container', name);
    }
    if (!object?.State?.Running) {
      await checked(['start', name]);
      // The entrypoint waits for this file. No VNC secret in Docker env or argv.
      await checked(['exec', '-i', name, 'python3', '-c', 'import os,sys; fd=os.open("/tmp/ibot-vnc-secret",os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW,0o600); os.write(fd,sys.stdin.buffer.read(64)); os.close(fd)'], { input: `${password}\n` });
    }
    const deadline = Date.now() + 75000;
    while (Date.now() < deadline) {
      const info = await inspect(botId);
      if (info.status === 'error' || info.status === 'stopped') throw new Error(info.error || 'The Linux computer stopped while starting.');
      if (info.desktopUrl) {
        try {
          const response = await fetch(info.desktopUrl.split('#')[0], { signal: AbortSignal.timeout(1500) });
          if (response.ok) {
            const vnc = await runDocker(['exec', name, 'python3', '-c', 'import socket; s=socket.create_connection(("127.0.0.1",5900),2); assert s.recv(3)==b"RFB"; s.close()'], { timeout: 5000 });
            if (vnc.exitCode === 0) return update({ ...info, status: 'running' });
          }
        } catch { /* Wait for desktop, VNC, and websocket proxy to become ready. */ }
      }
      await pause(500);
    }
    throw new Error('Linux computer startup timed out. Check Docker Desktop resources and retry.');
  }

  async function ensure(botId: string): Promise<WorkspaceInfo> {
    validateBotId(botId);
    if (pending.has(botId)) return pending.get(botId)!;
    const promise = provision(botId).catch(error => {
      update({ botId, status: 'error', error: (error as Error).message });
      throw error;
    }).finally(() => pending.delete(botId));
    pending.set(botId, promise);
    return promise;
  }

  async function stop(botId: string): Promise<void> {
    validateBotId(botId);
    await pending.get(botId)?.catch(() => undefined);
    const name = resourceName(botId);
    const object = await lookup('container', name);
    if (!object) return;
    verifyOwner(object, botId);
    if (object.State?.Running) await checked(['stop', '--time', '8', name], { timeout: 20000 });
    update({ botId, status: 'stopped', containerName: name });
  }

  async function exec(botId: string, command: string, signal?: AbortSignal): Promise<CommandResult> {
    validateBotId(botId);
    if (typeof command !== 'string' || command.length > 131072 || command.includes('\0')) throw new Error('Invalid Linux command.');
    if (signal?.aborted) throw new Error('Command cancelled.');
    await ensure(botId);
    if (signal?.aborted) throw new Error('Command cancelled.');
    const name = resourceName(botId);
    const identifier = randomUUID();
    const cancel = () => { void runDocker(['exec', name, 'python3', '/opt/ibot/run_command.py', '--cancel', identifier], { timeout: 10000 }).catch(() => undefined); };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      const result = await checked(['exec', '-i', name, 'python3', '/opt/ibot/run_command.py'], { input: JSON.stringify({ id: identifier, command, timeout: 120 }), timeout: 140000, limit: 12 * 1024 * 1024 });
      if (signal?.aborted) throw new Error('Command cancelled.');
      const value = JSON.parse(result.stdout) as CommandResult;
      if (typeof value.stdout !== 'string' || typeof value.stderr !== 'string' || typeof value.exitCode !== 'number') throw new Error('The bot computer returned an invalid command result.');
      return value;
    } finally { signal?.removeEventListener('abort', cancel); }
  }

  async function files<T>(botId: string, request: Record<string, unknown>): Promise<T> {
    validateBotId(botId);
    validateWorkspacePath(String(request.path));
    await ensure(botId);
    const result = await runDocker(['exec', '-i', resourceName(botId), 'python3', '/opt/ibot/workspace_files.py'], { input: JSON.stringify(request), timeout: 90000, limit: MAX_FILE_BYTES * 2 });
    let payload: { ok: boolean; result: T; error?: string };
    try { payload = JSON.parse(result.stdout); } catch { throw new Error(failure(result)); }
    if (!payload.ok || result.exitCode !== 0) throw new Error(payload.error || failure(result));
    return payload.result;
  }

  async function readBytes(botId: string, file: string): Promise<Buffer> {
    const result = await files<{ data: string }>(botId, { op: 'read', path: validateWorkspacePath(file, false) });
    return Buffer.from(result.data, 'base64');
  }
  async function writeBytes(botId: string, file: string, bytes: Buffer): Promise<void> {
    validateWorkspacePath(file, false);
    if (bytes.byteLength > MAX_FILE_BYTES) throw new Error('Files must be smaller than 64 MiB.');
    await files(botId, { op: 'write', path: file, data: bytes.toString('base64') });
  }

  return {
    status, buildImage, ensure, inspect, stop, exec,
    listFiles: (botId: string, directory = '/workspace') => files<WorkspaceFile[]>(botId, { op: 'list', path: validateWorkspacePath(directory) }),
    readFile: async (botId, file) => {
      const bytes = await readBytes(botId, file);
      if (bytes.length > 2 * 1024 * 1024) throw new Error('Text preview is limited to 2 MiB. Export this file instead.');
      if (bytes.includes(0)) throw new Error('This is a binary file. Use Save to PC to open it.');
      try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
      catch { throw new Error('This file is not UTF-8 text. Use Save to PC to open it.'); }
    },
    writeFile: (botId, file, content) => writeBytes(botId, file, Buffer.from(content, 'utf8')),
    shareFile: async (sourceBotId, sourcePath, targetBotId, targetPath) => {
      await writeBytes(targetBotId, targetPath, await readBytes(sourceBotId, sourcePath));
    },
    importFile: async (botId, source, name) => {
      validateBotId(botId);
      if (typeof name !== 'string' || !name || /[\/\\\0]/.test(name) || name === '.' || name === '..') throw new Error('Invalid import file name.');
      const info = await stat(source);
      if (!info.isFile() || info.size > MAX_FILE_BYTES) throw new Error('Choose a regular file smaller than 64 MiB.');
      await writeBytes(botId, `/workspace/${name}`, await readFile(source));
    },
    exportFile: async (botId, file, destination) => {
      const bytes = await readBytes(botId, file);
      // Destination is supplied only by Electron's native save dialog, never by bots.
      await writeFile(destination, bytes);
    },
    screenshot: async botId => {
      validateBotId(botId);
      await ensure(botId);
      const result = await checked(['exec', resourceName(botId), 'python3', '-c', 'from PIL import ImageGrab; import io,base64; image=ImageGrab.grab(xdisplay=":0"); image.thumbnail((1440,900)); out=io.BytesIO(); image.save(out,format="JPEG",quality=78); print(base64.b64encode(out.getvalue()).decode())'], { timeout: 15000 });
      const data = result.stdout.trim();
      if (!/^[A-Za-z0-9+/]+=*$/.test(data)) throw new Error('The desktop screenshot was invalid.');
      return `data:image/jpeg;base64,${data}`;
    },
  };
}
