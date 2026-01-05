'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Search, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string;
  ip_address: string;
  user_agent: string;
  user_email?: string;
  description: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface SecurityEventsTableProps {
  events: SecurityEvent[];
  loading: boolean;
  filters?: {
    event_type?: string;
    severity?: string;
    search?: string;
  };
  onFiltersChange?: (filters: any) => void;
  onRefresh?: () => void;
}

const EVENT_TYPES = [
  { value: 'login_success', label: 'Connexion Réussie' },
  { value: 'login_failed', label: 'Connexion Échouée' },
  { value: 'logout', label: 'Déconnexion' },
  { value: 'password_changed', label: 'Mot de Passe Changé' },
  { value: '2fa_enabled', label: '2FA Activée' },
  { value: '2fa_disabled', label: '2FA Désactivée' },
  { value: 'oauth_linked', label: 'OAuth Lié' },
  { value: 'oauth_unlinked', label: 'OAuth Délié' },
  { value: 'ip_blocked', label: 'IP Bloquée' },
  { value: 'ip_unblocked', label: 'IP Débloquée' },
  { value: 'rate_limit_exceeded', label: 'Limite de Taux Dépassée' },
  { value: 'sql_injection_detected', label: 'Injection SQL Détectée' },
  { value: 'xss_detected', label: 'XSS Détectée' },
  { value: 'account_locked', label: 'Compte Verrouillé' },
  { value: 'account_unlocked', label: 'Compte Déverrouillé' },
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Faible', color: 'bg-blue-500' },
  { value: 'medium', label: 'Moyen', color: 'bg-yellow-500' },
  { value: 'high', label: 'Élevé', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critique', color: 'bg-red-500' },
];

export function SecurityEventsTable({
  events,
  loading,
  filters = {},
  onFiltersChange,
  onRefresh,
}: SecurityEventsTableProps) {
  const [searchQuery, setSearchQuery] = useState(filters.search || '');

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    onFiltersChange?.({ ...filters, search: value });
  };

  const handleEventTypeChange = (value: string) => {
    onFiltersChange?.({ ...filters, event_type: value === 'all' ? undefined : value });
  };

  const handleSeverityChange = (value: string) => {
    onFiltersChange?.({ ...filters, severity: value === 'all' ? undefined : value });
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = SEVERITY_LEVELS.find((s) => s.value === severity);
    return (
      <Badge className={severityConfig?.color || 'bg-gray-500'}>
        {severityConfig?.label || severity}
      </Badge>
    );
  };

  const getEventTypeLabel = (eventType: string) => {
    return EVENT_TYPES.find((t) => t.value === eventType)?.label || eventType;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Événements de Sécurité</CardTitle>
            <CardDescription>Historique des événements de sécurité de la plateforme</CardDescription>
          </div>
          <Button onClick={onRefresh} disabled={loading} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par IP, email, description..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filters.event_type || 'all'}
            onValueChange={handleEventTypeChange}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Type d'événement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {EVENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.severity || 'all'}
            onValueChange={handleSeverityChange}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Sévérité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {SEVERITY_LEVELS.map((severity) => (
                <SelectItem key={severity.value} value={severity.value}>
                  {severity.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading && events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement des événements...
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun événement de sécurité trouvé
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sévérité</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {formatDistanceToNow(new Date(event.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </TableCell>
                    <TableCell>{getEventTypeLabel(event.event_type)}</TableCell>
                    <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                    <TableCell className="font-mono text-sm">{event.ip_address}</TableCell>
                    <TableCell>{event.user_email || '-'}</TableCell>
                    <TableCell className="max-w-md truncate">{event.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
