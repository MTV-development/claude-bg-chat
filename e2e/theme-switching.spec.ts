import { test, expect } from '@playwright/test';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display theme toggle button', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('switch', { name: /switch to .* mode/i });
    await expect(toggle).toBeVisible();
  });

  test('should start with light theme by default (when no localStorage and no system preference)', async ({ page, context }) => {
    // Emulate light color scheme to avoid system preference affecting test
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    // Wait for theme to be applied
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('should toggle from light to dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const html = page.locator('html');

    // Start in light mode
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Click toggle
    const toggle = page.getByRole('switch', { name: /switch to dark mode/i });
    await toggle.click();

    // Should now be dark mode
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('should toggle from dark to light mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const html = page.locator('html');
    const toggle = page.getByRole('switch');

    // Toggle to dark first
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Toggle back to light
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('should persist theme in localStorage', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    // Toggle to dark
    const toggle = page.getByRole('switch');
    await toggle.click();

    // Verify localStorage was set
    const storedTheme = await page.evaluate(() => localStorage.getItem('theme-preference'));
    expect(storedTheme).toBe('dark');
  });

  test('should load saved theme from localStorage on page load', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });

    // Set localStorage before visiting
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'dark'));

    // Reload to apply saved theme
    await page.reload();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('should update aria-checked attribute when theme changes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const toggle = page.getByRole('switch');

    // Light mode: aria-checked should be false (isDark = false)
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    // Toggle to dark
    await toggle.click();

    // Dark mode: aria-checked should be true (isDark = true)
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  test('should update aria-label when theme changes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const toggle = page.getByRole('switch');

    // Light mode: should offer to switch to dark
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode');

    // Toggle to dark
    await toggle.click();

    // Dark mode: should offer to switch to light
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light mode');
  });

  test('should respect system preference when no localStorage value exists', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('should override system preference with localStorage value', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('theme-preference', 'light'));
    await page.reload();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('should apply visual changes when switching themes', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const body = page.locator('body');

    // Get background color in light mode
    const lightBgColor = await body.evaluate(el =>
      getComputedStyle(el).backgroundColor
    );

    // Toggle to dark mode
    const toggle = page.getByRole('switch');
    await toggle.click();

    // Get background color in dark mode
    const darkBgColor = await body.evaluate(el =>
      getComputedStyle(el).backgroundColor
    );

    // Colors should be different
    expect(lightBgColor).not.toBe(darkBgColor);
  });

  test('should toggle multiple times correctly', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const html = page.locator('html');
    const toggle = page.getByRole('switch');

    // Light -> Dark
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Dark -> Light
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Light -> Dark
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Dark -> Light
    await toggle.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('should preserve theme across navigation', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    // Toggle to dark
    const toggle = page.getByRole('switch');
    await toggle.click();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Navigate away and back
    await page.goto('about:blank');
    await page.goto('/');

    // Should still be dark
    await expect(html).toHaveAttribute('data-theme', 'dark');
  });

  test('toggle button should be keyboard accessible', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const toggle = page.getByRole('switch');
    const html = page.locator('html');

    // Focus the toggle
    await toggle.focus();

    // Verify it has focus
    await expect(toggle).toBeFocused();

    // Press Enter to toggle (should work on buttons)
    await page.keyboard.press('Enter');

    // Should toggle theme
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Press Space to toggle
    await page.keyboard.press('Space');

    // Should toggle back
    await expect(html).toHaveAttribute('data-theme', 'light');
  });
});
