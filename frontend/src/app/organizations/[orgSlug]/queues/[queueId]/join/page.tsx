'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const joinQueueSchema = z.object({
  full_name: z.string().min(2, 'Le nom complet doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(8, 'Le numéro de téléphone doit contenir au moins 8 caractères'),
});

type JoinQueueForm = z.infer<typeof joinQueueSchema>;

interface TicketResponse {
  ticket_id: string;
  ticket_number: string;
  queue_name: string;
  service_name: string | null;
  status: string;
  position: number;
  eta_seconds: number;
  created_at: string;
}

export default function JoinOrganizationQueuePage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const queueId = params.queueId as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticket, setTicket] = useState<TicketResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinQueueForm>({
    resolver: zodResolver(joinQueueSchema),
  });

  const onSubmit = async (data: JoinQueueForm) => {
    setIsSubmitting(true);

    try {
      const response = await apiClient.post(
        `/public/tenants/${orgSlug}/queues/${queueId}/signup/`,
        data
      );

      setTicket(response.data);
      toast.success('Ticket créé avec succès !');
    } catch (error: any) {
      console.error('Error joining queue:', error);
      const errorMessage = error.response?.data?.detail || 'Une erreur s\'est produite. Veuillez réessayer.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatETA = (seconds: number): string => {
    if (seconds < 60) return `${seconds} secondes`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  // Success screen after getting ticket
  if (ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Ticket créé !</CardTitle>
            <CardDescription>Votre place dans la file a été confirmée</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
              <p className="text-sm text-gray-600 mb-2">Votre numéro de ticket</p>
              <p className="text-4xl font-bold text-blue-600">{ticket.ticket_number}</p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">File d'attente</span>
                <span className="font-medium">{ticket.queue_name}</span>
              </div>
              {ticket.service_name && (
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="text-gray-600">Service</span>
                  <span className="font-medium">{ticket.service_name}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Position</span>
                <span className="font-medium">{ticket.position}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Temps d'attente estimé</span>
                <span className="font-medium">{formatETA(ticket.eta_seconds)}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Notez votre numéro de ticket ou conservez ce lien pour suivre votre progression.
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => router.push(`/track/${ticket.ticket_id}`)}
                className="w-full"
              >
                Suivre mon ticket
              </Button>
              <Link href={`/organizations/${orgSlug}/queues`} className="block">
                <Button variant="outline" className="w-full">
                  Retour aux files
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Form to join queue
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <Link
            href={`/organizations/${orgSlug}/queues`}
            className="inline-flex items-center text-sm text-blue-600 hover:underline mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Retour aux files
          </Link>
          <CardTitle className="text-2xl">Rejoindre la file</CardTitle>
          <CardDescription>
            Remplissez vos informations pour obtenir votre ticket
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nom complet *</Label>
              <Input
                id="full_name"
                placeholder="Prénom Nom"
                {...register('full_name')}
                disabled={isSubmitting}
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre.email@exemple.com"
                {...register('email')}
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Ces informations seront utilisées pour vous contacter si nécessaire.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Création du ticket...' : 'Obtenir mon ticket'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
