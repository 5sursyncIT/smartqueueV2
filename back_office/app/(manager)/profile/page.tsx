'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Building, Save, X, Edit, Lock } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useProfile, useUpdateProfile, useChangePassword } from '@/lib/hooks/use-profile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const profileSchema = z.object({
  first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  last_name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
});

const passwordSchema = z.object({
  old_password: z.string().min(6, 'Mot de passe requis'),
  new_password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirm_password"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { user, currentTenant, tenants } = useAuthStore();
  const { data: profileData, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  // Utiliser les données du store ou de l'API
  const userData = profileData || user;

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: userData?.first_name || '',
      last_name: userData?.last_name || '',
      email: userData?.email || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmitProfile = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data);
      toast.success('Profil mis à jour avec succès');
      setIsEditingProfile(false);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du profil');
    }
  };

  const onSubmitPassword = async (data: PasswordFormData) => {
    try {
      await changePassword.mutateAsync({
        old_password: data.old_password,
        new_password: data.new_password,
      });
      toast.success('Mot de passe changé avec succès');
      setIsChangingPassword(false);
      resetPassword();
    } catch (error) {
      toast.error('Erreur lors du changement de mot de passe');
    }
  };

  const handleCancelEdit = () => {
    resetProfile({
      first_name: userData?.first_name || '',
      last_name: userData?.last_name || '',
      email: userData?.email || '',
    });
    setIsEditingProfile(false);
  };

  if (isLoading && !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mon profil</h1>
        <p className="text-gray-600 mt-2">
          Gérez vos informations personnelles et vos paramètres de compte
        </p>
      </div>

      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Informations personnelles</CardTitle>
              <CardDescription>
                Vos informations de base et coordonnées
              </CardDescription>
            </div>
            {!isEditingProfile && (
              <Button onClick={() => setIsEditingProfile(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Modifier
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingProfile ? (
            <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom</Label>
                  <Input
                    id="first_name"
                    {...registerProfile('first_name')}
                    disabled={updateProfile.isPending}
                  />
                  {profileErrors.first_name && (
                    <p className="text-sm text-red-500">{profileErrors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom</Label>
                  <Input
                    id="last_name"
                    {...registerProfile('last_name')}
                    disabled={updateProfile.isPending}
                  />
                  {profileErrors.last_name && (
                    <p className="text-sm text-red-500">{profileErrors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...registerProfile('email')}
                  disabled={updateProfile.isPending}
                />
                {profileErrors.email && (
                  <p className="text-sm text-red-500">{profileErrors.email.message}</p>
                )}
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={updateProfile.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={updateProfile.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-blue-100 rounded-full">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {userData?.first_name} {userData?.last_name}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-600">{userData?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant actuel */}
      <Card>
        <CardHeader>
          <CardTitle>Organisation actuelle</CardTitle>
          <CardDescription>
            Le tenant et le rôle avec lesquels vous êtes connecté
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-4">
            <div className="p-4 bg-purple-100 rounded-full">
              <Building className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <p className="text-xl font-bold">{currentTenant?.name}</p>
                <Badge variant="outline">{currentTenant?.slug}</Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-gray-500" />
                <p className="text-gray-600">
                  Rôle: <span className="font-semibold capitalize">{currentTenant?.role}</span>
                </p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-500 mb-2">Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {currentTenant?.scopes.slice(0, 8).map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                  {currentTenant && currentTenant.scopes.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{currentTenant.scopes.length - 8} autres
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tous les tenants */}
      {tenants.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Toutes mes organisations</CardTitle>
            <CardDescription>
              Vous avez accès à {tenants.length} organisations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    tenant.id === currentTenant?.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                >
                  <div>
                    <p className="font-semibold">{tenant.name}</p>
                    <p className="text-sm text-gray-600">{tenant.slug}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="capitalize">
                      {tenant.role}
                    </Badge>
                    {tenant.id === currentTenant?.id && (
                      <Badge variant="default">Actuel</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changement de mot de passe */}
      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
          <CardDescription>
            Gérez votre mot de passe et vos paramètres de sécurité
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isChangingPassword ? (
            <Button onClick={() => setIsChangingPassword(true)}>
              <Lock className="mr-2 h-4 w-4" />
              Changer le mot de passe
            </Button>
          ) : (
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password">Mot de passe actuel</Label>
                <Input
                  id="old_password"
                  type="password"
                  {...registerPassword('old_password')}
                  disabled={changePassword.isPending}
                />
                {passwordErrors.old_password && (
                  <p className="text-sm text-red-500">{passwordErrors.old_password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">Nouveau mot de passe</Label>
                <Input
                  id="new_password"
                  type="password"
                  {...registerPassword('new_password')}
                  disabled={changePassword.isPending}
                />
                {passwordErrors.new_password && (
                  <p className="text-sm text-red-500">{passwordErrors.new_password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmer le nouveau mot de passe</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  {...registerPassword('confirm_password')}
                  disabled={changePassword.isPending}
                />
                {passwordErrors.confirm_password && (
                  <p className="text-sm text-red-500">{passwordErrors.confirm_password.message}</p>
                )}
              </div>

              <div className="flex space-x-2">
                <Button type="submit" disabled={changePassword.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {changePassword.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    resetPassword();
                  }}
                  disabled={changePassword.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
