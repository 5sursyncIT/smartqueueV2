'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDashboard, useMonitoring } from '@/lib/hooks/use-superadmin';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  ArrowRight,
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const { data: dashboard, isLoading: dashboardLoading } = useDashboard(60000);
  const { data: monitoring } = useMonitoring(30000);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  const data = dashboard || {
    mrr: 0,
    mrr_growth: 0,
    total_organizations: 0,
    active_organizations: 0,
    orgs_this_month: 0,
    total_users: 0,
    total_agents: 0,
    churn_rate: 0,
    churn_growth: 0,
    tickets_today: 0,
    tickets_month: 0,
    avg_wait_time_minutes: 0,
    satisfaction_rate: 0,
    satisfaction_count: 0,
    uptime_percentage: 0,
    alerts: [],
  };

  const alerts = data.alerts;
  const services = monitoring?.services || [];

  const getSeverityStyle = (severity: 'urgent' | 'warning' | 'info') => {
    switch (severity) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'info':
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getSeverityLabel = (severity: 'urgent' | 'warning' | 'info') => {
    switch (severity) {
      case 'urgent':
        return 'Urgent';
      case 'warning':
        return 'Attention';
      case 'info':
        return 'Info';
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Super Admin</h1>
        <p className="text-gray-600 mt-2">
          Vue d'ensemble de la plateforme SmartQueue SaaS
        </p>
      </div>

      {/* KPIs principaux */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatPrice(data.mrr)}</div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {data.mrr_growth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={data.mrr_growth >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                {data.mrr_growth >= 0 ? '+' : ''}{data.mrr_growth}%
              </span>
              <span className="text-gray-500">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Organisations
            </CardTitle>
            <Building2 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.total_organizations}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{data.orgs_this_month} ce mois
              </Badge>
              <span className="text-sm text-gray-500">{data.active_organizations} actives</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Utilisateurs
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.total_users}</div>
            <div className="text-sm text-gray-500 mt-2">
              dont <span className="font-semibold text-gray-700">{data.total_agents} agents</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Taux de churn
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.churn_rate}%</div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {data.churn_growth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-red-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-600" />
              )}
              <span className={data.churn_growth >= 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                {data.churn_growth >= 0 ? '+' : ''}{data.churn_growth}%
              </span>
              <span className="text-gray-500">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques activité */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Tickets ce mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tickets_month.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">{data.tickets_today.toLocaleString()} aujourd'hui</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Temps d'attente moy.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avg_wait_time_minutes} min</div>
            <div className="text-xs text-gray-500 mt-1">
              Temps moyen d'attente
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Taux de satisfaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.satisfaction_rate}%</div>
            <div className="text-xs text-gray-500 mt-1">{data.satisfaction_count} évaluations</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Disponibilité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.uptime_percentage}%</div>
            <div className="text-xs text-gray-500 mt-1">30 derniers jours</div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes & System Health */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Alertes & Actions Requises
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{alert.description}</p>
                    {alert.action && (
                      <Link href={alert.link || '#'}>
                        <Button variant="link" className="h-auto p-0 mt-1 text-xs">
                          {alert.action}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`${getSeverityStyle(alert.severity)} text-xs`}
                  >
                    {getSeverityLabel(alert.severity)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              État du Système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.length > 0 ? (
                services.map((service, idx) => {
                  const isHealthy = service.status === 'healthy';
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {isHealthy ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">{service.name}</span>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={isHealthy ? "bg-green-100 text-green-800 text-xs" : "bg-red-100 text-red-800 text-xs"}
                      >
                        {isHealthy ? 'Healthy' : service.status}
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-gray-500 py-4">Aucun service surveillé</div>
              )}

              <div className="pt-3 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Uptime (30 jours)</span>
                  <span className="font-semibold text-green-600">{data.uptime_percentage}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Liens rapides */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/superadmin/organizations">
          <Card className="hover:border-blue-300 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">Gérer les organisations</p>
                  <p className="text-sm text-gray-500">Créer, suspendre, activer</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/superadmin/subscriptions">
          <Card className="hover:border-purple-300 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">Plans d'abonnement</p>
                  <p className="text-sm text-gray-500">Gérer les plans et tarifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/superadmin/billing">
          <Card className="hover:border-green-300 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold">Facturation</p>
                  <p className="text-sm text-gray-500">Paiements et factures</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
