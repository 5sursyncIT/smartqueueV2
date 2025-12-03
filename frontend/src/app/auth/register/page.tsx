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
import { Card } from '@/components/ui/card';

const registerSchema = z.object({
  companyName: z.string().min(2, 'Le nom d\'entreprise doit contenir au moins 2 caractères'),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/v1/auth/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          password: data.password,
          phone_number: '',
          company_name: data.companyName,
          base_url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 409 || errorData.email) {
          setError('email', {
            type: 'manual',
            message: errorData.email?.[0] || 'Cet email est déjà utilisé'
          });
          return;
        }

        throw new Error(errorData.message || 'Erreur lors de la création du compte');
      }

      const result = await response.json();

      if (result.verification_email_sent) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}&company=${encodeURIComponent(data.companyName)}`);
      } else {
        router.push('/auth/login?message=Compte créé avec succès');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError('root', {
        type: 'manual',
        message: error.message || 'Erreur lors de la création du compte. Veuillez réessayer.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-12">
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
              Gérez vos files d'attente
              <span className="text-blue-600 block">sans friction</span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed">
              Rejoignez des centaines d'entreprises qui transforment l'expérience client avec SmartQueue.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-4 pt-8">
            {[
              'Installation en moins de 5 minutes',
              '14 jours d\'essai gratuit',
              'Aucune carte bancaire requise',
              'Support francophone inclus'
            ].map((feature, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700 font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
            {[
              { value: '250+', label: 'Entreprises' },
              { value: '500K+', label: 'Clients' },
              { value: '99.9%', label: 'Uptime' }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Form */}
        <Card className="bg-white shadow-2xl border-0 p-8 lg:p-10">
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                Créer mon compte
              </h2>
              <p className="text-gray-600">
                Commencez votre essai gratuit de 14 jours
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700">
                  Nom de l'entreprise
                </Label>
                <Input
                  id="companyName"
                  placeholder="Mon Entreprise SA"
                  {...register('companyName')}
                  disabled={isLoading}
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.companyName && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700">
                    Prénom
                  </Label>
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    {...register('firstName')}
                    disabled={isLoading}
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.firstName && (
                    <p className="text-sm text-red-600">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-semibold text-gray-700">
                    Nom
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Dupont"
                    {...register('lastName')}
                    disabled={isLoading}
                    className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {errors.lastName && (
                    <p className="text-sm text-red-600">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email professionnel
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@entreprise.com"
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
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Mot de passe
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isLoading}
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
                  Confirmer le mot de passe
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register('confirmPassword')}
                  disabled={isLoading}
                  className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
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
                    Création en cours...
                  </span>
                ) : (
                  'Créer mon compte gratuitement'
                )}
              </Button>

              {/* Terms */}
              <p className="text-xs text-center text-gray-500">
                En créant un compte, vous acceptez nos{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                  Conditions d'utilisation
                </Link>{' '}
                et notre{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                  Politique de confidentialité
                </Link>
              </p>
            </form>

            {/* Login Link */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-center text-gray-600">
                Vous avez déjà un compte ?{' '}
                <Link
                  href="/auth/login"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
