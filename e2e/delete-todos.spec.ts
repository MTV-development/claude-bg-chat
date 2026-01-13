import { test, expect } from '@playwright/test';

test.describe('Delete Todos', () => {
  test.beforeEach(async ({ page }) => {
    // Collect console messages for debugging
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[RealtimeSync]') || text.includes('DELETE')) {
        console.log(`[console] ${text}`);
      }
    });

    await page.goto('/');

    // Wait for sync to be established
    await expect(page.locator('text=Synced in realtime')).toBeVisible({ timeout: 10000 });
  });

  test('delete button is disabled when no tasks are selected', async ({ page }) => {
    // Click on Today tab to ensure we're there
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);

    // Find the delete button
    const deleteButton = page.locator('[data-testid="delete-button"]');

    // Delete button should exist and be disabled
    await expect(deleteButton).toBeVisible();
    await expect(deleteButton).toBeDisabled();

    // Should show just "Delete" without a count
    await expect(deleteButton).toHaveText('Delete');
  });

  test('delete button shows count when tasks are selected', async ({ page }) => {
    // Click on Today tab
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);

    // Find todo checkboxes
    const todoCheckboxes = page.locator('ul > li button[title="Select"]');
    const hasItems = await todoCheckboxes.count() > 0;

    if (hasItems) {
      // Select the first todo
      await todoCheckboxes.first().click();
      console.log('Selected first todo');

      // Delete button should be enabled and show count
      const deleteButton = page.locator('[data-testid="delete-button"]');
      await expect(deleteButton).toBeEnabled();
      await expect(deleteButton).toHaveText('Delete (1)');
    } else {
      console.log('No todos in Today tab, skipping test');
    }
  });

  test('select all checkbox selects and deselects all tasks', async ({ page }) => {
    // Click on Today tab
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);

    // Find todo items
    const todoItems = page.locator('ul > li').filter({ has: page.locator('p.font-medium') });
    const todoCount = await todoItems.count();

    if (todoCount > 0) {
      // Find the select all checkbox
      const selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]');
      await expect(selectAllCheckbox).toBeVisible();

      // Click select all
      await selectAllCheckbox.click();
      console.log('Clicked Select All');

      // Delete button should show the count of all todos
      const deleteButton = page.locator('[data-testid="delete-button"]');
      await expect(deleteButton).toHaveText(`Delete (${todoCount})`);

      // Click select all again to deselect
      await selectAllCheckbox.click();
      console.log('Clicked Select All again to deselect');

      // Delete button should be disabled again
      await expect(deleteButton).toBeDisabled();
      await expect(deleteButton).toHaveText('Delete');
    } else {
      console.log('No todos in Today tab, skipping test');
    }
  });

  test('deleting a todo removes it via realtime sync', async ({ page }) => {
    // First, create a new todo that we can safely delete
    const fabButton = page.locator('button').filter({ has: page.locator('svg path[d="M12 4v16m8-8H4"]') });
    await fabButton.click();

    // Wait for modal to open
    await expect(page.locator('h2:has-text("Add Task")')).toBeVisible({ timeout: 5000 });

    // Create a unique test task
    const uniqueTitle = `DELETE-TEST-${Date.now()}`;
    await page.fill('input[placeholder="What needs to be done?"]', uniqueTitle);

    // Click Add
    const modal = page.locator('div.fixed').filter({ has: page.locator('h2:has-text("Add Task")') });
    await modal.locator('button:has-text("Add")').click();

    // Wait for modal to close
    await expect(page.locator('h2:has-text("Add Task")')).toBeHidden({ timeout: 5000 });

    // Wait for the new todo to appear via realtime
    await expect(page.locator(`text=${uniqueTitle}`)).toBeVisible({ timeout: 15000 });
    console.log('Test task created:', uniqueTitle);

    // Now select the task we just created
    const taskItem = page.locator('ul > li').filter({ hasText: uniqueTitle });
    const taskCheckbox = taskItem.locator('button[title="Select"]');
    await taskCheckbox.click();
    console.log('Selected the test task');

    // Click Delete button
    const deleteButton = page.locator('[data-testid="delete-button"]');
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();
    console.log('Clicked Delete button');

    // Confirmation modal should appear
    await expect(page.locator('text=Delete Tasks')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=This cannot be undone')).toBeVisible();

    // Click confirm delete
    await page.click('button:has-text("Delete"):not([data-testid="delete-button"])');
    console.log('Confirmed delete');

    // Wait for the todo to disappear via realtime sync
    await expect(page.locator(`text=${uniqueTitle}`)).toBeHidden({ timeout: 10000 });
    console.log('Task deleted and removed via realtime!');
  });

  test('bulk delete removes multiple todos via realtime', async ({ page }) => {
    // Create two test todos
    const timestamp = Date.now();
    const task1 = `BULK-DELETE-1-${timestamp}`;
    const task2 = `BULK-DELETE-2-${timestamp}`;

    for (const taskTitle of [task1, task2]) {
      const fabButton = page.locator('button').filter({ has: page.locator('svg path[d="M12 4v16m8-8H4"]') });
      await fabButton.click();

      await expect(page.locator('h2:has-text("Add Task")')).toBeVisible({ timeout: 5000 });
      await page.fill('input[placeholder="What needs to be done?"]', taskTitle);

      const modal = page.locator('div.fixed').filter({ has: page.locator('h2:has-text("Add Task")') });
      await modal.locator('button:has-text("Add")').click();

      await expect(page.locator('h2:has-text("Add Task")')).toBeHidden({ timeout: 5000 });
      await expect(page.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 15000 });
      console.log('Created test task:', taskTitle);
    }

    // Use Select All to select both (and any other todos)
    const selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]');
    await selectAllCheckbox.click();
    console.log('Selected all tasks');

    // Note: This will delete ALL tasks in the Today tab, not just our test tasks
    // In a real test environment, you'd want to isolate this better

    // Click Delete button
    const deleteButton = page.locator('[data-testid="delete-button"]');
    await expect(deleteButton).toBeEnabled();

    // Get the count from the button
    const buttonText = await deleteButton.textContent();
    console.log('Delete button text:', buttonText);

    await deleteButton.click();

    // Confirm delete
    await expect(page.locator('text=Delete Tasks')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Delete"):not([data-testid="delete-button"])');
    console.log('Confirmed bulk delete');

    // Wait for both test tasks to disappear
    await expect(page.locator(`text=${task1}`)).toBeHidden({ timeout: 15000 });
    await expect(page.locator(`text=${task2}`)).toBeHidden({ timeout: 15000 });
    console.log('Both tasks deleted via realtime!');
  });

  test('cancel delete does not remove tasks', async ({ page }) => {
    // Click on Today tab
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);

    // Find todo checkboxes
    const todoCheckboxes = page.locator('ul > li button[title="Select"]');
    const hasItems = await todoCheckboxes.count() > 0;

    if (hasItems) {
      // Get the first todo's title
      const firstTodo = page.locator('ul > li').first().locator('p.font-medium');
      const todoTitle = await firstTodo.textContent();
      console.log('First todo title:', todoTitle);

      // Select the first todo
      await todoCheckboxes.first().click();

      // Click Delete
      const deleteButton = page.locator('[data-testid="delete-button"]');
      await deleteButton.click();

      // Confirmation modal should appear
      await expect(page.locator('text=Delete Tasks')).toBeVisible({ timeout: 5000 });

      // Click Cancel instead of confirm
      await page.click('button:has-text("Cancel")');
      console.log('Cancelled delete');

      // Modal should close
      await expect(page.locator('text=Delete Tasks')).toBeHidden({ timeout: 5000 });

      // Task should still be visible
      await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
      console.log('Task still visible after cancel');
    } else {
      console.log('No todos in Today tab, skipping test');
    }
  });

  test('select all works on different tabs', async ({ page }) => {
    // Test that select all works on multiple tabs
    const tabsToTest = ['Today', 'Optional', 'Later', 'Inbox', 'Done'];

    for (const tabName of tabsToTest) {
      await page.click(`button:has-text("${tabName}")`);
      await page.waitForTimeout(300);

      const selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]');

      // Select all should be visible on all content tabs
      await expect(selectAllCheckbox).toBeVisible();
      console.log(`Select All checkbox visible on ${tabName} tab`);
    }
  });
});
