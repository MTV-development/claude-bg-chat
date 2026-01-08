import { test, expect, Page } from '@playwright/test';

/**
 * Visual regression tests for both light and dark themes.
 * These tests capture screenshots and compare them against baseline images
 * to detect unintended visual changes.
 */
test.describe('Visual Regression - Light Theme', () => {
  test.beforeEach(async ({ page }) => {
    // Set light theme explicitly
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('theme-preference', 'light');
    });
    await page.reload();
    // Wait for hydration and theme to be applied
    await page.locator('html[data-theme="light"]').waitFor();
    // Wait for any animations to complete
    await page.waitForTimeout(300);
  });

  test('full page screenshot - light theme', async ({ page }) => {
    await expect(page).toHaveScreenshot('full-page-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('header section - light theme', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header).toHaveScreenshot('header-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('theme toggle button - light theme', async ({ page }) => {
    const toggle = page.getByRole('switch', { name: /switch to dark mode/i });
    await expect(toggle).toHaveScreenshot('theme-toggle-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('chat panel empty state - light theme', async ({ page }) => {
    // Chat panel is the left side
    const chatPanel = page.locator('.flex-1.flex.flex-col').first();
    await expect(chatPanel).toHaveScreenshot('chat-panel-empty-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('input form - light theme', async ({ page }) => {
    const inputForm = page.locator('form').first();
    await expect(inputForm).toHaveScreenshot('input-form-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('example buttons - light theme', async ({ page }) => {
    const exampleButtons = page.locator('.flex.flex-wrap.justify-center.gap-2');
    await expect(exampleButtons).toHaveScreenshot('example-buttons-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe('Visual Regression - Dark Theme', () => {
  test.beforeEach(async ({ page }) => {
    // Set dark theme explicitly
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('theme-preference', 'dark');
    });
    await page.reload();
    // Wait for hydration and theme to be applied
    await page.locator('html[data-theme="dark"]').waitFor();
    // Wait for any animations to complete
    await page.waitForTimeout(300);
  });

  test('full page screenshot - dark theme', async ({ page }) => {
    await expect(page).toHaveScreenshot('full-page-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('header section - dark theme', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header).toHaveScreenshot('header-dark.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('theme toggle button - dark theme', async ({ page }) => {
    const toggle = page.getByRole('switch', { name: /switch to light mode/i });
    await expect(toggle).toHaveScreenshot('theme-toggle-dark.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('chat panel empty state - dark theme', async ({ page }) => {
    const chatPanel = page.locator('.flex-1.flex.flex-col').first();
    await expect(chatPanel).toHaveScreenshot('chat-panel-empty-dark.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('input form - dark theme', async ({ page }) => {
    const inputForm = page.locator('form').first();
    await expect(inputForm).toHaveScreenshot('input-form-dark.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('example buttons - dark theme', async ({ page }) => {
    const exampleButtons = page.locator('.flex.flex-wrap.justify-center.gap-2');
    await expect(exampleButtons).toHaveScreenshot('example-buttons-dark.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe('Visual Regression - Theme Transition', () => {
  test('toggle from light to dark maintains visual consistency', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('html[data-theme="light"]').waitFor();
    await page.waitForTimeout(300);

    // Capture light theme baseline
    const lightScreenshot = await page.screenshot({ fullPage: true });

    // Toggle to dark
    const toggle = page.getByRole('switch');
    await toggle.click();
    await page.locator('html[data-theme="dark"]').waitFor();
    await page.waitForTimeout(300);

    // Capture dark theme
    await expect(page).toHaveScreenshot('transition-to-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });

    // Toggle back to light
    await toggle.click();
    await page.locator('html[data-theme="light"]').waitFor();
    await page.waitForTimeout(300);

    // Capture after toggle back - should match original light theme
    await expect(page).toHaveScreenshot('transition-back-to-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe('Visual Regression - Interactive States', () => {
  test('input focus state - light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'light'));
    await page.reload();
    await page.locator('html[data-theme="light"]').waitFor();
    await page.waitForTimeout(300);

    const input = page.locator('input[type="text"]').first();
    await input.focus();
    await page.waitForTimeout(100);

    await expect(input).toHaveScreenshot('input-focused-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('input focus state - dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'dark'));
    await page.reload();
    await page.locator('html[data-theme="dark"]').waitFor();
    await page.waitForTimeout(300);

    const input = page.locator('input[type="text"]').first();
    await input.focus();
    await page.waitForTimeout(100);

    await expect(input).toHaveScreenshot('input-focused-dark.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('toggle focus state - light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'light'));
    await page.reload();
    await page.locator('html[data-theme="light"]').waitFor();
    await page.waitForTimeout(300);

    const toggle = page.getByRole('switch');
    await toggle.focus();
    await page.waitForTimeout(100);

    await expect(toggle).toHaveScreenshot('toggle-focused-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('toggle focus state - dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'dark'));
    await page.reload();
    await page.locator('html[data-theme="dark"]').waitFor();
    await page.waitForTimeout(300);

    const toggle = page.getByRole('switch');
    await toggle.focus();
    await page.waitForTimeout(100);

    await expect(toggle).toHaveScreenshot('toggle-focused-dark.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('button hover state - light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'light'));
    await page.reload();
    await page.locator('html[data-theme="light"]').waitFor();
    await page.waitForTimeout(300);

    const newChatButton = page.locator('button:has-text("New Chat")');
    await newChatButton.hover();
    await page.waitForTimeout(100);

    await expect(newChatButton).toHaveScreenshot('new-chat-hover-light.png', {
      maxDiffPixelRatio: 0.01,
    });
  });

  test('button hover state - dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'dark'));
    await page.reload();
    await page.locator('html[data-theme="dark"]').waitFor();
    await page.waitForTimeout(300);

    const newChatButton = page.locator('button:has-text("New Chat")');
    await newChatButton.hover();
    await page.waitForTimeout(100);

    await expect(newChatButton).toHaveScreenshot('new-chat-hover-dark.png', {
      maxDiffPixelRatio: 0.01,
    });
  });
});

test.describe('Visual Regression - Responsive', () => {
  test('mobile viewport - light theme', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'light'));
    await page.reload();
    await page.locator('html[data-theme="light"]').waitFor();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('mobile-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('mobile viewport - dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'dark'));
    await page.reload();
    await page.locator('html[data-theme="dark"]').waitFor();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('mobile-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('tablet viewport - light theme', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'light'));
    await page.reload();
    await page.locator('html[data-theme="light"]').waitFor();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('tablet-light.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('tablet viewport - dark theme', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'dark'));
    await page.reload();
    await page.locator('html[data-theme="dark"]').waitFor();
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('tablet-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });
});
