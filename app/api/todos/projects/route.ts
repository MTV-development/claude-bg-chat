/**
 * Projects API Route
 *
 * GET /api/todos/projects - List all projects with task counts
 * GET /api/todos/projects?id=projectId - Get tasks for a specific project
 */

import { getCurrentUser } from '@/lib/services/auth/get-current-user';
import { listProjects, getProjectTodos } from '@/lib/services/projects/list-projects';

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log('[' + timestamp + '] [projects] ' + message, data);
  } else {
    console.log('[' + timestamp + '] [projects] ' + message);
  }
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('id');
    const projectName = searchParams.get('name');

    log('GET request - project: ' + (projectId || projectName || 'all'));

    if (projectId) {
      // Return tasks for specific project by ID
      const items = await getProjectTodos(user.userId, projectId);

      log('Found ' + items.length + ' active items in project');

      return Response.json({
        projectId,
        items,
        count: items.length,
      });
    }

    // For legacy support: if name is provided, find project by name first
    if (projectName) {
      const allProjects = await listProjects(user.userId);
      const project = allProjects.find((p) => p.name === projectName);

      if (project) {
        const items = await getProjectTodos(user.userId, project.id);
        log('Found ' + items.length + ' active items in project "' + projectName + '"');

        return Response.json({
          project: projectName,
          items,
          count: items.length,
        });
      }

      return Response.json({
        project: projectName,
        items: [],
        count: 0,
      });
    }

    // Return all projects
    const projects = await listProjects(user.userId);
    log('Found ' + projects.length + ' projects');
    projects.forEach((p) => {
      log('  - "' + p.name + '": ' + p.taskCount + ' tasks (' + p.completedCount + ' done)');
    });

    return Response.json({
      projects,
      count: projects.length,
    });
  } catch (error) {
    log('ERROR:', error);
    return Response.json({
      projects: [],
      count: 0,
    });
  }
}
