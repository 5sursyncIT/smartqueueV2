import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

// Types
export interface Transaction {
  id: string;
  tenant: string;
  tenant_name: string;
  tenant_slug: string;
  amount: number;
  amount_display: string;
  currency: string;
  transaction_id: string;
  payment_method: string;
  payment_method_name: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TransactionStats {
  total_transactions: number;
  total_revenue: number;
  success_rate: number;
  pending_amount: number;
  completed_amount: number;
  failed_amount: number;
  payment_method_breakdown: {
    method: string;
    method_name: string;
    count: number;
    total_amount: number;
  }[];
}

export interface TransactionsFilters {
  status?: string;
  payment_method?: string;
  tenant?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// API functions
const transactionsApi = {
  list: async (filters?: TransactionsFilters): Promise<Transaction[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.payment_method) params.append('payment_method', filters.payment_method);
    if (filters?.tenant) params.append('tenant', filters.tenant);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get(`/admin/transactions/?${params.toString()}`);
    return response.data;
  },

  stats: async (filters?: TransactionsFilters): Promise<TransactionStats> => {
    const params = new URLSearchParams();
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const response = await apiClient.get(`/admin/transactions/stats/?${params.toString()}`);
    return response.data;
  },

  get: async (id: string): Promise<Transaction> => {
    const response = await apiClient.get(`/admin/transactions/${id}/`);
    return response.data;
  },
};

// React Query hooks
export const useTransactions = (filters?: TransactionsFilters) => {
  return useQuery({
    queryKey: ['admin', 'transactions', filters],
    queryFn: () => transactionsApi.list(filters),
  });
};

export const useTransactionsStats = (filters?: TransactionsFilters) => {
  return useQuery({
    queryKey: ['admin', 'transactions', 'stats', filters],
    queryFn: () => transactionsApi.stats(filters),
  });
};

export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'transactions', id],
    queryFn: () => transactionsApi.get(id),
    enabled: !!id,
  });
};
