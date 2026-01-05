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
import type { Queue } from '@/lib/types/resources';
import { useSites } from '@/lib/hooks/use-sites';
import { useServices } from '@/lib/hooks/use-services';

const queueSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  slug: z.string().min(1, 'Le slug est requis'),
  site: z.string().optional(),
  service: z.string().min(1, 'Le service est requis'),
  algorithm: z.enum(['fifo', 'priority', 'sla']).default('fifo'),
  status: z.enum(['active', 'paused', 'closed']).default('active'),
  max_capacity: z.number().min(0).optional(),
});

type QueueFormData = z.infer<typeof queueSchema>;

interface QueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queue?: Queue | null;
  onSubmit: (data: QueueFormData) => Promise<void>;
  isLoading?: boolean;
}

export function QueueDialog({
  open,
  onOpenChange,
  queue,
  onSubmit,
  isLoading,
}: QueueDialogProps) {
  const { data: sites } = useSites();
  const { data: services } = useServices();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<QueueFormData>({
    resolver: zodResolver(queueSchema),
    defaultValues: {
      name: '',
      slug: '',
      site: '',
      service: '',
      algorithm: 'fifo',
      status: 'active',
      max_capacity: undefined,
    },
  });

  const status = watch('status');
  const algorithm = watch('algorithm');
  const site = watch('site');
  const service = watch('service');
  const name = watch('name');

  // Auto-generate slug from name
  useEffect(() => {
    if (name && !queue) {
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setValue('slug', slug);
    }
  }, [name, queue, setValue]);

  useEffect(() => {
    if (open && queue) {
      reset({
        name: queue.name,
        slug: queue.slug,
        site: queue.site?.id || '',
        service: typeof queue.service === 'string' ? queue.service : queue.service?.id || '',
        algorithm: queue.algorithm,
        status: queue.status,
        max_capacity: queue.max_capacity || undefined,
      });
    } else if (open && !queue) {
      reset({
        name: '',
        slug: '',
        site: '',
        service: '',
        algorithm: 'fifo',
        status: 'active',
        max_capacity: undefined,
      });
    }
  }, [open, queue, reset]);

  const handleFormSubmit = async (data: QueueFormData) => {
    // Transform field names to match backend API (service_id instead of service, site_id instead of site)
    const apiData = {
      name: data.name,
      slug: data.slug,
      site_id: data.site || undefined,
      service_id: data.service,
      algorithm: data.algorithm,
      status: data.status,
      max_capacity: data.max_capacity,
    };
    await onSubmit(apiData as any);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {queue ? 'Modifier la file d\'attente' : 'Ajouter une file d\'attente'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="ex: File Ouverture de compte"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug *</Label>
            <Input
              id="slug"
              {...register('slug')}
              placeholder="ex: file-ouverture-compte"
            />
            {errors.slug && (
              <p className="text-sm text-red-600">{errors.slug.message}</p>
            )}
            <p className="text-xs text-gray-500">Généré automatiquement depuis le nom</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="site">Site</Label>
              <Select
                value={site}
                onValueChange={(value) => setValue('site', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un site" />
                </SelectTrigger>
                <SelectContent>
                  {sites?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.site && (
                <p className="text-sm text-red-600">{errors.site.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="service">Service *</Label>
              <Select
                value={service}
                onValueChange={(value) => setValue('service', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un service" />
                </SelectTrigger>
                <SelectContent>
                  {services?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.service && (
                <p className="text-sm text-red-600">{errors.service.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="algorithm">Algorithme *</Label>
              <Select
                value={algorithm}
                onValueChange={(value) => setValue('algorithm', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un algorithme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fifo">FIFO (Premier arrivé, premier servi)</SelectItem>
                  <SelectItem value="priority">Priorité</SelectItem>
                  <SelectItem value="sla">SLA</SelectItem>
                </SelectContent>
              </Select>
              {errors.algorithm && (
                <p className="text-sm text-red-600">{errors.algorithm.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut *</Label>
              <Select
                value={status}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">En pause</SelectItem>
                  <SelectItem value="closed">Fermée</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_capacity">Capacité maximale</Label>
            <Input
              id="max_capacity"
              type="number"
              {...register('max_capacity', {
                valueAsNumber: true,
                setValueAs: (value) => value === '' ? undefined : Number(value)
              })}
              placeholder="ex: 50"
              min={0}
            />
            <p className="text-xs text-gray-500">
              Nombre maximum de tickets en attente (laisser vide pour illimité)
            </p>
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
                : queue
                ? 'Mettre à jour'
                : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
