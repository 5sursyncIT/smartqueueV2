'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { contactApi } from '@/lib/api/contact';
import { toast } from 'sonner';

const trialSchema = z.object({
  companyName: z.string().min(2, 'Le nom de l\'entreprise doit contenir au moins 2 caractères'),
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(8, 'Le numéro de téléphone doit contenir au moins 8 caractères'),
  companySize: z.string().min(1, 'Veuillez indiquer la taille de votre entreprise'),
  industry: z.string().min(1, 'Veuillez indiquer votre secteur d\'activité'),
  message: z.string().min(10, 'Votre message doit contenir au moins 10 caractères').max(500, 'Votre message ne peut pas dépasser 500 caractères'),
});

type TrialFormData = z.infer<typeof trialSchema>;

export default function TrialPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<TrialFormData>({
    resolver: zodResolver(trialSchema),
  });

  const onSubmit = async (data: TrialFormData) => {
    setIsLoading(true);

    try {
      const response = await contactApi.createTrialRequest(data);

      if (response.success) {
        toast.success(response.message);
        setSubmitSuccess(true);
      } else {
        toast.error('Une erreur s\'est produite lors de l\'envoi de votre demande.');
      }
    } catch (error: any) {
      console.error('Erreur lors de la soumission:', error);
      const errorMessage = error.response?.data?.message || 'Une erreur s\'est produite. Veuillez réessayer.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl font-bold">Demande envoyée !</CardTitle>
            <CardDescription>
              Merci pour votre intérêt. Notre équipe vous contactera dans les plus brefs délais 
              pour configurer votre essai gratuit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Essai Gratuit pour les Entreprises
          </CardTitle>
          <CardDescription className="text-center">
            Découvrez comment SmartQueue peut transformer l'expérience d'attente de vos clients.
            Profitez de 14 jours d'essai gratuit sans engagement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de l'entreprise *</Label>
                <Input
                  id="companyName"
                  placeholder="Votre entreprise"
                  {...register('companyName')}
                  disabled={isLoading}
                />
                {errors.companyName && (
                  <p className="text-sm text-red-500">{errors.companyName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Secteur d'activité *</Label>
                <Input
                  id="industry"
                  placeholder="Santé, Restauration, Commerce..."
                  {...register('industry')}
                  disabled={isLoading}
                />
                {errors.industry && (
                  <p className="text-sm text-red-500">{errors.industry.message}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  placeholder="Votre prénom"
                  {...register('firstName')}
                  disabled={isLoading}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  placeholder="Votre nom"
                  {...register('lastName')}
                  disabled={isLoading}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@entreprise.sn"
                  {...register('email')}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+221 XX XXX XX XX"
                  {...register('phone')}
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySize">Taille de l'entreprise *</Label>
              <Input
                id="companySize"
                placeholder="Ex: 1-10 employés"
                {...register('companySize')}
                disabled={isLoading}
              />
              {errors.companySize && (
                <p className="text-sm text-red-500">{errors.companySize.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (optionnel)</Label>
              <Input
                id="message"
                placeholder="Décrivez vos besoins spécifiques ou posez-nous vos questions..."
                {...register('message')}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Envoi en cours...' : 'Demander mon essai gratuit'}
            </Button>

            <div className="text-center text-sm text-gray-500">
              <p>* Champs obligatoires</p>
              <p className="mt-2">
                Déjà un compte ?{' '}
                <Link href="/auth/login" className="text-blue-600 hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}