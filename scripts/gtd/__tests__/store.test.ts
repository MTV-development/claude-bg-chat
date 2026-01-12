/**
 * Store Module Tests
 *
 * Tests for helper functions in the store module.
 * Note: Data persistence is now handled by Supabase services, tested separately.
 */

import {
  generateId,
  parseDate,
  parseArgs,
  getLocalDateString,
  filterByTab,
  getItemTab,
} from '../lib/store';
import { TodoItem } from '../lib/types';

// Helper to create a test item with all v4 fields
function createTestItem(partial: Partial<TodoItem>): TodoItem {
  return {
    id: 'test123',
    title: 'Test item',
    nextAction: 'Test item',
    status: 'active',
    completed: false,
    project: null,
    dueDate: null,
    canDoAnytime: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
    postponeCount: 0,
    ...partial,
  };
}

describe('store helpers', () => {
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

    it('returns optional for items with canDoAnytime flag', () => {
      const item = createTestItem({ status: 'active', dueDate: null, canDoAnytime: true });
      expect(getItemTab(item)).toBe('optional');
    });

    it('returns inbox for items without dueDate and not canDoAnytime', () => {
      const item = createTestItem({ status: 'active', dueDate: null, canDoAnytime: false });
      expect(getItemTab(item)).toBe('inbox');
    });

    it('returns later for items with future dueDate and not canDoAnytime', () => {
      const tomorrow = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return getLocalDateString(d);
      })();
      const item = createTestItem({ status: 'active', dueDate: tomorrow, canDoAnytime: false });
      expect(getItemTab(item)).toBe('later');
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
      createTestItem({ id: '3', title: 'Later item', status: 'active', dueDate: tomorrow, canDoAnytime: false }),
      createTestItem({ id: '4', title: 'Optional item', status: 'active', dueDate: null, canDoAnytime: true }),
      createTestItem({ id: '5', title: 'Inbox item', status: 'inbox', nextAction: null }),
      createTestItem({ id: '6', title: 'Done item', status: 'done', completed: true }),
      createTestItem({ id: '7', title: 'No date inbox', status: 'active', dueDate: null, canDoAnytime: false }),
    ];

    it('filters focus items (due today or overdue)', () => {
      const result = filterByTab(items, 'focus');
      expect(result.map(i => i.id)).toEqual(['1', '2']);
    });

    it('filters optional items (canDoAnytime)', () => {
      const result = filterByTab(items, 'optional');
      expect(result.map(i => i.id)).toEqual(['4']);
    });

    it('filters later items (future dueDate, not canDoAnytime)', () => {
      const result = filterByTab(items, 'later');
      expect(result.map(i => i.id)).toEqual(['3']);
    });

    it('filters inbox items (no nextAction or no dueDate without canDoAnytime)', () => {
      const result = filterByTab(items, 'inbox');
      expect(result.map(i => i.id)).toEqual(['5', '7']);
    });

    it('filters done items', () => {
      const result = filterByTab(items, 'done');
      expect(result.map(i => i.id)).toEqual(['6']);
    });
  });
});
