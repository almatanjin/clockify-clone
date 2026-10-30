import { AppShell } from '@/components/layout/AppShell';
import { getWorkspaceContextData } from '@/app/actions/workspace';
import { TeamView } from './TeamView';

export default async function TeamPage() {
  const context = await getWorkspaceContextData();
  const { session, workspace, members, invitations } = context;

  return (
    <AppShell>
      <TeamView
        members={members}
        invitations={invitations}
        currentUserId={session.userId}
        currentUserRole={session.role}
        currency={workspace?.currency || 'USD'}
      />
    </AppShell>
  );
}
