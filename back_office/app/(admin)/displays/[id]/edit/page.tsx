'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDisplay, useUpdateDisplay } from '@/lib/hooks/use-displays';
import { useSites } from '@/lib/hooks/use-sites';
import { useQueues } from '@/lib/hooks/use-queues';
import { toast } from 'sonner';
import { ArrowLeft, Save, Monitor } from 'lucide-react';
import Link from 'next/link';
import type { UpdateDisplayDto } from '@/lib/types/resources';

const displaySchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  site: z.string().min(1, 'Sélectionnez un site'),
  display_type: z.enum(['main', 'counter', 'waiting']),
  layout: z.enum(['split', 'modern', 'grid', 'list', 'fullscreen']).default('modern'),
  theme: z.object({
    primaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    logo: z.string().optional(),
  }).optional(),
  auto_refresh_seconds: z.number().min(3).max(60).default(10),
  show_video: z.boolean().default(true),
  video_url: z.string().url('URL invalide').optional().or(z.literal('')),
  background_image: z.string().url('URL invalide').optional().or(z.literal('')),
  custom_message: z.string().default('Votre bannière de messages à la clientèle'),
  secondary_message: z.string().optional(),
  message_position: z.enum(['top', 'bottom', 'both']).default('bottom'),
  queue_ids: z.array(z.string()).optional(),
  is_active: z.boolean().default(true),
});

type DisplayFormData = z.infer<typeof displaySchema>;

export default function EditDisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();

  const { data: display, isLoading: displayLoading } = useDisplay(id);
  const { data: sites } = useSites();
  const { data: queues } = useQueues();
  const updateDisplay = useUpdateDisplay(id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
  } = useForm<DisplayFormData>({
    resolver: zodResolver(displaySchema),
    defaultValues: {
      name: '',
      site: '',
      display_type: 'main',
      layout: 'modern',
      auto_refresh_seconds: 10,
      show_video: true,
      custom_message: 'Votre bannière de messages à la clientèle',
      message_position: 'bottom',
      is_active: true,
      theme: {
        primaryColor: '#3b82f6',
        backgroundColor: '#ffffff',
        textColor: '#000000',
      },
    },
  });

  const showVideo = watch('show_video');
  const layoutValue = watch('layout');

  useEffect(() => {
    if (display) {
      reset({
        name: display.name,
        site: display.site,
        display_type: display.display_type,
        layout: display.layout,
        auto_refresh_seconds: display.auto_refresh_seconds,
        show_video: display.show_video,
        video_url: display.video_url || '',
        background_image: display.background_image || '',
        custom_message: display.custom_message,
        secondary_message: display.secondary_message || '',
        message_position: display.message_position,
        queue_ids: display.queues?.map(q => q.id) || [],
        is_active: display.is_active,
        theme: {
          primaryColor: display.theme?.primaryColor || '#3b82f6',
          backgroundColor: display.theme?.backgroundColor || '#ffffff',
          textColor: display.theme?.textColor || '#000000',
          logo: display.theme?.logo || '',
        },
      });
    }
  }, [display, reset]);

  const onSubmit = async (data: DisplayFormData) => {
    try {
      await updateDisplay.mutateAsync(data as UpdateDisplayDto);
      toast.success('Écran mis à jour avec succès');
      router.push('/displays');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erreur lors de la mise à jour');
    }
  };

  if (displayLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!display) {
    return (
      <Card className="p-8">
        <p className="text-red-600">Écran non trouvé</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/displays">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modifier l&apos;écran</h1>
          <p className="text-gray-600 mt-1">
            Personnalisez l&apos;affichage et les messages de votre écran
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations de base */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
            <CardDescription>Configuration générale de l&apos;écran</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l&apos;écran *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Écran principal"
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="site">Site *</Label>
                <Controller
                  name="site"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un site" />
                      </SelectTrigger>
                      <SelectContent>
                        {sites?.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.site && (
                  <p className="text-sm text-red-600">{errors.site.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="display_type">Type d&apos;écran *</Label>
                <Controller
                  name="display_type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Principal</SelectItem>
                        <SelectItem value="counter">Guichet</SelectItem>
                        <SelectItem value="waiting">Salle d&apos;attente</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="layout">Layout</Label>
                <Controller
                  name="layout"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Moderne</SelectItem>
                        <SelectItem value="split">Divisé (Split)</SelectItem>
                        <SelectItem value="grid">Grille</SelectItem>
                        <SelectItem value="list">Liste</SelectItem>
                        <SelectItem value="fullscreen">Plein écran</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto_refresh_seconds">Rafraîchissement (sec)</Label>
                <Input
                  id="auto_refresh_seconds"
                  type="number"
                  min={3}
                  max={60}
                  {...register('auto_refresh_seconds', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="queue_ids">Files d&apos;attente</Label>
              <Controller
                name="queue_ids"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    {queues?.map((queue) => (
                      <div key={queue.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`queue-${queue.id}`}
                          checked={field.value?.includes(queue.id)}
                          onChange={(e) => {
                            const currentValue = field.value || [];
                            if (e.target.checked) {
                              field.onChange([...currentValue, queue.id]);
                            } else {
                              field.onChange(currentValue.filter(id => id !== queue.id));
                            }
                          }}
                          className="rounded"
                        />
                        <label htmlFor={`queue-${queue.id}`} className="text-sm">
                          {queue.name}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="is_active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="is_active">Écran actif</Label>
            </div>
          </CardContent>
        </Card>

        {/* Personnalisation visuelle */}
        <Card>
          <CardHeader>
            <CardTitle>Personnalisation visuelle</CardTitle>
            <CardDescription>Couleurs et apparence de l&apos;écran</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Couleur principale</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  {...register('theme.primaryColor')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backgroundColor">Couleur de fond</Label>
                <Input
                  id="backgroundColor"
                  type="color"
                  {...register('theme.backgroundColor')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="textColor">Couleur du texte</Label>
                <Input
                  id="textColor"
                  type="color"
                  {...register('theme.textColor')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">URL du logo</Label>
              <Input
                id="logo"
                {...register('theme.logo')}
                placeholder="https://example.com/logo.png"
              />
            </div>

            {(layoutValue === 'modern' || layoutValue === 'split') && (
              <>
                <div className="flex items-center space-x-2">
                  <Controller
                    name="show_video"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="show_video"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="show_video">Afficher zone vidéo/image</Label>
                </div>

                {showVideo && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="video_url">URL de la vidéo (YouTube, Vimeo, etc.)</Label>
                      <Input
                        id="video_url"
                        {...register('video_url')}
                        placeholder="https://www.youtube.com/embed/..."
                      />
                      {errors.video_url && (
                        <p className="text-sm text-red-600">{errors.video_url.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="background_image">Image de fond (alternative à la vidéo)</Label>
                      <Input
                        id="background_image"
                        {...register('background_image')}
                        placeholder="https://example.com/background.jpg"
                      />
                      {errors.background_image && (
                        <p className="text-sm text-red-600">{errors.background_image.message}</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Messages personnalisés */}
        <Card>
          <CardHeader>
            <CardTitle>Messages personnalisés</CardTitle>
            <CardDescription>Configurez les messages affichés à vos clients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom_message">Message principal *</Label>
              <Textarea
                id="custom_message"
                {...register('custom_message')}
                placeholder="Bienvenue ! Merci de patienter, un agent vous recevra bientôt."
                rows={3}
              />
              <p className="text-xs text-gray-500">
                Ce message sera affiché en bas de l&apos;écran pour tous les visiteurs
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_message">Message secondaire (défilant)</Label>
              <Textarea
                id="secondary_message"
                {...register('secondary_message')}
                placeholder="Nos horaires: Lundi-Vendredi 8h-18h | Samedi 9h-13h"
                rows={2}
              />
              <p className="text-xs text-gray-500">
                Message optionnel qui défilera en bas de l&apos;écran
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message_position">Position du message</Label>
              <Controller
                name="message_position"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom">En bas</SelectItem>
                      <SelectItem value="top">En haut</SelectItem>
                      <SelectItem value="both">Haut et bas</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/displays">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={updateDisplay.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateDisplay.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
