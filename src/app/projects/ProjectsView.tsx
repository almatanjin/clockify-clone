'use client';

import { useState } from 'react';
import {
  createProjectAction,
  updateProjectAction,
  toggleArchiveProjectAction,
  createTaskAction,
  toggleTaskStatusAction,
  toggleArchiveTaskAction,
} from '@/app/actions/projects';
import { CurrencyIcon } from '@/components/ui/CurrencyIcon';
import {
  FolderKanban,
  Plus,
  Edit2,
  Archive,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Lock,
  Globe,
  DollarSign,
  X,
  Search,
  Check,
} from 'lucide-react';
import { WorkspaceRole, TaskStatus } from '@prisma/client';

const COLOR_PRESETS = [
  '#06B6D4', // Clockify Cyan
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#64748B', // Slate
];

interface TaskItem {
  id: string;
  name: string;
  status: TaskStatus;
  isArchived: boolean;
}

interface ProjectMemberItem {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
  };
}

interface ProjectItem {
  id: string;
  name: string;
  color: string;
  clientId: string | null;
  client: { name: string } | null;
  isBillable: boolean;
  hourlyRate: number | null;
  isPublic: boolean;
  isArchived: boolean;
  tasks: TaskItem[];
  members: ProjectMemberItem[];
}

interface WorkspaceUser {
  userId: string;
  user: {
    name: string;
    email: string;
  };
}

interface ProjectsViewProps {
  projects: ProjectItem[];
  clients: Array<{ id: string; name: string }>;
  workspaceMembers: WorkspaceUser[];
  currentUserRole: WorkspaceRole;
  currency: string;
}

export function ProjectsView({
  projects,
  clients,
  workspaceMembers,
  currentUserRole,
  currency,
}: ProjectsViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});
  const [newTaskNames, setNewTaskNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Form State
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [isBillable, setIsBillable] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const canManage = currentUserRole === WorkspaceRole.ADMIN || currentUserRole === WorkspaceRole.MANAGER;

  const filteredProjects = projects.filter((p) => {
    if (!showArchived && p.isArchived) return false;
    if (showArchived && !p.isArchived) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchClient = p.client?.name.toLowerCase().includes(q);
      if (!matchName && !matchClient) return false;
    }
    return true;
  });

  function toggleExpand(id: string) {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function openCreateModal() {
    setEditingProject(null);
    setSelectedColor(COLOR_PRESETS[0]);
    setIsPublic(true);
    setIsBillable(true);
    setSelectedMemberIds([]);
    setError(null);
    setShowAddModal(true);
  }

  function openEditModal(project: ProjectItem) {
    setEditingProject(project);
    setSelectedColor(project.color);
    setIsPublic(project.isPublic);
    setIsBillable(project.isBillable);
    setSelectedMemberIds(project.members.map((m) => m.userId));
    setError(null);
    setShowAddModal(true);
  }

  async function handleProjectSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set('color', selectedColor);
    formData.set('isPublic', isPublic ? 'true' : 'false');
    formData.set('isBillable', isBillable ? 'true' : 'false');

    selectedMemberIds.forEach((uid) => {
      formData.append('memberUserIds', uid);
    });

    let res;
    if (editingProject) {
      formData.set('id', editingProject.id);
      res = await updateProjectAction(formData);
    } else {
      res = await createProjectAction(formData);
    }

    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setShowAddModal(false);
    }
  }

  async function handleAddTask(projectId: string) {
    const taskName = newTaskNames[projectId]?.trim();
    if (!taskName) return;

    await createTaskAction(projectId, taskName);
    setNewTaskNames((prev) => ({ ...prev, [projectId]: '' }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-cyan-400" />
            Projects & Tasks
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Organize team tracking with customizable project colors, clients, billable rates, and discrete tasks.
          </p>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-2xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or clients..."
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
            Active ({projects.filter((p) => !p.isArchived).length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
              showArchived ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Archived ({projects.filter((p) => p.isArchived).length})
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <FolderKanban className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50" />
            <p className="text-sm font-medium">No {showArchived ? 'archived' : 'active'} projects found.</p>
          </div>
        ) : (
          filteredProjects.map((project) => {
            const isExpanded = !!expandedProjects[project.id];
            const rateFormatted =
              project.hourlyRate !== null ? `$${(project.hourlyRate / 100).toFixed(2)}/hr` : 'Workspace default';

            return (
              <div
                key={project.id}
                className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all"
              >
                {/* Project Header Row */}
                <div className="p-4 sm:px-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => toggleExpand(project.id)}
                      className="p-1 text-slate-400 hover:text-slate-200"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: project.color, color: project.color }}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-sm">{project.name}</span>
                        {project.client && (
                          <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                            {project.client.name}
                          </span>
                        )}
                        {project.isPublic ? (
                          <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                            <Globe className="w-3 h-3 text-cyan-400" /> Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                            <Lock className="w-3 h-3" /> Private ({project.members.length} members)
                          </span>
                        )}
                        {project.isBillable && (
                          <span className="flex items-center gap-0.5 text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded">
                            <CurrencyIcon currency={currency} className="w-3 h-3" /> Billable ({rateFormatted})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {project.tasks.length} tasks
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(project)}
                        title="Edit project"
                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleArchiveProjectAction(project.id)}
                        title={project.isArchived ? 'Restore project' : 'Archive project'}
                        className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded Tasks Section */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/60 p-4 sm:px-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Tasks ({project.tasks.length})
                      </h4>
                    </div>

                    {/* Add Task Input */}
                    {canManage && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add new task..."
                          value={newTaskNames[project.id] || ''}
                          onChange={(e) =>
                            setNewTaskNames({ ...newTaskNames, [project.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTask(project.id);
                            }
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                        />
                        <button
                          onClick={() => handleAddTask(project.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors"
                        >
                          Add Task
                        </button>
                      </div>
                    )}

                    {/* Task List */}
                    <div className="space-y-1">
                      {project.tasks.length === 0 ? (
                        <p className="text-xs text-slate-600 py-2">No tasks created yet.</p>
                      ) : (
                        project.tasks.map((task) => {
                          const isDone = task.status === TaskStatus.DONE;
                          return (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 hover:bg-slate-900 text-xs text-slate-300"
                            >
                              <div className="flex items-center gap-2">
                                {canManage ? (
                                  <button
                                    onClick={() =>
                                      toggleTaskStatusAction(
                                        task.id,
                                        isDone ? TaskStatus.ACTIVE : TaskStatus.DONE
                                      )
                                    }
                                    className="text-slate-400 hover:text-cyan-400 transition-colors"
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-4 h-4 text-teal-400" />
                                    ) : (
                                      <Circle className="w-4 h-4" />
                                    )}
                                  </button>
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                <span className={isDone ? 'line-through text-slate-500' : ''}>
                                  {task.name}
                                </span>
                              </div>

                              {canManage && (
                                <button
                                  onClick={() => toggleArchiveTaskAction(task.id)}
                                  className="text-slate-600 hover:text-amber-400 p-1"
                                  title="Archive task"
                                >
                                  <Archive className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-cyan-400" />
                  {editingProject ? 'Edit Project' : 'New Project'}
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

            <form onSubmit={handleProjectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingProject?.name || ''}
                  required
                  placeholder="e.g. Website Redesign"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Client</label>
                <select
                  name="clientId"
                  defaultValue={editingProject?.clientId || ''}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">No Client (Internal)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Presets */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Color</label>
                <div className="flex gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        selectedColor === color ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && <Check className="w-3.5 h-3.5 text-slate-950" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Billable & Rate */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={isBillable}
                      onChange={(e) => setIsBillable(e.target.checked)}
                      className="accent-cyan-400 w-4 h-4 rounded"
                    />
                    <span>Billable Project</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Rate ({currency}/hr)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="hourlyRate"
                    defaultValue={editingProject?.hourlyRate ? (editingProject.hourlyRate / 100).toFixed(2) : ''}
                    placeholder="Workspace default"
                    disabled={!isBillable}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Public vs Private */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Project Visibility
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                      className="accent-cyan-400"
                    />
                    <span>Public (all members)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                      className="accent-cyan-400"
                    />
                    <span>Private (assigned only)</span>
                  </label>
                </div>

                {!isPublic && (
                  <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <p className="text-[11px] font-medium text-slate-400">Assign Members:</p>
                    <div className="max-h-36 overflow-y-auto space-y-1">
                      {workspaceMembers.map((m) => {
                        const checked = selectedMemberIds.includes(m.userId);
                        return (
                          <label
                            key={m.userId}
                            className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer p-1 hover:bg-slate-900 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMemberIds([...selectedMemberIds, m.userId]);
                                } else {
                                  setSelectedMemberIds(selectedMemberIds.filter((id) => id !== m.userId));
                                }
                              }}
                              className="accent-cyan-400"
                            />
                            <span>{m.user.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-semibold text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingProject ? 'Save Changes' : 'Create Project'}
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
