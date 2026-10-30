import { getWorkspaceContextData } from '@/app/actions/workspace';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { redirect } from 'next/navigation';

export async function AppShell({ children }: { children: React.ReactNode }) {
  let contextData;
  try {
    contextData = await getWorkspaceContextData();
  } catch {
    redirect('/login');
  }

  const { session, workspace, userWorkspaces } = contextData;
  if (!workspace) {
    redirect('/login');
  }

  const formattedWorkspaces = userWorkspaces.map((uw) => ({
    id: uw.workspace.id,
    name: uw.workspace.name,
    role: uw.role,
  }));

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-cyan-500/20 selection:text-cyan-300">
      <Sidebar role={session.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentWorkspace={{
            id: workspace.id,
            name: workspace.name,
            currency: workspace.currency,
          }}
          workspaces={formattedWorkspaces}
          currentUser={{
            name: session.name,
            email: session.email,
            role: session.role,
          }}
        />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
