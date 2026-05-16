import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// SecureStore (native) szyfruje na poziomie OS (Keychain/Keystore) ale NIE dziala na web.
// Na web fallback do AsyncStorage (ktory uzywa localStorage pod spodem).
// SecureStore ma limit ~2KB na wartosc - JWT + user info miesci sie spokojnie.

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// Synchroniczny cache w pamieci dla axios interceptora (bo axios.interceptor.request dziala lepiej z sync API).
// Updatowany przez AuthContext przy login/logout.
let inMemoryToken: string | null = null;

export function setInMemoryToken(token: string | null) {
  inMemoryToken = token;
}

export function getInMemoryToken(): string | null {
  return inMemoryToken;
}
