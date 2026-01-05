'use client';

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenants } from '@/lib/hooks/use-tenants';
import type { User } from '@/lib/hooks/use-users';

const assignTenantSchema = z.object({
  tenant_id: z.string().min(1, 'L\'organisation est requise'),
  role: z.enum(['admin', 'manager', 'agent'], {
    required_error: 'Le rôle est requis',
  }),
});

type AssignTenantFormData = z.infer<typeof assignTenantSchema>;

interface AssignTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSubmit: (data: AssignTenantFormData) => Promise<void>;
  isLoading?: boolean;
}

export function AssignTenantDialog({
  open,
  onOpenChange,
  user,
  onSubmit,
  isLoading = false,
}: AssignTenantDialogProps) {
  const { data: tenants } = useTenants();

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssignTenantFormData>({
    resolver: zodResolver(assignTenantSchema),
    defaultValues: {
      tenant_id: '',
      role: 'agent',
    },
  });

  const tenantId = watch('tenant_id');
  const role = watch('role');

  const handleFormSubmit = async (data: AssignTenantFormData) => {
    await onSubmit(data);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assigner à une organisation</DialogTitle>
          <DialogDescription>
            Assignez {user?.first_name} {user?.last_name} à une organisation avec un rôle spécifique.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Organisation *</Label>
              <Select
                value={tenantId}
                onValueChange={(value) => setValue('tenant_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une organisation" />
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

            <div className="space-y-2">
              <Label htmlFor="role">Rôle *</Label>
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Si vous assignez en tant qu'Agent, vous pourrez ensuite
                assigner cet utilisateur à des files d'attente depuis la page Agents.
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
              {isLoading ? 'Assignation...' : 'Assigner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
