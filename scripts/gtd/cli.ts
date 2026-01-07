#!/usr/bin/env npx ts-node
/**
 * GTD CLI Entry Point
 *
 * Usage: npx ts-node scripts/gtd/cli.ts <command> [args]
 */

const cliStartTime = Date.now();

import { add } from './commands/add';
import { list, listProjects } from './commands/list';
import { complete } from './commands/complete';
import { uncomplete } from './commands/uncomplete';
import { remove } from './commands/remove';
import { update } from './commands/update';
import { clarify } from './commands/clarify';
import { postpone } from './commands/postpone';
import { CommandResult } from './lib/types';

const importTime = Date.now() - cliStartTime;
console.error(`[GTD] Imports loaded in ${importTime}ms`);

const [command, ...args] = process.argv.slice(2);

async function main(): Promise<void> {
  let result: CommandResult;

  const cmdStartTime = Date.now();
  try {
    switch (command) {
      case 'add':
        result = await add(args);
        break;
      case 'list':
        result = await list(args);
        break;
      case 'projects':
        result = await listProjects();
        break;
      case 'complete':
        result = await complete(args);
        break;
      case 'uncomplete':
        result = await uncomplete(args);
        break;
      case 'remove':
        result = await remove(args);
        break;
      case 'update':
        result = await update(args);
        break;
      case 'clarify':
        result = await clarify(args);
        break;
      case 'postpone':
        result = await postpone(args);
        break;
      case 'help':
      case '--help':
      case '-h':
        result = {
          success: true,
          error: `GTD CLI - Task Management (v2.0)

Commands:
  add <title> [options]           Add a new task
    --priority high|medium|low    Set priority (default: medium)
    --due DATE                    Set due date (YYYY-MM-DD, today, tomorrow, +N days)
    --tags tag1,tag2              Add tags
    --project "Name"              Assign to project
    --status inbox|active|someday Set status (default: active)

  list [options]                  List tasks
    --tab focus|optional|inbox|done|projects  Filter by GTD tab
    --completed                   Show completed only
    --pending                     Show pending only
    --priority high|medium|low    Filter by priority
    --project "Name"              Filter by project

  projects                        List all projects with counts

  complete <id|title>             Mark task as done
  uncomplete <id|title>           Mark task as not done

  clarify <id|title> [options]    Set next action for inbox item
    --next-action "..."           The concrete next step (required)
    --project "Name"              Assign to project

  postpone <id|title> [options]   Postpone task
    --days N                      Days to postpone (required)

  update <id|title> [options]     Update task properties
    --title "..."                 New title
    --next-action "..."           New next action
    --priority high|medium|low    New priority
    --due DATE                    New due date (or 'none' to clear)
    --project "Name"              New project (or 'none' to clear)
    --status inbox|active|someday|done  New status

  remove <id|title>               Delete a task

Examples:
  gtd add "Buy groceries" --due tomorrow
  gtd add "Plan vacation" --status inbox
  gtd list --tab focus
  gtd clarify "Plan vacation" --next-action "Research destinations" --project "Vacation"
  gtd postpone "Buy groceries" --days 3
  gtd complete "Buy groceries"
`,
        };
        break;
      default:
        result = {
          success: false,
          error: `Unknown command: ${command}. Use --help for usage.`,
        };
    }
  } catch (err) {
    result = {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  const cmdTime = Date.now() - cmdStartTime;
  const totalTime = Date.now() - cliStartTime;
  console.error(`[GTD] Command '${command}' executed in ${cmdTime}ms (total: ${totalTime}ms)`);

  console.log(JSON.stringify(result));

  if (!result.success) {
    process.exit(1);
  }
}

main();
