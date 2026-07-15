import axios from 'axios';

/**
 * apiClient — hardened Axios instance
 *
 * Features:
 *   - Base URL from VITE_API_BASE_URL (falls back to http://localhost:8000/api)
 *   - 15-second timeout
 *   - Request interceptor: injects Bearer token from localStorage
 *   - Response interceptor:
 *       • 401 → attempts silent token refresh via /auth/refresh
 *       • Queues parallel requests while refresh is in-flight
 *       • On refresh failure: clears tokens, redirects to /login
 *       • Normalises all errors into { message, code, detail }
 */

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Token helpers ─────────────────────────────────────────────────────────
export const getAccessToken  = ()      => localStorage.getItem('accessToken');
export const getRefreshToken = ()      => localStorage.getItem('refreshToken');
export const setTokens       = (a, r) => {
  localStorage.setItem('accessToken', a);
  if (r) localStorage.setItem('refreshToken', r);
};
export const clearTokens     = ()      => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// ── Refresh-queue state ───────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else       prom.resolve(token);
  });
  failedQueue = [];
};

// ── Request interceptor ───────────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor ──────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    // ── 401: attempt token refresh ────────────────────────────────────────
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      getRefreshToken()
    ) {
      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: getRefreshToken(),
        });
        const newAccess = data.access_token;
        setTokens(newAccess, data.refresh_token ?? getRefreshToken());
        apiClient.defaults.headers.Authorization = `Bearer ${newAccess}`;
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 401 with no refresh token → go to login ───────────────────────────
    if (error.response?.status === 401) {
      clearTokens();
      window.location.href = '/login';
    }

    // ── Normalise error shape ─────────────────────────────────────────────
    // FastAPI validation errors return { detail: [...] } arrays
    const rawDetail = error.response?.data?.detail;
    const message = Array.isArray(rawDetail)
      ? rawDetail.map((e) => `${e.loc?.slice(-1)[0]}: ${e.msg}`).join('; ')
      : rawDetail ??
        error.response?.data?.message ??
        error.message ??
        'An unexpected error occurred.';

    return Promise.reject({
      message,
      code:   error.response?.status  ?? null,
      detail: error.response?.data    ?? null,
    });
  },
);

export default apiClient;
