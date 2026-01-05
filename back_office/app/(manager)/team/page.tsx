'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCircle, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react';
import { useAgents } from '@/lib/hooks/use-agents';

export default function TeamPage() {
  const { data: agents, isLoading } = useAgents();

  const getStatusBadge = (status: string) => {
    const config = {
      available: { label: 'Disponible', variant: 'default' as const, icon: CheckCircle, color: 'text-green-500' },
      busy: { label: 'Occupé', variant: 'secondary' as const, icon: Clock, color: 'text-orange-500' },
      paused: { label: 'En pause', variant: 'outline' as const, icon: Clock, color: 'text-gray-500' },
      offline: { label: 'Hors ligne', variant: 'outline' as const, icon: XCircle, color: 'text-gray-400' },
    };

    return config[status as keyof typeof config] || config.offline;
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      agent: 'Agent',
      manager: 'Manager',
      admin: 'Administrateur',
    };
    return roles[role] || role;
  };

  // Calculate stats from agents data
  const totalAgents = agents?.length || 0;
  const availableCount = agents?.filter(a => a.current_status === 'available').length || 0;
  const busyCount = agents?.filter(a => a.current_status === 'busy').length || 0;
  const pausedCount = agents?.filter(a => a.current_status === 'paused').length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Équipe</h1>
        <p className="text-gray-600 mt-2">
          Suivez l'activité de votre équipe en temps réel
        </p>
      </div>

      {/* Stats d'équipe */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total membres</p>
                <p className="text-2xl font-bold">{totalAgents}</p>
              </div>
              <UserCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disponibles</p>
                <p className="text-2xl font-bold text-green-600">{availableCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En service</p>
                <p className="text-2xl font-bold text-orange-600">{busyCount}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En pause</p>
                <p className="text-2xl font-bold text-gray-600">{pausedCount}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des membres */}
      <Card>
        <CardHeader>
          <CardTitle>Membres de l'équipe</CardTitle>
        </CardHeader>
        <CardContent>
          {!agents || agents.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <UserCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun membre d'équipe trouvé</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => {
                const statusConfig = getStatusBadge(agent.current_status);
                const StatusIcon = statusConfig.icon;

                return (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="p-3 bg-blue-100 rounded-full">
                        <UserCircle className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="font-semibold">
                            {agent.user.first_name} {agent.user.last_name}
                          </h3>
                          <Badge variant="outline">Agent</Badge>
                          <div className="flex items-center space-x-1">
                            <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                            <Badge variant={statusConfig.variant}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                        </div>
                        {agent.queues && agent.queues.length > 0 && (
                          <p className="text-sm text-gray-600">
                            Files: {agent.queues.map(q => q.name).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-lg">-</p>
                        <p className="text-xs text-gray-500">Tickets aujourd'hui</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg">-</p>
                        <p className="text-xs text-gray-500">Temps moyen</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance de l'équipe */}
      <Card>
        <CardHeader>
          <CardTitle>Performance d'équipe - Aujourd'hui</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Tickets traités</p>
              <p className="text-3xl font-bold">-</p>
              <p className="text-xs text-gray-500 mt-1">Bientôt disponible</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Temps moyen par ticket</p>
              <p className="text-3xl font-bold">-</p>
              <p className="text-xs text-gray-500 mt-1">Bientôt disponible</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Taux d'occupation</p>
              <p className="text-3xl font-bold">
                {totalAgents > 0 ? Math.round((busyCount / totalAgents) * 100) : 0}%
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {busyCount} agent{busyCount > 1 ? 's' : ''} en service
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
