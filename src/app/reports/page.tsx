import { AppShell } from '@/components/layout/AppShell';
import { ReportsDashboard } from '@/components/reports/ReportsDashboard';
import { getReportsDataAction } from '@/app/actions/reports';
import { getProjectsAction } from '@/app/actions/projects';
import { getClientsAction } from '@/app/actions/clients';
import { getTagsAction } from '@/app/actions/tags';
import { getWorkspaceContextData } from '@/app/actions/workspace';

interface ReportsPageProps {
  searchParams: Promise<{
    preset?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
    clientId?: string;
    projectId?: string;
    tagId?: string;
    billable?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const context = await getWorkspaceContextData();
  const { session, workspace, members } = context;

  const initialFilters = {
    preset: (params.preset as any) || 'thisMonth',
    startDate: params.startDate,
    endDate: params.endDate,
    userId: params.userId || '',
    clientId: params.clientId || '',
    projectId: params.projectId || '',
    tagId: params.tagId || '',
    billable: (params.billable as any) || 'all',
  };

  const [reportsData, projects, clients, tags] = await Promise.all([
    getReportsDataAction({
      preset: initialFilters.preset,
      startDate: initialFilters.startDate,
      endDate: initialFilters.endDate,
      userId: initialFilters.userId || undefined,
      clientId: initialFilters.clientId || undefined,
      projectId: initialFilters.projectId || undefined,
      tagId: initialFilters.tagId || undefined,
      billable: initialFilters.billable,
    }),
    getProjectsAction(false),
    getClientsAction(false),
    getTagsAction(false),
  ]);

  const userList = members.map((m) => ({
    id: m.userId,
    name: m.user.name,
  }));

  const projectList = projects.map((p) => ({
    id: p.id,
    name: p.name,
  }));

  const clientList = clients.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const tagList = tags.map((t) => ({
    id: t.id,
    name: t.name,
  }));

  return (
    <AppShell>
      <ReportsDashboard
        initialData={reportsData}
        users={userList}
        clients={clientList}
        projects={projectList}
        tags={tagList}
        currentUserRole={session.role}
        currency={workspace?.currency || 'USD'}
        initialFilters={initialFilters}
      />
    </AppShell>
  );
}
