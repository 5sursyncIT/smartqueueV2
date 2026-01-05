'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Ban,
  CheckCircle,
  Shield,
  Mail,
  Calendar,
  Building,
  Plus,
  Edit,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, useToggleUserStatus, useAssignUserToTenant } from '@/lib/hooks/use-users';
import type { User, CreateUserDto, UpdateUserDto } from '@/lib/hooks/use-users';
import { UserDialog } from '@/components/users/user-dialog';
import { DeleteUserDialog } from '@/components/users/delete-user-dialog';
import { AssignTenantDialog } from '@/components/users/assign-tenant-dialog';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

export default function UsersPage() {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignTenantDialogOpen, setAssignTenantDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToAssign, setUserToAssign] = useState<User | null>(null);

  // API Hooks
  const { data: users = [], isLoading, error } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(selectedUser?.id || '');
  const deleteUser = useDeleteUser();
  const toggleStatus = useToggleUserStatus();
  const assignTenant = useAssignUserToTenant(userToAssign?.id || '');

  // Handlers
  const handleAddClick = () => {
    setSelectedUser(null);
    setUserDialogOpen(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await toggleStatus.mutateAsync({
        userId: user.id,
        isActive: !user.is_active,
      });
      toast.success(`Utilisateur ${!user.is_active ? 'activé' : 'désactivé'} avec succès`);
    } catch (error) {
      toast.error(`Erreur lors de la modification du statut`);
    }
  };

  const handleSubmit = async (data: CreateUserDto | UpdateUserDto) => {
    try {
      if (selectedUser) {
        await updateUser.mutateAsync(data as UpdateUserDto);
        toast.success('Utilisateur mis à jour avec succès');
      } else {
        // Créer l'utilisateur
        const newUser = await createUser.mutateAsync(data as CreateUserDto);

        // Si tenant_id et role sont fournis, assigner l'utilisateur à l'organisation
        const createData = data as CreateUserDto & { tenant_id?: string; role?: string };
        if (createData.tenant_id && createData.role && newUser) {
          try {
            // Appeler directement l'API d'assignation
            await apiClient.post(`/auth/users/${newUser.id}/assign_tenant/`, {
              tenant_id: createData.tenant_id,
              role: createData.role,
            });
            toast.success('Utilisateur créé et assigné à l\'organisation avec succès');
          } catch (assignError) {
            // Si l'assignation échoue, informer l'utilisateur mais ne pas considérer comme une erreur fatale
            toast.warning('Utilisateur créé, mais l\'assignation à l\'organisation a échoué. Vous pouvez l\'assigner manuellement.');
          }
        } else {
          toast.success('Utilisateur créé avec succès');
        }
      }
      setUserDialogOpen(false);
    } catch (error) {
      toast.error(
        selectedUser
          ? 'Erreur lors de la mise à jour de l\'utilisateur'
          : 'Erreur lors de la création de l\'utilisateur'
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;

    try {
      await deleteUser.mutateAsync(userToDelete.id);
      toast.success('Utilisateur supprimé avec succès');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const handleAssignClick = (user: User) => {
    setUserToAssign(user);
    setAssignTenantDialogOpen(true);
  };

  const handleAssignSubmit = async (data: { tenant_id: string; role: 'admin' | 'manager' | 'agent' }) => {
    try {
      await assignTenant.mutateAsync(data);
      toast.success('Utilisateur assigné à l\'organisation avec succès');
      setAssignTenantDialogOpen(false);
      setUserToAssign(null);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || 'Erreur lors de l\'assignation';
      toast.error(errorMessage);
      throw error;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Jamais';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleBadge = (user: User) => {
    if (user.is_superuser) {
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
          Super Admin
        </Badge>
      );
    }

    // Get primary role from tenants
    const userWithTenants = user as any;
    const primaryTenant = userWithTenants.tenants?.[0];
    if (!primaryTenant) {
      return <Badge variant="secondary">Aucun rôle</Badge>;
    }

    const variants: Record<string, { label: string; className: string }> = {
      admin: { label: 'Admin', className: 'bg-blue-100 text-blue-800' },
      manager: { label: 'Manager', className: 'bg-green-100 text-green-800' },
      agent: { label: 'Agent', className: 'bg-gray-100 text-gray-800' },
    };

    const { label, className } = variants[primaryTenant.role as string] || { label: primaryTenant.role, className: 'bg-gray-100 text-gray-800' };
    return (
      <Badge variant="secondary" className={className}>
        {label}
      </Badge>
    );
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.tenants?.[0]?.tenant_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const userRole = user.is_superuser ? 'super-admin' : user.tenants?.[0]?.role;
    const matchesRole = roleFilter === 'all' || userRole === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => u.tenants?.some(t => t.role === 'admin')).length,
    agents: users.filter((u) => u.tenants?.some(t => t.role === 'agent')).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des utilisateurs</h1>
          <p className="text-gray-600 mt-2">
            Vue globale de tous les utilisateurs de la plateforme
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Créer un utilisateur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.active}</div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round((stats.active / stats.total) * 100)}% du total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.admins}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.agents}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres et recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des utilisateurs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, email ou organisation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actifs</SelectItem>
                  <SelectItem value="inactive">Inactifs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière mise à jour</TableHead>
                  <TableHead>Tickets</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Chargement des utilisateurs...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-red-500 py-8">
                      Erreur lors du chargement des utilisateurs
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      Aucun utilisateur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user)}</TableCell>
                      <TableCell>
                        {user.tenants && user.tenants.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="text-sm font-medium">{user.tenants[0].tenant_name}</div>
                              <div className="text-xs text-gray-500">@{user.tenants[0].tenant_slug}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800">
                            <Ban className="h-3 w-3 mr-1" />
                            Inactif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          {formatDate(user.updated_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-400">-</span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {!user.is_superuser && (!user.tenants || user.tenants.length === 0) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleAssignClick(user)}>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Assigner à une organisation
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                              {user.is_active ? (
                                <>
                                  <Ban className="h-4 w-4 mr-2" />
                                  Désactiver
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Activer
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <div>
              Affichage de {filteredUsers.length} utilisateur(s) sur {users.length}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UserDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        user={selectedUser}
        onSubmit={handleSubmit}
        isLoading={createUser.isPending || updateUser.isPending}
      />

      <DeleteUserDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={userToDelete}
        onConfirm={handleConfirmDelete}
        isLoading={deleteUser.isPending}
      />

      <AssignTenantDialog
        open={assignTenantDialogOpen}
        onOpenChange={setAssignTenantDialogOpen}
        user={userToAssign}
        onSubmit={handleAssignSubmit}
        isLoading={assignTenant.isPending}
      />
    </div>
  );
}
