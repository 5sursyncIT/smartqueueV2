import apiClient from './client';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  avatar?: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  password: string;
}

export interface UpdateUserData {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
}

export const usersApi = {
  // Récupérer tous les utilisateurs
  getUsers: async (): Promise<User[]> => {
    const response = await apiClient.get('/auth/users/');
    return response.data;
  },

  // Récupérer un utilisateur par ID
  getUserById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/auth/users/${id}/`);
    return response.data;
  },

  // Créer un nouvel utilisateur
  createUser: async (userData: CreateUserData): Promise<User> => {
    const response = await apiClient.post('/auth/users/', userData);
    return response.data;
  },

  // Mettre à jour un utilisateur
  updateUser: async (id: string, userData: UpdateUserData): Promise<User> => {
    const response = await apiClient.patch(`/auth/users/${id}/`, userData);
    return response.data;
  },

  // Supprimer un utilisateur
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/auth/users/${id}/`);
  },

  // Inviter un agent
  inviteAgent: async (data: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/users/invite-agent/', data);
    return response.data;
  },

  // Mettre à jour le profil agent
  updateAgentProfile: async (data: {
    is_available?: boolean;
    current_queue?: string;
  }): Promise<User> => {
    const response = await apiClient.patch('/auth/users/agent-profile/', data);
    return response.data;
  },
};