import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from '../src/lib/rn';
import { useAuth } from '../src/auth/AuthContext';

// Korzen: kierujemy na (app) jesli zalogowany, w przeciwnym razie na login.
// Jesli AuthContext jeszcze sie hydruuje - pokazujemy spinner.
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#0566c9" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(app)' : '/(auth)/login'} />;
}
