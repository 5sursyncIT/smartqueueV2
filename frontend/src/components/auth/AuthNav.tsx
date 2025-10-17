'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthNav() {
  const { user, isAuthenticated, logout } = useAuth();

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-700">
          Bonjour, {user?.first_name}
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => logout()}
          className="text-sm"
        >
          Déconnexion
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/auth/login">
        <Button variant="ghost" size="sm" className="text-sm">
          Connexion
        </Button>
      </Link>
      <Link href="/auth/register">
        <Button size="sm" className="text-sm">
          Inscription
        </Button>
      </Link>
    </div>
  );
}