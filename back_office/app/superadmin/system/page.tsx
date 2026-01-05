'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Globe,
  Clock,
  Mail,
  Smartphone,
  Database,
  Zap,
  AlertCircle,
  CheckCircle,
  Save,
  RotateCcw,
  HardDrive,
  Shield,
  Loader2,
} from 'lucide-react';
import { useSystemConfig, useUpdateSystemConfig, useFeatureFlags, useToggleFeature } from '@/lib/hooks/use-system-config';
import { toast } from 'sonner';
import { SMTPConfiguration } from '@/components/system/smtp-config';

// Types
import type { SystemConfig as SystemConfigType, FeatureFlag } from '@/lib/hooks/use-system-config';

interface MaintenanceSchedule {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  affected_services: string[];
  notify_users: boolean;
}

// Données de démo pour la maintenance (pas encore implémentée dans le backend)
const DEMO_MAINTENANCE: MaintenanceSchedule[] = [
  {
    id: '1',
    title: 'Mise à jour majeure v2.0',
    scheduled_start: '2025-01-20T02:00:00Z',
    scheduled_end: '2025-01-20T04:00:00Z',
    status: 'scheduled',
    affected_services: ['API Backend', 'WebSocket Server', 'PostgreSQL'],
    notify_users: true,
  },
  {
    id: '2',
    title: 'Migration base de données',
    scheduled_start: '2025-01-15T03:00:00Z',
    scheduled_end: '2025-01-15T05:00:00Z',
    status: 'completed',
    affected_services: ['PostgreSQL', 'API Backend'],
    notify_users: true,
  },
];

export default function SystemPage() {
  // Récupération des données depuis l'API
  const { data: apiConfig, isLoading: configLoading, error: configError } = useSystemConfig();
  const { data: apiFeatures, isLoading: featuresLoading } = useFeatureFlags();
  const updateConfig = useUpdateSystemConfig();
  const toggleFeature = useToggleFeature();

  // État local pour les modifications
  const [config, setConfig] = useState<SystemConfigType | null>(null);
  const [maintenance] = useState<MaintenanceSchedule[]>(DEMO_MAINTENANCE);
  const [hasChanges, setHasChanges] = useState(false);

  // Synchroniser l'état local avec les données de l'API
  useEffect(() => {
    if (apiConfig) {
      setConfig(apiConfig);
    }
  }, [apiConfig]);

  const handleConfigChange = (key: keyof SystemConfigType, value: any) => {
    if (!config) return;
    setConfig((prev) => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  const handleFeatureToggle = async (featureId: string) => {
    try {
      await toggleFeature.mutateAsync(featureId);
      toast.success('Feature flag mis à jour avec succès');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du feature flag');
      console.error('Error toggling feature:', error);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      await updateConfig.mutateAsync(config);
      toast.success('Configuration sauvegardée avec succès');
      setHasChanges(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde de la configuration');
      console.error('Error saving config:', error);
    }
  };

  const handleReset = () => {
    if (apiConfig) {
      setConfig(apiConfig);
      setHasChanges(false);
    }
  };

  // Afficher un loader pendant le chargement initial
  if (configLoading || featuresLoading || !config) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement de la configuration système...</p>
        </div>
      </div>
    );
  }

  // Afficher une erreur si le chargement a échoué
  if (configError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
          <p className="text-gray-900 font-medium mb-2">Erreur de chargement</p>
          <p className="text-gray-600">Impossible de charger la configuration système</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFeatureCategoryBadge = (category: FeatureFlag['category']) => {
    const variants: Record<FeatureFlag['category'], { label: string; className: string }> = {
      core: { label: 'Core', className: 'bg-blue-100 text-blue-800' },
      beta: { label: 'Beta', className: 'bg-green-100 text-green-800' },
      experimental: { label: 'Expérimental', className: 'bg-yellow-100 text-yellow-800' },
    };
    const { label, className } = variants[category];
    return (
      <Badge variant="secondary" className={className}>
        {label}
      </Badge>
    );
  };

  const getMaintenanceStatusBadge = (status: MaintenanceSchedule['status']) => {
    const variants = {
      scheduled: { label: 'Programmé', className: 'bg-blue-100 text-blue-800', icon: Clock },
      in_progress: { label: 'En cours', className: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      completed: { label: 'Terminé', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { label: 'Annulé', className: 'bg-gray-100 text-gray-800', icon: AlertCircle },
    };
    const { label, className, icon: Icon } = variants[status];
    return (
      <Badge variant="secondary" className={className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuration Système</h1>
          <p className="text-gray-600 mt-2">
            Paramètres globaux de la plateforme
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Annuler
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </>
          )}
        </div>
      </div>

      {hasChanges && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <div className="font-medium text-yellow-800">Modifications non sauvegardées</div>
            <div className="text-sm text-yellow-700">
              N'oubliez pas de sauvegarder vos changements
            </div>
          </div>
        </div>
      )}

      {/* Configuration générale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration générale
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="platform_name">Nom de la plateforme</Label>
              <Input
                id="platform_name"
                value={config.platform_name}
                onChange={(e) => handleConfigChange('platform_name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_language">Langue par défaut</Label>
              <Select
                value={config.default_language}
                onValueChange={(value) => handleConfigChange('default_language', value)}
              >
                <SelectTrigger id="default_language">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="wo">Wolof</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_timezone">Fuseau horaire</Label>
              <Select
                value={config.default_timezone}
                onValueChange={(value) => handleConfigChange('default_timezone', value)}
              >
                <SelectTrigger id="default_timezone">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Africa/Dakar">Africa/Dakar (GMT+0)</SelectItem>
                  <SelectItem value="Africa/Abidjan">Africa/Abidjan (GMT+0)</SelectItem>
                  <SelectItem value="Europe/Paris">Europe/Paris (GMT+1)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_currency">Devise par défaut</Label>
              <Select
                value={config.default_currency}
                onValueChange={(value) => handleConfigChange('default_currency', value)}
              >
                <SelectTrigger id="default_currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  <SelectItem value="USD">USD (Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_upload_size">Taille max upload (MB)</Label>
              <Input
                id="max_upload_size"
                type="number"
                value={config.max_upload_size_mb}
                onChange={(e) => handleConfigChange('max_upload_size_mb', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_timeout">Timeout session (minutes)</Label>
              <Input
                id="session_timeout"
                type="number"
                value={config.session_timeout_minutes}
                onChange={(e) => handleConfigChange('session_timeout_minutes', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modes et restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Modes et restrictions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Mode maintenance</div>
                <div className="text-sm text-gray-600">
                  Désactive l'accès pour tous les utilisateurs sauf les super-admins
                </div>
              </div>
              <Switch
                checked={config.maintenance_mode}
                onCheckedChange={(checked) => handleConfigChange('maintenance_mode', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Inscription activée</div>
                <div className="text-sm text-gray-600">
                  Permet aux nouvelles organisations de s'inscrire
                </div>
              </div>
              <Switch
                checked={config.registration_enabled}
                onCheckedChange={(checked) => handleConfigChange('registration_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Vérification email obligatoire</div>
                <div className="text-sm text-gray-600">
                  Les utilisateurs doivent vérifier leur email avant d'accéder
                </div>
              </div>
              <Switch
                checked={config.require_email_verification}
                onCheckedChange={(checked) => handleConfigChange('require_email_verification', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Authentification à deux facteurs</div>
                <div className="text-sm text-gray-600">
                  Exige 2FA pour tous les utilisateurs
                </div>
              </div>
              <Switch
                checked={config.require_2fa}
                onCheckedChange={(checked) => handleConfigChange('require_2fa', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Canaux de notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium">Notifications Email</div>
                  <div className="text-sm text-gray-600">
                    Envoi via SendGrid
                  </div>
                </div>
              </div>
              <Switch
                checked={config.email_notifications}
                onCheckedChange={(checked) => handleConfigChange('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium">Notifications SMS</div>
                  <div className="text-sm text-gray-600">
                    Envoi via Orange Money API
                  </div>
                </div>
              </div>
              <Switch
                checked={config.sms_notifications}
                onCheckedChange={(checked) => handleConfigChange('sms_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-gray-400" />
                <div>
                  <div className="font-medium">Notifications Push</div>
                  <div className="text-sm text-gray-600">
                    Envoi via Firebase Cloud Messaging
                  </div>
                </div>
              </div>
              <Switch
                checked={config.push_notifications}
                onCheckedChange={(checked) => handleConfigChange('push_notifications', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <SMTPConfiguration
        initialConfig={{
          smtp_host: config.smtp_host,
          smtp_port: config.smtp_port,
          smtp_use_tls: config.smtp_use_tls,
          smtp_use_ssl: config.smtp_use_ssl,
          smtp_username: config.smtp_username,
          smtp_from_email: config.smtp_from_email,
          smtp_password_set: config.smtp_password_set,
        }}
      />

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {apiFeatures && apiFeatures.length > 0 ? (
              apiFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium">{feature.name}</div>
                      {getFeatureCategoryBadge(feature.category)}
                    </div>
                    <div className="text-sm text-gray-600">{feature.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Key: <code className="bg-gray-200 px-1 rounded">{feature.key}</code>
                    </div>
                  </div>
                  <Switch
                    checked={feature.enabled}
                    onCheckedChange={() => handleFeatureToggle(feature.id)}
                    disabled={toggleFeature.isPending}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                Aucun feature flag configuré
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance planifiée */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Maintenance planifiée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {maintenance.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium mb-2">{item.title}</div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(item.scheduled_start)}
                    </div>
                    <span>→</span>
                    <div>{formatDate(item.scheduled_end)}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.affected_services.map((service, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>{getMaintenanceStatusBadge(item.status)}</div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            Planifier une maintenance
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
