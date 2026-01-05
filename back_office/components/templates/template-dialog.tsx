'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { NotificationTemplate } from '@/lib/types/resources';

const templateSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  channel: z.enum(['sms', 'email', 'push', 'whatsapp'], {
    required_error: 'Le canal est requis',
  }),
  event_type: z.string().min(1, 'Le type d\'événement est requis'),
  subject: z.string().optional(),
  body_template: z.string().min(1, 'Le corps du message est requis'),
  is_active: z.boolean().default(true),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: NotificationTemplate | null;
  onSubmit: (data: TemplateFormData) => Promise<void>;
  isLoading?: boolean;
}

const EVENT_TYPES = [
  { value: 'ticket_created', label: 'Ticket créé' },
  { value: 'ticket_called', label: 'Ticket appelé' },
  { value: 'ticket_ready', label: 'Ticket prêt' },
  { value: 'ticket_completed', label: 'Ticket terminé' },
  { value: 'ticket_cancelled', label: 'Ticket annulé' },
  { value: 'appointment_reminder', label: 'Rappel de rendez-vous' },
  { value: 'appointment_confirmed', label: 'Rendez-vous confirmé' },
];

export function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  isLoading,
}: TemplateDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      channel: 'sms',
      event_type: 'ticket_created',
      subject: '',
      body_template: '',
      is_active: true,
    },
  });

  const isActive = watch('is_active');
  const channel = watch('channel');

  useEffect(() => {
    if (open && template) {
      reset({
        name: template.name,
        description: template.description || '',
        channel: template.channel as any,
        event_type: template.event_type,
        subject: template.subject || '',
        body_template: template.body_template,
        is_active: template.is_active,
      });
    } else if (open && !template) {
      reset({
        name: '',
        description: '',
        channel: 'sms',
        event_type: 'ticket_created',
        subject: '',
        body_template: '',
        is_active: true,
      });
    }
  }, [open, template, reset]);

  const handleFormSubmit = async (data: TemplateFormData) => {
    await onSubmit(data);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {template ? 'Modifier le template' : 'Ajouter un template'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="ex: Notification SMS - Ticket créé"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Canal *</Label>
              <Select
                value={channel}
                onValueChange={(value) => setValue('channel', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
              {errors.channel && (
                <p className="text-sm text-red-600">{errors.channel.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Description du template"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_type">Type d'événement *</Label>
            <Select
              value={watch('event_type')}
              onValueChange={(value) => setValue('event_type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un événement" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((event) => (
                  <SelectItem key={event.value} value={event.value}>
                    {event.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.event_type && (
              <p className="text-sm text-red-600">{errors.event_type.message}</p>
            )}
          </div>

          {(channel === 'email' || channel === 'push') && (
            <div className="space-y-2">
              <Label htmlFor="subject">Sujet</Label>
              <Input
                id="subject"
                {...register('subject')}
                placeholder="ex: Votre ticket est prêt"
              />
              {errors.subject && (
                <p className="text-sm text-red-600">{errors.subject.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="body_template">Corps du message *</Label>
            <Textarea
              id="body_template"
              {...register('body_template')}
              placeholder="ex: Bonjour {{customer_name}}, votre ticket {{ticket_number}} est prêt."
              rows={6}
            />
            {errors.body_template && (
              <p className="text-sm text-red-600">{errors.body_template.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Variables disponibles: {'{'}{'{'} customer_name{'}'}{'}'}, {'{'}{'{'}ticket_number{'}'}{'}'}, {'{'}{'{'}queue_name{'}'}{'}'}, {'{'}{'{'}site_name{'}'}{'}'}, {'{'}{'{'}estimated_wait{'}'}{'}'}, {'{'}{'{'}position{'}'}{'}'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Actif</Label>
              <p className="text-sm text-gray-500">
                Le template est disponible pour les notifications
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Enregistrement...'
                : template
                ? 'Mettre à jour'
                : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
