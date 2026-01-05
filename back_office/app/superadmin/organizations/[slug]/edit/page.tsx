'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import {
  useOrganization,
  useUpdateOrganization,
} from '@/lib/hooks/use-superadmin';
import Link from 'next/link';
import { useToast } from '@/lib/hooks/use-toast';

export default function EditOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { toast } = useToast();

  const { data: org, isLoading, error } = useOrganization(slug);
  const updateMutation = useUpdateOrganization(slug);

  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    plan: 'trial',
    max_sites: 1,
    max_agents: 5,
    max_queues: 10,
    locale: 'fr',
    timezone: 'Africa/Dakar',
    data_retention_days: 90,
  });

  useEffect(() => {
    if (org) {
      setFormData({
        name: org.name || '',
        company_name: org.company_name || '',
        email: org.email || '',
        phone: org.phone || '',
        website: org.website || '',
        address: org.address || '',
        plan: org.plan || 'trial',
        max_sites: org.max_sites || 1,
        max_agents: org.max_agents || 5,
        max_queues: org.max_queues || 10,
        locale: org.locale || 'fr',
        timezone: org.timezone || 'Africa/Dakar',
        data_retention_days: org.data_retention_days || 90,
      });
    }
  }, [org]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: 'Erreur',
        description: 'Le nom de l\'organisation est obligatoire',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate(formData, {
      onSuccess: () => {
        toast({
          title: 'Organisation mise à jour',
          description: 'Les modifications ont été enregistrées avec succès',
        });
        router.push(`/superadmin/organizations/${slug}`);
      },
      onError: (error: any) => {
        const errorMessage =
          error.response?.data?.detail ||
          error.response?.data?.message ||
          'Impossible de mettre à jour l\'organisation';
        toast({
          title: 'Erreur',
          description: errorMessage,
          variant: 'destructive',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-4">Organisation introuvable</p>
          <Link href="/superadmin/organizations">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la liste
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/superadmin/organizations/${slug}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Modifier l'organisation</h1>
            <p className="text-gray-600 mt-1">{org.name}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nom de l'organisation <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Nom de la société</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Plan et limites */}
        <Card>
          <CardHeader>
            <CardTitle>Plan et limites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan">Plan d'abonnement</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) => setFormData({ ...formData, plan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="max_sites">Sites maximum</Label>
                <Input
                  id="max_sites"
                  type="number"
                  min="1"
                  value={formData.max_sites}
                  onChange={(e) => setFormData({ ...formData, max_sites: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_agents">Agents maximum</Label>
                <Input
                  id="max_agents"
                  type="number"
                  min="1"
                  value={formData.max_agents}
                  onChange={(e) => setFormData({ ...formData, max_agents: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_queues">Files d'attente maximum</Label>
                <Input
                  id="max_queues"
                  type="number"
                  min="1"
                  value={formData.max_queues}
                  onChange={(e) => setFormData({ ...formData, max_queues: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="locale">Langue</Label>
                <Select
                  value={formData.locale}
                  onValueChange={(value) => setFormData({ ...formData, locale: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Fuseau horaire</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Africa/Dakar">Africa/Dakar</SelectItem>
                    <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_retention_days">Rétention des données (jours)</Label>
              <Input
                id="data_retention_days"
                type="number"
                min="30"
                value={formData.data_retention_days}
                onChange={(e) => setFormData({ ...formData, data_retention_days: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500">
                Nombre de jours de conservation des données de l'organisation
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link href={`/superadmin/organizations/${slug}`}>
            <Button type="button" variant="outline" disabled={updateMutation.isPending}>
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </form>
    </div>
  );
}
