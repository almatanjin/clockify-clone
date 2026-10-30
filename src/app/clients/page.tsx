import { AppShell } from '@/components/layout/AppShell';
import { getClientsAction } from '@/app/actions/clients';
import { requireAuthSession } from '@/app/actions/workspace';
import { ClientsView } from './ClientsView';

export default async function ClientsPage() {
  const session = await requireAuthSession();
  const clients = await getClientsAction(true); // get active & archived

  return (
    <AppShell>
      <ClientsView clients={clients} currentUserRole={session.role} />
    </AppShell>
  );
}
