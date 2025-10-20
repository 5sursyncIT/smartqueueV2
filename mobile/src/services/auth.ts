/**
 * Service d'authentification
 */

import { apiClient } from './api';
import { storage } from '../utils/storage';
import { CACHE_CONFIG } from '../constants/Config';
import type { AuthResponse, User } from '../types/api.types';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
}

export const authService = {
  /**
   * Connexion
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      '/auth/jwt/token/',
      credentials
    );

    // Sauvegarder les tokens et l'utilisateur
    await Promise.all([
      storage.set(CACHE_CONFIG.TOKEN_KEY, response.access),
      storage.set(CACHE_CONFIG.REFRESH_TOKEN_KEY, response.refresh),
      storage.set(CACHE_CONFIG.USER_KEY, response.user),
    ]);

    return response;
  },

  /**
   * Inscription
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register/', data);

    // Sauvegarder les tokens et l'utilisateur
    await Promise.all([
      storage.set(CACHE_CONFIG.TOKEN_KEY, response.access),
      storage.set(CACHE_CONFIG.REFRESH_TOKEN_KEY, response.refresh),
      storage.set(CACHE_CONFIG.USER_KEY, response.user),
    ]);

    return response;
  },

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    // Supprimer les données d'authentification du stockage local
    await storage.removeMultiple([
      CACHE_CONFIG.TOKEN_KEY,
      CACHE_CONFIG.REFRESH_TOKEN_KEY,
      CACHE_CONFIG.USER_KEY,
      CACHE_CONFIG.TENANT_KEY,
    ]);
  },

  /**
   * Récupérer l'utilisateur connecté
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      // Essayer de récupérer depuis le cache d'abord
      const cachedUser = await storage.get<User>(CACHE_CONFIG.USER_KEY);
      if (cachedUser) {
        return cachedUser;
      }

      // Sinon, récupérer depuis l'API
      const user = await apiClient.get<User>('/auth/jwt/me/');
      await storage.set(CACHE_CONFIG.USER_KEY, user);
      return user;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  },

  /**
   * Vérifier si l'utilisateur est connecté
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await storage.get<string>(CACHE_CONFIG.TOKEN_KEY);
    return !!token;
  },

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await storage.get<string>(CACHE_CONFIG.REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        return null;
      }

      const response = await apiClient.post<{ access: string }>(
        '/auth/jwt/refresh/',
        { refresh: refreshToken }
      );

      await storage.set(CACHE_CONFIG.TOKEN_KEY, response.access);
      return response.access;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token:', error);
      return null;
    }
  },

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(email: string): Promise<void> {
    await apiClient.post('/auth/password/reset/', { email });
  },

  /**
   * Confirmer la réinitialisation du mot de passe
   */
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/password/reset/confirm/', {
      token,
      new_password: newPassword,
    });
  },
};
