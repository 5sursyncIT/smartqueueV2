import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildTenantUrl } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';

// Types
export interface Ticket {
  id: string;
  queue: {
    id: string;
    name: string;
    service: {
      id: string;
      name: string;
    };
    site: {
      id: string;
      name: string;
    };
  };
  number: string;
  channel: 'web' | 'app' | 'qr' | 'whatsapp' | 'kiosk';
  priority: number;
  status: 'en_attente' | 'appele' | 'en_service' | 'pause' | 'transfere' | 'clos' | 'no_show';
  eta_seconds: number | null;
  wait_time_seconds: number | null;
  agent: {
    id: string;
    user: {
      first_name: string;
      last_name: string;
      email: string;
    };
  } | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  } | null;
  customer_name: string;
  customer_phone: string;
  called_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketDto {
  queue_id: string;
  channel: 'web' | 'app' | 'qr' | 'whatsapp' | 'kiosk';
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  priority?: number;
}

export interface TicketStats {
  waiting: number;
  called: number;
  in_service: number;
  paused: number;
  completed_today: number;
  total_today: number;
}

// Query Keys
export const ticketKeys = {
  all: (tenantSlug: string) => ['tickets', tenantSlug] as const,
  lists: (tenantSlug: string) => [...ticketKeys.all(tenantSlug), 'list'] as const,
  list: (tenantSlug: string, filters?: Record<string, any>) =>
    [...ticketKeys.lists(tenantSlug), filters] as const,
  details: (tenantSlug: string) => [...ticketKeys.all(tenantSlug), 'detail'] as const,
  detail: (tenantSlug: string, id: string) => [...ticketKeys.details(tenantSlug), id] as const,
  stats: (tenantSlug: string) => [...ticketKeys.all(tenantSlug), 'stats'] as const,
};

// Hooks
export function useTickets(filters?: Record<string, any>) {
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const tenantSlug = currentTenant?.slug || '';

  const enabled = !!tenantSlug && filters !== undefined;
  console.log('[useTickets] Hook called:', {
    tenantSlug,
    filters,
    enabled,
    currentTenant: currentTenant?.slug,
  });

  return useQuery({
    queryKey: ticketKeys.list(tenantSlug, filters),
    queryFn: async () => {
      console.log('[useTickets] Fetching tickets...');
      const url = buildTenantUrl(tenantSlug, '/tickets/');
      console.log('[useTickets] URL:', url, 'Params:', filters);
      try {
        const response = await apiClient.get<Ticket[]>(url, { params: filters });
        console.log('[useTickets] Success:', response.data.length, 'tickets');
        return response.data;
      } catch (error) {
        console.error('[useTickets] Error:', error);
        throw error;
      }
    },
    enabled,
  });
}

export function useTicket(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const tenantSlug = currentTenant?.slug || '';

  return useQuery({
    queryKey: ticketKeys.detail(tenantSlug, id),
    queryFn: async () => {
      const url = buildTenantUrl(tenantSlug, `/tickets/${id}/`);
      const response = await apiClient.get<Ticket>(url);
      return response.data;
    },
    enabled: !!tenantSlug && !!id,
  });
}

export function useTicketStats() {
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const tenantSlug = currentTenant?.slug || '';

  return useQuery({
    queryKey: ticketKeys.stats(tenantSlug),
    queryFn: async () => {
      const url = buildTenantUrl(tenantSlug, '/tickets/');
      const response = await apiClient.get<Ticket[]>(url);
      const tickets = response.data;

      // Calculer les stats à partir des données
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats: TicketStats = {
        waiting: tickets.filter((t) => t.status === 'en_attente').length,
        called: tickets.filter((t) => t.status === 'appele').length,
        in_service: tickets.filter((t) => t.status === 'en_service').length,
        paused: tickets.filter((t) => t.status === 'pause').length,
        completed_today: tickets.filter((t) => {
          if (t.status !== 'clos') return false;
          const createdAt = new Date(t.created_at);
          return createdAt >= today;
        }).length,
        total_today: tickets.filter((t) => {
          const createdAt = new Date(t.created_at);
          return createdAt >= today;
        }).length,
      };

      return stats;
    },
    enabled: !!tenantSlug,
    refetchInterval: 10000, // Rafraîchir toutes les 10 secondes
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const tenantSlug = currentTenant?.slug || '';

  return useMutation({
    mutationFn: async (data: CreateTicketDto) => {
      const url = buildTenantUrl(tenantSlug, '/tickets/');

      // Nettoyer les valeurs vides pour éviter les erreurs de validation
      const cleanData: any = {
        queue_id: data.queue_id,
        channel: data.channel,
      };

      if (data.customer_name && data.customer_name.trim()) {
        cleanData.customer_name = data.customer_name.trim();
      }

      if (data.customer_phone && data.customer_phone.trim()) {
        cleanData.customer_phone = data.customer_phone.trim();
      }

      if (data.customer_id) {
        cleanData.customer_id = data.customer_id;
      }

      if (data.priority !== undefined && data.priority !== null) {
        cleanData.priority = data.priority;
      }

      console.log('[Create Ticket] Sending payload:', cleanData);
      const response = await apiClient.post<Ticket>(url, cleanData);
      console.log('[Create Ticket] Response:', response.data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists(tenantSlug) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats(tenantSlug) });
    },
  });
}

export function useCallTicket() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const tenantSlug = currentTenant?.slug || '';

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const url = buildTenantUrl(tenantSlug, `/tickets/${ticketId}/call/`);
      const response = await apiClient.post<Ticket>(url);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists(tenantSlug) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats(tenantSlug) });
    },
  });
}

export function useCloseTicket() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const tenantSlug = currentTenant?.slug || '';

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const url = buildTenantUrl(tenantSlug, `/tickets/${ticketId}/close/`);
      const response = await apiClient.post<Ticket>(url);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists(tenantSlug) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats(tenantSlug) });
    },
  });
}

export function useTransferTicket() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const tenantSlug = currentTenant?.slug || '';

  return useMutation({
    mutationFn: async ({ ticketId, queueId, reason }: { ticketId: string; queueId: string; reason?: string }) => {
      const url = buildTenantUrl(tenantSlug, `/tickets/${ticketId}/transfer/`);
      const response = await apiClient.post<Ticket>(url, { queue_id: queueId, reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists(tenantSlug) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats(tenantSlug) });
    },
  });
}

export function useStartService() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const tenantSlug = currentTenant?.slug || '';

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const url = buildTenantUrl(tenantSlug, `/tickets/${ticketId}/start_service/`);
      const response = await apiClient.post<Ticket>(url);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketKeys.lists(tenantSlug) });
      queryClient.invalidateQueries({ queryKey: ticketKeys.stats(tenantSlug) });
    },
  });
}
