/**
 * Hook pour gérer les services
 */

import { useState, useEffect } from 'react';
import { servicesService } from '../services/services';
import type { Service } from '../types/api.types';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await servicesService.getAll();
      setServices(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des services');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  return {
    services,
    isLoading,
    error,
    refetch: fetchServices,
  };
}

export function useService(serviceId: string) {
  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchService = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await servicesService.getById(serviceId);
      setService(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  return {
    service,
    isLoading,
    error,
    refetch: fetchService,
  };
}
