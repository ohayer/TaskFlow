import axios from 'axios';
import { API_URL } from '../lib/api-url';
import { getInMemoryToken, setInMemoryToken, storage } from '../lib/storage';

export const STORAGE_KEY = 'taskflow.auth';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getInMemoryToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Callback pozwalajacy AuthContext zareagowac na 401 (np. wymusic logout + redirect).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      setInMemoryToken(null);
      await storage.removeItem(STORAGE_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);
