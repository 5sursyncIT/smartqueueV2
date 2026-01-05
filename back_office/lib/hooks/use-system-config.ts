import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface SystemConfig {
  platform_name: string;
  default_language: string;
  default_timezone: string;
  default_currency: string;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  max_upload_size_mb: number;
  session_timeout_minutes: number;
  password_min_length: number;
  require_email_verification: boolean;
  require_2fa: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_use_tls: boolean;
  smtp_use_ssl: boolean;
  smtp_username: string;
  smtp_from_email: string;
  smtp_password_set: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: number;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  category: 'core' | 'experimental' | 'beta';
  created_at: string;
  updated_at: string;
}

/**
 * Hook pour récupérer la configuration système
 */
export function useSystemConfig() {
  return useQuery<SystemConfig>({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/system-config/');
      return response.data;
    },
  });
}

/**
 * Hook pour mettre à jour la configuration système
 */
export function useUpdateSystemConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<SystemConfig>) => {
      const response = await apiClient.patch('/admin/system-config/1/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
    },
  });
}

/**
 * Hook pour récupérer les feature flags
 */
export function useFeatureFlags() {
  return useQuery<FeatureFlag[]>({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/feature-flags/');
      return response.data;
    },
  });
}

/**
 * Hook pour toggle un feature flag
 */
export function useToggleFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (featureId: number) => {
      const response = await apiClient.post(`/admin/feature-flags/${featureId}/toggle/`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });
}

/**
 * Hook pour mettre à jour un feature flag
 */
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FeatureFlag> }) => {
      const response = await apiClient.patch(`/admin/feature-flags/${id}/`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });
}
