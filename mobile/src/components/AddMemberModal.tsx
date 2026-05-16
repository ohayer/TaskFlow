import { useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, ActivityIndicator } from '../lib/rn';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { projectsApi } from '../api/endpoints';

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

const roles = [
  { value: 0, label: 'Member', description: 'Może edytować zadania i dodawać załączniki' },
  { value: 1, label: 'Admin', description: 'Pełne uprawnienia poza usuwaniem projektu' },
];

export default function AddMemberModal({ projectId, open, onClose }: Props) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => projectsApi.addMember(projectId, email.trim().toLowerCase(), role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      Toast.show({ type: 'success', text1: 'Dodano członka' });
      setEmail('');
      setRole(0);
      setError(null);
      onClose();
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setError(err.response?.data?.error ?? 'Nie udało się dodać członka');
    },
  });

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/60 items-center justify-center px-6">
        <View className="w-full max-w-md bg-white rounded-2xl p-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-slate-900">Dodaj członka</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#475569" />
            </Pressable>
          </View>

          <Text className="text-sm font-medium text-slate-700 mb-1">Email użytkownika</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email@example.com"
            placeholderTextColor="#94a3b8"
            autoFocus
            className="border border-slate-300 rounded-lg px-4 py-3 mb-4 text-slate-900"
          />

          <Text className="text-sm font-medium text-slate-700 mb-2">Rola</Text>
          <View className="gap-2 mb-4">
            {roles.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setRole(r.value)}
                className={`border rounded-lg p-3 ${role === r.value ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white'}`}
              >
                <View className="flex-row items-center gap-2">
                  <View
                    className={`w-4 h-4 rounded-full border-2 items-center justify-center ${role === r.value ? 'border-brand-600' : 'border-slate-400'}`}
                  >
                    {role === r.value && <View className="w-2 h-2 rounded-full bg-brand-600" />}
                  </View>
                  <Text className="font-medium text-slate-900">{r.label}</Text>
                </View>
                <Text className="text-xs text-slate-500 ml-6 mt-0.5">{r.description}</Text>
              </Pressable>
            ))}
          </View>

          {error && (
            <View className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-3">
              <Text className="text-sm text-rose-700">{error}</Text>
            </View>
          )}

          <View className="flex-row justify-end gap-2">
            <Pressable onPress={onClose} className="px-4 py-2.5 rounded-lg active:bg-slate-100">
              <Text className="text-sm font-medium text-slate-700">Anuluj</Text>
            </Pressable>
            <Pressable
              onPress={() => mutation.mutate()}
              disabled={!email.trim() || mutation.isPending}
              className={`px-4 py-2.5 rounded-lg ${!email.trim() || mutation.isPending ? 'bg-brand-400' : 'bg-brand-600 active:bg-brand-700'}`}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text className="text-sm font-semibold text-white">Dodaj</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
