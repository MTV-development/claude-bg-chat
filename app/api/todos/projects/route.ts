/**
 * Projects API Route
 *
 * GET /api/todos/projects - List all projects with task counts
 * GET /api/todos/projects?name=ProjectName - Get tasks for a specific project
 */

import { loadTodos, getProjects } from '../../../../scripts/gtd/lib/store';

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log(`[${timestamp}] [projects] ${message}`, data);
  } else {
    console.log(`[${timestamp}] [projects] ${message}`);
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get('name');

    log(`GET request - project: ${projectName || 'all'}`);

    const data = await loadTodos();

    if (projectName) {
      // Return tasks for specific project
      const items = data.items.filter(
        (item) => item.project === projectName && item.status !== 'done'
      );

      log(`Found ${items.length} active items in project "${projectName}"`);

      // Sort by due date, then priority
      items.sort((a, b) => {
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) {
          const cmp = a.dueDate.localeCompare(b.dueDate);
          if (cmp !== 0) return cmp;
        }
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      return Response.json({
        project: projectName,
        items,
        count: items.length,
      });
    }

    // Return all projects
    const projects = getProjects(data.items);
    log(`Found ${projects.length} projects`);
    projects.forEach(p => {
      log(`  - "${p.name}": ${p.taskCount} tasks (${p.completedCount} done)`);
    });

    return Response.json({
      projects,
      count: projects.length,
    });
  } catch (error) {
    log(`ERROR:`, error);
    return Response.json({
      projects: [],
      count: 0,
    });
  }
}
