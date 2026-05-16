import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { TrashIcon, ClockIcon, UsersIcon, XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { projectsApi } from '../api/endpoints';
import type { ProjectMemberDto } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ConfirmDialog from './ConfirmDialog';

const roleLabels: Record<number, string> = { 0: 'Member', 1: 'Admin', 2: 'Owner' };
const roleColors: Record<number, string> = {
  0: 'bg-slate-100 text-slate-700',
  1: 'bg-blue-100 text-blue-800',
  2: 'bg-amber-100 text-amber-800',
};

const auditActionLabels: Record<string, string> = {
  Created: 'Utworzono zadanie',
  Updated: 'Zaktualizowano zadanie',
  Deleted: 'Usunięto zadanie',
  AttachmentUploaded: 'Wgrano załącznik',
  AttachmentDeleted: 'Usunięto załącznik',
  Notification: 'Powiadomienie',
  MemberAdded: 'Dodano członka',
  MemberRemoved: 'Usunięto członka',
  MemberRoleChanged: 'Zmiana roli',
};

interface Props {
  projectId: string;
  isOwner: boolean;
}

export default function MembersPanel({ projectId, isOwner }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [confirmRemove, setConfirmRemove] = useState<ProjectMemberDto | null>(null);
  const [auditMember, setAuditMember] = useState<ProjectMemberDto | null>(null);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.listMembers(projectId),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: number }) => projectsApi.updateMemberRole(projectId, userId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members', projectId] }),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setConfirmRemove(null);
    },
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-sm uppercase font-semibold text-slate-500 flex items-center gap-2 mb-4">
        <UsersIcon className="h-4 w-4" /> Członkowie ({members?.length || 0})
      </h2>

      {isLoading && <p className="text-sm text-slate-500">Ładowanie...</p>}

      <ul className="divide-y divide-slate-200">
        {members?.map((m) => {
          const isMe = m.email === user?.email;
          return (
            <li key={m.userId} className="py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-semibold text-sm">
                {m.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-900 text-sm truncate">{m.displayName}</span>
                  {isMe && <span className="text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded uppercase font-semibold">Ty</span>}
                  {m.isOwner && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded uppercase font-semibold flex items-center gap-1">
                      <ShieldCheckIcon className="h-3 w-3" /> Owner
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{m.email}</p>
                <p className="text-[11px] text-slate-400">Dodany: {new Date(m.joinedAt).toLocaleDateString('pl-PL')}</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Role selector - tylko owner moze zmienic, NIE dla siebie samego (Owner) */}
                {isOwner && !m.isOwner ? (
                  <select
                    value={m.role}
                    onChange={(e) => updateRoleMutation.mutate({ userId: m.userId, role: Number(e.target.value) })}
                    disabled={updateRoleMutation.isPending}
                    className="text-xs px-2 py-1 border border-slate-300 rounded outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value={0}>Member</option>
                    <option value={1}>Admin</option>
                  </select>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[m.role]}`}>
                    {roleLabels[m.role]}
                  </span>
                )}

                {/* Historia - dostepna dla wszystkich czlonkow */}
                <button
                  onClick={() => setAuditMember(m)}
                  className="text-slate-400 hover:text-brand-600 p-1 transition"
                  title={`Zobacz historię ${m.displayName} w projekcie`}
                >
                  <ClockIcon className="h-4 w-4" />
                </button>

                {/* Usun - tylko owner moze, NIE dla owner-a */}
                {isOwner && !m.isOwner && (
                  <button
                    onClick={() => setConfirmRemove(m)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition"
                    title="Usuń członka z projektu"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && removeMutation.mutate(confirmRemove.userId)}
        title="Usunąć członka?"
        description={`Użytkownik "${confirmRemove?.displayName}" (${confirmRemove?.email}) zostanie usunięty z projektu i straci dostęp. Tej operacji nie można cofnąć (poza ponownym dodaniem).`}
        confirmLabel="Usuń członka"
        destructive
        loading={removeMutation.isPending}
      />

      <MemberAuditModal projectId={projectId} member={auditMember} onClose={() => setAuditMember(null)} />
    </div>
  );
}

function MemberAuditModal({ projectId, member, onClose }: { projectId: string; member: ProjectMemberDto | null; onClose: () => void }) {
  const { data: entries, isLoading } = useQuery({
    queryKey: ['member-audit', projectId, member?.userId],
    queryFn: () => projectsApi.memberAudit(projectId, member!.userId),
    enabled: !!member,
  });

  return (
    <Transition appear show={member !== null} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl bg-white rounded-2xl shadow-xl">
                <div className="flex items-start justify-between p-6 pb-3 border-b border-slate-200">
                  <div>
                    <Dialog.Title className="text-lg font-bold text-slate-900">
                      Historia: {member?.displayName}
                    </Dialog.Title>
                    <p className="text-sm text-slate-500">
                      {member?.email} · ostatnie 100 akcji w tym projekcie (z Cosmos DB)
                    </p>
                  </div>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-6">
                  {isLoading && <p className="text-sm text-slate-500">Ładowanie historii...</p>}
                  {entries && entries.length === 0 && (
                    <p className="text-sm text-slate-500 italic">Brak historii — ten użytkownik nie wykonał żadnych akcji w projekcie.</p>
                  )}

                  <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
                    {entries?.map((e) => (
                      <li key={e.id} className="ml-4">
                        <div className="absolute w-3 h-3 bg-slate-300 rounded-full -left-[7px] mt-1.5" />
                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700">
                            {auditActionLabels[e.action] || e.action}
                          </span>
                          <span className="text-xs text-slate-500 ml-auto">
                            {new Date(e.timestamp).toLocaleString('pl-PL')}
                          </span>
                        </div>
                        {e.previousState && e.newState && e.previousState !== e.newState && (
                          <p className="text-xs text-slate-600">
                            <span className="line-through opacity-60">{e.previousState}</span> → <span>{e.newState}</span>
                          </p>
                        )}
                        {!e.previousState && e.newState && <p className="text-xs text-slate-600">{e.newState}</p>}
                        {e.previousState && !e.newState && <p className="text-xs text-slate-600">{e.previousState}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
