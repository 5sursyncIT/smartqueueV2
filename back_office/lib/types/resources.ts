// Types pour les ressources du backend

export interface Site {
  id: string;
  tenant?: string;
  name: string;
  slug: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  tenant?: string;
  site: Site | string | null;
  name: string;
  sla_seconds: number;
  priority_rules?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Queue {
  id: string;
  tenant: string;
  name: string;
  slug: string;
  site: Site | null;
  service: Service;
  algorithm: 'fifo' | 'priority' | 'sla';
  status: 'active' | 'paused' | 'closed';
  max_capacity: number | null;
  waiting_count: number;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  current_status: 'available' | 'busy' | 'paused';
  status_updated_at: string;
  queues: Array<{
    id: string;
    name: string;
    service: {
      id: string;
      name: string;
    };
  }>;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    push: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  tenant: string;
  queue: Queue | string;
  customer: Customer | string | null;
  number: string;
  status: 'waiting' | 'called' | 'serving' | 'completed' | 'no_show' | 'cancelled';
  priority: number;
  agent: Agent | string | null;
  called_at: string | null;
  served_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// DTOs pour la création/mise à jour
export interface CreateSiteDto {
  name: string;
  slug: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  is_active?: boolean;
}

export type UpdateSiteDto = Partial<CreateSiteDto>;

export interface CreateServiceDto {
  name: string;
  site?: string;
  sla_seconds?: number;
  priority_rules?: Record<string, unknown>;
  is_active?: boolean;
}

export type UpdateServiceDto = Partial<CreateServiceDto>;

export interface CreateQueueDto {
  name: string;
  slug?: string;
  site_id?: string;
  service_id: string;
  algorithm?: 'fifo' | 'priority' | 'sla';
  status?: 'active' | 'paused' | 'closed';
  max_capacity?: number;
}

export type UpdateQueueDto = Partial<CreateQueueDto>;

export interface CreateAgentDto {
  user_email: string;
  site_id?: string;
  queue_ids?: string[];
  max_concurrent_tickets?: number;
}

export type UpdateAgentDto = Partial<CreateAgentDto>;

export interface InviteAgentDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  queue_ids?: string[];
}

export interface NotificationTemplate {
  id: string;
  tenant: string;
  name: string;
  description?: string;
  channel: 'sms' | 'email' | 'push' | 'whatsapp';
  event_type: string;
  subject?: string;
  body_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationTemplateDto {
  name: string;
  description?: string;
  channel: 'sms' | 'email' | 'push' | 'whatsapp';
  event_type: string;
  subject?: string;
  body_template: string;
  is_active?: boolean;
}

export type UpdateNotificationTemplateDto = Partial<CreateNotificationTemplateDto>;

export interface Display {
  id: string;
  tenant: string;
  name: string;
  site: string;
  site_name?: string;
  display_type: 'main' | 'counter' | 'waiting';
  layout: 'split' | 'grid' | 'list' | 'fullscreen' | 'modern';
  theme: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    logo?: string;
  };
  auto_refresh_seconds: number;
  // Personnalisation visuelle
  show_video: boolean;
  video_url?: string;
  background_image?: string;
  // Messages personnalisables
  custom_message: string;
  secondary_message?: string;
  message_position: 'top' | 'bottom' | 'both';
  // Couleurs des tickets par file
  ticket_colors: Record<string, string>;
  // Files associées
  queues: Array<{
    id: string;
    name: string;
    service: {
      id: string;
      name: string;
    };
  }>;
  queue_ids?: string[];
  queue_count?: number;
  // État
  is_active: boolean;
  last_ping?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDisplayDto {
  name: string;
  site: string;
  display_type: 'main' | 'counter' | 'waiting';
  layout?: 'split' | 'grid' | 'list' | 'fullscreen' | 'modern';
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    logo?: string;
  };
  auto_refresh_seconds?: number;
  show_video?: boolean;
  video_url?: string;
  background_image?: string;
  custom_message?: string;
  secondary_message?: string;
  message_position?: 'top' | 'bottom' | 'both';
  ticket_colors?: Record<string, string>;
  queue_ids?: string[];
  is_active?: boolean;
}

export type UpdateDisplayDto = Partial<CreateDisplayDto>;

export interface Kiosk {
  id: string;
  tenant: string;
  name: string;
  site: string;
  site_name?: string;
  device_id: string;
  last_ping?: string;
  is_online: boolean;
  is_active: boolean;
  // Files disponibles
  available_queues: Array<{
    id: string;
    name: string;
  }>;
  queue_ids?: string[];
  queue_count?: number;
  // Options
  language_options: Record<string, any>;
  require_phone: boolean;
  require_name: boolean;
  enable_appointment_checkin: boolean;
  has_printer: boolean;
  printer_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateKioskDto {
  name: string;
  site: string;
  is_active?: boolean;
  queue_ids?: string[];
  require_phone?: boolean;
  require_name?: boolean;
  enable_appointment_checkin?: boolean;
  has_printer?: boolean;
  printer_config?: Record<string, any>;
  language_options?: Record<string, any>;
}

export type UpdateKioskDto = Partial<CreateKioskDto>;

// Responses paginées
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
