'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Building2, MapPin, Clock, Edit, Trash2 } from 'lucide-react';
import { useSites, useCreateSite, useUpdateSite, useDeleteSite } from '@/lib/hooks/use-sites';
import { Badge } from '@/components/ui/badge';
import { SiteDialog } from '@/components/sites/site-dialog';
import type { Site, CreateSiteDto } from '@/lib/types/resources';
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
import { useQueues } from '@/lib/hooks/use-queues';

export default function SitesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  const { data: sites, isLoading, error } = useSites();
  const { data: queues } = useQueues();
  const createSite = useCreateSite();
  const updateSite = useUpdateSite(selectedSite?.id || '');
  const deleteSite = useDeleteSite();

  const handleAddClick = () => {
    setSelectedSite(null);
    setDialogOpen(true);
  };

  const handleEditClick = (site: Site) => {
    setSelectedSite(site);
    setDialogOpen(true);
  };

  const handleDeleteClick = (site: Site) => {
    setSiteToDelete(site);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: CreateSiteDto) => {
    if (selectedSite) {
      await updateSite.mutateAsync(data);
      toast.success('Site mis à jour avec succès');
    } else {
      await createSite.mutateAsync(data);
      toast.success('Site créé avec succès');
    }
  };

  const handleConfirmDelete = async () => {
    if (siteToDelete) {
      try {
        await deleteSite.mutateAsync(siteToDelete.id);
        toast.success('Site supprimé avec succès');
        setDeleteDialogOpen(false);
        setSiteToDelete(null);
      } catch (error) {
        toast.error('Erreur lors de la suppression du site');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sites</h1>
          <p className="text-gray-600 mt-2">
            Gérez vos agences et leurs configurations
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un site
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des sites</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center text-gray-500 py-8">
              Chargement...
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 py-8">
              Erreur lors du chargement des sites
            </div>
          )}

          {sites && sites.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Aucun site trouvé
            </div>
          )}

          {sites && sites.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sites.map((site) => (
                <Card key={site.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{site.name}</CardTitle>
                          <p className="text-sm text-gray-500">{site.slug}</p>
                        </div>
                      </div>
                      <Badge variant={site.is_active ? 'default' : 'secondary'}>
                        {site.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {site.address && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>
                          {site.address}
                          {site.city && `, ${site.city}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{site.timezone}</span>
                    </div>
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-500 mb-3">
                        {queues?.filter(q => q.site?.id === site.id).length || 0} file(s) d'attente
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(site)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(site)}
                          className="flex-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SiteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        site={selectedSite}
        onSubmit={handleSubmit}
        isLoading={createSite.isPending || updateSite.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le site &quot;{siteToDelete?.name}&quot; ?
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
