'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.response?.status === 401) {
        setError('root', { 
          type: 'manual', 
          message: 'Email ou mot de passe incorrect' 
        });
      } else {
        setError('root', { 
          type: 'manual', 
          message: 'Erreur de connexion. Veuillez réessayer.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Connexion
          </CardTitle>
          <CardDescription className="text-center">
            Connectez-vous à votre compte SmartQueue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
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
                placeholder="Votre mot de passe"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-red-500 text-center">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/">
              <Button variant="outline" size="sm">
                ← Retour à l'accueil
              </Button>
            </Link>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">
              Pas encore de compte ?{' '}
              <Link
                href="/auth/register"
                className="text-blue-600 hover:underline"
              >
                Créer un compte
              </Link>
            </span>
          </div>

          {/* Credentials de test - visible en développement uniquement */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="font-semibold text-blue-900 mb-2">🔑 Credentials de test:</p>
              <div className="space-y-3 text-left text-blue-800">
                <div>
                  <p className="font-medium text-blue-900">Clinique Madeleine:</p>
                  <div className="ml-2 space-y-1">
                    <div>
                      <p className="text-xs text-blue-700">Admin:</p>
                      <p className="font-mono text-xs">m.ndiaye@5sursync.com / admin123</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700">Agent:</p>
                      <p className="font-mono text-xs">awa@clinique-madeleine.sn / admin123</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-blue-200 pt-2">
                  <p className="font-medium text-blue-900">Demo Bank:</p>
                  <div className="ml-2">
                    <p className="text-xs text-blue-700">Admin:</p>
                    <p className="font-mono text-xs">admin@demo-bank.com / admin123</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}