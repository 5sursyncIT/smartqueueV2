import apiClient from './client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  is_active: boolean;
  max_queues: number;
  max_agents: number;
  max_customers_per_month?: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'mobile_money';
  last4?: string;
  brand?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  created_at: string;
}

export const subscriptionsApi = {
  // Récupérer tous les plans d'abonnement
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get('/subscriptions/plans/');
    return response.data;
  },

  // Récupérer un plan par ID
  getPlanById: async (id: string): Promise<SubscriptionPlan> => {
    const response = await apiClient.get(`/subscriptions/plans/${id}/`);
    return response.data;
  },

  // Récupérer l'abonnement actuel
  getCurrentSubscription: async (): Promise<Subscription> => {
    const response = await apiClient.get('/subscriptions/current/');
    return response.data;
  },

  // Souscrire à un plan
  subscribe: async (planId: string, paymentMethodId?: string): Promise<Subscription> => {
    const response = await apiClient.post('/subscriptions/subscribe/', {
      plan_id: planId,
      payment_method_id: paymentMethodId,
    });
    return response.data;
  },

  // Mettre à jour l'abonnement
  updateSubscription: async (planId: string): Promise<Subscription> => {
    const response = await apiClient.patch('/subscriptions/update/', {
      plan_id: planId,
    });
    return response.data;
  },

  // Annuler l'abonnement
  cancelSubscription: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/subscriptions/cancel/');
    return response.data;
  },

  // Réactiver l'abonnement
  reactivateSubscription: async (): Promise<Subscription> => {
    const response = await apiClient.post('/subscriptions/reactivate/');
    return response.data;
  },

  // Récupérer les méthodes de paiement
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const response = await apiClient.get('/subscriptions/payment-methods/');
    return response.data;
  },

  // Ajouter une méthode de paiement
  addPaymentMethod: async (paymentMethodData: {
    type: 'card' | 'mobile_money';
    token: string;
    is_default?: boolean;
  }): Promise<PaymentMethod> => {
    const response = await apiClient.post('/subscriptions/payment-methods/', paymentMethodData);
    return response.data;
  },

  // Mettre à jour la méthode de paiement par défaut
  setDefaultPaymentMethod: async (paymentMethodId: string): Promise<void> => {
    await apiClient.patch(`/subscriptions/payment-methods/${paymentMethodId}/set-default/`);
  },

  // Supprimer une méthode de paiement
  removePaymentMethod: async (paymentMethodId: string): Promise<void> => {
    await apiClient.delete(`/subscriptions/payment-methods/${paymentMethodId}/`);
  },

  // Récupérer l'historique des factures
  getInvoices: async (): Promise<any[]> => {
    const response = await apiClient.get('/subscriptions/invoices/');
    return response.data;
  },

  // Récupérer les statistiques d'utilisation
  getUsageStats: async (): Promise<{
    queues_used: number;
    agents_used: number;
    customers_this_month: number;
    max_queues: number;
    max_agents: number;
    max_customers: number;
  }> => {
    const response = await apiClient.get('/subscriptions/usage-stats/');
    return response.data;
  },
};