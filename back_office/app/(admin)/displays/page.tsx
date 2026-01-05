'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Monitor, Eye, EyeOff, Edit, Trash2, ExternalLink, Copy } from 'lucide-react';
import { useDisplays, useDeleteDisplay, useActivateDisplay, useDeactivateDisplay } from '@/lib/hooks/use-displays';
import { Badge } from '@/components/ui/badge';
import type { Display } from '@/lib/types/resources';
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

export default function DisplaysPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [displayToDelete, setDisplayToDelete] = useState<Display | null>(null);

  const currentTenant = useAuthStore((state) => state.currentTenant);
  const { data: displays, isLoading, error } = useDisplays();
  const deleteDisplay = useDeleteDisplay();
  const activateDisplay = useActivateDisplay();
  const deactivateDisplay = useDeactivateDisplay();

  const handleDeleteClick = (display: Display) => {
    setDisplayToDelete(display);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (displayToDelete) {
      try {
        await deleteDisplay.mutateAsync(displayToDelete.id);
        toast.success('Écran supprimé avec succès');
        setDeleteDialogOpen(false);
        setDisplayToDelete(null);
      } catch (error) {
        toast.error('Erreur lors de la suppression de l\'écran');
      }
    }
  };

  const handleToggleActive = async (display: Display) => {
    try {
      if (display.is_active) {
        await deactivateDisplay.mutateAsync(display.id);
        toast.success('Écran désactivé');
      } else {
        await activateDisplay.mutateAsync(display.id);
        toast.success('Écran activé');
      }
    } catch (error) {
      toast.error('Erreur lors de la modification de l\'écran');
    }
  };

  const getDisplayUrl = (display: Display) => {
    const baseUrl = window.location.origin.replace('3000', '3001'); // Backend office on 3000, frontend on 3001
    return `${baseUrl}/display/${display.id}?tenant=${currentTenant?.slug}`;
  };

  const copyDisplayUrl = (display: Display) => {
    const url = getDisplayUrl(display);
    navigator.clipboard.writeText(url);
    toast.success('URL copiée dans le presse-papiers');
  };

  const getDisplayTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      main: 'Principal',
      counter: 'Guichet',
      waiting: 'Salle d\'attente',
    };
    return labels[type] || type;
  };

  const getLayoutLabel = (layout: string) => {
    const labels: Record<string, string> = {
      split: 'Divisé (Split)',
      modern: 'Moderne',
      grid: 'Grille',
      list: 'Liste',
      fullscreen: 'Plein écran',
    };
    return labels[layout] || layout;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des écrans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8">
        <p className="text-red-600">Erreur lors du chargement des écrans</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Écrans d&apos;affichage</h1>
          <p className="text-gray-600 mt-2">
            Gérez vos écrans d&apos;affichage et leur personnalisation
          </p>
        </div>
        <Link href="/displays/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel écran
          </Button>
        </Link>
      </div>

      {!displays || displays.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Monitor className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">Aucun écran</h3>
            <p className="text-gray-600 mb-6">
              Créez votre premier écran d&apos;affichage pour commencer
            </p>
            <Link href="/displays/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Créer un écran
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displays.map((display) => (
            <Card key={display.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      {display.name}
                    </CardTitle>
                    <div className="mt-2 space-y-1">
                      <Badge variant={display.is_active ? 'default' : 'secondary'}>
                        {display.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Badge variant="outline" className="ml-2">
                        {getDisplayTypeLabel(display.display_type)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Site:</span>
                    <span>{display.site_name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Layout:</span>
                    <span>{getLayoutLabel(display.layout)}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="font-medium w-24">Files:</span>
                    <span>{display.queue_count || display.queues?.length || 0}</span>
                  </div>
                  {display.last_ping && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium w-24">Dernier ping:</span>
                      <span>
                        {new Date(display.last_ping).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                  {display.custom_message && (
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                      <span className="font-medium">Message:</span>
                      <p className="mt-1 text-gray-700 line-clamp-2">
                        {display.custom_message}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyDisplayUrl(display)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copier URL
                  </Button>
                  <a
                    href={getDisplayUrl(display)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Voir
                    </Button>
                  </a>
                  <Link href={`/displays/${display.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-1" />
                      Modifier
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(display)}
                  >
                    {display.is_active ? (
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
                    onClick={() => handleDeleteClick(display)}
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
              Êtes-vous sûr de vouloir supprimer l&apos;écran &quot;{displayToDelete?.name}&quot; ?
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
