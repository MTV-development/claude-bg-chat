/**
 * Test setup for GTD tests
 *
 * Since store.ts now imports from services which require database,
 * we need to mock the database module for unit tests that only
 * test pure helper functions.
 */

// Mock the database module
jest.mock('@/db', () => ({
  db: {},
}));

// Mock the services that depend on db
jest.mock('@/lib/services/todos/create-todo', () => ({
  createTodo: jest.fn(),
}));

jest.mock('@/lib/services/todos/list-todos', () => ({
  listTodos: jest.fn(),
  getItemTab: jest.requireActual('@/lib/services/todos/list-todos').getItemTab,
}));

jest.mock('@/lib/services/todos/update-todo', () => ({
  updateTodo: jest.fn(),
}));

jest.mock('@/lib/services/todos/delete-todo', () => ({
  deleteTodo: jest.fn(),
}));

jest.mock('@/lib/services/todos/postpone-todo', () => ({
  postponeTodo: jest.fn(),
}));

jest.mock('@/lib/services/todos/find-todo', () => ({
  findTodo: jest.fn(),
}));

jest.mock('@/lib/services/projects/get-or-create-project', () => ({
  getOrCreateProject: jest.fn(),
}));

jest.mock('@/lib/services/projects/list-projects', () => ({
  listProjects: jest.fn(),
}));

jest.mock('@/lib/services/projects/delete-project-todos', () => ({
  deleteProjectTodos: jest.fn(),
}));
