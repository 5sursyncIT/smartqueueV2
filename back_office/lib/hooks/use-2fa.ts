/**
 * Hook pour gérer l'authentification à deux facteurs (2FA)
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

export interface TwoFactorStatus {
  enabled: boolean;
  method: 'totp' | 'sms' | null;
  phone_number: string | null;
  backup_codes_count: number;
}

export function useTwoFactor() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<TwoFactorStatus>('/security/2fa/status/');
      setStatus(response.data);
    } catch (err) {
      console.error('Error fetching 2FA status:', err);
    } finally {
      setLoading(false);
    }
  };

  const setupTOTP = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post<{
        secret: string;
        qr_code: string;
        message: string;
      }>('/security/2fa/setup_totp/');
      return {
        secret: response.data.secret,
        qrCode: response.data.qr_code,
        message: response.data.message,
      };
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la configuration TOTP');
    } finally {
      setLoading(false);
    }
  };

  const setupSMS = async (phoneNumber: string) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/security/2fa/setup_sms/', {
        method: 'sms',
        phone_number: phoneNumber,
      });
      return response.data;
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la configuration SMS');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async (code: string) => {
    try {
      setLoading(true);
      const response = await apiClient.post<{
        backup_codes: string[];
        message: string;
        warning: string;
      }>('/security/2fa/verify_and_enable/', { code });
      await fetchStatus();
      return {
        backupCodes: response.data.backup_codes,
        message: response.data.message,
        warning: response.data.warning,
      };
    } catch (err: any) {
      throw new Error(err.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    try {
      setLoading(true);
      await apiClient.post('/security/2fa/disable/');
      await fetchStatus();
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la désactivation');
    } finally {
      setLoading(false);
    }
  };

  return {
    status,
    loading,
    fetchStatus,
    setupTOTP,
    setupSMS,
    verifyAndEnable,
    disable,
  };
}
