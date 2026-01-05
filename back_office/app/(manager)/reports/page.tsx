'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, BarChart3, TrendingUp, Clock, Users, Loader2 } from 'lucide-react';
import { useDashboardStats } from '@/lib/hooks/use-stats';
import { useQueues } from '@/lib/hooks/use-queues';

export default function ReportsPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: queues } = useQueues();

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return '< 1 min';
    return `${minutes} min`;
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rapports</h1>
          <p className="text-gray-600 mt-2">
            Consultez les statistiques et exportez les rapports d'activité
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      {/* Indicateurs clés */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tickets traités</p>
                <p className="text-2xl font-bold">{stats?.completedToday || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Aujourd'hui</p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Temps d'attente moyen</p>
                <p className="text-2xl font-bold">{formatDuration(stats?.avgWaitTime || null)}</p>
                <p className="text-xs text-gray-500 mt-1">Aujourd'hui</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux de satisfaction</p>
                <p className="text-2xl font-bold">-</p>
                <p className="text-xs text-gray-500 mt-1">Bientôt disponible</p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agents actifs</p>
                <p className="text-2xl font-bold">{stats?.availableAgents || 0}</p>
                <p className="text-xs text-gray-600 mt-1">Sur {stats?.totalAgents || 0} agents</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rapports disponibles */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Temps d'attente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Analyse détaillée des temps d'attente par file, service et période
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Moyenne globale:</span>
                <span className="font-semibold">{formatDuration(stats?.avgWaitTime || null)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Médiane:</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Max:</span>
                <span className="font-semibold">-</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" disabled>
              Voir le rapport complet
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance des agents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Statistiques de performance par agent et équipe
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tickets/agent/jour:</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Temps moyen/ticket:</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Taux d'occupation:</span>
                <span className="font-semibold">
                  {stats?.totalAgents ? Math.round((stats.busyAgents / stats.totalAgents) * 100) : 0}%
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" disabled>
              Voir le rapport complet
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statistiques des files</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Volume et performance par file d'attente
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Files actives:</span>
                <span className="font-semibold">{stats?.activeQueues || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tickets en attente:</span>
                <span className="font-semibold">{stats?.waitingTickets || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">File la plus chargée:</span>
                <span className="font-semibold">
                  {queues && queues.length > 0 ? queues[0].name : '-'}
                </span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" disabled>
              Voir le rapport complet
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Satisfaction client</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Analyse CSAT et NPS avec commentaires clients
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Score CSAT:</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">NPS:</span>
                <span className="font-semibold">-</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Feedbacks reçus:</span>
                <span className="font-semibold">-</span>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4" disabled>
              Voir le rapport complet
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Exports rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Exports rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Button variant="outline" className="w-full" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export CSV - Aujourd'hui
            </Button>
            <Button variant="outline" className="w-full" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export CSV - Cette semaine
            </Button>
            <Button variant="outline" className="w-full" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export CSV - Ce mois
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Fonctionnalité d'export bientôt disponible
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
