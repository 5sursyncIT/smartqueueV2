import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { APIError } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

console.log('API_URL:', API_URL);
console.log('baseURL:', `${API_URL}/api/v1`);

// Create axios instance
export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Pour les cookies httpOnly
});

// Token storage (in-memory + localStorage)
let accessToken: string | null = null;
let refreshToken: string | null = null;

// Initialize tokens from localStorage on module load
if (typeof window !== 'undefined') {
  accessToken = localStorage.getItem('accessToken');
  refreshToken = localStorage.getItem('refreshToken');
}

export const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }
};

export const getAccessToken = () => accessToken;
export const getRefreshToken = () => refreshToken;

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;

  // Clear from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Ne pas ajouter de token pour les requêtes d'authentification
    const isAuthRequest = config.url?.includes('/auth/jwt/token') ||
                          config.url?.includes('/auth/jwt/refresh');

    if (accessToken && !isAuthRequest) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add tenant slug if available (from storage or context)
    const tenantSlug = getTenantSlug();
    if (tenantSlug && !config.url?.includes('/tenants/') && !isAuthRequest) {
      // Ne pas ajouter X-Tenant si l'URL contient déjà le tenant ou si c'est une requête d'auth
      config.headers['X-Tenant'] = tenantSlug;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<APIError>) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Si 401 et on n'a pas encore essayé de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si un refresh est déjà en cours, attendre qu'il se termine
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Si pas de refresh token, on ne peut pas rafraîchir
        if (!refreshToken) {
          console.log('[API Client] No refresh token available, clearing tokens');
          clearTokens();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        const response = await axios.post(
          `${API_URL}/api/v1/auth/jwt/refresh/`,
          { refresh: refreshToken },
          { withCredentials: true }
        );

        const { access } = response.data;
        setTokens(access, refreshToken!);
        onTokenRefreshed(access);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        console.log('[API Client] Token refresh failed, clearing tokens and redirecting to login');
        clearTokens();

        // Clear auth store as well
        if (typeof window !== 'undefined') {
          // Clear auth store from zustand persist
          localStorage.removeItem('auth-storage');

          // Redirect only if not already on login page
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper to get tenant slug from localStorage
const getTenantSlug = (): string | null => {
  if (typeof window === 'undefined') return null;
  const tenant = localStorage.getItem('currentTenant');
  if (tenant) {
    try {
      return JSON.parse(tenant).slug;
    } catch {
      return null;
    }
  }
  return null;
};

// Helper to build tenant-scoped URL
export const buildTenantUrl = (tenantSlug: string, path: string): string => {
  return `/tenants/${tenantSlug}${path}`;
};

// Generic request wrapper with error handling
export async function apiRequest<T>(
  config: AxiosRequestConfig
): Promise<T> {
  try {
    const response: AxiosResponse<T> = await apiClient(config);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as APIError;
      throw new Error(
        apiError?.detail || apiError?.message || 'Une erreur est survenue'
      );
    }
    throw error;
  }
}
