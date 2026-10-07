import { chromium } from '@playwright/test';
import path from 'node:path';

(async () => {
  console.log('Launching browser for graphics...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // 1. Social Preview
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto(`file://${path.resolve('social-preview.html')}`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'docs/assets/openibot-social-preview.png' });
  console.log('Captured docs/assets/openibot-social-preview.png');
  
  // 2. Workflow
  await page.setViewportSize({ width: 1200, height: 400 });
  await page.goto(`file://${path.resolve('workflow.html')}`);
  await page.waitForTimeout(2000); // Wait for mermaid to render
  const workflowEl = await page.$('.mermaid');
  if (workflowEl) {
    await workflowEl.screenshot({ path: 'docs/assets/openibot-workflow.png' });
    console.log('Captured docs/assets/openibot-workflow.png');
  }

  // 3. Providers
  await page.setViewportSize({ width: 1200, height: 600 });
  await page.goto(`file://${path.resolve('providers.html')}`);
  await page.waitForTimeout(2000);
  const providersEl = await page.$('.mermaid');
  if (providersEl) {
    await providersEl.screenshot({ path: 'docs/assets/model-providers.png' });
    console.log('Captured docs/assets/model-providers.png');
  }

  // 4. Lifecycle
  await page.setViewportSize({ width: 1200, height: 600 });
  await page.goto(`file://${path.resolve('lifecycle.html')}`);
  await page.waitForTimeout(2000);
  const lifecycleEl = await page.$('.mermaid');
  if (lifecycleEl) {
    await lifecycleEl.screenshot({ path: 'docs/assets/agent-lifecycle.png' });
    console.log('Captured docs/assets/agent-lifecycle.png');
  }

  await browser.close();
  console.log('Graphics complete!');
})();
