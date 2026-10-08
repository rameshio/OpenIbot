import {_electron as electron} from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

// Always capture a disposable profile, never the user's bots, keys, or messages.
const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'docs/assets/demo');
const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openibot-demo-'));
await fs.mkdir(output, {recursive: true});
const env = {...process.env, IBOT_DATA_DIR: dataDir, IBOT_TEST: '1'};
delete env.ELECTRON_RUN_AS_NODE;
delete env.IBOT_DEV_URL;
const app = await electron.launch({args: [root], env, timeout: 60000});
const errors = [];
try {
  const page = await app.firstWindow();
  await app.evaluate(({BrowserWindow}) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.setSize(1360, 850);
    win.setOpacity(0);
    win.showInactive();
    win.webContents.setBackgroundThrottling(false);
  });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  const composer = page.getByRole('textbox', {name: 'Message your bot'});
  await composer.waitFor();
  await page.evaluate(() => window.ibot.invoke('settings.update', {settings: {theme: 'dark', motion: 'off'}}));
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark' && document.documentElement.dataset.motion === 'off');
  const shot = name => page.screenshot({path: path.join(output, `${name}-screen.png`), animations: 'disabled'});

  await page.getByRole('button', {name: 'Connect a model', exact: true}).click();
  await page.getByRole('dialog', {name: 'Settings'}).waitFor();
  await page.getByRole('heading', {name: 'Your connections', exact: true}).waitFor();
  await shot('01-connect');
  await page.keyboard.press('Escape');
  await composer.fill('Plan a three-day study schedule. I have one hour each evening. Include a checklist.');
  await shot('02-task');

  await page.getByRole('button', {name: 'Create a bot', exact: true}).click();
  await page.locator('.messages').getByText("I'm ready to help. What would you like me to help you with?", {exact: true}).waitFor();
  await shot('03-bot');
  const state = await page.evaluate(() => window.ibot.invoke('state.get'));
  assert.equal(state.settings.connections.length, 0, 'No provider connection or API key in the demo');
  assert.equal(state.bots.length, 2, 'Actual direct bot creation succeeds');
  // Illustrate result rendering without a provider call or a claim of a live run.
  const chat = state.chats[0];
  const createdAt = '2026-10-07T18:00:00.000Z';
  state.messages = [
    {id: 'demo-user', chatId: chat.id, role: 'user', content: 'Plan a three-day study schedule. I have one hour each evening. Include a checklist.', createdAt},
    {id: 'demo-result', chatId: chat.id, botId: chat.botIds[0], role: 'assistant', content: '### Sample study plan\n\nIllustrative demo content — not a live AI response.\n\n- **Day 1:** Review notes for 40 minutes. List weak topics for 20 minutes.\n- **Day 2:** Practice questions for 45 minutes. Review mistakes for 15 minutes.\n- **Day 3:** Take a 40-minute practice quiz. Revisit weak topics for 20 minutes.\n\n### Checklist\n- [ ] Gather notes and practice questions.\n- [ ] Set aside one hour each evening.\n- [ ] Review the plan and adjust it to your subject.', createdAt}
  ];
  await app.evaluate(({BrowserWindow}, snapshot) => BrowserWindow.getAllWindows()[0].webContents.send('ibot:state', snapshot), state);
  await page.getByRole('heading', {name: 'Sample study plan', exact: true}).waitFor();
  await shot('04-result');
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('Captured four desktop screens; no renderer errors or live model calls.');
} finally {
  await app.close();
  // dataDir was created by this invocation beneath the system temporary directory.
  assert.equal(path.dirname(dataDir), os.tmpdir());
  assert.ok(path.basename(dataDir).startsWith('openibot-demo-'));
  await fs.rm(dataDir, {recursive: true, force: true});
}
