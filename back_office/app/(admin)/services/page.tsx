'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Briefcase, Clock, Edit, Trash2 } from 'lucide-react';
import { useQueues } from '@/lib/hooks/use-queues';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/lib/hooks/use-services';
import { Badge } from '@/components/ui/badge';
import { ServiceDialog } from '@/components/services/service-dialog';
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
import type { Service, CreateServiceDto } from '@/lib/types/resources';
import { toast } from 'sonner';

export default function ServicesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const { data: services, isLoading, error } = useServices();
  const { data: queues } = useQueues();
  const createService = useCreateService();
  const updateService = useUpdateService(selectedService?.id || '');
  const deleteService = useDeleteService();

  const formatSlaTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  };

  const handleAddClick = () => {
    setSelectedService(null);
    setDialogOpen(true);
  };

  const handleEditClick = (service: Service) => {
    setSelectedService(service);
    setDialogOpen(true);
  };

  const handleDeleteClick = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: CreateServiceDto) => {
    try {
      if (selectedService) {
        await updateService.mutateAsync(data);
        toast.success('Service mis à jour avec succès');
      } else {
        await createService.mutateAsync(data);
        toast.success('Service créé avec succès');
      }
      setDialogOpen(false);
      setSelectedService(null);
    } catch (error) {
      toast.error(
        selectedService
          ? 'Erreur lors de la mise à jour du service'
          : 'Erreur lors de la création du service'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;

    try {
      await deleteService.mutateAsync(serviceToDelete.id);
      toast.success('Service supprimé avec succès');
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    } catch (error) {
      toast.error('Erreur lors de la suppression du service');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-gray-600 mt-2">
            Gérez les services proposés par votre organisation
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un service
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des services</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center text-gray-500 py-8">
              Chargement...
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 py-8">
              Erreur lors du chargement des services
            </div>
          )}

          {services && services.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Aucun service trouvé
            </div>
          )}

          {services && services.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      SLA
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Files d'attente
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Briefcase className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{service.name}</p>
                            <p className="text-sm text-gray-500">{service.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatSlaTime(service.sla_seconds)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {queues?.filter(q => q.service?.id === service.id).length || 0} file(s)
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={service.is_active ? 'default' : 'secondary'}>
                          {service.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(service)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(service)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Supprimer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={selectedService}
        onSubmit={handleSubmit}
        isLoading={createService.isPending || updateService.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le service &quot;{serviceToDelete?.name}&quot; ?
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
