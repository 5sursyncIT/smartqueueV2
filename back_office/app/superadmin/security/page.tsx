'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, Lock, Activity, Users, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useThreatSummary, useSecurityEvents, useSecurityAlerts } from '@/lib/hooks/use-security';
import { SecurityEventsTable } from '@/components/security/security-events-table';
import { SecurityAlerts } from '@/components/security/security-alerts';
import { TwoFactorSettings } from '@/components/security/two-factor-settings';
import { OAuthSettings } from '@/components/security/oauth-settings';
import { BlockedIPsManager } from '@/components/security/blocked-ips-manager';

export default function SecurityPage() {
  const { summary, loading: summaryLoading } = useThreatSummary();
  const { events, loading: eventsLoading, filters, setFilters, refetch: refetchEvents } = useSecurityEvents();
  const { alerts, loading: alertsLoading, markAsResolved } = useSecurityAlerts();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Centre de Sécurité
          </h1>
          <p className="text-muted-foreground mt-1">
            Surveillance et gestion de la sécurité de la plateforme
          </p>
        </div>
      </div>

      {/* Threat Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IPs Bloquées</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : summary?.blocked_ips || 0}
            </div>
            <p className="text-xs text-muted-foreground">Dernières 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tentatives Échouées</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : summary?.failed_logins || 0}
            </div>
            <p className="text-xs text-muted-foreground">Dernières 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activités Suspectes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : summary?.suspicious_activities || 0}
            </div>
            <p className="text-xs text-muted-foreground">Détectées aujourd'hui</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incidents Ouverts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : summary?.open_incidents || 0}
            </div>
            <p className="text-xs text-muted-foreground">À traiter</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {alerts && alerts.length > 0 && (
        <SecurityAlerts
          alerts={alerts}
          loading={alertsLoading}
          onResolve={markAsResolved}
        />
      )}

      {/* Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Événements de Sécurité
          </TabsTrigger>
          <TabsTrigger value="2fa" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Authentification 2FA
          </TabsTrigger>
          <TabsTrigger value="oauth" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            OAuth & SSO
          </TabsTrigger>
          <TabsTrigger value="blocked-ips" className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            IPs Bloquées
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <SecurityEventsTable
            events={events}
            loading={eventsLoading}
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={refetchEvents}
          />
        </TabsContent>

        <TabsContent value="2fa" className="space-y-4">
          <TwoFactorSettings />
        </TabsContent>

        <TabsContent value="oauth" className="space-y-4">
          <OAuthSettings />
        </TabsContent>

        <TabsContent value="blocked-ips" className="space-y-4">
          <BlockedIPsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
