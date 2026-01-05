'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Users,
  Building,
  LayoutGrid,
  Activity,
  CreditCard,
  Ban,
  CheckCircle,
  Edit,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';
import {
  useOrganization,
  useOrganizationStats,
} from '@/lib/hooks/use-superadmin';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function OrganizationDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: org, isLoading, error } = useOrganization(slug);
  const { data: stats } = useOrganizationStats(slug);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Organisation introuvable</p>
          <Link href="/superadmin/organizations">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la liste
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getPlanBadge = (plan: string) => {
    const colors = {
      trial: 'bg-gray-100 text-gray-800',
      starter: 'bg-blue-100 text-blue-800',
      business: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-yellow-100 text-yellow-800',
    };
    return colors[plan as keyof typeof colors] || colors.trial;
  };

  const getStatusBadge = () => {
    if (!org.is_active) {
      return <Badge variant="destructive">Suspendu</Badge>;
    }
    if (org.subscription_status?.is_trial) {
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-700">
          Trial
        </Badge>
      );
    }
    return <Badge variant="default" className="bg-green-600">Actif</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/superadmin/organizations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{org.name}</h1>
              {getStatusBadge()}
              <Badge className={getPlanBadge(org.plan)}>
                {org.plan.toUpperCase()}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">{org.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/superadmin/organizations/${slug}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </Link>
          {org.is_active ? (
            <Button variant="destructive">
              <Ban className="mr-2 h-4 w-4" />
              Suspendre
            </Button>
          ) : (
            <Button variant="default" className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="mr-2 h-4 w-4" />
              Réactiver
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Membres</p>
                  <p className="text-2xl font-bold">{stats.members}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sites</p>
                  <p className="text-2xl font-bold">
                    {stats.sites}/{org.max_sites}
                  </p>
                </div>
                <Building className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Agents</p>
                  <p className="text-2xl font-bold">
                    {stats.agents}/{org.max_agents}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Files d'attente</p>
                  <p className="text-2xl font-bold">
                    {stats.queues}/{org.max_queues}
                  </p>
                </div>
                <LayoutGrid className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Nom de l'organisation</p>
              <p className="text-base">{org.name}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Nom de la société</p>
              <p className="text-base">{org.company_name || 'Non renseigné'}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Slug</p>
              <p className="text-base font-mono text-sm">{org.slug}</p>
            </div>

            <Separator />

            {org.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <a href={`mailto:${org.email}`} className="text-blue-600 hover:underline">
                  {org.email}
                </a>
              </div>
            )}

            {org.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <p>{org.phone}</p>
              </div>
            )}

            {org.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {org.website}
                </a>
              </div>
            )}

            {org.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-500 mt-1" />
                <p className="text-sm">{org.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abonnement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Abonnement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Plan actuel</p>
              <Badge className={getPlanBadge(org.plan)}>{org.plan.toUpperCase()}</Badge>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Statut</p>
              {getStatusBadge()}
            </div>

            {org.subscription_status && (
              <>
                {org.subscription_status.is_trial && org.trial_ends_at && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Fin de la période d'essai</p>
                    <p className="text-base">
                      {format(new Date(org.trial_ends_at), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}

                {org.subscription_status.current_period_end && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Prochaine facturation</p>
                    <p className="text-base">
                      {format(
                        new Date(org.subscription_status.current_period_end),
                        'dd MMMM yyyy',
                        { locale: fr }
                      )}
                    </p>
                  </div>
                )}
              </>
            )}

            <Separator />

            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Limites</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Sites maximum</span>
                  <span className="font-medium">{org.max_sites}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Agents maximum</span>
                  <span className="font-medium">{org.max_agents}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Files d'attente maximum</span>
                  <span className="font-medium">{org.max_queues}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Rétention des données</p>
              <p className="text-base">{org.data_retention_days} jours</p>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Langue</span>
              <span className="text-base">{org.locale.toUpperCase()}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Fuseau horaire</span>
              <span className="text-base">{org.timezone}</span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Créée le</span>
              <span className="text-base">
                {format(new Date(org.created_at), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Dernière mise à jour</span>
              <span className="text-base">
                {format(new Date(org.updated_at), 'dd MMMM yyyy', { locale: fr })}
              </span>
            </div>

            {!org.is_active && org.suspended_at && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-red-600 mb-1">Suspendu le</p>
                  <p className="text-base">
                    {format(new Date(org.suspended_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
                {org.suspension_reason && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-1">Raison</p>
                    <p className="text-sm text-gray-700">{org.suspension_reason}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Statistiques d'utilisation */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Statistiques d'utilisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Tickets au total</span>
                <span className="text-base font-bold">{stats.tickets_total}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Tickets en attente</span>
                <span className="text-base font-bold text-yellow-600">{stats.tickets_pending}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">Traités aujourd'hui</span>
                <span className="text-base font-bold text-green-600">
                  {stats.tickets_completed_today}
                </span>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Utilisation des ressources</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Sites</span>
                      <span>
                        {stats.sites}/{org.max_sites}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${(stats.sites / org.max_sites) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Agents</span>
                      <span>
                        {stats.agents}/{org.max_agents}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(stats.agents / org.max_agents) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Files d'attente</span>
                      <span>
                        {stats.queues}/{org.max_queues}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{ width: `${(stats.queues / org.max_queues) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
