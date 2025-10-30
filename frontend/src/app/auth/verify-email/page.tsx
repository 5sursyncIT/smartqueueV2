'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VerificationCodeInput } from '@/components/auth/verification-code-input';
import { useEmailVerification } from '@/hooks/use-email-verification';

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
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { loading, verifyEmail, resendVerification } = useEmailVerification();

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
      router.push('/auth/register');
    }
  }, [email, router]);

  const handleVerify = async () => {
    if (!email || code.length !== 6) {
      setErrorMessage('Veuillez entrer un code à 6 chiffres');
      return;
    }

    try {
      setErrorMessage('');
      const response = await verifyEmail(email, code);

      if (response.success) {
        setIsVerified(true);

        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          router.push('/auth/login?message=Email vérifié avec succès');
        }, 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Code invalide ou expiré');
      setCode(''); // Réinitialiser le code en cas d'erreur
    }
  };

  const handleResend = async () => {
    if (!email || !canResend) return;

    try {
      setCanResend(false);
      setErrorMessage('');
      const response = await resendVerification(email);

      if (response.success) {
        setResendCooldown(60); // 60 secondes de cooldown

        // Réinitialiser le temps d'expiration
        const expiration = new Date();
        expiration.setMinutes(expiration.getMinutes() + 15);
        setExpirationTime(expiration);

        setCode(''); // Réinitialiser le code
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors du renvoi du code');
      setCanResend(true);
    }
  };

  if (!email) {
    return null;
  }

  if (isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
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
              onClick={() => router.push('/auth/login')}
            >
              Aller à la connexion
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">
                {timeRemaining === 'Code expiré' ? (
                  <span className="text-red-600 font-semibold">
                    Code expiré - Demandez un nouveau code
                  </span>
                ) : (
                  <span>
                    Code valide pendant encore <strong>{timeRemaining}</strong>
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Input du code */}
          <div className="space-y-4">
            <VerificationCodeInput
              value={code}
              onChange={setCode}
              onComplete={handleVerify}
              disabled={loading || isVerified}
              error={!!errorMessage}
            />

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-600">{errorMessage}</span>
              </div>
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
              href="/auth/login"
              className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
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
