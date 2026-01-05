'use client';

import { useState } from 'react';
import { Chrome, Unlink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOAuth, useOAuthConnections } from '@/lib/hooks/use-oauth';
import { useToast } from '@/lib/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Image from 'next/image';

const PROVIDER_CONFIG = {
  google: {
    name: 'Google',
    color: 'bg-red-500',
    logo: '/logos/google.svg',
    description: 'Connectez-vous avec votre compte Google',
  },
  microsoft: {
    name: 'Microsoft',
    color: 'bg-blue-500',
    logo: '/logos/microsoft.svg',
    description: 'Connectez-vous avec votre compte Microsoft',
  },
};

export function OAuthSettings() {
  const { loading: oauthLoading, loginWithProvider } = useOAuth();
  const { connections, loading: connectionsLoading, disconnect, refetch } = useOAuthConnections();
  const { toast } = useToast();

  const [disconnectProvider, setDisconnectProvider] = useState<'google' | 'microsoft' | null>(null);

  const handleConnect = async (provider: 'google' | 'microsoft') => {
    try {
      await loginWithProvider(provider);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || `Impossible de se connecter avec ${PROVIDER_CONFIG[provider].name}`,
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectProvider) return;

    try {
      await disconnect(disconnectProvider);
      toast({
        title: 'Déconnecté',
        description: `Votre compte ${PROVIDER_CONFIG[disconnectProvider].name} a été déconnecté`,
      });
      setDisconnectProvider(null);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de déconnecter le compte',
        variant: 'destructive',
      });
    }
  };

  const isConnected = (provider: 'google' | 'microsoft') => {
    return connections.some((c) => c.provider === provider);
  };

  const getConnection = (provider: 'google' | 'microsoft') => {
    return connections.find((c) => c.provider === provider);
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Chrome className="h-4 w-4" />
        <AlertTitle>Authentification OAuth</AlertTitle>
        <AlertDescription>
          Connectez votre compte avec Google ou Microsoft pour une authentification simplifiée et
          sécurisée. Vous pourrez vous connecter sans mot de passe.
        </AlertDescription>
      </Alert>

      {/* OAuth Providers */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Google */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-lg">{PROVIDER_CONFIG.google.name}</CardTitle>
                  {isConnected('google') && (
                    <Badge className="mt-1 bg-green-500">Connecté</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected('google') ? (
              <>
                <div className="text-sm text-muted-foreground">
                  <p>Email: {getConnection('google')?.email}</p>
                  <p className="mt-1">
                    Connecté{' '}
                    {formatDistanceToNow(new Date(getConnection('google')!.connected_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                  <p>
                    Dernière utilisation{' '}
                    {formatDistanceToNow(new Date(getConnection('google')!.last_used_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDisconnectProvider('google')}
                  disabled={connectionsLoading}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Déconnecter
                </Button>
              </>
            ) : (
              <>
                <CardDescription>{PROVIDER_CONFIG.google.description}</CardDescription>
                <Button
                  className="w-full"
                  onClick={() => handleConnect('google')}
                  disabled={oauthLoading}
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  Connecter avec Google
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Microsoft */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#F25022" d="M1 1h10v10H1z" />
                    <path fill="#00A4EF" d="M13 1h10v10H13z" />
                    <path fill="#7FBA00" d="M1 13h10v10H1z" />
                    <path fill="#FFB900" d="M13 13h10v10H13z" />
                  </svg>
                </div>
                <div>
                  <CardTitle className="text-lg">{PROVIDER_CONFIG.microsoft.name}</CardTitle>
                  {isConnected('microsoft') && (
                    <Badge className="mt-1 bg-green-500">Connecté</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConnected('microsoft') ? (
              <>
                <div className="text-sm text-muted-foreground">
                  <p>Email: {getConnection('microsoft')?.email}</p>
                  <p className="mt-1">
                    Connecté{' '}
                    {formatDistanceToNow(new Date(getConnection('microsoft')!.connected_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                  <p>
                    Dernière utilisation{' '}
                    {formatDistanceToNow(new Date(getConnection('microsoft')!.last_used_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setDisconnectProvider('microsoft')}
                  disabled={connectionsLoading}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Déconnecter
                </Button>
              </>
            ) : (
              <>
                <CardDescription>{PROVIDER_CONFIG.microsoft.description}</CardDescription>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleConnect('microsoft')}
                  disabled={oauthLoading}
                >
                  <Chrome className="h-4 w-4 mr-2" />
                  Connecter avec Microsoft
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={disconnectProvider !== null}
        onOpenChange={(open) => !open && setDisconnectProvider(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déconnecter {disconnectProvider && PROVIDER_CONFIG[disconnectProvider].name}</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir déconnecter votre compte{' '}
              {disconnectProvider && PROVIDER_CONFIG[disconnectProvider].name} ? Vous ne pourrez plus
              vous connecter avec ce compte.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectProvider(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDisconnect}>
              Déconnecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
