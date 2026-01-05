/**
 * Hook pour gérer les événements de sécurité et les statistiques
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

export interface SecurityEvent {
  id: string;
  event_type: string;
  event_type_display: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  severity_display: string;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  status_display: string;
  user_email: string;
  ip_address: string;
  user_agent: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ThreatSummary {
  blocked_ips: number;
  failed_logins: number;
  suspicious_activities: number;
  open_incidents: number;
}

export interface SecurityStats {
  total_events: number;
  events_by_severity: Record<string, number>;
  events_by_type: Record<string, number>;
  recent_events: SecurityEvent[];
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  attempt_count?: number;
}

export interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at?: string | null;
}

export function useSecurityEvents(initialFilters?: {
  event_type?: string;
  severity?: string;
  status?: string;
  search?: string;
}) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters || {});

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      console.log('[useSecurityEvents] Fetching events from /security/events/');
      const response = await apiClient.get<{ results: SecurityEvent[] }>('/security/events/', {
        params: filters,
      });
      console.log('[useSecurityEvents] Response:', response.data);
      setEvents(response.data.results || (response.data as any));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des événements');
      console.error('[useSecurityEvents] Error fetching security events:', err);
      console.error('[useSecurityEvents] Error details:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return {
    events,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchEvents,
  };
}

export function useSecurityStats() {
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<SecurityStats>('/security/events/stats/');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching security stats:', err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
}

export function useThreatSummary() {
  const [summary, setSummary] = useState<ThreatSummary>({
    blocked_ips: 0,
    failed_logins: 0,
    suspicious_activities: 0,
    open_incidents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSummary = async () => {
    try {
      console.log('[useThreatSummary] Fetching summary from /security/events/summary/');
      const response = await apiClient.get<ThreatSummary>('/security/events/summary/');
      console.log('[useThreatSummary] Response:', response.data);
      setSummary(response.data);
      setLoading(false);
    } catch (err: any) {
      console.error('[useThreatSummary] Error fetching threat summary:', err);
      console.error('[useThreatSummary] Error details:', err.response?.data);
      setLoading(false);
    }
  };

  return { summary, loading, refetch: fetchSummary };
}

export function useBlockedIPs() {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedIPs();
  }, []);

  const fetchBlockedIPs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ results: BlockedIP[] }>('/security/blocked-ips/');
      setBlockedIPs(response.data.results || (response.data as any));
    } catch (err) {
      console.error('Error fetching blocked IPs:', err);
    } finally {
      setLoading(false);
    }
  };

  const block = async (ipAddress: string, reason: string = '') => {
    try {
      await apiClient.post('/security/blocked-ips/', {
        ip_address: ipAddress,
        reason,
      });
      await fetchBlockedIPs();
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors du blocage');
    }
  };

  const unblock = async (ipAddress: string) => {
    try {
      // Find the IP by address
      const ip = blockedIPs.find((b) => b.ip_address === ipAddress);
      if (ip) {
        await apiClient.post(`/security/blocked-ips/${ip.id}/unblock/`);
        await fetchBlockedIPs();
      }
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors du déblocage');
    }
  };

  return {
    blockedIPs,
    loading,
    refetch: fetchBlockedIPs,
    block,
    unblock,
  };
}

export function useSecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ results: SecurityAlert[] }>(
        '/security/alerts/?status=open'
      );
      setAlerts(response.data.results || (response.data as any));
    } catch (err) {
      console.error('Error fetching security alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsResolved = async (alertId: string) => {
    try {
      await apiClient.post(`/security/alerts/${alertId}/resolve/`);
      await fetchAlerts();
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la résolution');
    }
  };

  return {
    alerts,
    loading,
    refetch: fetchAlerts,
    markAsResolved,
  };
}
