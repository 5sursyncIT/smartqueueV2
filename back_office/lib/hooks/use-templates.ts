import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { NotificationTemplate, CreateNotificationTemplateDto } from '@/lib/types/resources';

const buildTenantUrl = (tenantSlug: string, path: string) => {
  return `/tenants/${tenantSlug}${path}`;
};

export const templateKeys = {
  all: (tenantSlug: string) => ['templates', tenantSlug] as const,
  list: (tenantSlug: string, filters?: Record<string, any>) =>
    [...templateKeys.all(tenantSlug), 'list', filters] as const,
  detail: (tenantSlug: string, id: string) =>
    [...templateKeys.all(tenantSlug), 'detail', id] as const,
};

export function useTemplates(filters?: Record<string, any>) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: templateKeys.list(currentTenant?.slug || '', filters),
    queryFn: async () => {
      // TODO: Backend endpoint /notifications/templates/ doesn't exist yet
      // Return empty array for now
      return [];
    },
    enabled: false, // Disable until backend endpoint is created
  });
}

export function useTemplate(id: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: templateKeys.detail(currentTenant?.slug || '', id),
    queryFn: async () => {
      const url = buildTenantUrl(currentTenant!.slug, `/notifications/templates/${id}/`);
      const response = await apiClient.get<NotificationTemplate>(url);
      return response.data;
    },
    enabled: !!currentTenant && !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: CreateNotificationTemplateDto) => {
      const url = buildTenantUrl(currentTenant!.slug, '/notifications/templates/');
      const response = await apiClient.post<NotificationTemplate>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateKeys.all(currentTenant!.slug),
      });
    },
  });
}

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (data: Partial<CreateNotificationTemplateDto>) => {
      const url = buildTenantUrl(currentTenant!.slug, `/notifications/templates/${id}/`);
      const response = await apiClient.patch<NotificationTemplate>(url, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateKeys.all(currentTenant!.slug),
      });
      queryClient.invalidateQueries({
        queryKey: templateKeys.detail(currentTenant!.slug, id),
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useMutation({
    mutationFn: async (id: string) => {
      const url = buildTenantUrl(currentTenant!.slug, `/notifications/templates/${id}/`);
      await apiClient.delete(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: templateKeys.all(currentTenant!.slug),
      });
    },
  });
}
