import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Backend HTTP nasluchuje na porcie 5156 (z backend/Properties/launchSettings.json).
// EXPO_PUBLIC_* env vars sa automatycznie wstrzykiwane do bundla podczas builda.
//
// Mapowanie:
// - web (przegladarka)        -> http://localhost:5156
// - iOS simulator             -> http://localhost:5156
// - Android emulator          -> http://10.0.2.2:5156   (specjalne IP dla hosta z emulatora)
// - fizyczny telefon (Expo Go)-> http://<IP-LAN>:5156   (musi byc ustawione w .env)

const FALLBACK_DEV =
  Platform.OS === 'android' ? 'http://10.0.2.2:5156'
  : 'http://localhost:5156';

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL
  ?? (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl
  ?? FALLBACK_DEV;
