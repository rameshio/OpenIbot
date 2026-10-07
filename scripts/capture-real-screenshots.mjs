import { _electron as electron } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

(async () => {
  await mkdir('docs/assets', { recursive: true });
  
  console.log('Launching Electron...');
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(2000); // Wait for UI to settle
  
  console.log('Capturing Task Composer...');
  // Fill the task
  const promptInput = window.locator('textarea, input[placeholder*="Message"]');
  if (await promptInput.count() > 0) {
    await promptInput.first().fill("Research whether small language models can be useful for local AI applications on consumer hardware. Compare advantages, limitations, and practical use cases, then prepare a short report.");
    await window.waitForTimeout(500);
    await window.screenshot({ path: 'docs/assets/task-composer.png' });
    
    // Start task
    const sendButton = window.locator('button[aria-label="Send message"], button:has(.lucide-arrow-up)');
    if (await sendButton.count() > 0) {
      await sendButton.first().click();
      console.log('Task started');
    }
  } else {
    // Take a generic screenshot if we can't find it
    await window.screenshot({ path: 'docs/assets/task-composer.png' });
  }

  // Wait a bit for agents to start working
  await window.waitForTimeout(3000);

  // Capture agents view
  console.log('Capturing Agents View...');
  // Find a tab or button that says "Agents" or just show the sidebar
  const agentsTab = window.getByText('Agents', { exact: true });
  if (await agentsTab.count() > 0) {
    await agentsTab.first().click();
    await window.waitForTimeout(1000);
  }
  await window.screenshot({ path: 'docs/assets/agents-view.png' });

  // Capture Graph view
  console.log('Capturing Graph View...');
  const graphTab = window.getByText('Graph', { exact: true });
  if (await graphTab.count() > 0) {
    await graphTab.first().click();
    await window.waitForTimeout(1000);
    await window.screenshot({ path: 'docs/assets/graph-view.png' });
  } else {
    console.log('Graph tab not found, skipping graph-view screenshot to avoid fake data.');
  }

  // Wait more time to let output generate if any mock is running
  await window.waitForTimeout(5000);

  // Capture files view
  console.log('Capturing Files View...');
  const filesTab = window.getByText('Files', { exact: true });
  if (await filesTab.count() > 0) {
    await filesTab.first().click();
    await window.waitForTimeout(1000);
    await window.screenshot({ path: 'docs/assets/files-view.png' });
  } else {
    console.log('Files tab not found, skipping files-view screenshot.');
  }

  // Completed task
  console.log('Capturing Completed Task...');
  await window.screenshot({ path: 'docs/assets/completed-task.png' });

  // Capture Hero (maybe go back to chat)
  console.log('Capturing Hero...');
  const chatTab = window.getByText('Chat', { exact: true });
  if (await chatTab.count() > 0) {
    await chatTab.first().click();
    await window.waitForTimeout(1000);
  }
  await window.screenshot({ path: 'docs/assets/openibot-hero.png' });

  await electronApp.close();
  console.log('Screenshots done.');
})();
