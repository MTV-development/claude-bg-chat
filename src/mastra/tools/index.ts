import { createAddTodoTool } from './add-todo';
import { createListTodosTool } from './list-todos';
import { createCompleteTodoTool } from './complete-todo';
import { createUncompleteTodoTool } from './uncomplete-todo';
import { createClarifyTodoTool } from './clarify-todo';
import { createPostponeTodoTool } from './postpone-todo';
import { createUpdateTodoTool } from './update-todo';
import { createRemoveTodoTool } from './remove-todo';
import { createListProjectsTool } from './list-projects';

/**
 * Create all GTD tools bound to a specific user
 */
export function createGtdTools(userId: string) {
  return {
    addTodo: createAddTodoTool(userId),
    listTodos: createListTodosTool(userId),
    completeTodo: createCompleteTodoTool(userId),
    uncompleteTodo: createUncompleteTodoTool(userId),
    clarifyTodo: createClarifyTodoTool(userId),
    postponeTodo: createPostponeTodoTool(userId),
    updateTodo: createUpdateTodoTool(userId),
    removeTodo: createRemoveTodoTool(userId),
    listProjects: createListProjectsTool(userId),
  };
}

// Re-export individual tool factories
export { createAddTodoTool } from './add-todo';
export { createListTodosTool } from './list-todos';
export { createCompleteTodoTool } from './complete-todo';
export { createUncompleteTodoTool } from './uncomplete-todo';
export { createClarifyTodoTool } from './clarify-todo';
export { createPostponeTodoTool } from './postpone-todo';
export { createUpdateTodoTool } from './update-todo';
export { createRemoveTodoTool } from './remove-todo';
export { createListProjectsTool } from './list-projects';
