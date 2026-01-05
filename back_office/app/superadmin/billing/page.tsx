'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
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
  CreditCard,
  Download,
  Search,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Smartphone,
  TrendingUp,
  DollarSign,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  usePayments,
  useDownloadInvoice,
} from '@/lib/api/superadmin/billing';
import {
  useInvoices,
  useInvoiceStats,
  useMarkInvoicePaid,
  type Invoice,
} from '@/lib/api/superadmin/invoices';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PAYMENT_METHOD_LABELS = {
  orange_money: 'Orange Money',
  wave: 'Wave',
  free_money: 'Free Money',
  emoney: 'e-Money',
  yoomee: 'YooMee',
  mtn: 'MTN Mobile Money',
  moov: 'Moov Money',
  card: 'Carte bancaire',
  bank_transfer: 'Virement bancaire',
};

const STATUS_LABELS = {
  succeeded: 'Payé',
  pending: 'En attente',
  processing: 'En cours',
  failed: 'Échec',
  refunded: 'Remboursé',
};

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'invoices'>('transactions');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'past' | 'pending' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Payments/Transactions hooks
  const { data: payments = [], isLoading } = usePayments();
  const downloadInvoice = useDownloadInvoice();

  // Invoices hooks
  const invoicesFilters = invoiceFilter !== 'all' ? { status_type: invoiceFilter } : undefined;
  const { data: invoices = [], isLoading: isLoadingInvoices } = useInvoices(invoicesFilters);
  const { data: invoiceStats } = useInvoiceStats();
  const markPaid = useMarkInvoicePaid();

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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: any }> = {
      succeeded: { className: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      processing: { className: 'bg-blue-100 text-blue-800', icon: Clock },
      failed: { className: 'bg-red-100 text-red-800', icon: XCircle },
      refunded: { className: 'bg-gray-100 text-gray-800', icon: CreditCard },
    };

    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    const label = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;

    return (
      <Badge variant="secondary" className={variant.className}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesSearch =
      payment.tenant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.transaction_id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const stats = {
    totalRevenue: payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0),
    pendingAmount: payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    paidCount: payments.filter(p => p.status === 'succeeded').length,
    pendingCount: payments.filter(p => p.status === 'pending').length,
    failedCount: payments.filter(p => p.status === 'failed').length,
  };

  // Répartition par méthode de paiement
  const paymentMethodStats = payments
    .filter(p => p.status === 'succeeded')
    .reduce((acc, payment) => {
      acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount;
      return acc;
    }, {} as Record<string, number>);

  const exportToCSV = () => {
    const headers = [
      'ID Transaction',
      'Organisation',
      'Montant',
      'Devise',
      'Méthode',
      'Statut',
      'Date',
    ];

    const rows = filteredPayments.map((payment) => [
      payment.transaction_id,
      payment.tenant_name,
      payment.amount,
      payment.currency,
      PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method,
      STATUS_LABELS[payment.status as keyof typeof STATUS_LABELS] || payment.status,
      formatDate(payment.created_at),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `paiements-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Export réussi!', {
      description: `${filteredPayments.length} paiement(s) exporté(s) au format CSV.`,
    });
  };

  // Invoice helpers
  const getInvoiceStatusBadge = (status: Invoice['status']) => {
    const variants: Record<Invoice['status'], { label: string; variant: string; className: string }> = {
      draft: { label: 'Brouillon', variant: 'secondary', className: 'bg-gray-100 text-gray-800' },
      open: { label: 'En attente', variant: 'default', className: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Payée', variant: 'success', className: 'bg-green-100 text-green-800' },
      void: { label: 'Annulée', variant: 'destructive', className: 'bg-red-100 text-red-800' },
      uncollectible: { label: 'Impayée', variant: 'destructive', className: 'bg-red-100 text-red-800' },
    };
    const { label, className } = variants[status];
    return <Badge variant="secondary" className={className}>{label}</Badge>;
  };

  const formatInvoiceDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const isOverdue = (invoice: Invoice) => {
    if (!invoice.due_date || invoice.status !== 'open') return false;
    return new Date(invoice.due_date) < new Date();
  };

  const handleMarkPaid = (invoiceId: string) => {
    if (confirm('Êtes-vous sûr de vouloir marquer cette facture comme payée ?')) {
      markPaid.mutate(
        { id: invoiceId, data: {} },
        {
          onSuccess: () => {
            toast.success('Facture marquée comme payée');
          },
          onError: () => {
            toast.error('Erreur lors de la mise à jour de la facture');
          },
        }
      );
    }
  };

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Facturation & Paiements</h1>
          <p className="text-gray-600 mt-2">
            Gestion des factures et paiements Mobile Money
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenus totaux
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(stats.totalRevenue)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.paidCount} paiements réussis
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              En attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatPrice(stats.pendingAmount)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.pendingCount} factures
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Paiements échoués
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {stats.failedCount}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Nécessite attention
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taux de réussite
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {payments.length > 0 ? Math.round((stats.paidCount / payments.length) * 100) : 0}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Sur {payments.length} transactions
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Méthodes de paiement */}
      {Object.keys(paymentMethodStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Répartition par méthode Mobile Money
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(paymentMethodStats)
                .sort(([, a], [, b]) => b - a)
                .map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium">
                        {PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] || method}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatPrice(amount)}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres et Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des paiements et factures</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
            <TabsList>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="invoices">Factures</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par organisation ou ID transaction..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="succeeded">Payé</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="processing">En cours</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                  <SelectItem value="refunded">Remboursé</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToCSV} disabled={filteredPayments.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Chargement des paiements...</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Transaction</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        Aucun paiement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">
                          {payment.transaction_id}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.tenant_name}</div>
                            <div className="text-xs text-gray-500">@{payment.tenant_slug}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatPrice(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(payment.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {payment.subscription && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Télécharger la facture"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              {/* Filters for invoices */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher par numéro, organisation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={invoiceFilter} onValueChange={(v: any) => setInvoiceFilter(v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les factures</SelectItem>
                    <SelectItem value="past">Historique (payées)</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="upcoming">À venir</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </div>

              {/* Invoices Table */}
              {isLoadingInvoices ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numéro</TableHead>
                        <TableHead>Organisation</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            Aucune facture trouvée
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInvoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-medium">
                              {invoice.invoice_number}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{invoice.tenant_name}</div>
                                <div className="text-sm text-gray-500">
                                  {invoice.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{formatInvoiceDate(invoice.invoice_date)}</TableCell>
                            <TableCell>
                              {invoice.due_date && isOverdue(invoice) ? (
                                <span className="text-red-600 font-medium flex items-center gap-1">
                                  <AlertCircle className="h-4 w-4" />
                                  {formatInvoiceDate(invoice.due_date)}
                                </span>
                              ) : (
                                formatInvoiceDate(invoice.due_date)
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {invoice.total_display}
                            </TableCell>
                            <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                {invoice.status === 'open' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkPaid(invoice.id)}
                                    disabled={markPaid.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Marquer payée
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
