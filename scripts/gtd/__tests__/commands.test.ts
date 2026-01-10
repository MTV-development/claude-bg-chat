import { promises as fs } from 'fs';
import path from 'path';
import { add } from '../commands/add';
import { list } from '../commands/list';
import { complete } from '../commands/complete';
import { uncomplete } from '../commands/uncomplete';
import { remove } from '../commands/remove';
import { update } from '../commands/update';
import { TodoData } from '../lib/types';
import { saveTodos, loadTodos, getLocalDateString } from '../lib/store';

// Use a test file to avoid modifying real data
const TEST_FILE = path.join(process.cwd(), 'data', 'test-todos.json');
const REAL_FILE = path.join(process.cwd(), 'data', 'todos.json');

// Helper to temporarily swap the data file
let originalData: string;

beforeAll(async () => {
  // Backup original data
  try {
    originalData = await fs.readFile(REAL_FILE, 'utf-8');
  } catch {
    originalData = JSON.stringify({ version: '1.0', lastModified: new Date().toISOString(), items: [] });
  }
});

beforeEach(async () => {
  // Start each test with empty v4 data
  const emptyData: TodoData = {
    version: '4.0',
    lastModified: new Date().toISOString(),
    lastAutoReview: null,
    items: [],
    activityLog: [],
  };
  await fs.writeFile(REAL_FILE, JSON.stringify(emptyData, null, 2));
});

afterAll(async () => {
  // Restore original data
  await fs.writeFile(REAL_FILE, originalData);
});

describe('add command', () => {
  it('adds item with title only', async () => {
    const result = await add(['Buy groceries']);

    expect(result.success).toBe(true);
    expect(result.item?.title).toBe('Buy groceries');
    expect(result.item?.completed).toBe(false);
    expect(result.item?.status).toBe('active');
  });

  it('adds item with due date (ISO format)', async () => {
    const result = await add(['Task', '--due', '2026-01-15']);

    expect(result.success).toBe(true);
    expect(result.item?.dueDate).toBe('2026-01-15');
  });

  it('adds item with due date (tomorrow)', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const expected = getLocalDateString(tomorrow);

    const result = await add(['Task', '--due', 'tomorrow']);

    expect(result.success).toBe(true);
    expect(result.item?.dueDate).toBe(expected);
  });

  it('adds item with can-do-anytime flag', async () => {
    const result = await add(['Task', '--can-do-anytime']);

    expect(result.success).toBe(true);
    expect(result.item?.canDoAnytime).toBe(true);
  });

  it('adds item with project', async () => {
    const result = await add(['Task', '--project', 'Home Renovation']);

    expect(result.success).toBe(true);
    expect(result.item?.project).toBe('Home Renovation');
  });

  it('adds item with inbox status', async () => {
    const result = await add(['Vague task', '--status', 'inbox']);

    expect(result.success).toBe(true);
    expect(result.item?.status).toBe('inbox');
    expect(result.item?.nextAction).toBeNull();
  });

  it('fails on missing title', async () => {
    const result = await add([]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Title is required');
  });

  it('fails on invalid due date', async () => {
    const result = await add(['Task', '--due', 'invalid-date']);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid due date');
  });

  it('fails on invalid status', async () => {
    const result = await add(['Task', '--status', 'invalid']);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Status must be');
  });
});

describe('list command', () => {
  beforeEach(async () => {
    // Add test items
    await add(['Task 1', '--due', 'today']);
    await add(['Task 2', '--can-do-anytime']);
    await add(['Task 3']);
    // Complete one
    await complete(['Task 2']);
  });

  it('returns all items', async () => {
    const result = await list([]);

    expect(result.success).toBe(true);
    expect(result.count).toBe(3);
  });

  it('filters completed only', async () => {
    const result = await list(['--completed']);

    expect(result.success).toBe(true);
    expect(result.count).toBe(1);
    expect(result.items?.[0].title).toBe('Task 2');
  });

  it('filters pending only', async () => {
    const result = await list(['--pending']);

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it('returns empty array when no items', async () => {
    // Clear all items
    const data = await loadTodos();
    data.items = [];
    await saveTodos(data);

    const result = await list([]);

    expect(result.success).toBe(true);
    expect(result.items).toHaveLength(0);
    expect(result.count).toBe(0);
  });
});

describe('complete command', () => {
  beforeEach(async () => {
    await add(['Buy groceries']);
    await add(['Call dentist']);
  });

  it('completes by exact title', async () => {
    const result = await complete(['Buy groceries']);

    expect(result.success).toBe(true);
    expect(result.item?.completed).toBe(true);
    expect(result.item?.completedAt).toBeTruthy();
  });

  it('completes by partial title match', async () => {
    const result = await complete(['dentist']);

    expect(result.success).toBe(true);
    expect(result.item?.title).toBe('Call dentist');
  });

  it('completes by ID', async () => {
    const listResult = await list([]);
    const id = listResult.items?.[0].id;

    const result = await complete([id!]);

    expect(result.success).toBe(true);
    expect(result.item?.id).toBe(id);
  });

  it('fails if item not found', async () => {
    const result = await complete(['nonexistent']);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('fails without query', async () => {
    const result = await complete([]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('specify');
  });
});

describe('uncomplete command', () => {
  beforeEach(async () => {
    await add(['Task']);
    await complete(['Task']);
  });

  it('uncompletes by title', async () => {
    const result = await uncomplete(['Task']);

    expect(result.success).toBe(true);
    expect(result.item?.completed).toBe(false);
    expect(result.item?.completedAt).toBeNull();
  });

  it('fails if item not found', async () => {
    const result = await uncomplete(['nonexistent']);

    expect(result.success).toBe(false);
  });
});

describe('remove command', () => {
  beforeEach(async () => {
    await add(['Task to remove']);
    await add(['Task to keep']);
  });

  it('removes by title', async () => {
    const result = await remove(['Task to remove']);

    expect(result.success).toBe(true);
    expect(result.removed?.title).toBe('Task to remove');

    const listResult = await list([]);
    expect(listResult.count).toBe(1);
  });

  it('removes by ID', async () => {
    const listResult = await list([]);
    const id = listResult.items?.[0].id;

    const result = await remove([id!]);

    expect(result.success).toBe(true);
  });

  it('fails if item not found', async () => {
    const result = await remove(['nonexistent']);

    expect(result.success).toBe(false);
  });
});

describe('update command', () => {
  let itemId: string;

  beforeEach(async () => {
    const addResult = await add(['Original title']);
    itemId = addResult.item!.id;
  });

  it('updates title', async () => {
    const result = await update([itemId, '--title', 'New title']);

    expect(result.success).toBe(true);
    expect(result.item?.title).toBe('New title');
  });

  it('updates due date', async () => {
    const result = await update([itemId, '--due', '2026-01-20']);

    expect(result.success).toBe(true);
    expect(result.item?.dueDate).toBe('2026-01-20');
  });

  it('updates canDoAnytime flag', async () => {
    const result = await update([itemId, '--can-do-anytime', 'true']);

    expect(result.success).toBe(true);
    expect(result.item?.canDoAnytime).toBe(true);
  });

  it('updates status', async () => {
    const result = await update([itemId, '--status', 'someday']);

    expect(result.success).toBe(true);
    expect(result.item?.status).toBe('someday');
  });

  it('updates multiple fields', async () => {
    const result = await update([itemId, '--title', 'Updated', '--due', '2026-02-01']);

    expect(result.success).toBe(true);
    expect(result.item?.title).toBe('Updated');
    expect(result.item?.dueDate).toBe('2026-02-01');
  });

  it('fails if item not found', async () => {
    const result = await update(['nonexistent', '--title', 'New']);

    expect(result.success).toBe(false);
  });

  it('fails on invalid status', async () => {
    const result = await update([itemId, '--status', 'invalid']);

    expect(result.success).toBe(false);
  });
});

describe('integration', () => {
  it('full workflow: add → list → complete → list', async () => {
    // Add
    const addResult = await add(['Test workflow', '--due', 'today']);
    expect(addResult.success).toBe(true);

    // List (should show 1 pending)
    const listResult1 = await list(['--pending']);
    expect(listResult1.count).toBe(1);

    // Complete
    const completeResult = await complete(['Test workflow']);
    expect(completeResult.success).toBe(true);

    // List pending (should be 0)
    const listResult2 = await list(['--pending']);
    expect(listResult2.count).toBe(0);

    // List completed (should be 1)
    const listResult3 = await list(['--completed']);
    expect(listResult3.count).toBe(1);
  });
});
