import { Modal, View, Text, Pressable, ActivityIndicator } from '../lib/rn';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Potwierdź',
  destructive = false,
  loading = false,
}: Props) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/60 items-center justify-center px-6">
        <View className="w-full max-w-md bg-white rounded-2xl p-6">
          <Text className="text-lg font-bold text-slate-900 mb-2">{title}</Text>
          {description && (
            <Text className="text-sm text-slate-600 leading-5 mb-5">{description}</Text>
          )}
          <View className="flex-row justify-end gap-2">
            <Pressable
              onPress={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg active:bg-slate-100"
            >
              <Text className="text-sm font-medium text-slate-700">Anuluj</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className={`px-4 py-2.5 rounded-lg ${destructive ? 'bg-rose-600 active:bg-rose-700' : 'bg-brand-600 active:bg-brand-700'}`}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-white">{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
