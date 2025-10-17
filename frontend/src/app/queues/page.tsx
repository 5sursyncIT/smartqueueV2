'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, MapPin, Activity } from 'lucide-react';
import apiClient from '@/lib/api/client';

interface Queue {
  id: string;
  name: string;
  service: string | null;
  site: string | null;
  waiting_count: number;
  estimated_service_seconds: number;
  max_capacity: number | null;
  status: string;
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState<string>('demo-bank'); // Default tenant

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/public/tenants/${tenantSlug}/queues/`);
      setQueues(response.data.queues || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching queues:', err);
      setError('Impossible de charger les files d\'attente. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatWaitTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des files d'attente...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Erreur</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchQueues} className="w-full">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Files d'attente disponibles</h1>
              <p className="text-gray-600 mt-2">Choisissez une file et obtenez votre ticket</p>
            </div>
            <Link href="/">
              <Button variant="outline">Retour à l'accueil</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {queues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Aucune file d'attente disponible pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {queues.map((queue) => (
              <Card key={queue.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{queue.name}</CardTitle>
                      {queue.service && (
                        <CardDescription className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {queue.service}
                        </CardDescription>
                      )}
                    </div>
                    {queue.status === 'active' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Actif
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-4">
                    {queue.site && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm">{queue.site}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-900">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {queue.waiting_count} {queue.waiting_count > 1 ? 'personnes' : 'personne'} en attente
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">
                        Temps d'attente estimé: {formatWaitTime(queue.waiting_count * queue.estimated_service_seconds)}
                      </span>
                    </div>
                  </div>

                  <Link href={`/queues/${queue.id}/join`}>
                    <Button className="w-full">
                      Rejoindre cette file
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
