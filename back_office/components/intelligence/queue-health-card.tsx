'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, TrendingUp, Users, Clock } from 'lucide-react';
import { QueueOverviewItem } from '@/lib/hooks/use-queue-intelligence';

interface QueueHealthCardProps {
  queue: QueueOverviewItem;
  onClick?: () => void;
}

export function QueueHealthCard({ queue, onClick }: QueueHealthCardProps) {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'good':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'critical':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getAlgorithmBadge = (algorithm: string) => {
    const variants = {
      fifo: { label: 'FIFO', variant: 'default' as const },
      priority: { label: 'Priorité', variant: 'secondary' as const },
      sla: { label: 'SLA', variant: 'outline' as const },
    };
    const config = variants[algorithm as keyof typeof variants] || variants.fifo;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md border-2 ${getHealthColor(
        queue.health_status
      )}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <span>{getHealthIcon(queue.health_status)}</span>
            <span>{queue.name}</span>
          </CardTitle>
          {getAlgorithmBadge(queue.algorithm)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Score de santé */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600">Score de santé</span>
              <span className="text-2xl font-bold">{queue.health_score}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  queue.health_score >= 80
                    ? 'bg-green-500'
                    : queue.health_score >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${queue.health_score}%` }}
              />
            </div>
          </div>

          {/* Métriques */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">En attente</p>
                <p className="text-lg font-semibold">{queue.waiting_count}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">En service</p>
                <p className="text-lg font-semibold">{queue.in_service_count}</p>
              </div>
            </div>
          </div>

          {/* Alertes */}
          {queue.alerts_count > 0 && (
            <Alert variant={queue.critical_alerts > 0 ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {queue.alerts_count} alerte{queue.alerts_count > 1 ? 's' : ''}
                {queue.critical_alerts > 0 && ` (${queue.critical_alerts} critique${queue.critical_alerts > 1 ? 's' : ''})`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
