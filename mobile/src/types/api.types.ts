/**
 * Types pour l'API SmartQueue
 */

// Réponse d'authentification
export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

// Utilisateur
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  avatar?: string;
  avatar_url?: string;
  is_active: boolean;
}

// Tenant
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
}

// Service
export interface Service {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  sla_seconds?: number;
}

// Queue
export interface Queue {
  id: string;
  name: string;
  slug: string;
  service: Service;
  status: 'active' | 'paused' | 'closed';
  algorithm: 'fifo' | 'priority' | 'sla';
  waiting_count?: number;
  max_capacity?: number;
}

// Statut de ticket
export type TicketStatus =
  | 'en_attente'
  | 'appele'
  | 'en_service'
  | 'pause'
  | 'transfere'
  | 'clos'
  | 'no_show';

// Ticket
export interface Ticket {
  id: string;
  number: string;
  queue: Queue;
  status: TicketStatus;
  priority: number;
  channel: 'web' | 'app' | 'qr' | 'whatsapp' | 'kiosk';
  customer_name?: string;
  customer_phone?: string;
  eta_seconds?: number | null;
  wait_time_seconds?: number | null;
  agent?: {
    id: string;
    user: {
      first_name: string;
      last_name: string;
    };
    counter_number?: number;
  };
  called_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Stats de queue
export interface QueueStats {
  id: string;
  name: string;
  status: string;
  algorithm: string;
  waiting: number;
  called: number;
  serving: number;
  avg_wait_time_seconds: number;
  estimated_wait_time_seconds: number;
}

// Réponse paginée
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Erreur API
export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  code?: string;
}

// Créer un ticket
export interface CreateTicketDto {
  queue_id: string;
  channel: 'app';
  customer_name?: string;
  customer_phone?: string;
  priority?: number;
}
