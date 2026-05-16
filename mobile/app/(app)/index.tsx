import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from '../../src/lib/rn';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { projectsApi } from '../../src/api/endpoints';
import type { Project } from '../../src/types/models';
import { EmptyState } from '../../src/components/EmptyState';

export default function DashboardPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: projects, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  return (
    <View className="flex-1 bg-slate-50">
      <FlatList
        data={projects ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <View className="mb-4">
            <Text className="text-2xl font-bold text-slate-900">Twoje projekty</Text>
            <Text className="text-sm text-slate-500 mt-1">
              {projects?.length ?? 0} {projects?.length === 1 ? 'projekt' : 'projektów'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="py-20 items-center">
              <ActivityIndicator size="large" color="#0566c9" />
            </View>
          ) : (
            <EmptyState
              icon="folder-open-outline"
              title="Brak projektów"
              description="Stwórz pierwszy projekt, aby zacząć organizować zadania."
            />
          )
        }
        renderItem={({ item }) => (
          <ProjectCard project={item} onPress={() => router.push(`/(app)/projects/${item.id}`)} />
        )}
      />

      <Pressable
        onPress={() => setCreateOpen(true)}
        className="absolute right-5 bottom-6 bg-brand-600 active:bg-brand-700 rounded-full px-5 py-3 flex-row items-center shadow-lg"
        style={{ elevation: 4 }}
      >
        <Ionicons name="add" size={22} color="white" />
        <Text className="text-white font-semibold ml-1.5">Nowy projekt</Text>
      </Pressable>

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['projects'] });
          Toast.show({ type: 'success', text1: 'Projekt utworzony' });
        }}
      />
    </View>
  );
}

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white border border-slate-200 rounded-xl p-4 mb-3 active:bg-slate-50"
    >
      <View className="flex-row justify-between items-start gap-3">
        <View className="flex-1 min-w-0">
          <Text className="font-semibold text-slate-900 text-base" numberOfLines={1}>
            {project.name}
          </Text>
          {project.description ? (
            <Text className="text-sm text-slate-600 mt-1" numberOfLines={2}>
              {project.description}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </View>
      <View className="flex-row gap-4 mt-3">
        <View className="flex-row items-center gap-1">
          <Ionicons name="people-outline" size={14} color="#64748b" />
          <Text className="text-xs text-slate-500">
            {project.memberCount} {project.memberCount === 1 ? 'członek' : 'członków'}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="checkbox-outline" size={14} color="#64748b" />
          <Text className="text-xs text-slate-500">{project.taskCount} zadań</Text>
        </View>
      </View>
    </Pressable>
  );
}

function CreateProjectModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () => projectsApi.create({ name: name.trim(), description: description.trim() || null }),
    onSuccess: () => {
      setName('');
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
            <Text className="text-lg font-bold text-slate-900">Nowy projekt</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>
          <Text className="text-sm font-medium text-slate-700 mb-1">Nazwa</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nazwa projektu"
            placeholderTextColor="#94a3b8"
            autoFocus
            className="border border-slate-300 rounded-lg px-4 py-3 mb-4 text-slate-900"
          />
          <Text className="text-sm font-medium text-slate-700 mb-1">Opis (opcjonalnie)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Krótki opis"
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
                  ?? 'Nie udało się utworzyć projektu'}
              </Text>
            </View>
          )}
          <View className="flex-row justify-end gap-2">
            <Pressable onPress={onClose} className="px-4 py-2.5 rounded-lg active:bg-slate-100">
              <Text className="text-sm font-medium text-slate-700">Anuluj</Text>
            </Pressable>
            <Pressable
              onPress={() => mutation.mutate()}
              disabled={!name.trim() || mutation.isPending}
              className={`px-4 py-2.5 rounded-lg ${!name.trim() || mutation.isPending ? 'bg-brand-400' : 'bg-brand-600 active:bg-brand-700'}`}
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
