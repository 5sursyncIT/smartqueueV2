'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, UserCircle, CheckCircle, XCircle, Edit, Trash2, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAgents, useCreateAgent, useUpdateAgent, useDeleteAgent, useInviteAgent } from '@/lib/hooks/use-agents';
import { AgentDialog } from '@/components/agents/agent-dialog';
import { InviteAgentDialog } from '@/components/agents/invite-agent-dialog';
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
import type { Agent, CreateAgentDto, InviteAgentDto } from '@/lib/types/resources';
import { toast } from 'sonner';

export default function AgentsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  const { data: agents, isLoading, error } = useAgents();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent(selectedAgent?.id || '');
  const deleteAgent = useDeleteAgent();
  const inviteAgent = useInviteAgent();

  const getStatusBadge = (status: 'available' | 'busy' | 'paused') => {
    const statusConfig = {
      available: { label: 'Disponible', variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      busy: { label: 'Occupé', variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800' },
      paused: { label: 'En pause', variant: 'outline' as const, className: 'bg-yellow-100 text-yellow-800' },
    };

    const config = statusConfig[status] || statusConfig.paused;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const handleAddClick = () => {
    setSelectedAgent(null);
    setDialogOpen(true);
  };

  const handleEditClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
  };

  const handleDeleteClick = (agent: Agent) => {
    setAgentToDelete(agent);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: CreateAgentDto) => {
    try {
      if (selectedAgent) {
        await updateAgent.mutateAsync(data);
        toast.success('Agent mis à jour avec succès');
      } else {
        await createAgent.mutateAsync(data);
        toast.success('Agent créé avec succès');
      }
      setDialogOpen(false);
      setSelectedAgent(null);
    } catch (error) {
      toast.error(
        selectedAgent
          ? 'Erreur lors de la mise à jour de l\'agent'
          : 'Erreur lors de la création de l\'agent'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;

    try {
      await deleteAgent.mutateAsync(agentToDelete.id);
      toast.success('Agent supprimé avec succès');
      setDeleteDialogOpen(false);
      setAgentToDelete(null);
    } catch (error) {
      toast.error('Erreur lors de la suppression de l\'agent');
    }
  };

  const handleInviteSubmit = async (data: InviteAgentDto) => {
    try {
      await inviteAgent.mutateAsync(data);
      toast.success('Agent invité avec succès');
      setInviteDialogOpen(false);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.email?.[0]
        || error?.response?.data?.error
        || 'Erreur lors de l\'invitation de l\'agent';
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agents</h1>
          <p className="text-gray-600 mt-2">
            Gérez les agents et leurs assignations aux files d'attente
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Inviter un nouvel agent
          </Button>
          <Button variant="outline" onClick={handleAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter agent existant
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{agents?.length || 0}</p>
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
                <p className="text-2xl font-bold text-green-600">
                  {agents?.filter(a => a.current_status === 'available').length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Occupés</p>
                <p className="text-2xl font-bold text-orange-600">
                  {agents?.filter(a => a.current_status === 'busy').length || 0}
                </p>
              </div>
              <UserCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En pause</p>
                <p className="text-2xl font-bold text-gray-600">
                  {agents?.filter(a => a.current_status === 'paused').length || 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des agents */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des agents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center text-gray-500 py-8">
              Chargement...
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 py-8">
              Erreur lors du chargement des agents
            </div>
          )}

          {agents && agents.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Aucun agent trouvé
            </div>
          )}

          {agents && agents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Agent
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Files assignées
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Dernière mise à jour
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <UserCircle className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {agent.user.first_name} {agent.user.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {agent.user.email}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(agent.current_status)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {agent.queues?.map((queue) => (
                          <Badge key={queue.id} variant="outline" className="text-xs">
                            {queue.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-gray-500">
                        {new Date(agent.status_updated_at).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(agent)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(agent)}
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

      <InviteAgentDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSubmit={handleInviteSubmit}
        isLoading={inviteAgent.isPending}
      />

      <AgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agent={selectedAgent}
        onSubmit={handleSubmit}
        isLoading={createAgent.isPending || updateAgent.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l&apos;agent &quot;{agentToDelete?.user?.first_name} {agentToDelete?.user?.last_name}&quot; ?
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
