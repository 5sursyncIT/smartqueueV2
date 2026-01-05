'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DollarSign,
  Users,
  Calendar,
  Percent,
  Target,
  Zap,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { usePayments } from '@/lib/api/superadmin/billing';
import { useOrganizations } from '@/lib/api/superadmin/use-superadmin';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function BillingAnalyticsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: organizations = [], isLoading: orgsLoading } = useOrganizations();

  const isLoading = paymentsLoading || orgsLoading;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculer le MRR (Monthly Recurring Revenue)
  const calculateMRR = () => {
    const activeOrgs = organizations.filter(org => org.subscription?.status === 'active');

    return activeOrgs.reduce((total, org) => {
      const sub = org.subscription;
      if (!sub) return total;

      // Convertir en MRR selon le cycle de facturation
      if (sub.billing_period === 'yearly') {
        return total + (sub.amount / 12);
      }
      return total + sub.amount;
    }, 0);
  };

  // Calculer l'ARR (Annual Recurring Revenue)
  const calculateARR = () => {
    return calculateMRR() * 12;
  };

  // Calculer le Churn Rate (taux de désabonnement)
  const calculateChurnRate = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeLastMonth = organizations.filter(org => {
      const createdAt = new Date(org.created_at);
      return createdAt < lastMonth && org.subscription?.status === 'active';
    }).length;

    const churnedThisMonth = organizations.filter(org => {
      const sub = org.subscription;
      return sub?.status === 'cancelled' &&
             sub.cancelled_at &&
             new Date(sub.cancelled_at) >= thisMonth;
    }).length;

    return activeLastMonth > 0 ? (churnedThisMonth / activeLastMonth) * 100 : 0;
  };

  // Calculer l'ARPU (Average Revenue Per User)
  const calculateARPU = () => {
    const activeOrgs = organizations.filter(org => org.subscription?.status === 'active');
    return activeOrgs.length > 0 ? calculateMRR() / activeOrgs.length : 0;
  };

  // Calculer la LTV (Lifetime Value)
  const calculateLTV = () => {
    const churnRate = calculateChurnRate();
    const arpu = calculateARPU();

    if (churnRate === 0) return arpu * 36; // 3 ans par défaut

    const avgLifetimeMonths = 100 / churnRate; // 1 / (churn_rate / 100)
    return arpu * avgLifetimeMonths;
  };

  // Générer les données de revenus mensuels pour le graphique
  const generateMonthlyRevenueData = () => {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });

      // Filtrer les paiements du mois
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.created_at);
        return paymentDate.getMonth() === date.getMonth() &&
               paymentDate.getFullYear() === date.getFullYear() &&
               p.status === 'succeeded';
      });

      const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const count = monthPayments.length;

      months.push({
        month: monthName,
        revenue: revenue,
        count: count,
        mrr: calculateMRR(), // Simplification - devrait être historique
      });
    }

    return months;
  };

  // Répartition par plan
  const getPlanDistribution = () => {
    const distribution: Record<string, number> = {};

    organizations.forEach(org => {
      if (org.subscription?.status === 'active') {
        const plan = org.subscription.plan_name || 'Unknown';
        distribution[plan] = (distribution[plan] || 0) + 1;
      }
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value,
      percentage: organizations.length > 0 ? (value / organizations.length * 100).toFixed(1) : 0,
    }));
  };

  // Évolution du nombre de clients
  const getCustomerGrowth = () => {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'short' });

      const activeCount = organizations.filter(org => {
        const createdAt = new Date(org.created_at);
        return createdAt < nextDate &&
               (org.subscription?.status === 'active' || org.subscription?.status === 'trial');
      }).length;

      const newCount = organizations.filter(org => {
        const createdAt = new Date(org.created_at);
        return createdAt >= date && createdAt < nextDate;
      }).length;

      months.push({
        month: monthName,
        total: activeCount,
        new: newCount,
      });
    }

    return months;
  };

  const mrr = calculateMRR();
  const arr = calculateARR();
  const churnRate = calculateChurnRate();
  const arpu = calculateARPU();
  const ltv = calculateLTV();

  // Variation MRR (simulée - devrait comparer avec le mois précédent)
  const mrrGrowth = 12.5;
  const arrGrowth = 15.3;

  const monthlyData = generateMonthlyRevenueData();
  const planDistribution = getPlanDistribution();
  const customerGrowth = getCustomerGrowth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics de Facturation</h1>
          <p className="text-gray-600 mt-2">
            Métriques SaaS et indicateurs de performance
          </p>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="90d">90 derniers jours</SelectItem>
            <SelectItem value="12m">12 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                MRR
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {mrrGrowth}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatPrice(mrr)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Revenu mensuel récurrent
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ARR */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                ARR
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {arrGrowth}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatPrice(arr)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Revenu annuel récurrent
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Churn Rate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Churn Rate
              </span>
              {churnRate < 5 ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Excellent
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  À surveiller
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {churnRate.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Taux de désabonnement
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ARPU */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              ARPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatPrice(arpu)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Revenu moyen par utilisateur
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPIs Secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LTV */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Target className="h-4 w-4" />
              LTV (Lifetime Value)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatPrice(ltv)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Valeur vie client
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Clients actifs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Clients Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {organizations.filter(o => o.subscription?.status === 'active').length}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Organisations avec abonnement actif
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Taux de conversion trial */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversion Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(() => {
                    const trials = organizations.filter(o => o.subscription?.status === 'trial').length;
                    const converted = organizations.filter(o => o.subscription?.status === 'active').length;
                    const total = trials + converted;
                    return total > 0 ? ((converted / total) * 100).toFixed(1) : 0;
                  })()}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Du trial vers payant
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution du MRR */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution du MRR</CardTitle>
            <CardDescription>Revenue mensuel récurrent sur 12 mois</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatPrice(Number(value))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Revenus"
                  />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="MRR"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Répartition par plan */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Plan</CardTitle>
            <CardDescription>Distribution des organisations par plan d'abonnement</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Croissance des clients */}
        <Card>
          <CardHeader>
            <CardTitle>Croissance des Clients</CardTitle>
            <CardDescription>Évolution du nombre de clients sur 12 mois</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={customerGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#3b82f6" name="Total actifs" />
                  <Bar dataKey="new" fill="#10b981" name="Nouveaux" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenus par mois */}
        <Card>
          <CardHeader>
            <CardTitle>Revenus Mensuels</CardTitle>
            <CardDescription>Montant et nombre de transactions par mois</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip formatter={(value) => formatPrice(Number(value))} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Revenus" />
                  <Bar yAxisId="right" dataKey="count" fill="#f59e0b" name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
