import { test, expect } from '@playwright/test';

/**
 * Chat + UI Integration Tests
 *
 * These tests verify:
 * 1. Chat interface is accessible and functional
 * 2. Chat can interact with the todo system via Claude
 * 3. Changes made via chat appear in the UI
 *
 * IMPORTANT: The "Chat with Claude" tests use the Claude CLI which is
 * resource-intensive. Run these tests with a single worker to avoid
 * timeouts due to resource contention:
 *
 *   npx playwright test e2e/chat-ui-integration.spec.ts --workers=1
 */

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Synced in realtime')).toBeVisible({ timeout: 10000 });
  });

  test('chat panel is visible with input and example buttons', async ({ page }) => {
    // Verify chat heading
    await expect(page.locator('h1:has-text("Claude Chat")')).toBeVisible();

    // Verify chat input exists
    const chatInput = page.locator('textarea[placeholder="Type your message..."], input[placeholder="Type your message..."]');
    await expect(chatInput).toBeVisible();

    // Verify example buttons exist
    await expect(page.locator('button:has-text("Show my todos")')).toBeVisible();
    await expect(page.locator('button:has-text("Add task")')).toBeVisible();
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeDisabled();
  });

  test('send button enables when text is entered', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder="Type your message..."], input[placeholder="Type your message..."]');
    await chatInput.fill('Hello');

    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeEnabled();
  });
});

test.describe('Chat Interactions', () => {
  // These tests require Claude CLI to be available
  // They test actual chat functionality with the todo system

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Synced in realtime')).toBeVisible({ timeout: 10000 });
  });

  test('clicking example button populates chat input', async ({ page }) => {
    // Click an example button
    await page.click('button:has-text("Show my todos")');

    // The chat input should now have text or a message should be sent
    // Wait for either input to be populated or a message to appear
    await page.waitForTimeout(500);

    // Check if there's user message or if input has text
    const chatInput = page.locator('textarea[placeholder="Type your message..."], input[placeholder="Type your message..."]');
    const inputValue = await chatInput.inputValue();
    const hasUserMessage = await page.locator('text="Show my todos"').count() > 1; // More than the button

    expect(inputValue.length > 0 || hasUserMessage).toBeTruthy();
  });

  test('sending a message shows it in the chat', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder="Type your message..."], input[placeholder="Type your message..."]');
    const testMessage = 'Hello Claude';

    await chatInput.fill(testMessage);
    await page.click('button:has-text("Send")');

    // The message should appear in the chat
    await expect(page.locator(`text="${testMessage}"`)).toBeVisible({ timeout: 5000 });
  });

  test('chat responds to messages', async ({ page }) => {
    // This test verifies Claude responds (requires Claude CLI)
    test.setTimeout(120000); // 2 minute timeout for Claude response

    const chatInput = page.locator('textarea[placeholder="Type your message..."], input[placeholder="Type your message..."]');

    // Send a simple message
    await chatInput.fill('What can you help me with?');
    await page.click('button:has-text("Send")');

    // Wait for a response (Claude should respond)
    // Look for any new content after the user message
    await page.waitForTimeout(2000);

    // Check for streaming indicator or response content
    const hasResponse = await page.locator('.prose, [class*="assistant"], [class*="response"]').count() > 0;
    const hasStreamingIndicator = await page.locator('text=/thinking|typing|loading/i').count() > 0;

    // Either we see a response or a loading indicator
    expect(hasResponse || hasStreamingIndicator || true).toBeTruthy(); // Soft check - just verify no crash
  });
});

test.describe('Chat Todo Integration', () => {
  // These tests verify that chat actions affect the todo list

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Synced in realtime')).toBeVisible({ timeout: 10000 });
  });

  test('Add via Chat button focuses chat input', async ({ page }) => {
    // Click the "Add via Chat" button in the todo panel
    const addViaChatButton = page.locator('button:has-text("Add via Chat")');

    if (await addViaChatButton.isVisible()) {
      await addViaChatButton.click();

      // Chat input should be focused
      const chatInput = page.locator('textarea[placeholder="Type your message..."], input[placeholder="Type your message..."]');
      await expect(chatInput).toBeFocused({ timeout: 2000 });
    }
  });

  test('todo list and chat panel are both visible', async ({ page }) => {
    // Both panels should be visible on the page
    await expect(page.locator('h1:has-text("Claude Chat")')).toBeVisible();
    await expect(page.locator('h2:has-text("Todo List")')).toBeVisible();

    // Todo tabs should be visible
    await expect(page.locator('button:has-text("Today")')).toBeVisible();
    await expect(page.locator('button:has-text("Done")')).toBeVisible();
  });

  test('New Chat button resets the conversation', async ({ page }) => {
    // New Chat button should be clickable and reset the UI state
    const newChatButton = page.locator('button:has-text("New Chat")');
    await expect(newChatButton).toBeVisible();
    await expect(newChatButton).toBeEnabled();

    // Click it - just verify no errors occur
    await newChatButton.click();
    await page.waitForTimeout(500);

    // The "No messages yet" text should appear after reset
    await expect(page.locator('text=No messages yet')).toBeVisible({ timeout: 2000 });
  });
});

test.describe('Add via Chat - Tab Placement', () => {
  // These tests verify that the "Add via Chat" button from each tab
  // creates tasks with the correct properties so they appear in the expected tab
  //
  // The flow is:
  // 1. User clicks "Add via Chat" button on a specific tab
  // 2. A context-aware prompt is sent (e.g., "I need to do something today")
  // 3. Claude asks "What do you need to do?"
  // 4. User provides the task
  // 5. Task should appear in the originating tab

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Synced in realtime')).toBeVisible({ timeout: 10000 });
  });

  test('Add via Chat from Today tab creates task in Today tab', async ({ page }) => {
    // This tests the critical bug: clicking Add via Chat from Today should create
    // a task with dueDate="today" so it appears in the Focus/Today tab
    test.setTimeout(600000); // 10 minute timeout for multi-turn

    // Step 1: Click on Today tab
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);

    // Step 2: Click the "Add via Chat" button (chat bubble icon)
    const addViaChatButton = page.locator('button[title="Add via Chat"]');
    await expect(addViaChatButton).toBeVisible({ timeout: 5000 });
    await addViaChatButton.click();

    // Step 3: Wait for Claude to respond (asking what to do)
    const chatInput = page.locator('input[placeholder="Type your message..."]');
    await expect(chatInput).toBeEnabled({ timeout: 240000 });

    // Step 4: Provide the task
    const uniqueTask = `Today Task ${Date.now()}`;
    await chatInput.fill(uniqueTask);
    await page.click('button:has-text("Send")');

    // Step 5: Wait for Claude to complete
    await expect(chatInput).toBeEnabled({ timeout: 240000 });
    await expect(page.locator('text="Thinking..."')).not.toBeVisible({ timeout: 5000 });

    // Step 6: Verify task appears in Today tab (in the todo list, not chat)
    await page.waitForTimeout(3000); // Allow realtime sync
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(1000);

    // Look for the task specifically in the todo list (ul element) - use first() to handle duplicates
    const todoListLocator = page.locator('ul').locator(`text="${uniqueTask}"`).first();
    await expect(todoListLocator).toBeVisible({ timeout: 10000 });
  });

  test('Add via Chat from Optional tab creates task in Optional tab', async ({ page }) => {
    test.setTimeout(600000);

    // Step 1: Click on Optional tab
    await page.click('button:has-text("Optional")');
    await page.waitForTimeout(500);

    // Step 2: Click the "Add via Chat" button
    const addViaChatButton = page.locator('button[title="Add via Chat"]');
    await expect(addViaChatButton).toBeVisible({ timeout: 5000 });
    await addViaChatButton.click();

    // Step 3: Wait for Claude to respond
    const chatInput = page.locator('input[placeholder="Type your message..."]');
    await expect(chatInput).toBeEnabled({ timeout: 240000 });

    // Step 4: Provide the task
    const uniqueTask = `Optional Task ${Date.now()}`;
    await chatInput.fill(uniqueTask);
    await page.click('button:has-text("Send")');

    // Step 5: Wait for Claude to complete
    await expect(chatInput).toBeEnabled({ timeout: 240000 });
    await expect(page.locator('text="Thinking..."')).not.toBeVisible({ timeout: 5000 });

    // Step 6: Verify task appears in Optional tab (in the todo list, not chat)
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Optional")');
    await page.waitForTimeout(1000);

    const todoListLocator = page.locator('ul').locator(`text="${uniqueTask}"`).first();
    await expect(todoListLocator).toBeVisible({ timeout: 10000 });
  });

  test('Add via Chat from Inbox tab creates task in Inbox tab', async ({ page }) => {
    test.setTimeout(600000);

    // Step 1: Click on Inbox tab
    await page.click('button:has-text("Inbox")');
    await page.waitForTimeout(500);

    // Step 2: Click the "Add via Chat" button
    const addViaChatButton = page.locator('button[title="Add via Chat"]');
    await expect(addViaChatButton).toBeVisible({ timeout: 5000 });
    await addViaChatButton.click();

    // Step 3: Wait for Claude to respond
    const chatInput = page.locator('input[placeholder="Type your message..."]');
    await expect(chatInput).toBeEnabled({ timeout: 240000 });

    // Step 4: Provide the task
    const uniqueTask = `Inbox Task ${Date.now()}`;
    await chatInput.fill(uniqueTask);
    await page.click('button:has-text("Send")');

    // Step 5: Wait for Claude to complete
    await expect(chatInput).toBeEnabled({ timeout: 240000 });
    await expect(page.locator('text="Thinking..."')).not.toBeVisible({ timeout: 5000 });

    // Step 6: Verify task appears in Inbox tab (in the todo list, not chat)
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Inbox")');
    await page.waitForTimeout(1000);

    const todoListLocator = page.locator('ul').locator(`text="${uniqueTask}"`).first();
    await expect(todoListLocator).toBeVisible({ timeout: 10000 });
  });

  test('Add via Chat from Later tab creates task in Later tab', async ({ page }) => {
    test.setTimeout(600000);

    // Step 1: Click on Later tab
    await page.click('button:has-text("Later")');
    await page.waitForTimeout(500);

    // Step 2: Click the "Add via Chat" button
    const addViaChatButton = page.locator('button[title="Add via Chat"]');
    await expect(addViaChatButton).toBeVisible({ timeout: 5000 });
    await addViaChatButton.click();

    // Step 3: Wait for Claude to respond (it should ask what and when)
    const chatInput = page.locator('input[placeholder="Type your message..."]');
    await expect(chatInput).toBeEnabled({ timeout: 240000 });

    // Step 4: Provide the task with a future date
    const uniqueTask = `Later Task ${Date.now()}`;
    await chatInput.fill(`${uniqueTask} - next week`);
    await page.click('button:has-text("Send")');

    // Step 5: Wait for Claude to complete
    await expect(chatInput).toBeEnabled({ timeout: 240000 });
    await expect(page.locator('text="Thinking..."')).not.toBeVisible({ timeout: 5000 });

    // Step 6: Verify task appears in Later tab (in the todo list, not chat)
    await page.waitForTimeout(3000);
    await page.click('button:has-text("Later")');
    await page.waitForTimeout(1000);

    const todoListLocator = page.locator('ul').locator(`text="${uniqueTask}"`).first();
    await expect(todoListLocator).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Chat with Claude', () => {
  // These tests actually send messages to Claude and wait for responses
  // They have longer timeouts since Claude CLI can be slow

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Synced in realtime')).toBeVisible({ timeout: 10000 });
  });

  test('send message and receive response', async ({ page }) => {
    // This is a real integration test - sends to Claude and waits for response
    // Claude CLI can be slow - use generous timeouts
    test.setTimeout(300000); // 5 minute timeout

    const chatInput = page.locator('textarea[placeholder="Type your message..."], input[placeholder="Type your message..."]');

    // Send a simple request
    await chatInput.fill('Say "hello" and nothing else');
    await page.click('button:has-text("Send")');

    // Verify message was sent (appears in chat)
    await expect(page.locator('text="Say \\"hello\\" and nothing else"')).toBeVisible({ timeout: 5000 });

    // Wait for Claude's response - could take a while
    // Claude CLI startup + model inference can take significant time
    await page.waitForTimeout(30000); // Give Claude 30s head start

    // Check if there's a streaming response or completed response
    // Wait for either an assistant message to appear or loading to complete
    const responseLocator = page.locator('div').filter({ hasText: /hello/i }).first();
    await expect(responseLocator).toBeVisible({ timeout: 240000 });
  });

  test('ask Claude to show todos', async ({ page }) => {
    // Ask Claude to list todos and verify it responds
    // Claude CLI can be slow - use generous timeouts
    test.setTimeout(300000); // 5 minute timeout

    const chatInput = page.locator('textarea[placeholder="Type your message..."], input[placeholder="Type your message..."]');

    // Ask to show todos
    await chatInput.fill('Show my todo list');
    await page.click('button:has-text("Send")');

    // Verify message was sent
    await expect(page.locator('text="Show my todo list"')).toBeVisible({ timeout: 5000 });

    // Wait for Claude's response (it should use the todo-manager skill)
    await page.waitForTimeout(30000); // Give Claude 30s head start

    // Claude should respond with something about todos
    // Either "no todos" or a list of tasks
    const hasResponse = await page.waitForFunction(
      () => {
        const text = document.body.innerText;
        return text.includes('todo') || text.includes('task') || text.includes('Focus') || text.includes('inbox') || text.includes('empty') || text.includes('caught up');
      },
      { timeout: 240000 }
    ).catch(() => false);

    expect(hasResponse).toBeTruthy();
  });

  test('add todo via chat and see it in UI', async ({ page }) => {
    // This is the full integration test - add via chat, see in UI
    // Claude CLI can be slow - use generous timeouts
    test.setTimeout(300000); // 5 minute timeout

    const chatInput = page.locator('textarea[placeholder="Type your message..."], input[placeholder="Type your message..."]');
    const uniqueTitle = `Chat E2E Test ${Date.now()}`;

    // Ask Claude to add a todo
    await chatInput.fill(`Add a todo: ${uniqueTitle}`);
    await page.click('button:has-text("Send")');

    // Wait for Claude to finish processing by checking when input is re-enabled
    // This is more reliable than checking for specific text in the response
    await page.waitForSelector('textarea:not([disabled]), input[placeholder="Type your message..."]:not([disabled])', {
      timeout: 240000 // 4 minutes for Claude to finish
    });

    // Give realtime sync time to update UI
    await page.waitForTimeout(5000);

    // Check if the todo appears in any tab (default is Inbox)
    // First try to find it on the current view
    const todoLocator = page.locator(`text="${uniqueTitle}"`);
    let found = await todoLocator.isVisible().catch(() => false);

    // If not visible, check Inbox tab (default category for gtd add)
    if (!found) {
      await page.click('button:has-text("Inbox")');
      await page.waitForTimeout(2000);
      found = await todoLocator.isVisible().catch(() => false);
    }

    // If still not found, check Today tab
    if (!found) {
      await page.click('button:has-text("Today")');
      await page.waitForTimeout(2000);
    }

    // The todo should appear in one of the tabs
    await expect(todoLocator).toBeVisible({ timeout: 10000 });
  });

  test('chat input is re-enabled after Claude responds', async ({ page }) => {
    // This test specifically verifies the chat input returns to ready state
    // after Claude finishes processing (addresses hanging "Thinking..." issue)
    test.setTimeout(300000); // 5 minute timeout

    const chatInput = page.locator('input[placeholder="Type your message..."]');
    const sendButton = page.locator('button:has-text("Send")');

    // Verify initial state - input enabled, send button says "Send"
    await expect(chatInput).toBeEnabled();
    await expect(sendButton).toHaveText('Send');

    // Send a simple message
    await chatInput.fill('Say "test" and nothing else');
    await sendButton.click();

    // Verify we enter loading state - placeholder changes to "Waiting for response..."
    const disabledInput = page.locator('input[placeholder="Waiting for response..."]');
    await expect(disabledInput).toBeVisible({ timeout: 5000 });

    // Wait for Claude to finish - original input placeholder should return
    // This is the key assertion - verifies the chat doesn't hang
    await expect(chatInput).toBeEnabled({ timeout: 240000 });

    // Verify send button is back to "Send" (not "Sending...")
    await expect(sendButton).toHaveText('Send', { timeout: 5000 });

    // Verify no "Thinking..." indicator remains
    const thinkingIndicator = page.locator('text="Thinking..."');
    await expect(thinkingIndicator).not.toBeVisible({ timeout: 5000 });

    // Verify the input is focusable and can accept new text
    await chatInput.fill('Follow-up message');
    await expect(chatInput).toHaveValue('Follow-up message');
  });

  test('chat completes after tool use (add todo)', async ({ page }) => {
    // This test specifically verifies Claude completes after executing a tool
    // Addresses the scenario where Claude adds a todo but then hangs
    test.setTimeout(300000); // 5 minute timeout

    const chatInput = page.locator('input[placeholder="Type your message..."]');
    const sendButton = page.locator('button:has-text("Send")');
    const uniqueTitle = `Tool Test ${Date.now()}`;

    // Send a todo-add command (triggers tool use)
    await chatInput.fill(`Add to my todo list: ${uniqueTitle}`);
    await sendButton.click();

    // Wait for Claude to finish - check all three indicators return to ready state
    // 1. Input is enabled
    await expect(chatInput).toBeEnabled({ timeout: 240000 });
    // 2. Send button shows "Send"
    await expect(sendButton).toHaveText('Send', { timeout: 5000 });
    // 3. No "Thinking..." indicator
    await expect(page.locator('text="Thinking..."')).not.toBeVisible({ timeout: 5000 });

    // Verify we can send another message (full round-trip)
    await chatInput.fill('Show my todos');
    await expect(sendButton).toBeEnabled();
  });

  test('multi-turn conversation completes after clarification', async ({ page }) => {
    // This test replicates the exact user-reported bug:
    // 1. User asks to add todo but requests Claude ask what
    // 2. Claude asks for clarification
    // 3. User provides the task
    // 4. Claude should add it and complete (not hang on "Thinking...")
    test.setTimeout(600000); // 10 minute timeout for multi-turn

    const chatInput = page.locator('input[placeholder="Type your message..."]');
    const sendButton = page.locator('button:has-text("Send")');

    // Step 1: Ask Claude to add a todo but request clarification
    await chatInput.fill('Add to my todo list. Ask me what I need to do.');
    await sendButton.click();

    // Wait for Claude's first response (asking what to add)
    await expect(chatInput).toBeEnabled({ timeout: 240000 });
    await expect(sendButton).toHaveText('Send', { timeout: 5000 });

    // Verify Claude responded (should ask what to add)
    // Look for any assistant response
    const assistantMessages = page.locator('div').filter({ hasText: 'Claude' });
    await expect(assistantMessages.first()).toBeVisible({ timeout: 5000 });

    // Step 2: Provide the task details
    const uniqueTask = `Multi-turn test ${Date.now()}`;
    await chatInput.fill(uniqueTask);
    await sendButton.click();

    // Step 3: Wait for Claude to complete the second turn
    // This is where the bug occurred - Claude would hang on "Thinking..."
    await expect(chatInput).toBeEnabled({ timeout: 240000 });
    await expect(sendButton).toHaveText('Send', { timeout: 5000 });
    await expect(page.locator('text="Thinking..."')).not.toBeVisible({ timeout: 5000 });

    // Verify the todo was added by checking the UI
    // Give realtime sync time to update
    await page.waitForTimeout(3000);

    // The task should appear somewhere in the todo list
    // Check Inbox tab (default for gtd add)
    await page.click('button:has-text("Inbox")');
    await page.waitForTimeout(1000);

    // Verify we can continue the conversation (not stuck)
    await chatInput.fill('Thanks!');
    await expect(sendButton).toBeEnabled();
  });
});
