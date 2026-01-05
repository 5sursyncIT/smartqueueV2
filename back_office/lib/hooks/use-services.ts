import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { Service, CreateServiceDto } from '@/lib/types/resources';

const buildTenantUrl = (tenantSlug: string, path: string) => {
  return `/tenants/${tenantSlug}${path}`;
};

export const serviceKeys = {
  all: (tenantSlug: string) => ['services', tenantSlug] as const,
  list: (tenantSlug: string, filters?: Record<string, any>) =>
    [...serviceKeys.all(tenantSlug), 'list', filters] as const,
  detail: (tenantSlug: string, id: string) =>
    [...serviceKeys.all(tenantSlug), 'detail', id] as const,
};

export function useServices(filters?: Record<string, any>) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: serviceKeys.list(currentTenant?.slug || '', filters),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, '/queues/services/');
      const response = await apiClient.get<Service[]>(url, { params: filters });
      return response.data;
    },
    enabled: !!currentTenant,
  });
}

export function useService(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: serviceKeys.detail(currentTenant?.slug || '', id),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/services/${id}/`);
      const response = await apiClient.get<Service>(url);
      return response.data;
    },
    enabled: !!currentTenant && !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: CreateServiceDto) => {
      const url = buildTenantUrl(currentTenant!.slug, '/queues/services/');
      const response = await apiClient.post<Service>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.all(currentTenant!.slug),
      });
    },
  });
}

export function useUpdateService(id: string) {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: Partial<CreateServiceDto>) => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/services/${id}/`);
      const response = await apiClient.patch<Service>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.all(currentTenant!.slug),
      });
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(currentTenant!.slug, id),
      });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/queues/services/${id}/`);
      await apiClient.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: serviceKeys.all(currentTenant!.slug),
      });
    },
  });
}
