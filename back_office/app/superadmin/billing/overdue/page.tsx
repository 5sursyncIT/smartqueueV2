'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  AlertTriangle,
  Mail,
  Phone,
  Ban,
  PlayCircle,
  Clock,
  DollarSign,
  Search,
  Loader2,
  Send,
  FileText,
  MessageSquare,
} from 'lucide-react';
import {
  useInvoices,
  useInvoiceStats,
  useMarkInvoicePaid,
  type Invoice,
} from '@/lib/api/superadmin/invoices';
import { toast } from 'sonner';

export default function OverdueBillingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'email' | 'suspend' | 'plan' | null;
    invoice: Invoice | null;
  }>({
    open: false,
    type: null,
    invoice: null,
  });
  const [actionNote, setActionNote] = useState('');

  // Fetch only pending invoices (open and uncollectible)
  const { data: allInvoices = [], isLoading } = useInvoices({ status_type: 'pending' });
  const { data: stats } = useInvoiceStats();
  const markPaid = useMarkInvoicePaid();

  // Filter only overdue invoices (those past due date)
  const overdueInvoices = allInvoices.filter((inv) => {
    if (!inv.due_date || inv.status !== 'open') return false;
    return new Date(inv.due_date) < new Date();
  });

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-SN', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculer le nombre de jours de retard
  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Déterminer le niveau de risque
  const getRiskLevel = (daysOverdue: number): 'high' | 'medium' | 'low' => {
    if (daysOverdue > 30) return 'high';
    if (daysOverdue > 15) return 'medium';
    return 'low';
  };

  const getRiskBadge = (risk: 'high' | 'medium' | 'low') => {
    const variants = {
      high: { label: 'Risque élevé', className: 'bg-red-100 text-red-800' },
      medium: { label: 'Risque moyen', className: 'bg-orange-100 text-orange-800' },
      low: { label: 'Risque faible', className: 'bg-yellow-100 text-yellow-800' },
    };

    const variant = variants[risk];

    return (
      <Badge variant="secondary" className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  const filteredInvoices = overdueInvoices.filter((invoice) => {
    const daysOverdue = getDaysOverdue(invoice.due_date);
    const risk = getRiskLevel(daysOverdue);

    const matchesSearch =
      invoice.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk = riskFilter === 'all' || risk === riskFilter;

    return matchesSearch && matchesRisk;
  });

  // Statistiques
  const localStats = {
    totalOverdue: filteredInvoices.reduce((sum, inv) => sum + inv.total, 0),
    count: filteredInvoices.length,
    highRisk: filteredInvoices.filter((inv) => getRiskLevel(getDaysOverdue(inv.due_date)) === 'high').length,
    mediumRisk: filteredInvoices.filter((inv) => getRiskLevel(getDaysOverdue(inv.due_date)) === 'medium').length,
  };

  // Recovery rate from stats
  const recoveryRate = stats
    ? stats.total_revenue > 0
      ? Math.round((stats.total_revenue / (stats.total_revenue + stats.overdue_amount)) * 100)
      : 100
    : 0;

  // Actions
  const handleSendReminder = (invoice: Invoice) => {
    setActionDialog({
      open: true,
      type: 'email',
      invoice,
    });
  };

  const handleSuspendService = (invoice: Invoice) => {
    setActionDialog({
      open: true,
      type: 'suspend',
      invoice,
    });
  };

  const handleNegotiatePlan = (invoice: Invoice) => {
    setActionDialog({
      open: true,
      type: 'plan',
      invoice,
    });
  };

  const handleMarkPaid = (invoiceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir marquer cette facture comme payée ?')) {
      markPaid.mutate(
        { id: invoiceId, data: {} },
        {
          onSuccess: () => {
            toast.success('Facture marquée comme payée');
            setActionDialog({ open: false, type: null, invoice: null });
          },
          onError: () => {
            toast.error('Erreur lors de la mise à jour de la facture');
          },
        }
      );
    }
  };

  const executeAction = async () => {
    const { type, invoice } = actionDialog;

    try {
      if (type === 'email') {
        // TODO: Appel API pour envoyer un rappel
        toast.success('Rappel envoyé!', {
          description: `Un email de relance a été envoyé à ${invoice.tenant_name}.`,
        });
      } else if (type === 'suspend') {
        // TODO: Appel API pour suspendre le service
        toast.success('Service suspendu', {
          description: `Le service de ${invoice.tenant_name} a été suspendu.`,
        });
      } else if (type === 'plan') {
        // TODO: Appel API pour proposer un plan de paiement
        toast.success('Plan proposé', {
          description: `Une proposition de plan de paiement a été envoyée.`,
        });
      }

      setActionDialog({ open: false, type: null, invoice: null });
      setActionNote('');
    } catch (error: any) {
      toast.error('Erreur', {
        description: error.message || 'Une erreur est survenue.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          Gestion des Impayés
        </h1>
        <p className="text-gray-600 mt-2">
          Suivi et actions sur les factures en retard de paiement
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Montant total en retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {formatPrice(localStats.totalOverdue)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {localStats.count} facture(s)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Risque élevé
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {localStats.highRisk}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {">"} 30 jours de retard
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Risque moyen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-orange-600">
                  {localStats.mediumRisk}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  15-30 jours de retard
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Taux de recouvrement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {recoveryRate}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Taux de recouvrement
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filtres et Table */}
      <Card>
        <CardHeader>
          <CardTitle>Factures en Retard</CardTitle>
          <CardDescription>Actions de recouvrement et relances</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par organisation ou n° facture..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={riskFilter} onValueChange={(v: any) => setRiskFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les risques</SelectItem>
                <SelectItem value="high">Risque élevé</SelectItem>
                <SelectItem value="medium">Risque moyen</SelectItem>
                <SelectItem value="low">Risque faible</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Chargement...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Facture</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Retard</TableHead>
                    <TableHead>Risque</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        Aucune facture en retard
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => {
                      const daysOverdue = getDaysOverdue(invoice.due_date);
                      const risk = getRiskLevel(daysOverdue);

                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">
                            {invoice.invoice_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invoice.tenant_name}</div>
                              <div className="text-xs text-gray-500">
                                @{invoice.tenant_slug}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-red-600">
                            {formatPrice(invoice.total)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(invoice.due_date)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              {daysOverdue} jour(s)
                            </Badge>
                          </TableCell>
                          <TableCell>{getRiskBadge(risk)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendReminder(invoice)}
                                title="Envoyer un rappel"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleNegotiatePlan(invoice)}
                                title="Proposer un plan"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                              {daysOverdue > 30 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSuspendService(invoice)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Suspendre le service"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkPaid(invoice.id)}
                                disabled={markPaid.isPending}
                                className="ml-2"
                              >
                                <PlayCircle className="h-4 w-4 mr-1" />
                                Payée
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog d'action */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open, type: null, invoice: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'email' && 'Envoyer un rappel'}
              {actionDialog.type === 'suspend' && 'Suspendre le service'}
              {actionDialog.type === 'plan' && 'Proposer un plan de paiement'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'email' && 'Un email de relance sera envoyé au client.'}
              {actionDialog.type === 'suspend' && 'Le service sera suspendu jusqu\'au paiement.'}
              {actionDialog.type === 'plan' && 'Proposez un échéancier de paiement personnalisé.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionDialog.invoice && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <p>
                    <strong>Organisation:</strong> {actionDialog.invoice.tenant_name}
                  </p>
                  <p>
                    <strong>Facture:</strong> {actionDialog.invoice.invoice_number}
                  </p>
                  <p>
                    <strong>Montant:</strong> {formatPrice(actionDialog.invoice.total)}
                  </p>
                  <p>
                    <strong>Retard:</strong>{' '}
                    {getDaysOverdue(actionDialog.invoice.due_date)} jour(s)
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Note interne (optionnel)</label>
              <Textarea
                placeholder="Ajouter une note sur cette action..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null, invoice: null })}
            >
              Annuler
            </Button>
            <Button onClick={executeAction}>
              <Send className="h-4 w-4 mr-2" />
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
