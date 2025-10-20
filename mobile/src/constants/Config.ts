/**
 * Configuration de l'application SmartQueue Mobile
 */

// URL de l'API backend
export const API_CONFIG = {
  // Développement local
  BASE_URL: __DEV__ ? 'http://localhost:8000' : 'https://api.smartqueue.app',
  API_VERSION: '/api/v1',
  TIMEOUT: 30000, // 30 secondes
};

// Configuration WebSocket
export const WS_CONFIG = {
  BASE_URL: __DEV__ ? 'ws://localhost:8000' : 'wss://api.smartqueue.app',
  RECONNECT_INTERVAL: 5000, // 5 secondes
  MAX_RECONNECT_ATTEMPTS: 5,
};

// Configuration des notifications
export const NOTIFICATION_CONFIG = {
  ENABLED: true,
  SOUND: true,
  VIBRATE: true,
};

// Configuration du cache
export const CACHE_CONFIG = {
  TOKEN_KEY: '@smartqueue_token',
  REFRESH_TOKEN_KEY: '@smartqueue_refresh_token',
  USER_KEY: '@smartqueue_user',
  TENANT_KEY: '@smartqueue_tenant',
};

// Durées
export const DURATIONS = {
  TOAST_DURATION: 3000,
  REFRESH_INTERVAL: 30000, // 30 secondes
  TICKET_POLL_INTERVAL: 5000, // 5 secondes
};

// Limites
export const LIMITS = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};
