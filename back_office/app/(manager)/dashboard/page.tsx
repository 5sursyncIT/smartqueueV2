'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, CheckCircle, ListTodo, TrendingUp } from 'lucide-react';
import { useQueues } from '@/lib/hooks/use-queues';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function DashboardPage() {
  const { data: queues, isLoading } = useQueues();

  // Calculer les statistiques
  const totalWaiting = queues?.reduce((sum, q) => sum + q.waiting_count, 0) || 0;
  const activeQueues = queues?.filter(q => q.status === 'active').length || 0;
  const totalQueues = queues?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Vue d'ensemble de l'activité en temps réel
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Tickets en attente</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold">--</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{totalWaiting}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Dans toutes les files
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Files d'attente actives</CardTitle>
            <ListTodo className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-2xl font-bold">--</div>
            ) : (
              <>
                <div className="text-2xl font-bold">{activeQueues} / {totalQueues}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {totalQueues > 0 ? Math.round((activeQueues / totalQueues) * 100) : 0}% actives
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Taux de service</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-green-600 mt-1">
              +3% vs hier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Tickets traités</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-gray-500 mt-1">
              Aujourd'hui
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Queues list */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Files d'attente</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center h-40 text-gray-400">
                Chargement...
              </div>
            )}

            {queues && queues.length === 0 && (
              <div className="flex items-center justify-center h-40 text-gray-400">
                Aucune file d'attente
              </div>
            )}

            {queues && queues.length > 0 && (
              <div className="space-y-3">
                {queues.slice(0, 5).map((queue) => (
                  <Link
                    key={queue.id}
                    href={`/queues/${queue.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{queue.name}</p>
                      <p className="text-sm text-gray-500">{queue.service.name}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant={queue.status === 'active' ? 'default' : 'secondary'}>
                        {queue.status === 'active' ? 'Active' :
                         queue.status === 'paused' ? 'Pause' : 'Fermée'}
                      </Badge>
                      <div className="text-right">
                        <p className="text-xl font-bold">{queue.waiting_count}</p>
                        <p className="text-xs text-gray-500">en attente</p>
                      </div>
                    </div>
                  </Link>
                ))}
                {queues.length > 5 && (
                  <Link
                    href="/queues"
                    className="block text-center text-sm text-blue-600 hover:text-blue-700 pt-2"
                  >
                    Voir toutes les files ({queues.length})
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center h-40 text-gray-400">
                Chargement...
              </div>
            )}

            {queues && (
              <div className="space-y-3">
                {Array.from(new Set(queues.map(q => q.service.id)))
                  .slice(0, 5)
                  .map((serviceId) => {
                    const service = queues.find(q => q.service.id === serviceId)?.service;
                    const serviceQueues = queues.filter(q => q.service.id === serviceId);
                    const totalWaiting = serviceQueues.reduce((sum, q) => sum + q.waiting_count, 0);

                    return service ? (
                      <div
                        key={serviceId}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-gray-500">
                            {serviceQueues.length} file(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{totalWaiting}</p>
                          <p className="text-xs text-gray-500">en attente</p>
                        </div>
                      </div>
                    ) : null;
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
