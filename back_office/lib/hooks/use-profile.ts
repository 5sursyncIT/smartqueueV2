import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { User } from '@/lib/types';

// Types pour la mise à jour du profil
export interface UpdateProfileDto {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ChangePasswordDto {
  old_password: string;
  new_password: string;
}

// Query keys
export const profileKeys = {
  current: ['profile', 'current'] as const,
};

// Récupérer le profil actuel
export function useProfile() {
  return useQuery({
    queryKey: profileKeys.current,
    queryFn: async () => {
      const response = await apiClient.get<User>('/auth/jwt/me/');
      return response.data;
    },
  });
}

// Mettre à jour le profil
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  return useMutation({
    mutationFn: async (data: UpdateProfileDto) => {
      const response = await apiClient.patch<User>('/auth/jwt/me/', data);
      return response.data;
    },
    onSuccess: (data) => {
      // Mettre à jour le cache
      queryClient.setQueryData(profileKeys.current, data);

      // Mettre à jour le store auth
      const currentState = useAuthStore.getState();
      if (currentState.user) {
        const payload = {
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          tenants: currentState.tenants.map(t => ({
            tenant_id: t.id,
            tenant_slug: t.slug,
            tenant_name: t.name,
            role: t.role,
            scopes: t.scopes,
          })),
          current_tenant: currentState.currentTenant?.slug || '',
          current_role: currentState.currentTenant?.role || '',
          scopes: currentState.currentTenant?.scopes || [],
          user_id: data.id,
        };
        setUser(data, payload as any);
      }
    },
  });
}

// Changer le mot de passe
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordDto) => {
      const response = await apiClient.post('/auth/change-password/', data);
      return response.data;
    },
  });
}

// Uploader une photo de profil (optionnel)
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiClient.post('/auth/upload-avatar/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.current });
    },
  });
}
