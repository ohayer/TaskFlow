import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Platform,
} from '../../../src/lib/rn';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { tasksApi, attachmentsApi } from '../../../src/api/endpoints';
import type { TaskItemStatus, UpdateTaskDto } from '../../../src/types/models';
import { TaskStatusLabels } from '../../../src/types/models';
import { StatusBadge } from '../../../src/components/StatusBadge';
import ConfirmDialog from '../../../src/components/ConfirmDialog';
import AttachmentItem, { UploadingPlaceholder } from '../../../src/components/AttachmentItem';
import AuditTimeline from '../../../src/components/AuditTimeline';

export default function TaskDetailPage() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskItemStatus>(0);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);

  const { data: task, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => tasksApi.get(taskId!),
    enabled: !!taskId,
  });

  const { data: attachments } = useQuery({
    queryKey: ['attachments', taskId],
    queryFn: () => attachmentsApi.list(taskId!),
    enabled: !!taskId,
  });

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ['task-audit', taskId],
    queryFn: () => attachmentsApi.audit(taskId!),
    enabled: !!taskId,
  });

  // Synchronizacja stanu lokalnego ze swiezymi danymi z serwera (gdy nie edytujemy).
  useEffect(() => {
    if (task && !editing) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(task.status);
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
    }
  }, [task, editing]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateTaskDto) => tasksApi.update(taskId!, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-audit', taskId] });
      setEditing(false);
      Toast.show({ type: 'success', text1: 'Zapisano zmiany' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Błąd zapisu' }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => tasksApi.delete(taskId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['project', task?.projectId] });
      Toast.show({ type: 'success', text1: 'Usunięto zadanie' });
      router.back();
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => attachmentsApi.upload(taskId!, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['task-audit', taskId] });
      Toast.show({ type: 'success', text1: 'Załącznik dodany' });
      setUploadingName(null);
    },
    onError: () => {
      Toast.show({ type: 'error', text1: 'Błąd uploadu' });
      setUploadingName(null);
    },
  });

  const onSave = () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Tytuł jest wymagany' });
      return;
    }
    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      status,
      assigneeId: task?.assigneeId ?? null,
      dueDate: dueDate ? dueDate.toISOString() : null,
    });
  };

  const onCancel = () => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(task.status);
      setDueDate(task.dueDate ? new Date(task.dueDate) : null);
    }
    setEditing(false);
  };

  const onChangeStatus = (newStatus: TaskItemStatus) => {
    setStatusPickerOpen(false);
    if (!task) return;
    // Szybka mutacja w trybie podgladu (bez wchodzenia w edit mode)
    if (!editing) {
      updateMutation.mutate({
        title: task.title,
        description: task.description,
        status: newStatus,
        assigneeId: task.assigneeId,
        dueDate: task.dueDate,
      });
    } else {
      setStatus(newStatus);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName ?? `image_${Date.now()}.jpg`;
      setUploadingName(fileName);
      const formData = new FormData();
      // expo-image-picker na web zwraca asset.file (Blob); na native uri.
      if (Platform.OS === 'web' && asset.file) {
        formData.append('file', asset.file as Blob, fileName);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: fileName,
          type: asset.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
      }
      uploadMutation.mutate(formData);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Brak uprawnień do aparatu' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName ?? `photo_${Date.now()}.jpg`;
      setUploadingName(fileName);
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      uploadMutation.mutate(formData);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setUploadingName(asset.name);
      const formData = new FormData();
      if (Platform.OS === 'web' && asset.file) {
        formData.append('file', asset.file as Blob, asset.name);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType ?? 'application/octet-stream',
        } as unknown as Blob);
      }
      uploadMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0566c9" />
      </View>
    );
  }

  if (!task) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-600">Nie znaleziono zadania.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: task.title.length > 30 ? task.title.slice(0, 30) + '...' : task.title }} />
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
      >
        <View className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
          <View className="flex-row justify-between items-start gap-2 mb-2">
            <Text className="text-xs uppercase font-semibold text-slate-500">Zadanie</Text>
            <View className="flex-row gap-2">
              {!editing ? (
                <>
                  <Pressable onPress={() => setEditing(true)} hitSlop={6} className="p-1">
                    <Ionicons name="create-outline" size={20} color="#475569" />
                  </Pressable>
                  <Pressable onPress={() => setDeleteConfirmOpen(true)} hitSlop={6} className="p-1">
                    <Ionicons name="trash-outline" size={20} color="#475569" />
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={onCancel} hitSlop={6} className="px-2 py-1 rounded active:bg-slate-100">
                    <Text className="text-sm text-slate-700">Anuluj</Text>
                  </Pressable>
                  <Pressable
                    onPress={onSave}
                    disabled={updateMutation.isPending}
                    className="px-3 py-1 rounded bg-brand-600 active:bg-brand-700"
                  >
                    {updateMutation.isPending ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text className="text-sm font-semibold text-white">Zapisz</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {editing ? (
            <>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Tytuł"
                className="text-xl font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2"
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Opis (opcjonalny)"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                className="text-base text-slate-700 mb-3 min-h-[80px]"
                style={{ textAlignVertical: 'top' }}
              />
            </>
          ) : (
            <>
              <Text className="text-xl font-bold text-slate-900 mb-2">{task.title}</Text>
              {task.description ? (
                <Text className="text-base text-slate-700 mb-3">{task.description}</Text>
              ) : (
                <Text className="text-sm text-slate-400 italic mb-3">Brak opisu</Text>
              )}
            </>
          )}

          <View className="flex-row gap-3 flex-wrap">
            {/* Status */}
            <Pressable onPress={() => setStatusPickerOpen(true)} className="flex-row items-center gap-1">
              <Text className="text-xs text-slate-500">Status:</Text>
              <StatusBadge status={editing ? status : task.status} />
              <Ionicons name="chevron-down" size={12} color="#64748b" />
            </Pressable>

            {/* Due date */}
            <Pressable
              onPress={() => editing && setShowDatePicker(true)}
              className="flex-row items-center gap-1"
              disabled={!editing}
            >
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text className="text-xs text-slate-600">
                {(editing ? dueDate : task.dueDate ? new Date(task.dueDate) : null)
                  ? (editing ? dueDate! : new Date(task.dueDate!)).toLocaleDateString('pl-PL')
                  : 'Bez terminu'}
              </Text>
              {editing && dueDate && (
                <Pressable onPress={() => setDueDate(null)} hitSlop={6}>
                  <Ionicons name="close-circle" size={14} color="#94a3b8" />
                </Pressable>
              )}
            </Pressable>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setDueDate(date);
              }}
            />
          )}
        </View>

        {/* Zalaczniki */}
        <View className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-xs uppercase font-semibold text-slate-500">
              Załączniki ({attachments?.length ?? 0})
            </Text>
          </View>

          <View className="flex-row gap-2 mb-3 flex-wrap">
            <Pressable
              onPress={pickImage}
              className="bg-brand-50 border border-brand-200 active:bg-brand-100 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
            >
              <Ionicons name="image-outline" size={16} color="#0566c9" />
              <Text className="text-sm font-medium text-brand-700">Zdjęcie</Text>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable
                onPress={takePhoto}
                className="bg-brand-50 border border-brand-200 active:bg-brand-100 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
              >
                <Ionicons name="camera-outline" size={16} color="#0566c9" />
                <Text className="text-sm font-medium text-brand-700">Aparat</Text>
              </Pressable>
            )}
            <Pressable
              onPress={pickDocument}
              className="bg-white border border-slate-200 active:bg-slate-50 rounded-lg px-3 py-2 flex-row items-center gap-1.5"
            >
              <Ionicons name="document-outline" size={16} color="#475569" />
              <Text className="text-sm font-medium text-slate-700">Plik</Text>
            </Pressable>
          </View>

          {uploadingName && <UploadingPlaceholder fileName={uploadingName} />}

          {attachments?.map((a) => (
            <AttachmentItem key={a.id} attachment={a} taskId={taskId!} />
          ))}
          {attachments && attachments.length === 0 && !uploadingName && (
            <Text className="text-sm text-slate-500 italic py-2">Brak załączników</Text>
          )}
        </View>

        {/* Audit timeline */}
        <View className="bg-white border border-slate-200 rounded-xl p-4">
          <Text className="text-xs uppercase font-semibold text-slate-500 mb-3">Historia zmian</Text>
          <AuditTimeline entries={audit} loading={auditLoading} />
        </View>
      </ScrollView>

      {/* Picker statusu */}
      <Modal visible={statusPickerOpen} transparent animationType="fade" onRequestClose={() => setStatusPickerOpen(false)}>
        <Pressable onPress={() => setStatusPickerOpen(false)} className="flex-1 bg-slate-900/60 items-center justify-center px-6">
          <Pressable className="w-full max-w-xs bg-white rounded-2xl p-4">
            <Text className="text-base font-semibold text-slate-900 mb-3">Status zadania</Text>
            {([0, 1, 2, 3, 4] as TaskItemStatus[]).map((s) => (
              <Pressable
                key={s}
                onPress={() => onChangeStatus(s)}
                className={`flex-row items-center justify-between p-3 rounded-lg ${(editing ? status : task.status) === s ? 'bg-brand-50' : 'active:bg-slate-100'}`}
              >
                <Text className={`text-sm font-medium ${(editing ? status : task.status) === s ? 'text-brand-700' : 'text-slate-900'}`}>
                  {TaskStatusLabels[s]}
                </Text>
                {(editing ? status : task.status) === s && (
                  <Ionicons name="checkmark" size={18} color="#0566c9" />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Usunąć zadanie?"
        description={`Zadanie "${task.title}" zostanie usunięte wraz z załącznikami i historią. Tej operacji nie można cofnąć.`}
        confirmLabel="Usuń"
        destructive
        loading={deleteMutation.isPending}
      />
    </>
  );
}
