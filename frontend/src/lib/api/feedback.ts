import apiClient from './client';

export interface Feedback {
  id: string;
  ticket?: string;
  ticket_number?: string;
  queue?: string;
  queue_name?: string;
  rating: number;
  comment?: string;
  customer_name?: string;
  customer_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface FeedbackStats {
  average_rating: number;
  total_feedback: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recent_feedback: Feedback[];
}

export const feedbackApi = {
  // Récupérer tous les retours
  getFeedback: async (params?: {
    queue?: string;
    rating?: number;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<Feedback[]> => {
    const response = await apiClient.get('/feedback/', { params });
    return response.data;
  },

  // Récupérer un retour par ID
  getFeedbackById: async (id: string): Promise<Feedback> => {
    const response = await apiClient.get(`/feedback/${id}/`);
    return response.data;
  },

  // Créer un nouveau retour
  createFeedback: async (feedbackData: {
    ticket_number: string;
    rating: number;
    comment?: string;
    customer_name?: string;
    customer_phone?: string;
  }): Promise<Feedback> => {
    const response = await apiClient.post('/feedback/', feedbackData);
    return response.data;
  },

  // Mettre à jour un retour
  updateFeedback: async (
    id: string,
    feedbackData: Partial<{
      rating: number;
      comment: string;
    }>
  ): Promise<Feedback> => {
    const response = await apiClient.patch(`/feedback/${id}/`, feedbackData);
    return response.data;
  },

  // Supprimer un retour
  deleteFeedback: async (id: string): Promise<void> => {
    await apiClient.delete(`/feedback/${id}/`);
  },

  // Récupérer les statistiques des retours
  getFeedbackStats: async (params?: {
    queue?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<FeedbackStats> => {
    const response = await apiClient.get('/feedback/stats/', { params });
    return response.data;
  },

  // Récupérer les retours récents
  getRecentFeedback: async (limit: number = 10): Promise<Feedback[]> => {
    const response = await apiClient.get('/feedback/recent/', {
      params: { limit },
    });
    return response.data;
  },

  // Soumettre un retour public (sans authentification)
  submitPublicFeedback: async (feedbackData: {
    ticket_number: string;
    rating: number;
    comment?: string;
    customer_name?: string;
    customer_phone?: string;
  }): Promise<Feedback> => {
    const response = await apiClient.post('/public/feedback/', feedbackData);
    return response.data;
  },

  // Récupérer les retours pour un ticket spécifique
  getFeedbackForTicket: async (ticketNumber: string): Promise<Feedback[]> => {
    const response = await apiClient.get(`/feedback/ticket/${ticketNumber}/`);
    return response.data;
  },

  // Exporter les retours
  exportFeedback: async (params: {
    format: 'csv' | 'json';
    start_date?: string;
    end_date?: string;
    queue?: string;
  }): Promise<{ download_url: string }> => {
    const response = await apiClient.get('/feedback/export/', { params });
    return response.data;
  },
};