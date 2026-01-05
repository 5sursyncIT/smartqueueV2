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
import { Switch } from '@/components/ui/switch';
import type { Service } from '@/lib/types/resources';

const serviceSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  code: z.string().min(1, 'Le code est requis'),
  average_duration: z.number().min(1, 'La durée moyenne doit être supérieure à 0'),
  priority: z.number().min(1).max(10).default(5),
  is_active: z.boolean().default(true),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Couleur hexadécimale invalide').default('#3B82F6'),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
  onSubmit: (data: ServiceFormData) => Promise<void>;
  isLoading?: boolean;
}

export function ServiceDialog({
  open,
  onOpenChange,
  service,
  onSubmit,
  isLoading,
}: ServiceDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: '',
      description: '',
      code: '',
      average_duration: 15,
      priority: 5,
      is_active: true,
      color: '#3B82F6',
    },
  });

  const isActive = watch('is_active');

  useEffect(() => {
    if (open && service) {
      reset({
        name: service.name,
        description: service.description || '',
        code: service.code,
        average_duration: service.average_duration,
        priority: service.priority,
        is_active: service.is_active,
        color: service.color || '#3B82F6',
      });
    } else if (open && !service) {
      reset({
        name: '',
        description: '',
        code: '',
        average_duration: 15,
        priority: 5,
        is_active: true,
        color: '#3B82F6',
      });
    }
  }, [open, service, reset]);

  const handleFormSubmit = async (data: ServiceFormData) => {
    await onSubmit(data);
    onOpenChange(false);
    reset();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setValue('code', value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {service ? 'Modifier le service' : 'Ajouter un service'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="ex: Dépôt"
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                {...register('code')}
                onChange={handleCodeChange}
                placeholder="ex: DEP"
                maxLength={10}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Description du service"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="average_duration">Durée moyenne (min) *</Label>
              <Input
                id="average_duration"
                type="number"
                {...register('average_duration', { valueAsNumber: true })}
                placeholder="15"
                min={1}
              />
              {errors.average_duration && (
                <p className="text-sm text-red-600">
                  {errors.average_duration.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priorité (1-10) *</Label>
              <Input
                id="priority"
                type="number"
                {...register('priority', { valueAsNumber: true })}
                placeholder="5"
                min={1}
                max={10}
              />
              {errors.priority && (
                <p className="text-sm text-red-600">{errors.priority.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Couleur</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                {...register('color')}
                className="w-20 h-10"
              />
              <Input
                {...register('color')}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
            {errors.color && (
              <p className="text-sm text-red-600">{errors.color.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Actif</Label>
              <p className="text-sm text-gray-500">
                Le service est disponible pour les nouveaux tickets
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
                : service
                ? 'Mettre à jour'
                : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
