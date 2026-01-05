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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Agent } from '@/lib/types/resources';
import { useSites } from '@/lib/hooks/use-sites';
import { useQueues } from '@/lib/hooks/use-queues';

const agentSchema = z.object({
  user_email: z.string().email('Email invalide'),
  site_id: z.string().optional(),
  queue_ids: z.array(z.string()).optional(),
  max_concurrent_tickets: z.number().min(1).max(10).optional(),
  counter_number: z.number().min(1).max(999).optional(),
});

type AgentFormData = z.infer<typeof agentSchema>;

interface AgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
  onSubmit: (data: AgentFormData) => Promise<void>;
  isLoading?: boolean;
}

export function AgentDialog({
  open,
  onOpenChange,
  agent,
  onSubmit,
  isLoading,
}: AgentDialogProps) {
  const { data: sites } = useSites();
  const { data: queues } = useQueues();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      user_email: '',
      site_id: undefined,
      queue_ids: [],
      max_concurrent_tickets: 1,
      counter_number: undefined,
    },
  });

  const selectedSiteId = watch('site_id');
  const selectedQueueIds = watch('queue_ids') || [];

  useEffect(() => {
    if (open && agent) {
      reset({
        user_email: agent.user?.email || '',
        site_id: undefined, // site_id no longer exists on Agent
        queue_ids: agent.queues?.map(q => q.id) || [],
        max_concurrent_tickets: 1, // max_concurrent_tickets no longer exists on Agent
        counter_number: agent.counter_number || undefined,
      });
    } else if (open && !agent) {
      reset({
        user_email: '',
        site_id: undefined,
        queue_ids: [],
        max_concurrent_tickets: 1,
        counter_number: undefined,
      });
    }
  }, [open, agent, reset]);

  const handleFormSubmit = async (data: AgentFormData) => {
    await onSubmit(data);
    onOpenChange(false);
    reset();
  };

  const filteredQueues = queues?.filter(q => !selectedSiteId || q.site?.id === selectedSiteId);

  const toggleQueue = (queueId: string) => {
    const newQueues = selectedQueueIds.includes(queueId)
      ? selectedQueueIds.filter(id => id !== queueId)
      : [...selectedQueueIds, queueId];
    setValue('queue_ids', newQueues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {agent ? 'Modifier l\'agent' : 'Ajouter un agent'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user_email">Email de l'utilisateur *</Label>
            <Input
              id="user_email"
              type="email"
              {...register('user_email')}
              placeholder="agent@example.com"
              disabled={!!agent}
            />
            {errors.user_email && (
              <p className="text-sm text-red-600">{errors.user_email.message}</p>
            )}
            {agent && (
              <p className="text-sm text-gray-500">
                L'email ne peut pas être modifié après création
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="site_id">Site</Label>
            <Select
              value={selectedSiteId}
              onValueChange={(value) => setValue('site_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un site" />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_concurrent_tickets">Tickets simultanés max *</Label>
            <Input
              id="max_concurrent_tickets"
              type="number"
              {...register('max_concurrent_tickets', { valueAsNumber: true })}
              placeholder="1"
              min={1}
              max={10}
            />
            {errors.max_concurrent_tickets && (
              <p className="text-sm text-red-600">
                {errors.max_concurrent_tickets.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="counter_number">Numéro de guichet</Label>
            <Input
              id="counter_number"
              type="number"
              {...register('counter_number', { valueAsNumber: true })}
              placeholder="1"
              min={1}
              max={999}
            />
            {errors.counter_number && (
              <p className="text-sm text-red-600">
                {errors.counter_number.message}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Numéro affiché sur l'écran et annoncé vocalement
            </p>
          </div>

          <div className="space-y-2">
            <Label>Files d'attente assignées</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
              {filteredQueues && filteredQueues.length > 0 ? (
                filteredQueues.map((queue) => (
                  <label
                    key={queue.id}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedQueueIds.includes(queue.id)}
                      onChange={() => toggleQueue(queue.id)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{queue.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  {selectedSiteId
                    ? 'Aucune file d\'attente disponible pour ce site'
                    : 'Sélectionnez un site pour voir les files d\'attente'}
                </p>
              )}
            </div>
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
                : agent
                ? 'Mettre à jour'
                : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
