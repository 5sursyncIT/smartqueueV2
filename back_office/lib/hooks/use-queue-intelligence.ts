import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';

// ========== Types ==========

export interface QueueOverviewItem {
  id: string;
  name: string;
  status: string;
  algorithm: string;
  health_score: number;
  health_status: 'good' | 'warning' | 'critical';
  alerts_count: number;
  critical_alerts: number;
  waiting_count: number;
  in_service_count: number;
}

export interface QueueHealthData {
  health_score: number;
  status: 'good' | 'warning' | 'critical';
  alerts: Alert[];
  metrics: {
    waiting_count: number;
    available_agents: number;
    late_tickets_count?: number;
    sla_breach_rate?: number;
    avg_eta_seconds?: number;
  };
}

export interface Alert {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details?: any;
}

export interface LoadBalanceData {
  balance_score: number;
  status: 'optimal' | 'needs_balancing' | 'critical';
  total_waiting_tickets: number;
  queues_data: {
    queue_id: string;
    queue_name: string;
    waiting_count: number;
    available_agents: number;
    load_ratio: number;
  }[];
  max_load_ratio: number;
  min_load_ratio: number;
}

export interface TransferSuggestion {
  ticket_id: string;
  ticket_number: string;
  from_queue: { id: string; name: string };
  to_queue: { id: string; name: string };
  reason: string;
  priority: 'high' | 'medium' | 'low';
  estimated_time_saved_minutes: number;
}

export interface AgentReallocationSuggestion {
  agent_id: string;
  agent_name: string;
  from_queue: { id: string; name: string } | null;
  to_queue: { id: string; name: string };
  reason: string;
  impact_score: number;
}

export interface OptimizationReport {
  load_balance: LoadBalanceData;
  transfer_suggestions: TransferSuggestion[];
  agent_reallocation_suggestions: AgentReallocationSuggestion[];
  algorithm_recommendations: any[];
  summary: {
    total_transfer_suggestions: number;
    total_agent_suggestions: number;
    total_algorithm_changes: number;
    optimization_priority: 'high' | 'medium' | 'low';
  };
}

// ========== Hooks ==========

export function useQueuesOverview(refetchInterval: number = 30000) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<{
    queues: QueueOverviewItem[];
    total_queues: number;
    queues_with_alerts: number;
  }>({
    queryKey: ['queues', 'overview', currentTenant?.slug],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/overview/`
      );
      return response.data;
    },
    enabled: !!currentTenant,
    refetchInterval,
  });
}

export function useQueueHealth(queueId: string, refetchInterval: number = 60000) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<QueueHealthData>({
    queryKey: ['queue', queueId, 'health'],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/health/`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
    refetchInterval,
  });
}

export function useQueuePredictions(queueId: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: ['queue', queueId, 'predictions'],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/predictions/`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
  });
}

export function useLoadBalance(refetchInterval: number = 60000) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<LoadBalanceData>({
    queryKey: ['queues', 'load-balance', currentTenant?.slug],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/load_balance/`
      );
      return response.data;
    },
    enabled: !!currentTenant,
    refetchInterval,
  });
}

export function useOptimizationReport() {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<OptimizationReport>({
    queryKey: ['optimization', 'report', currentTenant?.slug],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/optimization_report/`
      );
      return response.data;
    },
    enabled: !!currentTenant,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAlgorithmRecommendation(queueId: string) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery({
    queryKey: ['queue', queueId, 'algorithm-recommendation'],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/algorithm_recommendation/`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
  });
}

// ========== Phase 3: Advanced Analytics Hooks ==========

export interface AbandonmentRateData {
  abandonment_rate: number;
  total_tickets: number;
  abandoned_count: number;
  period_days: number;
}

export interface AgentUtilizationData {
  overall_utilization_rate: number;
  agents_data: {
    agent_id: string;
    agent_name: string;
    tickets_served: number;
    total_service_seconds: number;
    available_seconds: number;
    utilization_rate: number;
  }[];
  average_service_seconds: number;
  period_days: number;
}

export interface SLAComplianceData {
  compliance_rate: number;
  compliant_count: number;
  non_compliant_count: number;
  total_count: number;
  sla_seconds: number;
  period_days: number;
}

export interface CSATData {
  average_csat: number | null;
  nps_score: number;
  total_feedback: number;
  promoters_count: number;
  passives_count: number;
  detractors_count: number;
  rating_distribution: Record<string, number>;
  period_days: number;
}

export interface HourlyHeatmapData {
  heatmap: Record<number, number>;
  peak_hour: number;
  peak_volume: number;
  period_days: number;
}

export interface DailyTrendsData {
  tickets_trend: { date: string; count: number }[];
  wait_time_trend: { date: string; avg_wait_seconds: number }[];
  service_time_trend: { date: string; avg_service_seconds: number }[];
  period_days: number;
}

export interface ABTestConfig {
  queue_id: string;
  queue_name: string;
  algorithm_a: string;
  algorithm_b: string;
  current_algorithm: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: string;
}

export interface AlgorithmComparisonData {
  algorithm_a: {
    name: string;
    period_start: string;
    period_end: string;
    metrics: {
      total_tickets: number;
      closed_tickets: number;
      avg_wait_seconds: number;
      avg_service_seconds: number;
      abandonment_rate: number;
    };
  };
  algorithm_b: {
    name: string;
    period_start: string;
    period_end: string;
    metrics: {
      total_tickets: number;
      closed_tickets: number;
      avg_wait_seconds: number;
      avg_service_seconds: number;
      abandonment_rate: number;
    };
  };
  improvements: {
    wait_time_improvement_percent: number;
    abandonment_improvement_percent: number;
  };
  winner: string;
  recommendation: string;
}

export function useAbandonmentRate(queueId: string, periodDays: number = 7) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<AbandonmentRateData>({
    queryKey: ['queue', queueId, 'abandonment-rate', periodDays],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/abandonment_rate/?period_days=${periodDays}`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAgentUtilization(queueId: string, periodDays: number = 7) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<AgentUtilizationData>({
    queryKey: ['queue', queueId, 'agent-utilization', periodDays],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/agent_utilization/?period_days=${periodDays}`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSLACompliance(queueId: string, periodDays: number = 7) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<SLAComplianceData>({
    queryKey: ['queue', queueId, 'sla-compliance', periodDays],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/sla_compliance/?period_days=${periodDays}`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCSAT(queueId: string, periodDays: number = 30) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<CSATData>({
    queryKey: ['queue', queueId, 'csat', periodDays],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/csat/?period_days=${periodDays}`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useHourlyHeatmap(queueId: string, periodDays: number = 7) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<HourlyHeatmapData>({
    queryKey: ['queue', queueId, 'hourly-heatmap', periodDays],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/hourly_heatmap/?period_days=${periodDays}`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDailyTrends(queueId: string, periodDays: number = 30) {
  const currentTenant = useAuthStore((state) => state.currentTenant);

  return useQuery<DailyTrendsData>({
    queryKey: ['queue', queueId, 'daily-trends', periodDays],
    queryFn: async () => {
      const response = await apiClient.get(
        `/tenants/${currentTenant!.slug}/queues/${queueId}/daily_trends/?period_days=${periodDays}`
      );
      return response.data;
    },
    enabled: !!currentTenant && !!queueId,
    staleTime: 10 * 60 * 1000,
  });
}
