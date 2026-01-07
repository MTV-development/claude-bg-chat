#!/usr/bin/env npx ts-node
/**
 * GTD CLI Entry Point
 *
 * Usage: npx ts-node scripts/gtd/cli.ts <command> [args]
 */

const cliStartTime = Date.now();

import { add } from './commands/add';
import { list } from './commands/list';
import { complete } from './commands/complete';
import { uncomplete } from './commands/uncomplete';
import { remove } from './commands/remove';
import { update } from './commands/update';
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
      case 'help':
      case '--help':
      case '-h':
        result = {
          success: true,
          error: `GTD CLI - Task Management

Commands:
  add <title> [--priority high|medium|low] [--due YYYY-MM-DD|today|tomorrow] [--tags tag1,tag2]
  list [--completed] [--pending] [--priority high|medium|low]
  complete <id|title>
  uncomplete <id|title>
  remove <id|title>
  update <id> [--title "..."] [--priority ...] [--due ...]

Examples:
  node scripts/gtd/cli.ts add "Buy groceries"
  node scripts/gtd/cli.ts add "Call dentist" --priority high --due tomorrow
  node scripts/gtd/cli.ts list --pending
  node scripts/gtd/cli.ts complete "Buy groceries"
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
