/**
 * Hook pour gérer les files d'attente
 */

import { useState, useEffect } from 'react';
import { queuesService, QueueStats } from '../services/queues';
import type { Queue } from '../types/api.types';

export function useQueues() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueues = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await queuesService.getAll();
      setQueues(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des files d\'attente');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  return {
    queues,
    isLoading,
    error,
    refetch: fetchQueues,
  };
}

export function useQueue(queueId: string) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await queuesService.getById(queueId);
      setQueue(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de la file d\'attente');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (queueId) {
      fetchQueue();
    }
  }, [queueId]);

  return {
    queue,
    isLoading,
    error,
    refetch: fetchQueue,
  };
}

export function useQueueStats(queueId: string) {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await queuesService.getStats(queueId);
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (queueId) {
      fetchStats();
    }
  }, [queueId]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}
