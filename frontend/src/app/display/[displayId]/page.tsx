'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Users, Wifi, WifiOff } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { useWebSocket } from '@/hooks/use-websocket';
import { AxiosError } from 'axios';
import { ModernLayout } from './modern-layout';

interface DisplayData {
  display: {
    id: string;
    name: string;
    type: string;
    layout: string;
    theme: {
      primaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
      logo?: string;
    };
    auto_refresh_seconds: number;
    // Nouveaux champs de personnalisation
    show_video: boolean;
    video_url?: string;
    background_image?: string;
    custom_message: string;
    secondary_message?: string;
    message_position: string;
    ticket_colors: Record<string, string>;
  };
  tickets: Array<{
    id: string;
    number: string;
    queue_name: string;
    queue_id: string;
    status: string;
    called_at: string;
    counter: number | null;
    agent_name: string | null;
  }>;
  waiting_stats: Record<string, number>;
  timestamp: string;
}

interface ErrorResponse {
  detail?: string;
  message?: string;
}

export default function DisplayPage({ params }: { params: Promise<{ displayId: string }> }) {
  const resolvedParams = use(params);
  const { displayId } = resolvedParams;

  const [data, setData] = useState<DisplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Extract tenant slug dynamically from query params or localStorage
  const getTenantSlug = (): string => {
    // Priority 1: URL search params
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tenantFromUrl = searchParams.get('tenant');
      if (tenantFromUrl) {
        // Save to localStorage for future use
        localStorage.setItem('display_tenant', tenantFromUrl);
        return tenantFromUrl;
      }

      // Priority 2: localStorage (persisted from previous visit)
      const tenantFromStorage = localStorage.getItem('display_tenant');
      if (tenantFromStorage) {
        return tenantFromStorage;
      }
    }

    // Priority 3: Default fallback
    return 'demo-bank';
  };

  const tenantSlug = getTenantSlug();

  // WebSocket connection - utilise le proxy Next.js pour éviter les problèmes CORS
  const wsUrl = typeof window !== 'undefined'
    ? `/ws/tenants/${tenantSlug}/displays/${displayId}/`
    : null;

  // Debug WebSocket URL (can be removed in production)
  if (typeof window !== 'undefined' && wsUrl) {
    console.log('[Display] WebSocket URL:', wsUrl);
    console.log('[Display] Tenant:', tenantSlug);
    console.log('[Display] Display ID:', displayId);
  }

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return; // Skip sound for users who prefer reduced motion
    }

    try {
      // Create a simple beep sound using Web Audio API
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported');
        return;
      }

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error('Audio play error:', err);
    }
  }, []);

  const { isConnected } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      console.log('[Display] WebSocket message:', message);

      if (message.type === 'ticket_called' && message.ticket) {
        // Play notification sound
        playNotificationSound();

        // Add new ticket to the list
        setData((prev) => {
          if (!prev) return prev;

          // Check if ticket already exists
          const exists = prev.tickets.some((t) => t.id === message.ticket.id);
          if (exists) return prev;

          // Add to beginning and keep only last 10
          const newTickets = [message.ticket, ...prev.tickets].slice(0, 10);

          return {
            ...prev,
            tickets: newTickets,
          };
        });

        // Refresh full data to get updated waiting stats
        fetchDisplayData();
      } else if (message.type === 'refresh') {
        // Force refresh
        fetchDisplayData();
      }
    },
    onConnect: () => {
      console.log('[Display] WebSocket connected successfully');
    },
    onDisconnect: () => {
      console.log('[Display] WebSocket disconnected');
    },
    onError: (error) => {
      console.error('[Display] WebSocket error:', error);
    },
    // Paramètres de reconnexion moins agressifs
    reconnectInterval: 5000, // 5 secondes au lieu de 3
    maxReconnectAttempts: 5, // 5 tentatives au lieu de 10
  });

  const fetchDisplayData = useCallback(async () => {
    try {
      const response = await apiClient.get<DisplayData>(
        `/public/tenants/${tenantSlug}/displays/${displayId}/tickets/`
      );
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching display data:', err);

      // Detailed error messages
      if (err instanceof AxiosError) {
        if (err.response?.status === 404) {
          setError('Écran d\'affichage non trouvé');
        } else if (err.response?.status === 403) {
          setError('Accès refusé à cet écran');
        } else if (err.response?.status === 500) {
          setError('Erreur serveur. Veuillez réessayer');
        } else if (err.code === 'ERR_NETWORK') {
          setError('Erreur réseau. Vérifiez votre connexion');
        } else {
          const errorData = err.response?.data as ErrorResponse;
          setError(errorData?.detail || errorData?.message || 'Erreur de connexion au serveur');
        }
      } else {
        setError('Erreur inconnue');
      }
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug, displayId]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Memoize refresh interval to avoid recreating it
  const refreshSeconds = useMemo(() => data?.display.auto_refresh_seconds || 5, [data?.display.auto_refresh_seconds]);

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    fetchDisplayData();

    const refreshInterval = setInterval(() => {
      fetchDisplayData();
    }, refreshSeconds * 1000);

    return () => clearInterval(refreshInterval);
  }, [fetchDisplayData, refreshSeconds]);

  // Send ping every 30 seconds
  useEffect(() => {
    const pingInterval = setInterval(async () => {
      try {
        await apiClient.post(`/public/tenants/${tenantSlug}/displays/${displayId}/ping/`);
      } catch (err) {
        console.error('Ping error:', err);
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [displayId, tenantSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="p-8 text-center">
          <p className="text-xl text-red-600 mb-4">⚠️ {error || 'Erreur de chargement'}</p>
          <button
            onClick={fetchDisplayData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </Card>
      </div>
    );
  }

  // Utiliser le layout moderne si configuré, sinon le layout classique
  const useModernLayout = data.display.layout === 'split' || data.display.layout === 'modern';

  if (useModernLayout) {
    return (
      <ModernLayout
        tickets={data.tickets}
        displayConfig={{
          show_video: data.display.show_video,
          video_url: data.display.video_url,
          background_image: data.display.background_image,
          custom_message: data.display.custom_message,
          secondary_message: data.display.secondary_message,
          message_position: data.display.message_position,
          ticket_colors: data.display.ticket_colors,
          theme: data.display.theme,
        }}
        currentTime={currentTime}
      />
    );
  }

  // Layout classique (fallback)
  const theme = data.display.theme;
  const totalWaiting = Object.values(data.waiting_stats).reduce((a, b) => a + b, 0);

  return (
    <div
      className="min-h-screen p-8"
      style={{
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
      }}
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1
              className="text-4xl font-bold"
              style={{ color: theme.primaryColor }}
            >
              {data.display.name}
            </h1>
            {/* WebSocket connection status */}
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4" />
                  <span>Connecté</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4" />
                  <span>Déconnecté</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {currentTime.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-lg text-gray-600">
              {currentTime.toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Waiting Stats */}
        <div className="flex items-center gap-4 text-xl">
          <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-lg shadow">
            <Users className="h-6 w-6" style={{ color: theme.primaryColor }} />
            <span className="font-semibold">{totalWaiting}</span>
            <span className="text-gray-600">en attente</span>
          </div>
        </div>
      </div>

      {/* Called Tickets */}
      {data.tickets.length === 0 ? (
        <div className="text-center py-20" role="status" aria-live="polite">
          <Clock className="h-24 w-24 mx-auto mb-6 text-gray-300" aria-hidden="true" />
          <p className="text-3xl text-gray-400">En attente d&apos;appel...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="region" aria-label="Tickets appelés">
          {data.tickets.map((ticket, index) => (
            <Card
              key={ticket.id}
              className={`p-8 border-4 ${
                index === 0 ? 'ring-4 ring-offset-4 ring-green-500' : ''
              }`}
              style={{
                borderColor: index === 0 ? theme.primaryColor : '#e5e7eb',
                animation: index === 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  : 'none'
              }}
              role="article"
              aria-label={`Ticket ${ticket.number}${index === 0 ? ' - Actuellement appelé' : ''}`}
            >
              <div className="text-center">
                <div className="text-xl font-bold text-gray-700 mb-2 uppercase tracking-wide">{ticket.queue_name}</div>
                <div
                  className="text-6xl font-bold mb-4"
                  style={{ color: theme.primaryColor }}
                  aria-label={`Numéro de ticket ${ticket.number}`}
                >
                  {ticket.number.split('-').pop()}
                </div>
                {ticket.counter && (
                  <div className="text-3xl font-semibold mb-2">
                    Guichet {ticket.counter}
                  </div>
                )}
                {ticket.agent_name && (
                  <div className="text-lg text-gray-600">{ticket.agent_name}</div>
                )}
                <div className="mt-4 text-sm text-gray-500">
                  {new Date(ticket.called_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="fixed bottom-4 right-4 text-sm text-gray-400">
        Dernière mise à jour : {new Date(data.timestamp).toLocaleTimeString('fr-FR')}
      </div>
    </div>
  );
}
