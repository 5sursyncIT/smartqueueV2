// ===== Auth & User Types =====
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  avatar?: string;
  avatar_url?: string;
  is_active: boolean;
  agent_profile?: {
    id: string;
    counter_number?: number;
    current_status: string;
  };
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface TenantMembership {
  id: string;
  tenant: Tenant;
  user: User;
  role: 'admin' | 'manager' | 'agent';
  is_active: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface JWTPayload {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  tenants: Array<{
    tenant_id: string;
    tenant_slug: string;
    tenant_name: string;
    role: string;
    scopes: string[];
  }>;
  current_tenant?: string;
  current_role?: string;
  scopes?: string[];
}

// ===== Queue & Service Types =====
export interface Site {
  id: string;
  tenant: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  tenant: string;
  site: string;
  name: string;
  sla_seconds?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type QueueAlgorithm = 'fifo' | 'priority' | 'sla';

export interface Queue {
  id: string;
  tenant: string;
  site: string;
  service: string;
  name: string;
  algorithm: QueueAlgorithm;
  max_capacity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QueueStats {
  waiting_count: number;
  called_count: number;
  in_service_count: number;
  avg_wait_seconds: number | null;
}

// ===== Ticket Types =====
export type TicketStatus =
  | 'en_attente'
  | 'appele'
  | 'en_service'
  | 'pause'
  | 'transfere'
  | 'clos'
  | 'no_show';

export type TicketChannel = 'web' | 'app' | 'qr' | 'whatsapp' | 'kiosk';

export interface Ticket {
  id: string;
  tenant: string;
  queue: string;
  number: string;
  channel: TicketChannel;
  priority: number;
  status: TicketStatus;
  eta_seconds?: number;
  agent?: string;
  customer?: string;
  customer_name?: string;
  customer_phone?: string;
  called_at?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

// ===== Agent Types =====
export type AgentStatus = 'available' | 'busy' | 'break' | 'offline';

export interface AgentProfile {
  id: string;
  user: string;
  current_status: AgentStatus;
  services: string[];
  created_at: string;
  updated_at: string;
}

export interface Agent extends User {
  profile?: AgentProfile;
}

// ===== Customer Types =====
export interface Customer {
  id: string;
  tenant: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

// ===== Notification Types =====
export type NotificationChannel = 'sms' | 'email' | 'whatsapp' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface Notification {
  id: string;
  tenant: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  sent_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// ===== Feedback Types =====
export type FeedbackScoreType = 'csat' | 'nps';

export interface Feedback {
  id: string;
  tenant: string;
  ticket?: string;
  score_type: FeedbackScoreType;
  score: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

// ===== Analytics Types =====
export interface WaitTimeReport {
  period: {
    start: string;
    end: string;
  };
  avg_wait_seconds: number;
  min_wait_seconds: number;
  max_wait_seconds: number;
  avg_service_seconds: number;
  total_tickets: number;
}

export interface AgentPerformanceReport {
  agent_id: string;
  agent_name: string;
  tickets_handled: number;
  avg_service_seconds: number;
  no_shows: number;
}

export interface QueueStatsReport {
  queue_id: string;
  queue_name: string;
  total_tickets: number;
  waiting: number;
  called: number;
  in_service: number;
  closed: number;
  no_show: number;
  avg_wait_seconds: number;
}

export interface SatisfactionReport {
  period: {
    start: string;
    end: string;
  };
  csat_avg: number;
  csat_count: number;
  nps_score: number;
  nps_count: number;
  promoters: number;
  passives: number;
  detractors: number;
}

// ===== WebSocket Types =====
export type WSEventType =
  | 'ticket.created'
  | 'ticket.called'
  | 'ticket.closed'
  | 'ticket.transferred'
  | 'agent.status_changed'
  | 'queue.updated';

export interface WSEvent<T = any> {
  type: WSEventType;
  data: T;
  timestamp: string;
}

// ===== API Response Types =====
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface APIError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// ===== Form Types =====
export interface QueueFormData {
  name: string;
  site: string;
  service: string;
  algorithm: QueueAlgorithm;
  max_capacity?: number;
  is_active: boolean;
}

export interface ServiceFormData {
  name: string;
  site: string;
  sla_seconds?: number;
  is_active: boolean;
}

export interface SiteFormData {
  name: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
}

export interface AgentInviteFormData {
  email: string;
  first_name: string;
  last_name: string;
  services: string[];
}

// ===== Filter Types =====
export interface ReportFilters {
  start_date: string;
  end_date: string;
  site_id?: string;
  service_id?: string;
  agent_id?: string;
}

export interface TicketFilters {
  status?: TicketStatus;
  queue?: string;
  agent?: string;
  customer?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

// ===== Constants =====
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  en_attente: 'En attente',
  appele: 'Appelé',
  en_service: 'En service',
  pause: 'En pause',
  transfere: 'Transféré',
  clos: 'Clôturé',
  no_show: 'No show',
};

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  available: 'Disponible',
  busy: 'Occupé',
  break: 'En pause',
  offline: 'Hors ligne',
};

export const QUEUE_ALGORITHM_LABELS: Record<QueueAlgorithm, string> = {
  fifo: 'FIFO (Premier arrivé)',
  priority: 'Priorité',
  sla: 'SLA-aware',
};
