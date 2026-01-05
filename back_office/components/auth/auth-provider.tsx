'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getAccessToken, clearTokens, setTokens } from '@/lib/api/client';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { isAuthenticated, logout, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Wait for Zustand to hydrate from localStorage
    if (!_hasHydrated) return;

    const initAuth = async () => {
      // Si l'utilisateur est marqué comme authentifié dans le store
      if (isAuthenticated) {
        const token = getAccessToken();

        // Si le token n'existe pas en mémoire mais que l'utilisateur est authentifié
        // cela signifie que la page a été rechargée
        if (!token) {
          // Le token devrait être dans localStorage, on le récupère
          const storedToken = typeof window !== 'undefined'
            ? localStorage.getItem('accessToken')
            : null;

          const storedRefresh = typeof window !== 'undefined'
            ? localStorage.getItem('refreshToken')
            : null;

          if (storedToken && storedRefresh) {
            // Vérifier si le token est valide
            try {
              // Décoder le token pour vérifier l'expiration
              const payload = JSON.parse(atob(storedToken.split('.')[1]));
              const isExpired = payload.exp * 1000 < Date.now();

              if (!isExpired) {
                // Token encore valide, le restaurer en mémoire
                setTokens(storedToken, storedRefresh);
              } else {
                // Token expiré, tenter un refresh
                try {
                  const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/jwt/refresh/`,
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ refresh: storedRefresh }),
                    }
                  );

                  if (response.ok) {
                    const data = await response.json();
                    setTokens(data.access, storedRefresh);
                  } else {
                    // Refresh failed, logout
                    clearTokens();
                    logout();
                  }
                } catch (error) {
                  console.error('Token refresh error:', error);
                  clearTokens();
                  logout();
                }
              }
            } catch (error) {
              console.error('Token validation error:', error);
              clearTokens();
              logout();
            }
          } else {
            // Pas de tokens stockés, déconnecter
            logout();
          }
        }
      }

      setIsInitialized(true);
    };

    initAuth();
  }, [isAuthenticated, logout, _hasHydrated]);

  // DEBUG: Temporarily bypass loading check
  console.log('[AuthProvider] Debug:', { isInitialized, _hasHydrated, isAuthenticated });

  // Show loading state while initializing
  // if (!isInitialized || !_hasHydrated) {
  //   return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
  //         <p className="mt-4 text-gray-600">Chargement...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return <>{children}</>;
}
