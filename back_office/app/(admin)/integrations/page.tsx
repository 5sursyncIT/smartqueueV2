'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, CheckCircle, XCircle, MessageSquare, Mail, Bell, Zap } from 'lucide-react';

export default function IntegrationsPage() {
  const integrations = [
    {
      id: 'twilio',
      name: 'Twilio',
      description: 'SMS et notifications WhatsApp',
      icon: MessageSquare,
      color: 'bg-red-100 text-red-600',
      isActive: true,
      status: 'Configuré',
      config: {
        accountSid: 'AC****************************',
        phoneNumber: '+221********',
      },
    },
    {
      id: 'sendgrid',
      name: 'SendGrid',
      description: 'Envoi d\'emails transactionnels',
      icon: Mail,
      color: 'bg-blue-100 text-blue-600',
      isActive: true,
      status: 'Configuré',
      config: {
        apiKey: 'SG.****************************',
        fromEmail: 'noreply@demo-bank.com',
      },
    },
    {
      id: 'firebase',
      name: 'Firebase Cloud Messaging',
      description: 'Notifications push mobiles',
      icon: Bell,
      color: 'bg-orange-100 text-orange-600',
      isActive: false,
      status: 'Non configuré',
      config: null,
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Automatisation et intégrations',
      icon: Zap,
      color: 'bg-yellow-100 text-yellow-600',
      isActive: false,
      status: 'Non configuré',
      config: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Intégrations</h1>
        <p className="text-gray-600 mt-2">
          Configurez les intégrations externes pour les notifications et l'automatisation
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total intégrations</p>
                <p className="text-2xl font-bold">{integrations.length}</p>
              </div>
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Actives</p>
                <p className="text-2xl font-bold text-green-600">
                  {integrations.filter(i => i.isActive).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">À configurer</p>
                <p className="text-2xl font-bold text-gray-600">
                  {integrations.filter(i => !i.isActive).length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des intégrations */}
      <div className="grid gap-4">
        {integrations.map((integration) => {
          const Icon = integration.icon;

          return (
            <Card key={integration.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`p-4 rounded-lg ${integration.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{integration.name}</h3>
                        <Badge
                          variant={integration.isActive ? 'default' : 'outline'}
                        >
                          {integration.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        {integration.description}
                      </p>

                      {integration.config && (
                        <div className="space-y-2">
                          {Object.entries(integration.config).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2 text-sm">
                              <span className="text-gray-500 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}:
                              </span>
                              <code className="px-2 py-1 bg-gray-100 rounded text-xs">
                                {value}
                              </code>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {integration.isActive ? (
                      <>
                        <Button variant="outline" size="sm">
                          Tester
                        </Button>
                        <Button variant="outline" size="sm">
                          Configurer
                        </Button>
                        <Button variant="ghost" size="sm">
                          Désactiver
                        </Button>
                      </>
                    ) : (
                      <Button size="sm">
                        Configurer
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Twilio - SMS & WhatsApp</h4>
              <p className="text-sm text-gray-600 mb-2">
                Pour configurer Twilio, vous aurez besoin de:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Account SID (disponible dans votre console Twilio)</li>
                <li>Auth Token (dans les paramètres de sécurité)</li>
                <li>Numéro de téléphone Twilio pour SMS</li>
                <li>Numéro WhatsApp approuvé (optionnel)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">SendGrid - Email</h4>
              <p className="text-sm text-gray-600 mb-2">
                Pour configurer SendGrid, vous aurez besoin de:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>API Key (créer dans Settings → API Keys)</li>
                <li>Adresse email expéditeur vérifiée</li>
                <li>Domaine vérifié (recommandé pour la délivrabilité)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Firebase Cloud Messaging - Push</h4>
              <p className="text-sm text-gray-600 mb-2">
                Pour configurer FCM, vous aurez besoin de:
              </p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Fichier credentials.json de votre projet Firebase</li>
                <li>Server Key (dans les paramètres Cloud Messaging)</li>
                <li>Configuration des applications mobiles (Android/iOS)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
