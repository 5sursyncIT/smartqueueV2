import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTickets } from './use-tickets';
import { useAgents } from './use-agents';
import { useQueues } from './use-queues';

export interface DashboardStats {
  totalTickets: number;
  completedToday: number;
  avgWaitTime: number | null;
  totalAgents: number;
  availableAgents: number;
  busyAgents: number;
  activeQueues: number;
  waitingTickets: number;
}

export function useDashboardStats() {
  const currentTenant = useAuthStore((state) => state.currentTenant);
  const { data: tickets, isLoading: ticketsLoading } = useTickets();
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: queues, isLoading: queuesLoading } = useQueues();

  return useQuery({
    queryKey: ['dashboard-stats', currentTenant?.slug],
    queryFn: async () => {
      // Calculate stats from tickets
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const completedToday = tickets?.filter(
        (t) =>
          t.status === 'clos' &&
          new Date(t.ended_at || t.updated_at) >= todayStart
      ).length || 0;

      const waitingTickets = tickets?.filter((t) => t.status === 'en_attente').length || 0;

      // Calculate average wait time from closed tickets today
      const closedTodayWithWaitTime = tickets?.filter(
        (t) =>
          t.status === 'clos' &&
          t.wait_time_seconds !== null &&
          new Date(t.ended_at || t.updated_at) >= todayStart
      ) || [];

      const avgWaitTime = closedTodayWithWaitTime.length > 0
        ? closedTodayWithWaitTime.reduce((sum, t) => sum + (t.wait_time_seconds || 0), 0) / closedTodayWithWaitTime.length
        : null;

      // Agent stats
      const totalAgents = agents?.length || 0;
      const availableAgents = agents?.filter((a) => a.current_status === 'available').length || 0;
      const busyAgents = agents?.filter((a) => a.current_status === 'busy').length || 0;

      // Queue stats
      const activeQueues = queues?.filter((q) => q.status === 'active').length || 0;

      const stats: DashboardStats = {
        totalTickets: tickets?.length || 0,
        completedToday,
        avgWaitTime,
        totalAgents,
        availableAgents,
        busyAgents,
        activeQueues,
        waitingTickets,
      };

      return stats;
    },
    enabled: !!currentTenant && !ticketsLoading && !agentsLoading && !queuesLoading,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}
