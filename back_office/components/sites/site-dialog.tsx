'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { Site } from '@/lib/types/resources';
import { toast } from 'sonner';

const siteSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  slug: z.string().min(2, 'Le slug doit contenir au moins 2 caractères').regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des lettres minuscules, chiffres et tirets'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  is_active: z.boolean().default(true),
});

type SiteFormData = z.infer<typeof siteSchema>;

interface SiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site?: Site | null;
  onSubmit: (data: SiteFormData) => Promise<void>;
  isLoading?: boolean;
}

export function SiteDialog({ open, onOpenChange, site, onSubmit, isLoading }: SiteDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: '',
      slug: '',
      address: '',
      city: '',
      country: 'SN',
      timezone: 'Africa/Dakar',
      is_active: true,
    },
  });

  const isActive = watch('is_active');

  // Réinitialiser le formulaire quand le dialog s'ouvre/ferme ou qu'un site change
  useEffect(() => {
    if (open && site) {
      reset({
        name: site.name,
        slug: site.slug,
        address: site.address || '',
        city: site.city || '',
        country: site.country || 'SN',
        timezone: site.timezone || 'Africa/Dakar',
        is_active: site.is_active,
      });
    } else if (open && !site) {
      reset({
        name: '',
        slug: '',
        address: '',
        city: '',
        country: 'SN',
        timezone: 'Africa/Dakar',
        is_active: true,
      });
    }
  }, [open, site, reset]);

  const handleFormSubmit = async (data: SiteFormData) => {
    try {
      await onSubmit(data);
      onOpenChange(false);
      reset();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement du site');
    }
  };

  // Auto-générer le slug depuis le nom
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    if (!site) {  // Seulement en mode création
      const slug = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')  // Enlever les accents
        .replace(/[^a-z0-9]+/g, '-')       // Remplacer les non-alphanumériques par des tirets
        .replace(/^-+|-+$/g, '');          // Enlever les tirets au début et à la fin
      setValue('slug', slug);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{site ? 'Modifier le site' : 'Ajouter un site'}</DialogTitle>
          <DialogDescription>
            {site
              ? 'Modifiez les informations du site ci-dessous.'
              : 'Ajoutez un nouveau site (agence, boutique, etc.) à votre organisation.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du site *</Label>
              <Input
                id="name"
                {...register('name')}
                onChange={(e) => {
                  register('name').onChange(e);
                  handleNameChange(e);
                }}
                placeholder="Agence Principale"
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                {...register('slug')}
                placeholder="agence-principale"
                disabled={isLoading}
              />
              {errors.slug && (
                <p className="text-sm text-red-500">{errors.slug.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="123 Avenue de la République"
              disabled={isLoading}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Dakar"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="SN"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <Input
                id="timezone"
                {...register('timezone')}
                placeholder="Africa/Dakar"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
              disabled={isLoading}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Site actif
            </Label>
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
              {isLoading ? 'Enregistrement...' : site ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
