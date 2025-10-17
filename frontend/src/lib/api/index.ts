// Export des services API

export { authApi } from './auth';
export type { LoginCredentials, AuthResponse, User } from './auth';

export { usersApi } from './users';
export type { User as ApiUser, CreateUserData, UpdateUserData } from './users';

export { queuesApi } from './queues';
export type { Queue, CreateQueueData, QueueStats } from './queues';

export { ticketsApi } from './tickets';
export type { Ticket, TicketStats } from './tickets';

export { customersApi } from './customers';
export type { Customer, CustomerStats } from './customers';

export { subscriptionsApi } from './subscriptions';
export type { SubscriptionPlan, Subscription, PaymentMethod } from './subscriptions';

export { feedbackApi } from './feedback';
export type { Feedback, FeedbackStats } from './feedback';

export { displaysApi } from './displays';
export type { Display, DisplayStats } from './displays';

export { notificationsApi } from './notifications';
export type { Notification, NotificationPreferences } from './notifications';

export { contactApi } from './contact';
export type { ContactMessage, CreateContactMessageData } from './contact';

// Export du client API
export { default as apiClient } from './client';