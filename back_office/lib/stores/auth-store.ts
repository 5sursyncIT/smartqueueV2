import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Tenant, JWTPayload } from '@/lib/types';
import { clearTokens } from '@/lib/api/client';

interface TenantWithRole extends Tenant {
  role: 'super-admin' | 'admin' | 'manager' | 'agent';
  scopes: string[];
}

interface AuthState {
  user: User | null;
  tenants: TenantWithRole[];
  currentTenant: TenantWithRole | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  _hasHydrated: boolean;

  // Actions
  setUser: (user: User, payload: JWTPayload) => void;
  updateUser: (userData: Partial<User>) => void;
  setCurrentTenant: (tenant: TenantWithRole) => void;
  logout: () => void;
  hasScope: (scope: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tenants: [],
      currentTenant: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      _hasHydrated: false,

      setUser: (user, payload) => {
        const isSuperAdmin = (payload as any).is_superuser || false;

        const tenants: TenantWithRole[] = payload.tenants.map((t) => ({
          id: t.tenant_id,
          name: t.tenant_name,
          slug: t.tenant_slug,
          role: t.role as any,
          scopes: t.scopes,
          created_at: "",
          updated_at: "",
        }));

        // Si super-admin sans tenant, créer un tenant virtuel
        let currentTenant: TenantWithRole | null = null;
        if (isSuperAdmin && tenants.length === 0) {
          currentTenant = {
            id: "superadmin",
            name: "Super Admin",
            slug: "superadmin",
            role: "super-admin",
            scopes: ["*"],
            created_at: "",
            updated_at: "",
          };
        } else {
          currentTenant = tenants[0] || null;
        }

        set({
          user,
          tenants,
          currentTenant,
          isAuthenticated: true,
          isSuperAdmin,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...userData,
            },
          });
        }
      },

      setCurrentTenant: (tenant) => {
        set({ currentTenant: tenant });
      },

      logout: () => {
        // Nettoyer les tokens en mémoire
        clearTokens();

        // Nettoyer le state du store
        set({
          user: null,
          tenants: [],
          currentTenant: null,
          isAuthenticated: false,
          isSuperAdmin: false,
        });
      },

      hasScope: (scope) => {
        const { currentTenant } = get();
        return currentTenant?.scopes.includes(scope) || false;
      },

      hasRole: (roles) => {
        const { currentTenant } = get();
        if (!currentTenant) return false;

        const roleArray = Array.isArray(roles) ? roles : [roles];
        return roleArray.includes(currentTenant.role);
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tenants: state.tenants,
        currentTenant: state.currentTenant,
        isAuthenticated: state.isAuthenticated,
        isSuperAdmin: state.isSuperAdmin,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
