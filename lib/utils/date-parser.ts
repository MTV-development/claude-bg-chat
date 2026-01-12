/**
 * Date parsing utilities for GTD
 * Extracted from scripts/gtd/lib/store.ts
 */

/**
 * Get a date in YYYY-MM-DD format (local timezone)
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string (supports YYYY-MM-DD, "today", "tomorrow", "+N days")
 */
export function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const lower = dateStr.toLowerCase().trim();

  if (lower === 'today') {
    return getLocalDateString();
  }

  if (lower === 'tomorrow') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getLocalDateString(tomorrow);
  }

  // Support "+N" or "+N days" format
  const daysMatch = lower.match(/^\+(\d+)(?:\s*days?)?$/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    const future = new Date();
    future.setDate(future.getDate() + days);
    return getLocalDateString(future);
  }

  // Check if it's a valid YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  return null;
}
