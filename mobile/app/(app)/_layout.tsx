import { Redirect, Stack, useRouter } from 'expo-router';
import { Pressable, View, Text } from '../../src/lib/rn';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthContext';

// Layout dla zalogowanej czesci aplikacji.
// AuthGuard: bez tokenu -> /login. Zaden ekran w (app) nie renderuje sie bez auth.
export default function AppLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();

  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: true,
        contentStyle: { backgroundColor: '#f8fafc' },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 4 }}>
            <Pressable onPress={() => router.push('/(app)/profile')} hitSlop={10}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: '#e0eefe', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#0552a3', fontWeight: '700', fontSize: 12 }}>
                    {(user?.displayName || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              </View>
            </Pressable>
            <Pressable onPress={() => logout()} hitSlop={10}>
              <Ionicons name="log-out-outline" size={22} color="#475569" />
            </Pressable>
          </View>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: 'TaskFlow' }} />
      <Stack.Screen name="profile" options={{ title: 'Mój profil' }} />
      <Stack.Screen name="projects/[projectId]" options={{ title: 'Projekt' }} />
      <Stack.Screen name="tasks/[taskId]" options={{ title: 'Zadanie' }} />
    </Stack>
  );
}
