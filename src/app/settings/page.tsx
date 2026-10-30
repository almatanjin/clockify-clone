import { AppShell } from '@/components/layout/AppShell';
import { getWorkspaceContextData } from '@/app/actions/workspace';
import { redirect } from 'next/navigation';
import { WorkspaceRole } from '@prisma/client';
import { SettingsView } from './SettingsView';

export default async function SettingsPage() {
  const context = await getWorkspaceContextData();
  const { session, workspace } = context;

  if (session.role !== WorkspaceRole.ADMIN || !workspace) {
    redirect('/tracker');
  }

  return (
    <AppShell>
      <SettingsView workspace={workspace} />
    </AppShell>
  );
}
