'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ListTodo, Clock, Users, Edit, Trash2 } from 'lucide-react';
import { useQueues, useCreateQueue, useUpdateQueue, useDeleteQueue } from '@/lib/hooks/use-queues';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { QueueDialog } from '@/components/queues/queue-dialog';
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
import type { Queue, CreateQueueDto } from '@/lib/types/resources';
import { toast } from 'sonner';

export default function QueuesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [queueToDelete, setQueueToDelete] = useState<Queue | null>(null);

  const { data: queues, isLoading, error } = useQueues();
  const createQueue = useCreateQueue();
  const updateQueue = useUpdateQueue(selectedQueue?.id || '');
  const deleteQueue = useDeleteQueue();

  const handleAddClick = () => {
    setSelectedQueue(null);
    setDialogOpen(true);
  };

  const handleEditClick = (queue: Queue) => {
    setSelectedQueue(queue);
    setDialogOpen(true);
  };

  const handleDeleteClick = (queue: Queue) => {
    setQueueToDelete(queue);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: CreateQueueDto) => {
    try {
      if (selectedQueue) {
        await updateQueue.mutateAsync(data);
        toast.success('File d\'attente mise à jour avec succès');
      } else {
        await createQueue.mutateAsync(data);
        toast.success('File d\'attente créée avec succès');
      }
      setDialogOpen(false);
      setSelectedQueue(null);
    } catch (error) {
      toast.error(
        selectedQueue
          ? 'Erreur lors de la mise à jour de la file d\'attente'
          : 'Erreur lors de la création de la file d\'attente'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!queueToDelete) return;

    try {
      await deleteQueue.mutateAsync(queueToDelete.id);
      toast.success('File d\'attente supprimée avec succès');
      setDeleteDialogOpen(false);
      setQueueToDelete(null);
    } catch (error) {
      toast.error('Erreur lors de la suppression de la file d\'attente');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Files d'attente</h1>
          <p className="text-gray-600 mt-2">
            Gérez et surveillez les files d'attente en temps réel
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Créer une file
        </Button>
      </div>

      {/* Overview stats */}
      {queues && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{queues.length}</p>
                </div>
                <ListTodo className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Actives</p>
                  <p className="text-2xl font-bold text-green-600">
                    {queues.filter(q => q.status === 'active').length}
                  </p>
                </div>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">En attente total</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {queues.reduce((sum, q) => sum + q.waiting_count, 0)}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Toutes les files d'attente</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center text-gray-500 py-8">
              Chargement...
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 py-8">
              Erreur lors du chargement des files d'attente
            </div>
          )}

          {queues && queues.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Aucune file d'attente trouvée
            </div>
          )}

          {queues && queues.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      File d'attente
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Site
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Algorithme
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      En attente
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
                  {queues.map((queue) => (
                    <tr key={queue.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <ListTodo className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div>
                            <Link
                              href={`/queues/${queue.id}`}
                              className="font-medium hover:text-blue-600"
                            >
                              {queue.name}
                            </Link>
                            <p className="text-sm text-gray-500">{queue.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{queue.service.name}</p>
                          <p className="text-xs text-gray-500">
                            SLA: {Math.floor(queue.service.sla_seconds / 60)}min
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {queue.site ? (
                          <div>
                            <p className="text-sm">{queue.site.name}</p>
                            <p className="text-xs text-gray-500">{queue.site.city}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {queue.algorithm === 'fifo' ? 'FIFO' :
                           queue.algorithm === 'priority' ? 'Priorité' : 'SLA'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center space-x-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-lg font-bold">{queue.waiting_count}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            queue.status === 'active' ? 'default' :
                            queue.status === 'paused' ? 'secondary' : 'outline'
                          }
                        >
                          {queue.status === 'active' ? 'Active' :
                           queue.status === 'paused' ? 'Pause' : 'Fermée'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/queues/${queue.id}`}>
                              Détails
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(queue)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(queue)}
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

      <QueueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        queue={selectedQueue}
        onSubmit={handleSubmit}
        isLoading={createQueue.isPending || updateQueue.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la file d&apos;attente &quot;{queueToDelete?.name}&quot; ?
              Cette action est irréversible et supprimera tous les tickets associés.
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
