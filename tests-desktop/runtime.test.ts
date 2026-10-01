import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { createRuntime, validateBotId, validateWorkspacePath } from '../desktop/runtime';

test('runtime rejects bot identifiers that could change Docker arguments or resource scope', () => {
  for (const value of ['', '--privileged', 'a/b', '../chief', 'bot one', 'a;whoami', 'a\nb', 'a\0b', 'a'.repeat(65)]) {
    assert.throws(() => validateBotId(value), /Invalid bot/);
  }
  for (const value of ['chief', 'bot_42', 'a-b-c', '5b33d0e7-432b-4ddc-931d-282a53d77fb1']) assert.equal(validateBotId(value), value);
});

test('attachment paths remain strictly below /workspace', () => {
  assert.equal(validateWorkspacePath('/workspace'), '/workspace');
  assert.equal(validateWorkspacePath('/workspace/project//report.md'), '/workspace/project/report.md');
  for (const value of ['/etc/passwd', '/workspace-other/key', '/workspace/../home/bot/key', '/workspace/a/../../etc/passwd', '/workspace/./note', 'note.md', 'C:\\Windows\\win.ini', '/workspace/a\0b', '/workspace/a\\b']) {
    assert.throws(() => validateWorkspacePath(value));
  }
  assert.throws(() => validateWorkspacePath('/workspace', false), /file name/);
});

test('invalid requests fail before contacting Docker', async () => {
  const runtime = createRuntime({ dataDir: path.join(os.tmpdir(), 'ibot-runtime-validation'), resourcesDir: process.cwd() });
  await assert.rejects(runtime.ensure('--privileged'), /Invalid bot/);
  await assert.rejects(runtime.exec('../other-bot', 'whoami'), /Invalid bot/);
  await assert.rejects(runtime.readFile('chief', '/etc/passwd'), /inside \/workspace/);
  await assert.rejects(runtime.writeFile('chief', '/workspace/../outside', 'x'), /traversal/);
  await assert.rejects(runtime.importFile('chief', 'not-opened', '../outside'), /Invalid import/);
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(runtime.exec('chief', 'sleep 60', cancelled.signal), /cancelled/);
});
