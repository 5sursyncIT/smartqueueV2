/**
 * Configuration du client API Axios
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { API_CONFIG, CACHE_CONFIG } from '../constants/Config';
import { storage } from '../utils/storage';
import type { ApiError } from '../types/api.types';

class ApiClient {
  private client: AxiosInstance;
  private tenantSlug: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}`,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Configure les intercepteurs de requêtes et de réponses
   */
  private setupInterceptors() {
    // Intercepteur de requête : Ajouter le token d'authentification
    this.client.interceptors.request.use(
      async (config) => {
        const token = await storage.get<string>(CACHE_CONFIG.TOKEN_KEY);

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur de réponse : Gérer les erreurs globalement
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        // Token expiré -> tenter de rafraîchir
        if (error.response?.status === 401) {
          try {
            const refreshed = await this.refreshToken();
            if (refreshed && error.config) {
              // Réessayer la requête avec le nouveau token
              return this.client.request(error.config);
            }
          } catch (refreshError) {
            // Échec du refresh -> déconnecter l'utilisateur
            await this.clearAuth();
            throw refreshError;
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  /**
   * Définit le tenant actuel
   */
  setTenant(slug: string) {
    this.tenantSlug = slug;
  }

  /**
   * Construit une URL tenant-scoped
   */
  private buildTenantUrl(path: string): string {
    if (!this.tenantSlug) {
      throw new Error('Tenant slug not set');
    }
    return `/tenants/${this.tenantSlug}${path}`;
  }

  /**
   * Rafraîchit le token d'accès
   */
  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await storage.get<string>(CACHE_CONFIG.REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        return false;
      }

      const response = await axios.post(
        `${API_CONFIG.BASE_URL}${API_CONFIG.API_VERSION}/auth/jwt/refresh/`,
        { refresh: refreshToken }
      );

      const { access } = response.data;
      await storage.set(CACHE_CONFIG.TOKEN_KEY, access);

      return true;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token:', error);
      return false;
    }
  }

  /**
   * Efface les données d'authentification
   */
  private async clearAuth() {
    await storage.removeMultiple([
      CACHE_CONFIG.TOKEN_KEY,
      CACHE_CONFIG.REFRESH_TOKEN_KEY,
      CACHE_CONFIG.USER_KEY,
      CACHE_CONFIG.TENANT_KEY,
    ]);
  }

  /**
   * Gère les erreurs API
   */
  private handleError(error: AxiosError<ApiError>): ApiError {
    if (error.response?.data) {
      return error.response.data;
    }

    if (error.message) {
      return { message: error.message };
    }

    return { message: 'Une erreur est survenue' };
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * GET request tenant-scoped
   */
  async getTenant<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const url = this.buildTenantUrl(path);
    return this.get<T>(url, config);
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * POST request tenant-scoped
   */
  async postTenant<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const url = this.buildTenantUrl(path);
    return this.post<T>(url, data, config);
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request tenant-scoped
   */
  async putTenant<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const url = this.buildTenantUrl(path);
    return this.put<T>(url, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request tenant-scoped
   */
  async patchTenant<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const url = this.buildTenantUrl(path);
    return this.patch<T>(url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * DELETE request tenant-scoped
   */
  async deleteTenant<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const url = this.buildTenantUrl(path);
    return this.delete<T>(url, config);
  }
}

// Instance unique du client API
export const apiClient = new ApiClient();
