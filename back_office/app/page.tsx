'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function HomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, currentTenant, isSuperAdmin, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Attendre que le store soit hydraté
    if (!_hasHydrated) return;

    // Ne rien faire si on n'est pas sur la page racine
    if (pathname !== '/') return;

    // Si authentifié, rediriger selon le rôle
    if (isAuthenticated && currentTenant) {
      // Super-admin : vérifier le flag isSuperAdmin directement
      if (isSuperAdmin) {
        router.push('/superadmin/dashboard');
        return;
      }

      // Utilisateur normal : utiliser le rôle du tenant
      switch (currentTenant.role) {
        case 'admin':
          router.push('/sites');
          break;
        case 'manager':
          router.push('/dashboard');
          break;
        default:
          router.push('/dashboard');
      }
    } else {
      // Sinon, rediriger vers login
      router.push('/login');
    }
  }, [isAuthenticated, currentTenant, isSuperAdmin, router, pathname, _hasHydrated]);

  // Afficher un loader pendant l'hydratation
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        <p className="mt-4 text-gray-600">Chargement de SmartQueue...</p>
      </div>
    </div>
  );
}
