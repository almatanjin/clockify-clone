import { AppShell } from '@/components/layout/AppShell';
import { getProjectsAction } from '@/app/actions/projects';
import { getClientsAction } from '@/app/actions/clients';
import { getWorkspaceContextData } from '@/app/actions/workspace';
import { ProjectsView } from './ProjectsView';

export default async function ProjectsPage() {
  const context = await getWorkspaceContextData();
  const { session, workspace, members } = context;

  const [projects, clients] = await Promise.all([
    getProjectsAction(true), // get all projects (active & archived)
    getClientsAction(false), // get active clients for dropdown
  ]);

  return (
    <AppShell>
      <ProjectsView
        projects={projects}
        clients={clients}
        workspaceMembers={members}
        currentUserRole={session.role}
        currency={workspace?.currency || 'USD'}
      />
    </AppShell>
  );
}
