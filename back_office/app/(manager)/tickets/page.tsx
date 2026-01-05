'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Ticket,
  Clock,
  User,
  RefreshCw,
  Search,
  Filter,
  MoreVertical,
  Phone,
  XCircle,
  CheckCircle,
  ArrowRightLeft,
  Plus,
} from 'lucide-react';
import { useTickets, useTicketStats, useCreateTicket, useCallTicket, useStartService, useCloseTicket, type Ticket as TicketType, type CreateTicketDto } from '@/lib/hooks/use-tickets';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';
import { toast } from 'sonner';

export default function TicketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useTicketStats();
  const { data: tickets = [], isLoading, refetch } = useTickets({
    ...(statusFilter !== 'all' && { status: statusFilter }),
  });
  const createTicket = useCreateTicket();
  const callTicket = useCallTicket();
  const startService = useStartService();
  const closeTicket = useCloseTicket();

  const getStatusBadge = (status: TicketType['status']) => {
    const variants = {
      en_attente: { label: 'En attente', className: 'bg-orange-100 text-orange-800' },
      appele: { label: 'Appelé', className: 'bg-blue-100 text-blue-800' },
      en_service: { label: 'En service', className: 'bg-purple-100 text-purple-800' },
      pause: { label: 'En pause', className: 'bg-yellow-100 text-yellow-800' },
      transfere: { label: 'Transféré', className: 'bg-gray-100 text-gray-800' },
      clos: { label: 'Clôturé', className: 'bg-green-100 text-green-800' },
      no_show: { label: 'No show', className: 'bg-red-100 text-red-800' },
    };

    const { label, className} = variants[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <Badge variant="secondary" className={className}>
        {label}
      </Badge>
    );
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'web':
        return '🌐';
      case 'app':
        return '📱';
      case 'qr':
        return '📸';
      case 'whatsapp':
        return '💬';
      case 'kiosk':
        return '🖥️';
      default:
        return '📝';
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return '< 1 min';
    return `${minutes} min`;
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer_phone.includes(searchQuery);

    return matchesSearch;
  });

  const handleRefresh = () => {
    refetch();
    toast.success('Liste des tickets actualisée');
  };

  const handleCreateTicket = async (data: CreateTicketDto) => {
    try {
      console.log('[Tickets Page] Creating ticket with data:', data);
      await createTicket.mutateAsync(data);
      toast.success('Ticket créé avec succès');
      refetch();
    } catch (error: any) {
      console.error('[Tickets Page] Error creating ticket:', error);
      console.error('[Tickets Page] Error response:', error?.response?.data);

      // Extraire le message d'erreur
      let errorMessage = 'Erreur lors de la création du ticket';

      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          // Si c'est un objet d'erreurs de validation
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }

      toast.error(errorMessage);
      throw error;
    }
  };

  const handleCallTicket = async (ticketId: string, ticketNumber: string) => {
    try {
      await callTicket.mutateAsync(ticketId);
      toast.success(`Ticket ${ticketNumber} appelé`);
      refetch();
    } catch (error: any) {
      console.error('Error calling ticket:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'appel');
    }
  };

  const handleStartService = async (ticketId: string, ticketNumber: string) => {
    try {
      await startService.mutateAsync(ticketId);
      toast.success(`Service démarré pour ${ticketNumber}`);
      refetch();
    } catch (error: any) {
      console.error('Error starting service:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du démarrage');
    }
  };

  const handleCloseTicket = async (ticketId: string, ticketNumber: string) => {
    try {
      await closeTicket.mutateAsync(ticketId);
      toast.success(`Ticket ${ticketNumber} clôturé`);
      refetch();
    } catch (error: any) {
      console.error('Error closing ticket:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la clôture');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets</h1>
          <p className="text-gray-600 mt-2">
            Gérez tous les tickets de vos files d'attente
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau ticket
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-orange-600">
                  {statsLoading ? '...' : stats?.waiting || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En service</p>
                <p className="text-2xl font-bold text-blue-600">
                  {statsLoading ? '...' : stats?.in_service || 0}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Complétés</p>
                <p className="text-2xl font-bold text-green-600">
                  {statsLoading ? '...' : stats?.completed_today || 0}
                </p>
              </div>
              <Ticket className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total aujourd'hui</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.total_today || 0}
                </p>
              </div>
              <Ticket className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des tickets</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par numéro, nom ou téléphone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="appele">Appelé</SelectItem>
                  <SelectItem value="en_service">En service</SelectItem>
                  <SelectItem value="pause">En pause</SelectItem>
                  <SelectItem value="clos">Clôturé</SelectItem>
                  <SelectItem value="no_show">No show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>File d'attente</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Temps d'attente</TableHead>
                  <TableHead>Créé à</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      Chargement des tickets...
                    </TableCell>
                  </TableRow>
                ) : filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                      <Ticket className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun ticket trouvé</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        <div className="font-mono font-semibold">{ticket.number}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {ticket.customer?.name || ticket.customer_name || 'Anonyme'}
                          </div>
                          {(ticket.customer?.phone || ticket.customer_phone) && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {ticket.customer?.phone || ticket.customer_phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ticket.queue?.name || 'N/A'}</div>
                          {ticket.queue?.service && (
                            <div className="text-xs text-gray-500">{ticket.queue.service.name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span title={ticket.channel}>{getChannelIcon(ticket.channel)}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                      <TableCell>
                        {ticket.agent ? (
                          <div className="text-sm">
                            {ticket.agent.user.first_name} {ticket.agent.user.last_name}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{formatDuration(ticket.wait_time_seconds)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">{formatTime(ticket.created_at)}</div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {ticket.status === 'en_attente' && (
                              <DropdownMenuItem onClick={() => handleCallTicket(ticket.id, ticket.number)}>
                                <Phone className="h-4 w-4 mr-2" />
                                Appeler
                              </DropdownMenuItem>
                            )}
                            {ticket.status === 'appele' && (
                              <DropdownMenuItem onClick={() => handleStartService(ticket.id, ticket.number)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Commencer service
                              </DropdownMenuItem>
                            )}
                            {(ticket.status === 'en_attente' || ticket.status === 'appele' || ticket.status === 'en_service') && (
                              <DropdownMenuItem>
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Transférer
                              </DropdownMenuItem>
                            )}
                            {(ticket.status === 'appele' || ticket.status === 'en_service') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleCloseTicket(ticket.id, ticket.number)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Clôturer
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600">
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Marquer no-show
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>
              Affichage de {filteredTickets.length} ticket(s) sur {tickets.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTicket}
        isLoading={createTicket.isPending}
      />
    </div>
  );
}
