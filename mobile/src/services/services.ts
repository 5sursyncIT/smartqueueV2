/**
 * Service API pour les services (offres de l'organisation)
 */

import { apiClient } from './api';
import type { Service } from '../types/api.types';

export const servicesService = {
  /**
   * Récupère tous les services disponibles
   */
  async getAll(): Promise<Service[]> {
    const response = await apiClient.getTenant<Service[]>('/services/');
    return response.data;
  },

  /**
   * Récupère un service par ID
   */
  async getById(serviceId: string): Promise<Service> {
    const response = await apiClient.getTenant<Service>(`/services/${serviceId}/`);
    return response.data;
  },

  /**
   * Récupère les statistiques d'un service
   */
  async getStats(serviceId: string): Promise<any> {
    const response = await apiClient.getTenant<any>(`/services/${serviceId}/stats/`);
    return response.data;
  },
};
