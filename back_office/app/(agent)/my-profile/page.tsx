'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/stores/auth-store';
import { User, Mail, Phone, Building2, Save, Key } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient, buildTenantUrl } from '@/lib/api/client';

export default function AgentMyProfilePage() {
  const { user, currentTenant, updateUser } = useAuthStore();
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) {
      toast.error('Aucun tenant sélectionné');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const counterNumber = formData.get('counter_number');

      // Update agent profile (counter number)
      if (counterNumber) {
        const url = buildTenantUrl(currentTenant.slug, '/agents/me/');
        const response = await apiClient.patch(url, {
          counter_number: parseInt(counterNumber as string, 10),
        });

        console.log('Agent profile updated:', response.data);

        // Fetch updated user data from /auth/jwt/me/
        const meResponse = await apiClient.get('/auth/jwt/me/');
        console.log('Updated user data from /me:', meResponse.data);

        // Update the auth store with new user data
        updateUser({
          agent_profile: meResponse.data.agent_profile,
        });

        toast.success('Profil mis à jour avec succès');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour du profil');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const currentPassword = formData.get('current_password');
      const newPassword = formData.get('new_password');
      const confirmPassword = formData.get('confirm_password');

      // Validate passwords match
      if (newPassword !== confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        return;
      }

      // Call API to change password
      await apiClient.post('/auth/change-password/', {
        old_password: currentPassword,
        new_password: newPassword,
      });

      toast.success('Mot de passe modifié avec succès');
      setIsEditingPassword(false);

      // Clear form
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.response?.data?.old_password?.[0] || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Mon Profil</h1>
        <p className="text-gray-600 mt-2">
          Gérez vos informations personnelles
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      defaultValue={user?.first_name}
                      placeholder="Votre prénom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      defaultValue={user?.last_name}
                      placeholder="Votre nom"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={user?.email}
                      className="pl-10"
                      disabled
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    L'email ne peut pas être modifié
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      defaultValue={user?.phone_number}
                      placeholder="+221771234567"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="counter_number">Numéro de guichet</Label>
                  <Input
                    id="counter_number"
                    name="counter_number"
                    type="number"
                    defaultValue={user?.agent_profile?.counter_number}
                    placeholder="Ex: 5"
                    min={1}
                    max={999}
                  />
                  <p className="text-xs text-gray-500">
                    Numéro affiché sur l'écran et annoncé vocalement lors de l'appel des tickets
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Mot de passe
                </div>
                {!isEditingPassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingPassword(true)}
                  >
                    Modifier
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditingPassword ? (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">
                      Mot de passe actuel
                    </Label>
                    <Input
                      id="current_password"
                      name="current_password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="new_password">Nouveau mot de passe</Label>
                    <Input
                      id="new_password"
                      name="new_password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">
                      Confirmer le mot de passe
                    </Label>
                    <Input
                      id="confirm_password"
                      name="confirm_password"
                      type="password"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? 'Changement...' : 'Changer le mot de passe'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingPassword(false)}
                      disabled={isSubmitting}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-gray-600">
                  Cliquez sur "Modifier" pour changer votre mot de passe
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Organisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Organisation</p>
                  <p className="font-medium">
                    {currentTenant?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Rôle</p>
                  <Badge className="bg-gray-100 text-gray-800">Agent</Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Guichet</p>
                  <p className="font-medium text-lg">
                    {user?.agent_profile?.counter_number ? (
                      <span className="text-blue-600">
                        N° {user.agent_profile.counter_number}
                      </span>
                    ) : (
                      <span className="text-gray-400">Non assigné</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Tickets cette semaine
                  </span>
                  <span className="font-bold">42</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Temps moyen</span>
                  <span className="font-bold">8 min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Satisfaction</span>
                  <span className="font-bold text-green-600">92%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
