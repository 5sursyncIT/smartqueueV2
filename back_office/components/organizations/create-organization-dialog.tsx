'use client';

import { useState } from 'react';
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
import { useCreateOrganization, CreateOrganizationDto } from '@/lib/hooks/use-superadmin';
import { useToast } from '@/lib/hooks/use-toast';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({ open, onOpenChange }: CreateOrganizationDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateOrganization();

  const [formData, setFormData] = useState<CreateOrganizationDto>({
    name: '',
    slug: '',
    company_name: '',
    email: '',
    phone: '',
    plan: 'trial',
    admin_email: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_password: '',
  });

  const handleChange = (field: keyof CreateOrganizationDto, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Auto-generate slug from name
    if (field === 'name' && !formData.slug) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.slug || !formData.admin_email) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs obligatoires',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate(formData, {
      onSuccess: (data) => {
        toast({
          title: 'Organisation créée',
          description: `L'organisation ${data.tenant.name} a été créée avec succès`,
        });
        onOpenChange(false);
        // Reset form
        setFormData({
          name: '',
          slug: '',
          company_name: '',
          email: '',
          phone: '',
          plan: 'trial',
          admin_email: '',
          admin_first_name: '',
          admin_last_name: '',
          admin_password: '',
        });
      },
      onError: (error: any) => {
        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          'Impossible de créer l\'organisation';
        toast({
          title: 'Erreur',
          description: errorMessage,
          variant: 'destructive',
        });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle organisation</DialogTitle>
          <DialogDescription>
            Créez une nouvelle organisation avec son administrateur initial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations organisation */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Informations de l'organisation</h3>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nom de l'organisation <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ex: Banque XYZ"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleChange('slug', e.target.value)}
                  placeholder="Ex: banque-xyz"
                  required
                />
                <p className="text-xs text-gray-500">
                  Utilisé dans l'URL (lettres minuscules, chiffres et tirets uniquement)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Nom de la société</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
                placeholder="Ex: Banque XYZ SA"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email de l'organisation</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="contact@banque-xyz.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+221 XX XXX XX XX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan d'abonnement</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) =>
                  handleChange('plan', value as CreateOrganizationDto['plan'])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial (Essai gratuit)</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Informations administrateur */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Administrateur initial</h3>

            <div className="space-y-2">
              <Label htmlFor="admin_email">
                Email de l'admin <span className="text-red-500">*</span>
              </Label>
              <Input
                id="admin_email"
                type="email"
                value={formData.admin_email}
                onChange={(e) => handleChange('admin_email', e.target.value)}
                placeholder="admin@banque-xyz.com"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="admin_first_name">Prénom</Label>
                <Input
                  id="admin_first_name"
                  value={formData.admin_first_name}
                  onChange={(e) => handleChange('admin_first_name', e.target.value)}
                  placeholder="Jean"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_last_name">Nom</Label>
                <Input
                  id="admin_last_name"
                  value={formData.admin_last_name}
                  onChange={(e) => handleChange('admin_last_name', e.target.value)}
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin_password">Mot de passe temporaire</Label>
              <Input
                id="admin_password"
                type="password"
                value={formData.admin_password}
                onChange={(e) => handleChange('admin_password', e.target.value)}
                placeholder="Minimum 8 caractères"
              />
              <p className="text-xs text-gray-500">
                Laissez vide pour générer un mot de passe aléatoire (envoyé par email)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création...' : 'Créer l\'organisation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
