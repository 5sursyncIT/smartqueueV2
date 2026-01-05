import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  is_active: boolean;
  is_superuser: boolean;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserWithMemberships extends User {
  tenants: Array<{
    tenant_id: string;
    tenant_name: string;
    tenant_slug: string;
    role: 'admin' | 'manager' | 'agent';
  }>;
}

export interface CreateUserDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  is_superuser?: boolean;
  is_staff?: boolean;
}

export interface UpdateUserDto {
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  is_staff?: boolean;
}

// API functions
const fetchUsers = async (): Promise<UserWithMemberships[]> => {
  const response = await apiClient.get('/auth/users/');
  return response.data;
};

const fetchUser = async (userId: string): Promise<UserWithMemberships> => {
  const response = await apiClient.get(`/auth/users/${userId}/`);
  return response.data;
};

const createUser = async (data: CreateUserDto): Promise<User> => {
  const response = await apiClient.post('/auth/users/', data);
  return response.data;
};

const updateUser = async (userId: string, data: UpdateUserDto): Promise<User> => {
  const response = await apiClient.patch(`/auth/users/${userId}/`, data);
  return response.data;
};

const deleteUser = async (userId: string): Promise<void> => {
  await apiClient.delete(`/auth/users/${userId}/`);
};

const toggleUserStatus = async (userId: string, isActive: boolean): Promise<User> => {
  const response = await apiClient.patch(`/auth/users/${userId}/`, { is_active: isActive });
  return response.data;
};

// React Query hooks
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    queryFn: () => fetchUser(userId),
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserDto) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      toggleUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Assigner un utilisateur à une organisation
const assignUserToTenant = async (
  userId: string,
  data: { tenant_id: string; role: 'admin' | 'manager' | 'agent' }
): Promise<any> => {
  const response = await apiClient.post(`/auth/users/${userId}/assign_tenant/`, data);
  return response.data;
};

export function useAssignUserToTenant(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { tenant_id: string; role: 'admin' | 'manager' | 'agent' }) =>
      assignUserToTenant(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users', userId] });
    },
  });
}
