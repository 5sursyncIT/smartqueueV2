/**
 * Utilitaires de formatage
 */

/**
 * Formate une durée en secondes en format lisible
 * @param seconds - Durée en secondes
 * @returns Chaîne formatée (ex: "5 min", "1h 30min")
 */
export const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds <= 0) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }

  if (minutes < 1) {
    return '< 1 min';
  }

  return `${minutes} min`;
};

/**
 * Formate un numéro de téléphone
 * @param phone - Numéro de téléphone
 * @returns Numéro formaté
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '-';

  // Enlever tous les caractères non-numériques
  const cleaned = phone.replace(/\D/g, '');

  // Format: +221 XX XXX XX XX (Sénégal)
  if (cleaned.startsWith('221') && cleaned.length === 12) {
    return `+221 ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
  }

  // Format par défaut
  return phone;
};

/**
 * Formate une date en format local
 * @param date - Date ISO string
 * @returns Date formatée
 */
export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';

  const d = new Date(date);
  const now = new Date();

  // Aujourd'hui
  if (d.toDateString() === now.toDateString()) {
    return `Aujourd'hui à ${d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  // Hier
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `Hier à ${d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  // Autre jour
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formate l'heure uniquement
 * @param date - Date ISO string
 * @returns Heure formatée
 */
export const formatTime = (date: string | null | undefined): string => {
  if (!date) return '-';

  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formate un numéro de ticket (affiche seulement les 4 derniers chiffres)
 * @param ticketNumber - Numéro complet du ticket
 * @returns 4 derniers chiffres
 */
export const formatTicketNumber = (ticketNumber: string): string => {
  if (!ticketNumber) return '-';
  return ticketNumber.slice(-4);
};

/**
 * Capitalise la première lettre d'une chaîne
 */
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Traduit le statut du ticket en français
 */
export const translateTicketStatus = (status: string): string => {
  const translations: Record<string, string> = {
    en_attente: 'En attente',
    appele: 'Appelé',
    en_service: 'En service',
    pause: 'En pause',
    transfere: 'Transféré',
    clos: 'Terminé',
    no_show: 'Absent',
  };

  return translations[status] || status;
};
