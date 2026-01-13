# E2E Testing Playbook

This document describes how to run end-to-end tests for the GTD Todo Manager application using Playwright.

## Prerequisites

- Node.js 18+
- npm dependencies installed (`npm install`)
- Playwright browsers installed (`npx playwright install`)
- Supabase project configured with `todos` and `projects` tables in the realtime publication

## E2E Test Architecture

E2E tests run on a **separate port (3050)** with mock authentication enabled. This ensures:
- Normal development on port 3000 uses real authentication
- E2E tests have consistent, repeatable test data
- No manual toggling of test mode required
- Port 3050 avoids conflicts with dev server or dangling test instances

### How It Works

Playwright automatically handles everything:

1. **Playwright config** (`playwright.config.ts`) sets `NEXT_PUBLIC_E2E_TEST_USER_ID` via `webServer.env`
2. **Separate port** - Tests run on port 3050, dev server runs on port 3000
3. **Server reuse** - Playwright reuses existing server on port 3050 if available (`reuseExistingServer: true`)

**Important**: The auth bypass is controlled by the `NEXT_PUBLIC_E2E_TEST_USER_ID` environment variable, NOT the port number. The port is only for isolation from the dev server.

When the test server starts with `NEXT_PUBLIC_E2E_TEST_USER_ID`:

1. **Middleware** (`middleware.ts`) - Skips auth checks and allows all routes
2. **Client-side useUser hook** (`lib/hooks/useUser.ts`) - Returns a mock user immediately
3. **Server-side getCurrentUser** (`lib/services/auth/get-current-user.ts`) - Uses the E2E user ID for API calls

### E2E Test User

The test user ID is configured in `playwright.config.ts`:

```typescript
const E2E_TEST_USER_ID = '0b86d7e4-68ae-4da4-b30f-3f47da723f84';
```

This user must exist in your database's `users` table. To create or find a valid user:

```bash
# Using node with Supabase client
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
supabase.from('users').select('id, email').limit(5).then(r => console.log(r.data));
"
```

## Running E2E Tests

### Quick Command Reference

**Important**: Always run tests with `--headed` to see the browser and monitor what's happening. This makes debugging much easier.

```bash
# Run all E2E tests with browser visible (RECOMMENDED)
npx playwright test --headed

# Run a specific test file with browser visible
npx playwright test e2e/realtime-sync.spec.ts --headed

# Run all E2E tests (headless - not recommended for debugging)
npm run test:e2e

# Run a specific test file (headless)
npx playwright test e2e/realtime-sync.spec.ts

# Run chat tests (use single worker to avoid Claude CLI contention)
npx playwright test e2e/chat-ui-integration.spec.ts --workers=1

# Run with detailed reporter
npx playwright test --reporter=line

# Run with UI mode (interactive)
npx playwright test --ui

# Debug a failing test
npx playwright test e2e/realtime-sync.spec.ts --debug
```

### Available Test Files

| File | Description | Notes |
|------|-------------|-------|
| `e2e/realtime-sync.spec.ts` | Tests realtime sync (initial load, add todo, complete todo) | Fast (~15s) |
| `e2e/delete-todos.spec.ts` | Tests delete functionality (select all, delete button, bulk delete) | ~30s |
| `e2e/chat-ui-integration.spec.ts` | Tests chat UI and Claude CLI integration | Use `--workers=1` |

## Test Structure

### realtime-sync.spec.ts

Tests core realtime functionality:

1. **Initial Load Test** - Verifies todos are loaded from Supabase on page load
2. **Add Todo Test** - Creates a new todo and verifies it appears via realtime
3. **Complete Todo Test** - Completes a todo and verifies the update via realtime

### delete-todos.spec.ts

Tests delete functionality and Select All:

1. **Delete Button Disabled** - Verifies delete button is disabled when nothing selected
2. **Delete Button Count** - Verifies delete button shows count when tasks selected
3. **Select All Checkbox** - Tests select all/deselect all functionality
4. **Single Delete** - Deletes a single task and verifies realtime removal
5. **Bulk Delete** - Deletes multiple tasks and verifies realtime removal
6. **Cancel Delete** - Verifies cancel doesn't delete tasks
7. **Select All on Tabs** - Verifies select all works on different tabs

### chat-ui-integration.spec.ts

Tests chat interface and Claude CLI integration:

1. **Chat Interface** - UI components visible and functional
2. **Chat Interactions** - Sending messages, example buttons
3. **Chat Todo Integration** - Chat + Todo panel interaction
4. **Chat with Claude** - Actual Claude CLI responses (slow, use `--workers=1`)

### Key Selectors

```typescript
// Wait for sync status
await expect(page.locator('text=Synced in realtime')).toBeVisible();

// Chat input
const chatInput = page.locator('input[placeholder="Type your message..."]');

// Send button
const sendButton = page.locator('button:has-text("Send")');

// Modal interactions
const modal = page.locator('div.fixed').filter({
  has: page.locator('h2:has-text("Add Task")')
});
```

## Debugging Tests

### Console Log Capture

Tests capture console logs for debugging:

```typescript
page.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('[RealtimeSync]') || text.includes('[InitialLoad]')) {
    console.log(`[console] ${text}`);
  }
});
```

### Screenshots

Screenshots are automatically captured on failure. Manual screenshots:

```typescript
await page.screenshot({ path: 'e2e/debug-screenshot.png', fullPage: true });
```

### Viewing Test Results

```bash
npx playwright show-report
```

## Troubleshooting

### "Synced in realtime" never appears

1. Verify the E2E test user exists in `users` table
2. Check browser console for WebSocket errors
3. Ensure Supabase Realtime is enabled

### API returns 401 Unauthorized

1. The E2E user ID might not exist in `users` table
2. Check `getCurrentUser` logging shows "E2E test mode"

### Chat tests timing out

1. Run with `--workers=1` (Claude CLI is resource-intensive)
2. Check server logs for Claude CLI errors
3. Increase test timeout: `test.setTimeout(300000)`

### Tests failing randomly

1. Use `--workers=1` for deterministic execution
2. Add explicit waits for realtime updates
3. Check for race conditions in assertions

### DELETE events not received via Realtime

If delete operations complete but the UI doesn't update, Supabase is not sending DELETE events. This is a database configuration issue.

**Fix**: See [Supabase Setup - Step 5](./supabase-setup.md#step-5-enable-delete-events-for-realtime) for the required SQL commands.

## Playwright Configuration

```typescript
// playwright.config.ts
const E2E_TEST_USER_ID = '0b86d7e4-68ae-4da4-b30f-3f47da723f84';
const E2E_PORT = 3050;

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npx next dev --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: true, // Reuse server to avoid port conflicts
    env: {
      NEXT_PUBLIC_E2E_TEST_USER_ID: E2E_TEST_USER_ID, // Auth bypass is tied to this env var, not the port
    },
    timeout: 120000,
  },
});
```

## Development vs E2E Mode

| Aspect | Development (port 3000) | E2E Tests (port 3050) |
|--------|-------------------------|------------------------|
| Authentication | Real Supabase auth | Mocked with test user |
| User ID | From Supabase session | `E2E_TEST_USER_ID` |
| Started by | `npm run dev` | Playwright automatically |
| Purpose | Manual testing/development | Automated tests |

**Important**: Never set `NEXT_PUBLIC_E2E_TEST_USER_ID` in `.env.local` - it will bypass authentication for normal development!
