import apiClient from './client';

export interface ContactMessage {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface CreateContactMessageData {
  first_name: string;
  last_name: string;
  email: string;
  subject: string;
  message: string;
}

export interface TrialRequest {
  id: number;
  company_name: string;
  industry: string;
  company_size: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message?: string;
  status: string;
  created_at: string;
}

export interface CreateTrialRequestData {
  companyName: string;
  industry: string;
  companySize: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message?: string;
}

export const contactApi = {
  // Créer un nouveau message de contact
  createMessage: async (messageData: CreateContactMessageData): Promise<ContactMessage> => {
    const response = await apiClient.post('/contact/messages/', messageData);
    return response.data;
  },

  // Créer une demande d'essai gratuit
  createTrialRequest: async (trialData: CreateTrialRequestData): Promise<{ success: boolean; message: string; data: TrialRequest }> => {
    const response = await apiClient.post('/contact/trial/', {
      company_name: trialData.companyName,
      industry: trialData.industry,
      company_size: trialData.companySize,
      first_name: trialData.firstName,
      last_name: trialData.lastName,
      email: trialData.email,
      phone: trialData.phone,
      message: trialData.message,
    });
    return response.data;
  },
};