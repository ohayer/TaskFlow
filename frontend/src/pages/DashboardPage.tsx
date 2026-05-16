import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon } from '@heroicons/react/24/outline';
import { projectsApi } from '../api/endpoints';
import type { CreateProjectDto } from '../types/models';

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data: projects, isLoading, error } = useQuery({ queryKey: ['projects'], queryFn: projectsApi.list });
  const createMutation = useMutation({
    mutationFn: (dto: CreateProjectDto) => projectsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() || null }, {
      onSuccess: () => {
        setName('');
        setDescription('');
        setShowForm(false);
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Twoje projekty</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition">
          <PlusIcon className="h-5 w-5" />
          Nowy projekt
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nazwa projektu"
            className="w-full mb-3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Opis (opcjonalny)"
            rows={3}
            className="w-full mb-3 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Anuluj</button>
            <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium disabled:opacity-50">
              {createMutation.isPending ? 'Tworzenie...' : 'Utwórz'}
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-slate-500">Ładowanie...</p>}
      {error && <p className="text-red-600">Błąd: {String(error)}</p>}
      {projects && projects.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-600 mb-4">Nie masz jeszcze żadnych projektów.</p>
          <button onClick={() => setShowForm(true)} className="text-brand-600 hover:text-brand-700 font-medium">
            Utwórz pierwszy →
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md hover:border-brand-300 transition">
            <h3 className="font-semibold text-slate-900 mb-1">{p.name}</h3>
            {p.description && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{p.description}</p>}
            <div className="flex gap-4 text-xs text-slate-500">
              <span>{p.taskCount} zadań</span>
              <span>{p.memberCount} członków</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
