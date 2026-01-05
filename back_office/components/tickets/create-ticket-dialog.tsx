'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQueues } from '@/lib/hooks/use-queues';

const ticketSchema = z.object({
  queue_id: z.string().min(1, 'La file d\'attente est requise'),
  channel: z.enum(['web', 'app', 'qr', 'whatsapp', 'kiosk'], {
    required_error: 'Le canal est requis',
  }),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  priority: z.number().min(0).optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TicketFormData) => Promise<void>;
  isLoading?: boolean;
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CreateTicketDialogProps) {
  const { data: queues = [] } = useQueues();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      queue_id: '',
      channel: 'web',
      customer_name: '',
      customer_phone: '',
      priority: 0,
    },
  });

  const queueId = watch('queue_id');
  const channel = watch('channel');

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: TicketFormData) => {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau ticket</DialogTitle>
          <DialogDescription>
            Créez un ticket manuellement pour un client. Le numéro sera généré automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="queue_id">File d'attente *</Label>
              <Select
                value={queueId}
                onValueChange={(value) => setValue('queue_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une file d'attente" />
                </SelectTrigger>
                <SelectContent>
                  {queues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id}>
                      <div>
                        <div className="font-medium">{queue.name}</div>
                        <div className="text-xs text-gray-500">
                          {queue.service.name} - {queue.site.name}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.queue_id && (
                <p className="text-sm text-red-600">{errors.queue_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Canal *</Label>
              <Select
                value={channel}
                onValueChange={(value) => setValue('channel', value as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">
                    <div className="flex items-center gap-2">
                      <span>🌐</span>
                      <span>Web (Site internet)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="app">
                    <div className="flex items-center gap-2">
                      <span>📱</span>
                      <span>Application mobile</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="qr">
                    <div className="flex items-center gap-2">
                      <span>📸</span>
                      <span>QR Code</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <span>💬</span>
                      <span>WhatsApp</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="kiosk">
                    <div className="flex items-center gap-2">
                      <span>🖥️</span>
                      <span>Borne interactive</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.channel && (
                <p className="text-sm text-red-600">{errors.channel.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_name">Nom du client (optionnel)</Label>
              <Input
                id="customer_name"
                placeholder="Jean Dupont"
                {...register('customer_name')}
              />
              {errors.customer_name && (
                <p className="text-sm text-red-600">{errors.customer_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_phone">Téléphone (optionnel)</Label>
              <Input
                id="customer_phone"
                type="tel"
                placeholder="+221771234567"
                {...register('customer_phone')}
              />
              {errors.customer_phone && (
                <p className="text-sm text-red-600">{errors.customer_phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorité (optionnel)</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                placeholder="0"
                {...register('priority', { valueAsNumber: true })}
              />
              <p className="text-xs text-gray-500">
                Plus le nombre est élevé, plus la priorité est haute. Par défaut : 0
              </p>
              {errors.priority && (
                <p className="text-sm text-red-600">{errors.priority.message}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note :</strong> Le numéro de ticket sera généré automatiquement selon le format de la file d'attente sélectionnée.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Création...' : 'Créer le ticket'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
