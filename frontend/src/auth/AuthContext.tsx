import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '../types/models';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'taskflow.auth';
const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7071';

interface StoredAuth { token: string; expiresAt: string; user: User; }

function loadFromStorage(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: StoredAuth = JSON.parse(raw);
    if (new Date(parsed.expiresAt) <= new Date()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, isAuthenticated: false, isLoading: true });
  const queryClient = useQueryClient();                                        // TanStack Query - czyscimy cache przy zmianie sesji

  useEffect(() => {
    const stored = loadFromStorage();
    setState({
      user: stored?.user ?? null,
      token: stored?.token ?? null,
      isAuthenticated: !!stored,
      isLoading: false,
    });
  }, []);

  const handleSuccess = useCallback((token: string, expiresAt: string, user: User) => {
    // Wyczysc wszystkie zapamietane queries (z poprzedniej sesji innego usera, jesli byla)
    queryClient.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt, user }));
    setState({ user, token, isAuthenticated: true, isLoading: false });
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await axios.post(`${baseURL}/api/auth/login`, { email, password });
      handleSuccess(res.data.token, res.data.expiresAt, res.data.user);
      return { ok: true as const };
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || 'Błąd logowania' : 'Błąd sieci';
      return { ok: false as const, error: msg };
    }
  }, [handleSuccess]);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      const res = await axios.post(`${baseURL}/api/auth/register`, { email, password, displayName });
      handleSuccess(res.data.token, res.data.expiresAt, res.data.user);
      return { ok: true as const };
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || 'Błąd rejestracji' : 'Błąd sieci';
      return { ok: false as const, error: msg };
    }
  }, [handleSuccess]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
    // Czysci wszystkie zcache'owane dane TanStack Query (projekty, zadania, audit, attachments)
    // BEZ tego nastepny user widzi dane poprzedniego dopoki nie zrobi hard refresh.
    queryClient.clear();
  }, [queryClient]);

  return <AuthContext.Provider value={{ ...state, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
