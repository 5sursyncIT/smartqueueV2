import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

// Types
export interface Invoice {
  id: string;
  tenant: string;
  tenant_name: string;
  tenant_slug: string;
  subscription: string | null;
  invoice_number: string;
  subtotal: number;
  tax: number;
  total: number;
  total_display: string;
  amount_paid: number;
  amount_due_display: string;
  currency: string;
  invoice_date: string;
  due_date: string | null;
  paid_at: string | null;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  description: string;
  period_start: string | null;
  period_end: string | null;
  external_invoice_id: string;
  payment_method: string;
  payment_reference: string;
  pdf_url: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceStats {
  total_invoices: number;
  paid_invoices: number;
  pending_invoices: number;
  overdue_invoices: number;
  total_revenue: number;
  pending_amount: number;
  overdue_amount: number;
}

export interface InvoiceFilters {
  status?: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  status_type?: 'past' | 'upcoming' | 'pending';
  tenant?: string;
  currency?: string;
  start_date?: string;
  end_date?: string;
}

export interface MarkPaidInput {
  payment_method?: string;
  payment_reference?: string;
}

// API functions
const invoicesApi = {
  list: async (filters?: InvoiceFilters): Promise<Invoice[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
    }
    const response = await apiClient.get(`/admin/invoices/?${params.toString()}`);
    return response.data;
  },

  stats: async (): Promise<InvoiceStats> => {
    const response = await apiClient.get('/admin/invoices/stats/');
    return response.data;
  },

  get: async (id: string): Promise<Invoice> => {
    const response = await apiClient.get(`/admin/invoices/${id}/`);
    return response.data;
  },

  markPaid: async (id: string, data: MarkPaidInput): Promise<Invoice> => {
    const response = await apiClient.post(`/admin/invoices/${id}/mark_paid/`, data);
    return response.data;
  },
};

// React Query hooks
export const useInvoices = (filters?: InvoiceFilters) => {
  return useQuery({
    queryKey: ['admin', 'invoices', filters],
    queryFn: () => invoicesApi.list(filters),
  });
};

export const useInvoiceStats = () => {
  return useQuery({
    queryKey: ['admin', 'invoices', 'stats'],
    queryFn: invoicesApi.stats,
  });
};

export const useInvoice = (id: string) => {
  return useQuery({
    queryKey: ['admin', 'invoices', id],
    queryFn: () => invoicesApi.get(id),
    enabled: !!id,
  });
};

export const useMarkInvoicePaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MarkPaidInput }) =>
      invoicesApi.markPaid(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] });
    },
  });
};
