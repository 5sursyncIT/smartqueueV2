'use client';

// AuthGuard simplifié - pas de redirection ici
// Les utilisateurs non authentifiés doivent aller manuellement vers /login

import { useAuthStore } from '@/lib/stores/auth-store';
import Link from 'next/link';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { isAuthenticated, currentTenant, isSuperAdmin } = useAuthStore();

  // DEBUG
  console.log('[AuthGuard] State:', { isAuthenticated, isSuperAdmin, currentTenant, requiredRoles });

  // Si pas authentifié, afficher un message
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Authentification requise</h1>
          <p className="text-gray-600 mb-4">Vous devez être connecté pour accéder à cette page.</p>
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  // Vérifier le rôle si requis
  if (requiredRoles && requiredRoles.length > 0) {
    // Les super-admins ont accès à tout
    if (isSuperAdmin) {
      console.log('[AuthGuard] ALLOWED: Superadmin access granted');
      return <>{children}</>;
    }

    // Si la route nécessite UNIQUEMENT super-admin (pas d'autres rôles), bloquer les non-superadmins
    if (requiredRoles.length === 1 && requiredRoles.includes('super-admin')) {
      console.log('[AuthGuard] BLOCKED: Non-superadmin trying to access superadmin-only route');
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
            <p className="text-gray-600 mb-4">
              Seuls les super-admins peuvent accéder à cette section.
            </p>
            <Link
              href="/sites"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retour à votre espace
            </Link>
          </div>
        </div>
      );
    }

    // Vérifier les rôles tenant (pour admin, manager, agent)
    // L'utilisateur doit avoir au moins un des rôles requis (excluant super-admin)
    const tenantRoles = requiredRoles.filter(role => role !== 'super-admin');
    const userHasRequiredRole = currentTenant && tenantRoles.includes(currentTenant.role);

    if (!userHasRequiredRole) {
      console.log('[AuthGuard] BLOCKED: User does not have required role', {
        userRole: currentTenant?.role,
        requiredRoles: tenantRoles
      });

      // Déterminer la page de redirection selon le rôle
      const getRedirectPath = () => {
        if (!currentTenant) return '/login';
        switch (currentTenant.role) {
          case 'agent':
            return '/agent';
          case 'manager':
            return '/dashboard';
          case 'admin':
            return '/sites';
          default:
            return '/login';
        }
      };

      const redirectPath = getRedirectPath();

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Accès refusé</h1>
            <p className="text-gray-600 mb-4">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>
            <p className="text-sm text-gray-500">
              Votre rôle: <span className="font-semibold">{currentTenant?.role || 'aucun'}</span>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Rôles requis: <span className="font-semibold">{tenantRoles.join(', ')}</span>
            </p>
            <Link
              href={redirectPath}
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retour au dashboard
            </Link>
          </div>
        </div>
      );
    }

    console.log('[AuthGuard] ALLOWED: User has required role', currentTenant?.role);
  }

  return <>{children}</>;
}
