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

const registerSchema = z.object({
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
      // Appel API pour créer le compte
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
      console.log('Utilisateur créé:', result);

      // Vérifier si la vérification email est requise
      if (result.verification_email_sent) {
        // Rediriger vers la page de vérification email
        router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      } else {
        // Si pas de vérification requise, rediriger vers login
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Créer un compte
          </CardTitle>
          <CardDescription className="text-center">
            Rejoignez SmartQueue pour gérer vos files d\'attente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  {...register('firstName')}
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  {...register('lastName')}
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirmez votre mot de passe"
                {...register('confirmPassword')}
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {errors.root && (
              <p className="text-sm text-red-500 text-center">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Création...' : 'Créer mon compte'}
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
              Déjà un compte ?{' '}
              <Link 
                href="/auth/login" 
                className="text-blue-600 hover:underline"
              >
                Se connecter
              </Link>
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}