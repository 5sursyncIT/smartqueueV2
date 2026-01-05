'use client';

import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at?: string;
}

interface SecurityAlertsProps {
  alerts: SecurityAlert[];
  loading: boolean;
  onResolve: (alertId: string) => Promise<void>;
}

const SEVERITY_CONFIG = {
  low: { color: 'bg-blue-500', icon: AlertTriangle },
  medium: { color: 'bg-yellow-500', icon: AlertTriangle },
  high: { color: 'bg-orange-500', icon: AlertTriangle },
  critical: { color: 'bg-red-500', icon: AlertTriangle },
};

export function SecurityAlerts({ alerts, loading, onResolve }: SecurityAlertsProps) {
  const unresolved = alerts.filter((a) => a.status === 'open');

  if (unresolved.length === 0) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <AlertTriangle className="h-5 w-5" />
          Alertes de Sécurité ({unresolved.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {unresolved.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG];
          const Icon = config?.icon || AlertTriangle;

          return (
            <Alert key={alert.id} className="relative">
              <Icon className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {alert.title}
                <Badge className={config?.color || 'bg-gray-500'}>
                  {alert.severity}
                </Badge>
              </AlertTitle>
              <AlertDescription className="mt-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p>{alert.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(alert.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve(alert.id)}
                    disabled={loading}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Résoudre
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}
