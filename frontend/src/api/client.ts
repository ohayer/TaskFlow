import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7071';
const STORAGE_KEY = 'taskflow.auth';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.token) config.headers.Authorization = `Bearer ${parsed.token}`;
    }
  } catch { /* ignore */ }
  return config;
});

apiClient.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.href = '/';                                               // wyrzuć na login
    }
    return Promise.reject(err);
  }
);
