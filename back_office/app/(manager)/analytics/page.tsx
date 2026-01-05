'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Star,
  Activity,
  RefreshCw,
  Target,
  ThumbsUp,
} from 'lucide-react';
import { AdvancedMetricsCard } from '@/components/intelligence/advanced-metrics-card';
import { HeatmapChart } from '@/components/intelligence/heatmap-chart';
import {
  useQueuesOverview,
  useAbandonmentRate,
  useAgentUtilization,
  useSLACompliance,
  useCSAT,
  useHourlyHeatmap,
  useDailyTrends,
} from '@/lib/hooks/use-queue-intelligence';

export default function AdvancedAnalyticsPage() {
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(7);

  const { data: overview, refetch: refetchOverview } = useQueuesOverview(60000);

  // Select first queue by default
  const queueId = selectedQueueId || overview?.queues[0]?.id || '';

  const { data: abandonmentData, refetch: refetchAbandonment } = useAbandonmentRate(queueId, periodDays);
  const { data: utilizationData, refetch: refetchUtilization } = useAgentUtilization(queueId, periodDays);
  const { data: slaData, refetch: refetchSLA } = useSLACompliance(queueId, periodDays);
  const { data: csatData, refetch: refetchCSAT } = useCSAT(queueId, 30);
  const { data: heatmapData, refetch: refetchHeatmap } = useHourlyHeatmap(queueId, periodDays);
  const { data: trendsData } = useDailyTrends(queueId, 30);

  const selectedQueue = overview?.queues.find((q) => q.id === queueId);

  const handleRefresh = () => {
    refetchOverview();
    refetchAbandonment();
    refetchUtilization();
    refetchSLA();
    refetchCSAT();
    refetchHeatmap();
  };

  const isLoading = !overview || !abandonmentData || !utilizationData || !slaData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Analytics Avancés
          </h1>
          <p className="text-gray-600 mt-2">
            KPIs détaillés, tendances et analyse de performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Queue Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sélection de la File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {overview?.queues.map((queue) => (
              <Button
                key={queue.id}
                variant={queueId === queue.id ? 'default' : 'outline'}
                onClick={() => setSelectedQueueId(queue.id)}
              >
                {queue.name}
                <Badge variant="secondary" className="ml-2">
                  {queue.waiting_count} en attente
                </Badge>
              </Button>
            ))}
          </div>

          {/* Period Selector */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Période:</span>
            {[7, 14, 30].map((days) => (
              <Button
                key={days}
                variant={periodDays === days ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriodDays(days)}
              >
                {days} jours
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedQueue && (
        <>
          {/* Queue Info Banner */}
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              <strong>{selectedQueue.name}</strong> - Algorithme: {selectedQueue.algorithm} |
              Santé: {selectedQueue.health_score}/100 |
              {selectedQueue.alerts_count > 0 && ` ${selectedQueue.alerts_count} alerte(s)`}
            </AlertDescription>
          </Alert>

          {/* Key Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <AdvancedMetricsCard
              title="Taux d'Abandon"
              description="Tickets non traités"
              value={abandonmentData?.abandonment_rate || 0}
              format="percentage"
              target={10}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={abandonmentData && abandonmentData.abandonment_rate < 10 ? 'up' : 'down'}
            />

            <AdvancedMetricsCard
              title="Conformité SLA"
              description="Tickets dans les délais"
              value={slaData?.compliance_rate || 0}
              format="percentage"
              target={90}
              icon={<Target className="h-5 w-5" />}
              trend={slaData && slaData.compliance_rate >= 90 ? 'up' : 'down'}
            />

            <AdvancedMetricsCard
              title="Utilisation Agents"
              description="Taux d'occupation moyen"
              value={utilizationData?.overall_utilization_rate || 0}
              format="percentage"
              target={80}
              icon={<Users className="h-5 w-5" />}
            />

            <AdvancedMetricsCard
              title="CSAT Moyen"
              description="Satisfaction client (1-5)"
              value={csatData?.average_csat || null}
              unit="/5"
              target={4}
              icon={<Star className="h-5 w-5" />}
              trend={csatData && csatData.average_csat && csatData.average_csat >= 4 ? 'up' : 'neutral'}
            />
          </div>

          {/* Detailed Metrics Row */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Abandonment Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Détails Abandon
                </CardTitle>
                <CardDescription>Sur {abandonmentData?.period_days} jours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total tickets:</span>
                    <span className="font-semibold">{abandonmentData?.total_tickets || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Abandonnés:</span>
                    <span className="font-semibold text-orange-600">
                      {abandonmentData?.abandoned_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Taux:</span>
                    <span className="font-semibold text-lg">
                      {abandonmentData?.abandonment_rate.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SLA Compliance Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Conformité SLA
                </CardTitle>
                <CardDescription>Sur {slaData?.period_days} jours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">SLA cible:</span>
                    <span className="font-semibold">{slaData && Math.floor(slaData.sla_seconds / 60)}min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Conformes:</span>
                    <span className="font-semibold text-green-600">
                      {slaData?.compliant_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Non conformes:</span>
                    <span className="font-semibold text-red-600">
                      {slaData?.non_compliant_count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Taux:</span>
                    <span className="font-semibold text-lg">
                      {slaData?.compliance_rate.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CSAT/NPS Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-blue-600" />
                  Satisfaction Client
                </CardTitle>
                <CardDescription>Sur {csatData?.period_days} jours</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">CSAT moyen:</span>
                    <span className="font-semibold">
                      {csatData?.average_csat?.toFixed(2) || 'N/A'}/5
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">NPS Score:</span>
                    <span className="font-semibold text-lg">
                      {csatData?.nps_score.toFixed(0) || 0}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Promoteurs: {csatData?.promoters_count || 0}</div>
                    <div>Passifs: {csatData?.passives_count || 0}</div>
                    <div>Détracteurs: {csatData?.detractors_count || 0}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total feedbacks:</span>
                    <span className="font-semibold">{csatData?.total_feedback || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent Utilization Table */}
          {utilizationData && utilizationData.agents_data.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Utilisation des Agents
                </CardTitle>
                <CardDescription>
                  Taux d'utilisation moyen: {utilizationData.overall_utilization_rate.toFixed(1)}% |
                  Temps de service moyen: {Math.floor(utilizationData.average_service_seconds / 60)}min
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-2">Agent</th>
                        <th className="pb-2 text-right">Tickets traités</th>
                        <th className="pb-2 text-right">Temps service</th>
                        <th className="pb-2 text-right">Utilisation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utilizationData.agents_data.map((agent) => (
                        <tr key={agent.agent_id} className="border-b">
                          <td className="py-2">{agent.agent_name}</td>
                          <td className="py-2 text-right">{agent.tickets_served}</td>
                          <td className="py-2 text-right">
                            {Math.floor(agent.total_service_seconds / 3600)}h
                            {Math.floor((agent.total_service_seconds % 3600) / 60)}min
                          </td>
                          <td className="py-2 text-right">
                            <Badge
                              variant={agent.utilization_rate >= 80 ? 'default' : 'secondary'}
                            >
                              {agent.utilization_rate.toFixed(1)}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hourly Heatmap */}
          {heatmapData && <HeatmapChart data={heatmapData} />}

          {/* Daily Trends Chart */}
          {trendsData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-600" />
                  Tendances Quotidiennes
                </CardTitle>
                <CardDescription>
                  Évolution des tickets et temps de traitement sur {trendsData.period_days} jours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      Graphiques de tendances (tickets, temps d'attente, temps de service) à implémenter
                      avec une bibliothèque de charts (ex: Recharts, Chart.js)
                    </AlertDescription>
                  </Alert>

                  <div className="text-xs text-gray-500">
                    Données disponibles:
                    <ul className="list-disc list-inside mt-2">
                      <li>{trendsData.tickets_trend.length} points de données pour les tickets</li>
                      <li>{trendsData.wait_time_trend.length} points pour le temps d'attente</li>
                      <li>{trendsData.service_time_trend.length} points pour le temps de service</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedQueue && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Aucune file disponible. Créez une file pour voir les analytics.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
