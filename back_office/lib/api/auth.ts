import { apiClient, setTokens, clearTokens } from './client';
import type { LoginCredentials, AuthTokens, User, JWTPayload } from '@/lib/types';

// Decode JWT payload (sans vérification - juste pour lire les claims)
function decodeJWT(token: string): JWTPayload {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

export interface LoginResponse {
  user: User;
  payload: JWTPayload;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  // DEBUG: Log des credentials envoyés
  console.log('[Auth API] Login attempt with:', {
    email: credentials.email,
    passwordLength: credentials.password?.length || 0
  });

  const response = await apiClient.post<AuthTokens>('/auth/jwt/token/', credentials);

  console.log('[Auth API] Login response status:', response.status);
  console.log('[Auth API] Login response data keys:', Object.keys(response.data));

  const { access, refresh } = response.data;
  setTokens(access, refresh);

  // Décoder le JWT pour obtenir les infos utilisateur
  const payload = decodeJWT(access);

  // Construire l'objet user depuis le payload
  const user: User = {
    id: payload.user_id,
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    is_active: true,
  };

  return { user, payload };
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/jwt/blacklist/', {
      refresh: localStorage.getItem('refreshToken'),
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearTokens();
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>('/auth/jwt/me/');
  return response.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await apiClient.post<{ access: string }>('/auth/jwt/refresh/', {
    refresh: refreshToken,
  });
  return response.data.access;
}
