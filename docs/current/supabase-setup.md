# Supabase Setup Guide

> **IMPORTANT**: This guide documents all manual steps required to set up Supabase for the GTD Todo Manager. These steps must be completed before the application will work correctly.

## Prerequisites

- A Supabase account (free tier works)
- Node.js 18+ installed
- This repository cloned locally

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter a project name (e.g., "gtd-todo-manager")
5. Set a strong database password (save this!)
6. Choose a region close to you
7. Click "Create new project"
8. Wait for the project to be provisioned (1-2 minutes)

## Step 2: Configure Environment Variables

Create a `.env.local` file in the project root with your Supabase credentials:

```bash
# Get these from: Supabase Dashboard > Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Get this from: Supabase Dashboard > Project Settings > Database > Connection string (URI)
# Use the "Transaction" connection string for Drizzle
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# For AI features (OpenRouter)
OPENROUTER_API_KEY=your-openrouter-key
```

**Where to find these values:**
- `NEXT_PUBLIC_SUPABASE_URL`: Project Settings > API > Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Project Settings > API > Project API keys > `anon` `public`
- `DATABASE_URL`: Project Settings > Database > Connection string > URI (Transaction mode)

## Step 3: Push Database Schema

Run the Drizzle push command to create all tables:

```bash
npm run db:push
```

This creates:
- `users` table
- `projects` table
- `todos` table
- `activity_log` table
- Required enums (`todo_status`, `activity_action`)

**Verify**: Go to Supabase Dashboard > Table Editor and confirm all tables exist.

## Step 4: Enable Supabase Realtime

The application uses Supabase Realtime to sync data between the database and UI. You must enable it for the relevant tables.

1. Go to Supabase Dashboard > **Database** > **Replication**
2. Under "Realtime", find the `supabase_realtime` publication
3. Click the toggle to enable replication for these tables:
   - `todos` ✅
   - `projects` ✅

**Alternative via SQL Editor:**

```sql
-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE todos;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
```

## Step 5: Enable DELETE Events for Realtime

By default, PostgreSQL only sends minimal information for DELETE events. The application needs the full row data to properly handle deletions.

**Run this SQL in the Supabase SQL Editor:**

```sql
-- Enable full row data for DELETE events
ALTER TABLE todos REPLICA IDENTITY FULL;
ALTER TABLE projects REPLICA IDENTITY FULL;
```

**Why this is needed**: Without `REPLICA IDENTITY FULL`, Supabase Realtime doesn't send DELETE events with the row ID, so deleted items won't disappear from the UI until a page refresh.

## Step 6: Create E2E Test User (Optional)

For E2E testing, you need a user in the `users` table. The test user ID is configured in `playwright.config.ts`.

**Option A: Use an existing user**

After logging in once with Google Auth, find your user ID:

```sql
SELECT id, email FROM users LIMIT 5;
```

Update `playwright.config.ts` with one of these IDs:

```typescript
const E2E_TEST_USER_ID = 'your-user-id-here';
```

**Option B: Create a test user**

```sql
INSERT INTO users (id, email)
VALUES ('0b86d7e4-68ae-4da4-b30f-3f47da723f84', 'e2e-test@example.com');
```

## Verification Checklist

After completing all steps, verify your setup:

| Step | How to Verify |
|------|---------------|
| 1. Project created | Dashboard loads without errors |
| 2. Environment vars | `npm run dev` starts without connection errors |
| 3. Schema pushed | Table Editor shows `users`, `todos`, `projects`, `activity_log` |
| 4. Realtime enabled | Replication page shows `todos` and `projects` enabled |
| 5. Replica identity | Run `SELECT relreplident FROM pg_class WHERE relname = 'todos';` - should return `f` (full) |
| 6. Test user | E2E tests can authenticate |

## Troubleshooting

### "Relation does not exist" errors
Run `npm run db:push` again. If it fails, check your `DATABASE_URL`.

### Realtime not working
1. Check the publication includes your tables (Step 4)
2. Check replica identity is set to FULL (Step 5)
3. Check browser console for WebSocket connection errors

### E2E tests fail with 401 Unauthorized
1. Verify the E2E test user exists in the `users` table
2. Check that `playwright.config.ts` has the correct user ID
3. Ensure you're running on port 3050 (not the dev server port)

### DELETE events not received
Run the replica identity SQL again:
```sql
ALTER TABLE todos REPLICA IDENTITY FULL;
```

Then verify:
```sql
SELECT relname, relreplident
FROM pg_class
WHERE relname IN ('todos', 'projects');
```
Both should show `f` (full).

## Quick Reference: All SQL Commands

Copy and paste this entire block into the Supabase SQL Editor:

```sql
-- Step 4: Enable Realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE todos;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;

-- Step 5: Enable full row data for DELETE events
ALTER TABLE todos REPLICA IDENTITY FULL;
ALTER TABLE projects REPLICA IDENTITY FULL;

-- Step 6 (Optional): Create E2E test user
INSERT INTO users (id, email)
VALUES ('0b86d7e4-68ae-4da4-b30f-3f47da723f84', 'e2e-test@example.com')
ON CONFLICT (id) DO NOTHING;
```

## Related Documentation

- [E2E Testing](./e2e-testing.md) - How to run E2E tests
- [Technical Architecture](./technical-architecture.md) - System overview
- [Overview](./overview.md) - Project introduction
