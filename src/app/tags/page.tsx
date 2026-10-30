import { AppShell } from '@/components/layout/AppShell';
import { getTagsAction } from '@/app/actions/tags';
import { requireAuthSession } from '@/app/actions/workspace';
import { TagsView } from './TagsView';

export default async function TagsPage() {
  const session = await requireAuthSession();
  const tags = await getTagsAction(true); // get active & archived

  return (
    <AppShell>
      <TagsView tags={tags} currentUserRole={session.role} />
    </AppShell>
  );
}
