// src/boot/axios.ts
import { boot } from 'quasar/wrappers';
import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios'; // ✅ import type รวมกันที่บรรทัดเดียว
import type { App } from 'vue'


declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3010/api/v1',
});
console.log(api);
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as AxiosError; // ✅ ใช้ type ที่ import มาแล้ว
    const originalRequest = axiosError.config as InternalAxiosRequestConfig & { _retry?: boolean }; // ✅ เช่นกัน

    if (axiosError.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(axiosError);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${String(token)}`;
          return api(originalRequest);
        })
        .catch((err: unknown) =>
          Promise.reject(err instanceof Error ? err : new Error(String(err))),
        );
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const response = await api.post('/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefresh } = response.data.token;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefresh);
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      processQueue(null, accessToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (err: unknown) {
      processQueue(err, null);

      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('name');
      localStorage.removeItem('department');
      localStorage.removeItem('idcard');
      localStorage.removeItem('role');
      window.location.href = '/login';

      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    } finally {
      isRefreshing = false;
    }
  },
);

export default boot(({ app }: { app: App }) => {
  app.config.globalProperties.$axios = axios;
  app.config.globalProperties.$api = api;
});

export { api };