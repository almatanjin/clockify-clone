'use client';

import { useState } from 'react';
import {
  exportReportCsvAction,
  getReportsDataAction,
  ReportFilters,
} from '@/app/actions/reports';
import { CurrencyIcon, getCurrencySymbol } from '@/components/ui/CurrencyIcon';
import { DatePicker } from '@/components/ui/DatePicker';
import {
  BarChart3,
  Calendar,
  Download,
  Filter,
  PieChart as PieIcon,
  TrendingUp,
  Clock,
  User,
  FolderKanban,
  Tags,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { WorkspaceRole } from '@prisma/client';

export interface InitialFilters {
  preset?: 'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom';
  startDate?: string;
  endDate?: string;
  userId?: string;
  clientId?: string;
  projectId?: string;
  tagId?: string;
  billable?: 'all' | 'billable' | 'non-billable';
}

interface ReportsDashboardProps {
  initialData: any;
  users: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
  currentUserRole: WorkspaceRole;
  currency: string;
  initialFilters?: InitialFilters;
}

function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(1);
}

function formatDurationHhMm(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function ReportsDashboard({
  initialData,
  users,
  clients,
  projects,
  tags,
  currentUserRole,
  currency,
  initialFilters,
}: ReportsDashboardProps) {
  const [data, setData] = useState(initialData);
  const [preset, setPreset] = useState<'today' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'custom'>(
    initialFilters?.preset || 'thisMonth'
  );
  const [startDate, setStartDate] = useState(
    initialFilters?.startDate || initialData.dateRange?.startDate || ''
  );
  const [endDate, setEndDate] = useState(
    initialFilters?.endDate || initialData.dateRange?.endDate || ''
  );
  const [selectedUser, setSelectedUser] = useState(initialFilters?.userId || '');
  const [selectedClient, setSelectedClient] = useState(initialFilters?.clientId || '');
  const [selectedProject, setSelectedProject] = useState(initialFilters?.projectId || '');
  const [selectedTag, setSelectedTag] = useState(initialFilters?.tagId || '');
  const [billableFilter, setBillableFilter] = useState<'all' | 'billable' | 'non-billable'>(
    initialFilters?.billable || 'all'
  );
  const [loading, setLoading] = useState(false);

  const isMember = currentUserRole === WorkspaceRole.MEMBER;

  async function applyFilters(overrideFilters?: Partial<ReportFilters>) {
    const activePreset = overrideFilters?.preset ?? preset;
    const activeStart = overrideFilters?.startDate ?? startDate;
    const activeEnd = overrideFilters?.endDate ?? endDate;
    const activeUser =
      overrideFilters?.userId !== undefined ? overrideFilters.userId : selectedUser;
    const activeClient =
      overrideFilters?.clientId !== undefined ? overrideFilters.clientId : selectedClient;
    const activeProject =
      overrideFilters?.projectId !== undefined ? overrideFilters.projectId : selectedProject;
    const activeTag =
      overrideFilters?.tagId !== undefined ? overrideFilters.tagId : selectedTag;
    const activeBillable = overrideFilters?.billable ?? billableFilter;

    setLoading(true);

    const filters: ReportFilters = {
      preset: activePreset,
      startDate: activeStart,
      endDate: activeEnd,
      userId: activeUser || undefined,
      clientId: activeClient || undefined,
      projectId: activeProject || undefined,
      tagId: activeTag || undefined,
      billable: activeBillable,
    };

    try {
      const res = await getReportsDataAction(filters);
      setData(res);
      if (res.dateRange) {
        setStartDate(res.dateRange.startDate);
        setEndDate(res.dateRange.endDate);
      }

      // Sync URL without full page reload
      const query = new URLSearchParams();
      if (activePreset) query.set('preset', activePreset);
      if (activePreset === 'custom') {
        if (activeStart) query.set('startDate', activeStart);
        if (activeEnd) query.set('endDate', activeEnd);
      }
      if (activeUser) query.set('userId', activeUser);
      if (activeClient) query.set('clientId', activeClient);
      if (activeProject) query.set('projectId', activeProject);
      if (activeTag) query.set('tagId', activeTag);
      if (activeBillable && activeBillable !== 'all') query.set('billable', activeBillable);

      const newUrl = query.toString() ? `/reports?${query.toString()}` : '/reports';
      window.history.replaceState(null, '', newUrl);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleResetFilters() {
    setSelectedUser('');
    setSelectedClient('');
    setSelectedProject('');
    setSelectedTag('');
    setBillableFilter('all');
    applyFilters({
      userId: '',
      clientId: '',
      projectId: '',
      tagId: '',
      billable: 'all',
    });
  }

  const hasActiveFilters = Boolean(
    selectedUser ||
      selectedClient ||
      selectedProject ||
      selectedTag ||
      billableFilter !== 'all'
  );

  async function handleExportCsv() {
    const filters: ReportFilters = {
      preset,
      startDate,
      endDate,
      userId: selectedUser || undefined,
      clientId: selectedClient || undefined,
      projectId: selectedProject || undefined,
      tagId: selectedTag || undefined,
      billable: billableFilter,
    };
    const res = await exportReportCsvAction(filters);

    // Trigger browser download
    const blob = new Blob([res.content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', res.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const revenueDollars = (data.totalRevenueCents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-cyan-400" />
            <span>Reports & Analytics</span>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400 ml-1" />}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Summary metrics, project distributions, and billable revenue overviews.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-xl transition-all shadow-md cursor-pointer"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Date Presets and Filters Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'today', label: 'Today' },
              { id: 'thisWeek', label: 'This Week' },
              { id: 'lastWeek', label: 'Last Week' },
              { id: 'thisMonth', label: 'This Month' },
              { id: 'custom', label: 'Custom' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'custom') {
                    setPreset('custom');
                  } else {
                    setPreset(item.id as any);
                    applyFilters({ preset: item.id as any });
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  preset === item.id
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 text-xs flex-wrap animate-in fade-in slide-in-from-top-1">
              <DatePicker
                label="From"
                value={startDate}
                onChange={(d) => {
                  setStartDate(d);
                  if (endDate && d > endDate) {
                    setEndDate(d);
                  }
                }}
                maxDate={endDate}
                align="left"
              />
              <span className="text-slate-500 font-semibold">-</span>
              <DatePicker
                label="To"
                value={endDate}
                onChange={(d) => {
                  setEndDate(d);
                  if (startDate && d < startDate) {
                    setStartDate(d);
                  }
                }}
                minDate={startDate}
                align="right"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => applyFilters({ preset: 'custom', startDate, endDate })}
                className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 font-bold rounded-xl hover:from-cyan-400 hover:to-teal-400 cursor-pointer transition-all shadow-sm disabled:opacity-50 text-xs"
              >
                {loading ? 'Applying...' : 'Apply Range'}
              </button>
            </div>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {!isMember && (
            <select
              value={selectedUser}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedUser(val);
                applyFilters({ userId: val });
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedClient}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedClient(val);
              applyFilters({ clientId: val });
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedProject}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedProject(val);
              applyFilters({ projectId: val });
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedTag}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedTag(val);
              applyFilters({ tagId: val });
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.name}
              </option>
            ))}
          </select>

          <select
            value={billableFilter}
            onChange={(e) => {
              const val = e.target.value as 'all' | 'billable' | 'non-billable';
              setBillableFilter(val);
              applyFilters({ billable: val });
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Billability</option>
            <option value="billable">Billable Only</option>
            <option value="non-billable">Non-Billable Only</option>
          </select>
        </div>

        {/* Active Filters Reset Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-xs">
            <span className="text-slate-400">
              Filter active
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset to All</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Tracked</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono">
            {formatDurationHhMm(data.totalDurationSeconds)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {formatHours(data.totalDurationSeconds)} decimal hours
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Billable Hours</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono">
            {formatDurationHhMm(data.billableDurationSeconds)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Non-billable: {formatDurationHhMm(data.nonBillableDurationSeconds)}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Billable Revenue</span>
            <CurrencyIcon currency={currency} className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono">
            {revenueDollars}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Based on snapshotted hourly rates
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Time Worked Over Time
          </h3>
          <div className="h-64 w-full">
            {data.dailyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No data for this date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyTrend}>
                  <XAxis dataKey="label" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} unit="h" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '0.75rem',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="totalHours" name="Total Hours" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="billableHours" name="Billable Hours" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project Breakdown Pie Chart */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-cyan-400" />
            Project Breakdown
          </h3>
          <div className="h-44 w-full flex items-center justify-center">
            {data.projectBreakdown.length === 0 ? (
              <span className="text-xs text-slate-500">No project data.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.projectBreakdown}
                    dataKey="seconds"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {data.projectBreakdown.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '0.75rem',
                      color: '#F8FAFC',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 max-h-36 pr-1">
            {data.projectBreakdown.map((p: any) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-slate-300 truncate">{p.name}</span>
                </div>
                <span className="font-mono text-slate-400">{p.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Entries Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">
            Detailed Entries ({data.entries.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Date</th>
                {!isMember && <th className="px-5 py-3">User</th>}
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Project</th>
                <th className="px-5 py-3">Duration</th>
                <th className="px-5 py-3 text-right">Billable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {data.entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No entries match the current filter selection.
                  </td>
                </tr>
              ) : (
                data.entries.map((e: any) => {
                  const billableRev = e.isBillable
                    ? ((e.duration / 3600) * (e.hourlyRate / 100)).toFixed(2)
                    : '0.00';

                  return (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3 text-slate-400 font-mono" suppressHydrationWarning>
                        {new Date(e.startTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      {!isMember && (
                        <td className="px-5 py-3 text-slate-300 font-semibold">{e.user.name}</td>
                      )}
                      <td className="px-5 py-3 text-slate-200">
                        {e.description || <span className="italic text-slate-500">No description</span>}
                      </td>
                      <td className="px-5 py-3">
                        {e.project ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: e.project.color }}
                            />
                            <span className="text-slate-300 font-semibold">{e.project.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-100 font-semibold">
                        {formatDurationHhMm(e.duration)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold">
                        {e.isBillable ? (
                          <span className="text-teal-400">
                            {getCurrencySymbol(currency)}
                            {billableRev}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
