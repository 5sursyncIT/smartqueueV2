'use client';

import { useEffect, useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useQueues } from '@/lib/hooks/use-queues';

const inviteAgentSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone_number: z.string().optional(),
  queue_ids: z.array(z.string()).optional(),
});

type InviteAgentFormData = z.infer<typeof inviteAgentSchema>;

interface InviteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InviteAgentFormData) => Promise<void>;
  isLoading?: boolean;
}

export function InviteAgentDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: InviteAgentDialogProps) {
  const [selectedQueues, setSelectedQueues] = useState<string[]>([]);
  const { data: queues, isLoading: isLoadingQueues } = useQueues();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteAgentFormData>({
    resolver: zodResolver(inviteAgentSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      queue_ids: [],
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
      setSelectedQueues([]);
    }
  }, [open, reset]);

  const handleFormSubmit = async (data: InviteAgentFormData) => {
    await onSubmit({
      ...data,
      queue_ids: selectedQueues.length > 0 ? selectedQueues : undefined,
    });
  };

  const toggleQueue = (queueId: string) => {
    setSelectedQueues((prev) =>
      prev.includes(queueId)
        ? prev.filter((id) => id !== queueId)
        : [...prev, queueId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inviter un nouvel agent</DialogTitle>
          <DialogDescription>
            Créez un compte pour un nouvel agent et assignez-le à des files d'attente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="agent@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimum 8 caractères"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Prénom */}
            <div className="space-y-2">
              <Label htmlFor="first_name">
                Prénom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="first_name"
                placeholder="Jean"
                {...register('first_name')}
                disabled={isLoading}
              />
              {errors.first_name && (
                <p className="text-sm text-red-500">{errors.first_name.message}</p>
              )}
            </div>

            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="last_name">
                Nom <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                placeholder="Dupont"
                {...register('last_name')}
                disabled={isLoading}
              />
              {errors.last_name && (
                <p className="text-sm text-red-500">{errors.last_name.message}</p>
              )}
            </div>

            {/* Téléphone */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">Téléphone (optionnel)</Label>
              <Input
                id="phone_number"
                type="tel"
                placeholder="+221771234567"
                {...register('phone_number')}
                disabled={isLoading}
              />
              {errors.phone_number && (
                <p className="text-sm text-red-500">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Assignation aux files */}
            <div className="space-y-2">
              <Label>Files d'attente (optionnel)</Label>
              <p className="text-sm text-muted-foreground">
                Sélectionnez les files auxquelles cet agent aura accès
              </p>
              {isLoadingQueues ? (
                <p className="text-sm text-muted-foreground">Chargement des files...</p>
              ) : queues && queues.length > 0 ? (
                <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {queues.map((queue) => (
                    <div key={queue.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`queue-${queue.id}`}
                        checked={selectedQueues.includes(queue.id)}
                        onCheckedChange={() => toggleQueue(queue.id)}
                        disabled={isLoading}
                      />
                      <label
                        htmlFor={`queue-${queue.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {queue.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucune file d'attente disponible
                </p>
              )}
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
              {isLoading ? 'Invitation en cours...' : 'Inviter l\'agent'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
