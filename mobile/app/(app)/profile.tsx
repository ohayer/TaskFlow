import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, ScrollView } from '../../src/lib/rn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { usersApi } from '../../src/api/endpoints';
import type { NotificationChannel } from '../../src/types/models';
import { useAuth } from '../../src/auth/AuthContext';

const channels: { value: NotificationChannel; label: string; icon: 'mail-outline' | 'chatbubble-outline' | 'notifications-outline'; description: string }[] = [
  { value: 0, label: 'Email', icon: 'mail-outline', description: 'Powiadomienia na adres email' },
  { value: 1, label: 'SMS', icon: 'chatbubble-outline', description: 'Wiadomości SMS na telefon (wymaga numeru)' },
  { value: 2, label: 'In-App', icon: 'notifications-outline', description: 'Tylko w aplikacji' },
];

export default function ProfilePage() {
  const qc = useQueryClient();
  const { logout } = useAuth();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.me(),
  });

  const [channel, setChannel] = useState<NotificationChannel>(0);
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (user) setChannel(user.notificationPreference);
  }, [user]);

  const mutation = useMutation({
    mutationFn: () => usersApi.updateNotificationPreference(channel, channel === 1 ? phoneNumber.trim() : undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      Toast.show({ type: 'success', text1: 'Zapisano preferencje' });
    },
    onError: () => Toast.show({ type: 'error', text1: 'Błąd zapisu' }),
  });

  if (isLoading || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0566c9" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16 }}>
      {/* Karta uzytkownika */}
      <View className="bg-white border border-slate-200 rounded-xl p-5 mb-4 items-center">
        <View className="w-20 h-20 rounded-full bg-brand-100 items-center justify-center mb-3">
          <Text className="text-brand-700 font-bold text-3xl">
            {user.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text className="text-xl font-bold text-slate-900">{user.displayName}</Text>
        <Text className="text-sm text-slate-600">{user.email}</Text>
      </View>

      {/* Powiadomienia */}
      <View className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
        <Text className="text-xs uppercase font-semibold text-slate-500 mb-3">
          Preferencje powiadomień
        </Text>
        <View className="gap-2">
          {channels.map((ch) => (
            <Pressable
              key={ch.value}
              onPress={() => setChannel(ch.value)}
              className={`border rounded-lg p-3 ${channel === ch.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'}`}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`w-4 h-4 rounded-full border-2 items-center justify-center ${channel === ch.value ? 'border-brand-600' : 'border-slate-400'}`}
                >
                  {channel === ch.value && <View className="w-2 h-2 rounded-full bg-brand-600" />}
                </View>
                <Ionicons name={ch.icon} size={18} color={channel === ch.value ? '#0566c9' : '#64748b'} />
                <View className="flex-1">
                  <Text className={`font-medium ${channel === ch.value ? 'text-brand-700' : 'text-slate-900'}`}>
                    {ch.label}
                  </Text>
                  <Text className="text-xs text-slate-500">{ch.description}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {channel === 1 && (
          <View className="mt-3">
            <Text className="text-sm font-medium text-slate-700 mb-1">Numer telefonu</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+48 600 000 000"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              className="border border-slate-300 rounded-lg px-4 py-3 text-slate-900"
            />
          </View>
        )}

        <Pressable
          onPress={() => mutation.mutate()}
          disabled={mutation.isPending || (channel === 1 && !phoneNumber.trim())}
          className={`mt-4 rounded-lg py-3 items-center ${mutation.isPending || (channel === 1 && !phoneNumber.trim()) ? 'bg-brand-400' : 'bg-brand-600 active:bg-brand-700'}`}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold">Zapisz preferencje</Text>
          )}
        </Pressable>
      </View>

      {/* Wyloguj */}
      <Pressable
        onPress={() => logout()}
        className="bg-white border border-slate-200 rounded-xl p-4 flex-row items-center justify-center gap-2 active:bg-slate-50"
      >
        <Ionicons name="log-out-outline" size={20} color="#dc2626" />
        <Text className="text-sm font-semibold text-rose-600">Wyloguj się</Text>
      </Pressable>
    </ScrollView>
  );
}
