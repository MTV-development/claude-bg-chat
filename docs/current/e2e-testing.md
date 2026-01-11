# E2E Testing Playbook

This document describes how to run end-to-end tests for the GTD Todo Manager application using Playwright.

## Prerequisites

- Node.js 18+
- npm dependencies installed (`npm install`)
- Playwright browsers installed (`npx playwright install`)
- Supabase project configured with `todos` and `projects` tables in the realtime publication

## E2E Test Bypass Mode

The application supports an E2E test mode that bypasses authentication to enable automated testing without requiring real user login.

### How It Works

When `NEXT_PUBLIC_E2E_TEST_USER_ID` is set in `.env.local`:

1. **Middleware** (`middleware.ts`) - Skips auth checks and allows all routes
2. **Client-side useUser hook** (`lib/hooks/useUser.ts`) - Returns a mock user immediately
3. **Server-side getCurrentUser** (`lib/services/auth/get-current-user.ts`) - Uses the E2E user ID for API calls

This ensures the entire auth flow is bypassed consistently across client and server.

### Setting Up E2E Test Mode

1. Find a valid user ID from your database:
   ```bash
   # Using node with Supabase client
   node -e "
   const { createClient } = require('@supabase/supabase-js');
   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
   supabase.from('todos').select('user_id').limit(1).then(r => console.log(r.data));
   "
   ```

2. Add the user ID to `.env.local`:
   ```env
   # E2E Test User ID (bypasses auth in development)
   NEXT_PUBLIC_E2E_TEST_USER_ID=your-uuid-here
   ```

3. Restart the dev server to pick up the new environment variable.

## Running E2E Tests

### Quick Command Reference

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run E2E tests with browser visible
npx playwright test --headed

# Run a specific test file
npx playwright test e2e/realtime-sync.spec.ts

# Run with browser visible (headed mode)
npx playwright test e2e/realtime-sync.spec.ts --headed

# Run with detailed reporter
npx playwright test --reporter=line

# Run with UI mode (interactive)
npx playwright test --ui

# Debug a failing test
npx playwright test e2e/realtime-sync.spec.ts --debug
```

### Available Test Files

| File | Description |
|------|-------------|
| `e2e/realtime-sync.spec.ts` | Tests realtime sync functionality (initial load, add todo, complete todo) |
| `e2e/debug-realtime.spec.ts` | Debug test that captures console logs and screenshots |

## Test Structure

### realtime-sync.spec.ts

This test file verifies the core realtime functionality:

1. **Initial Load Test** - Verifies todos are loaded from Supabase on page load
2. **Add Todo Test** - Creates a new todo and verifies it appears via realtime (not page refresh)
3. **Complete Todo Test** - Completes a todo and verifies the update via realtime

### Key Selectors

The tests use these selectors to interact with the UI:

```typescript
// Wait for sync status
await expect(page.locator('text=Synced in realtime')).toBeVisible();

// Click the FAB (floating action button)
const fabButton = page.locator('button').filter({
  has: page.locator('svg path[d="M12 4v16m8-8H4"]')
});

// Modal interactions
const modal = page.locator('div.fixed').filter({
  has: page.locator('h2:has-text("Add Task")')
});
await modal.locator('button:has-text("Add")').click();

// Find todo items
const todoItems = page.locator('ul > li').filter({
  has: page.locator('p.font-medium')
});
```

## Debugging Tests

### Console Log Capture

Tests capture console logs for debugging. Add handlers like:

```typescript
page.on('console', (msg) => {
  const text = msg.text();
  if (text.includes('[RealtimeSync]') || text.includes('[InitialLoad]')) {
    console.log(`[console] ${text}`);
  }
});
```

### Screenshots

Screenshots are automatically captured on failure. You can also take manual screenshots:

```typescript
await page.screenshot({ path: 'e2e/debug-screenshot.png', fullPage: true });
```

### Viewing Test Results

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Troubleshooting

### "Synced in realtime" never appears

1. Check that `NEXT_PUBLIC_E2E_TEST_USER_ID` is set correctly
2. Verify the user ID exists in your `users` table
3. Check browser console for WebSocket connection errors
4. Ensure Supabase Realtime is enabled and tables are in the publication

### API returns 401 Unauthorized

1. The E2E user ID might not exist in the `users` table
2. Server needs restart to pick up env var changes
3. Check `getCurrentUser` is returning the mock user in E2E mode

### Todo not appearing after add

1. Check console for `[RealtimeSync] Received todo change: INSERT`
2. If no INSERT event, check Supabase Realtime publication includes `todos` table
3. Verify the realtime filter matches: `filter: user_id=eq.${userId}`

### Tests timing out

1. Increase timeouts in assertions: `{ timeout: 15000 }`
2. Check if modal selectors are correct (UI may have changed)
3. Run with `--headed` to see what's happening visually

## Playwright Configuration

The test configuration is in `playwright.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

The `webServer` config automatically starts the dev server if it's not running.

## Disabling E2E Mode

To return to normal authentication:

1. Remove or comment out `NEXT_PUBLIC_E2E_TEST_USER_ID` from `.env.local`
2. Restart the dev server

**Warning**: Never commit `.env.local` with `NEXT_PUBLIC_E2E_TEST_USER_ID` set to version control, as this bypasses authentication.
