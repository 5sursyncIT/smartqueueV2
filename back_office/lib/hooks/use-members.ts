import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { TenantMembership } from '@/lib/types';

const buildTenantUrl = (tenantSlug: string, path: string) => {
  return `/tenants/${tenantSlug}${path}`;
};

export interface InviteMemberDto {
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'agent';
}

export const memberKeys = {
  all: (tenantSlug: string) => ['members', tenantSlug] as const,
  list: (tenantSlug: string, filters?: Record<string, any>) =>
    [...memberKeys.all(tenantSlug), 'list', filters] as const,
  detail: (tenantSlug: string, id: string) =>
    [...memberKeys.all(tenantSlug), 'detail', id] as const,
};

export function useMembers(filters?: Record<string, any>) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: memberKeys.list(currentTenant?.slug || '', filters),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, '/members/');
      const response = await apiClient.get<TenantMembership[]>(url, { params: filters });
      return response.data;
    },
    enabled: !!currentTenant,
  });
}

export function useMember(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: memberKeys.detail(currentTenant?.slug || '', id),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, `/members/${id}/`);
      const response = await apiClient.get<TenantMembership>(url);
      return response.data;
    },
    enabled: !!currentTenant && !!id,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: InviteMemberDto) => {
      const url = buildTenantUrl(currentTenant!.slug, '/members/');
      const response = await apiClient.post<TenantMembership>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.all(currentTenant!.slug),
      });
    },
  });
}

export function useUpdateMember(id: string) {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: Partial<InviteMemberDto>) => {
      const url = buildTenantUrl(currentTenant!.slug, `/members/${id}/`);
      const response = await apiClient.patch<TenantMembership>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.all(currentTenant!.slug),
      });
      queryClient.invalidateQueries({
        queryKey: memberKeys.detail(currentTenant!.slug, id),
      });
    },
  });
}

export function useDeactivateMember() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/members/${id}/deactivate/`);
      await apiClient.post(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.all(currentTenant!.slug),
      });
    },
  });
}

export function useActivateMember() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/members/${id}/activate/`);
      await apiClient.post(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: memberKeys.all(currentTenant!.slug),
      });
    },
  });
}
