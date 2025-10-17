import apiClient from './client';

export interface Notification {
  id: string;
  type: 'ticket_called' | 'queue_update' | 'system_alert' | 'subscription' | 'feedback';
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  ticket_called: boolean;
  queue_updates: boolean;
  system_alerts: boolean;
  subscription_updates: boolean;
  feedback_received: boolean;
}

export const notificationsApi = {
  // Récupérer toutes les notifications
  getNotifications: async (params?: {
    type?: string;
    is_read?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications/', { params });
    return response.data;
  },

  // Récupérer une notification par ID
  getNotificationById: async (id: string): Promise<Notification> => {
    const response = await apiClient.get(`/notifications/${id}/`);
    return response.data;
  },

  // Marquer une notification comme lue
  markAsRead: async (id: string): Promise<Notification> => {
    const response = await apiClient.patch(`/notifications/${id}/mark-read/`);
    return response.data;
  },

  // Marquer toutes les notifications comme lues
  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.post('/notifications/mark-all-read/');
    return response.data;
  },

  // Supprimer une notification
  deleteNotification: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}/`);
  },

  // Supprimer toutes les notifications lues
  deleteAllRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.delete('/notifications/delete-all-read/');
    return response.data;
  },

  // Récupérer les préférences de notification
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get('/notifications/preferences/');
    return response.data;
  },

  // Mettre à jour les préférences de notification
  updatePreferences: async (
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> => {
    const response = await apiClient.patch('/notifications/preferences/', preferences);
    return response.data;
  },

  // Récupérer les statistiques des notifications
  getNotificationStats: async (): Promise<{
    total: number;
    unread: number;
    by_type: Record<string, number>;
  }> => {
    const response = await apiClient.get('/notifications/stats/');
    return response.data;
  },

  // S'abonner aux notifications en temps réel
  subscribeToRealTime: async (): Promise<{ ws_url: string }> => {
    const response = await apiClient.get('/notifications/ws-url/');
    return response.data;
  },

  // Envoyer une notification de test
  sendTestNotification: async (type: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/notifications/send-test/', { type });
    return response.data;
  },

  // Récupérer les notifications non lues
  getUnreadNotifications: async (): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications/unread/');
    return response.data;
  },

  // Récupérer les notifications récentes
  getRecentNotifications: async (limit: number = 10): Promise<Notification[]> => {
    const response = await apiClient.get('/notifications/recent/', {
      params: { limit },
    });
    return response.data;
  },
};