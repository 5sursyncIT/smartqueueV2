/**
 * Hook pour récupérer la liste des tenants/organisations
 * Utilisé pour les sélecteurs d'organisations dans les formulaires
 */
import { useOrganizations, type Organization } from './use-superadmin';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

/**
 * Récupère la liste de toutes les organisations/tenants
 * Compatible avec les composants qui attendent une liste simple de tenants
 */
export function useTenants() {
  const { data: organizations, ...rest } = useOrganizations();

  // Transformer les organisations en format simple pour les sélecteurs
  const tenants: Tenant[] | undefined = organizations?.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
  }));

  return {
    data: tenants,
    ...rest,
  };
}
