import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, ArrowLeftIcon, ArrowDownTrayIcon, UserPlusIcon, UsersIcon } from '@heroicons/react/24/outline';
import { projectsApi, tasksApi, exportsApi } from '../api/endpoints';
import type { CreateTaskDto, TaskItemStatus } from '../types/models';
import { TaskStatusLabels } from '../types/models';
import AddMemberModal from '../components/AddMemberModal';
import MembersPanel from '../components/MembersPanel';
import { useAuth } from '../auth/AuthContext';

const statusColors: Record<TaskItemStatus, string> = {
  0: 'bg-slate-100 text-slate-700',
  1: 'bg-amber-100 text-amber-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-emerald-100 text-emerald-800',
  4: 'bg-rose-100 text-rose-800',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<TaskItemStatus | undefined>(undefined);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const { data: project } = useQuery({ queryKey: ['project', projectId], queryFn: () => projectsApi.get(projectId!), enabled: !!projectId });
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId, filter],
    queryFn: () => tasksApi.listByProject(projectId!, filter),
    enabled: !!projectId,
  });
  const createMutation = useMutation({
    mutationFn: (dto: CreateTaskDto) => tasksApi.create(projectId!, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', projectId] }),
  });

  const { data: exports } = useQuery({
    queryKey: ['exports', projectId],
    queryFn: () => exportsApi.list(projectId!),
    enabled: !!projectId,
  });
  const exportMutation = useMutation({
    mutationFn: () => exportsApi.create(projectId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exports', projectId] }),
  });

  if (!projectId) return <p>Nieprawidłowy identyfikator projektu.</p>;

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/" className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 mb-4">
        <ArrowLeftIcon className="h-4 w-4" />
        Wszystkie projekty
      </Link>
      <div className="flex justify-between items-start gap-4 mb-1">
        <h1 className="text-3xl font-bold text-slate-900">{project?.name || 'Projekt'}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMemberModalOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition"
            title="Dodaj członka do projektu (tylko owner)"
          >
            <UserPlusIcon className="h-4 w-4" />
            Dodaj członka
          </button>
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 px-4 py-2 rounded-lg font-medium text-sm transition"
            title="Eksportuj zadania do CSV (Azure Files Storage)"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {exportMutation.isPending ? 'Eksportowanie...' : 'Eksport CSV'}
          </button>
        </div>
      </div>
      {project?.description && <p className="text-slate-600 mb-2">{project.description}</p>}
      {project && (
        <p className="text-xs text-slate-500 mb-6 flex items-center gap-1">
          <UsersIcon className="h-3.5 w-3.5" />
          {project.memberCount} {project.memberCount === 1 ? 'członek' : 'członków'} · {project.taskCount} zadań
        </p>
      )}

      <AddMemberModal projectId={projectId} open={memberModalOpen} onClose={() => setMemberModalOpen(false)} />

      {exports && exports.length > 0 && (
        <details className="bg-slate-50 border border-slate-200 rounded-lg mb-6 text-sm">
          <summary className="cursor-pointer px-4 py-2 font-medium text-slate-700 hover:bg-slate-100">
            Wcześniejsze eksporty ({exports.length})
          </summary>
          <ul className="divide-y divide-slate-200">
            {exports.map((e) => (
              <li key={e.fileName} className="px-4 py-2 flex justify-between items-center gap-4">
                <span className="text-slate-700 truncate">{e.fileName}</span>
                <span className="text-xs text-slate-500 whitespace-nowrap">{(e.sizeBytes / 1024).toFixed(1)} KB · {new Date(e.createdAt).toLocaleString('pl-PL')}</span>
                <a href={exportsApi.downloadUrl(projectId, e.fileName)} className="text-brand-600 hover:text-brand-700 text-xs font-medium" target="_blank" rel="noreferrer">Pobierz</a>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex justify-between items-center gap-2 mb-6 flex-wrap">
        <div className="flex gap-2 overflow-x-auto">
          <button onClick={() => setFilter(undefined)} className={`px-4 py-1.5 rounded-full text-sm font-medium ${filter === undefined ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            Wszystkie
          </button>
          {([0, 1, 2, 3] as TaskItemStatus[]).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${filter === s ? 'bg-brand-600 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              {TaskStatusLabels[s]}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowTaskForm(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm whitespace-nowrap"
        >
          <PlusIcon className="h-5 w-5" />
          Nowe zadanie
        </button>
      </div>

      {showTaskForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTitle.trim()) return;
            createMutation.mutate(
              { title: newTitle.trim(), description: newDescription.trim() || null },
              {
                onSuccess: () => {
                  setNewTitle('');
                  setNewDescription('');
                  setShowTaskForm(false);
                },
              },
            );
          }}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm"
        >
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Tytuł zadania (wymagane)"
            required
            className="w-full mb-3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Opis (opcjonalny)"
            rows={2}
            className="w-full mb-3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowTaskForm(false);
                setNewTitle('');
                setNewDescription('');
              }}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!newTitle.trim() || createMutation.isPending}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
            >
              {createMutation.isPending ? 'Tworzenie...' : 'Utwórz zadanie'}
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded p-2 mt-2">
              {(createMutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Nie udało się utworzyć zadania'}
            </p>
          )}
        </form>
      )}

      {isLoading && <p className="text-slate-500">Ładowanie...</p>}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
        {tasks?.map((t) => (
          <Link key={t.id} to={`/tasks/${t.id}`} className="block p-4 hover:bg-slate-50 transition">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-900 truncate">{t.title}</h4>
                {t.description && <p className="text-sm text-slate-600 mt-1 line-clamp-1">{t.description}</p>}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${statusColors[t.status]}`}>{TaskStatusLabels[t.status]}</span>
            </div>
            {t.dueDate && (
              <p className="text-xs text-slate-500 mt-2">Termin: {new Date(t.dueDate).toLocaleDateString('pl-PL')}</p>
            )}
          </Link>
        ))}
        {tasks && tasks.length === 0 && (
          <p className="p-8 text-center text-slate-500">Brak zadań w tym projekcie.</p>
        )}
      </div>

      <div className="mt-8">
        <MembersPanel projectId={projectId} isOwner={!!project && !!user && project.ownerId === user.id} />
      </div>
    </div>
  );
}
