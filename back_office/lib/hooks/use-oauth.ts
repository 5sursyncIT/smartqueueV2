/**
 * Hook pour gérer l'authentification OAuth (Google, Microsoft)
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';

export interface OAuthConnection {
  id: string;
  provider: 'google' | 'microsoft';
  email: string;
  avatar_url: string;
  connected_at: string;
  last_used_at: string;
}

export function useOAuth() {
  const [loading, setLoading] = useState(false);

  const getAuthorizationUrl = async (provider: 'google' | 'microsoft', redirectUri?: string) => {
    try {
      setLoading(true);
      const response = await apiClient.post<{ url: string; state: string }>(
        '/auth/oauth/get-url/',
        {
          provider,
          redirect_uri: redirectUri,
        }
      );

      const { url, state } = response.data;

      // Save state for CSRF verification
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_provider', provider);

      return url;
    } catch (err: any) {
      throw new Error(err.message || "Erreur lors de la génération de l'URL");
    } finally {
      setLoading(false);
    }
  };

  const loginWithProvider = async (provider: 'google' | 'microsoft') => {
    try {
      const url = await getAuthorizationUrl(provider);
      window.location.href = url;
    } catch (err: any) {
      console.error('OAuth error:', err);
      throw err;
    }
  };

  const handleCallback = async (code: string, state: string) => {
    try {
      setLoading(true);

      const savedState = sessionStorage.getItem('oauth_state');
      const provider = sessionStorage.getItem('oauth_provider') as 'google' | 'microsoft';

      if (state !== savedState) {
        throw new Error('Invalid state token - possible CSRF attack');
      }

      const response = await apiClient.post<{
        access: string;
        refresh: string;
        user: any;
        created: boolean;
        message: string;
      }>('/auth/oauth/callback/', {
        provider,
        code,
        state,
      });

      // Clean up session storage
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_provider');

      return {
        access: response.data.access,
        refresh: response.data.refresh,
        user: response.data.user,
        created: response.data.created,
        message: response.data.message,
      };
    } catch (err: any) {
      throw new Error(err.message || "Erreur lors de l'authentification");
    } finally {
      setLoading(false);
    }
  };

  const linkAccount = async (provider: 'google' | 'microsoft', code: string, state: string) => {
    try {
      setLoading(true);
      await apiClient.post('/auth/oauth/link/', {
        provider,
        code,
        state,
      });
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la liaison du compte');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    loginWithProvider,
    handleCallback,
    linkAccount,
    getAuthorizationUrl,
  };
}

export function useOAuthConnections() {
  const [connections, setConnections] = useState<OAuthConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<OAuthConnection[]>('/auth/oauth/connections/');
      setConnections(response.data);
    } catch (err) {
      console.error('Error fetching OAuth connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async (provider: 'google' | 'microsoft') => {
    try {
      await apiClient.delete(`/auth/oauth/disconnect/${provider}/`);
      await fetchConnections();
    } catch (err: any) {
      throw new Error(err.message || 'Erreur lors de la déconnexion');
    }
  };

  return {
    connections,
    loading,
    refetch: fetchConnections,
    disconnect,
  };
}
