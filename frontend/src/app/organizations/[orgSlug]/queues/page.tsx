'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, MapPin, Activity, ArrowLeft, Building2 } from 'lucide-react';
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

interface OrganizationInfo {
  name: string;
  slug: string;
}

export default function OrganizationQueuesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [queues, setQueues] = useState<Queue[]>([]);
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQueues();
  }, [orgSlug]);

  const fetchQueues = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get(`/public/tenants/${orgSlug}/queues/`);
      setQueues(response.data.queues || []);

      // Extraire les infos de l'organisation depuis la réponse
      setOrgInfo({
        name: response.data.tenant_name || formatOrgName(orgSlug),
        slug: orgSlug,
      });

      setError(null);
    } catch (err: any) {
      console.error('Error fetching queues:', err);
      setError('Impossible de charger les files d\'attente de cette organisation.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatOrgName = (slug: string): string => {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
            <div className="space-y-2">
              <Button onClick={fetchQueues} className="w-full">
                Réessayer
              </Button>
              <Link href="/organizations" className="block">
                <Button variant="outline" className="w-full">
                  Retour aux organisations
                </Button>
              </Link>
            </div>
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
          <Link
            href="/organizations"
            className="inline-flex items-center text-sm text-blue-600 hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour aux organisations
          </Link>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {orgInfo?.name || formatOrgName(orgSlug)}
              </h1>
              <p className="text-gray-600 mt-2">
                Choisissez une file d'attente et obtenez votre ticket
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {queues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Aucune file d'attente disponible pour le moment.
              </p>
              <p className="text-sm text-gray-500">
                Veuillez réessayer plus tard ou contacter l'établissement.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Files actives</p>
                      <p className="text-2xl font-bold text-gray-900">{queues.length}</p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total en attente</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {queues.reduce((sum, q) => sum + q.waiting_count, 0)}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Temps moyen</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatWaitTime(
                          Math.floor(
                            queues.reduce((sum, q) => sum + (q.waiting_count * q.estimated_service_seconds), 0) /
                            Math.max(queues.reduce((sum, q) => sum + q.waiting_count, 0), 1)
                          )
                        )}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Queues grid */}
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
                          Temps estimé: {formatWaitTime(queue.waiting_count * queue.estimated_service_seconds)}
                        </span>
                      </div>
                    </div>

                    <Link href={`/organizations/${orgSlug}/queues/${queue.id}/join`}>
                      <Button className="w-full">
                        Rejoindre cette file
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
