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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenants } from '@/lib/hooks/use-tenants';
import type { User } from '@/lib/hooks/use-users';

const userSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').optional().or(z.literal('')),
  first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phone_number: z.string().optional(),
  is_superuser: z.boolean().default(false),
  is_staff: z.boolean().default(false),
  // Champs pour l'assignation à une organisation
  tenant_id: z.string().optional(),
  role: z.enum(['admin', 'manager', 'agent']).optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSubmit: (data: UserFormData) => Promise<void>;
  isLoading?: boolean;
}

export function UserDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  isLoading = false,
}: UserDialogProps) {
  const isEditing = !!user;
  const { data: tenants } = useTenants();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      is_superuser: false,
      is_staff: false,
      tenant_id: '',
      role: undefined,
    },
  });

  const isSuperuser = watch('is_superuser');
  const isStaff = watch('is_staff');
  const tenantId = watch('tenant_id');
  const role = watch('role');

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        password: '', // Ne pas pré-remplir le mot de passe
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number || '',
        is_superuser: user.is_superuser,
        is_staff: user.is_staff,
        tenant_id: '',
        role: undefined,
      });
    } else {
      reset({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone_number: '',
        is_superuser: false,
        is_staff: false,
        tenant_id: '',
        role: undefined,
      });
    }
  }, [user, reset]);

  const handleFormSubmit = async (data: UserFormData) => {
    // Si on édite et que le mot de passe est vide, ne pas l'inclure
    if (isEditing && !data.password) {
      const { password, ...dataWithoutPassword } = data;
      await onSubmit(dataWithoutPassword as UserFormData);
    } else {
      await onSubmit(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifiez les informations de l\'utilisateur. Laissez le mot de passe vide pour ne pas le changer.'
              : 'Créez un nouveau compte utilisateur. Le mot de passe doit contenir au moins 8 caractères.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="utilisateur@example.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Mot de passe {isEditing ? '(optionnel)' : '*'}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={isEditing ? 'Laisser vide pour ne pas changer' : 'Minimum 8 caractères'}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  {...register('first_name')}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  {...register('last_name')}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Téléphone</Label>
              <Input
                id="phone_number"
                type="tel"
                placeholder="+221771234567"
                {...register('phone_number')}
              />
              {errors.phone_number && (
                <p className="text-sm text-red-600">{errors.phone_number.message}</p>
              )}
            </div>

            {/* Section assignation à une organisation (uniquement en création) */}
            {!isEditing && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm font-medium">Assignation à une organisation</p>
                <p className="text-xs text-gray-500">
                  Si vous n'assignez pas l'utilisateur à une organisation maintenant, vous pourrez le faire plus tard.
                </p>

                <div className="space-y-2">
                  <Label htmlFor="tenant_id">Organisation</Label>
                  <Select
                    value={tenantId}
                    onValueChange={(value) => setValue('tenant_id', value)}
                    disabled={isSuperuser}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une organisation (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.tenant_id && (
                    <p className="text-sm text-red-600">{errors.tenant_id.message}</p>
                  )}
                </div>

                {tenantId && (
                  <div className="space-y-2">
                    <Label htmlFor="role">Rôle</Label>
                    <Select
                      value={role}
                      onValueChange={(value) => setValue('role', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez un rôle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div>
                            <div className="font-medium">Admin</div>
                            <div className="text-xs text-gray-500">
                              Gestion complète de l'organisation
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="manager">
                          <div>
                            <div className="font-medium">Manager</div>
                            <div className="text-xs text-gray-500">
                              Gestion opérationnelle et rapports
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="agent">
                          <div>
                            <div className="font-medium">Agent</div>
                            <div className="text-xs text-gray-500">
                              Traitement des tickets
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && (
                      <p className="text-sm text-red-600">{errors.role.message}</p>
                    )}
                  </div>
                )}

                {isSuperuser && (
                  <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                    ℹ️ Les super-administrateurs ne peuvent pas être assignés à une organisation spécifique.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-medium">Permissions</p>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_superuser"
                  checked={isSuperuser}
                  onCheckedChange={(checked) => {
                    setValue('is_superuser', checked as boolean);
                    // Si superuser, automatiquement staff
                    if (checked) {
                      setValue('is_staff', true);
                    }
                  }}
                />
                <Label
                  htmlFor="is_superuser"
                  className="text-sm font-normal cursor-pointer"
                >
                  Super administrateur (accès complet à la plateforme)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_staff"
                  checked={isStaff}
                  disabled={isSuperuser} // Désactivé si superuser
                  onCheckedChange={(checked) => setValue('is_staff', checked as boolean)}
                />
                <Label
                  htmlFor="is_staff"
                  className="text-sm font-normal cursor-pointer"
                >
                  Staff (accès à l'administration Django)
                </Label>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Attention : Ces permissions donnent un accès élevé au système.
                Utilisez avec précaution.
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
              {isLoading
                ? 'Enregistrement...'
                : isEditing
                ? 'Mettre à jour'
                : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
