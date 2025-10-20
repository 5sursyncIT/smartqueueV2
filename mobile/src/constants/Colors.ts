/**
 * Palette de couleurs SmartQueue
 * Inspirée par le design moderne de Queekly
 */

export const Colors = {
  // Couleurs principales
  primary: '#3B82F6', // Bleu
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',

  // Couleurs de statut
  success: '#10B981', // Vert
  successDark: '#059669',
  successLight: '#34D399',

  warning: '#F59E0B', // Orange
  warningDark: '#D97706',
  warningLight: '#FBBF24',

  danger: '#EF4444', // Rouge
  dangerDark: '#DC2626',
  dangerLight: '#F87171',

  info: '#3B82F6', // Bleu info
  infoDark: '#2563EB',
  infoLight: '#60A5FA',

  // Couleurs neutres
  white: '#FFFFFF',
  black: '#000000',

  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Couleurs de fond
  background: '#FFFFFF',
  backgroundDark: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',

  // Couleurs de texte
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },

  // Couleurs par statut de ticket
  ticket: {
    waiting: '#F59E0B', // Orange
    called: '#3B82F6', // Bleu
    serving: '#10B981', // Vert
    completed: '#6B7280', // Gris
    cancelled: '#EF4444', // Rouge
    noShow: '#EF4444', // Rouge
  },

  // Couleurs par statut d'agent
  agent: {
    available: '#10B981', // Vert
    busy: '#F59E0B', // Orange
    paused: '#6B7280', // Gris
    offline: '#9CA3AF', // Gris clair
  },

  // Dégradés
  gradients: {
    primary: ['#3B82F6', '#2563EB'],
    success: ['#10B981', '#059669'],
    warning: ['#F59E0B', '#D97706'],
    danger: ['#EF4444', '#DC2626'],
  },

  // Transparences
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
};

export default Colors;
