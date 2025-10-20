/**
 * Hook pour gérer les tickets
 */

import { useState, useEffect } from 'react';
import { ticketsService, CreateTicketDto } from '../services/tickets';
import type { Ticket } from '../types/api.types';

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ticketsService.getAll();
      setTickets(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return {
    tickets,
    isLoading,
    error,
    refetch: fetchTickets,
  };
}

export function useMyTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ticketsService.getMyTickets();
      setTickets(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de vos tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  return {
    tickets,
    isLoading,
    error,
    refetch: fetchMyTickets,
  };
}

export function useTicket(ticketId: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ticketsService.getById(ticketId);
      setTicket(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du ticket');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  return {
    ticket,
    isLoading,
    error,
    refetch: fetchTicket,
  };
}

export function useCreateTicket() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTicket = async (data: CreateTicketDto): Promise<Ticket | null> => {
    try {
      setIsCreating(true);
      setError(null);
      const ticket = await ticketsService.create(data);
      return ticket;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du ticket');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createTicket,
    isCreating,
    error,
  };
}

export function useCancelTicket() {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelTicket = async (ticketId: string): Promise<boolean> => {
    try {
      setIsCancelling(true);
      setError(null);
      await ticketsService.cancel(ticketId);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'annulation du ticket');
      return false;
    } finally {
      setIsCancelling(false);
    }
  };

  return {
    cancelTicket,
    isCancelling,
    error,
  };
}

export function useTicketHistory() {
  const [history, setHistory] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await ticketsService.getHistory();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history,
    isLoading,
    error,
    refetch: fetchHistory,
  };
}
