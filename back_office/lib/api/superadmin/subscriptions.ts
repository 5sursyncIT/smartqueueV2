import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

// Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthly_price: string; // Decimal string from backend
  yearly_price: string;  // Decimal string from backend
  currency: string;
  features: string[];
  max_sites: number | null;
  max_agents: number | null;
  max_queues: number | null;
  max_tickets_per_month: number | null;
  is_active: boolean;
  display_order: number;
  organizations_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlanStatistics {
  plan_id: string;
  plan_name: string;
  plan_slug: string;
  active_subscriptions: number;
  trial_subscriptions: number;
  total_subscriptions: number;
  monthly_revenue: number;
  price_monthly: number;
  price_yearly: number;
}

export interface SubscriptionPlansStats {
  total_plans: number;
  active_plans: number;
  total_monthly_revenue: number;
  plan_statistics: PlanStatistics[];
}

export interface CreateSubscriptionPlanInput {
  name: string;
  slug: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  currency?: string;
  features: string[];
  max_sites: number;
  max_agents: number;
  max_queues: number;
  max_tickets_per_month: number;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateSubscriptionPlanInput extends Partial<CreateSubscriptionPlanInput> {
  id: string;
}

// API functions
const subscriptionPlansApi = {
  list: async (): Promise<SubscriptionPlan[]> => {
    const response = await apiClient.get('/admin/subscription-plans/');
    return response.data;
  },

  stats: async (): Promise<SubscriptionPlansStats> => {
    const response = await apiClient.get('/admin/subscription-plans/stats/');
    return response.data;
  },

  get: async (slug: string): Promise<SubscriptionPlan> => {
    const response = await apiClient.get(`/admin/subscription-plans/${slug}/`);
    return response.data;
  },

  create: async (data: CreateSubscriptionPlanInput): Promise<SubscriptionPlan> => {
    const response = await apiClient.post('/admin/subscription-plans/', data);
    return response.data;
  },

  update: async ({ id, ...data }: UpdateSubscriptionPlanInput): Promise<SubscriptionPlan> => {
    const response = await apiClient.patch(`/admin/subscription-plans/${id}/`, data);
    return response.data;
  },

  delete: async (slug: string): Promise<void> => {
    await apiClient.delete(`/admin/subscription-plans/${slug}/`);
  },
};

// React Query hooks
export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['admin', 'subscription-plans'],
    queryFn: subscriptionPlansApi.list,
  });
};

export const useSubscriptionPlansStats = () => {
  return useQuery({
    queryKey: ['admin', 'subscription-plans', 'stats'],
    queryFn: subscriptionPlansApi.stats,
  });
};

export const useSubscriptionPlan = (slug: string) => {
  return useQuery({
    queryKey: ['admin', 'subscription-plans', slug],
    queryFn: () => subscriptionPlansApi.get(slug),
    enabled: !!slug,
  });
};

export const useCreateSubscriptionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: subscriptionPlansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
    },
  });
};

export const useUpdateSubscriptionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: subscriptionPlansApi.update,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans', variables.id] });
    },
  });
};

export const useDeleteSubscriptionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: subscriptionPlansApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subscription-plans'] });
    },
  });
};
