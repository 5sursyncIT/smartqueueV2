import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

// Types
export interface Invoice {
  id: string;
  invoice_number: string;
  tenant: string;
  tenant_name: string;
  tenant_slug: string;
  subscription: string | null;
  payment: string | null;
  payment_status: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  notes: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  tenant: string;
  tenant_name: string;
  tenant_slug: string;
  subscription: string | null;
  amount: number;
  currency: string;
  payment_method: 'orange_money' | 'wave' | 'free_money' | 'emoney' | 'yoomee' | 'mtn' | 'moov' | 'card' | 'bank_transfer';
  transaction_id: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  failure_reason: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BillingStats {
  total_revenue: number;
  pending_amount: number;
  paid_count: number;
  pending_count: number;
  failed_count: number;
  refunded_count: number;
  overdue_count: number;
  payment_method_stats: Record<string, number>;
  monthly_revenue: Array<{
    month: string;
    revenue: number;
    count: number;
  }>;
}

// API functions
const billingApi = {
  // Invoices
  listInvoices: async (params?: {
    status?: string;
    search?: string;
    tenant_slug?: string;
  }): Promise<Invoice[]> => {
    const response = await apiClient.get('/admin/invoices/', { params });
    return response.data;
  },

  getInvoice: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get(`/admin/invoices/${id}/`);
    return response.data;
  },

  downloadInvoicePDF: async (id: string): Promise<Blob> => {
    const response = await apiClient.get(`/admin/invoices/${id}/download/`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Payments
  listPayments: async (params?: {
    status?: string;
    search?: string;
    tenant_slug?: string;
    payment_method?: string;
  }): Promise<Payment[]> => {
    const response = await apiClient.get('/admin/transactions/', { params });
    return response.data;
  },

  getPayment: async (id: string): Promise<Payment> => {
    const response = await apiClient.get(`/admin/transactions/${id}/`);
    return response.data;
  },

  // Stats
  getStats: async (): Promise<BillingStats> => {
    const response = await apiClient.get('/admin/invoices/stats/');
    return response.data;
  },
};

// React Query hooks
export const useInvoices = (params?: {
  status?: string;
  search?: string;
  tenant_slug?: string;
}) => {
  return useQuery({
    queryKey: ['admin', 'invoices', params],
    queryFn: () => billingApi.listInvoices(params),
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'invoices', id],
    queryFn: () => billingApi.getInvoice(id),
    enabled: !!id,
  });
};

export const usePayments = (params?: {
  status?: string;
  search?: string;
  tenant_slug?: string;
  payment_method?: string;
}) => {
  return useQuery({
    queryKey: ['admin', 'payments', params],
    queryFn: () => billingApi.listPayments(params),
  });
};

export const usePayment = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'payments', id],
    queryFn: () => billingApi.getPayment(id),
    enabled: !!id,
  });
};

export const useBillingStats = () => {
  return useQuery({
    queryKey: ['admin', 'billing', 'stats'],
    queryFn: billingApi.getStats,
  });
};

export const useDownloadInvoice = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const blob = await billingApi.downloadInvoicePDF(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `facture-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
  });
};
