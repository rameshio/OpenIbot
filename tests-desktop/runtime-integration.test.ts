import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRuntime } from '../desktop/runtime';

test('revocation during provisioning prevents runtime credential persistence', {
  skip:process.env.IBOT_RUNTIME_INTEGRATION!=='1',timeout:30000,
},async()=>{
  const dataDir=await mkdtemp(path.join(os.tmpdir(),'ibot-runtime-guard-'));
  const runtime=createRuntime({dataDir,resourcesDir:process.cwd()});
  let checks=0;
  await assert.rejects(runtime.ensure('revoked-fixture',()=>{if(++checks>=2)throw new Error('Fixture policy revoked');}),/policy revoked/);
  const credentials=await readFile(path.join(dataDir,'runtime','desktop-secrets.json'),'utf8').catch(error=>{if(error.code==='ENOENT')return '{}';throw error;});
  assert.equal(Object.hasOwn(JSON.parse(credentials),'revoked-fixture'),false,'Revoked provisioning must not persist a runtime credential');
});

test('real Linux computers isolate files, preserve data, enforce the file bridge, and support cancellation', {
  skip: process.env.IBOT_RUNTIME_INTEGRATION !== '1' ? 'Set IBOT_RUNTIME_INTEGRATION=1 with Docker Desktop running and the workspace image built.' : false,
  timeout: 240000,
}, async t => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'ibot-runtime-test-'));
  let networkHosts:string[]=[];
  const runtime = createRuntime({ dataDir, resourcesDir: process.cwd(),networkHosts:()=>networkHosts });
  const ids = ['isolation-alpha', 'isolation-beta'];
  t.after(async () => { await Promise.all(ids.map(id => runtime.stop(id).catch(() => undefined))); });
  const status = await runtime.status();
  assert.equal(status.available, true, status.message);
  assert.equal(status.imageReady, true, status.message);
  const [alpha, beta] = await Promise.all(ids.map(id => runtime.ensure(id)));
  assert.equal(alpha.status, 'running');
  assert.equal(beta.status, 'running');
  assert.notEqual(alpha.containerName, beta.containerName);
  assert.notEqual(new URL(alpha.desktopUrl!).port, new URL(beta.desktopUrl!).port);
  assert.equal(new URL(alpha.desktopUrl!).hostname, '127.0.0.1');
  assert.equal(alpha.password, undefined);
  assert.notEqual(new URL(alpha.desktopUrl!).hash, new URL(beta.desktopUrl!).hash);
  const desktop = await fetch(alpha.desktopUrl!.split('#')[0]).then(response => response.text());
  assert.match(desktop, /import RFB/);
  assert.match(desktop, /ibot-teach-event/);
  await runtime.writeFile(ids[0], '/workspace/report.md', '# Alpha report');
  await runtime.writeFile(ids[1], '/workspace/report.md', '# Beta report');
  assert.equal(await runtime.readFile(ids[0], '/workspace/report.md'), '# Alpha report');
  assert.equal(await runtime.readFile(ids[1], '/workspace/report.md'), '# Beta report');
  assert.equal((await runtime.exec(ids[0], 'id -u')).stdout.trim(), '1000');
  assert.equal((await runtime.exec(ids[0], 'printf alpha > "$HOME/home-marker"')).exitCode, 0);
  assert.equal((await runtime.exec(ids[1], 'test ! -f "$HOME/home-marker"')).exitCode, 0);
  assert.equal((await runtime.exec(ids[0], 'test ! -S /var/run/docker.sock')).exitCode, 0);
  assert.equal((await runtime.exec(ids[0], 'test ! -e "$HOME/.vnc/passwd"; test ! -d "$HOME/.config/chromium"')).exitCode,0,'Shell identity has no browser or VNC credential files');
  assert.equal(await readFile(path.join(dataDir,'runtime','desktop-secrets.json'),'utf8').then(()=>true,()=>false),false,'VNC credentials are not persisted on the host');
  assert.equal((await runtime.computer!(ids[0],{action:'move',x:10,y:10})).exitCode,0,'Computer control uses the desktop broker');
  assert.equal((await runtime.exec(ids[0], 'test ! -e /run/ibot-egress/policy.json')).exitCode,0,'The shell cannot access gateway policy');
  assert.notEqual((await runtime.exec(ids[0], "timeout 4 python3 -c 'import socket; socket.getaddrinfo(\"example.com\",443)' >/dev/null 2>&1")).exitCode,0,'External DNS cannot bypass the gateway');
  assert.equal((await runtime.exec(ids[0], 'curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://example.com')).stdout,'403','Unknown destinations are denied');
  assert.notEqual((await runtime.exec(ids[0], 'curl -s --proxy "" --connect-timeout 2 --max-time 3 http://93.184.216.34 >/dev/null')).exitCode,0,'Bypassing proxy does not restore direct internet access');
  networkHosts=['example.com'];await runtime.setNetworkPolicy!(ids[0],networkHosts);
  assert.equal((await runtime.exec(ids[0], 'curl -fs -o /dev/null --max-time 20 https://example.com')).exitCode,0,'A user-approved public host works through the gateway');
  assert.equal((await runtime.exec(ids[0], 'curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://unapproved.example.com')).stdout,'403','A host grant never includes subdomains');
  networkHosts=[];await runtime.setNetworkPolicy!(ids[0],networkHosts);
  assert.equal((await runtime.exec(ids[0], 'curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://example.com')).stdout,'403','Revocation is applied without restarting the workspace');
  await runtime.exec(ids[0], 'ln -s /etc /workspace/escape; ln -s /etc/passwd /workspace/linked-file; ln /workspace/report.md /workspace/hardlink');
  await assert.rejects(runtime.readFile(ids[0], '/workspace/escape/passwd'));
  await assert.rejects(runtime.readFile(ids[0], '/workspace/linked-file'));
  await assert.rejects(runtime.writeFile(ids[0], '/workspace/escape/forbidden', 'bad'));
  await assert.rejects(runtime.writeFile(ids[0], '/workspace/linked-file', 'bad'));
  await assert.rejects(runtime.writeFile(ids[0], '/workspace/hardlink', 'bad'), /linked/);
  await runtime.exec(ids[0], 'rm /workspace/hardlink');
  const files = await runtime.listFiles(ids[0]);
  assert(files.some(file => file.name === 'report.md'));
  assert(!files.some(file => file.name === 'escape' || file.name === 'linked-file'));
  const source = path.join(dataDir, 'original.bin');
  const destination = path.join(dataDir, 'exported.bin');
  const bytes = Buffer.from([0, 255, 127, 12, 54]);
  await writeFile(source, bytes);
  await runtime.importFile(ids[0], source, 'binary.bin');
  await runtime.exportFile(ids[0], '/workspace/binary.bin', destination);
  assert.deepEqual(await readFile(destination), bytes);
  await runtime.shareFile(ids[0], '/workspace/binary.bin', ids[1], '/workspace/shared/binary.bin');
  await runtime.exportFile(ids[1], '/workspace/shared/binary.bin', destination);
  assert.deepEqual(await readFile(destination), bytes, 'Bot handoffs preserve binary files');
  const screenshot = await runtime.screenshot(ids[0]);
  assert.match(screenshot, /^data:image\/jpeg;base64,/);
  assert(Buffer.from(screenshot.split(',')[1], 'base64').length > 5000);
  const abort = new AbortController();
  const command = runtime.exec(ids[0], 'sleep 30; touch /workspace/should-never-exist', abort.signal);
  setTimeout(() => abort.abort(), 3000);
  await assert.rejects(command, /cancelled/);
  assert.equal((await runtime.exec(ids[0], 'test ! -e /workspace/should-never-exist; test -z "$(pgrep -f \'^sleep 30$\')"')).exitCode, 0);
  await runtime.stop(ids[0]);
  assert.equal((await runtime.inspect(ids[0])).status, 'stopped');
  await runtime.ensure(ids[0]);
  assert.equal(await runtime.readFile(ids[0], '/workspace/report.md'), '# Alpha report');
  assert.equal((await runtime.exec(ids[0], 'cat "$HOME/home-marker"')).stdout, 'alpha');
  console.log(`Verified isolated computers: ${alpha.containerName}, ${beta.containerName}. Test credentials: ${dataDir}`);
});
