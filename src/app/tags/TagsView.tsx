'use client';

import { useState } from 'react';
import { createTagAction, updateTagAction, toggleArchiveTagAction } from '@/app/actions/tags';
import { Tags, Plus, Edit2, Archive, Check, X, Search } from 'lucide-react';
import { WorkspaceRole } from '@prisma/client';

interface TagItem {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: Date | string;
  _count: {
    timeEntries: number;
  };
}

interface TagsViewProps {
  tags: TagItem[];
  currentUserRole: WorkspaceRole;
}

export function TagsView({ tags, currentUserRole }: TagsViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = currentUserRole === WorkspaceRole.ADMIN || currentUserRole === WorkspaceRole.MANAGER;

  const filteredTags = tags.filter((t) => {
    if (!showArchived && t.isArchived) return false;
    if (showArchived && !t.isArchived) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await createTagAction(formData);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setShowAddModal(false);
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    await updateTagAction(id, editName);
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Tags className="w-6 h-6 text-cyan-400" />
            Tags
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Categorize and label time entries across projects for reporting.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Tag</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tags..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
              !showArchived ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active ({tags.filter((t) => !t.isArchived).length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
              showArchived ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived ({tags.filter((t) => t.isArchived).length})
          </button>
        </div>
      </div>

      {/* Tags List */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {filteredTags.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Tags className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50" />
            <p className="text-sm font-medium">No {showArchived ? 'archived' : 'active'} tags found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredTags.map((tag) => {
              const isEditing = editingId === tag.id;

              return (
                <div
                  key={tag.id}
                  className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2 max-w-sm">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => handleSaveEdit(tag.id)}
                          className="p-1 text-teal-400 hover:text-teal-300"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-slate-500 hover:text-slate-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          #{tag.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {tag._count.timeEntries} entries
                        </span>
                      </div>
                    )}
                  </div>

                  {canManage && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingId(tag.id);
                          setEditName(tag.name);
                        }}
                        title="Edit tag"
                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleArchiveTagAction(tag.id)}
                        title={tag.isArchived ? 'Restore tag' : 'Archive tag'}
                        className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Tag Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Tags className="w-5 h-5 text-cyan-400" />
                  New Tag
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Tag Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">#</span>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="feature, meeting, bugfix"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Creating...' : 'Create Tag'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
