/**
 * BTicino Intercom Card
 *
 * Custom Lovelace card for BTicino Classe 100X/300X video intercom systems.
 * Supports multiple intercoms with tab switching and swipe gestures.
 * Provides live video WITH audio, configurable door/light action buttons,
 * two-way audio via microphone toggle, and auto-reconnect.
 *
 * Audio trick: injects a silent audio track (AudioContext + OscillatorNode 0Hz)
 * into the WebRTC offer, which tricks the BTicino device into activating its
 * microphone. HA's built-in camera player uses recvonly (no track), so the
 * device sends silence. This card generates sendrecv + a real SSRC in the SDP.
 *
 * Browser compatibility:
 *   Chrome/Chromium: Full support (video + audio + two-way audio).
 *   Firefox: NOT SUPPORTED. The BTicino device firmware uses hardcoded
 *   Chrome-compatible RTP payload types regardless of SDP negotiation.
 *   See bticino_intercom docs/firefox-webrtc-investigation.md.
 *
 * Config:
 *   type: custom:bticino-intercom-card
 *   title: Card Title
 *   intercoms:
 *     - name: Front Door
 *       camera: camera.front_door
 *       actions:
 *         - entity: lock.entity_id
 *           icon: mdi:gate
 *           label: Label
 *           service: lock.unlock
 *     - name: Back Door
 *       camera: camera.back_door
 *       actions: []
 *   max_actions: 4
 *   auto_mic: true
 *   ignore_ssl_warning: false
 *
 * @license MIT
 */

const CARD_VERSION = '0.3.0';

// ---------------------------------------------------------------------------
// i18n — covers all BTicino intercom markets
// ---------------------------------------------------------------------------

const TRANSLATIONS = {
  en: {
    call: 'Call',
    connecting: 'Connecting...',
    someone_at_door: 'Someone at the door',
    answer: 'Answer',
    open: 'Open',
    reject: 'Reject',
    missed_call: '\u{1F4DE} Missed call',
    call_history: 'Call History',
    dismiss: 'Dismiss',
  },
  it: {
    call: 'Chiama',
    connecting: 'Connessione in corso...',
    someone_at_door: 'Qualcuno alla porta',
    answer: 'Rispondi',
    open: 'Apri',
    reject: 'Rifiuta',
    missed_call: '\u{1F4DE} Chiamata persa',
    call_history: 'Cronologia Chiamate',
    dismiss: 'Chiudi',
  },
  fr: {
    call: 'Appeler',
    connecting: 'Connexion en cours...',
    someone_at_door: 'Quelqu’un à la porte',
    answer: 'Répondre',
    open: 'Ouvrir',
    reject: 'Refuser',
    missed_call: '\u{1F4DE} Appel manqué',
    call_history: 'Historique des appels',
    dismiss: 'Fermer',
  },
  es: {
    call: 'Llamar',
    connecting: 'Conectando...',
    someone_at_door: 'Alguien en la puerta',
    answer: 'Responder',
    open: 'Abrir',
    reject: 'Rechazar',
    missed_call: '\u{1F4DE} Llamada perdida',
    call_history: 'Historial de llamadas',
    dismiss: 'Cerrar',
  },
  de: {
    call: 'Anrufen',
    connecting: 'Verbindung wird hergestellt...',
    someone_at_door: 'Jemand an der Tür',
    answer: 'Annehmen',
    open: 'Öffnen',
    reject: 'Ablehnen',
    missed_call: '\u{1F4DE} Verpasster Anruf',
    call_history: 'Anrufverlauf',
    dismiss: 'Schließen',
  },
  pt: {
    call: 'Ligar',
    connecting: 'Conectando...',
    someone_at_door: 'Alguém na porta',
    answer: 'Atender',
    open: 'Abrir',
    reject: 'Rejeitar',
    missed_call: '\u{1F4DE} Chamada perdida',
    call_history: 'Histórico de chamadas',
    dismiss: 'Fechar',
  },
  nl: {
    call: 'Bellen',
    connecting: 'Verbinden...',
    someone_at_door: 'Iemand aan de deur',
    answer: 'Beantwoorden',
    open: 'Openen',
    reject: 'Weigeren',
    missed_call: '\u{1F4DE} Gemiste oproep',
    call_history: 'Oproepgeschiedenis',
    dismiss: 'Sluiten',
  },
  tr: {
    call: 'Ara',
    connecting: 'Bağlanıyor...',
    someone_at_door: 'Kapıda biri var',
    answer: 'Yanıtla',
    open: 'Aç',
    reject: 'Reddet',
    missed_call: '\u{1F4DE} Cevapsız arama',
    call_history: 'Arama geçmişi',
    dismiss: 'Kapat',
  },
  el: {
    call: 'Κλήση',
    connecting: 'Σύνδεση...',
    someone_at_door: 'Κάποιος στην πόρτα',
    answer: 'Απάντηση',
    open: 'Άνοιγμα',
    reject: 'Απόρριψη',
    missed_call: '\u{1F4DE} Αναπάντητη',
    call_history: 'Ιστορικό κλήσεων',
    dismiss: 'Κλείσιμο',
  },
  ar: {
    call: 'اتصال',
    connecting: 'جاري الاتصال...',
    someone_at_door: 'شخص عند الباب',
    answer: 'رد',
    open: 'افتح',
    reject: 'رفض',
    missed_call: '\u{1F4DE} مكالمة فائتة',
    call_history: 'سجل المكالمات',
    dismiss: 'إغلاق',
  },
};

function _t(key, lang) {
  const l = (lang || 'en').split('-')[0];
  return TRANSLATIONS[l]?.[key] || TRANSLATIONS.en[key] || key;
}

const DOMAIN_ICONS = {
  lock: 'mdi:lock',
  light: 'mdi:lightbulb',
  switch: 'mdi:toggle-switch',
  cover: 'mdi:window-shutter',
  script: 'mdi:play',
  scene: 'mdi:palette',
  fan: 'mdi:fan',
  climate: 'mdi:thermostat',
  vacuum: 'mdi:robot-vacuum',
};

const STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LIVE: 'live',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

const ERROR_MESSAGES = {
  'Max number of peers reached': 'Device busy — too many active connections. Close other sessions and try again.',
  'Offer rejected': 'Device rejected the connection request.',
  'Signaling timeout': 'Device did not respond in time. Check if it is online.',
  'Authentication failed': 'Home Assistant authentication failed. Try reloading the page.',
  'WebSocket error': 'Lost connection to Home Assistant.',
  'No auth token available': 'Authentication token not available. Try reloading the page.',
};

const ICON_PHONE =
  '<svg viewBox="0 0 24 24"><path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>';
const ICON_HANGUP =
  '<svg viewBox="0 0 24 24" style="transform:rotate(135deg)"><path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CARD_STYLES = `
  :host {
    display: block;
    --bti-bg: var(--card-background-color, var(--ha-card-background, #1c1c1e));
    --bti-radius: var(--ha-card-border-radius, 12px);
    --bti-text: var(--primary-text-color, #e1e1e1);
    --bti-text-secondary: var(--secondary-text-color, #9e9e9e);
    --bti-primary: var(--primary-color, #03a9f4);
    --bti-divider: var(--divider-color, rgba(255,255,255,0.08));
  }

  * { box-sizing: border-box; }

  ha-card {
    background: var(--bti-bg);
    border-radius: var(--bti-radius);
    overflow: hidden;
    color: var(--bti-text);
    font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif);
    position: relative;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--bti-divider);
  }
  .tab-bar.hidden { display: none; }
  .tab {
    flex: 1;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 12px 0;
    border: none;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--bti-text-secondary);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .tab ha-icon { --mdc-icon-size: 18px; flex-shrink: 0; }
  .tab:hover { color: var(--bti-text); }
  .tab.active {
    color: #66bb6a;
    border-bottom-color: #66bb6a;
    font-weight: 600;
  }
  .tab.ring {
    color: #ff9800;
    border-bottom-color: #ff9800;
  }
  .tab.live {
    color: #ef5350;
    border-bottom-color: #ef5350;
  }

  .warning-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    margin: 0 12px 8px;
    border-radius: 8px;
    font-size: 12px;
    line-height: 1.5;
  }
  .warning-banner ha-icon {
    --mdc-icon-size: 18px;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .warning-banner a { color: inherit; text-decoration: underline; }
  .warning-banner.firefox {
    background: rgba(244, 67, 54, 0.12);
    color: #ef5350;
  }
  .warning-banner.ssl {
    background: rgba(255, 152, 0, 0.12);
    color: #ffa726;
  }
  .warning-banner .dismiss-btn {
    margin-left: auto;
    flex-shrink: 0;
    background: none;
    border: 1px solid rgba(255,152,0,0.3);
    border-radius: 6px;
    color: inherit;
    font-size: 11px;
    padding: 3px 10px;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.15s;
    white-space: nowrap;
  }
  .warning-banner .dismiss-btn:hover { opacity: 1; }

  .video-area {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    background: #000;
    overflow: hidden;
    border-radius: 8px;
    touch-action: pan-y;
  }
  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }

  .idle-overlay {
    position: absolute; left: 0; right: 0; bottom: 0; top: 60%;
    display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
    pointer-events: none; gap: 4px;
  }
  .idle-overlay.hidden { opacity: 0; pointer-events: none; }
  .idle-name {
    font-size: 15px; font-weight: 600; color: var(--bti-text); opacity: 0.4;
    letter-spacing: 0.5px;
  }

  .content-row {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px;
  }
  .content-icon {
    width: 40px; height: 40px; border-radius: 50%;
    background: rgba(255,255,255,0.08);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .content-icon ha-icon { --mdc-icon-size: 20px; opacity: 0.5; }
  .content-info { flex: 1; min-width: 0; }
  .content-name {
    font-size: 15px; font-weight: 600; color: var(--bti-text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .content-subtitle {
    font-size: 12px; color: var(--bti-text-secondary); margin-top: 2px;
  }
  .call-pill {
    background: #4caf50; color: white; border: none; border-radius: 20px;
    padding: 8px 20px; font-size: 13px; font-weight: 600; font-family: inherit;
    cursor: pointer; display: flex; align-items: center; gap: 6px;
    flex-shrink: 0; transition: background 0.15s, transform 0.1s;
  }
  .call-pill:hover { background: #43a047; }
  .call-pill:active { transform: scale(0.95); }
  .call-pill ha-icon { --mdc-icon-size: 16px; }

  .media-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    overflow: hidden;
    transition: grid-template-rows 0.35s ease;
  }
  .media-wrapper > .video-area {
    overflow: hidden;
    min-height: 0;
  }
  ha-card.expanded .media-wrapper {
    grid-template-rows: 1fr;
  }
  ha-card.expanded .content-row { display: none; }

  .error-overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 8px; background: rgba(0,0,0,0.85); z-index: 5;
    opacity: 0; pointer-events: none; transition: opacity 0.3s ease; padding: 20px;
  }
  .error-overlay.visible { opacity: 1; pointer-events: auto; }
  .error-overlay .error-icon { width: 40px; height: 40px; fill: #ef5350; }
  .error-overlay .error-msg {
    color: #ef5350; font-size: 13px; font-weight: 500;
    text-align: center; line-height: 1.4; max-width: 280px;
  }
  .error-overlay .error-dismiss {
    margin-top: 4px; padding: 6px 16px;
    border: 1px solid rgba(255,255,255,0.2); border-radius: 6px;
    background: none; color: var(--bti-text-secondary); font-size: 12px;
    cursor: pointer; transition: background 0.15s, color 0.15s;
  }
  .error-overlay .error-dismiss:hover { background: rgba(255,255,255,0.1); color: var(--bti-text); }

  .call-overlay {
    position: absolute; inset: 0;
    display: flex; align-items: center; justify-content: center;
    z-index: 3; cursor: pointer;
    background: rgba(0,0,0,0.35); transition: background 0.2s ease, opacity 0.3s ease;
  }
  .call-overlay:hover { background: rgba(0,0,0,0.2); }
  .call-overlay.hidden { opacity: 0; pointer-events: none; }
  .call-btn {
    width: 64px; height: 64px; border-radius: 50%;
    background: #4caf50;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  .call-overlay:hover .call-btn { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.5); }
  .call-btn svg { width: 28px; height: 28px; fill: #fff; }

  .connecting-overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 16px; background: rgba(0,0,0,0.6); z-index: 3;
    opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
  }
  .connecting-overlay.visible { opacity: 1; pointer-events: auto; }
  .connecting-rings {
    position: relative;
    width: 80px; height: 80px;
    display: flex; align-items: center; justify-content: center;
  }
  .ring {
    position: absolute;
    border: 2px solid rgba(76,175,80,0.5);
    border-radius: 50%;
    animation: pulse-ring 1.8s ease-out infinite;
  }
  .ring:nth-child(1) { width: 40px; height: 40px; animation-delay: 0s; }
  .ring:nth-child(2) { width: 56px; height: 56px; animation-delay: 0.4s; }
  .ring-center {
    width: 24px; height: 24px; border-radius: 50%;
    background: #4caf50;
    animation: pulse-dot 1.8s ease-in-out infinite;
    display: flex; align-items: center; justify-content: center;
  }
  .ring-center svg { width: 14px; height: 14px; fill: #fff; }
  .connecting-text {
    color: rgba(255,255,255,0.8);
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  .video-controls {
    position: absolute; bottom: 0; left: 0; right: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 10px; background: linear-gradient(transparent, rgba(0,0,0,0.7));
    z-index: 4; opacity: 0; transition: opacity 0.2s ease; pointer-events: none;
  }
  .video-controls.visible { opacity: 1; pointer-events: auto; }
  .video-controls .ctrl-group { display: flex; align-items: center; gap: 4px; }
  .vc-btn {
    width: 36px; height: 36px; border: none; border-radius: 50%;
    background: rgba(255,255,255,0.12); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: #fff; transition: background 0.15s, color 0.15s, transform 0.1s; padding: 0;
  }
  .vc-btn:hover { background: rgba(255,255,255,0.25); }
  .vc-btn:active { transform: scale(0.92); }
  .vc-btn ha-icon { --mdc-icon-size: 20px; }
  .vc-btn.mic-active { background: rgba(76,175,80,0.35); color: #66bb6a; }
  .vc-btn.mic-muted { background: rgba(244,67,54,0.3); color: #ef5350; }
  .vc-btn.hangup {
    background: rgba(244,67,54,0.85);
    color: #fff;
  }
  .vc-btn.hangup:hover { background: rgba(244,67,54,1); }
  .vc-btn.hangup svg { width: 20px; height: 20px; fill: #fff; }

  .swipe-dots {
    display: flex; align-items: center; justify-content: center;
    gap: 6px; padding: 8px 0;
  }
  .swipe-dots.hidden { display: none; }
  .swipe-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: rgba(255,255,255,0.35);
    transition: background 0.2s, transform 0.2s;
  }
  .swipe-dot.active {
    background: var(--bti-primary);
  }

  .action-bar {
    display: flex; align-items: stretch; justify-content: center;
    gap: 6px; padding: 10px 12px 12px; position: relative;
  }
  .action-btn {
    flex: 1;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 5px; padding: 12px 6px 10px; border: none; border-radius: 12px;
    background: rgba(255,255,255,0.04);
    backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    color: var(--bti-text-secondary);
    transition: background 0.15s, color 0.15s, transform 0.1s;
    position: relative; overflow: hidden;
  }
  .action-bar.compact .action-btn { max-width: 100px; }
  .action-btn:hover { background: rgba(255,255,255,0.1); color: var(--bti-text); }
  .action-btn:active { transform: scale(0.95); }
  .action-btn ha-icon { --mdc-icon-size: 20px; flex-shrink: 0; opacity: 0.7; }
  .action-btn:hover ha-icon { opacity: 1; }
  .action-btn .action-label {
    font-size: 10px; font-weight: 500; line-height: 1.2; text-align: center;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
    opacity: 0.7;
  }
  .action-btn:hover .action-label { opacity: 1; }

  .action-btn.active-lock { background: rgba(76,175,80,0.18); color: #66bb6a; }
  .action-btn.active-light { background: rgba(255,235,59,0.15); color: #ffee58; }
  .action-btn.active-default { background: rgba(3,169,244,0.18); color: #29b6f6; }

  @keyframes action-pulse {
    0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); }
    100% { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
  }
  .action-btn.pulse { animation: action-pulse 0.35s ease-out; }

  .overflow-popup {
    position: absolute; bottom: calc(100% + 4px); right: 12px;
    background: var(--bti-bg); border: 1px solid var(--bti-divider);
    border-radius: 10px; padding: 4px; min-width: 150px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 10; display: none;
  }
  .overflow-popup.open { display: block; }
  .overflow-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border: none; border-radius: 8px;
    background: none; cursor: pointer; color: var(--bti-text-secondary);
    font-size: 13px; font-family: inherit; width: 100%; text-align: left;
    transition: background 0.12s, color 0.12s;
  }
  .overflow-item:hover { background: rgba(255,255,255,0.08); color: var(--bti-text); }
  .overflow-item ha-icon { --mdc-icon-size: 20px; flex-shrink: 0; }

  @container (max-width: 350px) { .action-btn .action-label { display: none; } }
  @media (max-width: 350px) { .action-btn .action-label { display: none; } }

  /* History overlay */
  .history-btn {
    flex-shrink: 0; margin-left: 8px; background: none; border: none;
    cursor: pointer; color: var(--bti-text-secondary); padding: 2px;
    display: flex; align-items: center; border-radius: 50%;
    transition: color 0.15s, background 0.15s;
  }
  .history-btn:hover { color: var(--bti-text); background: rgba(255,255,255,0.08); }
  .history-btn ha-icon { --mdc-icon-size: 20px; }
  ha-card {
    transition: min-height 0.35s ease;
  }
  ha-card.history-open { min-height: 70vh; }
  ha-card.history-open .content-row { display: none; }
  ha-card.history-open .action-bar { display: none; }
  ha-card.history-open .swipe-dots { display: none; }
  ha-card.history-open .tab-bar { display: none; }

  .history-overlay {
    position: absolute; inset: 0; z-index: 20;
    background: var(--bti-bg); display: flex; flex-direction: column;
    border-radius: var(--bti-radius); overflow: hidden;
    opacity: 0; pointer-events: none;
    transition: opacity 0.3s ease;
  }
  .history-overlay.open { opacity: 1; pointer-events: auto; }
  .history-header {
    display: flex; align-items: center; padding: 12px 16px 8px;
    border-bottom: 1px solid var(--bti-divider);
  }
  .history-header .title { flex: 1; font-size: 15px; font-weight: 500; }
  .history-close {
    background: none; border: none; cursor: pointer; color: var(--bti-text-secondary);
    padding: 4px; border-radius: 50%; display: flex; align-items: center;
  }
  .history-close:hover { color: var(--bti-text); background: rgba(255,255,255,0.08); }
  .history-close ha-icon { --mdc-icon-size: 20px; }
  .history-list {
    flex: 1; overflow-y: auto; padding: 8px 12px;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;
  }
  .history-empty {
    display: flex; align-items: center; justify-content: center;
    height: 100%; color: var(--bti-text-secondary); font-size: 13px;
  }
  .history-loading {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    height: 100%; color: var(--bti-text-secondary); font-size: 13px;
  }
  .history-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px; margin-bottom: 4px; border-radius: 8px; cursor: pointer;
    transition: background 0.15s;
  }
  .history-item:hover { background: rgba(255,255,255,0.06); }
  .history-thumb {
    width: 56px; height: 42px; border-radius: 6px; object-fit: cover;
    background: rgba(255,255,255,0.04); flex-shrink: 0;
  }
  .history-info { flex: 1; min-width: 0; }
  .history-time { font-size: 13px; font-weight: 500; color: var(--bti-text); }
  .history-module { font-size: 11px; color: var(--bti-text-secondary); margin-top: 1px; }
  .history-badge {
    flex-shrink: 0; padding: 2px 8px; border-radius: 8px;
    font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px;
  }
  .history-badge.incoming_call { background: rgba(255,152,0,0.2); color: #ffa726; }
  .history-badge.answered_elsewhere { background: rgba(76,175,80,0.2); color: #66bb6a; }
  .history-badge.terminated { background: rgba(244,67,54,0.2); color: #ef5350; }
  .history-detail {
    position: absolute; inset: 0; z-index: 21;
    background: var(--bti-bg); display: flex; flex-direction: column;
    border-radius: var(--bti-radius); overflow: hidden;
    opacity: 0; pointer-events: none;
    transition: opacity 0.3s ease;
  }
  .history-detail.open { opacity: 1; pointer-events: auto; }
  .history-detail-body {
    flex: 1; display: flex; align-items: center; position: relative; overflow: hidden;
  }
  .history-detail-img {
    flex: 1; display: flex; align-items: center; justify-content: center;
    padding: 8px; overflow: hidden; min-height: 0;
  }
  .history-detail-img img {
    max-width: 100%; max-height: 100%; border-radius: 8px; object-fit: contain;
  }
  .detail-nav {
    position: absolute; top: 50%; transform: translateY(-50%); z-index: 2;
    background: rgba(0,0,0,0.45); border: none; border-radius: 50%;
    width: 36px; height: 36px; cursor: pointer; color: #fff;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.15s;
  }
  .detail-nav:hover { background: rgba(0,0,0,0.7); }
  .detail-nav:disabled { opacity: 0.2; cursor: default; }
  .detail-nav.prev { left: 8px; }
  .detail-nav.next { right: 8px; }
  .detail-nav ha-icon { --mdc-icon-size: 22px; }
  .history-detail-bar {
    padding: 10px 16px; border-top: 1px solid var(--bti-divider);
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; color: var(--bti-text-secondary);
  }
  .history-detail-bar .detail-info { flex: 1; min-width: 0; }
  .history-detail-bar .detail-module {
    display: flex; align-items: center; gap: 4px; font-size: 12px; margin-top: 2px;
  }

  .ring-snapshot {
    position: absolute; inset: 0;
    z-index: 2;
  }
  .ring-snapshot img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .ring-snapshot .ring-gradient {
    position: absolute; top: 0; left: 0; right: 0;
    height: 50%; background: linear-gradient(rgba(0,0,0,0.75), transparent);
    pointer-events: none;
  }
  .ring-snapshot .ring-label {
    position: absolute; top: 14px; left: 20px; right: 20px;
    display: flex; justify-content: space-between; align-items: center;
    pointer-events: none;
  }
  .ring-label-text { color: #ff9800; font-size: 17px; font-weight: 700; }
  .ring-label-sub { color: rgba(255,255,255,0.5); font-size: 13px; margin-top: 2px; }
  .ring-badge {
    background: rgba(255,152,0,0.2); color: #ff9800;
    border-radius: 14px; padding: 5px 12px; font-size: 12px; font-weight: 600;
    animation: ring-blink 1s infinite;
  }
  @keyframes ring-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

  ha-card.ringing {
    border: 2px solid rgba(255,152,0,0.4);
    box-shadow: 0 0 20px rgba(255,152,0,0.15);
  }

  .action-bar .ring-action { font-weight: 600; }
  .action-bar .ring-action.answer { color: #66bb6a; }
  .action-bar .ring-action.answer:hover { background: rgba(76,175,80,0.15); }
  .action-bar .ring-action.open-door { color: #42a5f5; }
  .action-bar .ring-action.open-door:hover { background: rgba(33,150,243,0.15); }
  .action-bar .ring-action.reject { color: #ef5350; }
  .action-bar .ring-action.reject:hover { background: rgba(244,67,54,0.15); }
`;

// ---------------------------------------------------------------------------
// Card class
// ---------------------------------------------------------------------------

class BticinoIntercomCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._activeIndex = 0;
    this._touchStartX = 0;
    this._touchStartY = 0;
    this._pc = null;
    this._ws = null;
    this._sessionId = null;
    this._candidateMsgId = 100;
    this._audioCtx = null;
    this._oscillator = null;
    this._silenceTrack = null;
    this._silenceStream = null;
    this._remoteStream = null;
    this._micActive = false;
    this._micStream = null;
    this._micSender = null;
    this._state = STATE.IDLE;
    this._playing = false;
    this._muted = false;
    this._wantPlay = false;
    this._reconnectTimer = null;
    this._reconnectCount = 0;
    this._maxRetries = 5;
    this._controlsTimer = null;
    this._controlsVisible = false;
    this._overflowOpen = false;
    this._pendingLocalCandidates = [];
    this._sslWarningDismissed = false;
    this._boundDocClick = this._onDocumentClick.bind(this);
    this._callEventUnsub = null;
    this._ringSessionId = null;
    this._ringtoneAudio = null;
    this._ringData = null;
    this._savedActionBarHTML = null;
    this._missedCallTimer = null;
    this._lang = 'en';
  }

  get _activeIntercom() {
    return this._config.intercoms[this._activeIndex];
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    this._lang = hass?.language || 'en';
    if (!this._callEventUnsub && hass?.connection) this._subscribeCallEvents();
    if (!prev && hass && this._config) this._render();
    this._updateIdleOverlay();
    this._updateActionStates();
  }

  setConfig(config) {
    if (!config.intercoms || !Array.isArray(config.intercoms) || config.intercoms.length === 0) {
      throw new Error('Required: intercoms array with at least one entry');
    }
    for (const ic of config.intercoms) {
      if (!ic.name || !ic.camera) throw new Error('Each intercom requires name and camera');
    }
    this._config = {
      intercoms: config.intercoms.map((ic) => ({
        name: ic.name,
        camera: ic.camera,
        icon: ic.icon || null,
        actions: ic.actions || [],
      })),
      max_actions: config.max_actions ?? 4,
      auto_mic: config.auto_mic ?? true,
      ignore_ssl_warning: config.ignore_ssl_warning ?? false,
      action_layout: config.action_layout || 'fill',
      title: config.title || null,
    };
    this._activeIndex = 0;
    if (this._hass) this._render();
  }

  getCardSize() {
    return 5;
  }

  static getConfigElement() {
    return document.createElement('bticino-intercom-card-editor');
  }

  static getStubConfig() {
    return {
      title: 'Intercom',
      intercoms: [{ name: 'Front Door', camera: 'camera.bticino_intercom', actions: [] }],
    };
  }

  connectedCallback() {
    if (this._config && this._hass) this._render();
    this._subscribeCallEvents();
    this._checkAutoAnswer();
  }

  disconnectedCallback() {
    this._stopRingtone();
    this._cleanup();
    this._unsubscribeCallEvents();
    document.removeEventListener('click', this._boundDocClick);
  }

  // ========== Rendering ==========

  _render() {
    const intercoms = this._config.intercoms;
    const showTabs = intercoms.length > 1;
    const actions = this._activeIntercom.actions;
    const maxActions = this._config.max_actions;
    const visibleActions = actions.slice(0, maxActions);
    const overflowActions = actions.slice(maxActions);
    const hasOverflow = overflowActions.length > 0;
    const isFirefox = /Firefox/i.test(navigator.userAgent);
    const isInsecure = !window.isSecureContext;
    const showSslWarning = isInsecure && !this._config.ignore_ssl_warning && !this._sslWarningDismissed;

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        <div class="tab-bar${showTabs ? '' : ' hidden'}" id="tab-bar">
          ${intercoms.map((ic, i) => `<button class="tab${i === this._activeIndex ? ' active' : ''}" data-tab-idx="${i}">${ic.icon ? `<ha-icon icon="${this._esc(ic.icon)}"></ha-icon>` : ''}${this._esc(ic.name)}</button>`).join('')}
        </div>
        ${
          isFirefox
            ? `
        <div class="warning-banner firefox">
          <ha-icon icon="mdi:firefox"></ha-icon>
          <div>Firefox is not supported — this card requires <b>Chrome</b> or a Chromium-based browser.
          <a href="https://github.com/k-the-hidden-hero/bticino_intercom/blob/main/docs/firefox-webrtc-investigation.md" target="_blank" rel="noopener">Learn why</a></div>
        </div>
        `
            : ''
        }
        ${
          showSslWarning
            ? `
        <div class="warning-banner ssl" id="ssl-warning">
          <ha-icon icon="mdi:shield-alert-outline"></ha-icon>
          <div>Non-secure connection (HTTP) — the microphone requires HTTPS. Video and incoming audio work normally.</div>
          <button class="dismiss-btn" id="dismiss-ssl">Ignore</button>
        </div>
        `
            : ''
        }
        <div class="content-row" id="content-row">
          <div class="content-icon"><ha-icon icon="mdi:doorbell-video"></ha-icon></div>
          <div class="content-info">
            <div class="content-name">${this._esc(this._activeIntercom.name)}</div>
          </div>
          <button class="history-btn" id="history-btn" title="Call history"><ha-icon icon="mdi:history"></ha-icon></button>
          <button class="call-pill" id="call-pill"><ha-icon icon="mdi:phone"></ha-icon> ${_t('call', this._lang)}</button>
        </div>
        <div class="media-wrapper">
          <div class="video-area" id="video-area">
          <video id="video" autoplay playsinline></video>
          <div class="idle-overlay" id="idle-overlay"><ha-icon icon="mdi:doorbell-video" style="--mdc-icon-size:36px;opacity:0.25"></ha-icon><div class="idle-name">${this._esc(this._activeIntercom.name)}</div></div>
          <div class="call-overlay" id="call-overlay"><div class="call-btn">${ICON_PHONE}</div></div>
          <div class="connecting-overlay" id="connecting-overlay">
            <div class="connecting-rings">
              <div class="ring"></div>
              <div class="ring"></div>
              <div class="ring-center">${ICON_PHONE}</div>
            </div>
            <div class="connecting-text">${_t('connecting', this._lang)}</div>
          </div>
          <div class="error-overlay" id="error-overlay">
            <svg class="error-icon" viewBox="0 0 24 24"><path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/></svg>
            <div class="error-msg" id="error-msg"></div>
            <button class="error-dismiss" id="error-dismiss">Dismiss</button>
          </div>
          <div class="video-controls" id="video-controls">
            <div class="ctrl-group">
              <button class="vc-btn hangup" id="vc-hangup" title="Hang up">${ICON_HANGUP}</button>
              <button class="vc-btn" id="vc-volume" title="Mute"><ha-icon icon="mdi:volume-high"></ha-icon></button>
              <button class="vc-btn" id="vc-mic" title="Microphone"><ha-icon icon="mdi:microphone-off"></ha-icon></button>
            </div>
            <div class="ctrl-group">
              <button class="vc-btn" id="vc-fullscreen" title="Fullscreen"><ha-icon icon="mdi:fullscreen"></ha-icon></button>
            </div>
          </div>
        </div>
        </div>
        <div class="action-bar${this._config.action_layout === 'compact' ? ' compact' : ''}" id="action-bar">
          ${visibleActions.map((a, i) => this._renderActionBtn(a, i)).join('')}
          ${hasOverflow ? `<button class="action-btn" id="overflow-btn" title="More"><ha-icon icon="mdi:dots-vertical"></ha-icon><span class="action-label">...</span></button>` : ''}
          ${hasOverflow ? `<div class="overflow-popup" id="overflow-popup">${overflowActions.map((a, i) => this._renderOverflowItem(a, maxActions + i)).join('')}</div>` : ''}
        </div>
        <div class="swipe-dots${showTabs ? '' : ' hidden'}" id="swipe-dots">
          ${intercoms.map((_, i) => `<div class="swipe-dot${i === this._activeIndex ? ' active' : ''}"></div>`).join('')}
        </div>
        <div class="history-overlay" id="history-overlay">
          <div class="history-header">
            <div class="title">${_t('call_history', this._lang)}</div>
            <button class="history-close" id="history-close"><ha-icon icon="mdi:close"></ha-icon></button>
          </div>
          <div class="history-list" id="history-list">
            <div class="history-empty">No call history available</div>
          </div>
        </div>
        <div class="history-detail" id="history-detail">
          <div class="history-header">
            <div class="title" id="history-detail-title"></div>
            <button class="history-close" id="history-detail-close"><ha-icon icon="mdi:close"></ha-icon></button>
          </div>
          <div class="history-detail-body">
            <button class="detail-nav prev" id="detail-prev" title="Previous"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
            <div class="history-detail-img"><img id="history-detail-img" alt="" /></div>
            <button class="detail-nav next" id="detail-next" title="Next"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
          </div>
          <div class="history-detail-bar" id="history-detail-bar"></div>
        </div>
      </ha-card>
    `;
    this._bindEvents();
    this._updateIdleOverlay();
    this._updateActionStates();
  }

  _renderActionBtn(action, index) {
    const { icon, label } = this._resolveAction(action);
    return `<button class="action-btn" data-action-idx="${index}" title="${this._esc(label)}">
      <ha-icon icon="${this._esc(icon)}"></ha-icon>
      <span class="action-label">${this._esc(label)}</span>
    </button>`;
  }

  _renderOverflowItem(action, index) {
    const { icon, label } = this._resolveAction(action);
    return `<button class="overflow-item" data-action-idx="${index}">
      <ha-icon icon="${this._esc(icon)}"></ha-icon>
      <span>${this._esc(label)}</span>
    </button>`;
  }

  // ========== Event binding ==========

  _bindEvents() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    $('call-overlay')?.addEventListener('click', () => this._startCall());
    $('call-pill')?.addEventListener('click', () => this._startCall());
    $('error-dismiss')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._dismissError();
    });

    const videoArea = $('video-area');
    videoArea?.addEventListener('mouseenter', () => this._showControls());
    videoArea?.addEventListener('mouseleave', () => this._hideControlsDelayed());
    this._bindSwipe(videoArea);
    this._bindSwipe($('content-row'));

    $('vc-hangup')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._hangUp();
    });
    $('vc-volume')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleMute();
    });
    $('vc-mic')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleMic();
    });
    $('vc-fullscreen')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleFullscreen();
    });

    this.shadowRoot.querySelectorAll('.tab[data-tab-idx]').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        this._switchIntercom(parseInt(tab.dataset.tabIdx, 10));
      });
    });

    this.shadowRoot.querySelectorAll('.action-btn[data-action-idx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._executeAction(parseInt(btn.dataset.actionIdx, 10), btn);
      });
    });

    $('overflow-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleOverflow();
    });
    this.shadowRoot.querySelectorAll('.overflow-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this._executeAction(parseInt(item.dataset.actionIdx, 10), item);
        this._closeOverflow();
      });
    });

    $('dismiss-ssl')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._sslWarningDismissed = true;
      this.shadowRoot?.getElementById('ssl-warning')?.remove();
    });

    $('history-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._openHistory();
    });
    $('history-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._closeHistory();
    });
    $('history-detail-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._closeHistoryDetail();
    });
    $('detail-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._navigateDetail(-1);
    });
    $('detail-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._navigateDetail(1);
    });

    document.removeEventListener('click', this._boundDocClick);
    document.addEventListener('click', this._boundDocClick);
  }

  _bindSwipe(el) {
    if (!el) return;
    el.addEventListener(
      'touchstart',
      (e) => {
        this._touchStartX = e.changedTouches[0].clientX;
        this._touchStartY = e.changedTouches[0].clientY;
      },
      { passive: true },
    );
    el.addEventListener(
      'touchend',
      (e) => {
        const dx = e.changedTouches[0].clientX - this._touchStartX;
        const dy = Math.abs(e.changedTouches[0].clientY - this._touchStartY);
        if (Math.abs(dx) > 50 && dy < 30) {
          if (dx < 0 && this._activeIndex < this._config.intercoms.length - 1) {
            this._switchIntercom(this._activeIndex + 1);
          } else if (dx > 0 && this._activeIndex > 0) {
            this._switchIntercom(this._activeIndex - 1);
          }
          return;
        }
        if (this._playing && (e.target === el || e.target.tagName === 'VIDEO')) {
          this._toggleControlsVisibility();
        }
      },
      { passive: true },
    );
  }

  _switchIntercom(index) {
    if (index === this._activeIndex) return;
    if (index < 0 || index >= this._config.intercoms.length) return;
    if (this._playing) this._hangUp();
    this._activeIndex = index;
    this._render();
  }

  _onDocumentClick() {
    if (this._overflowOpen) this._closeOverflow();
  }

  // ========== Status & UI ==========

  _setState(state) {
    this._state = state;
    if (state === STATE.LIVE) {
      this.shadowRoot?.getElementById('connecting-overlay')?.classList.remove('visible');
    }

    this._updateTabStates();
  }

  _updateTabStates() {
    const tabs = this.shadowRoot?.querySelectorAll('.tab');
    if (!tabs) return;
    const isRinging = this.shadowRoot?.querySelector('ha-card')?.classList.contains('ringing');
    tabs.forEach((tab, i) => {
      tab.classList.remove('ring', 'live');
      const origName = this._config.intercoms[i]?.name || '';
      if (i === this._activeIndex && isRinging) {
        tab.classList.add('ring');
        tab.textContent = `🔔 ${origName}`;
      } else if (
        i === this._activeIndex &&
        (this._state === STATE.LIVE || this._state === STATE.CONNECTING || this._state === STATE.RECONNECTING)
      ) {
        tab.classList.add('live');
        tab.textContent = `● ${origName}`;
      } else {
        tab.textContent = origName;
      }
    });
  }

  _showError(message) {
    const friendly = Object.entries(ERROR_MESSAGES).find(([key]) => message.includes(key));
    const overlay = this.shadowRoot?.getElementById('error-overlay');
    const msgEl = this.shadowRoot?.getElementById('error-msg');
    if (overlay && msgEl) {
      msgEl.textContent = friendly ? friendly[1] : message;
      overlay.classList.add('visible');
    }
    this._setState(STATE.ERROR);
  }

  _dismissError() {
    this.shadowRoot?.getElementById('error-overlay')?.classList.remove('visible');
    this._hangUp();
  }

  _updateIdleOverlay() {
    const el = this.shadowRoot?.getElementById('idle-overlay');
    if (!el) return;
    if (this._playing) {
      el.classList.add('hidden');
    } else {
      el.classList.remove('hidden');
    }
    this._loadPosterBackground();
  }

  _loadPosterBackground() {
    const videoArea = this.shadowRoot?.getElementById('video-area');
    if (!videoArea || !this._hass || !this._activeIntercom?.camera) return;
    this._hass
      .callWS({ type: 'auth/sign_path', path: `/api/camera_proxy/${this._activeIntercom.camera}`, expires: 300 })
      .then(({ path }) => {
        videoArea.style.backgroundImage = `url(${path})`;
        videoArea.style.backgroundSize = 'contain';
        videoArea.style.backgroundPosition = 'center';
        videoArea.style.backgroundRepeat = 'no-repeat';
      })
      .catch(() => {});
  }

  _updateActionStates() {
    if (!this._hass || !this._config) return;
    const actions = this._activeIntercom.actions;
    this.shadowRoot?.querySelectorAll('.action-btn[data-action-idx]').forEach((btn) => {
      const action = actions[parseInt(btn.dataset.actionIdx, 10)];
      if (!action) return;
      btn.classList.remove('active-lock', 'active-light', 'active-default');
      const entity = this._hass.states[action.entity];
      if (!entity) return;
      const domain = action.entity.split('.')[0];
      if (['on', 'unlocked', 'open'].includes(entity.state)) {
        btn.classList.add(domain === 'lock' ? 'active-lock' : domain === 'light' ? 'active-light' : 'active-default');
      }
    });
  }

  // ========== Controls visibility ==========

  _showControls() {
    if (!this._playing) return;
    this.shadowRoot?.getElementById('video-controls')?.classList.add('visible');
    this._controlsVisible = true;
    this._resetControlsTimer();
  }

  _hideControlsDelayed() {
    this._resetControlsTimer();
    this._controlsTimer = setTimeout(() => this._hideControls(), 3000);
  }

  _hideControls() {
    this.shadowRoot?.getElementById('video-controls')?.classList.remove('visible');
    this._controlsVisible = false;
  }

  _resetControlsTimer() {
    if (this._controlsTimer) {
      clearTimeout(this._controlsTimer);
      this._controlsTimer = null;
    }
  }

  _toggleControlsVisibility() {
    if (!this._playing) return;
    this._controlsVisible ? this._hideControls() : (this._showControls(), this._hideControlsDelayed());
  }

  // ========== Actions ==========

  _executeAction(index, btnEl) {
    const action = this._activeIntercom.actions[index];
    if (!action || !this._hass) return;
    const [domain, service] = action.service.split('.');
    if (!domain || !service) return;
    this._hass.callService(domain, service, action.service_data || {}, { entity_id: action.entity });
    if (btnEl) {
      btnEl.classList.remove('pulse');
      void btnEl.offsetWidth;
      btnEl.classList.add('pulse');
      setTimeout(() => btnEl.classList.remove('pulse'), 400);
    }
  }

  _toggleOverflow() {
    const popup = this.shadowRoot?.getElementById('overflow-popup');
    if (!popup) return;
    this._overflowOpen = !this._overflowOpen;
    popup.classList.toggle('open', this._overflowOpen);
  }

  _closeOverflow() {
    this.shadowRoot?.getElementById('overflow-popup')?.classList.remove('open');
    this._overflowOpen = false;
  }

  // ========== Call / Hang Up ==========

  async _startCall() {
    if (this._playing) return;
    this.shadowRoot?.querySelector('ha-card')?.classList.add('expanded');
    this._wantPlay = true;
    this._playing = true;
    this._reconnectCount = 0;

    if (!this._audioCtx || this._audioCtx.state === 'closed') {
      this._audioCtx = new AudioContext();
    }

    if (this._config.auto_mic && window.isSecureContext && navigator.mediaDevices?.getUserMedia) {
      try {
        this._micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {}
    }

    this.shadowRoot?.getElementById('idle-overlay')?.classList.add('hidden');
    this._loadPosterBackground();
    this.shadowRoot?.getElementById('call-overlay')?.classList.add('hidden');
    this.shadowRoot?.getElementById('connecting-overlay')?.classList.add('visible');

    this._setState(STATE.CONNECTING);
    this._connect();
  }

  _hangUp() {
    this._wantPlay = false;
    this._playing = false;
    this._clearRingState();
    this._hideControls();
    this._cleanup();
    const video = this.shadowRoot?.getElementById('video');
    if (video) {
      video.srcObject = null;
      video.style.display = 'block';
    }
    this.shadowRoot?.getElementById('error-overlay')?.classList.remove('visible');
    this.shadowRoot?.getElementById('connecting-overlay')?.classList.remove('visible');
    this.shadowRoot?.getElementById('idle-overlay')?.classList.remove('hidden');
    this.shadowRoot?.getElementById('call-overlay')?.classList.remove('hidden');
    const videoArea = this.shadowRoot?.getElementById('video-area');
    if (videoArea) videoArea.style.backgroundImage = '';
    this._updateIdleOverlay();
    this.shadowRoot?.querySelector('ha-card')?.classList.remove('expanded');
    this._setState(STATE.IDLE);
  }

  // ========== Mute / Mic / Fullscreen ==========

  _toggleMute() {
    if (!this._playing) return;
    this._muted = !this._muted;
    const video = this.shadowRoot?.getElementById('video');
    if (video) video.muted = this._muted;
    const btn = this.shadowRoot?.getElementById('vc-volume');
    if (btn) btn.innerHTML = `<ha-icon icon="mdi:${this._muted ? 'volume-off' : 'volume-high'}"></ha-icon>`;
  }

  async _toggleMic() {
    if (!this._playing || this._state !== STATE.LIVE) return;
    this._micActive ? this._stopMic() : await this._startMic();
  }

  async _startMic() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        this._showError('Microphone requires HTTPS. Access HA via https:// to use two-way audio.');
        return;
      }
      if (this._audioCtx?.state === 'suspended') await this._audioCtx.resume();
      this._micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const micTrack = this._micStream.getAudioTracks()[0];
      const audioSender = this._pc?.getSenders()?.find((s) => s.track?.kind === 'audio');
      if (audioSender) {
        await audioSender.replaceTrack(micTrack);
        this._micSender = audioSender;
      }
      this._micActive = true;
      this._updateMicUI();
    } catch (err) {
      console.warn('[bticino-card] Mic access denied:', err);
    }
  }

  _stopMic() {
    if (this._micSender && this._silenceTrack) this._micSender.replaceTrack(this._silenceTrack);
    if (this._micStream) {
      this._micStream.getTracks().forEach((t) => t.stop());
      this._micStream = null;
    }
    this._micActive = false;
    this._micSender = null;
    this._updateMicUI();
  }

  _updateMicUI() {
    const btn = this.shadowRoot?.getElementById('vc-mic');
    if (!btn) return;
    btn.innerHTML = `<ha-icon icon="mdi:${this._micActive ? 'microphone' : 'microphone-off'}"></ha-icon>`;
    btn.classList.remove('mic-active', 'mic-muted');
    btn.classList.add(this._micActive ? 'mic-active' : 'mic-muted');
  }

  _toggleFullscreen() {
    const area = this.shadowRoot?.getElementById('video-area');
    if (!area) return;
    document.fullscreenElement ? document.exitFullscreen().catch(() => {}) : area.requestFullscreen().catch(() => {});
  }

  // ========== WebRTC Connection ==========

  async _connect() {
    const savedMicStream = this._micStream;
    this._micStream = null;
    this._closeConnection();
    this._micStream = savedMicStream;

    try {
      const osc = this._audioCtx.createOscillator();
      osc.frequency.value = 0;
      const dest = this._audioCtx.createMediaStreamDestination();
      osc.connect(dest);
      osc.start();
      this._oscillator = osc;
      this._silenceStream = dest.stream;
      this._silenceTrack = this._silenceStream.getAudioTracks()[0];

      let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
      try {
        const config = await this._hass.callWS({
          type: 'camera/webrtc/get_client_config',
          entity_id: this._activeIntercom.camera,
        });
        if (config?.configuration?.iceServers?.length) {
          iceServers = config.configuration.iceServers
            .map((server) => {
              const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(
                (u) => !u.includes('transport=tcp') && !u.startsWith('turns:'),
              );
              return urls.length ? { ...server, urls } : null;
            })
            .filter(Boolean);
        }
      } catch {}

      this._pc = new RTCPeerConnection({ iceServers, rtcpMuxPolicy: 'require' });
      const micTrack = this._micStream?.getAudioTracks()?.[0];
      this._pc.addTransceiver(micTrack || this._silenceTrack, {
        direction: 'sendrecv',
        streams: [this._silenceStream],
      });
      this._pc.addTransceiver('video', { direction: 'recvonly' });
      if (micTrack) {
        this._micSender = this._pc.getSenders().find((s) => s.track?.kind === 'audio');
        this._micActive = true;
      }

      this._remoteStream = new MediaStream();
      const video = this.shadowRoot?.getElementById('video');
      if (video) video.srcObject = this._remoteStream;

      this._pc.ontrack = (e) => {
        this._remoteStream.addTrack(e.track);
        if (e.track.kind === 'video' && video) video.style.display = 'block';
      };
      // Hide video element until a video track arrives (voice-only calls stay hidden)
      if (video) video.style.display = 'none';

      this._pc.onconnectionstatechange = () => {
        const state = this._pc?.connectionState;
        if (state === 'connected') {
          this._reconnectCount = 0;
          this._setState(STATE.LIVE);
          if (this._micActive) this._updateMicUI();
          const snapshot = this.shadowRoot?.getElementById('ring-snapshot');
          if (snapshot) {
            snapshot.style.transition = 'opacity 0.5s ease';
            snapshot.style.opacity = '0';
            setTimeout(() => snapshot.remove(), 500);
          }
        } else if (['disconnected', 'failed', 'closed'].includes(state) && this._wantPlay) this._scheduleReconnect();
      };

      this._pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const msg = {
          candidate: e.candidate.candidate,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
          sdpMid: e.candidate.sdpMid,
        };
        if (this._ws?.readyState === WebSocket.OPEN && this._sessionId) this._sendCandidate(msg);
        else this._pendingLocalCandidates.push(msg);
      };

      const offer = await this._pc.createOffer();
      await this._pc.setLocalDescription(offer);
      await this._signalViaWebSocket(this._pc.localDescription.sdp);
    } catch (err) {
      console.error('[bticino-card] Connection failed:', err);
      this._showError(err.message || 'Connection failed');
    }
  }

  async _signalViaWebSocket(offerSdp) {
    return new Promise((resolve, reject) => {
      if (!this._hass) {
        reject(new Error('No hass object'));
        return;
      }
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      this._ws = new WebSocket(`${proto}//${location.host}/api/websocket`);
      const msgId = 1;
      let settled = false;

      this._signalingTimeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Signaling timeout'));
        }
      }, 15000);
      const timeout = this._signalingTimeout;

      this._ws.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        }
      };
      this._ws.onclose = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket closed'));
        }
      };

      this._ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'auth_required') {
          const token = this._hass.auth?.data?.access_token || this._hass.connection?.options?.auth?.data?.access_token;
          if (!token) {
            clearTimeout(timeout);
            settled = true;
            reject(new Error('No auth token available'));
            return;
          }
          this._ws.send(JSON.stringify({ type: 'auth', access_token: token }));
        } else if (msg.type === 'auth_ok') {
          this._ws.send(
            JSON.stringify({
              id: msgId,
              type: 'camera/webrtc/offer',
              entity_id: this._activeIntercom.camera,
              offer: offerSdp,
            }),
          );
        } else if (msg.type === 'auth_invalid') {
          clearTimeout(timeout);
          settled = true;
          reject(new Error('Authentication failed'));
        } else if (msg.type === 'result' && !msg.success) {
          clearTimeout(timeout);
          settled = true;
          reject(new Error(msg.error?.message || 'Offer rejected'));
        } else if (msg.type === 'event') {
          const evt = msg.event;
          if (evt.type === 'session') {
            this._sessionId = evt.session_id;
            this._flushLocalCandidates();
          } else if (evt.type === 'answer') {
            try {
              await this._pc.setRemoteDescription({ type: 'answer', sdp: evt.answer });
              clearTimeout(timeout);
              if (!settled) {
                settled = true;
                resolve();
              }
            } catch (err) {
              clearTimeout(timeout);
              if (!settled) {
                settled = true;
                reject(err);
              }
            }
          } else if (evt.type === 'candidate' && evt.candidate) {
            try {
              await this._pc.addIceCandidate({
                candidate: evt.candidate.candidate,
                sdpMLineIndex: evt.candidate.sdp_m_line_index ?? evt.candidate.sdpMLineIndex ?? 0,
              });
            } catch {}
          } else if (evt.type === 'error') {
            clearTimeout(timeout);
            if (!settled) {
              settled = true;
              reject(new Error(evt.message || 'Signaling error'));
            }
          }
        }
      };
    });
  }

  // ========== ICE helpers ==========

  _sendCandidate(msg) {
    this._candidateMsgId++;
    this._ws.send(
      JSON.stringify({
        id: this._candidateMsgId,
        type: 'camera/webrtc/candidate',
        entity_id: this._activeIntercom.camera,
        session_id: this._sessionId,
        candidate: msg,
      }),
    );
  }

  _flushLocalCandidates() {
    if (!this._pendingLocalCandidates.length) return;
    for (const c of this._pendingLocalCandidates) this._sendCandidate(c);
    this._pendingLocalCandidates = [];
  }

  // ========== Reconnect ==========

  _scheduleReconnect() {
    if (!this._wantPlay || this._reconnectTimer) return;
    this._reconnectCount++;
    if (this._reconnectCount > this._maxRetries) {
      this._showError('Connection lost after multiple retries');
      return;
    }
    this._setState(STATE.RECONNECTING);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._wantPlay) this._connect();
    }, 2000);
  }

  // ========== Cleanup ==========

  _closeConnection() {
    this._stopMic();
    if (this._signalingTimeout) {
      clearTimeout(this._signalingTimeout);
      this._signalingTimeout = null;
    }
    if (this._pc) {
      this._pc.ontrack = null;
      this._pc.onconnectionstatechange = null;
      this._pc.onicecandidate = null;
      try {
        this._pc.close();
      } catch {}
      this._pc = null;
    }
    if (this._ws) {
      this._ws.onmessage = null;
      this._ws.onerror = null;
      this._ws.onclose = null;
      try {
        this._ws.close();
      } catch {}
      this._ws = null;
    }
    if (this._oscillator) {
      try {
        this._oscillator.stop();
      } catch {}
      this._oscillator = null;
    }
    this._silenceTrack = null;
    this._silenceStream = null;
    this._remoteStream = null;
    this._sessionId = null;
    this._pendingLocalCandidates = [];
  }

  _cleanup() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._resetControlsTimer();
    this._closeConnection();
    if (this._audioCtx) {
      try {
        this._audioCtx.close();
      } catch {}
      this._audioCtx = null;
    }
  }

  // ========== History ==========

  _getConfigEntryId() {
    const camera = this._activeIntercom?.camera;
    if (!camera) return null;
    const entityReg = this._hass?.entities?.[camera];
    if (!entityReg?.device_id) return null;
    const device = Object.values(this._hass.devices || {}).find((d) => d.id === entityReg.device_id);
    return device?.config_entries?.[0] || null;
  }

  async _openHistory() {
    const overlay = this.shadowRoot.getElementById('history-overlay');
    const list = this.shadowRoot.getElementById('history-list');
    if (!overlay || !list) return;
    this.shadowRoot?.querySelector('ha-card')?.classList.add('history-open');
    overlay.classList.add('open');
    list.innerHTML = '<div class="history-loading"><ha-icon icon="mdi:loading"></ha-icon> Loading...</div>';

    const entryId = this._getConfigEntryId();
    if (!entryId) {
      list.innerHTML = '<div class="history-empty">No config entry found</div>';
      return;
    }

    try {
      const entry = await this._hass.callWS({
        type: 'media_source/browse_media',
        media_content_id: `media-source://bticino_intercom/${entryId}`,
      });
      const allEvents = [];
      for (const module of entry.children || []) {
        const mod = await this._hass.callWS({
          type: 'media_source/browse_media',
          media_content_id: module.media_content_id,
        });
        allEvents.push(...(mod.children || []).map((e) => ({ ...e, moduleName: module.title })));
      }
      allEvents.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      const thumbPaths = allEvents.map((e) => e.thumbnail).filter(Boolean);
      const signedMap = {};
      for (const p of thumbPaths) {
        try {
          const { path: signed } = await this._hass.callWS({ type: 'auth/sign_path', path: p, expires: 300 });
          signedMap[p] = signed;
        } catch {
          /* skip */
        }
      }
      allEvents.forEach((e) => {
        if (e.thumbnail) e._signedThumb = signedMap[e.thumbnail] || '';
      });
      this._historyEvents = allEvents;
      this._renderHistoryList(allEvents, entryId);
    } catch (e) {
      list.innerHTML = `<div class="history-empty">Error: ${e.message}</div>`;
    }
  }

  _renderHistoryList(events, entryId) {
    const list = this.shadowRoot.getElementById('history-list');
    if (!events.length) {
      list.innerHTML = '<div class="history-empty">No call history</div>';
      return;
    }

    const EVENT_LABELS = { incoming_call: 'Missed', answered_elsewhere: 'Answered', terminated: 'Rejected' };
    const EVENT_ICONS = {
      incoming_call: 'mdi:phone-missed',
      answered_elsewhere: 'mdi:phone-in-talk',
      terminated: 'mdi:phone-hangup',
    };

    list.innerHTML = events
      .map((ev, i) => {
        const m = ev.title?.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) — (.+?) \((\w+)\)$/);
        const date = m?.[1] || '';
        const time = m?.[2] || '';
        const module = m?.[3] || ev.moduleName || '';
        const type = m?.[4] || 'incoming_call';
        const label = EVENT_LABELS[type] || type;
        const icon = EVENT_ICONS[type] || 'mdi:phone';
        const thumb = ev._signedThumb || '';
        return `<div class="history-item" data-history-idx="${i}">
        ${thumb ? `<img class="history-thumb" src="${thumb}" alt="" loading="lazy" />` : ''}
        <div class="history-info">
          <div class="history-time">${time} <span style="opacity:0.5;font-size:11px">${date}</span></div>
          <div class="history-module"><ha-icon icon="${icon}" style="--mdc-icon-size:14px;vertical-align:-2px;margin-right:2px"></ha-icon>${this._esc(module)}</div>
        </div>
        <div class="history-badge ${type}">${label}</div>
      </div>`;
      })
      .join('');

    list.querySelectorAll('.history-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.historyIdx, 10);
        this._openHistoryDetail(events[idx], entryId, idx);
      });
    });
  }

  async _openHistoryDetail(event, entryId, idx) {
    const detail = this.shadowRoot.getElementById('history-detail');
    const img = this.shadowRoot.getElementById('history-detail-img');
    const title = this.shadowRoot.getElementById('history-detail-title');
    const bar = this.shadowRoot.getElementById('history-detail-bar');
    if (!detail || !img) return;

    this._detailIdx = idx;
    this._detailEntryId = entryId;

    const m = event.title?.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) — (.+?) \((\w+)\)$/);
    const EVENT_LABELS = { incoming_call: 'Missed', answered_elsewhere: 'Answered', terminated: 'Rejected' };
    const EVENT_ICONS = {
      incoming_call: 'mdi:phone-missed',
      answered_elsewhere: 'mdi:phone-in-talk',
      terminated: 'mdi:phone-hangup',
    };
    const type = m?.[4] || 'incoming_call';
    const label = EVENT_LABELS[type] || type;
    const icon = EVENT_ICONS[type] || 'mdi:phone';
    const module = m?.[3] || '';
    const eventId = event.media_content_id?.split('/').pop();
    const snapshotPath = `/api/bticino_intercom/image/${entryId}/${eventId}/snapshot`;

    try {
      const { path: signed } = await this._hass.callWS({ type: 'auth/sign_path', path: snapshotPath, expires: 300 });
      img.src = signed;
    } catch {
      img.src = event._signedThumb || '';
    }
    img.onerror = () => {
      if (event._signedThumb) img.src = event._signedThumb;
    };
    title.textContent = m ? `${m[2]} ${m[1]}` : 'Detail';
    bar.innerHTML = `
      <div class="detail-info">
        <div style="font-size:13px;font-weight:500;color:var(--bti-text)">${m ? `${m[2]}` : ''} <span style="opacity:0.5;font-size:11px">${m?.[1] || ''}</span></div>
        <div class="detail-module"><ha-icon icon="${icon}" style="--mdc-icon-size:14px"></ha-icon>${this._esc(module)}</div>
      </div>
      <div class="history-badge ${type}">${label}</div>
    `;

    const total = this._historyEvents?.length || 0;
    this.shadowRoot.getElementById('detail-prev').disabled = idx <= 0;
    this.shadowRoot.getElementById('detail-next').disabled = idx >= total - 1;

    detail.classList.add('open');
  }

  _navigateDetail(dir) {
    const events = this._historyEvents;
    if (!events) return;
    const newIdx = this._detailIdx + dir;
    if (newIdx < 0 || newIdx >= events.length) return;
    this._openHistoryDetail(events[newIdx], this._detailEntryId, newIdx);
  }

  _closeHistory() {
    this.shadowRoot?.querySelector('ha-card')?.classList.remove('history-open');
    this.shadowRoot.getElementById('history-overlay')?.classList.remove('open');
    this._closeHistoryDetail();
  }

  _closeHistoryDetail() {
    this.shadowRoot.getElementById('history-detail')?.classList.remove('open');
  }

  // ========== Call event subscription ==========

  _subscribeCallEvents() {
    if (this._callEventUnsub || !this._hass?.connection) return;
    this._callEventUnsub = this._hass.connection.subscribeEvents(
      (event) => this._handleCallEvent(event),
      'bticino_intercom_call',
    );
  }

  _unsubscribeCallEvents() {
    if (this._callEventUnsub) {
      this._callEventUnsub.then((unsub) => unsub());
      this._callEventUnsub = null;
    }
  }

  _handleCallEvent(event) {
    const data = event.data;

    if (data.type === 'ring') {
      const cameras = this._config?.intercoms?.map((ic) => ic.camera) || [];
      if (data.camera_entity_id && !cameras.includes(data.camera_entity_id)) return;
      this._ringSessionId = data.session_id;
      this._showRingOverlay(data);
    } else if (data.type === 'end') {
      if (data.session_id !== this._ringSessionId) return;
      this._ringSessionId = null;
      const wasRinging = this.shadowRoot?.querySelector('ha-card')?.classList.contains('ringing');
      this._clearRingState();
      if (wasRinging) {
        this._showMissedCall();
      }
      if (this._state === STATE.LIVE) {
        this._hangUp();
      }
      this._collapseIfIdle();
    }
  }

  // ========== URL auto-answer ==========

  _checkAutoAnswer() {
    const params = new URLSearchParams(window.location.search);
    const answerCamera = params.get('answer');
    if (!answerCamera || !this._config) return;

    const camIdx = this._config.intercoms.findIndex((ic) => ic.camera === answerCamera);
    if (camIdx < 0) return;

    params.delete('answer');
    const newUrl = params.toString() ? `${window.location.pathname}?${params}` : window.location.pathname;
    history.replaceState(null, '', newUrl);

    if (camIdx !== this._activeIndex) {
      this._switchIntercom(camIdx);
    }
    setTimeout(() => this._startCall(), 500);
  }

  // ========== Ring overlay ==========

  _clearRingState() {
    this._stopRingtone();
    if (this._missedCallTimer) {
      clearTimeout(this._missedCallTimer);
      this._missedCallTimer = null;
    }
    this.shadowRoot?.querySelector('ha-card')?.classList.remove('ringing');
    this.shadowRoot?.getElementById('ring-snapshot')?.remove();
    this._restoreActionBar();
    this._updateTabStates();
    this._ringData = null;
  }

  _playRingtone() {
    this._stopRingtone();
    try {
      this._ringtoneAudio = new Audio('/local/doorbell.wav');
      this._ringtoneAudio.loop = true;
      this._ringtoneAudio.play().catch(() => {});
    } catch {}
  }

  _stopRingtone() {
    if (this._ringtoneAudio) {
      this._ringtoneAudio.pause();
      this._ringtoneAudio.currentTime = 0;
      this._ringtoneAudio = null;
    }
  }

  _answerIncomingCall() {
    this.shadowRoot?.querySelector('ha-card')?.classList.remove('ringing');
    this._stopRingtone();
    this._restoreActionBar();
    this._updateTabStates();
    this._ringData = null;
    // Keep ring-snapshot visible for crossfade — removed when video connects
    this._startCall();
  }

  _rejectIncomingCall() {
    this._clearRingState();
    this._collapseIfIdle();
    const entryId = this._getConfigEntryId();
    if (entryId && this._hass) {
      this._hass.callService('bticino_intercom', 'reject_call', { entry_id: entryId });
    }
  }

  _dismissIncomingCall() {
    this._clearRingState();
    this._collapseIfIdle();
  }

  _showRingOverlay(eventData) {
    const camIdx = this._config.intercoms.findIndex((ic) => ic.camera === eventData.camera_entity_id);
    if (camIdx >= 0 && camIdx !== this._activeIndex) {
      this._activeIndex = camIdx;
    }

    this._ringData = eventData;
    const card = this.shadowRoot?.querySelector('ha-card');
    card?.classList.add('expanded', 'ringing');

    this._updateTabStates();

    const videoArea = this.shadowRoot?.getElementById('video-area');
    if (!videoArea) return;

    videoArea.querySelector('.ring-snapshot')?.remove();

    const snapshotDiv = document.createElement('div');
    snapshotDiv.className = 'ring-snapshot';
    snapshotDiv.id = 'ring-snapshot';

    const imageUrl = eventData.snapshot_url || eventData.vignette_url;
    const moduleName = eventData.module_name || this._activeIntercom.name;

    snapshotDiv.innerHTML = `
      ${imageUrl ? '' : '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#111"><ha-icon icon="mdi:doorbell-video" style="--mdc-icon-size:64px;opacity:0.2"></ha-icon></div>'}
      <div class="ring-gradient"></div>
      <div class="ring-label">
        <div>
          <div class="ring-label-text">${_t('someone_at_door', this._lang)}</div>
          <div class="ring-label-sub">${this._esc(moduleName)}</div>
        </div>
        <div class="ring-badge">● RING</div>
      </div>
    `;

    videoArea.prepend(snapshotDiv);

    if (imageUrl) {
      this._hass
        .callWS({ type: 'auth/sign_path', path: imageUrl, expires: 60 })
        .then(({ path }) => {
          const img = document.createElement('img');
          img.src = path;
          img.alt = '';
          snapshotDiv.insertBefore(img, snapshotDiv.firstChild);
        })
        .catch(() => {});
    }

    this._showRingActions();
    this._playRingtone();
  }

  _showRingActions() {
    const bar = this.shadowRoot?.getElementById('action-bar');
    if (!bar) return;
    this._savedActionBarHTML = bar.innerHTML;
    bar.innerHTML = `
      <button class="action-btn ring-action answer" id="ring-answer">
        <ha-icon icon="mdi:phone"></ha-icon>
        <span class="action-label">${_t('answer', this._lang)}</span>
      </button>
      <button class="action-btn ring-action open-door" id="ring-open">
        <ha-icon icon="mdi:door-open"></ha-icon>
        <span class="action-label">${_t('open', this._lang)}</span>
      </button>
      <button class="action-btn ring-action reject" id="ring-reject">
        <ha-icon icon="mdi:phone-hangup"></ha-icon>
        <span class="action-label">${_t('reject', this._lang)}</span>
      </button>
    `;
    bar.querySelector('#ring-answer')?.addEventListener('click', () => this._answerIncomingCall());
    bar.querySelector('#ring-open')?.addEventListener('click', () => this._openDoorDuringRing());
    bar.querySelector('#ring-reject')?.addEventListener('click', () => this._rejectIncomingCall());
  }

  _restoreActionBar() {
    const bar = this.shadowRoot?.getElementById('action-bar');
    if (!bar || !this._savedActionBarHTML) return;
    bar.innerHTML = this._savedActionBarHTML;
    this._savedActionBarHTML = null;
    bar.querySelectorAll('.action-btn[data-action-idx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._executeAction(parseInt(btn.dataset.actionIdx, 10), btn);
      });
    });
    this._updateActionStates();
  }

  _openDoorDuringRing() {
    const lockAction = this._activeIntercom.actions.find((a) => a.entity?.startsWith('lock.'));
    if (lockAction && this._hass) {
      const [domain, service] = (lockAction.service || 'lock.unlock').split('.');
      this._hass.callService(domain, service, lockAction.service_data || {}, { entity_id: lockAction.entity });
    }
  }

  _showMissedCall() {
    const nameEl = this.shadowRoot?.querySelector('.content-name');
    if (nameEl) {
      const original = nameEl.textContent;
      nameEl.textContent = _t('missed_call', this._lang);
      nameEl.style.color = '#ffa726';
      this._missedCallTimer = setTimeout(() => {
        nameEl.textContent = original;
        nameEl.style.color = '';
        this._missedCallTimer = null;
      }, 5000);
    }
  }

  _collapseIfIdle() {
    if (!this._playing) {
      this.shadowRoot?.querySelector('ha-card')?.classList.remove('expanded');
    }
  }

  // ========== Helpers ==========

  _resolveAction(action) {
    const entity = this._hass?.states[action.entity];
    const entityReg = this._hass?.entities?.[action.entity];
    const domain = action.entity?.split('.')[0];
    const shortName = entityReg?.name || entityReg?.original_name;
    return {
      icon: action.icon || entity?.attributes?.icon || DOMAIN_ICONS[domain] || 'mdi:circle',
      label: action.label || shortName || entity?.attributes?.friendly_name || action.entity,
    };
  }

  _esc(str) {
    if (!str) return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }
}

// ---------------------------------------------------------------------------
// Visual Editor
// ---------------------------------------------------------------------------

const EDITOR_STYLES = `
  :host { display: block; }
  .editor { padding: 0; }
  .section { margin-bottom: 16px; }
  .section-title {
    font-size: 14px; font-weight: 500; margin: 0 0 8px;
    color: var(--primary-text-color);
  }
  .row { display: flex; gap: 8px; margin-bottom: 8px; align-items: flex-end; }
  .row > * { flex: 1; min-width: 0; }
  .intercom-card {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px; padding: 12px; margin-bottom: 8px;
    background: var(--card-background-color, #fff);
  }
  .intercom-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 8px; font-weight: 500; font-size: 13px;
  }
  .action-card {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px; padding: 8px; margin-bottom: 6px;
    background: var(--secondary-background-color, #fafafa);
  }
  .action-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 6px; font-size: 12px; color: var(--secondary-text-color);
  }
  .btn-row { display: flex; gap: 8px; margin-top: 4px; }
  mwc-button, ha-button {
    --mdc-theme-primary: var(--primary-color);
  }
  .remove-btn {
    cursor: pointer; color: var(--error-color, #db4437);
    background: none; border: none; font-size: 12px; padding: 4px 8px;
  }
  .remove-btn:hover { text-decoration: underline; }
  .move-btn {
    cursor: pointer; background: none; border: none; font-size: 14px;
    padding: 2px 6px; color: var(--secondary-text-color); line-height: 1;
  }
  .move-btn:hover { color: var(--primary-text-color); }
  .move-btn:disabled { opacity: 0.2; cursor: default; }
  .action-controls { display: flex; align-items: center; gap: 2px; }
  .add-btn {
    cursor: pointer; color: var(--primary-color);
    background: none; border: none; font-size: 13px; font-weight: 500;
    padding: 6px 0; display: flex; align-items: center; gap: 4px;
  }
  .add-btn:hover { text-decoration: underline; }
  .toggle-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 0;
  }
  .toggle-label { font-size: 14px; }
  .field-group { margin-bottom: 8px; }
  .field-label { display: block; font-size: 12px; color: var(--secondary-text-color); margin-bottom: 4px; }
  .native-select {
    width: 100%; padding: 10px 12px; font-size: 14px;
    border: 1px solid var(--divider-color, #e0e0e0); border-radius: 4px;
    background: var(--card-background-color, #fff); color: var(--primary-text-color);
    appearance: auto; cursor: pointer;
  }
  .actions-toggle {
    display: flex; align-items: center; gap: 4px;
    font-size: 12px; font-weight: 500; margin-top: 8px; margin-bottom: 4px;
    cursor: pointer; user-select: none; background: none; border: none;
    padding: 4px 0; color: var(--primary-text-color);
  }
  .actions-toggle .arrow { transition: transform 0.2s; display: inline-block; font-size: 10px; }
  .actions-toggle .arrow.collapsed { transform: rotate(-90deg); }
  .actions-body.collapsed { display: none; }
`;

class BticinoIntercomCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot?.getElementById('ed-intercoms')) this._setIntercomProperties();
  }

  setConfig(config) {
    this._config = {
      title: config.title || '',
      action_layout: config.action_layout || 'fill',
      auto_mic: config.auto_mic ?? true,
      ignore_ssl_warning: config.ignore_ssl_warning ?? false,
      max_actions: config.max_actions ?? 4,
      intercoms: (config.intercoms || []).map((ic) => ({
        name: ic.name || '',
        camera: ic.camera || '',
        icon: ic.icon || '',
        actions: (ic.actions || []).map((a) => ({
          entity: a.entity || '',
          service: a.service || '',
          icon: a.icon || '',
          label: a.label || '',
          service_data: a.service_data || undefined,
        })),
      })),
    };
    this._render();
  }

  _fire() {
    const cfg = { type: 'custom:bticino-intercom-card', ...this._config };
    if (!cfg.title) delete cfg.title;
    if (cfg.action_layout === 'fill') delete cfg.action_layout;
    if (cfg.auto_mic === true) delete cfg.auto_mic;
    if (cfg.ignore_ssl_warning === false) delete cfg.ignore_ssl_warning;
    if (cfg.max_actions === 4) delete cfg.max_actions;
    cfg.intercoms = cfg.intercoms.map((ic) => {
      const out = {
        name: ic.name,
        camera: ic.camera,
        actions: ic.actions.map((a) => {
          const ao = { entity: a.entity, service: a.service };
          if (a.icon) ao.icon = a.icon;
          if (a.label) ao.label = a.label;
          if (a.service_data) ao.service_data = a.service_data;
          return ao;
        }),
      };
      if (ic.icon) out.icon = ic.icon;
      if (!out.actions.length) delete out.actions;
      return out;
    });
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
  }

  async _ensureEntityPicker() {
    if (customElements.get('ha-entity-picker')) return;
    const helpers = await window.loadCardHelpers?.();
    if (helpers) {
      const card = await helpers.createCardElement({ type: 'entities', entities: [] });
      await card?.constructor?.getConfigElement?.();
      await customElements.whenDefined('ha-entity-picker');
    }
  }

  _render() {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>${EDITOR_STYLES}</style>
      <div class="editor">
        <div class="section">
          <div class="row">
            <ha-textfield label="Title (optional)" id="ed-title"></ha-textfield>
          </div>
          <div class="field-group">
            <label class="field-label" for="ed-layout">Action layout</label>
            <select id="ed-layout" class="native-select">
              <option value="fill">Fill (stretch)</option>
              <option value="compact">Compact (fixed width)</option>
            </select>
          </div>
          <div class="row">
            <ha-textfield label="Max visible actions" type="number" id="ed-max-actions"></ha-textfield>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Auto-activate microphone</span>
            <ha-switch id="ed-auto-mic"></ha-switch>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Ignore SSL warning</span>
            <ha-switch id="ed-ignore-ssl"></ha-switch>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Intercoms</div>
          <div id="ed-intercoms"></div>
          <button class="add-btn" id="ed-add-intercom">+ Add intercom</button>
        </div>
      </div>
    `;
    const $ = (id) => this.shadowRoot.getElementById(id);
    $('ed-title').value = c.title || '';
    $('ed-layout').value = c.action_layout;
    $('ed-max-actions').value = String(c.max_actions);
    $('ed-auto-mic').checked = c.auto_mic;
    $('ed-ignore-ssl').checked = c.ignore_ssl_warning;

    this._renderIntercoms();
    this._bindEditorEvents();
  }

  _renderIntercoms() {
    const container = this.shadowRoot.getElementById('ed-intercoms');
    if (!container) return;
    container.innerHTML = this._config.intercoms
      .map(
        (ic, i) => `
      <div class="intercom-card" data-ic-idx="${i}">
        <div class="intercom-header">
          <span>Intercom ${i + 1}</span>
          <div class="action-controls">
            <button class="move-btn" data-move-ic="${i}-up" ${i === 0 ? 'disabled' : ''} title="Move up">&#9650;</button>
            <button class="move-btn" data-move-ic="${i}-down" ${i === this._config.intercoms.length - 1 ? 'disabled' : ''} title="Move down">&#9660;</button>
            <button class="remove-btn" data-remove-ic="${i}">Remove</button>
          </div>
        </div>
        <div class="row">
          <ha-textfield label="Name" data-ic-field="name" data-ic-idx="${i}"></ha-textfield>
          <ha-icon-picker label="Icon (optional)" data-ic-field="icon" data-ic-idx="${i}"></ha-icon-picker>
        </div>
        <div class="row" id="ed-camera-row-${i}"></div>
        <button class="actions-toggle" data-toggle-actions="${i}">
          <span class="arrow">&#9660;</span> Actions (${ic.actions.length})
        </button>
        <div class="actions-body" id="ed-actions-body-${i}">
          <div id="ed-actions-${i}">
            ${ic.actions.map((a, j) => this._renderActionEditor(i, j, a)).join('')}
          </div>
          <button class="add-btn" data-add-action="${i}">+ Add action</button>
        </div>
      </div>
    `,
      )
      .join('');

    this._setIntercomProperties();
    this._ensureEntityPicker().then(() => this._createEntityPickers());
  }

  _renderActionEditor(icIdx, actIdx, _action) {
    const total = this._config.intercoms[icIdx]?.actions?.length || 0;
    return `
      <div class="action-card" data-ic-idx="${icIdx}" data-act-idx="${actIdx}">
        <div class="action-header">
          <span>Action ${actIdx + 1}</span>
          <div class="action-controls">
            <button class="move-btn" data-move-action="${icIdx}-${actIdx}-up" ${actIdx === 0 ? 'disabled' : ''} title="Move up">&#9650;</button>
            <button class="move-btn" data-move-action="${icIdx}-${actIdx}-down" ${actIdx === total - 1 ? 'disabled' : ''} title="Move down">&#9660;</button>
            <button class="remove-btn" data-remove-action="${icIdx}-${actIdx}">Remove</button>
          </div>
        </div>
        <div class="row" id="ed-action-entity-row-${icIdx}-${actIdx}"></div>
        <div class="row">
          <ha-textfield label="Service (e.g. lock.unlock)" data-act-field="service" data-ic-idx="${icIdx}" data-act-idx="${actIdx}"></ha-textfield>
        </div>
        <div class="row">
          <ha-icon-picker label="Icon (auto from entity)" data-act-field="icon" data-ic-idx="${icIdx}" data-act-idx="${actIdx}"></ha-icon-picker>
          <ha-textfield label="Label (auto from entity)" data-act-field="label" data-ic-idx="${icIdx}" data-act-idx="${actIdx}"></ha-textfield>
        </div>
      </div>
    `;
  }

  _createEntityPickers() {
    this._config.intercoms.forEach((ic, i) => {
      const cameraRow = this.shadowRoot.getElementById(`ed-camera-row-${i}`);
      if (cameraRow) {
        const picker = document.createElement('ha-entity-picker');
        picker.label = 'Camera entity';
        picker.hass = this._hass;
        picker.value = ic.camera || '';
        picker.includeDomains = ['camera'];
        picker.allowCustomEntity = true;
        picker.dataset.icField = 'camera';
        picker.dataset.icIdx = String(i);
        cameraRow.appendChild(picker);
      }
      ic.actions.forEach((a, j) => {
        const actionRow = this.shadowRoot.getElementById(`ed-action-entity-row-${i}-${j}`);
        if (actionRow) {
          const picker = document.createElement('ha-entity-picker');
          picker.label = 'Entity';
          picker.hass = this._hass;
          picker.value = a.entity || '';
          picker.allowCustomEntity = true;
          picker.dataset.actField = 'entity';
          picker.dataset.icIdx = String(i);
          picker.dataset.actIdx = String(j);
          actionRow.appendChild(picker);
        }
      });
    });
  }

  _setIntercomProperties() {
    this._config.intercoms.forEach((ic, i) => {
      // Intercom fields
      this.shadowRoot.querySelectorAll(`[data-ic-field][data-ic-idx="${i}"]`).forEach((el) => {
        const field = el.dataset.icField;
        if (el.tagName === 'HA-ENTITY-PICKER') {
          el.hass = this._hass;
          el.value = ic[field] || '';
          if (field === 'camera') el.includeDomains = ['camera'];
        } else {
          el.value = ic[field] || '';
        }
      });
      // Action fields
      ic.actions.forEach((a, j) => {
        this.shadowRoot.querySelectorAll(`[data-act-field][data-ic-idx="${i}"][data-act-idx="${j}"]`).forEach((el) => {
          const field = el.dataset.actField;
          if (el.tagName === 'HA-ENTITY-PICKER') {
            el.hass = this._hass;
          }
          el.value = a[field] || '';
        });
      });
    });
  }

  _bindEditorEvents() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    // Global fields
    $('ed-title')?.addEventListener('change', (e) => {
      this._config.title = e.target.value;
      this._fire();
    });
    $('ed-layout')?.addEventListener('change', (e) => {
      this._config.action_layout = e.target.value;
      this._fire();
    });
    $('ed-max-actions')?.addEventListener('change', (e) => {
      this._config.max_actions = parseInt(e.target.value, 10) || 4;
      this._fire();
    });
    $('ed-auto-mic')?.addEventListener('change', (e) => {
      this._config.auto_mic = e.target.checked;
      this._fire();
    });
    $('ed-ignore-ssl')?.addEventListener('change', (e) => {
      this._config.ignore_ssl_warning = e.target.checked;
      this._fire();
    });

    // Add intercom
    $('ed-add-intercom')?.addEventListener('click', () => {
      this._config.intercoms.push({ name: '', camera: '', icon: '', actions: [] });
      this._renderIntercoms();
      this._bindIntercomEvents();
    });

    this._bindIntercomEvents();
  }

  _bindIntercomEvents() {
    // Toggle actions collapse
    this.shadowRoot.querySelectorAll('[data-toggle-actions]').forEach((btn) => {
      btn.onclick = () => {
        const idx = btn.dataset.toggleActions;
        const body = this.shadowRoot.getElementById(`ed-actions-body-${idx}`);
        const arrow = btn.querySelector('.arrow');
        body?.classList.toggle('collapsed');
        arrow?.classList.toggle('collapsed');
      };
    });

    // Move intercom
    this.shadowRoot.querySelectorAll('[data-move-ic]').forEach((btn) => {
      btn.onclick = () => {
        const [idx, dir] = btn.dataset.moveIc.split('-');
        const from = parseInt(idx, 10);
        const to = dir === 'up' ? from - 1 : from + 1;
        const ics = this._config.intercoms;
        [ics[from], ics[to]] = [ics[to], ics[from]];
        this._renderIntercoms();
        this._bindIntercomEvents();
        this._fire();
      };
    });

    // Remove intercom
    this.shadowRoot.querySelectorAll('[data-remove-ic]').forEach((btn) => {
      btn.onclick = () => {
        this._config.intercoms.splice(parseInt(btn.dataset.removeIc, 10), 1);
        this._renderIntercoms();
        this._bindIntercomEvents();
        this._fire();
      };
    });

    // Intercom fields
    this.shadowRoot.querySelectorAll('[data-ic-field]').forEach((el) => {
      const handler = (e) => {
        const idx = parseInt(el.dataset.icIdx, 10);
        const field = el.dataset.icField;
        this._config.intercoms[idx][field] = e.detail?.value ?? e.target.value ?? '';
        this._fire();
      };
      el.addEventListener('change', handler);
      el.addEventListener('value-changed', handler);
    });

    // Add action
    this.shadowRoot.querySelectorAll('[data-add-action]').forEach((btn) => {
      btn.onclick = () => {
        const icIdx = parseInt(btn.dataset.addAction, 10);
        this._config.intercoms[icIdx].actions.push({ entity: '', service: '', icon: '', label: '' });
        this._renderIntercoms();
        this._bindIntercomEvents();
      };
    });

    // Move action
    this.shadowRoot.querySelectorAll('[data-move-action]').forEach((btn) => {
      btn.onclick = () => {
        const [icIdx, actIdx, dir] = btn.dataset.moveAction.split('-');
        const ic = parseInt(icIdx, 10);
        const from = parseInt(actIdx, 10);
        const to = dir === 'up' ? from - 1 : from + 1;
        const actions = this._config.intercoms[ic].actions;
        [actions[from], actions[to]] = [actions[to], actions[from]];
        this._renderIntercoms();
        this._bindIntercomEvents();
        this._fire();
      };
    });

    // Remove action
    this.shadowRoot.querySelectorAll('[data-remove-action]').forEach((btn) => {
      btn.onclick = () => {
        const [icIdx, actIdx] = btn.dataset.removeAction.split('-').map(Number);
        this._config.intercoms[icIdx].actions.splice(actIdx, 1);
        this._renderIntercoms();
        this._bindIntercomEvents();
        this._fire();
      };
    });

    // Action fields
    this.shadowRoot.querySelectorAll('[data-act-field]').forEach((el) => {
      const handler = (e) => {
        const icIdx = parseInt(el.dataset.icIdx, 10);
        const actIdx = parseInt(el.dataset.actIdx, 10);
        const field = el.dataset.actField;
        this._config.intercoms[icIdx].actions[actIdx][field] = e.detail?.value ?? e.target.value ?? '';
        this._fire();
      };
      el.addEventListener('change', handler);
      el.addEventListener('value-changed', handler);
    });
  }
}

customElements.define('bticino-intercom-card-editor', BticinoIntercomCardEditor);

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

customElements.define('bticino-intercom-card', BticinoIntercomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'bticino-intercom-card',
  name: 'BTicino Intercom',
  description: 'Multi-intercom card with live video and two-way audio for BTicino intercoms (Chrome/Chromium only)',
  preview: true,
});

console.info(
  `%c 📹 BTICINO-INTERCOM-CARD %c v${CARD_VERSION} `,
  'background: #03a9f4; color: white; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #444; color: white; padding: 2px 6px; border-radius: 0 4px 4px 0;',
);
