'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function TenantsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-gray-600 mt-2">
            Gestion globale des tenants de la plateforme
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Créer un tenant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            Fonctionnalité en construction...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
