'use client';

import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateKiosk } from '@/lib/hooks/use-kiosks';
import { useSites } from '@/lib/hooks/use-sites';
import { useQueues } from '@/lib/hooks/use-queues';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import type { CreateKioskDto } from '@/lib/types/resources';

const kioskSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  site: z.string().min(1, 'Sélectionnez un site'),
  is_active: z.boolean().default(true),
  require_phone: z.boolean().default(false),
  require_name: z.boolean().default(false),
  enable_appointment_checkin: z.boolean().default(false),
  has_printer: z.boolean().default(false),
  queue_ids: z.array(z.string()).optional(),
  // Printer config could be added here if needed
});

type KioskFormData = z.infer<typeof kioskSchema>;

export default function NewKioskPage() {
  const router = useRouter();
  const { data: sites } = useSites();
  const { data: queues } = useQueues();
  const createKiosk = useCreateKiosk();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<KioskFormData>({
    resolver: zodResolver(kioskSchema),
    defaultValues: {
      name: '',
      site: '',
      is_active: true,
      require_phone: false,
      require_name: false,
      enable_appointment_checkin: false,
      has_printer: false,
      queue_ids: [],
    },
  });

  const onSubmit = async (data: KioskFormData) => {
    try {
      await createKiosk.mutateAsync(data as CreateKioskDto);
      toast.success('Borne créée avec succès');
      router.push('/kiosks');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/kiosks">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nouvelle borne interactive</h1>
          <p className="text-gray-600 mt-1">
            Configurez une nouvelle borne d&apos;accueil pour vos visiteurs
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations de base */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de base</CardTitle>
            <CardDescription>Configuration générale de la borne</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la borne *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Borne Entrée Principale"
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
              <Label htmlFor="is_active">Borne active</Label>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle>Services disponibles</CardTitle>
            <CardDescription>Quelles files d&apos;attente sont accessibles depuis cette borne ?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="queue_ids">Files d&apos;attente</Label>
              <Controller
                name="queue_ids"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border rounded p-4 max-h-80 overflow-y-auto">
                    {queues && queues.length > 0 ? (
                      queues.map((queue) => (
                        <div key={queue.id} className="flex items-start space-x-2 p-2 hover:bg-gray-50 rounded">
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
                            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <label htmlFor={`queue-${queue.id}`} className="text-sm font-medium block text-gray-900 cursor-pointer">
                              {queue.name}
                            </label>
                            <span className="text-xs text-gray-500">
                              {queue.service?.name || 'Service général'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center text-gray-500 py-4">
                        Aucune file d&apos;attente disponible. Veuillez d&apos;abord créer des files.
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Options de saisie */}
        <Card>
          <CardHeader>
            <CardTitle>Options de saisie</CardTitle>
            <CardDescription>Informations demandées au client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="require_name">Nom du client</Label>
                  <p className="text-sm text-gray-500">Demander le nom du client lors de la prise de ticket</p>
                </div>
                <Controller
                  name="require_name"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="require_name"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="require_phone">Numéro de téléphone</Label>
                  <p className="text-sm text-gray-500">Demander le numéro de téléphone pour les notifications SMS</p>
                </div>
                <Controller
                  name="require_phone"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="require_phone"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="enable_appointment_checkin">Check-in RDV</Label>
                  <p className="text-sm text-gray-500">Permettre aux clients avec RDV de s&apos;enregistrer</p>
                </div>
                <Controller
                  name="enable_appointment_checkin"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="enable_appointment_checkin"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="has_printer">Imprimante de tickets</Label>
                  <p className="text-sm text-gray-500">Une imprimante thermique est connectée à cette borne</p>
                </div>
                <Controller
                  name="has_printer"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="has_printer"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/kiosks">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button type="submit" disabled={createKiosk.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createKiosk.isPending ? 'Création...' : 'Créer la borne'}
          </Button>
        </div>
      </form>
    </div>
  );
}
