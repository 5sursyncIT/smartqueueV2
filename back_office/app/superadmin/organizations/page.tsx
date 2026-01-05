'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  TrendingUp,
  Users,
  Building,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  useOrganizations,
  useSuspendOrganization,
  useActivateOrganization,
} from '@/lib/hooks/use-superadmin';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/lib/hooks/use-toast';
import { CreateOrganizationDialog } from '@/components/organizations/create-organization-dialog';

export default function OrganizationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const { toast } = useToast();
  const { data: organizations, isLoading, error } = useOrganizations();
  const suspendMutation = useSuspendOrganization();
  const activateMutation = useActivateOrganization();

  // Filtrer les organisations
  const filteredOrgs = organizations?.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && org.is_active) ||
      (statusFilter === 'suspended' && !org.is_active) ||
      (statusFilter === 'trial' && org.subscription_status?.is_trial);

    const matchesPlan = planFilter === 'all' || org.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const getPlanBadge = (plan: string) => {
    const colors = {
      trial: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      business: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-yellow-100 text-yellow-800',
    };
    return colors[plan as keyof typeof colors] || colors.trial;
  };

  const getStatusBadge = (org: any) => {
    if (!org.is_active) {
      return <Badge variant="destructive">Suspendu</Badge>;
    }
    if (org.subscription_status?.is_trial) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Trial</Badge>;
    }
    return <Badge variant="default" className="bg-green-600">Actif</Badge>;
  };

  const handleSuspend = (slug: string) => {
    setSelectedOrg(slug);
    setSuspendDialogOpen(true);
  };

  const confirmSuspend = async () => {
    if (!selectedOrg || !suspendReason.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez fournir une raison de suspension',
        variant: 'destructive',
      });
      return;
    }

    suspendMutation.mutate(
      { slug: selectedOrg, reason: suspendReason },
      {
        onSuccess: () => {
          toast({
            title: 'Organisation suspendue',
            description: 'L\'organisation a été suspendue avec succès',
          });
          setSuspendDialogOpen(false);
          setSelectedOrg(null);
          setSuspendReason('');
        },
        onError: (error: any) => {
          toast({
            title: 'Erreur',
            description: error.response?.data?.detail || 'Impossible de suspendre l\'organisation',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleActivate = async (slug: string) => {
    activateMutation.mutate(slug, {
      onSuccess: () => {
        toast({
          title: 'Organisation réactivée',
          description: 'L\'organisation a été réactivée avec succès',
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Erreur',
          description: error.response?.data?.detail || 'Impossible de réactiver l\'organisation',
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organizations</h1>
          <p className="text-gray-600 mt-2">
            {organizations?.length || 0} organisations au total
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle Organisation
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{organizations?.length || 0}</p>
              </div>
              <Building className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actives</p>
                <p className="text-2xl font-bold text-green-600">
                  {organizations?.filter((o) => o.is_active).length || 0}
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
                <p className="text-sm font-medium text-gray-600">En Trial</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {organizations?.filter((o) => o.subscription_status?.is_trial).length || 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
                <p className="text-2xl font-bold text-blue-600">
                  {organizations?.reduce((sum, o) => sum + o.members_count, 0) || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres & Recherche
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, slug ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actives</SelectItem>
                  <SelectItem value="suspended">Suspendues</SelectItem>
                  <SelectItem value="trial">En trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les plans</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center text-gray-500 py-8">Chargement...</div>
          )}

          {error && (
            <div className="text-center text-red-500 py-8">
              Erreur lors du chargement des organisations
            </div>
          )}

          {filteredOrgs && filteredOrgs.length === 0 && (
            <div className="text-center text-gray-500 py-8">Aucune organisation trouvée</div>
          )}

          {filteredOrgs && filteredOrgs.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Organisation
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Utilisation
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Créée le
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrgs.map((org) => (
                    <tr key={org.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-gray-500">{org.slug}</p>
                          {org.email && (
                            <p className="text-xs text-gray-400">{org.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getPlanBadge(org.plan)}>
                          {org.plan.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(org)}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="text-gray-500">Sites:</span> {org.sites_count}/
                            {org.max_sites}
                          </p>
                          <p>
                            <span className="text-gray-500">Agents:</span> {org.agents_count}/
                            {org.max_agents}
                          </p>
                          <p>
                            <span className="text-gray-500">Membres:</span> {org.members_count}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {format(new Date(org.created_at), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/superadmin/organizations/${org.slug}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Voir détails
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/superadmin/organizations/${org.slug}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Modifier
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {org.is_active ? (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleSuspend(org.slug)}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Suspendre
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => handleActivate(org.slug)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Réactiver
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      {/* Suspend Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspendre l'organisation</DialogTitle>
            <DialogDescription>
              Veuillez fournir une raison pour la suspension de cette organisation.
              L'organisation sera immédiatement désactivée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Raison de la suspension</Label>
              <Textarea
                id="reason"
                placeholder="Ex: Non-paiement, violation des conditions d'utilisation..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSuspendDialogOpen(false);
                setSuspendReason('');
                setSelectedOrg(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmSuspend}
              disabled={suspendMutation.isPending || !suspendReason.trim()}
            >
              {suspendMutation.isPending ? 'Suspension...' : 'Suspendre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
