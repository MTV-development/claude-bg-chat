import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const todoStatusEnum = pgEnum('todo_status', [
  'inbox',
  'active',
  'someday',
  'done',
]);

export const activityActionEnum = pgEnum('activity_action', [
  'created',
  'postponed',
  'completed',
  'clarified',
  'deleted',
  'uncompleted',
]);

// ============================================================================
// USERS
// ============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: text('auth_id').unique(), // Links to Supabase auth.users
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================================================
// PROJECTS
// ============================================================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================================================
// TODOS
// ============================================================================

export const todos = pgTable('todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),

  // Content
  title: text('title').notNull(), // Raw capture
  nextAction: text('next_action'), // Clarified action

  // Status and dates
  status: todoStatusEnum('status').default('inbox'),
  dueDate: date('due_date'),
  canDoAnytime: boolean('can_do_anytime').default(false),
  postponeCount: integer('postpone_count').default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================================================
// ACTIVITY LOG
// ============================================================================

export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  todoId: uuid('todo_id')
    .notNull()
    .references(() => todos.id, { onDelete: 'cascade' }),
  action: activityActionEnum('action').notNull(),
  details: jsonb('details').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  todos: many(todos),
  projects: many(projects),
  activityLogs: many(activityLog),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  todos: many(todos),
}));

export const todosRelations = relations(todos, ({ one, many }) => ({
  user: one(users, {
    fields: [todos.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [todos.projectId],
    references: [projects.id],
  }),
  activityLogs: many(activityLog),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
  todo: one(todos, {
    fields: [activityLog.todoId],
    references: [todos.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;

export type ActivityLog = typeof activityLog.$inferSelect;
export type NewActivityLog = typeof activityLog.$inferInsert;
