import apiClient from './client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  avatar?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const authApi = {
  // Connexion utilisateur
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/jwt/token/', credentials);
    return response.data;
  },

  // Rafraîchissement du token
  refreshToken: async (refreshToken: string): Promise<{ access: string }> => {
    const response = await apiClient.post('/auth/jwt/refresh/', {
      refresh: refreshToken,
    });
    return response.data;
  },

  // Vérification du token
  verifyToken: async (token: string): Promise<void> => {
    await apiClient.post('/auth/jwt/verify/', { token });
  },

  // Récupération du profil utilisateur
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get('/auth/jwt/me/');
    return response.data;
  },

  // Déconnexion (blacklist du token)
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      await apiClient.post('/auth/jwt/blacklist/', { refresh: refreshToken });
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  // Changement de mot de passe
  changePassword: async (data: {
    old_password: string;
    new_password: string;
  }): Promise<void> => {
    await apiClient.post('/auth/change-password/', data);
  },

  // Inscription (création de compte)
  register: async (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }): Promise<User> => {
    const response = await apiClient.post('/auth/', userData);
    return response.data;
  },
};