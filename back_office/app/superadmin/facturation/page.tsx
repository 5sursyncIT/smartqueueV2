'use client';

import { useState } from 'react';
import {
  useInvoices,
  useInvoiceStats,
  useMarkInvoicePaid,
  type InvoiceFilters,
  type Invoice,
} from '@/lib/api/superadmin/invoices';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Download,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function FacturationPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'past' | 'pending' | 'upcoming'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  // Build filters based on active tab
  const filters: InvoiceFilters = {};
  if (activeTab === 'past') filters.status_type = 'past';
  if (activeTab === 'pending') filters.status_type = 'pending';
  if (activeTab === 'upcoming') filters.status_type = 'upcoming';
  if (selectedTenant) filters.tenant = selectedTenant;

  const { data: invoices = [], isLoading } = useInvoices(filters);
  const { data: stats } = useInvoiceStats();
  const markPaid = useMarkInvoicePaid();

  // Filter invoices by search term
  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.tenant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const getStatusBadge = (status: Invoice['status']) => {
    const variants: Record<Invoice['status'], { label: string; variant: any }> = {
      draft: { label: 'Brouillon', variant: 'secondary' },
      open: { label: 'En attente', variant: 'default' },
      paid: { label: 'Payée', variant: 'success' },
      void: { label: 'Annulée', variant: 'destructive' },
      uncollectible: { label: 'Impayée', variant: 'destructive' },
    };
    const { label, variant } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const formatDate = (dateString: string | null) => {
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Facturation</h1>
        <p className="text-muted-foreground">Gérez toutes les factures de la plateforme</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Factures</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_invoices}</div>
              <p className="text-xs text-muted-foreground">
                {stats.paid_invoices} payées, {stats.pending_invoices} en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenu Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total_revenue.toLocaleString('fr-SN')} XOF
              </div>
              <p className="text-xs text-muted-foreground">Factures payées</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Attente</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.pending_amount.toLocaleString('fr-SN')} XOF
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.pending_invoices} factures
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Retard</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {stats.overdue_amount.toLocaleString('fr-SN')} XOF
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.overdue_invoices} factures
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Factures</CardTitle>
          <CardDescription>
            Consultez l'historique et les factures à venir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par numéro, organisation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
              <TabsList>
                <TabsTrigger value="all">Toutes</TabsTrigger>
                <TabsTrigger value="past">Historique</TabsTrigger>
                <TabsTrigger value="pending">En Attente</TabsTrigger>
                <TabsTrigger value="upcoming">À Venir</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
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
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            Chargement...
                          </TableCell>
                        </TableRow>
                      ) : filteredInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                                <div className="text-sm text-muted-foreground">
                                  {invoice.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(invoice.invoice_date)}</TableCell>
                            <TableCell>
                              {invoice.due_date && isOverdue(invoice) ? (
                                <span className="text-destructive font-medium">
                                  {formatDate(invoice.due_date)} (En retard)
                                </span>
                              ) : (
                                formatDate(invoice.due_date)
                              )}
                            </TableCell>
                            <TableCell className="font-medium">
                              {invoice.total_display}
                            </TableCell>
                            <TableCell>{getStatusBadge(invoice.status)}</TableCell>
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
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
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
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
