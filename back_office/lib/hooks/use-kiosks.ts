import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildTenantUrl } from '@/lib/api/client';
import type { Kiosk, CreateKioskDto, UpdateKioskDto } from '@/lib/types/resources';
import { useAuthStore } from '@/lib/stores/auth-store';

// Query keys
export const kioskKeys = {
  all: (tenantSlug: string) => ['kiosks', tenantSlug] as const,
  lists: (tenantSlug: string) => ['kiosks', tenantSlug, 'list'] as const,
  list: (tenantSlug: string, filters?: Record<string, any>) => ['kiosks', tenantSlug, 'list', filters] as const,
  details: (tenantSlug: string) => ['kiosks', tenantSlug, 'detail'] as const,
  detail: (tenantSlug: string, id: string) => ['kiosks', tenantSlug, 'detail', id] as const,
  active: (tenantSlug: string) => ['kiosks', tenantSlug, 'active'] as const,
};

// Fetch kiosks list
export function useKiosks(filters?: Record<string, any>) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: kioskKeys.list(currentTenant?.slug || '', filters),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, '/kiosks/');
      const response = await apiClient.get<Kiosk[]>(url, { params: filters });
      return response.data;
    },
    enabled: !!currentTenant,
  });
}

// Fetch active kiosks only
export function useActiveKiosks() {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: kioskKeys.active(currentTenant?.slug || ''),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, '/kiosks/active/');
      const response = await apiClient.get<Kiosk[]>(url);
      return response.data;
    },
    enabled: !!currentTenant,
  });
}

// Fetch single kiosk
export function useKiosk(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: kioskKeys.detail(currentTenant?.slug || '', id),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, `/kiosks/${id}/`);
      const response = await apiClient.get<Kiosk>(url);
      return response.data;
    },
    enabled: !!currentTenant && !!id,
  });
}

// Create kiosk
export function useCreateKiosk() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: CreateKioskDto) => {
      const url = buildTenantUrl(currentTenant!.slug, '/kiosks/');
      const response = await apiClient.post<Kiosk>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kioskKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: kioskKeys.active(currentTenant!.slug) });
    },
  });
}

// Update kiosk
export function useUpdateKiosk(id: string) {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: UpdateKioskDto) => {
      const url = buildTenantUrl(currentTenant!.slug, `/kiosks/${id}/`);
      const response = await apiClient.patch<Kiosk>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kioskKeys.detail(currentTenant!.slug, id) });
      queryClient.invalidateQueries({ queryKey: kioskKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: kioskKeys.active(currentTenant!.slug) });
    },
  });
}

// Delete kiosk
export function useDeleteKiosk() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/kiosks/${id}/`);
      await apiClient.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: kioskKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: kioskKeys.active(currentTenant!.slug) });
    },
  });
}

// Activate kiosk
export function useActivateKiosk() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/kiosks/${id}/activate/`);
      const response = await apiClient.post(url);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: kioskKeys.detail(currentTenant!.slug, id) });
      queryClient.invalidateQueries({ queryKey: kioskKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: kioskKeys.active(currentTenant!.slug) });
    },
  });
}

// Deactivate kiosk
export function useDeactivateKiosk() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/kiosks/${id}/deactivate/`);
      const response = await apiClient.post(url);
      return response.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: kioskKeys.detail(currentTenant!.slug, id) });
      queryClient.invalidateQueries({ queryKey: kioskKeys.lists(currentTenant!.slug) });
      queryClient.invalidateQueries({ queryKey: kioskKeys.active(currentTenant!.slug) });
    },
  });
}
