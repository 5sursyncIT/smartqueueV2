'use client';

import { useState } from 'react';
import { Shield, Smartphone, Mail, Key, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useTwoFactor } from '@/lib/hooks/use-2fa';
import { useToast } from '@/lib/hooks/use-toast';
import Image from 'next/image';

export function TwoFactorSettings() {
  const { status, loading, setupTOTP, setupSMS, verifyAndEnable, disable } = useTwoFactor();
  const { toast } = useToast();

  const [showTOTPDialog, setShowTOTPDialog] = useState(false);
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);

  const [totpData, setTotpData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleSetupTOTP = async () => {
    try {
      const data = await setupTOTP();
      setTotpData(data);
      setShowTOTPDialog(true);
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de configurer TOTP',
        variant: 'destructive',
      });
    }
  };

  const handleSetupSMS = async () => {
    if (!phoneNumber) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un numéro de téléphone',
        variant: 'destructive',
      });
      return;
    }

    try {
      await setupSMS(phoneNumber);
      setShowSMSDialog(false);
      setShowVerifyDialog(true);
      toast({
        title: 'Code envoyé',
        description: 'Un code de vérification a été envoyé à votre téléphone',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer le code SMS',
        variant: 'destructive',
      });
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer le code de vérification',
        variant: 'destructive',
      });
      return;
    }

    try {
      const data = await verifyAndEnable(verificationCode);
      setBackupCodes(data.backupCodes);
      setShowTOTPDialog(false);
      setShowVerifyDialog(false);
      setShowBackupCodesDialog(true);
      toast({
        title: 'Authentification 2FA activée',
        description: 'Votre compte est maintenant protégé par 2FA',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Code de vérification invalide',
        variant: 'destructive',
      });
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ?')) {
      return;
    }

    try {
      await disable();
      toast({
        title: '2FA désactivée',
        description: 'L\'authentification à deux facteurs a été désactivée',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de désactiver 2FA',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: 'Copié',
      description: 'Code copié dans le presse-papiers',
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Statut 2FA
              </CardTitle>
              <CardDescription>
                Protégez votre compte avec l'authentification à deux facteurs
              </CardDescription>
            </div>
            {status?.enabled && (
              <Badge className="bg-green-500">
                Activée ({status.method === 'totp' ? 'App' : 'SMS'})
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : status?.enabled ? (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>2FA Activée</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Votre compte est protégé par l'authentification à deux facteurs via{' '}
                  {status.method === 'totp' ? 'une application d\'authentification' : 'SMS'}
                </span>
                <Button variant="destructive" size="sm" onClick={handleDisable2FA}>
                  Désactiver
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertTitle>2FA Non Activée</AlertTitle>
              <AlertDescription>
                Nous recommandons fortement d'activer l'authentification à deux facteurs pour
                protéger votre compte contre les accès non autorisés.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Setup Options */}
      {!status?.enabled && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* TOTP Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Application d'Authentification
              </CardTitle>
              <CardDescription>
                Utilisez Google Authenticator, Authy, ou une autre app TOTP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleSetupTOTP} className="w-full" disabled={loading}>
                <Key className="h-4 w-4 mr-2" />
                Configurer TOTP
              </Button>
            </CardContent>
          </Card>

          {/* SMS Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                SMS
              </CardTitle>
              <CardDescription>
                Recevez un code de vérification par SMS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowSMSDialog(true)}
                className="w-full"
                variant="outline"
                disabled={loading}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Configurer SMS
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TOTP Setup Dialog */}
      <Dialog open={showTOTPDialog} onOpenChange={setShowTOTPDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurer TOTP</DialogTitle>
            <DialogDescription>
              Scannez le QR code avec votre application d'authentification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {totpData?.qrCode && (
              <div className="flex justify-center">
                <Image
                  src={totpData.qrCode}
                  alt="QR Code TOTP"
                  width={200}
                  height={200}
                  className="border rounded"
                />
              </div>
            )}
            <div>
              <Label>Ou entrez ce code manuellement</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={totpData?.secret || ''}
                  readOnly
                  className="font-mono"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => totpData?.secret && copyToClipboard(totpData.secret)}
                >
                  {copiedCode === totpData?.secret ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div>
              <Label>Code de vérification</Label>
              <Input
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="font-mono text-center text-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTOTPDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleVerifyAndEnable} disabled={!verificationCode || loading}>
              Vérifier et Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Setup Dialog */}
      <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurer SMS</DialogTitle>
            <DialogDescription>
              Entrez votre numéro de téléphone pour recevoir les codes par SMS
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Numéro de téléphone</Label>
              <Input
                type="tel"
                placeholder="+33 6 12 34 56 78"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSMSDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSetupSMS} disabled={!phoneNumber || loading}>
              Envoyer Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog (SMS) */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vérifier le Code SMS</DialogTitle>
            <DialogDescription>
              Entrez le code de vérification reçu par SMS
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code de vérification</Label>
              <Input
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                className="font-mono text-center text-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleVerifyAndEnable} disabled={!verificationCode || loading}>
              Vérifier et Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Codes de Secours</DialogTitle>
            <DialogDescription>
              Sauvegardez ces codes dans un endroit sûr. Vous pouvez les utiliser si vous perdez
              l'accès à votre méthode 2FA principale.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {backupCodes.map((code, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={code}
                  readOnly
                  className="font-mono"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(code)}
                >
                  {copiedCode === code ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowBackupCodesDialog(false)}>
              J'ai sauvegardé les codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
