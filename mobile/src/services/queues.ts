/**
 * Service API pour les files d'attente
 */

import { apiClient } from './api';
import type { Queue } from '../types/api.types';

export interface QueueStats {
  waiting_count: number;
  serving_count: number;
  completed_today: number;
  avg_wait_time: number;
  avg_service_time: number;
}

export const queuesService = {
  /**
   * Récupère toutes les files d'attente
   */
  async getAll(): Promise<Queue[]> {
    const response = await apiClient.getTenant<Queue[]>('/queues/');
    return response.data;
  },

  /**
   * Récupère une file d'attente par ID
   */
  async getById(queueId: string): Promise<Queue> {
    const response = await apiClient.getTenant<Queue>(`/queues/${queueId}/`);
    return response.data;
  },

  /**
   * Récupère les statistiques d'une file d'attente
   */
  async getStats(queueId: string): Promise<QueueStats> {
    const response = await apiClient.getTenant<QueueStats>(`/queues/${queueId}/stats/`);
    return response.data;
  },

  /**
   * Récupère les tickets d'une file d'attente
   */
  async getTickets(queueId: string): Promise<any[]> {
    const response = await apiClient.getTenant<any[]>(`/queues/${queueId}/tickets/`);
    return response.data;
  },
};
