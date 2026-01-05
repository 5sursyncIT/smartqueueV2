"use client"

import { useState } from "react"
import { Plus, Search, Tag, TrendingUp, Users, Calendar, Edit2, Trash2, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Coupon {
  id: string
  code: string
  name: string
  description: string
  discount_type: "percentage" | "fixed_amount"
  discount_value: number
  currency: string
  valid_from: string
  valid_to: string
  max_uses: number
  current_uses: number
  is_active: boolean
  is_valid: boolean
  usage_percentage: number
}

// Données mockées pour l'instant
const mockCoupons: Coupon[] = [
  {
    id: "1",
    code: "PROMO20",
    name: "Réduction 20% - Lancement",
    description: "Code promo de lancement offrant 20% de réduction",
    discount_type: "percentage",
    discount_value: 20,
    currency: "XOF",
    valid_from: "2025-10-01",
    valid_to: "2025-11-30",
    max_uses: 100,
    current_uses: 45,
    is_active: true,
    is_valid: true,
    usage_percentage: 45
  },
  {
    id: "2",
    code: "WELCOME50",
    name: "Bienvenue - 50% OFF",
    description: "Code de bienvenue pour nouveaux clients",
    discount_type: "percentage",
    discount_value: 50,
    currency: "XOF",
    valid_from: "2025-09-15",
    valid_to: "2025-12-31",
    max_uses: 50,
    current_uses: 50,
    is_active: true,
    is_valid: false,
    usage_percentage: 100
  },
  {
    id: "3",
    code: "NOEL2025",
    name: "Promo Noël 2025",
    description: "Offre spéciale période de Noël",
    discount_type: "fixed_amount",
    discount_value: 10000,
    currency: "XOF",
    valid_from: "2025-12-15",
    valid_to: "2026-01-05",
    max_uses: 200,
    current_uses: 0,
    is_active: false,
    is_valid: false,
    usage_percentage: 0
  }
]

export default function CouponsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [coupons] = useState<Coupon[]>(mockCoupons)

  // Filtrer les coupons
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coupon.name.toLowerCase().includes(searchTerm.toLowerCase())

    if (filterStatus === "all") return matchesSearch
    if (filterStatus === "active") return matchesSearch && coupon.is_active && coupon.is_valid
    if (filterStatus === "expired") return matchesSearch && !coupon.is_valid
    if (filterStatus === "inactive") return matchesSearch && !coupon.is_active

    return matchesSearch
  })

  // Calculer les statistiques
  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.is_active && c.is_valid).length,
    expired: coupons.filter(c => !c.is_valid).length,
    totalUsages: coupons.reduce((sum, c) => sum + c.current_uses, 0)
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Codes Promo</h1>
          <p className="text-muted-foreground">
            Gérez vos codes promo et réductions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Coupon
        </Button>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Coupons
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Tous les codes créés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Actifs
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Codes utilisables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expirés
            </CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
            <p className="text-xs text-muted-foreground">
              Codes expirés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilisations
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsages}</div>
            <p className="text-xs text-muted-foreground">
              Total d'utilisations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Coupons</CardTitle>
          <CardDescription>
            Gérez et suivez tous vos codes promotionnels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par code ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="expired">Expirés</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table des coupons */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Réduction</TableHead>
                  <TableHead>Validité</TableHead>
                  <TableHead>Utilisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCoupons.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Aucun coupon trouvé.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCoupons.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-bold">
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{coupon.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {coupon.description.substring(0, 50)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.discount_type === "percentage" ? (
                          <span className="font-semibold text-blue-600">
                            -{coupon.discount_value}%
                          </span>
                        ) : (
                          <span className="font-semibold text-green-600">
                            -{coupon.discount_value.toLocaleString()} {coupon.currency}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(coupon.valid_from).toLocaleDateString('fr-FR')}</div>
                          <div className="text-muted-foreground">
                            au {new Date(coupon.valid_to).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {coupon.current_uses} / {coupon.max_uses}
                          </div>
                          <div className="h-2 w-full rounded-full bg-gray-200">
                            <div
                              className={`h-2 rounded-full ${
                                coupon.usage_percentage >= 80
                                  ? 'bg-red-500'
                                  : coupon.usage_percentage >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${coupon.usage_percentage}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {coupon.is_active && coupon.is_valid ? (
                          <Badge className="bg-green-500">Actif</Badge>
                        ) : !coupon.is_valid ? (
                          <Badge variant="destructive">Expiré</Badge>
                        ) : (
                          <Badge variant="secondary">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
