'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function ForbiddenPage() {
  const router = useRouter();
  const { currentTenant, isSuperAdmin } = useAuthStore();

  const handleGoToDashboard = () => {
    // Rediriger vers le dashboard approprié selon le rôle
    if (isSuperAdmin) {
      router.push('/superadmin/dashboard');
    } else if (currentTenant) {
      switch (currentTenant.role) {
        case 'admin':
          router.push('/sites');
          break;
        case 'agent':
          router.push('/agent');
          break;
        case 'manager':
        default:
          router.push('/dashboard');
          break;
      }
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Accès refusé</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-600">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>

          {currentTenant && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Votre rôle: </span>
                <span className="font-medium">{currentTenant.role}</span>
              </div>
            </div>
          )}

          <Button onClick={handleGoToDashboard} className="w-full">
            Retour au dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
