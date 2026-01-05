'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/stores/auth-store';
import { login } from '@/lib/api/auth';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useAuthStore();

  // Ne plus rediriger automatiquement ici - on laisse l'AuthGuard s'en occuper

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const { user, payload } = await login(data);

      // DEBUG: Log pour vérifier le payload
      console.log('[Login] User:', user);
      console.log('[Login] Payload:', payload);
      console.log('[Login] is_superuser:', (payload as any).is_superuser);
      console.log('[Login] Tenants:', payload.tenants);

      setUser(user, payload);

      toast.success('Connexion réussie');

      // Rediriger selon le rôle
      const isSuperAdmin = (payload as any).is_superuser || false;

      console.log('[Login] isSuperAdmin:', isSuperAdmin);

      if (isSuperAdmin) {
        console.log('[Login] Redirecting to superadmin dashboard');
        router.replace('/superadmin/dashboard'); // Super-admin dashboard
        return;
      }

      const firstTenant = payload.tenants[0];
      if (!firstTenant) {
        toast.error('Aucun tenant associé');
        return;
      }

      console.log('[Login] First tenant:', firstTenant);
      console.log('[Login] Role:', firstTenant.role);

      // Rediriger selon le rôle
      let targetPath = '/dashboard'; // Default pour manager

      if (firstTenant.role === 'admin') {
        targetPath = '/sites';
      } else if (firstTenant.role === 'agent') {
        targetPath = '/agent';
      } else if (firstTenant.role === 'manager') {
        targetPath = '/dashboard';
      }

      console.log('[Login] Target path:', targetPath);
      router.replace(targetPath);
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">SmartQueue</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder au back office
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded">
            <p className="font-semibold">Comptes de test :</p>
            <div className="space-y-1">
              <p>
                <strong>Super-admin:</strong>{' '}
                <code className="bg-white px-1 rounded">superadmin@smartqueue.app</code> /{' '}
                <code className="bg-white px-1 rounded">admin123</code>
              </p>
              <p>
                <strong>Admin:</strong>{' '}
                <code className="bg-white px-1 rounded">admin@demo-bank.com</code> /{' '}
                <code className="bg-white px-1 rounded">admin123</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
