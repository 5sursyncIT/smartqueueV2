import apiClient from './client';

export interface Display {
  id: string;
  name: string;
  description?: string;
  location?: string;
  is_active: boolean;
  current_ticket?: string;
  current_ticket_number?: string;
  queue?: string;
  queue_name?: string;
  refresh_interval: number;
  theme: 'light' | 'dark' | 'custom';
  custom_css?: string;
  created_at: string;
  updated_at: string;
}

export interface DisplayStats {
  total_displays: number;
  active_displays: number;
  displays_by_location: Record<string, number>;
}

export const displaysApi = {
  // Récupérer tous les affichages
  getDisplays: async (): Promise<Display[]> => {
    const response = await apiClient.get('/displays/');
    return response.data;
  },

  // Récupérer un affichage par ID
  getDisplayById: async (id: string): Promise<Display> => {
    const response = await apiClient.get(`/displays/${id}/`);
    return response.data;
  },

  // Créer un nouvel affichage
  createDisplay: async (displayData: {
    name: string;
    description?: string;
    location?: string;
    is_active?: boolean;
    refresh_interval?: number;
    theme?: 'light' | 'dark' | 'custom';
    custom_css?: string;
  }): Promise<Display> => {
    const response = await apiClient.post('/displays/', displayData);
    return response.data;
  },

  // Mettre à jour un affichage
  updateDisplay: async (
    id: string,
    displayData: Partial<{
      name: string;
      description: string;
      location: string;
      is_active: boolean;
      refresh_interval: number;
      theme: 'light' | 'dark' | 'custom';
      custom_css: string;
    }>
  ): Promise<Display> => {
    const response = await apiClient.patch(`/displays/${id}/`, displayData);
    return response.data;
  },

  // Supprimer un affichage
  deleteDisplay: async (id: string): Promise<void> => {
    await apiClient.delete(`/displays/${id}/`);
  },

  // Assigner une file d'attente à un affichage
  assignQueueToDisplay: async (
    displayId: string,
    queueId: string
  ): Promise<Display> => {
    const response = await apiClient.post(`/displays/${displayId}/assign-queue/`, {
      queue_id: queueId,
    });
    return response.data;
  },

  // Désassigner une file d'attente d'un affichage
  unassignQueueFromDisplay: async (displayId: string): Promise<Display> => {
    const response = await apiClient.post(`/displays/${displayId}/unassign-queue/`);
    return response.data;
  },

  // Récupérer les données d'affichage public
  getPublicDisplayData: async (displayId: string): Promise<{
    display: Display;
    current_ticket?: {
      ticket_number: string;
      customer_name: string;
      position: number;
    };
    next_tickets: Array<{
      ticket_number: string;
      customer_name: string;
      position: number;
    }>;
    queue_info?: {
      name: string;
      estimated_wait_time: number;
      current_waiting: number;
    };
  }> => {
    const response = await apiClient.get(`/public/displays/${displayId}/`);
    return response.data;
  },

  // Récupérer les statistiques des affichages
  getDisplayStats: async (): Promise<DisplayStats> => {
    const response = await apiClient.get('/displays/stats/');
    return response.data;
  },

  // Mettre à jour le ticket courant d'un affichage
  updateCurrentTicket: async (
    displayId: string,
    ticketNumber: string
  ): Promise<Display> => {
    const response = await apiClient.post(`/displays/${displayId}/update-ticket/`, {
      ticket_number: ticketNumber,
    });
    return response.data;
  },

  // Réinitialiser l'affichage
  resetDisplay: async (displayId: string): Promise<Display> => {
    const response = await apiClient.post(`/displays/${displayId}/reset/`);
    return response.data;
  },

  // Récupérer les affichages par localisation
  getDisplaysByLocation: async (location: string): Promise<Display[]> => {
    const response = await apiClient.get('/displays/by-location/', {
      params: { location },
    });
    return response.data;
  },
};