import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { projectsApi } from '../api/endpoints';

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

const roles = [
  { value: 0, label: 'Member', description: 'Może czytać i edytować zadania projektu' },
  { value: 1, label: 'Admin', description: 'Member + zarządza zadaniami innych' },
];

export default function AddMemberModal({ projectId, open, onClose }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => projectsApi.addMember(projectId, email.trim(), role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      setEmail('');
      setError(null);
      onClose();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: string }; status?: number } };
      setError(e?.response?.data?.error || 'Nieznany błąd');
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Podaj prawidłowy email');
      return;
    }
    mutation.mutate();
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl">
                <div className="flex items-start justify-between p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-brand-100 p-2 rounded-lg">
                      <UserPlusIcon className="h-5 w-5 text-brand-700" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-bold text-slate-900">Dodaj członka</Dialog.Title>
                      <p className="text-sm text-slate-500">Tylko właściciel projektu może dodawać członków</p>
                    </div>
                  </div>
                  <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={submit} className="px-6 pb-6 space-y-4">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-700 mb-1 block">Email użytkownika</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="kolega@example.com"
                      required
                      autoFocus
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">
                      Użytkownik musi być już zarejestrowany w aplikacji
                    </span>
                  </label>

                  <div>
                    <span className="text-xs font-medium text-slate-700 mb-1 block">Rola</span>
                    <div className="space-y-2">
                      {roles.map((r) => (
                        <label key={r.value} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${role === r.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="mt-0.5" />
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{r.label}</div>
                            <div className="text-xs text-slate-600">{r.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded p-2">
                      {error}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium text-sm">
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      disabled={mutation.isPending}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
                    >
                      {mutation.isPending ? 'Dodawanie...' : 'Dodaj członka'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
