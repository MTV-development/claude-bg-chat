/**
 * GTD CLI Type Definitions
 */

export interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  tags: string[];
}

export interface TodoData {
  version: string;
  lastModified: string;
  items: TodoItem[];
}

export interface CommandResult {
  success: boolean;
  error?: string;
  item?: TodoItem;
  items?: TodoItem[];
  removed?: TodoItem;
  count?: number;
}
