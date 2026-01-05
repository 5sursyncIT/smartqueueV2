'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Ticket,
  Clock,
  CheckCircle,
  TrendingUp,
  Play,
  Pause,
  Coffee,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useSetAgentStatus, useCallNextTicket } from '@/lib/hooks/use-agents';
import { useTickets, useStartService, useCloseTicket } from '@/lib/hooks/use-tickets';
import { useToast } from '@/lib/hooks/use-toast';

export default function AgentDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [agentStatus, setAgentStatus] = useState<'available' | 'busy' | 'paused'>('available');
  const [stats, setStats] = useState({
    ticketsToday: 0,
    ticketsInProgress: 0,
    ticketsCompleted: 0,
    avgServiceTime: '0 min',
  });

  const setStatusMutation = useSetAgentStatus();
  const callNextMutation = useCallNextTicket();
  const startServiceMutation = useStartService();
  const closeTicketMutation = useCloseTicket();

  // Charger les tickets de l'agent uniquement si l'utilisateur est chargé
  const ticketsFilter = user?.id ? { agent: user.id, status: 'appele,en_service' } : undefined;
  const { data: tickets = [], isLoading: ticketsLoading } = useTickets(ticketsFilter);

  // Debug logging
  useEffect(() => {
    console.log('[AgentDashboard] User:', user?.id);
    console.log('[AgentDashboard] Tickets filter:', ticketsFilter);
    console.log('[AgentDashboard] Tickets:', tickets);
    console.log('[AgentDashboard] Tickets loading:', ticketsLoading);

    // Alert if user ID is missing
    if (user && !user.id) {
      console.error('⚠️ USER ID IS EMPTY! Please LOGOUT and LOGIN AGAIN to fix this.');
      console.error('   The user object in localStorage has old data without the user ID.');
    }
  }, [user, ticketsFilter, tickets, ticketsLoading]);

  // TODO: Fetch real data from API
  useEffect(() => {
    // Mock data for now
    setStats({
      ticketsToday: 12,
      ticketsInProgress: 2,
      ticketsCompleted: 10,
      avgServiceTime: '8 min',
    });
  }, []);

  const getStatusBadge = () => {
    const config = {
      available: { label: 'Disponible', className: 'bg-green-100 text-green-800', icon: Play },
      busy: { label: 'Occupé', className: 'bg-orange-100 text-orange-800', icon: Clock },
      paused: { label: 'En pause', className: 'bg-yellow-100 text-yellow-800', icon: Pause },
    };

    const { label, className, icon: Icon } = config[agentStatus];
    return (
      <Badge className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const handleStatusChange = async (newStatus: 'available' | 'busy' | 'paused') => {
    try {
      // Map frontend status to backend status
      const statusMap = {
        available: 'available' as const,
        busy: 'busy' as const,
        paused: 'paused' as const,
      };

      await setStatusMutation.mutateAsync(statusMap[newStatus]);
      setAgentStatus(newStatus);
      toast({
        title: 'Statut mis à jour',
        description: `Vous êtes maintenant ${newStatus === 'available' ? 'disponible' : newStatus === 'paused' ? 'en pause' : 'occupé'}`,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour votre statut',
        variant: 'destructive',
      });
    }
  };

  const handleCallNext = async () => {
    try {
      const result = await callNextMutation.mutateAsync();
      toast({
        title: 'Client appelé',
        description: `Ticket ${result.number} a été appelé`,
      });
      // Refresh stats
      setStats(prev => ({
        ...prev,
        ticketsInProgress: prev.ticketsInProgress + 1,
      }));
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'appeler le prochain client',
        variant: 'destructive',
      });
    }
  };

  const handleViewTickets = () => {
    router.push('/agent/my-tickets');
  };

  const handleStartService = async (ticketId: string) => {
    try {
      await startServiceMutation.mutateAsync(ticketId);
      toast({
        title: 'Service démarré',
        description: 'Le service du ticket a commencé',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de démarrer le service',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTicket = async (ticketId: string) => {
    try {
      await closeTicketMutation.mutateAsync(ticketId);
      toast({
        title: 'Ticket terminé',
        description: 'Le ticket a été marqué comme terminé',
      });
      // Refresh stats
      setStats(prev => ({
        ...prev,
        ticketsInProgress: prev.ticketsInProgress - 1,
        ticketsCompleted: prev.ticketsCompleted + 1,
      }));
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de terminer le ticket',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={`${user.first_name} ${user.last_name}`} />}
            <AvatarFallback className="text-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">
              Bonjour, {user?.first_name} !
            </h1>
            <p className="text-gray-600 mt-2">
              Voici un aperçu de votre activité aujourd'hui
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={agentStatus === 'available' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('available')}
            >
              <Play className="h-4 w-4 mr-1" />
              Disponible
            </Button>
            <Button
              size="sm"
              variant={agentStatus === 'paused' ? 'default' : 'outline'}
              onClick={() => handleStatusChange('paused')}
            >
              <Coffee className="h-4 w-4 mr-1" />
              Pause
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Tickets aujourd'hui
                </p>
                <p className="text-2xl font-bold">{stats.ticketsToday}</p>
              </div>
              <Ticket className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En cours</p>
                <p className="text-2xl font-bold text-orange-600">
                  {stats.ticketsInProgress}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Complétés</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.ticketsCompleted}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Temps moyen
                </p>
                <p className="text-2xl font-bold">{stats.avgServiceTime}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              size="lg"
              className="h-24 text-lg"
              disabled={agentStatus !== 'available' || callNextMutation.isPending}
              onClick={handleCallNext}
            >
              <Play className="h-6 w-6 mr-2" />
              {callNextMutation.isPending ? 'Appel en cours...' : 'Appeler le prochain client'}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-24 text-lg"
              onClick={handleViewTickets}
            >
              <Ticket className="h-6 w-6 mr-2" />
              Voir mes tickets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets en cours</CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun ticket en cours
            </div>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ticket #{ticket.number}</p>
                      <p className="text-sm text-gray-500">
                        Client: {ticket.customer_name || 'Anonyme'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {ticket.queue.service.name} - {ticket.queue.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {ticket.status === 'appele' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartService(ticket.id)}
                          disabled={startServiceMutation.isPending}
                        >
                          {startServiceMutation.isPending ? 'Démarrage...' : 'En service'}
                        </Button>
                      )}
                      {ticket.status === 'en_service' && (
                        <>
                          <Badge className="bg-blue-100 text-blue-800">En service</Badge>
                          <Button
                            size="sm"
                            onClick={() => handleCompleteTicket(ticket.id)}
                            disabled={closeTicketMutation.isPending}
                          >
                            {closeTicketMutation.isPending ? 'Fermeture...' : 'Terminer'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
