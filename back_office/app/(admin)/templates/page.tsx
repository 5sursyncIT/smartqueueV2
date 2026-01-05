'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Mail, MessageSquare, Bell, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTemplates, useCreateTemplate, useUpdateTemplate, useDeleteTemplate } from '@/lib/hooks/use-templates';
import { TemplateDialog } from '@/components/templates/template-dialog';
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
import type { NotificationTemplate, CreateNotificationTemplateDto } from '@/lib/types/resources';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<NotificationTemplate | null>(null);

  const { data: templates, isLoading, error } = useTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate(selectedTemplate?.id || '');
  const deleteTemplate = useDeleteTemplate();

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'sms':
        return <MessageSquare className="h-5 w-5" />;
      case 'whatsapp':
        return <MessageSquare className="h-5 w-5" />;
      case 'push':
        return <Bell className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email':
        return 'bg-blue-100 text-blue-600';
      case 'sms':
        return 'bg-green-100 text-green-600';
      case 'whatsapp':
        return 'bg-emerald-100 text-emerald-600';
      case 'push':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const handleAddClick = () => {
    setSelectedTemplate(null);
    setDialogOpen(true);
  };

  const handleEditClick = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDeleteClick = (template: NotificationTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: CreateNotificationTemplateDto) => {
    try {
      if (selectedTemplate) {
        await updateTemplate.mutateAsync(data);
        toast.success('Template mis à jour avec succès');
      } else {
        await createTemplate.mutateAsync(data);
        toast.success('Template créé avec succès');
      }
      setDialogOpen(false);
      setSelectedTemplate(null);
    } catch (error) {
      toast.error(
        selectedTemplate
          ? 'Erreur lors de la mise à jour du template'
          : 'Erreur lors de la création du template'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      toast.success('Template supprimé avec succès');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      toast.error('Erreur lors de la suppression du template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates de notification</h1>
          <p className="text-gray-600 mt-2">
            Gérez les templates pour les notifications SMS, Email, WhatsApp et Push
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{templates?.length || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(templates as NotificationTemplate[] | undefined)?.filter(t => t.channel === 'email').length || 0}
                </p>
              </div>
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SMS</p>
                <p className="text-2xl font-bold text-green-600">
                  {(templates as NotificationTemplate[] | undefined)?.filter(t => t.channel === 'sms').length || 0}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">WhatsApp</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {(templates as NotificationTemplate[] | undefined)?.filter(t => t.channel === 'whatsapp').length || 0}
                </p>
              </div>
              <MessageSquare className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des templates */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center text-gray-500 py-8">
              Chargement...
            </div>
          )}

          {error && (
            <div className="text-center text-red-500 py-8">
              Erreur lors du chargement des templates
            </div>
          )}

          {templates && templates.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              Aucun template trouvé
            </div>
          )}

          {templates && templates.length > 0 && (
            <div className="space-y-4">
              {(templates as NotificationTemplate[]).map((template) => (
              <div
                key={template.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`p-3 rounded-lg ${getChannelColor(template.channel)}`}>
                    {getChannelIcon(template.channel)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-semibold">{template.name}</h3>
                      <Badge variant="outline" className="capitalize">
                        {template.channel}
                      </Badge>
                      {template.is_active && (
                        <Badge variant="default">Actif</Badge>
                      )}
                    </div>
                    {template.subject && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Sujet:</span> {template.subject}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.body_template}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        Variables disponibles: customer_name, ticket_number, queue_name
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditClick(template)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(template)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
        onSubmit={handleSubmit}
        isLoading={createTemplate.isPending || updateTemplate.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le template &quot;{templateToDelete?.name}&quot; ?
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

      {/* Variables disponibles */}
      <Card>
        <CardHeader>
          <CardTitle>Variables disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            <div className="p-3 border rounded-lg">
              <code className="text-sm font-mono text-blue-600">{'{{customer_name}}'}</code>
              <p className="text-xs text-gray-600 mt-1">Nom du client</p>
            </div>
            <div className="p-3 border rounded-lg">
              <code className="text-sm font-mono text-blue-600">{'{{ticket_number}}'}</code>
              <p className="text-xs text-gray-600 mt-1">Numéro de ticket</p>
            </div>
            <div className="p-3 border rounded-lg">
              <code className="text-sm font-mono text-blue-600">{'{{queue_name}}'}</code>
              <p className="text-xs text-gray-600 mt-1">Nom de la file</p>
            </div>
            <div className="p-3 border rounded-lg">
              <code className="text-sm font-mono text-blue-600">{'{{waiting_count}}'}</code>
              <p className="text-xs text-gray-600 mt-1">Nombre en attente</p>
            </div>
            <div className="p-3 border rounded-lg">
              <code className="text-sm font-mono text-blue-600">{'{{estimated_wait_time}}'}</code>
              <p className="text-xs text-gray-600 mt-1">Temps d'attente estimé</p>
            </div>
            <div className="p-3 border rounded-lg">
              <code className="text-sm font-mono text-blue-600">{'{{counter_number}}'}</code>
              <p className="text-xs text-gray-600 mt-1">Numéro de guichet</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
