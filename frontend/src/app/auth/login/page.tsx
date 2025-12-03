'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Suspense } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

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

      // Après connexion, vérifier si l'utilisateur a un pending_company_name
      // et créer automatiquement son tenant
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('access_token');

      if (token) {
        try {
          // Essayer de créer le tenant
          const createTenantResponse = await fetch(`${API_URL}/api/v1/auth/create-tenant/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (createTenantResponse.ok) {
            const tenantData = await createTenantResponse.json();
            console.log('Tenant créé:', tenantData);
          }
          // Si erreur 400, c'est que l'utilisateur a déjà un tenant, on continue
        } catch (err) {
          console.log('Pas de tenant à créer ou déjà existant');
        }
      }

      // Redirection vers le back office (port 3000) après connexion
      // Le back office contient les dashboards pour les différents rôles
      window.location.href = 'http://localhost:3000';
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Side - Hero */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="text-2xl font-bold">SmartQueue</span>
            </Link>

            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
              Bon retour parmi nous !
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed">
              Accédez à votre tableau de bord pour gérer vos files d'attente et optimiser l'expérience de vos clients.
            </p>
          </div>

          {/* Benefits */}
          <div className="space-y-4 pt-8">
            {[
              { icon: '📊', text: 'Analytics en temps réel', desc: 'Suivez vos performances en direct' },
              { icon: '👥', text: 'Gestion multi-agents', desc: 'Coordonnez vos équipes efficacement' },
              { icon: '🔔', text: 'Notifications automatiques', desc: 'Tenez vos clients informés' }
            ].map((benefit, i) => (
              <div key={i} className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="text-3xl">{benefit.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{benefit.text}</h3>
                  <p className="text-sm text-gray-600">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Indicators */}
          <div className="pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-4">Ils nous font confiance :</p>
            <div className="flex items-center gap-6">
              {['🏦 Bank of Africa', '🏥 Polyclinique', '🍽️ Restaurants'].map((brand, i) => (
                <div key={i} className="text-sm font-medium text-gray-700 bg-gray-100 px-4 py-2 rounded-full">
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <Card className="bg-white shadow-2xl border-0 p-8 lg:p-10">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                Connexion
              </h2>
              <p className="text-gray-600">
                Accédez à votre espace SmartQueue
              </p>
            </div>

            {/* Success Message */}
            {message && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {message}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@entreprise.com"
                  autoComplete="email"
                  {...register('email')}
                  disabled={isLoading}
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                    Mot de passe
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  disabled={isLoading}
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.password && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {errors.root && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {errors.root.message}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </Button>

              {/* Divider */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Ou</span>
                </div>
              </div>

              {/* OAuth Buttons (Optional) */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 border-gray-300 hover:bg-gray-50"
                  disabled
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 border-gray-300 hover:bg-gray-50"
                  disabled
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M11.55 2C6.28 2 2 6.28 2 11.55c0 5.27 4.28 9.55 9.55 9.55 5.27 0 9.55-4.28 9.55-9.55C21.1 6.28 16.82 2 11.55 2zm4.77 14.87c-1.11.89-2.56 1.43-4.16 1.43-3.56 0-6.46-2.9-6.46-6.46 0-1.6.54-3.05 1.43-4.16l9.19 9.19z"/>
                  </svg>
                  Microsoft
                </Button>
              </div>
            </form>

            {/* Register Link */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-center text-gray-600">
                Pas encore de compte ?{' '}
                <Link
                  href="/auth/register"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Créer un compte gratuitement
                </Link>
              </p>
            </div>

            {/* Security Notice */}
            <div className="pt-4">
              <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Connexion sécurisée SSL
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <LoginContent />
    </Suspense>
  );
}
