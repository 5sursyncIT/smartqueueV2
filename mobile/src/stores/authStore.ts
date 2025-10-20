/**
 * Store Zustand pour l'authentification
 */

import { create } from 'zustand';
import { authService } from '../services/auth';
import { apiClient } from '../services/api';
import type { User, Tenant } from '../types/api.types';

interface AuthState {
  // État
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setTenant: (tenant: Tenant) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // État initial
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Connexion
  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login({ email, password });

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de la connexion',
        isLoading: false,
      });
      throw error;
    }
  },

  // Inscription
  register: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.register(data);

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de l\'inscription',
        isLoading: false,
      });
      throw error;
    }
  },

  // Déconnexion
  logout: async () => {
    set({ isLoading: true });

    try {
      await authService.logout();

      set({
        user: null,
        tenant: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Erreur lors de la déconnexion',
        isLoading: false,
      });
      throw error;
    }
  },

  // Charger l'utilisateur connecté
  loadUser: async () => {
    set({ isLoading: true });

    try {
      const isAuth = await authService.isAuthenticated();

      if (!isAuth) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      const user = await authService.getCurrentUser();

      if (user) {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
      set({
        isAuthenticated: false,
        isLoading: false,
        error: error.message || 'Erreur lors du chargement de l\'utilisateur',
      });
    }
  },

  // Définir le tenant actuel
  setTenant: (tenant) => {
    set({ tenant });
    apiClient.setTenant(tenant.slug);
  },

  // Effacer l'erreur
  clearError: () => {
    set({ error: null });
  },
}));
