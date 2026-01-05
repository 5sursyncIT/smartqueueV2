'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, CheckCircle2, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { VerificationCodeInput } from '@/components/auth/verification-code-input';
import { useEmailVerification } from '@/lib/hooks/use-email-verification';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [code, setCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expirationTime, setExpirationTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const { loading, error, verifyEmail, resendVerification } = useEmailVerification();

  // Initialiser le temps d'expiration (15 minutes à partir de maintenant)
  useEffect(() => {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 15);
    setExpirationTime(expiration);
  }, []);

  // Countdown timer pour l'expiration du code
  useEffect(() => {
    if (!expirationTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = expirationTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining('Code expiré');
        clearInterval(interval);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expirationTime]);

  // Cooldown pour le renvoi du code
  useEffect(() => {
    if (resendCooldown > 0) {
      const timeout = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timeout);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  // Rediriger si pas d'email
  useEffect(() => {
    if (!email) {
      toast.error('Email manquant');
      router.push('/login');
    }
  }, [email, router]);

  const handleVerify = async () => {
    if (!email || code.length !== 6) {
      toast.error('Veuillez entrer un code à 6 chiffres');
      return;
    }

    try {
      const response = await verifyEmail(email, code);

      if (response.success) {
        setIsVerified(true);
        toast.success('Email vérifié avec succès !');

        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      toast.error(err.message || 'Code invalide ou expiré');
      setCode(''); // Réinitialiser le code en cas d'erreur
    }
  };

  const handleResend = async () => {
    if (!email || !canResend) return;

    try {
      setCanResend(false);
      const response = await resendVerification(email);

      if (response.success) {
        toast.success('Nouveau code envoyé !');
        setResendCooldown(60); // 60 secondes de cooldown

        // Réinitialiser le temps d'expiration
        const expiration = new Date();
        expiration.setMinutes(expiration.getMinutes() + 15);
        setExpirationTime(expiration);

        setCode(''); // Réinitialiser le code
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du renvoi du code');
      setCanResend(true);
    }
  };

  if (!email) {
    return null;
  }

  if (isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Email vérifié !</CardTitle>
            <CardDescription>
              Votre adresse email a été vérifiée avec succès
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-gray-600 mb-4">
              Vous allez être redirigé vers la page de connexion...
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Aller à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Vérification de votre email
          </CardTitle>
          <CardDescription className="text-center">
            Un code de vérification à 6 chiffres a été envoyé à
            <br />
            <strong className="text-gray-900">{email}</strong>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Timer d'expiration */}
          {expirationTime && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {timeRemaining === 'Code expiré' ? (
                  <span className="text-red-600 font-semibold">
                    Code expiré - Demandez un nouveau code
                  </span>
                ) : (
                  <span>
                    Code valide pendant encore <strong>{timeRemaining}</strong>
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Input du code */}
          <div className="space-y-4">
            <VerificationCodeInput
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
              disabled={loading || isVerified}
              error={!!error}
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Bouton de vérification */}
          <Button
            onClick={handleVerify}
            disabled={loading || code.length !== 6 || isVerified}
            className="w-full"
            size="lg"
          >
            {loading ? 'Vérification...' : 'Vérifier le code'}
          </Button>

          {/* Bouton renvoyer le code */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Vous n'avez pas reçu le code ?</p>
            <Button
              variant="link"
              onClick={handleResend}
              disabled={!canResend || loading}
              className="text-blue-600 hover:text-blue-700"
            >
              {resendCooldown > 0
                ? `Renvoyer le code (${resendCooldown}s)`
                : 'Renvoyer le code'}
            </Button>
          </div>

          {/* Lien retour */}
          <div className="pt-4 border-t">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
