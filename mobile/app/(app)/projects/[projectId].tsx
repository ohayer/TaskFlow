import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from '../../../src/lib/rn';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';
import { Platform } from '../../../src/lib/rn';
import { projectsApi, tasksApi, exportsApi } from '../../../src/api/endpoints';
import { apiClient } from '../../../src/api/client';
import type { TaskItemStatus, CreateTaskDto } from '../../../src/types/models';
import { TaskStatusLabels } from '../../../src/types/models';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { EmptyState } from '../../../src/components/EmptyState';
import AddMemberModal from '../../../src/components/AddMemberModal';
import MembersPanel from '../../../src/components/MembersPanel';
import { useAuth } from '../../../src/auth/AuthContext';

export default function ProjectDetailPage() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const qc = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();
  const [filter, setFilter] = useState<TaskItemStatus | undefined>(undefined);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [exportsExpanded, setExportsExpanded] = useState(false);

  const { data: project, refetch: refetchProject, isRefetching: isRefetchingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', projectId, filter],
    queryFn: () => tasksApi.listByProject(projectId!, filter),
    enabled: !!projectId,
  });

  const { data: exports } = useQuery({
    queryKey: ['exports', projectId],
    queryFn: () => exportsApi.list(projectId!),
    enabled: !!projectId,
  });

  const exportMutation = useMutation({
    mutationFn: () => exportsApi.create(projectId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exports', projectId] });
      Toast.show({ type: 'success', text1: 'Eksport CSV gotowy' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Błąd eksportu' }),
  });

  const isOwner = !!project && !!user && project.ownerId === user.id;

  if (!projectId) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-600">Nieprawidłowy identyfikator projektu.</Text>
      </View>
    );
  }

  // Download CSV: na web pobieramy blob i tworzymy <a download>; na native zapisujemy plik
  // w cache i otwieramy w domyslnej przegladarce/szarze.
  const downloadExport = async (fileName: string) => {
    try {
      const res = await apiClient.get(
        `/api/projects/${projectId}/exports/${encodeURIComponent(fileName)}`,
        { responseType: Platform.OS === 'web' ? 'blob' : 'text' },
      );
      if (Platform.OS === 'web') {
        const blobUrl = window.URL.createObjectURL(res.data as Blob);
        const a = window.document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // Na native otwieramy CSV w przegladarce (uzytkownik moze udostepnic / zapisac).
        // expo-file-system + expo-sharing byloby lepsze ale to wymaga dodatkowego pakietu.
        const dataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(res.data as string)}`;
        await WebBrowser.openBrowserAsync(dataUri);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Nie udało się pobrać CSV' });
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: project?.name ?? 'Projekt' }} />
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={isRefetchingProject} onRefresh={() => refetchProject()} />}
      >
        {project?.description ? (
          <Text className="text-sm text-slate-600 mb-2">{project.description}</Text>
        ) : null}
        {project ? (
          <View className="flex-row items-center gap-1 mb-4">
            <Ionicons name="people-outline" size={14} color="#64748b" />
            <Text className="text-xs text-slate-500">
              {project.memberCount} {project.memberCount === 1 ? 'członek' : 'członków'} · {project.taskCount} zadań
            </Text>
          </View>
        ) : null}

        {/* Akcje */}
        <View className="flex-row gap-2 mb-4 flex-wrap">
          {isOwner && (
            <Pressable
              onPress={() => setMemberModalOpen(true)}
              className="bg-white border border-slate-200 active:bg-slate-50 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
            >
              <Ionicons name="person-add-outline" size={16} color="#475569" />
              <Text className="text-sm font-medium text-slate-700">Dodaj członka</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="bg-white border border-slate-200 active:bg-slate-50 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
          >
            <Ionicons name="download-outline" size={16} color="#475569" />
            <Text className="text-sm font-medium text-slate-700">
              {exportMutation.isPending ? 'Eksportowanie...' : 'Eksport CSV'}
            </Text>
          </Pressable>
        </View>

        <AddMemberModal projectId={projectId} open={memberModalOpen} onClose={() => setMemberModalOpen(false)} />

        {/* Lista wczesniejszych eksportow */}
        {exports && exports.length > 0 && (
          <View className="bg-white border border-slate-200 rounded-lg mb-4">
            <Pressable
              onPress={() => setExportsExpanded((s) => !s)}
              className="px-3 py-2 flex-row justify-between items-center active:bg-slate-50"
            >
              <Text className="text-sm font-medium text-slate-700">
                Wcześniejsze eksporty ({exports.length})
              </Text>
              <Ionicons name={exportsExpanded ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
            </Pressable>
            {exportsExpanded && (
              <View className="border-t border-slate-200">
                {exports.map((e) => (
                  <Pressable
                    key={e.fileName}
                    onPress={() => downloadExport(e.fileName)}
                    className="px-3 py-2.5 flex-row justify-between items-center border-b border-slate-100 active:bg-slate-50"
                  >
                    <View className="flex-1 min-w-0 pr-2">
                      <Text className="text-sm text-slate-800" numberOfLines={1}>{e.fileName}</Text>
                      <Text className="text-xs text-slate-500">
                        {(e.sizeBytes / 1024).toFixed(1)} KB · {new Date(e.createdAt).toLocaleString('pl-PL')}
                      </Text>
                    </View>
                    <Ionicons name="download-outline" size={16} color="#0566c9" />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Filtry statusu */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }} className="mb-3">
          <Pressable
            onPress={() => setFilter(undefined)}
            className={`px-3 py-1.5 rounded-full ${filter === undefined ? 'bg-brand-600' : 'bg-white border border-slate-200'}`}
          >
            <Text className={`text-sm font-medium ${filter === undefined ? 'text-white' : 'text-slate-700'}`}>
              Wszystkie
            </Text>
          </Pressable>
          {([0, 1, 2, 3] as TaskItemStatus[]).map((s) => (
            <Pressable
              key={s}
              onPress={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full ${filter === s ? 'bg-brand-600' : 'bg-white border border-slate-200'}`}
            >
              <Text className={`text-sm font-medium ${filter === s ? 'text-white' : 'text-slate-700'}`}>
                {TaskStatusLabels[s]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Lista zadan */}
        <View className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
          {tasksLoading && (
            <View className="py-8 items-center">
              <ActivityIndicator color="#0566c9" />
            </View>
          )}
          {tasks?.map((t, i) => (
            <Pressable
              key={t.id}
              onPress={() => router.push(`/(app)/tasks/${t.id}`)}
              className={`p-4 active:bg-slate-50 ${i > 0 ? 'border-t border-slate-200' : ''}`}
            >
              <View className="flex-row justify-between items-start gap-3">
                <View className="flex-1 min-w-0">
                  <Text className="font-medium text-slate-900" numberOfLines={1}>{t.title}</Text>
                  {t.description ? (
                    <Text className="text-sm text-slate-600 mt-1" numberOfLines={1}>{t.description}</Text>
                  ) : null}
                  {t.dueDate ? (
                    <Text className="text-xs text-slate-500 mt-1">
                      Termin: {new Date(t.dueDate).toLocaleDateString('pl-PL')}
                    </Text>
                  ) : null}
                </View>
                <StatusBadge status={t.status} />
              </View>
            </Pressable>
          ))}
          {tasks && tasks.length === 0 && !tasksLoading && (
            <EmptyState icon="checkbox-outline" title="Brak zadań" description="Stwórz pierwsze zadanie w tym projekcie." />
          )}
        </View>

        {/* Czlonkowie */}
        <MembersPanel projectId={projectId} isOwner={isOwner} />
      </ScrollView>

      {/* FAB - nowe zadanie */}
      <Pressable
        onPress={() => setTaskFormOpen(true)}
        className="absolute right-5 bottom-6 bg-brand-600 active:bg-brand-700 rounded-full px-5 py-3 flex-row items-center shadow-lg"
        style={{ elevation: 4 }}
      >
        <Ionicons name="add" size={22} color="white" />
        <Text className="text-white font-semibold ml-1.5">Nowe zadanie</Text>
      </Pressable>

      <CreateTaskModal
        projectId={projectId}
        open={taskFormOpen}
        onClose={() => setTaskFormOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['tasks', projectId] });
          qc.invalidateQueries({ queryKey: ['project', projectId] });
          Toast.show({ type: 'success', text1: 'Zadanie utworzone' });
        }}
      />
    </>
  );
}

function CreateTaskModal({
  projectId,
  open,
  onClose,
  onSuccess,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const mutation = useMutation({
    mutationFn: (dto: CreateTaskDto) => tasksApi.create(projectId, dto),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      onSuccess();
      onClose();
    },
  });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/60 items-center justify-center px-6">
        <View className="w-full max-w-md bg-white rounded-2xl p-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-slate-900">Nowe zadanie</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>
          <Text className="text-sm font-medium text-slate-700 mb-1">Tytuł</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Co trzeba zrobić?"
            placeholderTextColor="#94a3b8"
            autoFocus
            className="border border-slate-300 rounded-lg px-4 py-3 mb-4 text-slate-900"
          />
          <Text className="text-sm font-medium text-slate-700 mb-1">Opis (opcjonalnie)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Szczegóły..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            className="border border-slate-300 rounded-lg px-4 py-3 mb-4 text-slate-900 min-h-[80px]"
            style={{ textAlignVertical: 'top' }}
          />
          {mutation.isError && (
            <View className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-3">
              <Text className="text-sm text-rose-700">
                {(mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error
                  ?? 'Nie udało się utworzyć zadania'}
              </Text>
            </View>
          )}
          <View className="flex-row justify-end gap-2">
            <Pressable onPress={onClose} className="px-4 py-2.5 rounded-lg active:bg-slate-100">
              <Text className="text-sm font-medium text-slate-700">Anuluj</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                mutation.mutate({ title: title.trim(), description: description.trim() || null })
              }
              disabled={!title.trim() || mutation.isPending}
              className={`px-4 py-2.5 rounded-lg ${!title.trim() || mutation.isPending ? 'bg-brand-400' : 'bg-brand-600 active:bg-brand-700'}`}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-white">Utwórz</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

