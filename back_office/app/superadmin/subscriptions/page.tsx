'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
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
  Plus,
  Edit,
  Check,
  TrendingUp,
  Users,
  Zap,
  Crown,
  Loader2,
  Trash2,
  Search,
  Filter,
  Download,
  Copy,
  Clock,
  Calendar,
} from 'lucide-react';
import {
  useSubscriptionPlans,
  useSubscriptionPlansStats,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useDeleteSubscriptionPlan,
  type SubscriptionPlan,
} from '@/lib/api/superadmin/subscriptions';
import {
  SubscriptionPlanForm,
  type SubscriptionPlanFormData,
} from '@/components/superadmin/subscription-plan-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// Données de démo
const DEMO_PLANS: SubscriptionPlan[] = [
  {
    id: '1',
    name: 'Essential',
    slug: 'essential',
    description: 'Idéal pour les petites structures qui débutent',
    monthly_price: '15000.00',
    yearly_price: '150000.00',
    currency: 'XOF',
    features: [
      '1 site',
      'Jusqu\'à 5 agents',
      '3 files d\'attente',
      '500 tickets/mois',
      'Support email',
      'Rapports basiques',
    ],
    max_sites: 1,
    max_agents: 5,
    max_queues: 3,
    max_tickets_per_month: 500,
    is_active: true,
    display_order: 0,
    organizations_count: 12,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Professional',
    slug: 'professional',
    description: 'Pour les entreprises en croissance',
    monthly_price: '45000.00',
    yearly_price: '450000.00',
    currency: 'XOF',
    features: [
      'Jusqu\'à 5 sites',
      'Jusqu\'à 20 agents',
      '10 files d\'attente',
      '2000 tickets/mois',
      'Support prioritaire',
      'Rapports avancés',
      'Notifications SMS',
      'API access',
    ],
    max_sites: 5,
    max_agents: 20,
    max_queues: 10,
    max_tickets_per_month: 2000,
    is_active: true,
    display_order: 1,
    organizations_count: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Solution complète pour grandes organisations',
    monthly_price: '120000.00',
    yearly_price: '1200000.00',
    currency: 'XOF',
    features: [
      'Sites illimités',
      'Agents illimités',
      'Files d\'attente illimitées',
      'Tickets illimités',
      'Support dédié 24/7',
      'Rapports personnalisés',
      'Notifications multi-canal',
      'API illimitée',
      'Intégrations personnalisées',
      'SLA garanti',
    ],
    max_sites: null,
    max_agents: null,
    max_queues: null,
    max_tickets_per_month: null,
    is_active: true,
    display_order: 2,
    organizations_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function SubscriptionsPage() {
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const { data: stats, isLoading: statsLoading } = useSubscriptionPlansStats();
  const createPlan = useCreateSubscriptionPlan();
  const updatePlan = useUpdateSubscriptionPlan();
  const deletePlan = useDeleteSubscriptionPlan();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<SubscriptionPlan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [duplicatingPlan, setDuplicatingPlan] = useState<SubscriptionPlan | null>(null);
  const itemsPerPage = 9; // 3 colonnes x 3 lignes

  const isLoading = plansLoading || statsLoading;

  // Filtrer les plans
  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && plan.is_active) ||
      (statusFilter === 'inactive' && !plan.is_active);

    return matchesSearch && matchesStatus;
  });

  // Calculs pour la pagination
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlans = filteredPlans.slice(startIndex, endIndex);

  // Réinitialiser la page lors d'un changement de filtre
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: 'all' | 'active' | 'inactive') => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleCreatePlan = async (data: SubscriptionPlanFormData) => {
    try {
      await createPlan.mutateAsync(data);
      setCreateDialogOpen(false);
      toast.success('Plan créé avec succès!', {
        description: `Le plan ${data.name} a été créé et est maintenant disponible.`,
      });
    } catch (error: any) {
      toast.error('Erreur lors de la création', {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  const handleUpdatePlan = async (data: SubscriptionPlanFormData) => {
    if (!editingPlan) return;

    try {
      await updatePlan.mutateAsync({
        id: editingPlan.slug,
        ...data,
      });
      setEditingPlan(null);
      toast.success('Plan mis à jour!', {
        description: `Les modifications du plan ${data.name} ont été enregistrées.`,
      });
    } catch (error: any) {
      toast.error('Erreur lors de la mise à jour', {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  const handleDeletePlan = async () => {
    if (!deletingPlan) return;

    try {
      await deletePlan.mutateAsync(deletingPlan.slug);
      const planName = deletingPlan.name;
      setDeletingPlan(null);
      toast.success('Plan supprimé', {
        description: `Le plan ${planName} a été supprimé définitivement.`,
      });
    } catch (error: any) {
      toast.error('Erreur lors de la suppression', {
        description: error.response?.data?.detail || error.message,
      });
    }
  };

  const handleDuplicatePlan = (plan: SubscriptionPlan) => {
    // Créer une copie du plan avec un nouveau nom et slug
    const duplicatedPlan: SubscriptionPlan = {
      ...plan,
      name: `${plan.name} (copie)`,
      slug: `${plan.slug}-copy-${Date.now()}`,
      is_active: false, // Désactiver par défaut
      display_order: plan.display_order,
      organizations_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setDuplicatingPlan(duplicatedPlan);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Il y a quelques secondes';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)}j`;
    if (diffInSeconds < 31536000) return `Il y a ${Math.floor(diffInSeconds / 2592000)} mois`;
    return `Il y a ${Math.floor(diffInSeconds / 31536000)} an(s)`;
  };

  const exportToCSV = () => {
    // Préparer les données CSV
    const headers = [
      'Nom',
      'Slug',
      'Description',
      'Prix mensuel (XOF)',
      'Prix annuel (XOF)',
      'Sites max',
      'Agents max',
      'Files max',
      'Tickets/mois max',
      'Actif',
      'Ordre d\'affichage',
      'Organisations',
    ];

    const rows = filteredPlans.map((plan) => [
      plan.name,
      plan.slug,
      plan.description,
      plan.monthly_price,
      plan.yearly_price,
      plan.max_sites === null ? 'Illimité' : plan.max_sites,
      plan.max_agents === null ? 'Illimité' : plan.max_agents,
      plan.max_queues === null ? 'Illimité' : plan.max_queues,
      plan.max_tickets_per_month === null ? 'Illimité' : plan.max_tickets_per_month,
      plan.is_active ? 'Oui' : 'Non',
      plan.display_order,
      plan.organizations_count,
    ]);

    // Créer le contenu CSV
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    // Télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `plans-abonnement-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export réussi!', {
      description: `${filteredPlans.length} plan(s) exporté(s) au format CSV.`,
    });
  };

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'essential':
        return <Zap className="h-8 w-8" />;
      case 'professional':
        return <TrendingUp className="h-8 w-8" />;
      case 'enterprise':
        return <Crown className="h-8 w-8" />;
      default:
        return <Users className="h-8 w-8" />;
    }
  };

  const getPlanColor = (slug: string) => {
    switch (slug) {
      case 'essential':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'professional':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'enterprise':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plans d'abonnement</h1>
          <p className="text-gray-600 mt-2">
            Gérez les plans et tarifs pour vos organisations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={plans.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter CSV
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau plan
          </Button>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Plans actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <div className="text-2xl font-bold">{stats?.active_plans ?? 0}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Organisations abonnées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <div className="text-2xl font-bold">
                {plans.reduce((sum, p) => sum + p.organizations_count, 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenu mensuel estimé
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <div className="text-2xl font-bold">
                {formatPrice(stats?.total_monthly_revenue ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Plan le plus populaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {plans.sort((a, b) => b.organizations_count - a.organizations_count)[0]?.name}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche et filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un plan par nom, description ou slug..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les plans</SelectItem>
                  <SelectItem value="active">Plans actifs</SelectItem>
                  <SelectItem value="inactive">Plans inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {filteredPlans.length !== plans.length && (
            <div className="mt-3 text-sm text-gray-600">
              {filteredPlans.length} plan(s) trouvé(s) sur {plans.length}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liste des plans */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Chargement des plans...</span>
        </div>
      ) : filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <Search className="h-12 w-12 mx-auto mb-3" />
            </div>
            <p className="text-gray-600 font-medium">Aucun plan trouvé</p>
            <p className="text-sm text-gray-500 mt-1">
              Essayez d'ajuster vos critères de recherche ou de filtrage
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paginatedPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative border-2 ${getPlanColor(plan.slug)}`}
          >
            {plan.slug === 'professional' && (
              <div className="absolute top-4 right-4">
                <Badge variant="default" className="bg-purple-600">
                  Populaire
                </Badge>
              </div>
            )}

            <CardHeader>
              <div className={`inline-flex p-3 rounded-lg ${getPlanColor(plan.slug)}`}>
                {getPlanIcon(plan.slug)}
              </div>
              <CardTitle className="text-2xl mt-4">{plan.name}</CardTitle>
              <CardDescription className="text-sm">
                {plan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Prix */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    {formatPrice(parseFloat(plan.monthly_price))}
                  </span>
                  <span className="text-gray-600">/mois</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  ou {formatPrice(parseFloat(plan.yearly_price))}/an
                  <span className="text-green-600 ml-1">
                    (économisez {Math.round((1 - parseFloat(plan.yearly_price) / (parseFloat(plan.monthly_price) * 12)) * 100)}%)
                  </span>
                </div>
              </div>

              {/* Limites */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sites</span>
                  <span className="font-medium">
                    {plan.max_sites === null ? 'Illimité' : plan.max_sites}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Agents</span>
                  <span className="font-medium">
                    {plan.max_agents === null ? 'Illimité' : plan.max_agents}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Files d'attente</span>
                  <span className="font-medium">
                    {plan.max_queues === null ? 'Illimité' : plan.max_queues}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tickets/mois</span>
                  <span className="font-medium">
                    {plan.max_tickets_per_month === null
                      ? 'Illimité'
                      : plan.max_tickets_per_month.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Fonctionnalités */}
              <div className="space-y-2">
                <div className="font-semibold text-sm">Fonctionnalités incluses:</div>
                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Organisations abonnées */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Organisations</span>
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {plan.organizations_count}
                  </Badge>
                </div>
              </div>

              {/* Historique */}
              <div className="pt-3 border-t text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-1" title={formatDate(plan.created_at)}>
                  <Calendar className="h-3 w-3" />
                  <span>Créé {getTimeSince(plan.created_at)}</span>
                </div>
                {plan.created_at !== plan.updated_at && (
                  <div className="flex items-center gap-1" title={formatDate(plan.updated_at)}>
                    <Clock className="h-3 w-3" />
                    <span>Modifié {getTimeSince(plan.updated_at)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingPlan(plan)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDuplicatePlan(plan)}
                  title="Dupliquer"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setDeletingPlan(plan)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Afficher uniquement certaines pages pour éviter trop de liens
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      {/* Dialog de création/édition */}
      <SubscriptionPlanForm
        open={createDialogOpen || editingPlan !== null || duplicatingPlan !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingPlan(null);
            setDuplicatingPlan(null);
          }
        }}
        plan={editingPlan || duplicatingPlan}
        onSubmit={editingPlan ? handleUpdatePlan : handleCreatePlan}
        isLoading={createPlan.isPending || updatePlan.isPending}
      />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog
        open={deletingPlan !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingPlan(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le plan{' '}
              <strong>{deletingPlan?.name}</strong>? Cette action est irréversible.
              {deletingPlan && deletingPlan.organizations_count > 0 && (
                <span className="text-red-600 block mt-2">
                  ⚠️ Attention: {deletingPlan.organizations_count} organisation(s)
                  utilisent actuellement ce plan.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePlan.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={deletePlan.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePlan.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
