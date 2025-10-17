import apiClient from './client';

export interface Queue {
  id: string;
  name: string;
  description?: string;
  slug: string;
  is_active: boolean;
  estimated_wait_time?: number;
  current_waiting: number;
  max_capacity?: number;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateQueueData {
  name: string;
  description?: string;
  is_active?: boolean;
  max_capacity?: number;
  color?: string;
}

export interface QueueStats {
  total_served_today: number;
  average_wait_time: number;
  current_waiting: number;
  max_wait_time: number;
}

export const queuesApi = {
  // Récupérer toutes les files d'attente
  getQueues: async (): Promise<Queue[]> => {
    const response = await apiClient.get('/queues/');
    return response.data;
  },

  // Récupérer une file d'attente par ID
  getQueueById: async (id: string): Promise<Queue> => {
    const response = await apiClient.get(`/queues/${id}/`);
    return response.data;
  },

  // Récupérer une file d'attente par slug
  getQueueBySlug: async (slug: string): Promise<Queue> => {
    const response = await apiClient.get(`/queues/slug/${slug}/`);
    return response.data;
  },

  // Créer une nouvelle file d'attente
  createQueue: async (queueData: CreateQueueData): Promise<Queue> => {
    const response = await apiClient.post('/queues/', queueData);
    return response.data;
  },

  // Mettre à jour une file d'attente
  updateQueue: async (id: string, queueData: Partial<CreateQueueData>): Promise<Queue> => {
    const response = await apiClient.patch(`/queues/${id}/`, queueData);
    return response.data;
  },

  // Supprimer une file d'attente
  deleteQueue: async (id: string): Promise<void> => {
    await apiClient.delete(`/queues/${id}/`);
  },

  // Récupérer les statistiques d'une file d'attente
  getQueueStats: async (id: string): Promise<QueueStats> => {
    const response = await apiClient.get(`/queues/${id}/stats/`);
    return response.data;
  },

  // Récupérer les files d'attente publiques
  getPublicQueues: async (): Promise<Queue[]> => {
    const response = await apiClient.get('/public/queues/');
    return response.data;
  },

  // Rejoindre une file d'attente
  joinQueue: async (queueId: string, customerData: {
    name: string;
    phone_number: string;
    email?: string;
  }): Promise<{ ticket_number: string; estimated_wait_time: number }> => {
    const response = await apiClient.post(`/queues/${queueId}/join/`, customerData);
    return response.data;
  },

  // Quitter une file d'attente
  leaveQueue: async (queueId: string, ticketNumber: string): Promise<void> => {
    await apiClient.post(`/queues/${queueId}/leave/`, { ticket_number: ticketNumber });
  },
};