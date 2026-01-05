import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
export interface Organization {
  id: string;
  name: string;
  slug: string;
  company_name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  plan: 'trial' | 'starter' | 'business' | 'enterprise';
  max_sites: number;
  max_agents: number;
  max_queues: number;
  locale: string;
  timezone: string;
  data_retention_days: number;
  is_active: boolean;
  trial_ends_at: string | null;
  suspended_at: string | null;
  suspension_reason: string;
  created_at: string;
  updated_at: string;
  // Métriques
  members_count: number;
  sites_count: number;
  agents_count: number;
  queues_count: number;
  subscription_status: {
    status: string;
    plan: string;
    is_trial: boolean;
    current_period_end: string | null;
  } | null;
  subscription?: {
    id: string;
    status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled';
    plan_name: string;
    billing_period: 'monthly' | 'yearly';
    amount: number;
    current_period_end: string | null;
    trial_ends_at: string | null;
    cancelled_at: string | null;
  };
}

export interface CreateOrganizationDto {
  name: string;
  slug: string;
  company_name?: string;
  email?: string;
  phone?: string;
  plan?: 'trial' | 'starter' | 'business' | 'enterprise';
  admin_email: string;
  admin_first_name?: string;
  admin_last_name?: string;
  admin_password?: string;
}

export interface OrganizationStats {
  members: number;
  sites: number;
  queues: number;
  agents: number;
  tickets_total: number;
  tickets_pending: number;
  tickets_completed_today: number;
}

// Query Keys
export const orgKeys = {
  all: ['superadmin', 'organizations'] as const,
  lists: () => [...orgKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...orgKeys.lists(), filters] as const,
  details: () => [...orgKeys.all, 'detail'] as const,
  detail: (slug: string) => [...orgKeys.details(), slug] as const,
  stats: (slug: string) => [...orgKeys.detail(slug), 'stats'] as const,
};

// Hooks
export function useOrganizations(filters?: Record<string, any>) {
  return useQuery({
    queryKey: orgKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<Organization[]>('/admin/organizations/', {
        params: filters,
      });
      return response.data;
    },
  });
}

export function useOrganization(slug: string) {
  return useQuery({
    queryKey: orgKeys.detail(slug),
    queryFn: async () => {
      const response = await apiClient.get<Organization>(`/admin/organizations/${slug}/`);
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useOrganizationStats(slug: string) {
  return useQuery({
    queryKey: orgKeys.stats(slug),
    queryFn: async () => {
      const response = await apiClient.get<OrganizationStats>(
        `/admin/organizations/${slug}/stats/`
      );
      return response.data;
    },
    enabled: !!slug,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrganizationDto) => {
      const response = await apiClient.post<{
        tenant: Organization;
        subscription: any;
        admin_created: boolean;
      }>('/admin/organizations/create_with_admin/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
    },
  });
}

export function useUpdateOrganization(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Organization>) => {
      const response = await apiClient.patch<Organization>(
        `/admin/organizations/${slug}/`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orgKeys.detail(slug) });
    },
  });
}

export function useSuspendOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ slug, reason }: { slug: string; reason: string }) => {
      const response = await apiClient.post<Organization>(
        `/admin/organizations/${slug}/suspend/`,
        { reason }
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orgKeys.detail(variables.slug) });
    },
  });
}

export function useActivateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slug: string) => {
      const response = await apiClient.post<Organization>(
        `/admin/organizations/${slug}/activate/`
      );
      return response.data;
    },
    onSuccess: (_, slug) => {
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orgKeys.detail(slug) });
    },
  });
}

// Subscriptions
export interface Subscription {
  id: string;
  tenant: string;
  tenant_name: string;
  tenant_slug: string;
  plan: string;
  status: string;
  billing_cycle: string;
  monthly_price: number;
  monthly_price_display: string;
  currency: string;
  starts_at: string;
  current_period_start: string;
  current_period_end: string | null;
  trial_ends_at: string | null;
  cancelled_at: string | null;
  ends_at: string | null;
  external_subscription_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const subscriptionKeys = {
  all: ['superadmin', 'subscriptions'] as const,
  lists: () => [...subscriptionKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...subscriptionKeys.lists(), filters] as const,
  detail: (id: string) => [...subscriptionKeys.all, 'detail', id] as const,
};

export function useSubscriptions(filters?: Record<string, any>) {
  return useQuery({
    queryKey: subscriptionKeys.list(filters),
    queryFn: async () => {
      const response = await apiClient.get<Subscription[]>('/admin/subscriptions/', {
        params: filters,
      });
      return response.data;
    },
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, plan }: { id: string; plan: string }) => {
      const response = await apiClient.post<Subscription>(
        `/admin/subscriptions/${id}/change_plan/`,
        { plan }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: orgKeys.lists() });
    },
  });
}

// Analytics
export interface PlatformAnalytics {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
  total_agents: number;
  total_sites: number;
  total_tickets_today: number;
  total_tickets_month: number;
  avg_wait_time_minutes: number;
  revenue_month: number;
  revenue_growth: number;
  organization_growth: OrganizationGrowthData[];
  top_organizations: TopOrganizationData[];
}

export interface OrganizationGrowthData {
  month: string;
  count: number;
}

export interface TopOrganizationData {
  name: string;
  tickets_count: number;
  revenue: number;
  growth: number;
}

export const analyticsKeys = {
  all: ['superadmin', 'analytics'] as const,
  analytics: (timeRange?: string) => [...analyticsKeys.all, timeRange] as const,
};

export function usePlatformAnalytics(timeRange: string = '30d') {
  return useQuery({
    queryKey: analyticsKeys.analytics(timeRange),
    queryFn: async () => {
      const response = await apiClient.get<PlatformAnalytics>(
        '/admin/organizations/analytics/',
        {
          params: { time_range: timeRange },
        }
      );
      return response.data;
    },
  });
}

// Monitoring
export interface SystemMetrics {
  cpu_usage: number;
  memory_used: number;
  memory_total: number;
  disk_used: number;
  disk_total: number;
  network_in: number;
  network_out: number;
  uptime_days: number;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time: number;
  uptime: number;
  last_check: string;
}

export interface DatabaseMetrics {
  active_connections: number;
  total_connections: number;
  max_connections: number;
}

export interface MonitoringData {
  metrics: SystemMetrics;
  services: ServiceStatus[];
  database: DatabaseMetrics;
}

export const monitoringKeys = {
  all: ['superadmin', 'monitoring'] as const,
  data: () => [...monitoringKeys.all, 'data'] as const,
};

export function useMonitoring(refreshInterval: number = 30000) {
  return useQuery({
    queryKey: monitoringKeys.data(),
    queryFn: async () => {
      const response = await apiClient.get<MonitoringData>(
        '/admin/organizations/monitoring/'
      );
      return response.data;
    },
    refetchInterval: refreshInterval, // Auto-refresh toutes les 30 secondes
  });
}

// Dashboard
export interface DashboardAlert {
  id: string;
  title: string;
  description: string;
  severity: 'urgent' | 'warning' | 'info';
  action?: string;
  link?: string;
}

export interface DashboardData {
  mrr: number;
  mrr_growth: number;
  total_organizations: number;
  active_organizations: number;
  orgs_this_month: number;
  total_users: number;
  total_agents: number;
  churn_rate: number;
  churn_growth: number;
  tickets_today: number;
  tickets_month: number;
  avg_wait_time_minutes: number;
  satisfaction_rate: number;
  satisfaction_count: number;
  uptime_percentage: number;
  alerts: DashboardAlert[];
}

export const dashboardKeys = {
  all: ['superadmin', 'dashboard'] as const,
  data: () => [...dashboardKeys.all, 'data'] as const,
};

export function useDashboard(refreshInterval: number = 60000) {
  return useQuery({
    queryKey: dashboardKeys.data(),
    queryFn: async () => {
      const response = await apiClient.get<DashboardData>(
        '/admin/organizations/dashboard/'
      );
      return response.data;
    },
    refetchInterval: refreshInterval, // Auto-refresh toutes les 60 secondes
  });
}
