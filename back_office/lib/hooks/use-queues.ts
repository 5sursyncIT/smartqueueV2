import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildTenantUrl } from '@/lib/api/client';
import type { Queue, CreateQueueDto, UpdateQueueDto, PaginatedResponse } from '@/lib/types/resources';
import { useAuthStore } from '@/lib/stores/auth-store';

// Query keys
export const queueKeys = {
  all: (tenantSlug: string) => ['queues', tenantSlug] as const,
  lists: (tenantSlug: string) => ['queues', tenantSlug, 'list'] as const,
  list: (tenantSlug: string, filters?: Record<string, any>) => ['queues', tenantSlug, 'list', filters] as const,
  details: (tenantSlug: string) => ['queues', tenantSlug, 'detail'] as const,
  detail: (tenantSlug: string, id: string) => ['queues', tenantSlug, 'detail', id] as const,
  stats: (tenantSlug: string, id: string) => ['queues', tenantSlug, 'stats', id] as const,
};

// Fetch queues list
export function useQueues(filters?: Record<string, any>) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: queueKeys.list(currentTenant?.slug || '', filters),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, '/queues/');
      const response = await apiClient.get<Queue[]>(url, { params: filters });
      return response.data;
    },
    enabled: !!currentTenant,
  });
}

// Fetch single queue
export function useQueue(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: queueKeys.detail(currentTenant?.slug || '', id),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/${id}/`);
      const response = await apiClient.get<Queue>(url);
      return response.data;
    },
    enabled: !!currentTenant && !!id,
  });
}

// Fetch queue stats
export function useQueueStats(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: queueKeys.stats(currentTenant?.slug || '', id),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/${id}/stats/`);
      const response = await apiClient.get(url);
      return response.data;
    },
    enabled: !!currentTenant && !!id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

// Create queue
export function useCreateQueue() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: CreateQueueDto) => {
      const url = buildTenantUrl(currentTenant!.slug, '/queues/');
      const response = await apiClient.post<Queue>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists(currentTenant!.slug) });
    },
  });
}

// Update queue
export function useUpdateQueue(id: string) {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: UpdateQueueDto) => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/${id}/`);
      const response = await apiClient.patch<Queue>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.detail(currentTenant!.slug, id) });
      queryClient.invalidateQueries({ queryKey: queueKeys.lists(currentTenant!.slug) });
    },
  });
}

// Delete queue
export function useDeleteQueue() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/${id}/`);
      await apiClient.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists(currentTenant!.slug) });
    },
  });
}
