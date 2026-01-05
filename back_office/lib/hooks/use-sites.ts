import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildTenantUrl } from '@/lib/api/client';
import type { Site, CreateSiteDto, UpdateSiteDto } from '@/lib/types/resources';
import { useAuthStore } from '@/lib/stores/auth-store';

// Query keys
export const siteKeys = {
  all: (tenantSlug: string) => ['sites', tenantSlug] as const,
  lists: (tenantSlug: string) => ['sites', tenantSlug, 'list'] as const,
  list: (tenantSlug: string, filters?: Record<string, any>) => ['sites', tenantSlug, 'list', filters] as const,
  details: (tenantSlug: string) => ['sites', tenantSlug, 'detail'] as const,
  detail: (tenantSlug: string, id: string) => ['sites', tenantSlug, 'detail', id] as const,
};

// Fetch sites list
export function useSites(filters?: Record<string, any>) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: siteKeys.list(currentTenant?.slug || '', filters),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, '/queues/sites/');
      const response = await apiClient.get<Site[]>(url, { params: filters });
      return response.data;
    },
    enabled: !!currentTenant,
  });
}

// Fetch single site
export function useSite(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: siteKeys.detail(currentTenant?.slug || '', id),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/sites/${id}/`);
      const response = await apiClient.get<Site>(url);
      return response.data;
    },
    enabled: !!currentTenant && !!id,
  });
}

// Create site
export function useCreateSite() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: CreateSiteDto) => {
      const url = buildTenantUrl(currentTenant!.slug, '/queues/sites/');
      const response = await apiClient.post<Site>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists(currentTenant!.slug) });
      // Invalider aussi les queues car elles contiennent les sites
      queryClient.invalidateQueries({ queryKey: ['queues', currentTenant!.slug] });
    },
  });
}

// Update site
export function useUpdateSite(id: string) {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: UpdateSiteDto) => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/sites/${id}/`);
      const response = await apiClient.patch<Site>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.detail(currentTenant!.slug, id) });
      queryClient.invalidateQueries({ queryKey: siteKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: ['queues', currentTenant!.slug] });
    },
  });
}

// Delete site
export function useDeleteSite() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/sites/${id}/`);
      await apiClient.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: siteKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: ['queues', currentTenant!.slug] });
    },
  });
}
