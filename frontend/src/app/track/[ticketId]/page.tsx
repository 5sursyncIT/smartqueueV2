'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import apiClient from '@/lib/api/client';
import { Clock, CheckCircle, XCircle, AlertCircle, Users, RefreshCw } from 'lucide-react';

interface TicketStatus {
  ticket_id: string;
  ticket_number: string;
  queue_name: string;
  service_name: string | null;
  status: string;
  position: number;
  eta_seconds: number | null;
  called_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  updated_at: string;
}

export default function TrackTicketPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const [ticket, setTicket] = useState<TicketStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantSlug] = useState('demo-bank'); // Default tenant
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchTicketStatus();
  }, [ticketId]);

  // Auto-refresh every 10 seconds if ticket is waiting or called
  useEffect(() => {
    if (!autoRefresh || !ticket) return;
    if (ticket.status === 'waiting' || ticket.status === 'called') {
      const interval = setInterval(fetchTicketStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [ticket, autoRefresh]);

  const fetchTicketStatus = async () => {
    try {
      const response = await apiClient.get(`/public/tenants/${tenantSlug}/tickets/${ticketId}/`);
      setTicket(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching ticket:', err);
      setError('Impossible de charger les informations du ticket.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatETA = (seconds: number | null): string => {
    if (!seconds) return 'Calcul en cours...';
    if (seconds < 60) return `${seconds} secondes`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'waiting':
        return {
          label: 'En attente',
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock,
          iconColor: 'text-yellow-600',
        };
      case 'called':
        return {
          label: 'Appelé',
          color: 'bg-blue-100 text-blue-800',
          icon: AlertCircle,
          iconColor: 'text-blue-600',
        };
      case 'in_service':
        return {
          label: 'En service',
          color: 'bg-green-100 text-green-800',
          icon: Users,
          iconColor: 'text-green-600',
        };
      case 'completed':
        return {
          label: 'Terminé',
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600',
        };
      case 'no_show':
        return {
          label: 'Absence',
          color: 'bg-red-100 text-red-800',
          icon: XCircle,
          iconColor: 'text-red-600',
        };
      case 'cancelled':
        return {
          label: 'Annulé',
          color: 'bg-gray-100 text-gray-800',
          icon: XCircle,
          iconColor: 'text-gray-600',
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800',
          icon: AlertCircle,
          iconColor: 'text-gray-600',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error || 'Ticket introuvable'}</p>
            <div className="space-y-2">
              <Button onClick={fetchTicketStatus} className="w-full">
                Réessayer
              </Button>
              <Link href="/queues" className="block">
                <Button variant="outline" className="w-full">
                  Retour aux files
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = getStatusConfig(ticket.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Suivi de ticket</h1>
            <Link href="/queues">
              <Button variant="outline">Retour aux files</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Numéro de ticket</p>
                <p className="text-4xl font-bold text-blue-600">{ticket.ticket_number}</p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.color}`}>
                <StatusIcon className={`w-4 h-4 mr-1 ${statusConfig.iconColor}`} />
                {statusConfig.label}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Queue info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">File d'attente</p>
                  <p className="font-medium">{ticket.queue_name}</p>
                </div>
                {ticket.service_name && (
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="font-medium">{ticket.service_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Status specific content */}
            {ticket.status === 'waiting' && (
              <div className="space-y-4">
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                  <div className="text-center mb-4">
                    <p className="text-sm text-gray-600 mb-2">Votre position dans la file</p>
                    <p className="text-6xl font-bold text-yellow-600">{ticket.position}</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Clock className="w-5 h-5" />
                    <span>Temps d'attente estimé: {formatETA(ticket.eta_seconds)}</span>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Astuce:</strong> Gardez cette page ouverte pour être notifié quand ce sera votre tour.
                  </p>
                </div>
              </div>
            )}

            {ticket.status === 'called' && (
              <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 text-center">
                <AlertCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <p className="text-2xl font-bold text-blue-900 mb-2">C'est votre tour !</p>
                <p className="text-blue-800">
                  Veuillez vous présenter au comptoir maintenant.
                </p>
              </div>
            )}

            {ticket.status === 'in_service' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <Users className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-xl font-bold text-green-900">Service en cours</p>
              </div>
            )}

            {ticket.status === 'completed' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-xl font-bold text-green-900 mb-2">Service terminé</p>
                <p className="text-gray-600">Merci d'avoir utilisé SmartQueue!</p>
              </div>
            )}

            {(ticket.status === 'no_show' || ticket.status === 'cancelled') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <p className="text-xl font-bold text-red-900 mb-2">
                  {ticket.status === 'no_show' ? 'Absence constatée' : 'Ticket annulé'}
                </p>
                <Link href="/queues" className="block mt-4">
                  <Button>Obtenir un nouveau ticket</Button>
                </Link>
              </div>
            )}

            {/* Auto-refresh toggle */}
            {(ticket.status === 'waiting' || ticket.status === 'called') && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'text-blue-600 animate-spin' : 'text-gray-400'}`} />
                  <span className="text-sm text-gray-600">Actualisation automatique</span>
                </div>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    autoRefresh
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {autoRefresh ? 'Activé' : 'Désactivé'}
                </button>
              </div>
            )}

            {/* Manual refresh button */}
            <Button
              onClick={fetchTicketStatus}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser maintenant
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
