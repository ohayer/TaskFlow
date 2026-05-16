import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { User } from '../types/models';
import { API_URL } from '../lib/api-url';
import { storage, setInMemoryToken } from '../lib/storage';
import { STORAGE_KEY, setUnauthorizedHandler } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface StoredAuth { token: string; expiresAt: string; user: User; }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, isAuthenticated: false, isLoading: true });
  const queryClient = useQueryClient();
  const router = useRouter();

  // Hydratacja stanu z pamieci urzadzenia (SecureStore na native, AsyncStorage na web)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await storage.getItem(STORAGE_KEY);
        if (!raw) {
          if (!cancelled) setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return;
        }
        const parsed: StoredAuth = JSON.parse(raw);
        if (new Date(parsed.expiresAt) <= new Date()) {
          await storage.removeItem(STORAGE_KEY);
          if (!cancelled) setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
          return;
        }
        setInMemoryToken(parsed.token);
        if (!cancelled) {
          setState({ user: parsed.user, token: parsed.token, isAuthenticated: true, isLoading: false });
        }
      } catch {
        if (!cancelled) setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reakcja na 401 z dowolnego requestu axiosa - wyrzuc na ekran logowania
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setInMemoryToken(null);
      setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
      queryClient.clear();
      router.replace('/login');
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient, router]);

  const handleSuccess = useCallback(async (token: string, expiresAt: string, user: User) => {
    queryClient.clear();
    setInMemoryToken(token);
    await storage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt, user }));
    setState({ user, token, isAuthenticated: true, isLoading: false });
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      await handleSuccess(res.data.token, res.data.expiresAt, res.data.user);
      return { ok: true as const };
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || 'Błąd logowania' : 'Błąd sieci';
      return { ok: false as const, error: msg };
    }
  }, [handleSuccess]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, { email, password, displayName });
      await handleSuccess(res.data.token, res.data.expiresAt, res.data.user);
      return { ok: true as const };
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || 'Błąd rejestracji' : 'Błąd sieci';
      return { ok: false as const, error: msg };
    }
  }, [handleSuccess]);

  const logout = useCallback(async () => {
    setInMemoryToken(null);
    await storage.removeItem(STORAGE_KEY);
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    queryClient.clear();
  }, [queryClient]);

  return <AuthContext.Provider value={{ ...state, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
