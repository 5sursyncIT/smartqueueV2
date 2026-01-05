'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Ticket as TicketIcon,
  Search,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react';
import { useTickets, useCallTicket, useStartService, useCloseTicket } from '@/lib/hooks/use-tickets';
import { toast } from 'sonner';

export default function AgentMyTicketsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: tickets = [], isLoading } = useTickets({
    ...(statusFilter !== 'all' && { status: statusFilter }),
  });

  // Mutations
  const callTicket = useCallTicket();
  const startService = useStartService();
  const closeTicket = useCloseTicket();

  // Handlers
  const handleCallTicket = async (ticketId: string, ticketNumber: string) => {
    try {
      await callTicket.mutateAsync(ticketId);
      toast.success(`Ticket ${ticketNumber} appelé avec succès`);
    } catch (error: any) {
      console.error('Error calling ticket:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'appel du ticket');
    }
  };

  const handleStartService = async (ticketId: string, ticketNumber: string) => {
    try {
      await startService.mutateAsync(ticketId);
      toast.success(`Service démarré pour le ticket ${ticketNumber}`);
    } catch (error: any) {
      console.error('Error starting service:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du démarrage du service');
    }
  };

  const handleCloseTicket = async (ticketId: string, ticketNumber: string) => {
    try {
      await closeTicket.mutateAsync(ticketId);
      toast.success(`Ticket ${ticketNumber} terminé`);
    } catch (error: any) {
      console.error('Error closing ticket:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la fermeture du ticket');
    }
  };

  const handleCallNext = async () => {
    const nextWaitingTicket = waitingTickets[0];
    if (nextWaitingTicket) {
      await handleCallTicket(nextWaitingTicket.id, nextWaitingTicket.number);
    } else {
      toast.info('Aucun ticket en attente');
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      en_attente: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      appele: { label: 'Appelé', className: 'bg-blue-100 text-blue-800', icon: AlertCircle },
      en_service: { label: 'En service', className: 'bg-orange-100 text-orange-800', icon: Play },
      clos: { label: 'Terminé', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      no_show: { label: 'Absent', className: 'bg-gray-100 text-gray-800', icon: XCircle },
      transfere: { label: 'Transféré', className: 'bg-purple-100 text-purple-800', icon: AlertCircle },
      pause: { label: 'En pause', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
    };

    const statusConfig = config[status] || config.en_attente;
    const Icon = statusConfig.icon;

    return (
      <Badge className={statusConfig.className}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) {
      return <Badge variant="destructive">Urgent</Badge>;
    }
    if (priority >= 5) {
      return <Badge className="bg-orange-100 text-orange-800">Élevé</Badge>;
    }
    return <Badge variant="outline">Normal</Badge>;
  };

  const filteredTickets = tickets.filter((ticket) =>
    ticket.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const myTickets = filteredTickets.filter(
    (ticket) => ticket.status === 'en_service' || ticket.status === 'appele'
  );

  const waitingTickets = filteredTickets.filter(
    (ticket) => ticket.status === 'en_attente'
  );

  const completedTickets = filteredTickets.filter(
    (ticket) => ticket.status === 'clos' || ticket.status === 'no_show'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes Tickets</h1>
          <p className="text-gray-600 mt-2">
            Gérez vos tickets et appelez les clients
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par numéro ou nom client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="appele">Appelé</SelectItem>
                <SelectItem value="en_service">En service</SelectItem>
                <SelectItem value="clos">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* My Active Tickets */}
      {myTickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Play className="h-5 w-5 mr-2 text-orange-500" />
              Tickets actifs ({myTickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border border-orange-200 bg-orange-50 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <TicketIcon className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-lg font-bold">{ticket.number}</p>
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {ticket.customer_name && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{ticket.customer_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {new Date(ticket.created_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">
                              {ticket.queue?.name}
                            </span>
                            {' - '}
                            <span className="text-gray-500">
                              {ticket.queue?.service?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {ticket.status === 'appele' && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleStartService(ticket.id, ticket.number)}
                          disabled={startService.isPending}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {startService.isPending ? 'Démarrage...' : 'Commencer'}
                        </Button>
                      )}
                      {ticket.status === 'en_service' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleCloseTicket(ticket.id, ticket.number)}
                            disabled={closeTicket.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            {closeTicket.isPending ? 'Fermeture...' : 'Terminer'}
                          </Button>
                          <Button size="sm" variant="outline">
                            <XCircle className="h-4 w-4 mr-1" />
                            Absent
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiting Tickets */}
      {waitingTickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-yellow-500" />
                Tickets en attente ({waitingTickets.length})
              </div>
              <Button
                size="sm"
                onClick={handleCallNext}
                disabled={waitingTickets.length === 0 || callTicket.isPending}
              >
                <Play className="h-4 w-4 mr-1" />
                {callTicket.isPending ? 'Appel en cours...' : 'Appeler le suivant'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {waitingTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {ticket.number}
                        </p>
                      </div>
                      <div className="h-10 w-px bg-gray-200" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {ticket.queue?.name} - {ticket.queue?.service?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Créé à{' '}
                          {new Date(ticket.created_at).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCallTicket(ticket.id, ticket.number)}
                      disabled={callTicket.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {callTicket.isPending ? 'Appel...' : 'Appeler'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Tickets */}
      {completedTickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
              Tickets terminés ({completedTickets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedTickets.slice(0, 5).map((ticket) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-3 bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-gray-700">{ticket.number}</p>
                      {getStatusBadge(ticket.status)}
                      <span className="text-sm text-gray-600">
                        {ticket.queue?.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(ticket.ended_at || ticket.updated_at).toLocaleTimeString(
                        'fr-FR',
                        { hour: '2-digit', minute: '2-digit' }
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      )}

      {!isLoading && filteredTickets.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <TicketIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun ticket trouvé</p>
              <p className="text-sm mt-1">
                Modifiez vos filtres ou attendez de nouveaux tickets
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
