import apiClient from './client';

export interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  total_visits: number;
  last_visit?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerStats {
  total_customers: number;
  new_customers_today: number;
  returning_customers: number;
  average_visits: number;
}

export const customersApi = {
  // Récupérer tous les clients
  getCustomers: async (params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Customer[]> => {
    const response = await apiClient.get('/customers/', { params });
    return response.data;
  },

  // Récupérer un client par ID
  getCustomerById: async (id: string): Promise<Customer> => {
    const response = await apiClient.get(`/customers/${id}/`);
    return response.data;
  },

  // Récupérer un client par numéro de téléphone
  getCustomerByPhone: async (phoneNumber: string): Promise<Customer> => {
    const response = await apiClient.get(`/customers/phone/${phoneNumber}/`);
    return response.data;
  },

  // Créer un nouveau client
  createCustomer: async (customerData: {
    name: string;
    phone_number: string;
    email?: string;
  }): Promise<Customer> => {
    const response = await apiClient.post('/customers/', customerData);
    return response.data;
  },

  // Mettre à jour un client
  updateCustomer: async (
    id: string,
    customerData: Partial<{
      name: string;
      phone_number: string;
      email: string;
    }>
  ): Promise<Customer> => {
    const response = await apiClient.patch(`/customers/${id}/`, customerData);
    return response.data;
  },

  // Supprimer un client
  deleteCustomer: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}/`);
  },

  // Récupérer les statistiques des clients
  getCustomerStats: async (): Promise<CustomerStats> => {
    const response = await apiClient.get('/customers/stats/');
    return response.data;
  },

  // Rechercher des clients
  searchCustomers: async (query: string): Promise<Customer[]> => {
    const response = await apiClient.get('/customers/search/', {
      params: { q: query },
    });
    return response.data;
  },

  // Récupérer l'historique des visites d'un client
  getCustomerVisitHistory: async (
    customerId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> => {
    const response = await apiClient.get(`/customers/${customerId}/visits/`, {
      params,
    });
    return response.data;
  },
};