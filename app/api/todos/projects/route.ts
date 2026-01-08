/**
 * Projects API Route
 *
 * GET /api/todos/projects - List all projects with task counts
 * GET /api/todos/projects?name=ProjectName - Get tasks for a specific project
 */

import { loadTodos, getProjects } from '../../../../scripts/gtd/lib/store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectName = searchParams.get('name');

    const data = await loadTodos();

    if (projectName) {
      // Return tasks for specific project
      const items = data.items.filter(
        (item) => item.project === projectName && item.status !== 'done'
      );

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

    return Response.json({
      projects,
      count: projects.length,
    });
  } catch (error) {
    return Response.json({
      projects: [],
      count: 0,
    });
  }
}
