import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from '../../src/lib/rn';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Wypełnij wszystkie pola');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await login(email.trim(), password);
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
              <Ionicons name="checkmark-done-circle" size={36} color="white" />
            </View>
            <Text className="text-3xl font-bold text-slate-900">TaskFlow</Text>
            <Text className="text-sm text-slate-500 mt-1">Zaloguj się do swojego konta</Text>
          </View>

          <View className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <Text className="text-sm font-medium text-slate-700 mb-1">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="ty@example.com"
              placeholderTextColor="#94a3b8"
              className="border border-slate-300 rounded-lg px-4 py-3 mb-4 text-slate-900 bg-white"
            />

            <Text className="text-sm font-medium text-slate-700 mb-1">Hasło</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              placeholder="••••••••"
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
                <Text className="text-white font-semibold text-base">Zaloguj się</Text>
              )}
            </Pressable>
          </View>

          <View className="flex-row justify-center mt-6">
            <Text className="text-sm text-slate-600">Nie masz konta? </Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text className="text-sm text-brand-600 font-semibold">Zarejestruj się</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
