/**
 * Database connection test script
 *
 * Verifies:
 * 1. Database connection works
 * 2. Can insert and query test data
 * 3. Cleans up after itself
 *
 * Usage: npx tsx scripts/db-test.ts
 */

// Load env vars BEFORE any other imports
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  // Dynamic imports after env vars are loaded
  const { db, client } = await import('../db');
  const { users, projects, todos, activityLog } = await import('../db/schema');
  const { eq } = await import('drizzle-orm');
  console.log('🔌 Testing database connection...\n');

  try {
    // Test 1: Insert a test user
    console.log('1. Creating test user...');
    const [testUser] = await db
      .insert(users)
      .values({
        authId: 'test-auth-id-' + Date.now(),
        email: 'test@example.com',
      })
      .returning();
    console.log('   ✓ Created user:', testUser.id);

    // Test 2: Insert a test project
    console.log('2. Creating test project...');
    const [testProject] = await db
      .insert(projects)
      .values({
        userId: testUser.id,
        name: 'Test Project',
      })
      .returning();
    console.log('   ✓ Created project:', testProject.id);

    // Test 3: Insert a test todo
    console.log('3. Creating test todo...');
    const [testTodo] = await db
      .insert(todos)
      .values({
        userId: testUser.id,
        projectId: testProject.id,
        title: 'Test todo item',
        nextAction: 'Complete this test',
        status: 'active',
        canDoAnytime: true,
      })
      .returning();
    console.log('   ✓ Created todo:', testTodo.id);

    // Test 4: Insert activity log entry
    console.log('4. Creating activity log entry...');
    const [testActivity] = await db
      .insert(activityLog)
      .values({
        userId: testUser.id,
        todoId: testTodo.id,
        action: 'created',
        details: { source: 'db-test script' },
      })
      .returning();
    console.log('   ✓ Created activity:', testActivity.id);

    // Test 5: Query back the data with relations
    console.log('5. Querying todos with project...');
    const queriedTodos = await db.query.todos.findMany({
      where: eq(todos.userId, testUser.id),
      with: {
        project: true,
      },
    });
    console.log('   ✓ Found', queriedTodos.length, 'todos');
    console.log('   ✓ Todo project name:', queriedTodos[0]?.project?.name);

    // Cleanup: Delete test data (cascades will handle related records)
    console.log('6. Cleaning up test data...');
    await db.delete(users).where(eq(users.id, testUser.id));
    console.log('   ✓ Deleted test user (cascaded to project, todo, activity)');

    console.log('\n✅ All tests passed! Database connection is working.\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await client.end();
  }
}

main();
