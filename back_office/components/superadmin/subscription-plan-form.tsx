'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, Plus } from 'lucide-react';
import { SubscriptionPlan } from '@/lib/api/superadmin/subscriptions';

interface SubscriptionPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: SubscriptionPlan | null;
  onSubmit: (data: SubscriptionPlanFormData) => void;
  isLoading?: boolean;
}

export interface SubscriptionPlanFormData {
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: string[];
  max_sites: number;
  max_agents: number;
  max_queues: number;
  max_tickets_per_month: number;
  is_active: boolean;
  is_featured: boolean;
}

export function SubscriptionPlanForm({
  open,
  onOpenChange,
  plan,
  onSubmit,
  isLoading = false,
}: SubscriptionPlanFormProps) {
  const [formData, setFormData] = useState<SubscriptionPlanFormData>({
    name: '',
    slug: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    currency: 'XOF',
    features: [],
    max_sites: 1,
    max_agents: 5,
    max_queues: 3,
    max_tickets_per_month: 500,
    is_active: true,
    is_featured: false,
  });

  const [featureInput, setFeatureInput] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        currency: plan.currency,
        features: plan.features,
        max_sites: plan.max_sites,
        max_agents: plan.max_agents,
        max_queues: plan.max_queues,
        max_tickets_per_month: plan.max_tickets_per_month,
        is_active: plan.is_active,
        is_featured: plan.is_featured,
      });
    } else {
      // Reset form for new plan
      setFormData({
        name: '',
        slug: '',
        description: '',
        price_monthly: 0,
        price_yearly: 0,
        currency: 'XOF',
        features: [],
        max_sites: 1,
        max_agents: 5,
        max_queues: 3,
        max_tickets_per_month: 500,
        is_active: true,
        is_featured: false,
      });
    }
  }, [plan]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {plan ? 'Modifier le plan' : 'Créer un nouveau plan'}
          </DialogTitle>
          <DialogDescription>
            {plan
              ? 'Modifiez les détails du plan d\'abonnement'
              : 'Créez un nouveau plan d\'abonnement pour vos organisations'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations de base */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Informations de base</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du plan *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  placeholder="Essential"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="essential"
                  required
                  disabled={!!plan} // Slug ne peut pas être changé en édition
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Idéal pour les petites structures qui débutent"
                rows={3}
              />
            </div>
          </div>

          {/* Tarification */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Tarification</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_monthly">Prix mensuel (XOF) *</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  value={formData.price_monthly}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_monthly: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="1000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_yearly">Prix annuel (XOF) *</Label>
                <Input
                  id="price_yearly"
                  type="number"
                  value={formData.price_yearly}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_yearly: parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="1000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Limites */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Limites</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_sites">Nombre de sites *</Label>
                <Input
                  id="max_sites"
                  type="number"
                  value={formData.max_sites}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_sites: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_agents">Nombre d'agents *</Label>
                <Input
                  id="max_agents"
                  type="number"
                  value={formData.max_agents}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_agents: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_queues">Nombre de files d'attente *</Label>
                <Input
                  id="max_queues"
                  type="number"
                  value={formData.max_queues}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_queues: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_tickets_per_month">Tickets/mois *</Label>
                <Input
                  id="max_tickets_per_month"
                  type="number"
                  value={formData.max_tickets_per_month}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_tickets_per_month: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  required
                />
              </div>
            </div>
          </div>

          {/* Fonctionnalités */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Fonctionnalités incluses</h3>

            <div className="flex gap-2">
              <Input
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                placeholder="Ajouter une fonctionnalité..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addFeature();
                  }
                }}
              />
              <Button type="button" onClick={addFeature} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.features.length > 0 && (
              <div className="space-y-2">
                {formData.features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm">{feature}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Options</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Plan actif</Label>
                <p className="text-sm text-gray-500">
                  Le plan est visible et disponible pour les organisations
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_featured">Plan mis en avant</Label>
                <p className="text-sm text-gray-500">
                  Afficher un badge "Populaire" sur ce plan
                </p>
              </div>
              <Switch
                id="is_featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_featured: checked })
                }
              />
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
                ? 'En cours...'
                : plan
                ? 'Mettre à jour'
                : 'Créer le plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
