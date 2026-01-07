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
} from '../lib/store';
import { TodoData, TodoItem } from '../lib/types';

const TEST_FILE = path.join(__dirname, 'test-todos.json');

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
    it('returns data when file exists', async () => {
      const testData: TodoData = {
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
      await fs.writeFile(TEST_FILE, JSON.stringify(testData, null, 2));

      const result = await loadTodos(TEST_FILE);

      expect(result.version).toBe('1.0');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Test item');
    });

    it('returns empty structure when file does not exist', async () => {
      const result = await loadTodos(TEST_FILE);

      expect(result.version).toBe('1.0');
      expect(result.items).toHaveLength(0);
      expect(result.lastModified).toBeDefined();
    });
  });

  describe('saveTodos', () => {
    it('writes valid JSON to file', async () => {
      const testData: TodoData = {
        version: '1.0',
        lastModified: '2026-01-01T00:00:00.000Z',
        items: [],
      };

      await saveTodos(testData, TEST_FILE);

      const content = await fs.readFile(TEST_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.version).toBe('1.0');
    });

    it('updates lastModified on save', async () => {
      const testData: TodoData = {
        version: '1.0',
        lastModified: '2020-01-01T00:00:00.000Z',
        items: [],
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
      {
        id: 'abc123',
        title: 'Buy groceries',
        completed: false,
        priority: 'medium',
        dueDate: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
        tags: [],
      },
      {
        id: 'def456',
        title: 'Call dentist',
        completed: false,
        priority: 'high',
        dueDate: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        completedAt: null,
        tags: [],
      },
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
});
