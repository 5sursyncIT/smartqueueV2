import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Agent, CreateAgentDto, InviteAgentDto } from '@/lib/types/resources';

const buildTenantUrl = (tenantSlug: string, path: string) => {
  return `/tenants/${tenantSlug}${path}`;
};

export const agentKeys = {
  all: (tenantSlug: string) => ['agents', tenantSlug] as const,
  list: (tenantSlug: string, filters?: Record<string, any>) =>
    [...agentKeys.all(tenantSlug), 'list', filters] as const,
  detail: (tenantSlug: string, id: string) =>
    [...agentKeys.all(tenantSlug), 'detail', id] as const,
};

export function useAgents(filters?: Record<string, any>) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: agentKeys.list(currentTenant?.slug || '', filters),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, '/agents/');
      const response = await apiClient.get<Agent[]>(url, { params: filters });
      return response.data;
    },
    enabled: !!currentTenant,
  });
}

export function useAgent(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: agentKeys.detail(currentTenant?.slug || '', id),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, `/agents/${id}/`);
      const response = await apiClient.get<Agent>(url);
      return response.data;
    },
    enabled: !!currentTenant && !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: CreateAgentDto) => {
      const url = buildTenantUrl(currentTenant!.slug, '/agents/');
      const response = await apiClient.post<Agent>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agentKeys.all(currentTenant!.slug),
      });
    },
  });
}

export function useUpdateAgent(id: string) {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: Partial<CreateAgentDto>) => {
      const url = buildTenantUrl(currentTenant!.slug, `/agents/${id}/`);
      const response = await apiClient.patch<Agent>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agentKeys.all(currentTenant!.slug),
      });
      queryClient.invalidateQueries({
        queryKey: agentKeys.detail(currentTenant!.slug, id),
      });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/agents/${id}/`);
      await apiClient.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agentKeys.all(currentTenant!.slug),
      });
    },
  });
}

export function useInviteAgent() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: InviteAgentDto) => {
      const url = buildTenantUrl(currentTenant!.slug, '/agents/invite/');
      const response = await apiClient.post<Agent>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agentKeys.all(currentTenant!.slug),
      });
    },
  });
}

// Agent actions for self-service
export function useSetAgentStatus() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (status: 'available' | 'busy' | 'paused') => {
      const url = buildTenantUrl(currentTenant!.slug, '/agent-status/set_status/');
      const response = await apiClient.post(url, { status: status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: agentKeys.all(currentTenant!.slug),
      });
    },
  });
}

export function useCallNextTicket() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (queueId?: string) => {
      const url = buildTenantUrl(currentTenant!.slug, '/agent-status/call_next/');
      const response = await apiClient.post(url, queueId ? { queue_id: queueId } : {});
      return response.data;
    },
    onSuccess: () => {
      // Invalidate tickets queries to refresh the list
      queryClient.invalidateQueries({
        queryKey: ['tickets', currentTenant!.slug],
      });
    },
  });
}
