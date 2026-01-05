'use client';

import { useState } from 'react';
import { Ban, Unlock, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useBlockedIPs } from '@/lib/hooks/use-security';
import { useToast } from '@/lib/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function BlockedIPsManager() {
  const { blockedIPs, loading, block, unblock, refetch } = useBlockedIPs();
  const { toast } = useToast();

  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [newIP, setNewIP] = useState('');
  const [newReason, setNewReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleBlock = async () => {
    if (!newIP) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer une adresse IP',
        variant: 'destructive',
      });
      return;
    }

    try {
      await block(newIP, newReason);
      toast({
        title: 'IP bloquée',
        description: `L'adresse IP ${newIP} a été bloquée`,
      });
      setNewIP('');
      setNewReason('');
      setShowBlockDialog(false);
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de bloquer l\'adresse IP',
        variant: 'destructive',
      });
    }
  };

  const handleUnblock = async (ipAddress: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir débloquer l'adresse IP ${ipAddress} ?`)) {
      return;
    }

    try {
      await unblock(ipAddress);
      toast({
        title: 'IP débloquée',
        description: `L'adresse IP ${ipAddress} a été débloquée`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de débloquer l\'adresse IP',
        variant: 'destructive',
      });
    }
  };

  const filteredIPs = blockedIPs.filter((ip) =>
    ip.ip_address.includes(searchQuery) || ip.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Adresses IP Bloquées
              </CardTitle>
              <CardDescription>
                Gérez les adresses IP bloquées automatiquement ou manuellement
              </CardDescription>
            </div>
            <Button onClick={() => setShowBlockDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Bloquer une IP
            </Button>
          </div>

          {/* Search */}
          <div className="flex gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par IP ou raison..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && blockedIPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Chargement des IPs bloquées...
            </div>
          ) : filteredIPs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'Aucune IP trouvée' : 'Aucune IP bloquée'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Adresse IP</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Bloquée</TableHead>
                    <TableHead>Expire</TableHead>
                    <TableHead>Tentatives</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIPs.map((ip) => {
                    const isExpired = ip.expires_at && new Date(ip.expires_at) < new Date();
                    const isActive = ip.is_active && !isExpired;

                    return (
                      <TableRow key={ip.id}>
                        <TableCell className="font-mono text-sm">{ip.ip_address}</TableCell>
                        <TableCell className="max-w-md truncate">{ip.reason || '-'}</TableCell>
                        <TableCell>
                          <Badge className={isActive ? 'bg-red-500' : 'bg-gray-500'}>
                            {isActive ? 'Bloquée' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(ip.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </TableCell>
                        <TableCell>
                          {ip.expires_at ? (
                            formatDistanceToNow(new Date(ip.expires_at), {
                              addSuffix: true,
                              locale: fr,
                            })
                          ) : (
                            'Jamais'
                          )}
                        </TableCell>
                        <TableCell>{ip.attempt_count || 0}</TableCell>
                        <TableCell className="text-right">
                          {isActive && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnblock(ip.ip_address)}
                              disabled={loading}
                            >
                              <Unlock className="h-4 w-4 mr-1" />
                              Débloquer
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Block IP Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bloquer une Adresse IP</DialogTitle>
            <DialogDescription>
              Bloquez manuellement une adresse IP suspecte. Le blocage expirera automatiquement
              après 72 heures.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Adresse IP</Label>
              <Input
                placeholder="192.168.1.1"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <Label>Raison (optionnel)</Label>
              <Input
                placeholder="ex: Tentatives de connexion suspectes"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleBlock} disabled={!newIP || loading}>
              <Ban className="h-4 w-4 mr-2" />
              Bloquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
