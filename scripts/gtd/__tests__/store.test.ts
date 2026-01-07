import { promises as fs } from 'fs';
import path from 'path';
import {
  loadTodos,
  saveTodos,
  generateId,
  findItem,
  parseDate,
  parseArgs,
  getLocalDateString,
  filterByTab,
  getItemTab,
} from '../lib/store';
import { TodoData, TodoItem, createEmptyTodoData } from '../lib/types';

const TEST_FILE = path.join(__dirname, 'test-todos.json');

// Helper to create a test item with all v2 fields
function createTestItem(partial: Partial<TodoItem>): TodoItem {
  return {
    id: 'test123',
    title: 'Test item',
    nextAction: 'Test item',
    status: 'active',
    completed: false,
    priority: 'medium',
    project: null,
    dueDate: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    postponeCount: 0,
    tags: [],
    ...partial,
  };
}

describe('store', () => {
  afterEach(async () => {
    // Clean up test file after each test
    try {
      await fs.unlink(TEST_FILE);
    } catch {
      // File might not exist, that's ok
    }
  });

  describe('loadTodos', () => {
    it('returns data when file exists (migrates v1 to v2)', async () => {
      // Write v1 format data
      const v1Data = {
        version: '1.0',
        lastModified: '2026-01-01T00:00:00.000Z',
        items: [
          {
            id: 'test123',
            title: 'Test item',
            completed: false,
            priority: 'medium',
            dueDate: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            completedAt: null,
            tags: [],
          },
        ],
      };
      await fs.writeFile(TEST_FILE, JSON.stringify(v1Data, null, 2));

      const result = await loadTodos(TEST_FILE);

      // Should be migrated to v2
      expect(result.version).toBe('2.0');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Test item');
      // v2 fields should be populated
      expect(result.items[0].nextAction).toBe('Test item');
      expect(result.items[0].status).toBe('active');
      expect(result.items[0].postponeCount).toBe(0);
      expect(result.activityLog).toBeDefined();
    });

    it('returns empty v2 structure when file does not exist', async () => {
      const result = await loadTodos(TEST_FILE);

      expect(result.version).toBe('2.0');
      expect(result.items).toHaveLength(0);
      expect(result.lastModified).toBeDefined();
      expect(result.activityLog).toEqual([]);
      expect(result.lastAutoReview).toBeNull();
    });
  });

  describe('saveTodos', () => {
    it('writes valid JSON to file with v2 format', async () => {
      const testData = createEmptyTodoData();

      await saveTodos(testData, TEST_FILE);

      const content = await fs.readFile(TEST_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe('2.0');
      expect(parsed.activityLog).toEqual([]);
    });

    it('updates lastModified on save', async () => {
      const testData: TodoData = {
        version: '2.0',
        lastModified: '2020-01-01T00:00:00.000Z',
        lastAutoReview: null,
        items: [],
        activityLog: [],
      };

      await saveTodos(testData, TEST_FILE);

      const content = await fs.readFile(TEST_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.lastModified).not.toBe('2020-01-01T00:00:00.000Z');
      expect(new Date(parsed.lastModified).getFullYear()).toBeGreaterThanOrEqual(2026);
    });
  });

  describe('generateId', () => {
    it('returns 8-character hex string', () => {
      const id = generateId();

      expect(id).toHaveLength(8);
      expect(/^[0-9a-f]+$/.test(id)).toBe(true);
    });

    it('returns unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('findItem', () => {
    const items: TodoItem[] = [
      createTestItem({ id: 'abc123', title: 'Buy groceries', nextAction: 'Buy groceries' }),
      createTestItem({ id: 'def456', title: 'Call dentist', nextAction: 'Call dentist office', priority: 'high' }),
    ];

    it('finds by exact ID', () => {
      const result = findItem(items, 'abc123');
      expect(result?.title).toBe('Buy groceries');
    });

    it('finds by exact title (case-insensitive)', () => {
      const result = findItem(items, 'BUY GROCERIES');
      expect(result?.id).toBe('abc123');
    });

    it('finds by partial title match', () => {
      const result = findItem(items, 'dentist');
      expect(result?.id).toBe('def456');
    });

    it('finds by nextAction match', () => {
      const result = findItem(items, 'office');
      expect(result?.id).toBe('def456');
    });

    it('returns undefined when not found', () => {
      const result = findItem(items, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('parseDate', () => {
    it('parses YYYY-MM-DD format', () => {
      expect(parseDate('2026-01-15')).toBe('2026-01-15');
    });

    it('parses "today"', () => {
      const today = getLocalDateString();
      expect(parseDate('today')).toBe(today);
    });

    it('parses "tomorrow"', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const expected = getLocalDateString(tomorrow);
      expect(parseDate('tomorrow')).toBe(expected);
    });

    it('parses "+N days" format', () => {
      const future = new Date();
      future.setDate(future.getDate() + 3);
      const expected = getLocalDateString(future);
      expect(parseDate('+3')).toBe(expected);
      expect(parseDate('+3 days')).toBe(expected);
    });

    it('returns null for invalid format', () => {
      expect(parseDate('invalid')).toBeNull();
      expect(parseDate('01-15-2026')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });
  });

  describe('parseArgs', () => {
    it('parses flags with values', () => {
      const { flags } = parseArgs(['--priority', 'high', '--due', '2026-01-15']);

      expect(flags.priority).toBe('high');
      expect(flags.due).toBe('2026-01-15');
    });

    it('parses positional arguments', () => {
      const { positional } = parseArgs(['Buy groceries', '--priority', 'high']);

      expect(positional).toEqual(['Buy groceries']);
    });

    it('handles flags without values', () => {
      const { flags } = parseArgs(['--completed']);

      expect(flags.completed).toBe('true');
    });

    it('handles mixed args', () => {
      const { flags, positional } = parseArgs([
        'Task title',
        '--priority',
        'high',
        '--due',
        'tomorrow',
      ]);

      expect(positional).toEqual(['Task title']);
      expect(flags.priority).toBe('high');
      expect(flags.due).toBe('tomorrow');
    });
  });

  describe('getItemTab', () => {
    it('returns done for completed items', () => {
      const item = createTestItem({ status: 'done', completed: true });
      expect(getItemTab(item)).toBe('done');
    });

    it('returns inbox for items without nextAction', () => {
      const item = createTestItem({ status: 'inbox', nextAction: null });
      expect(getItemTab(item)).toBe('inbox');
    });

    it('returns focus for items due today or overdue', () => {
      const today = getLocalDateString();
      const item = createTestItem({ status: 'active', dueDate: today });
      expect(getItemTab(item)).toBe('focus');
    });

    it('returns optional for items with future or no due date', () => {
      const item = createTestItem({ status: 'active', dueDate: null });
      expect(getItemTab(item)).toBe('optional');
    });
  });

  describe('filterByTab', () => {
    const today = getLocalDateString();
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return getLocalDateString(d);
    })();
    const tomorrow = (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return getLocalDateString(d);
    })();

    const items: TodoItem[] = [
      createTestItem({ id: '1', title: 'Focus item', status: 'active', dueDate: today }),
      createTestItem({ id: '2', title: 'Overdue item', status: 'active', dueDate: yesterday }),
      createTestItem({ id: '3', title: 'Optional item', status: 'active', dueDate: tomorrow }),
      createTestItem({ id: '4', title: 'No date item', status: 'active', dueDate: null }),
      createTestItem({ id: '5', title: 'Inbox item', status: 'inbox', nextAction: null }),
      createTestItem({ id: '6', title: 'Done item', status: 'done', completed: true }),
    ];

    it('filters focus items (due today or overdue)', () => {
      const result = filterByTab(items, 'focus');
      expect(result.map(i => i.id)).toEqual(['1', '2']);
    });

    it('filters optional items (future or no due date)', () => {
      const result = filterByTab(items, 'optional');
      expect(result.map(i => i.id)).toEqual(['3', '4']);
    });

    it('filters inbox items', () => {
      const result = filterByTab(items, 'inbox');
      expect(result.map(i => i.id)).toEqual(['5']);
    });

    it('filters done items', () => {
      const result = filterByTab(items, 'done');
      expect(result.map(i => i.id)).toEqual(['6']);
    });
  });
});
