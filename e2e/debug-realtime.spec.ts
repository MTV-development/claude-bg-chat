import { test, expect } from '@playwright/test';

test.describe('Debug Realtime Sync', () => {
  test('capture console logs and debug state', async ({ page }) => {
    // Collect all console messages
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleLogs.push(text);
      console.log(text);
    });

    // Collect any errors
    page.on('pageerror', (err) => {
      console.log('[PAGE ERROR]', err.message);
    });

    // Go to the app
    await page.goto('/');

    // Wait a moment for redirects
    await page.waitForTimeout(2000);

    // Log current URL
    console.log('Current URL:', page.url());

    // Take a screenshot
    await page.screenshot({ path: 'e2e/debug-screenshot-1.png', fullPage: true });

    // Check if we're on login page
    const isLoginPage = page.url().includes('/login');
    console.log('Is login page:', isLoginPage);

    if (isLoginPage) {
      console.log('On login page - need to authenticate');
      // Log the page content for debugging
      const content = await page.content();
      console.log('Page has Google button:', content.includes('Google'));
    } else {
      // We're authenticated, wait for sync
      console.log('Authenticated - waiting for sync...');

      // Wait for the TodoSyncProvider logs
      await page.waitForTimeout(3000);

      // Check if we see "Synced in realtime" or "Connecting..."
      const footer = page.locator('text=Synced in realtime');
      const connecting = page.locator('text=Connecting...');

      const isSynced = await footer.isVisible().catch(() => false);
      const isConnecting = await connecting.isVisible().catch(() => false);

      console.log('Footer shows "Synced in realtime":', isSynced);
      console.log('Footer shows "Connecting...":', isConnecting);

      // Take another screenshot
      await page.screenshot({ path: 'e2e/debug-screenshot-2.png', fullPage: true });

      // Check the todo list
      const todoList = page.locator('text=Todo List');
      console.log('Todo List visible:', await todoList.isVisible().catch(() => false));
    }

    // Print all collected console logs
    console.log('\n=== All Console Logs ===');
    consoleLogs.forEach(log => console.log(log));
    console.log('=== End Console Logs ===\n');
  });
});
