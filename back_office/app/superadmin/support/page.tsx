'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  MessageSquare,
  Mail,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Building,
  Send,
  BookOpen,
  HelpCircle,
  MessageCircle,
  TrendingUp,
  FileText,
} from 'lucide-react';

// Types
interface SupportTicket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  organization: string;
  organization_slug: string;
  contact_email: string;
  contact_name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  category: 'technical' | 'billing' | 'feature_request' | 'bug' | 'question';
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
}

interface KnowledgeBaseArticle {
  id: string;
  title: string;
  category: string;
  views: number;
  helpful_votes: number;
  last_updated: string;
}

interface SupportStats {
  open_tickets: number;
  avg_response_time_hours: number;
  satisfaction_rate: number;
  resolved_today: number;
}

// Données de démo
const DEMO_STATS: SupportStats = {
  open_tickets: 12,
  avg_response_time_hours: 2.5,
  satisfaction_rate: 94,
  resolved_today: 8,
};

const DEMO_TICKETS: SupportTicket[] = [
  {
    id: '1',
    ticket_number: 'SUP-2025-001',
    subject: 'Problème d\'affichage des statistiques',
    description: 'Les graphiques ne s\'affichent pas correctement sur la page analytics',
    organization: 'Demo Bank',
    organization_slug: 'demo-bank',
    contact_email: 'admin@demo-bank.com',
    contact_name: 'Admin Demo Bank',
    priority: 'high',
    status: 'in_progress',
    category: 'technical',
    created_at: '2025-01-15T14:30:00Z',
    updated_at: '2025-01-15T15:00:00Z',
    assigned_to: 'Support Tech',
  },
  {
    id: '2',
    ticket_number: 'SUP-2025-002',
    subject: 'Question sur la facturation',
    description: 'Comment modifier mon plan d\'abonnement ?',
    organization: 'Clinique du Plateau',
    organization_slug: 'clinique-plateau',
    contact_email: 'admin@clinique.sn',
    contact_name: 'Directeur Clinique',
    priority: 'medium',
    status: 'waiting_customer',
    category: 'billing',
    created_at: '2025-01-15T13:00:00Z',
    updated_at: '2025-01-15T14:00:00Z',
    assigned_to: 'Support Billing',
  },
  {
    id: '3',
    ticket_number: 'SUP-2025-003',
    subject: 'Demande de fonctionnalité: Export Excel',
    description: 'Possibilité d\'exporter les rapports au format Excel',
    organization: 'Mairie de Dakar',
    organization_slug: 'mairie-dakar',
    contact_email: 'it@mairie-dakar.sn',
    contact_name: 'Service IT Mairie',
    priority: 'low',
    status: 'open',
    category: 'feature_request',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    assigned_to: null,
  },
  {
    id: '4',
    ticket_number: 'SUP-2025-004',
    subject: 'Bug: Tickets ne s\'affichent pas',
    description: 'Les tickets créés aujourd\'hui ne sont pas visibles dans la liste',
    organization: 'Hôpital Principal',
    organization_slug: 'hopital-principal',
    contact_email: 'contact@hopital.sn',
    contact_name: 'Responsable IT',
    priority: 'urgent',
    status: 'in_progress',
    category: 'bug',
    created_at: '2025-01-15T09:00:00Z',
    updated_at: '2025-01-15T15:30:00Z',
    assigned_to: 'Support Tech',
  },
  {
    id: '5',
    ticket_number: 'SUP-2025-005',
    subject: 'Question: Configuration des notifications',
    description: 'Comment configurer les notifications SMS pour les clients ?',
    organization: 'Université UCAD',
    organization_slug: 'ucad',
    contact_email: 'admin@ucad.edu.sn',
    contact_name: 'Admin UCAD',
    priority: 'medium',
    status: 'resolved',
    category: 'question',
    created_at: '2025-01-14T16:00:00Z',
    updated_at: '2025-01-15T09:00:00Z',
    assigned_to: 'Support Tech',
  },
];

const DEMO_KB_ARTICLES: KnowledgeBaseArticle[] = [
  {
    id: '1',
    title: 'Comment configurer votre premier site',
    category: 'Démarrage',
    views: 1245,
    helpful_votes: 98,
    last_updated: '2025-01-10T00:00:00Z',
  },
  {
    id: '2',
    title: 'Gérer les files d\'attente et priorités',
    category: 'Files d\'attente',
    views: 987,
    helpful_votes: 85,
    last_updated: '2025-01-08T00:00:00Z',
  },
  {
    id: '3',
    title: 'Intégration Mobile Money pour le paiement',
    category: 'Facturation',
    views: 756,
    helpful_votes: 72,
    last_updated: '2025-01-12T00:00:00Z',
  },
  {
    id: '4',
    title: 'Configurer les notifications SMS et Email',
    category: 'Notifications',
    views: 654,
    helpful_votes: 61,
    last_updated: '2025-01-05T00:00:00Z',
  },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(DEMO_TICKETS);
  const [stats] = useState<SupportStats>(DEMO_STATS);
  const [kbArticles] = useState<KnowledgeBaseArticle[]>(DEMO_KB_ARTICLES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityBadge = (priority: SupportTicket['priority']) => {
    const variants = {
      low: { label: 'Faible', className: 'bg-gray-100 text-gray-800' },
      medium: { label: 'Moyen', className: 'bg-blue-100 text-blue-800' },
      high: { label: 'Élevé', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
    };
    const { label, className } = variants[priority];
    return (
      <Badge variant="secondary" className={className}>
        {label}
      </Badge>
    );
  };

  const getStatusBadge = (status: SupportTicket['status']) => {
    const variants = {
      open: { label: 'Ouvert', className: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      in_progress: { label: 'En cours', className: 'bg-blue-100 text-blue-800', icon: Clock },
      waiting_customer: { label: 'Attente client', className: 'bg-purple-100 text-purple-800', icon: Clock },
      resolved: { label: 'Résolu', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      closed: { label: 'Fermé', className: 'bg-gray-100 text-gray-800', icon: CheckCircle },
    };
    const { label, className, icon: Icon } = variants[status];
    return (
      <Badge variant="secondary" className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getCategoryLabel = (category: SupportTicket['category']) => {
    const labels = {
      technical: 'Technique',
      billing: 'Facturation',
      feature_request: 'Fonctionnalité',
      bug: 'Bug',
      question: 'Question',
    };
    return labels[category];
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.organization.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleReply = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsReplyDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Support & Communication</h1>
        <p className="text-gray-600 mt-2">
          Gestion des tickets de support et base de connaissances
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Tickets ouverts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.open_tickets}</div>
            <div className="text-xs text-gray-500 mt-1">Nécessitent action</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Temps de réponse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avg_response_time_hours}h</div>
            <div className="text-xs text-gray-500 mt-1">Moyenne</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.satisfaction_rate}%</div>
            <div className="text-xs text-gray-500 mt-1">Clients satisfaits</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Résolus aujourd'hui
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.resolved_today}</div>
            <div className="text-xs text-gray-500 mt-1">Tickets</div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets de support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Tickets de support
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par sujet, numéro ou organisation..."
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
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="waiting_customer">Attente client</SelectItem>
                  <SelectItem value="resolved">Résolu</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute priorité</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">Élevé</SelectItem>
                  <SelectItem value="medium">Moyen</SelectItem>
                  <SelectItem value="low">Faible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTickets.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Aucun ticket trouvé
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-gray-500">{ticket.ticket_number}</span>
                      {getPriorityBadge(ticket.priority)}
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(ticket.category)}
                      </Badge>
                    </div>
                    <div className="font-semibold mb-1">{ticket.subject}</div>
                    <div className="text-sm text-gray-600 mb-2">{ticket.description}</div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {ticket.organization}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {ticket.contact_name}
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {ticket.contact_email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(ticket.created_at)}
                      </div>
                    </div>
                    {ticket.assigned_to && (
                      <div className="text-xs text-gray-500 mt-1">
                        Assigné à: <span className="font-medium">{ticket.assigned_to}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {getStatusBadge(ticket.status)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReply(ticket)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Répondre
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>
              Affichage de {filteredTickets.length} ticket(s) sur {tickets.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Base de connaissances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Articles de la base de connaissances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {kbArticles.map((article) => (
              <div
                key={article.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <Badge variant="outline" className="text-xs">
                      {article.category}
                    </Badge>
                  </div>
                  <div className="font-medium mb-2">{article.title}</div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div>{article.views.toLocaleString()} vues</div>
                    <div>{article.helpful_votes} votes positifs</div>
                    <div>MAJ: {formatDate(article.last_updated)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            <BookOpen className="h-4 w-4 mr-2" />
            Voir tous les articles
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold">Envoyer un message</div>
              <div className="text-sm text-gray-600">Communication de masse</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="font-semibold">Créer un article</div>
              <div className="text-sm text-gray-600">Base de connaissances</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="font-semibold">Chat en direct</div>
              <div className="text-sm text-gray-600">Support temps réel</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reply Dialog */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Répondre au ticket</DialogTitle>
            <DialogDescription>
              {selectedTicket && `${selectedTicket.ticket_number} - ${selectedTicket.subject}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reply">Votre réponse</Label>
              <Textarea
                id="reply"
                placeholder="Tapez votre réponse ici..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new_status">Changer le statut</Label>
              <Select defaultValue={selectedTicket?.status}>
                <SelectTrigger id="new_status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Ouvert</SelectItem>
                  <SelectItem value="in_progress">En cours</SelectItem>
                  <SelectItem value="waiting_customer">Attente client</SelectItem>
                  <SelectItem value="resolved">Résolu</SelectItem>
                  <SelectItem value="closed">Fermé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsReplyDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={() => setIsReplyDialogOpen(false)}>
                <Send className="h-4 w-4 mr-2" />
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
