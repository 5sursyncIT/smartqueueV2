'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Tablet, Eye, EyeOff, Edit, Trash2, ExternalLink, Copy, Printer } from 'lucide-react';
import { useKiosks, useDeleteKiosk, useActivateKiosk, useDeactivateKiosk } from '@/lib/hooks/use-kiosks';
import { Badge } from '@/components/ui/badge';
import type { Kiosk } from '@/lib/types/resources';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function KiosksPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [kioskToDelete, setKioskToDelete] = useState<Kiosk | null>(null);

  const currentTenant = useAuthStore((state) => state.currentTenant);
  const { data: kiosks, isLoading, error } = useKiosks();
  const deleteKiosk = useDeleteKiosk();
  const activateKiosk = useActivateKiosk();
  const deactivateKiosk = useDeactivateKiosk();

  const handleDeleteClick = (kiosk: Kiosk) => {
    setKioskToDelete(kiosk);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (kioskToDelete) {
      try {
        await deleteKiosk.mutateAsync(kioskToDelete.id);
        toast.success('Borne supprimée avec succès');
        setDeleteDialogOpen(false);
        setKioskToDelete(null);
      } catch (error) {
        toast.error('Erreur lors de la suppression de la borne');
      }
    }
  };

  const handleToggleActive = async (kiosk: Kiosk) => {
    try {
      if (kiosk.is_active) {
        await deactivateKiosk.mutateAsync(kiosk.id);
        toast.success('Borne désactivée');
      } else {
        await activateKiosk.mutateAsync(kiosk.id);
        toast.success('Borne activée');
      }
    } catch (error) {
      toast.error('Erreur lors de la modification de la borne');
    }
  };

  const getKioskUrl = (kiosk: Kiosk) => {
    const baseUrl = window.location.origin.replace('3000', '3001'); // Backend office on 3000, frontend on 3001
    return `${baseUrl}/kiosk/${kiosk.id}?tenant=${currentTenant?.slug}`;
  };

  const copyKioskUrl = (kiosk: Kiosk) => {
    const url = getKioskUrl(kiosk);
    navigator.clipboard.writeText(url);
    toast.success('URL copiée dans le presse-papiers');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des bornes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <p className="text-red-600">Erreur lors du chargement des bornes</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bornes Interactives</h1>
          <p className="text-gray-600 mt-2">
            Gérez vos bornes d&apos;accueil et leurs services
          </p>
        </div>
        {/* TODO: Add creation page first */}
        <Link href="/kiosks/new"> 
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle borne
          </Button>
        </Link>
      </div>

      {!kiosks || kiosks.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Tablet className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">Aucune borne</h3>
            <p className="text-gray-600 mb-6">
              Créez votre première borne interactive pour commencer
            </p>
            <Link href="/kiosks/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Créer une borne
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {kiosks.map((kiosk) => (
            <Card key={kiosk.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Tablet className="h-5 w-5" />
                      {kiosk.name}
                    </CardTitle>
                    <div className="mt-2 space-y-1">
                      <Badge variant={kiosk.is_active ? 'default' : 'secondary'}>
                        {kiosk.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant={kiosk.is_online ? 'success' : 'outline'} className="ml-2">
                        {kiosk.is_online ? 'En ligne' : 'Hors ligne'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Site:</span>
                    <span>{kiosk.site_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Files:</span>
                    <span>{kiosk.queue_count || kiosk.available_queues?.length || 0}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Imprimante:</span>
                    <span>{kiosk.has_printer ? 'Oui' : 'Non'}</span>
                  </div>
                  {kiosk.last_ping && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium w-24">Dernier ping:</span>
                      <span>
                        {new Date(kiosk.last_ping).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyKioskUrl(kiosk)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    URL
                  </Button>
                  <a
                    href={getKioskUrl(kiosk)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                  </a>
                  {/* TODO: Add edit page */}
                  {/* <Link href={`/kiosks/${kiosk.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                  </Link> */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(kiosk)}
                  >
                    {kiosk.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Activer
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteClick(kiosk)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la borne &quot;{kioskToDelete?.name}&quot; ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
