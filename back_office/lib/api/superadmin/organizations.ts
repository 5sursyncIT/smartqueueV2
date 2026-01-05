import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

// Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string;
  email: string;
  address: string;
  timezone: string;
  is_active: boolean;
  subscription_status: 'active' | 'trial' | 'expired' | 'cancelled';
  subscription_plan: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  total_agents: number;
  total_sites: number;
  total_tickets_this_month: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationStats {
  total_organizations: number;
  active_organizations: number;
  trial_organizations: number;
  expired_organizations: number;
  total_agents: number;
  total_sites: number;
  total_tickets_this_month: number;
}

export interface OrganizationsFilters {
  status?: string;
  plan?: string;
  search?: string;
}

// API functions
const organizationsApi = {
  list: async (filters?: OrganizationsFilters): Promise<Organization[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.plan) params.append('plan', filters.plan);
    if (filters?.search) params.append('search', filters.search);

    const response = await apiClient.get(`/admin/organizations/?${params.toString()}`);
    return response.data;
  },

  stats: async (): Promise<OrganizationStats> => {
    const response = await apiClient.get('/admin/organizations/stats/');
    return response.data;
  },

  get: async (slug: string): Promise<Organization> => {
    const response = await apiClient.get(`/admin/organizations/${slug}/`);
    return response.data;
  },

  suspend: async (slug: string): Promise<void> => {
    await apiClient.post(`/admin/organizations/${slug}/suspend/`);
  },

  activate: async (slug: string): Promise<void> => {
    await apiClient.post(`/admin/organizations/${slug}/activate/`);
  },

  delete: async (slug: string): Promise<void> => {
    await apiClient.delete(`/admin/organizations/${slug}/`);
  },
};

// React Query hooks
export const useOrganizations = (filters?: OrganizationsFilters) => {
  return useQuery({
    queryKey: ['admin', 'organizations', filters],
    queryFn: () => organizationsApi.list(filters),
  });
};

export const useOrganizationsStats = () => {
  return useQuery({
    queryKey: ['admin', 'organizations', 'stats'],
    queryFn: organizationsApi.stats,
  });
};

export const useOrganization = (slug: string) => {
  return useQuery({
    queryKey: ['admin', 'organizations', slug],
    queryFn: () => organizationsApi.get(slug),
    enabled: !!slug,
  });
};

export const useSuspendOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationsApi.suspend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
  });
};

export const useActivateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationsApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
    },
  });
};
