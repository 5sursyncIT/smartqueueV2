'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building,
  Ticket,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { usePlatformAnalytics } from '@/lib/hooks/use-superadmin';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const { data: analytics, isLoading } = usePlatformAnalytics(timeRange);

  // Valeurs par défaut pendant le chargement
  const stats = analytics || {
    total_organizations: 0,
    active_organizations: 0,
    total_users: 0,
    total_agents: 0,
    total_sites: 0,
    total_tickets_today: 0,
    total_tickets_month: 0,
    avg_wait_time_minutes: 0,
    revenue_month: 0,
    revenue_growth: 0,
  };
  const growth = analytics?.organization_growth || [];
  const topOrgs = analytics?.top_organizations || [];

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (!num || isNaN(num)) return '0';
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const safeCalculate = (numerator: number, denominator: number, decimals: number = 1) => {
    if (!denominator || denominator === 0 || isNaN(numerator) || isNaN(denominator)) {
      return 0;
    }
    return Math.round((numerator / denominator) * Math.pow(10, decimals)) / Math.pow(10, decimals);
  };

  const maxGrowthCount = growth.length > 0 ? Math.max(...growth.map(g => g.count)) : 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics de la plateforme</h1>
          <p className="text-gray-600 mt-2">
            Vue d'ensemble des performances et statistiques globales
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="90d">90 derniers jours</SelectItem>
            <SelectItem value="1y">1 an</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Organisations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_organizations}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Activity className="h-3 w-3 mr-1" />
                {stats.active_organizations} actives
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Utilisateurs totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(stats.total_users)}</div>
            <div className="text-sm text-gray-500 mt-2">
              dont {stats.total_agents} agents
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Tickets ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatNumber(stats.total_tickets_month)}</div>
            <div className="text-sm text-gray-500 mt-2">
              {formatNumber(stats.total_tickets_today)} aujourd'hui
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Temps d'attente moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avg_wait_time_minutes} min</div>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <TrendingDown className="h-4 w-4" />
              <span>-2.3 min vs mois dernier</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenus et croissance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenus mensuels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {formatPrice(stats.revenue_month)}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{stats.revenue_growth}% vs mois dernier
              </Badge>
            </div>
            <div className="mt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Revenus annuels estimés</span>
                <span className="font-semibold">{formatPrice(stats.revenue_month * 12)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Revenu moyen par org</span>
                <span className="font-semibold">
                  {formatPrice(Math.round(stats.revenue_month / stats.active_organizations))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Croissance des organisations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {growth.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.month}</span>
                    <span className="font-semibold">{item.count} orgs</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(item.count / maxGrowthCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activité par site */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Répartition des sites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <div className="text-4xl font-bold text-blue-600">{stats.total_sites}</div>
              <div className="text-sm text-gray-600 mt-2">Sites totaux</div>
            </div>
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="text-4xl font-bold text-green-600">
                {safeCalculate(stats.total_sites, stats.total_organizations)}
              </div>
              <div className="text-sm text-gray-600 mt-2">Sites par organisation</div>
            </div>
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <div className="text-4xl font-bold text-purple-600">
                {safeCalculate(stats.total_agents, stats.total_sites)}
              </div>
              <div className="text-sm text-gray-600 mt-2">Agents par site</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top organisations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top 5 des organisations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topOrgs.map((org, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{org.name}</div>
                    <div className="text-sm text-gray-600">
                      {formatNumber(org.tickets_count)} tickets traités
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-semibold">{formatPrice(org.revenue || 0)}</div>
                    <div className="text-xs text-gray-500">Revenu mensuel</div>
                  </div>
                  <div className="text-right min-w-[80px]">
                    {!isNaN(org.growth) && org.growth >= 0 ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{org.growth}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {org.growth}%
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance globale */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Taux de satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">92%</div>
            <div className="text-sm text-gray-500 mt-2">
              Basé sur 2,345 évaluations
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tickets par agent/jour
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">43</div>
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span>+8% vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Disponibilité système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">99.97%</div>
            <div className="text-sm text-gray-500 mt-2">
              30 derniers jours
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
