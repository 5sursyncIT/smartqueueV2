/**
 * Hook pour gérer la vérification d'email avec code à 6 chiffres
 */

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';

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

      const response = await apiClient.post<VerifyEmailResponse>('/auth/verify-email/', {
        email,
        code,
      });

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors de la vérification';
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

      const response = await apiClient.post<ResendVerificationResponse>('/auth/resend-verification/', {
        email,
      });

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erreur lors du renvoi du code';
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

      const response = await apiClient.get<EmailVerificationStatus>(`/auth/check-verification/?email=${email}`);

      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Erreur lors de la vérification du statut';
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
