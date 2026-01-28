import { Clock } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Ticket {
  id: string;
  number: string;
  queue_name: string;
  queue_id: string;
  status: string;
  called_at: string;
  counter: number | null;
  agent_name: string | null;
}

interface DisplayConfig {
  show_video: boolean;
  video_url?: string;
  background_image?: string;
  custom_message: string;
  secondary_message?: string;
  message_position: string;
  ticket_colors: Record<string, string>;
  theme: {
    logo?: string;
    backgroundColor?: string;
    primaryColor?: string;
  };
}

interface ModernLayoutProps {
  tickets: Ticket[];
  displayConfig: DisplayConfig;
  currentTime: Date;
}

// Couleurs par défaut pour les tickets (style Desjardins de l'image)
const DEFAULT_COLORS = ['#FF6B35', '#9B59B6', '#3498DB', '#27AE60', '#F39C12', '#E74C3C'];

export function ModernLayout({ tickets, displayConfig, currentTime }: ModernLayoutProps) {
  const previousTicketsRef = useRef<string[]>([]);

  // Fonction de synthèse vocale (TTS)
  const announceTicket = (ticket: Ticket) => {
    if ('speechSynthesis' in window) {
      // Annuler toute annonce en cours
      window.speechSynthesis.cancel();

      // Extraire les 4 derniers chiffres du numéro de ticket
      const last4Digits = ticket.number.slice(-4);

      // Préparer le texte à annoncer avec les 4 derniers chiffres seulement
      const counterText = ticket.counter ? `guichet ${ticket.counter}` : 'guichet';
      const text = `Ticket ${last4Digits.split('').join(' ')}, ${counterText}`;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9; // Vitesse légèrement ralentie
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      console.log('[TTS] Annonce:', text);
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('[TTS] Web Speech API non supportée');
    }
  };

  // Détecter les nouveaux tickets et les annoncer
  useEffect(() => {
    const currentTicketIds = tickets.map(t => t.id);
    const previousTicketIds = previousTicketsRef.current;

    // Trouver les nouveaux tickets
    const newTickets = tickets.filter(
      ticket => !previousTicketIds.includes(ticket.id)
    );

    // Annoncer uniquement le premier nouveau ticket (le plus récent)
    if (newTickets.length > 0) {
      const mostRecentTicket = newTickets[0];
      console.log('[Display] Nouveau ticket détecté:', mostRecentTicket.number);

      // Annoncer après un court délai pour laisser l'affichage se mettre à jour
      setTimeout(() => {
        announceTicket(mostRecentTicket);
      }, 500);
    }

    // Mettre à jour la référence
    previousTicketsRef.current = currentTicketIds;
  }, [tickets]);

  const getTicketColor = (ticket: Ticket, index: number): string => {
    // Priorité 1: Couleur configurée pour cette file spécifique
    if (displayConfig.ticket_colors?.[ticket.queue_id]) {
      return displayConfig.ticket_colors[ticket.queue_id];
    }
    // Priorité 2: Couleur par rotation
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  // Ne garder que les 8 derniers tickets appelés
  const displayedTickets = tickets.slice(0, 8);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden flex flex-col">
      {/* Header avec date et heure - Style moderne */}
      <header className="bg-gray-900 border-b-2 border-gray-700 px-8 py-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-4">
          {displayConfig.theme?.logo && (
            <img
              src={displayConfig.theme.logo}
              alt="Logo"
              className="h-14 object-contain drop-shadow-lg"
            />
          )}
        </div>
        <div className="flex items-center gap-4 text-white bg-gray-800/50 px-6 py-2 rounded-lg">
          <div className="text-right border-r border-gray-600 pr-4">
            <div className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-0.5">
              {formatDate(currentTime)}
            </div>
          </div>
          <div className="text-4xl font-black tabular-nums tracking-tight">
            {formatTime(currentTime)}
          </div>
        </div>
      </header>

      {/* Corps principal - Layout split screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Zone gauche - Liste des tickets (60%) */}
        <div className="w-[60%] p-6 overflow-hidden flex flex-col bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="flex flex-col gap-3">
            {displayedTickets.map((ticket, index) => (
              <div
                key={ticket.id}
                className="bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300"
                style={{
                  animation: index === 0 ? 'pulse 2s ease-in-out infinite' : 'none',
                  border: index === 0 ? '4px solid #10B981' : '2px solid #E5E7EB',
                }}
              >
                <div className="flex items-center px-6 py-4">
                  {/* Numéro du ticket - Style Desjardins */}
                  <div className="flex-1 min-w-0 pr-4">
                    {/* Nom de la file */}
                    <div className="text-gray-500 text-xl font-bold uppercase tracking-wider mb-2 truncate">
                      {ticket.queue_name}
                    </div>
                    <div
                      className="text-7xl font-black tabular-nums leading-none"
                      style={{ color: getTicketColor(ticket, index) }}
                    >
                      {ticket.number.split('-').pop()}
                    </div>
                  </div>

                  {/* Séparateur vertical */}
                  <div className="w-px h-20 bg-gray-300 mx-6"></div>

                  {/* Informations du guichet - Style Desjardins */}
                  <div className="text-right min-w-[140px]">
                    <div className="text-gray-600 text-base font-semibold uppercase tracking-wide mb-2">
                      GUICHET
                    </div>
                    <div className="text-gray-900 text-5xl font-black tabular-nums">
                      {ticket.counter || '-'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {displayedTickets.length === 0 && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white/40">
                <p className="text-4xl font-light">En attente des prochains appels...</p>
              </div>
            </div>
          )}
        </div>

        {/* Zone droite - Vidéo/Image + Message (40%) */}
        <div className="w-[40%] flex flex-col">
          {/* Zone média (vidéo ou image) */}
          {displayConfig.show_video && (
            <div className="flex-1 relative overflow-hidden">
              {displayConfig.video_url ? (
                // Support pour vidéos YouTube, Vimeo, ou fichiers directs
                displayConfig.video_url.includes('youtube.com') || displayConfig.video_url.includes('youtu.be') ? (
                  <iframe
                    src={displayConfig.video_url.replace('watch?v=', 'embed/')}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : displayConfig.video_url.includes('vimeo.com') ? (
                  <iframe
                    src={displayConfig.video_url.replace('vimeo.com/', 'player.vimeo.com/video/')}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={displayConfig.video_url}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                  />
                )
              ) : displayConfig.background_image ? (
                <img
                  src={displayConfig.background_image}
                  alt="Background"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <div className="text-white/20 text-6xl font-light">SmartQueue</div>
                </div>
              )}
            </div>
          )}

          {/* Bannière de message personnalisée - Style Desjardins */}
          <div className="bg-gradient-to-r from-green-600 via-green-700 to-green-600 relative overflow-hidden" style={{ minHeight: '160px' }}>
            {/* Message principal */}
            <div className="relative z-10 h-full flex items-center px-8 py-6">
              <div className="flex-1">
                <div className="text-white text-3xl font-bold leading-tight mb-3">
                  {displayConfig.custom_message || "Votre bannière de messages à la clientèle"}
                </div>

                {displayConfig.secondary_message && (
                  <div className="text-white/95 text-xl font-medium">
                    {displayConfig.secondary_message}
                  </div>
                )}
              </div>

              {/* Logo à droite si disponible */}
              {displayConfig.theme?.logo && (
                <div className="ml-6">
                  <img
                    src={displayConfig.theme.logo}
                    alt="Logo"
                    className="h-24 object-contain"
                  />
                </div>
              )}
            </div>

            {/* Bande décorative supérieure */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-green-300 to-green-400"></div>

            {/* Motif décoratif */}
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 translate-x-1/3" />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
}
