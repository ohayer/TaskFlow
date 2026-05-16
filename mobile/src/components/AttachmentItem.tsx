import { useState } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator } from '../lib/rn';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import type { AttachmentDto } from '../api/endpoints';
import { attachmentsApi } from '../api/endpoints';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  attachment: AttachmentDto;
  taskId: string;
}

export default function AttachmentItem({ attachment, taskId }: Props) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isImage = attachment.mimeType?.startsWith('image/');

  const deleteMutation = useMutation({
    mutationFn: () => attachmentsApi.delete(taskId, attachment.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', taskId] });
      qc.invalidateQueries({ queryKey: ['task', taskId] });
      qc.invalidateQueries({ queryKey: ['task-audit', taskId] });
      Toast.show({ type: 'success', text1: 'Usunięto załącznik' });
      setConfirmOpen(false);
    },
    onError: () => Toast.show({ type: 'error', text1: 'Nie udało się usunąć' }),
  });

  const copyTags = async () => {
    if (!attachment.aiTags?.length) return;
    await Clipboard.setStringAsync(attachment.aiTags.join(', '));
    Toast.show({ type: 'success', text1: 'Skopiowano tagi' });
  };

  const openFile = () => {
    WebBrowser.openBrowserAsync(attachment.downloadUrl);
  };

  return (
    <View className="bg-white border border-slate-200 rounded-lg p-3 mb-2">
      <View className="flex-row gap-3">
        {/* Thumbnail / icon */}
        <Pressable onPress={openFile} className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 items-center justify-center">
          {attachment.thumbnailUrl ? (
            <Image source={{ uri: attachment.thumbnailUrl }} style={{ width: 80, height: 80 }} resizeMode="cover" />
          ) : isImage && attachment.downloadUrl ? (
            <Image source={{ uri: attachment.downloadUrl }} style={{ width: 80, height: 80 }} resizeMode="cover" />
          ) : (
            <Ionicons name="document-outline" size={32} color="#94a3b8" />
          )}
        </Pressable>

        <View className="flex-1 min-w-0">
          <Pressable onPress={openFile}>
            <Text className="text-sm font-medium text-slate-900" numberOfLines={1}>
              {attachment.fileName}
            </Text>
          </Pressable>
          <Text className="text-xs text-slate-500 mb-1.5">
            {(attachment.sizeBytes / 1024).toFixed(1)} KB · {new Date(attachment.uploadedAt).toLocaleDateString('pl-PL')}
          </Text>

          {/* AI tags */}
          {attachment.aiTags && attachment.aiTags.length > 0 && (
            <View className="flex-row flex-wrap gap-1 items-center">
              <Ionicons name="sparkles" size={10} color="#0566c9" />
              {attachment.aiTags.slice(0, 6).map((tag) => (
                <View key={tag} className="bg-brand-50 px-1.5 py-0.5 rounded">
                  <Text className="text-[10px] text-brand-700">{tag}</Text>
                </View>
              ))}
              {attachment.aiTags.length > 6 && (
                <Text className="text-[10px] text-slate-500">+{attachment.aiTags.length - 6}</Text>
              )}
              <Pressable onPress={copyTags} hitSlop={6} className="ml-1">
                <Ionicons name="copy-outline" size={12} color="#64748b" />
              </Pressable>
            </View>
          )}
        </View>

        <Pressable onPress={() => setConfirmOpen(true)} hitSlop={6} className="self-start p-1 active:bg-rose-50 rounded">
          <Ionicons name="trash-outline" size={18} color="#64748b" />
        </Pressable>
      </View>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Usunąć załącznik?"
        description={`Plik "${attachment.fileName}" zostanie usunięty bezpowrotnie.`}
        confirmLabel="Usuń"
        destructive
        loading={deleteMutation.isPending}
      />
    </View>
  );
}

interface UploadingProps {
  fileName: string;
}
export function UploadingPlaceholder({ fileName }: UploadingProps) {
  return (
    <View className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-2 flex-row items-center gap-3">
      <ActivityIndicator color="#0566c9" />
      <View className="flex-1 min-w-0">
        <Text className="text-sm text-slate-700" numberOfLines={1}>{fileName}</Text>
        <Text className="text-xs text-slate-500">Wgrywanie + analiza AI...</Text>
      </View>
    </View>
  );
}
