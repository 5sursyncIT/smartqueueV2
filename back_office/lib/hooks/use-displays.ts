import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildTenantUrl } from '@/lib/api/client';
import type { Display, CreateDisplayDto, UpdateDisplayDto } from '@/lib/types/resources';
import { useAuthStore } from '@/lib/stores/auth-store';

// Query keys
export const displayKeys = {
  all: (tenantSlug: string) => ['displays', tenantSlug] as const,
  lists: (tenantSlug: string) => ['displays', tenantSlug, 'list'] as const,
  list: (tenantSlug: string, filters?: Record<string, any>) => ['displays', tenantSlug, 'list', filters] as const,
  details: (tenantSlug: string) => ['displays', tenantSlug, 'detail'] as const,
  detail: (tenantSlug: string, id: string) => ['displays', tenantSlug, 'detail', id] as const,
  active: (tenantSlug: string) => ['displays', tenantSlug, 'active'] as const,
};

// Fetch displays list
export function useDisplays(filters?: Record<string, any>) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: displayKeys.list(currentTenant?.slug || '', filters),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, '/displays/');
      const response = await apiClient.get<Display[]>(url, { params: filters });
      return response.data;
    },
    enabled: !!currentTenant,
  });
}

// Fetch active displays only
export function useActiveDisplays() {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: displayKeys.active(currentTenant?.slug || ''),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, '/displays/active/');
      const response = await apiClient.get<Display[]>(url);
      return response.data;
    },
    enabled: !!currentTenant,
  });
}

// Fetch single display
export function useDisplay(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: displayKeys.detail(currentTenant?.slug || '', id),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, `/displays/${id}/`);
      const response = await apiClient.get<Display>(url);
      return response.data;
    },
    enabled: !!currentTenant && !!id,
  });
}

// Create display
export function useCreateDisplay() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: CreateDisplayDto) => {
      const url = buildTenantUrl(currentTenant!.slug, '/displays/');
      const response = await apiClient.post<Display>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: displayKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: displayKeys.active(currentTenant!.slug) });
    },
  });
}

// Update display
export function useUpdateDisplay(id: string) {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: UpdateDisplayDto) => {
      const url = buildTenantUrl(currentTenant!.slug, `/displays/${id}/`);
      const response = await apiClient.patch<Display>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: displayKeys.detail(currentTenant!.slug, id) });
      queryClient.invalidateQueries({ queryKey: displayKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: displayKeys.active(currentTenant!.slug) });
    },
  });
}

// Delete display
export function useDeleteDisplay() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/displays/${id}/`);
      await apiClient.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: displayKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: displayKeys.active(currentTenant!.slug) });
    },
  });
}

// Activate display
export function useActivateDisplay() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/displays/${id}/activate/`);
      const response = await apiClient.post(url);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: displayKeys.detail(currentTenant!.slug, id) });
      queryClient.invalidateQueries({ queryKey: displayKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: displayKeys.active(currentTenant!.slug) });
    },
  });
}

// Deactivate display
export function useDeactivateDisplay() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/displays/${id}/deactivate/`);
      const response = await apiClient.post(url);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: displayKeys.detail(currentTenant!.slug, id) });
      queryClient.invalidateQueries({ queryKey: displayKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: displayKeys.active(currentTenant!.slug) });
    },
  });
}
