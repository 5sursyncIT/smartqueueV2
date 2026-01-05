'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  TrendingUp,
  Users,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Zap,
  BarChart3,
} from 'lucide-react';
import { QueueHealthCard } from '@/components/intelligence/queue-health-card';
import {
  useQueuesOverview,
  useLoadBalance,
  useOptimizationReport,
} from '@/lib/hooks/use-queue-intelligence';

export default function IntelligencePage() {
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  const {
    data: overview,
    isLoading: isLoadingOverview,
    refetch: refetchOverview,
  } = useQueuesOverview(30000); // Refresh toutes les 30s

  const {
    data: loadBalance,
    isLoading: isLoadingBalance,
  } = useLoadBalance(60000); // Refresh toutes les 60s

  const {
    data: optimizationReport,
    isLoading: isLoadingOptimization,
    refetch: refetchOptimization,
  } = useOptimizationReport();

  const isLoading = isLoadingOverview || isLoadingBalance || isLoadingOptimization;

  const getBalanceStatusColor = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'needs_balancing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Intelligence des Files
          </h1>
          <p className="text-gray-600 mt-2">
            Gestion intelligente avec analytics temps réel et optimisation automatique
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetchOverview();
            refetchOptimization();
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* KPIs Globaux */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Files Actives</p>
                <p className="text-2xl font-bold">{overview?.total_queues || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avec Alertes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {overview?.queues_with_alerts || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Équilibre</p>
                <p className="text-2xl font-bold">{loadBalance?.balance_score.toFixed(0) || 0}/100</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Optimisations</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(optimizationReport?.summary.total_transfer_suggestions || 0) +
                    (optimizationReport?.summary.total_agent_suggestions || 0)}
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* État de l'équilibre */}
      {loadBalance && (
        <Card className={`border-2 ${getBalanceStatusColor(loadBalance.status)}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Équilibre de Charge
            </CardTitle>
            <CardDescription>
              Score actuel : {loadBalance.balance_score.toFixed(1)}/100 -{' '}
              {loadBalance.status === 'optimal'
                ? 'Système équilibré ✓'
                : loadBalance.status === 'needs_balancing'
                ? 'Rééquilibrage recommandé'
                : 'Action urgente nécessaire !'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Total en attente : <strong>{loadBalance.total_waiting_tickets}</strong> tickets
              </div>
              <div className="text-sm text-gray-600">
                Ratio de charge max : <strong>{loadBalance.max_load_ratio.toFixed(1)}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grille des files */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Santé des Files</h2>
        {isLoadingOverview && (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        )}
        {overview && overview.queues.length === 0 && (
          <div className="text-center py-8 text-gray-500">Aucune file active</div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {overview?.queues.map((queue) => (
            <QueueHealthCard
              key={queue.id}
              queue={queue}
              onClick={() => setSelectedQueueId(queue.id)}
            />
          ))}
        </div>
      </div>

      {/* Suggestions d'optimisation */}
      {optimizationReport && optimizationReport.summary.total_transfer_suggestions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Suggestions d'Optimisation
              <Badge variant="secondary">
                {optimizationReport.summary.total_transfer_suggestions}
              </Badge>
            </CardTitle>
            <CardDescription>Transferts recommandés pour équilibrer les files</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizationReport.transfer_suggestions.slice(0, 5).map((suggestion, idx) => (
                <Alert key={idx}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-xl">{getPriorityIcon(suggestion.priority)}</span>
                      <div>
                        <AlertDescription className="font-medium">
                          Ticket {suggestion.ticket_number}
                        </AlertDescription>
                        <p className="text-sm text-gray-600 mt-1">
                          <strong>{suggestion.from_queue.name}</strong>
                          <ArrowRight className="inline h-4 w-4 mx-2" />
                          <strong>{suggestion.to_queue.name}</strong>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
                        <p className="text-xs text-green-600 mt-1">
                          ⏱️ Économie estimée : ~{suggestion.estimated_time_saved_minutes.toFixed(1)} min
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Appliquer
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions de réallocation d'agents */}
      {optimizationReport && optimizationReport.summary.total_agent_suggestions > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Réallocation d'Agents
              <Badge variant="secondary">
                {optimizationReport.summary.total_agent_suggestions}
              </Badge>
            </CardTitle>
            <CardDescription>Agents à déplacer pour optimiser la capacité</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizationReport.agent_reallocation_suggestions.map((suggestion, idx) => (
                <Alert key={idx}>
                  <div className="flex items-start justify-between">
                    <div>
                      <AlertDescription className="font-medium">
                        {suggestion.agent_name}
                      </AlertDescription>
                      <p className="text-sm text-gray-600 mt-1">
                        {suggestion.from_queue && (
                          <>
                            <strong>{suggestion.from_queue.name}</strong>
                            <ArrowRight className="inline h-4 w-4 mx-2" />
                          </>
                        )}
                        <strong>{suggestion.to_queue.name}</strong>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{suggestion.reason}</p>
                      <p className="text-xs text-purple-600 mt-1">
                        Impact : {suggestion.impact_score.toFixed(0)}/100
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      Appliquer
                    </Button>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
