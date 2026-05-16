import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeftIcon, PaperClipIcon, ClockIcon, ArrowUpTrayIcon, SparklesIcon, TrashIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { tasksApi, attachmentsApi } from '../api/endpoints';
import type { TaskItemStatus, UpdateTaskDto } from '../types/models';
import { TaskStatusLabels } from '../types/models';
import ConfirmDialog from '../components/ConfirmDialog';

const actionLabels: Record<string, string> = {
  Created: 'Utworzono',
  Updated: 'Zaktualizowano',
  Deleted: 'Usunięto',
  AttachmentUploaded: 'Wgrano załącznik',
  AttachmentDeleted: 'Usunięto załącznik',
  Notification: 'Powiadomienie',
};

const actionColors: Record<string, string> = {
  Created: 'bg-emerald-100 text-emerald-800',
  Updated: 'bg-blue-100 text-blue-800',
  Deleted: 'bg-rose-100 text-rose-800',
  AttachmentUploaded: 'bg-violet-100 text-violet-800',
  AttachmentDeleted: 'bg-rose-100 text-rose-800',
  Notification: 'bg-amber-100 text-amber-800',
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: task, isLoading } = useQuery({ queryKey: ['task', taskId], queryFn: () => tasksApi.get(taskId!), enabled: !!taskId });
  const { data: attachments } = useQuery({ queryKey: ['attachments', taskId], queryFn: () => attachmentsApi.list(taskId!), enabled: !!taskId });
  const { data: audit } = useQuery({ queryKey: ['audit', taskId], queryFn: () => attachmentsApi.audit(taskId!), enabled: !!taskId });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskItemStatus>(0);
  const [dueDate, setDueDate] = useState('');
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false);
  const [confirmDeleteAttachment, setConfirmDeleteAttachment] = useState<{ id: string; fileName: string } | null>(null);
  const [copiedAttachmentId, setCopiedAttachmentId] = useState<string | null>(null);

  const copyTags = async (attachmentId: string, tags: string[]) => {
    try {
      await navigator.clipboard.writeText(tags.join(', '));
      setCopiedAttachmentId(attachmentId);
      window.setTimeout(() => setCopiedAttachmentId((current) => (current === attachmentId ? null : current)), 2000);
    } catch {
      // Fallback dla starszych przegladarek lub gdy clipboard zablokowany - prompt z lista do recznego kopiowania
      window.prompt('Skopiuj tagi:', tags.join(', '));
    }
  };

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
    }
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateTaskDto) => tasksApi.update(taskId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['audit', taskId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(taskId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      navigate(task ? `/projects/${task.projectId}` : '/');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(taskId!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', taskId] });
      qc.invalidateQueries({ queryKey: ['audit', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId: string) => attachmentsApi.delete(taskId!, attachmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', taskId] });
      qc.invalidateQueries({ queryKey: ['audit', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      setConfirmDeleteAttachment(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = '';                                                     // reset input
    }
  };

  if (isLoading) return <p className="text-slate-500">Ładowanie...</p>;
  if (!task) return <p>Nie znaleziono zadania.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(`/projects/${task.projectId}`)} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
        <ArrowLeftIcon className="h-4 w-4" /> Powrót
      </button>

      {/* === Sekcja: edycja zadania === */}
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <h2 className="text-sm uppercase font-semibold text-slate-500 mb-2">Szczegóły zadania</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-2xl font-bold text-slate-900 mb-4 border-b border-transparent hover:border-slate-300 focus:border-brand-500 outline-none pb-1"
        />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <label className="block">
            <span className="text-xs font-medium text-slate-600 mb-1 block">Status</span>
            <select value={status} onChange={(e) => setStatus(Number(e.target.value) as TaskItemStatus)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500">
              {([0, 1, 2, 3, 4] as TaskItemStatus[]).map(s => <option key={s} value={s}>{TaskStatusLabels[s]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600 mb-1 block">Termin</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
          </label>
        </div>

        <label className="block mb-6">
          <span className="text-xs font-medium text-slate-600 mb-1 block">Opis</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500" />
        </label>

        <div className="flex justify-between">
          <button onClick={() => setConfirmDeleteTask(true)} className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium">
            Usuń zadanie
          </button>
          <button
            onClick={() => updateMutation.mutate({ title, description: description || null, status, assigneeId: task.assigneeId, dueDate: dueDate || null })}
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteTask}
        onClose={() => setConfirmDeleteTask(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Usunąć zadanie?"
        description={`Zadanie "${task.title}" zostanie trwale usunięte wraz ze wszystkimi załącznikami i historią zmian. Tej operacji nie można cofnąć.`}
        confirmLabel="Usuń zadanie"
        destructive
        loading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={confirmDeleteAttachment !== null}
        onClose={() => setConfirmDeleteAttachment(null)}
        onConfirm={() => confirmDeleteAttachment && deleteAttachmentMutation.mutate(confirmDeleteAttachment.id)}
        title="Usunąć załącznik?"
        description={`Plik "${confirmDeleteAttachment?.fileName}" zostanie usunięty z Azure Blob Storage. Tej operacji nie można cofnąć.`}
        confirmLabel="Usuń załącznik"
        destructive
        loading={deleteAttachmentMutation.isPending}
      />

      {/* === Sekcja: Załączniki (Blob Storage + Function trigger + AI Vision tagging) === */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase font-semibold text-slate-500 flex items-center gap-2">
            <PaperClipIcon className="h-4 w-4" /> Załączniki ({attachments?.length || 0})
          </h2>
          <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {uploadMutation.isPending ? 'Wgrywanie...' : 'Dodaj plik'}
          </button>
        </div>

        {uploadMutation.isError && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded p-2 mb-3">
            Błąd uploadu: {(uploadMutation.error as Error).message}
          </p>
        )}

        {attachments && attachments.length === 0 && (
          <p className="text-sm text-slate-500 italic">Brak załączników. Wgraj plik — obrazy zostaną auto-otagowane przez Azure AI Vision.</p>
        )}

        <ul className="space-y-3">
          {attachments?.map((a) => (
            <li key={a.id} className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition">
              <div className="flex items-start gap-3">
                {a.thumbnailUrl ? (
                  <img src={a.thumbnailUrl} alt="" className="w-16 h-16 rounded object-cover bg-slate-100" />
                ) : (
                  <div className="w-16 h-16 rounded bg-slate-100 flex items-center justify-center text-xs text-slate-500 uppercase">
                    {a.mimeType.split('/')[1]?.slice(0, 4) || 'file'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <a href={a.downloadUrl} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:text-brand-600 truncate block" title="Pobierz (link wygasa po godzinie)">
                    {a.fileName}
                  </a>
                  <p className="text-xs text-slate-500">
                    {formatBytes(a.sizeBytes)} · {a.mimeType} · {new Date(a.uploadedAt).toLocaleString('pl-PL')}
                  </p>
                  {a.aiCaption && (
                    <p className="text-xs text-violet-700 mt-1 flex items-start gap-1">
                      <SparklesIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="italic">{a.aiCaption}</span>
                    </p>
                  )}
                  {a.aiTags.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-wide text-violet-700 font-semibold">AI tagi ({a.aiTags.length})</span>
                        <button
                          onClick={() => copyTags(a.id, a.aiTags)}
                          className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded transition ${
                            copiedAttachmentId === a.id
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100'
                          }`}
                          title="Skopiuj wszystkie tagi do schowka (oddzielone przecinkami)"
                        >
                          {copiedAttachmentId === a.id ? (
                            <>
                              <CheckIcon className="h-3 w-3" /> Skopiowano!
                            </>
                          ) : (
                            <>
                              <ClipboardDocumentIcon className="h-3 w-3" /> Kopiuj tagi
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {a.aiTags.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => copyTags(`${a.id}:${t}`, [t])}
                            className={`text-xs px-2 py-0.5 rounded-full border transition ${
                              copiedAttachmentId === `${a.id}:${t}`
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
                            }`}
                            title={`Kliknij aby skopiować tag "${t}"`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setConfirmDeleteAttachment({ id: a.id, fileName: a.fileName })}
                  className="text-slate-400 hover:text-rose-600 p-1 transition"
                  title="Usuń załącznik"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* === Sekcja: Historia zmian (Cosmos DB audit log) === */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm uppercase font-semibold text-slate-500 flex items-center gap-2 mb-4">
          <ClockIcon className="h-4 w-4" /> Historia zmian (Cosmos DB)
        </h2>
        {audit && audit.length === 0 && (
          <p className="text-sm text-slate-500 italic">Brak historii.</p>
        )}
        <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
          {audit?.map((entry) => (
            <li key={entry.id} className="ml-4">
              <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] mt-1.5" />
              <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColors[entry.action] || 'bg-slate-100 text-slate-700'}`}>
                  {actionLabels[entry.action] || entry.action}
                </span>
                <span className="text-xs text-slate-700 font-medium">
                  {entry.performedByName || 'Nieznany użytkownik'}
                </span>
                {entry.performedByEmail && (
                  <span className="text-xs text-slate-400">· {entry.performedByEmail}</span>
                )}
                <span className="text-xs text-slate-500 ml-auto">
                  {new Date(entry.timestamp).toLocaleString('pl-PL')}
                </span>
              </div>
              {entry.previousState && entry.newState && entry.previousState !== entry.newState && (
                <p className="text-xs text-slate-600">
                  <span className="line-through opacity-60">{entry.previousState}</span> → <span>{entry.newState}</span>
                </p>
              )}
              {!entry.previousState && entry.newState && (
                <p className="text-xs text-slate-600">{entry.newState}</p>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
