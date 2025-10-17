import apiClient from './client';

export interface Ticket {
  id: string;
  ticket_number: string;
  queue: string;
  queue_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  status: 'waiting' | 'serving' | 'served' | 'cancelled' | 'no_show';
  position: number;
  estimated_wait_time?: number;
  called_at?: string;
  served_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TicketStats {
  total_tickets_today: number;
  average_serving_time: number;
  served_tickets: number;
  waiting_tickets: number;
}

export const ticketsApi = {
  // Récupérer tous les tickets
  getTickets: async (params?: {
    queue?: string;
    status?: string;
    date?: string;
  }): Promise<Ticket[]> => {
    const response = await apiClient.get('/tickets/', { params });
    return response.data;
  },

  // Récupérer un ticket par ID
  getTicketById: async (id: string): Promise<Ticket> => {
    const response = await apiClient.get(`/tickets/${id}/`);
    return response.data;
  },

  // Récupérer un ticket par numéro
  getTicketByNumber: async (ticketNumber: string): Promise<Ticket> => {
    const response = await apiClient.get(`/tickets/number/${ticketNumber}/`);
    return response.data;
  },

  // Mettre à jour le statut d'un ticket
  updateTicketStatus: async (
    id: string,
    status: Ticket['status']
  ): Promise<Ticket> => {
    const response = await apiClient.patch(`/tickets/${id}/status/`, { status });
    return response.data;
  },

  // Appeler le ticket suivant
  callNextTicket: async (queueId: string): Promise<Ticket> => {
    const response = await apiClient.post(`/tickets/${queueId}/call-next/`);
    return response.data;
  },

  // Marquer un ticket comme servi
  markAsServed: async (ticketId: string): Promise<Ticket> => {
    const response = await apiClient.post(`/tickets/${ticketId}/mark-served/`);
    return response.data;
  },

  // Marquer un ticket comme annulé
  markAsCancelled: async (ticketId: string): Promise<Ticket> => {
    const response = await apiClient.post(`/tickets/${ticketId}/mark-cancelled/`);
    return response.data;
  },

  // Récupérer les statistiques des tickets
  getTicketStats: async (params?: {
    queue?: string;
    date?: string;
  }): Promise<TicketStats> => {
    const response = await apiClient.get('/tickets/stats/', { params });
    return response.data;
  },

  // Récupérer l'historique des tickets
  getTicketHistory: async (params: {
    queue?: string;
    customer_phone?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<Ticket[]> => {
    const response = await apiClient.get('/tickets/history/', { params });
    return response.data;
  },

  // Vérifier le statut d'un ticket public
  checkTicketStatus: async (ticketNumber: string): Promise<Ticket> => {
    const response = await apiClient.get(`/public/tickets/${ticketNumber}/status/`);
    return response.data;
  },
};