import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';

// Layout dla ekranow nieautoryzowanych (login/register).
// Jesli ktos juz zalogowany trafi tu - przekieruj go do aplikacji.
export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Redirect href="/(app)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#f8fafc' },
      }}
    />
  );
}
