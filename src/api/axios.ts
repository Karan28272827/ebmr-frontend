import axios from 'axios';

// In production (Vercel), VITE_API_URL is the backend URL, e.g. https://ebmr-api.vercel.app
// In local dev (Docker), it is unset and Vite's proxy forwards /api → backend:3001
const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

// Unauthenticated instance
export const api = axios.create({ baseURL: BASE });

// Authenticated instance — injects token from localStorage
export const authApi = axios.create({ baseURL: BASE });

authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

authApi.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await api.post('/auth/refresh', { refreshToken });
          localStorage.setItem('access_token', res.data.accessToken);
          err.config.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return authApi.request(err.config);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
