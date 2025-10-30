/**
 * Hook pour gérer la vérification d'email avec code à 6 chiffres (Frontend public)
 */

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface EmailVerificationStatus {
  email_verified: boolean;
  email_verified_at: string | null;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

export interface ResendVerificationResponse {
  success: boolean;
  message: string;
}

export function useEmailVerification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Vérifie l'email avec le code à 6 chiffres fourni
   */
  const verifyEmail = async (email: string, code: string): Promise<VerifyEmailResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/v1/auth/verify-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la vérification');
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la vérification';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renvoie un nouveau code de vérification
   */
  const resendVerification = async (email: string): Promise<ResendVerificationResponse> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/v1/auth/resend-verification/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors du renvoi du code');
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du renvoi du code';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Vérifie le statut de vérification d'un email
   */
  const checkVerificationStatus = async (email: string): Promise<EmailVerificationStatus> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/v1/auth/check-verification/?email=${email}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la vérification du statut');
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors de la vérification du statut';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    verifyEmail,
    resendVerification,
    checkVerificationStatus,
  };
}
