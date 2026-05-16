import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from '../../src/lib/rn';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !displayName.trim() || !password) {
      setError('Wypełnij wszystkie pola');
      return;
    }
    if (password.length < 6) {
      setError('Hasło musi mieć minimum 6 znaków');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await register(email.trim(), password, displayName.trim());
    setLoading(false);
    if (res.ok) {
      router.replace('/(app)');
    } else {
      setError(res.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-slate-50"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
        <View className="w-full max-w-md mx-auto">
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-brand-600 items-center justify-center mb-3">
              <Ionicons name="person-add" size={32} color="white" />
            </View>
            <Text className="text-3xl font-bold text-slate-900">Załóż konto</Text>
            <Text className="text-sm text-slate-500 mt-1">Dołącz do TaskFlow w 30 sekund</Text>
          </View>

          <View className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <Text className="text-sm font-medium text-slate-700 mb-1">Imię i nazwisko</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Jan Kowalski"
              placeholderTextColor="#94a3b8"
              className="border border-slate-300 rounded-lg px-4 py-3 mb-4 text-slate-900 bg-white"
            />

            <Text className="text-sm font-medium text-slate-700 mb-1">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="ty@example.com"
              placeholderTextColor="#94a3b8"
              className="border border-slate-300 rounded-lg px-4 py-3 mb-4 text-slate-900 bg-white"
            />

            <Text className="text-sm font-medium text-slate-700 mb-1">Hasło</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="minimum 6 znaków"
              placeholderTextColor="#94a3b8"
              className="border border-slate-300 rounded-lg px-4 py-3 mb-4 text-slate-900 bg-white"
            />

            {error && (
              <View className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4">
                <Text className="text-sm text-rose-700">{error}</Text>
              </View>
            )}

            <Pressable
              onPress={onSubmit}
              disabled={loading}
              className={`rounded-lg py-3 items-center ${loading ? 'bg-brand-400' : 'bg-brand-600 active:bg-brand-700'}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-semibold text-base">Zarejestruj się</Text>
              )}
            </Pressable>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-sm text-slate-600">Masz już konto? </Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text className="text-sm text-brand-600 font-semibold">Zaloguj się</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
