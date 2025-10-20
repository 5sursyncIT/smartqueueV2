/**
 * Service API pour les tickets
 */

import { apiClient } from './api';
import type { Ticket } from '../types/api.types';

export interface CreateTicketDto {
  service_id: string;
  queue_id?: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email?: string;
  priority?: 'normal' | 'high' | 'urgent';
}

export const ticketsService = {
  /**
   * Récupère tous les tickets du tenant
   */
  async getAll(): Promise<Ticket[]> {
    const response = await apiClient.getTenant<Ticket[]>('/tickets/');
    return response.data;
  },

  /**
   * Récupère les tickets de l'utilisateur connecté
   */
  async getMyTickets(): Promise<Ticket[]> {
    const response = await apiClient.getTenant<Ticket[]>('/tickets/my/');
    return response.data;
  },

  /**
   * Récupère un ticket par ID
   */
  async getById(ticketId: string): Promise<Ticket> {
    const response = await apiClient.getTenant<Ticket>(`/tickets/${ticketId}/`);
    return response.data;
  },

  /**
   * Crée un nouveau ticket
   */
  async create(data: CreateTicketDto): Promise<Ticket> {
    const response = await apiClient.postTenant<Ticket>('/tickets/', data);
    return response.data;
  },

  /**
   * Annule un ticket
   */
  async cancel(ticketId: string): Promise<Ticket> {
    const response = await apiClient.postTenant<Ticket>(
      `/tickets/${ticketId}/cancel/`,
      {}
    );
    return response.data;
  },

  /**
   * Récupère l'historique des tickets de l'utilisateur
   */
  async getHistory(): Promise<Ticket[]> {
    const response = await apiClient.getTenant<Ticket[]>('/tickets/history/');
    return response.data;
  },
};
