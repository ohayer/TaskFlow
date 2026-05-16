import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/endpoints';
import type { NotificationChannel } from '../types/models';

const channels: { value: NotificationChannel; label: string; description: string }[] = [
  { value: 0, label: 'Email', description: 'Powiadomienia będą wysyłane na Twój adres email' },
  { value: 1, label: 'SMS', description: 'Wymaga numeru telefonu' },
  { value: 2, label: 'In-App', description: 'Tylko w aplikacji (audit log w Cosmos DB)' },
];

export default function ProfilePage() {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({ queryKey: ['user', 'me'], queryFn: usersApi.me });
  const [channel, setChannel] = useState<NotificationChannel>(0);
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (user) {
      setChannel(user.notificationPreference);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: () => usersApi.updateNotificationPreference(channel, phone || undefined),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user', 'me'] }),
  });

  if (isLoading) return <p className="text-slate-500">Ładowanie...</p>;
  if (!user) return <p>Brak danych użytkownika.</p>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Profil</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <h2 className="text-sm uppercase font-semibold text-slate-500 mb-4">Konto</h2>
        <dl className="space-y-2">
          <div className="flex">
            <dt className="w-32 text-sm text-slate-600">Nazwa</dt>
            <dd className="text-sm text-slate-900">{user.displayName}</dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-slate-600">Email</dt>
            <dd className="text-sm text-slate-900">{user.email}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm uppercase font-semibold text-slate-500 mb-4">Preferencja powiadomień</h2>
        <p className="text-sm text-slate-600 mb-4">
          To ustawienie wybiera <strong>strategię</strong> wysyłki powiadomień (Strategy Pattern w API).
        </p>
        <div className="space-y-2 mb-4">
          {channels.map((c) => (
            <label key={c.value} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${channel === c.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input type="radio" name="channel" value={c.value} checked={channel === c.value} onChange={() => setChannel(c.value)} className="mt-1" />
              <div>
                <div className="font-medium text-slate-900">{c.label}</div>
                <div className="text-xs text-slate-600">{c.description}</div>
              </div>
            </label>
          ))}
        </div>

        {channel === 1 && (
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+48 ..."
            className="w-full mb-4 px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
          />
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
        >
          {mutation.isPending ? 'Zapisywanie...' : 'Zapisz preferencję'}
        </button>
        {mutation.isSuccess && <p className="text-sm text-emerald-600 mt-2">Zapisano.</p>}
      </div>
    </div>
  );
}
