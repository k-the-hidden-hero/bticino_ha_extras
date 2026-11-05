/**
 * BTicino Classe 100X/300X card for Home Assistant.
 *
 * Four layouts, same data:
 *   layout: panel   - a native tile card with the intercom drawn beside it (default)
 *   layout: device  - the drawing leads, its own keys are the controls
 *   layout: compact - the tile and its buttons, no drawing
 *   layout: kiosk   - fills its container (a panel view on a wall tablet, a phone, a
 *                     View Assist screen): the picture as large as it gets, big
 *                     controls beside it in landscape and under it in portrait.
 *                     ?camera=<camera entity> in the address picks the unit to show.
 *
 * With more than one external unit, the card answers the one that rang and
 * offers a unit picker while idle.
 *
 * Every colour comes from a Home Assistant theme token, so the card follows
 * light, dark and custom themes without a single hard-coded value.
 */

const CARD_TYPE = 'bticino-100x-card';
const EDITOR_TYPE = 'bticino-100x-card-editor';
const VERSION = '1.0.0';
const DOMAIN = 'bticino_intercom';

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    idle: 'Idle',
    ringing: 'Incoming call',
    talking: 'Call in progress',
    unavailable: 'Unavailable',
    open_door: 'Open',
    light: 'Stair light',
    reject: 'Reject',
    live: 'Live',
    answer: 'Answer',
    opening: 'Opening',
    door_open: 'Open',
    last_call: 'Last call',
    calls: 'Calls',
    answered: 'answered',
    missed: 'missed',
    never: 'No calls yet',
    recent: 'Recent calls',
    no_device: 'Pick a BTicino intercom in the card settings.',
    no_entities: 'No BTicino entities found for this device.',
    standby: 'Standby',
    close: 'Close',
    call_answered: 'Answered',
    call_missed: 'Missed',
    call_open: 'Call',
    call_home: 'Call home',
    show_all: 'Show all',
    live_now: 'Live',
    audio_only: 'Audio only',
    hang_up: 'Hang up',
    connecting: 'Connecting',
    reconnecting: 'Reconnecting',
    call_failed: 'Call failed',
    mic_on: 'Microphone on',
    mic_off: 'Microphone off',
    sound_on: 'Sound on',
    sound_off: 'Sound off',
    browser_warning: 'Chrome or another Chromium browser is needed for audio and video.',
    mic_denied: 'Microphone blocked',
    mic_insecure: 'The microphone needs HTTPS',
    mic_missing: 'No microphone found',
    unit: 'External unit',
  },
  it: {
    idle: 'A riposo',
    ringing: 'Chiamata in arrivo',
    talking: 'Conversazione in corso',
    unavailable: 'Non disponibile',
    open_door: 'Apri',
    light: 'Luce scale',
    reject: 'Rifiuta',
    live: 'Guarda',
    answer: 'Rispondi',
    opening: 'Apertura',
    door_open: 'Aperta',
    last_call: 'Ultima chiamata',
    calls: 'Chiamate',
    answered: 'risposte',
    missed: 'perse',
    never: 'Nessuna chiamata',
    recent: 'Chiamate recenti',
    no_device: 'Scegli un citofono BTicino nelle impostazioni della card.',
    no_entities: 'Nessuna entità BTicino trovata per questo dispositivo.',
    standby: 'A riposo',
    close: 'Chiudi',
    call_answered: 'Risposta',
    call_missed: 'Persa',
    call_open: 'Chiamata',
    call_home: 'Chiama casa',
    show_all: 'Visualizza tutte',
    live_now: 'In diretta',
    audio_only: 'Solo audio',
    hang_up: 'Riaggancia',
    connecting: 'Connessione in corso',
    reconnecting: 'Riconnessione',
    call_failed: 'Chiamata non riuscita',
    mic_on: 'Microfono acceso',
    mic_off: 'Microfono spento',
    sound_on: 'Audio acceso',
    sound_off: 'Audio spento',
    browser_warning: 'Per audio e video serve Chrome o un browser Chromium.',
    mic_denied: 'Microfono bloccato',
    mic_insecure: 'Il microfono richiede HTTPS',
    mic_missing: 'Nessun microfono trovato',
    unit: 'Posto esterno',
  },
  fr: {
    idle: 'Au repos',
    ringing: 'Appel entrant',
    talking: 'Communication en cours',
    unavailable: 'Indisponible',
    open_door: 'Ouvrir',
    light: 'Lumière escalier',
    reject: 'Refuser',
    live: 'Direct',
    answer: 'Répondre',
    opening: 'Ouverture',
    door_open: 'Ouverte',
    last_call: 'Dernier appel',
    calls: 'Appels',
    answered: 'répondus',
    missed: 'manqués',
    never: 'Aucun appel',
    recent: 'Appels récents',
    no_device: 'Choisissez un interphone BTicino dans les réglages de la carte.',
    no_entities: 'Aucune entité BTicino pour cet appareil.',
    standby: 'Veille',
    close: 'Fermer',
    call_answered: 'Répondu',
    call_missed: 'Manqué',
    call_open: 'Appel',
    call_home: 'Appeler la maison',
    show_all: 'Voir tout',
    live_now: 'En direct',
    audio_only: 'Audio seul',
    hang_up: 'Raccrocher',
    connecting: 'Connexion en cours',
    reconnecting: 'Reconnexion',
    call_failed: 'Appel échoué',
    mic_on: 'Micro actif',
    mic_off: 'Micro coupé',
    sound_on: 'Son actif',
    sound_off: 'Son coupé',
    browser_warning: "Chrome ou un navigateur Chromium est nécessaire pour l'audio et la vidéo.",
    mic_denied: 'Micro bloqué',
    mic_insecure: 'Le micro nécessite HTTPS',
    mic_missing: 'Aucun micro trouvé',
    unit: 'Platine de rue',
  },
  de: {
    idle: 'Bereit',
    ringing: 'Eingehender Anruf',
    talking: 'Gespräch läuft',
    unavailable: 'Nicht verfügbar',
    open_door: 'Öffnen',
    light: 'Treppenlicht',
    reject: 'Ablehnen',
    live: 'Live',
    answer: 'Annehmen',
    opening: 'Öffnet',
    door_open: 'Offen',
    last_call: 'Letzter Anruf',
    calls: 'Anrufe',
    answered: 'angenommen',
    missed: 'verpasst',
    never: 'Noch keine Anrufe',
    recent: 'Letzte Anrufe',
    no_device: 'Wähle in den Karteneinstellungen eine BTicino-Sprechanlage.',
    no_entities: 'Keine BTicino-Entitäten für dieses Gerät.',
    standby: 'Standby',
    close: 'Schließen',
    call_answered: 'Angenommen',
    call_missed: 'Verpasst',
    call_open: 'Anruf',
    call_home: 'Haus anrufen',
    show_all: 'Alle anzeigen',
    live_now: 'Live',
    audio_only: 'Nur Ton',
    hang_up: 'Auflegen',
    connecting: 'Verbindung wird aufgebaut',
    reconnecting: 'Neu verbinden',
    call_failed: 'Anruf fehlgeschlagen',
    mic_on: 'Mikrofon an',
    mic_off: 'Mikrofon aus',
    sound_on: 'Ton an',
    sound_off: 'Ton aus',
    browser_warning: 'Für Ton und Bild wird Chrome oder ein Chromium-Browser benötigt.',
    mic_denied: 'Mikrofon blockiert',
    mic_insecure: 'Das Mikrofon erfordert HTTPS',
    mic_missing: 'Kein Mikrofon gefunden',
    unit: 'Außenstation',
  },
  es: {
    idle: 'En reposo',
    ringing: 'Llamada entrante',
    talking: 'Llamada en curso',
    unavailable: 'No disponible',
    open_door: 'Abrir',
    light: 'Luz escalera',
    reject: 'Rechazar',
    live: 'En vivo',
    answer: 'Responder',
    opening: 'Abriendo',
    door_open: 'Abierta',
    last_call: 'Última llamada',
    calls: 'Llamadas',
    answered: 'contestadas',
    missed: 'perdidas',
    never: 'Sin llamadas',
    recent: 'Llamadas recientes',
    no_device: 'Elige un videoportero BTicino en los ajustes de la tarjeta.',
    no_entities: 'No hay entidades BTicino para este dispositivo.',
    standby: 'Reposo',
    close: 'Cerrar',
    call_answered: 'Contestada',
    call_missed: 'Perdida',
    call_open: 'Llamada',
    call_home: 'Llamar a casa',
    show_all: 'Ver todas',
    live_now: 'En directo',
    audio_only: 'Solo audio',
    hang_up: 'Colgar',
    connecting: 'Conectando',
    reconnecting: 'Reconectando',
    call_failed: 'Llamada fallida',
    mic_on: 'Micrófono activado',
    mic_off: 'Micrófono apagado',
    sound_on: 'Sonido activado',
    sound_off: 'Sonido apagado',
    browser_warning: 'Para audio y vídeo hace falta Chrome u otro navegador Chromium.',
    mic_denied: 'Micrófono bloqueado',
    mic_insecure: 'El micrófono requiere HTTPS',
    mic_missing: 'No se encontró ningún micrófono',
    unit: 'Placa exterior',
  },
};

const EDITOR_LABELS = {
  en: {
    device_id: 'Intercom',
    name: 'Name',
    icon: 'Icon',
    color: 'Colour',
    layout: 'Layout',

    show_badges: 'Show badges',
    show_controls: 'Show buttons',
    show_history: 'Show recent calls',
    auto_answer: 'Answer from notification links',
    appearance: 'Appearance',
    entities: 'Entities',
    camera_entity: 'Live camera',
    snapshot_entity: 'Snapshot camera',
    lock_entity: 'Door lock',
    light_entity: 'Stair light',
    layout_panel: 'Panel - a small drawing above the card',
    layout_device: 'Device - the drawing is the card',
    layout_compact: 'Compact - no drawing',
    layout_kiosk: 'Kiosk - fills the screen, for wall tablets',
    device_size: 'Drawing size',
  },
  it: {
    device_id: 'Citofono',
    name: 'Nome',
    icon: 'Icona',
    color: 'Colore',
    layout: 'Disposizione',

    show_badges: 'Mostra i badge',
    show_controls: 'Mostra i pulsanti',
    show_history: 'Mostra le chiamate recenti',
    auto_answer: 'Rispondi dai link delle notifiche',
    appearance: 'Aspetto',
    entities: 'Entità',
    camera_entity: 'Telecamera live',
    snapshot_entity: 'Telecamera istantanee',
    lock_entity: 'Serratura',
    light_entity: 'Luce scale',
    layout_panel: 'Pannello - disegno piccolo sopra la card',
    layout_device: 'Dispositivo - il disegno è la card',
    layout_compact: 'Compatta - senza disegno',
    layout_kiosk: 'Kiosk - a tutto schermo, per tablet a parete',
    device_size: 'Dimensione del citofono',
  },
  de: {
    device_id: 'Sprechanlage',
    name: 'Name',
    icon: 'Symbol',
    color: 'Farbe',
    layout: 'Layout',

    show_badges: 'Badges anzeigen',
    show_controls: 'Tasten anzeigen',
    show_history: 'Letzte Anrufe anzeigen',
    auto_answer: 'Über Links aus Benachrichtigungen annehmen',
    appearance: 'Darstellung',
    entities: 'Entitäten',
    camera_entity: 'Live-Kamera',
    snapshot_entity: 'Schnappschuss-Kamera',
    lock_entity: 'Türschloss',
    light_entity: 'Treppenlicht',
    layout_panel: 'Panel - eine kleine Zeichnung über der Karte',
    layout_device: 'Gerät - die Zeichnung ist die Karte',
    layout_compact: 'Kompakt - ohne Zeichnung',
    layout_kiosk: 'Kiosk - füllt den Bildschirm, für Wandtablets',
    device_size: 'Größe der Zeichnung',
  },
  fr: {
    device_id: 'Interphone',
    name: 'Nom',
    icon: 'Icône',
    color: 'Couleur',
    layout: 'Disposition',

    show_badges: 'Afficher les badges',
    show_controls: 'Afficher les boutons',
    show_history: 'Afficher les appels récents',
    auto_answer: 'Répondre depuis les liens des notifications',
    appearance: 'Apparence',
    entities: 'Entités',
    camera_entity: 'Caméra en direct',
    snapshot_entity: 'Caméra des instantanés',
    lock_entity: 'Serrure',
    light_entity: 'Lumière escalier',
    layout_panel: 'Panneau - un petit dessin au-dessus de la carte',
    layout_device: 'Appareil - le dessin est la carte',
    layout_compact: 'Compacte - sans dessin',
    layout_kiosk: 'Kiosque - plein écran, pour tablettes murales',
    device_size: 'Taille du dessin',
  },
};

const lang = (hass) => (hass && (hass.locale?.language || hass.language)) || 'en';
const t = (hass, key) => {
  const l = lang(hass).split('-')[0];
  return (STRINGS[l] && STRINGS[l][key]) || STRINGS.en[key] || key;
};
const te = (hass, key) => {
  const l = lang(hass).split('-')[0];
  return (EDITOR_LABELS[l] && EDITOR_LABELS[l][key]) || EDITOR_LABELS.en[key] || key;
};

/* ------------------------------------------------------------------ helpers */

const HA_COLORS = new Set([
  'primary',
  'accent',
  'red',
  'pink',
  'purple',
  'deep-purple',
  'indigo',
  'blue',
  'light-blue',
  'cyan',
  'teal',
  'green',
  'light-green',
  'lime',
  'yellow',
  'amber',
  'orange',
  'deep-orange',
  'brown',
  'light-grey',
  'grey',
  'dark-grey',
  'blue-grey',
  'black',
  'white',
  'disabled',
]);
const colorVar = (color) => (HA_COLORS.has(color) ? `var(--${color}-color)` : color);

const UNKNOWN = new Set(['unavailable', 'unknown', '', undefined, null]);
const hasValue = (stateObj) => !!stateObj && !UNKNOWN.has(stateObj.state);

function numberLocale(hass) {
  switch (hass.locale?.number_format) {
    case 'comma_decimal':
      return 'en-US';
    case 'decimal_comma':
      return 'de';
    case 'space_comma':
      return 'fr';
    case 'quote_decimal':
      return 'de-CH';
    case 'system':
      return undefined;
    default:
      return lang(hass);
  }
}

function timeZone(hass) {
  const tz = hass.locale?.time_zone;
  if (tz === 'server') return hass.config?.time_zone;
  return undefined;
}

function hour12(hass) {
  const f = hass.locale?.time_format;
  if (f === '12') return true;
  if (f === '24') return false;
  return undefined;
}

function formatTime(hass, date) {
  try {
    return new Intl.DateTimeFormat(lang(hass), {
      hour: 'numeric',
      minute: '2-digit',
      hour12: hour12(hass),
      timeZone: timeZone(hass),
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

function formatDateTime(hass, date) {
  try {
    return new Intl.DateTimeFormat(lang(hass), {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: hour12(hass),
      timeZone: timeZone(hass),
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

const REL_UNITS = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Infinity],
];

function relativeTime(hass, date) {
  let delta = (date.getTime() - Date.now()) / 1000;
  let unit = 'second';
  for (const [name, span] of REL_UNITS) {
    unit = name;
    if (Math.abs(delta) < span) break;
    delta /= span;
  }
  try {
    return new Intl.RelativeTimeFormat(lang(hass), { numeric: 'auto' }).format(Math.round(delta), unit);
  } catch {
    return formatDateTime(hass, date);
  }
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fireEvent(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

/** Undo a subscribeEvents, which may already be gone with its connection. */
function stopSubscription(unsub) {
  if (typeof unsub !== 'function') return;
  try {
    Promise.resolve(unsub()).catch(() => {});
  } catch {
    /* the connection closed first */
  }
}

/* ----------------------------------------------------------- the call ---- */

const CALL_STATE = {
  CONNECTING: 'connecting',
  LIVE: 'live',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
  CLOSED: 'closed',
};

const SIGNALING_TIMEOUT = 15000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECTS = 3;

/** Chromium is the only engine the device's firmware negotiates correctly. */
const isChromium = () => {
  const ua = navigator.userAgent;
  if (/Firefox|FxiOS/i.test(ua)) return false;
  if (/Edg\/|Chrome\/|CriOS/i.test(ua) && !/OPR\//i.test(ua)) return true;
  return !/Safari/i.test(ua);
};

/** Why the microphone is not live, in a word the card can translate. */
const MIC_ERROR = { DENIED: 'denied', INSECURE: 'insecure', MISSING: 'missing' };
const micErrorOf = (err) =>
  err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError' ? MIC_ERROR.MISSING : MIC_ERROR.DENIED;
const micUsable = () => !!(window.isSecureContext && navigator.mediaDevices?.getUserMedia);

/**
 * One WebRTC call with the intercom.
 *
 * The shape of this exchange is taken from bticino_ha_extras, the only client
 * known to work with the BNC1 firmware, and the three things that look odd are
 * the three that matter:
 *
 *  - the audio transceiver always sends real RTP, silence when the microphone
 *    is off, because the device opens its own microphone only once packets
 *    actually arrive - an SDP direction of sendrecv is not enough;
 *  - video is offered only to units that have a camera, so a Call Home to the
 *    indoor monitor negotiates audio alone instead of collecting a rejected
 *    m-section;
 *  - signalling runs over its own WebSocket, because camera/webrtc/offer
 *    answers with a stream of events (session, answer, candidate) rather than
 *    a single result.
 */
class BticinoCallSession {
  constructor(hass, { entityId, wantsVideo, onState }) {
    this.hass = hass;
    this.entityId = entityId;
    this.wantsVideo = !!wantsVideo;
    this.onState = onState || (() => {});
    this.stream = new MediaStream();
    this.state = CALL_STATE.CONNECTING;
    this.micActive = false;
    /** null, or one of MIC_ERROR: the call goes on with silence either way. */
    this.micError = null;
    this.error = null;
    this._wanted = true;
    this._reconnects = 0;
    this._candidateId = 100;
    this._pendingCandidates = [];
  }

  _set(state, error = null) {
    this.state = state;
    this.error = error;
    this.onState(this);
  }

  async start() {
    this._audioCtx = new AudioContext();
    // Asking once up front means the first words are not lost to a prompt.
    if (micUsable()) {
      try {
        this._micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micError = null;
      } catch (err) {
        this._micStream = null;
        this.micError = micErrorOf(err);
      }
    } else {
      this.micError = MIC_ERROR.INSECURE;
    }
    await this._connect();
  }

  async _connect() {
    this._set(this._reconnects ? CALL_STATE.RECONNECTING : CALL_STATE.CONNECTING);
    const keepMic = this._micStream;
    this._micStream = null;
    this._closeConnection();
    this._micStream = keepMic;

    try {
      if (this._audioCtx?.state === 'suspended') await this._audioCtx.resume();
      const oscillator = this._audioCtx.createOscillator();
      oscillator.frequency.value = 0;
      const destination = this._audioCtx.createMediaStreamDestination();
      oscillator.connect(destination);
      oscillator.start();
      this._oscillator = oscillator;
      this._silenceStream = destination.stream;
      this._silenceTrack = this._silenceStream.getAudioTracks()[0];

      this._pc = new RTCPeerConnection({
        iceServers: await this._iceServers(),
        rtcpMuxPolicy: 'require',
      });

      const micTrack = this._micStream?.getAudioTracks()?.[0];
      this._pc.addTransceiver(micTrack || this._silenceTrack, {
        direction: 'sendrecv',
        streams: [this._silenceStream],
      });
      if (this.wantsVideo) this._pc.addTransceiver('video', { direction: 'recvonly' });
      if (micTrack) {
        this._micSender = this._pc.getSenders().find((sender) => sender.track?.kind === 'audio');
        this.micActive = true;
      }

      this.stream = new MediaStream();
      this._pc.ontrack = (event) => {
        this.stream.addTrack(event.track);
        this.onState(this);
      };
      this._pc.onconnectionstatechange = () => {
        const state = this._pc?.connectionState;
        if (state === 'connected') {
          this._reconnects = 0;
          this._set(CALL_STATE.LIVE);
        } else if (this._wanted && ['disconnected', 'failed', 'closed'].includes(state)) {
          this._scheduleReconnect();
        }
      };
      this._pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        const candidate = {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid,
        };
        if (this._ws?.readyState === WebSocket.OPEN && this._sessionId) this._sendCandidate(candidate);
        else this._pendingCandidates.push(candidate);
      };

      const offer = await this._pc.createOffer();
      await this._pc.setLocalDescription(offer);
      await this._signal(this._pc.localDescription.sdp);
    } catch (err) {
      if (this._wanted) this._set(CALL_STATE.ERROR, err?.message || String(err));
    }
  }

  async _iceServers() {
    const fallback = [{ urls: 'stun:stun.l.google.com:19302' }];
    try {
      const config = await this.hass.callWS({
        type: 'camera/webrtc/get_client_config',
        entity_id: this.entityId,
      });
      const servers = config?.configuration?.iceServers;
      if (!servers?.length) return fallback;
      // TCP relays and turns: never complete with this device
      const usable = servers
        .map((server) => {
          const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(
            (url) => !url.includes('transport=tcp') && !url.startsWith('turns:'),
          );
          return urls.length ? { ...server, urls } : null;
        })
        .filter(Boolean);
      return usable.length ? usable : fallback;
    } catch {
      return fallback;
    }
  }

  _signal(offerSdp) {
    return new Promise((resolve, reject) => {
      const token = this.hass.auth?.data?.access_token || this.hass.connection?.options?.auth?.data?.access_token;
      if (!token) {
        reject(new Error('no access token'));
        return;
      }
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${location.host}/api/websocket`);
      this._ws = socket;
      let settled = false;
      const finish = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(this._signalTimer);
        this._signalTimer = null;
        if (err) reject(err);
        else resolve();
      };

      this._signalTimer = setTimeout(() => finish(new Error('signaling timeout')), SIGNALING_TIMEOUT);
      socket.onerror = () => finish(new Error('signaling socket error'));
      socket.onclose = () => finish(new Error('signaling socket closed'));
      socket.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'auth_required') {
          socket.send(JSON.stringify({ type: 'auth', access_token: token }));
          return;
        }
        if (message.type === 'auth_ok') {
          socket.send(
            JSON.stringify({ id: 1, type: 'camera/webrtc/offer', entity_id: this.entityId, offer: offerSdp }),
          );
          return;
        }
        if (message.type === 'auth_invalid') {
          finish(new Error('authentication failed'));
          return;
        }
        if (message.type === 'result' && !message.success) {
          finish(new Error(message.error?.message || 'offer rejected'));
          return;
        }
        if (message.type !== 'event') return;

        const event_ = message.event;
        if (event_.type === 'session') {
          this._sessionId = event_.session_id;
          for (const candidate of this._pendingCandidates) this._sendCandidate(candidate);
          this._pendingCandidates = [];
        } else if (event_.type === 'answer') {
          try {
            await this._pc.setRemoteDescription({ type: 'answer', sdp: event_.answer });
            finish();
          } catch (err) {
            finish(err);
          }
        } else if (event_.type === 'candidate' && event_.candidate) {
          try {
            await this._pc.addIceCandidate({
              candidate: event_.candidate.candidate,
              sdpMLineIndex: event_.candidate.sdp_m_line_index ?? event_.candidate.sdpMLineIndex ?? 0,
            });
          } catch {
            /* a candidate we cannot use is not fatal */
          }
        } else if (event_.type === 'error') {
          finish(new Error(event_.message || 'signaling error'));
        }
      };
    });
  }

  _sendCandidate(candidate) {
    this._candidateId += 1;
    this._ws.send(
      JSON.stringify({
        id: this._candidateId,
        type: 'camera/webrtc/candidate',
        entity_id: this.entityId,
        session_id: this._sessionId,
        candidate,
      }),
    );
  }

  _scheduleReconnect() {
    if (!this._wanted || this._reconnectTimer) return;
    this._reconnects += 1;
    if (this._reconnects > MAX_RECONNECTS) {
      this._set(CALL_STATE.ERROR, 'connection lost');
      return;
    }
    this._set(CALL_STATE.RECONNECTING);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._wanted) this._connect();
    }, RECONNECT_DELAY);
  }

  /** Swap the silence the device needs for the real microphone, and back. */
  async setMic(on) {
    if (on === this.micActive) return;
    if (on) {
      if (!micUsable()) {
        this.micError = MIC_ERROR.INSECURE;
        this.onState(this);
        return;
      }
      try {
        if (this._audioCtx?.state === 'suspended') await this._audioCtx.resume();
        this._micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = this._micStream.getAudioTracks()[0];
        const sender = this._pc?.getSenders()?.find((item) => item.track?.kind === 'audio');
        if (sender) {
          await sender.replaceTrack(track);
          this._micSender = sender;
        }
        this.micActive = true;
        this.micError = null;
      } catch (err) {
        // the call carries on with silence, and the card says why
        this.micActive = false;
        this.micError = micErrorOf(err);
      }
    } else {
      if (this._micSender && this._silenceTrack) await this._micSender.replaceTrack(this._silenceTrack);
      this._stopMicStream();
      this.micActive = false;
    }
    this.onState(this);
  }

  _stopMicStream() {
    if (!this._micStream) return;
    for (const track of this._micStream.getTracks()) track.stop();
    this._micStream = null;
  }

  _closeConnection() {
    this._stopMicStream();
    if (this._signalTimer) {
      clearTimeout(this._signalTimer);
      this._signalTimer = null;
    }
    if (this._pc) {
      this._pc.ontrack = null;
      this._pc.onconnectionstatechange = null;
      this._pc.onicecandidate = null;
      try {
        this._pc.close();
      } catch {
        /* already gone */
      }
      this._pc = null;
    }
    if (this._ws) {
      this._ws.onmessage = null;
      this._ws.onerror = null;
      this._ws.onclose = null;
      try {
        this._ws.close();
      } catch {
        /* already gone */
      }
      this._ws = null;
    }
    if (this._oscillator) {
      try {
        this._oscillator.stop();
      } catch {
        /* already stopped */
      }
      this._oscillator = null;
    }
    this._micSender = null;
    this._silenceTrack = null;
    this._silenceStream = null;
    this._sessionId = null;
    this._pendingCandidates = [];
  }

  stop() {
    this._wanted = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._closeConnection();
    if (this._audioCtx) {
      try {
        this._audioCtx.close();
      } catch {
        /* already closed */
      }
      this._audioCtx = null;
    }
    this.micActive = false;
    this._set(CALL_STATE.CLOSED);
  }
}

/* --------------------------------------------------------------- resolution */

const ENTITY_CATEGORIES = { 1: 'config', 2: 'diagnostic' };
const categoryOf = (entry) => ENTITY_CATEGORIES[entry.entity_category] || entry.entity_category || null;

/**
 * The integration names its entities instead of using translation keys, so
 * entities are recognised by domain, device class and the attributes each one
 * is the only to carry. Renaming an entity in the UI keeps the card working.
 */
function resolveEntities(hass, deviceId) {
  const found = {
    locks: [],
    lights: [],
    doorbells: [],
    doorbellEvents: [],
    liveCameras: [],
    busy: null,
    event: null,
    callHome: null,
    snapshot: null,
    lastCall: null,
    lastEvent: null,
    calls: null,
    wifi: null,
    websocket: null,
    all: [],
  };

  // the modules that have a doorbell, hidden ones included: those are the external units
  const doorbellModules = new Set();

  for (const entry of Object.values(hass.entities || {})) {
    if (entry.platform !== DOMAIN) continue;
    if (deviceId && entry.device_id !== deviceId) continue;
    const id = entry.entity_id;
    const stateObj = hass.states[id];
    if (!stateObj) continue;
    if (stateObj.attributes.restored) continue;
    if (isDoorbell(id, stateObj) && stateObj.attributes.module_id) doorbellModules.add(stateObj.attributes.module_id);
    if (entry.hidden) continue;
    found.all.push(id);

    const domain = id.split('.')[0];
    const attrs = stateObj.attributes;
    const deviceClass = attrs.device_class;
    const diagnostic = categoryOf(entry) === 'diagnostic';

    switch (domain) {
      case 'lock':
        found.locks.push(id);
        break;
      case 'light':
        found.lights.push(id);
        break;
      case 'event':
        found.event = found.event || id;
        if (isDoorbell(id, stateObj)) found.doorbellEvents.push(id);
        break;
      case 'binary_sensor':
        if (deviceClass === 'sound') found.doorbells.push(id);
        else if (deviceClass === 'occupancy') found.busy = found.busy || id;
        break;
      case 'camera': {
        const streams = (attrs.supported_features || 0) & 2;
        if (!streams) found.snapshot = found.snapshot || id;
        else if (attrs.icon === 'mdi:phone-classic') found.callHome = found.callHome || id;
        else found.liveCameras.push(id);
        break;
      }
      case 'sensor':
        if (attrs.answered !== undefined && attrs.missed !== undefined) found.calls = found.calls || id;
        else if (deviceClass === 'signal_strength') found.wifi = found.wifi || id;
        else if (deviceClass === 'enum') found.websocket = found.websocket || id;
        else if (deviceClass === 'timestamp' && !diagnostic) found.lastCall = found.lastCall || id;
        else if (!deviceClass && !diagnostic) found.lastEvent = found.lastEvent || id;
        break;
      default:
        break;
    }
  }

  // Since the integration names the module behind each camera, a live camera is
  // an external unit only if a doorbell shares its module. Call Home carries the
  // bridge's id, which no doorbell does, so a Call Home whose icon was changed in
  // the UI is still not taken for an entrance.
  if (doorbellModules.size) {
    const units = [];
    for (const id of found.liveCameras) {
      const moduleId = hass.states[id]?.attributes.module_id;
      if (!moduleId || doorbellModules.has(moduleId)) units.push(id);
      else found.callHome = found.callHome || id;
    }
    found.liveCameras = units;
  }
  return found;
}

/** A doorbell sensor or doorbell event, the two entities each external unit has. */
function isDoorbell(id, stateObj) {
  const deviceClass = stateObj.attributes.device_class;
  if (id.startsWith('binary_sensor.')) return deviceClass === 'sound';
  if (id.startsWith('event.')) return !deviceClass || deviceClass === 'doorbell';
  return false;
}

/** Override an automatic pick with one the user set in the config. */
function applyOverrides(found, config) {
  if (config.camera_entity) found.liveCameras = [config.camera_entity];
  if (config.snapshot_entity) found.snapshot = config.snapshot_entity;
  if (config.lock_entity) found.locks = [].concat(config.lock_entity);
  if (config.light_entity) found.lights = [].concat(config.light_entity);
  return found;
}

/**
 * The name of an entity without the device name Home Assistant puts in front
 * of it, so a unit reads "Gate" rather than "Intercom Gate".
 */
function shortName(hass, entityId, deviceNames = []) {
  const full = hass.states[entityId]?.attributes.friendly_name || entityId || '';
  for (const prefix of deviceNames) {
    if (prefix && full.length > prefix.length && full.startsWith(`${prefix} `)) return full.slice(prefix.length + 1);
  }
  return full;
}

/**
 * One external unit per live camera, with the doorbell sensor and the doorbell
 * event that belong to it. The integration puts a module_id attribute on all
 * three; before it did, they still shared the module's name, and a lone unit
 * owns every doorbell there is.
 */
function resolveUnits(hass, found, deviceNames = []) {
  const attr = (id, key) => hass.states[id]?.attributes?.[key] ?? null;
  const units = found.liveCameras.map((camera) => ({
    camera,
    moduleId: attr(camera, 'module_id'),
    name: shortName(hass, camera, deviceNames),
    doorbell: null,
    event: null,
  }));
  const friendly = (id) => attr(id, 'friendly_name');
  const attach = (id, slot) => {
    const moduleId = attr(id, 'module_id');
    const free = units.filter((unit) => !unit[slot]);
    const unit =
      (moduleId && free.find((item) => item.moduleId === moduleId)) ||
      free.find((item) => !(moduleId && item.moduleId) && friendly(id) && friendly(id) === friendly(item.camera)) ||
      (units.length === 1 && free.length === 1 && !(moduleId && units[0].moduleId) ? free[0] : null);
    if (!unit) return;
    unit[slot] = id;
    if (!unit.moduleId && moduleId) unit.moduleId = moduleId;
  };
  for (const id of found.doorbells) attach(id, 'doorbell');
  for (const id of found.doorbellEvents) attach(id, 'event');
  return units;
}

/** An image URL that changes when the picture does, so the browser fetches it again. */
function freshUrl(url, stamp) {
  if (!url) return null;
  if (stamp === undefined || stamp === null || stamp === '' || /^(data|blob):/.test(url)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}_=${encodeURIComponent(stamp)}`;
}

/* ------------------------------------------------------- the 100X, in paths */

/* Material Design Icons, the set Home Assistant ships, drawn in a 24x24 box. */
const MDI = {
  star: 'M12,15.39L8.24,17.66L9.23,13.38L5.91,10.5L10.29,10.13L12,6.09L13.71,10.13L18.09,10.5L14.77,13.38L15.76,17.66M22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27L18.18,21L16.54,13.97L22,9.24Z',
  key: 'M7,14A2,2 0 0,1 5,12A2,2 0 0,1 7,10A2,2 0 0,1 9,12A2,2 0 0,1 7,14M12.65,10C11.83,7.67 9.61,6 7,6A6,6 0 0,0 1,12A6,6 0 0,0 7,18C9.61,18 11.83,16.33 12.65,14H17V18H21V14H23V10H12.65Z',
  eye: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z',
  phone:
    'M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z',
  phoneHangup:
    'M12,9C10.4,9 8.85,9.25 7.4,9.72V12.82C7.4,13.22 7.17,13.56 6.84,13.72C5.86,14.21 4.97,14.84 4.17,15.57C4,15.75 3.75,15.86 3.5,15.86C3.2,15.86 2.95,15.74 2.77,15.56L0.29,13.08C0.11,12.9 0,12.65 0,12.38C0,12.1 0.11,11.85 0.29,11.67C3.34,8.77 7.46,7 12,7C16.54,7 20.66,8.77 23.71,11.67C23.89,11.85 24,12.1 24,12.38C24,12.65 23.89,12.9 23.71,13.08L21.23,15.56C21.05,15.74 20.8,15.86 20.5,15.86C20.25,15.86 20,15.75 19.83,15.57C19.03,14.84 18.14,14.21 17.16,13.72C16.83,13.56 16.6,13.22 16.6,12.82V9.72C15.15,9.25 13.6,9 12,9Z',
  wifi: 'M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,3C7.95,3 4.21,4.34 1.2,6.6L3,9C5.5,7.12 8.62,6 12,6C15.38,6 18.5,7.12 21,9L22.8,6.6C19.79,4.34 16.05,3 12,3M12,9C9.3,9 6.81,9.89 4.8,11.4L6.6,13.8C8.1,12.67 9.97,12 12,12C14.03,12 15.9,12.67 17.4,13.8L19.2,11.4C17.19,9.89 14.7,9 12,9Z',
  bell: 'M12,22A2,2 0 0,0 14,20H10A2,2 0 0,0 12,22M18,16V11C18,7.93 16.36,5.36 13.5,4.68V4A1.5,1.5 0 0,0 12,2.5A1.5,1.5 0 0,0 10.5,4V4.68C7.63,5.36 6,7.92 6,11V16L4,18V19H20V18L18,16M16,17H8V11C8,8.52 9.51,6.5 12,6.5C14.49,6.5 16,8.52 16,11V17Z',
};

/* The bticino wordmark, 111x24, drawn in one neutral colour. */
const BTICINO_LOGO = [
  'M8.18171 11.1339V18.3913H11.8269V11.1339H8.18171ZM15.8338 6.03623H8.19816V0.5H0.529663V23.489H15.8338C17.8509 23.489 19.4899 21.8556 19.4899 19.8439V9.68684C19.4899 7.67517 17.8509 6.03623 15.8338 6.03623Z',
  'M99.1896 11.1339V18.3913H102.829V11.1339H99.1896ZM106.82 6.04171H95.1991C93.1874 6.04171 91.554 7.67517 91.554 9.69233V19.8439C91.554 21.8556 93.1874 23.4945 95.1991 23.4945H106.82C108.831 23.4945 110.47 21.8556 110.47 19.8439V9.69233C110.47 7.67517 108.831 6.04171 106.82 6.04171Z',
  'M53.1786 18.3968H49.5335V11.1394H53.1786L53.1951 13.7595H60.8033V9.69781C60.8033 7.68613 59.1753 6.05267 57.1581 6.05267H45.5375C43.5204 6.05267 41.8924 7.68613 41.8924 9.69781V19.8549C41.8924 21.8665 43.5204 23.5 45.5375 23.5H57.1581C59.1753 23.5 60.8033 21.8665 60.8033 19.8549V15.7877H53.1951L53.1786 18.4078V18.3968Z',
  'M62.201 6.04719H69.8586V23.489H62.201V6.04719Z',
  'M32.8481 6.04171H40.4946V23.489H32.8481V6.04171Z',
  'M31.7463 6.04171H28.5506V0.510963H20.8712V19.8603C20.8712 21.872 22.5046 23.5 24.5163 23.5H31.7463V18.5448H28.5506V10.8763H31.7463V6.03622V6.04171Z',
  'M78.859 23.489V11.1339H82.5042V23.489H90.1343V9.68684C90.1343 7.67517 88.5063 6.04171 86.4892 6.04171H71.2289V23.489H78.859Z',
];

/** The wordmark centred on x, scaled to the given width in viewBox units. */
const brandMark = (cx, cy, width) => {
  const k = width / 111;
  return (
    `<g class="bt-brand" transform="translate(${cx - width / 2} ${cy - (24 * k) / 2}) scale(${k})">` +
    BTICINO_LOGO.map((d) => `<path d="${d}"/>`).join('') +
    `</g>`
  );
};

/** Place a 24x24 icon path at (x, y) with a given glyph height. */
const glyph = (path, x, y, size, extra = '') => {
  const k = size / 24;
  return `<path class="bt-glyph" transform="translate(${x} ${y}) scale(${k}) translate(-12 -12)" d="${path}" ${extra}/>`;
};

/** The braille-style key markers under the display: 1, 2, 3 and 4 dots. */
function keyMarkers() {
  const groups = [
    { x: 41, dots: [[0, 0]] },
    {
      x: 79,
      dots: [
        [-2.4, 0],
        [2.4, 0],
      ],
    },
    {
      x: 118,
      dots: [
        [-2.4, -2.4],
        [2.4, -2.4],
        [-2.4, 2.4],
      ],
    },
    {
      x: 157,
      dots: [
        [-2.4, -2.4],
        [2.4, -2.4],
        [-2.4, 2.4],
        [2.4, 2.4],
      ],
    },
  ];
  return groups
    .map((g) =>
      g.dots.map(([dx, dy]) => `<circle class="bt-dot" cx="${g.x + dx}" cy="${135 + dy}" r="1.15"/>`).join(''),
    )
    .join('');
}

/**
 * The Classe 100X monitor, at the proportions of the real one: glossy bezel
 * with the display, the four key markers, the three touch keys and the
 * answer / hang-up bar under the brand line.
 */
function deviceSvg(interactive) {
  const key = (cls, label, inner) =>
    interactive
      ? `<g class="bt-key ${cls}" data-key="${cls}" role="button" tabindex="0" aria-label="${label}"><rect class="bt-hit" x="-19.5" y="-17" width="39" height="34" rx="10"/>${inner}</g>`
      : `<g class="bt-key ${cls}">${inner}</g>`;

  return `
<svg viewBox="0 0 200 200" role="img" aria-hidden="${interactive ? 'false' : 'true'}" focusable="false">
  <rect class="bt-body" x="1" y="1" width="198" height="198" rx="15"/>
  <rect class="bt-halo" x="1" y="1" width="198" height="198" rx="15"/>

  <rect class="bt-cam" x="91" y="11" width="18" height="5" rx="2.5"/>
  <rect class="bt-bezel" x="19" y="14" width="162" height="112" rx="5"/>

  <rect class="bt-screen-base" x="34" y="27" width="133" height="79" rx="2"/>

  <g transform="translate(189 93)">${glyph(MDI.wifi, 0, 0, 11)}</g>
  <g class="bt-bell" transform="translate(189 112)">${glyph(MDI.bell, 0, 0, 11)}</g>

  ${keyMarkers()}

  <g transform="translate(61 151)">${key('bt-star', '', glyph(MDI.star, 0, 0, 14))}</g>
  <g transform="translate(100 151)">${key('bt-lock', '', `<g transform="scale(-1 1)">${glyph(MDI.key, 0, 0, 14)}</g>`)}</g>
  <g transform="translate(139 151)">${key('bt-eye', '', glyph(MDI.eye, 0, 0, 14))}</g>

  <circle class="bt-dot" cx="100" cy="161" r="0.7"/>
  <circle class="bt-dot" cx="100" cy="163.5" r="0.7"/>
  <circle class="bt-dot" cx="100" cy="166" r="0.7"/>

  <line class="bt-split" x1="1" y1="169" x2="199" y2="169"/>

  <g transform="translate(26 184)">${key('bt-answer', '', glyph(MDI.phone, 0, 0, 16))}</g>
  ${brandMark(100, 184, 30)}
  <g transform="translate(174 184)">${key('bt-hangup', '', glyph(MDI.phoneHangup, 0, 0, 16))}</g>
</svg>`;
}

/* -------------------------------------------------------------------- style */

const STYLE = `
:host {
  display: block;
  --tile-color: var(--state-inactive-color, #9e9e9e);
  --radius: var(--ha-card-features-border-radius, var(--ha-border-radius-lg, 12px));
  /* A powered-off display is dark in any theme; a theme can still override it. */
  --bt-screen: var(--bticino-screen-color, #0d1116);
  /* white text on these stays above 4.5:1, which the theme's own green and red do not */
  --bt-success-strong: var(--success-color, #43a047);
  --bt-success-strong: color-mix(in srgb, var(--success-color, #43a047) 75%, black);
  --bt-error-strong: var(--error-color, #db4437);
  --bt-error-strong: color-mix(in srgb, var(--error-color, #db4437) 85%, black);
}
/* a kiosk fills whatever holds it: a panel view, a View Assist screen */
:host([kiosk]) { height: 100%; }
/* hidden means hidden, whatever display a class gives the element */
[hidden] { display: none !important; }
ha-card { height: 100%; overflow: hidden; }
.card {
  display: flex;
  flex-direction: column;
  gap: var(--ha-space-3, 12px);
  padding: var(--ha-space-4, 16px);
  container-type: inline-size;
  font-family: var(--ha-font-family-body, Roboto, Noto, sans-serif);
  color: var(--primary-text-color);
  -webkit-font-smoothing: antialiased;
}
button {
  font: inherit; color: inherit; background: none; border: none;
  margin: 0; padding: 0; cursor: pointer;
}
button:disabled { cursor: not-allowed; }

/* --- tile header ------------------------------------------------------- */
.head {
  display: flex; align-items: center; gap: 10px;
  /* no extra padding: the header's top edge lines up with the side margins */
  min-height: 44px; padding: 0;
  cursor: pointer; outline: none;
  border-radius: var(--ha-card-border-radius, 12px);
}
.head:focus-visible { box-shadow: inset 0 0 0 2px var(--tile-color); }
.tile-icon {
  position: relative; flex: none; width: 36px; height: 36px; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--ha-tile-icon-border-radius, var(--ha-border-radius-pill, 9999px));
  color: var(--tile-color); --mdc-icon-size: 22px;
}
.tile-icon::before {
  content: ""; position: absolute; inset: 0;
  background: var(--tile-color); opacity: 0.2;
  transition: opacity 180ms ease-in-out;
}
.head:hover .tile-icon::before { opacity: 0.35; }
.tile-icon > * { position: relative; }
.tile-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
.primary, .secondary { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.primary {
  font-size: var(--ha-font-size-m, 14px); font-weight: var(--ha-font-weight-medium, 500);
  line-height: 20px; letter-spacing: 0.1px; color: var(--primary-text-color);
}
.secondary {
  font-size: var(--ha-font-size-s, 12px); line-height: 16px;
  letter-spacing: 0.4px; color: var(--secondary-text-color);
}
.live-dot {
  flex: none; width: 8px; height: 8px; border-radius: var(--ha-border-radius-circle, 50%);
  background: var(--tile-color); opacity: 0;
}
.ringing .live-dot { opacity: 1; animation: bt-pulse 1.4s ease-in-out infinite; }
.talking .live-dot { opacity: 1; }

/* --- body: drawing + content ------------------------------------------- */
.body { display: flex; flex-direction: column; gap: var(--ha-space-3, 12px); }
.content { min-width: 0; display: flex; flex-direction: column; gap: var(--ha-space-3, 12px); }
.device-wrap {
  align-self: center; width: var(--bt-device-width, 140px); max-width: 100%;
  display: flex; flex-direction: column; gap: 6px; align-items: center;
}
.device-wrap[hidden] { display: none; }

/* --- the drawing -------------------------------------------------------- */
.device { position: relative; width: 100%; aspect-ratio: 1 / 1; }
.device svg { display: block; width: 100%; height: 100%; overflow: visible; }
.bt-body {
  fill: color-mix(in srgb, var(--primary-text-color) 7%, transparent);
  stroke: var(--divider-color, rgba(0, 0, 0, 0.12));
  stroke-width: 1;
}
.bt-halo { fill: none; stroke: var(--tile-color); stroke-width: 2; opacity: 0; }
.ringing .bt-halo { opacity: 1; animation: bt-halo 1.4s ease-in-out infinite; }
.talking .bt-halo { opacity: 0.55; }
.bt-bezel {
  fill: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
  stroke: var(--divider-color, rgba(0, 0, 0, 0.12));
  stroke-width: 1;
}
.bt-cam { fill: color-mix(in srgb, var(--primary-text-color) 22%, transparent); }
.bt-screen-base { fill: var(--bt-screen); }
.bt-glyph { fill: var(--secondary-text-color); }
.bt-dot { fill: color-mix(in srgb, var(--primary-text-color) 32%, transparent); }
.bt-split { stroke: var(--divider-color, rgba(0, 0, 0, 0.12)); stroke-width: 1; }
/* the b and the o carry their counter as a second subpath, so evenodd is
   what makes them holes instead of solid shapes */
.bt-brand path { fill: var(--secondary-text-color); fill-rule: evenodd; }
.bt-hit { fill: transparent; }
.bt-key { outline: none; }
.bt-key.on .bt-glyph { fill: var(--tile-color); }
.ringing .bt-answer .bt-glyph { fill: var(--success-color, #43a047); animation: bt-pulse 1.4s ease-in-out infinite; }
.ringing .bt-hangup .bt-glyph { fill: var(--error-color, #db4437); }
.ringing .bt-bell .bt-glyph { fill: var(--tile-color); animation: bt-pulse 1.4s ease-in-out infinite; }
.offline .bt-glyph { fill: var(--disabled-text-color, #bdbdbd); }

/* the live stream takes the drawing's place while a call is up */
.stream {
  position: relative; align-self: center; width: 100%; max-width: 480px;
  border-radius: var(--ha-border-radius-lg, 12px); overflow: hidden;
  background: var(--bt-screen);
  /* the card Home Assistant builds for us must not draw a surface of its own */
  --ha-card-border-width: 0;
  --ha-card-border-radius: 0;
  --ha-card-box-shadow: none;
  --ha-card-background: transparent;
}
.stream[hidden] { display: none; }
.stream-video {
  display: block; width: 100%; background: var(--bt-screen); object-fit: contain;
  /* 16:9 only until the device says what it actually sends, then no bands */
  aspect-ratio: var(--bt-video-aspect, 16 / 9);
  transition: aspect-ratio var(--ha-animation-duration-normal, 200ms) ease;
}
.stream-video[hidden] { display: none; }
.stream-controls {
  position: absolute; inset-inline-end: 6px; bottom: 6px; z-index: 2;
  display: flex; gap: 2px;
}
/* over a picture of any brightness: white on a dark disc when off, dark on a
   white disc when on, so the two states read apart without relying on hue */
.stream-controls { gap: 6px; }
.stream-controls .icon-button { width: 44px; height: 44px; color: #fff; background: rgba(0, 0, 0, 0.6); }
.stream-controls .icon-button.on { color: #111; background: rgba(255, 255, 255, 0.92); }
/* a refused microphone is a state, not a silence: it shows, and a tap asks again */
.stream-controls .icon-button.blocked { color: #fff; background: var(--bt-error-strong); }
.stream-note {
  position: absolute; inset-inline-start: 10px; top: 10px; z-index: 2; max-width: calc(100% - 20px);
  display: flex; align-items: center; gap: 6px; padding: 6px 10px; box-sizing: border-box;
  border-radius: var(--ha-border-radius-pill, 9999px);
  background: rgba(0, 0, 0, 0.72); color: #fff;
  font-size: var(--ha-font-size-s, 12px); font-weight: var(--ha-font-weight-medium, 500); line-height: 16px;
  --mdc-icon-size: 16px;
}
.stream-note[hidden] { display: none; }
.stream-note span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stream-overlay {
  position: absolute; inset: 0; z-index: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  padding: var(--ha-space-4, 16px); text-align: center;
  color: var(--text-primary-color, #fff); --mdc-icon-size: 32px;
  font-size: var(--ha-font-size-s, 12px);
}
.stream-overlay[hidden] { display: none; }
.stream-overlay ha-icon { color: var(--tile-color); }
.stream-overlay.pulsing ha-icon { animation: bt-spin 1.1s linear infinite; }
.stream-label {
  position: absolute; inset-inline-start: 10px; bottom: 10px; z-index: 1;
  display: flex; align-items: center; gap: 6px; padding: 4px 10px;
  border-radius: var(--ha-border-radius-pill, 9999px);
  background: rgba(0, 0, 0, 0.55); color: var(--text-primary-color, #fff);
  font-size: var(--ha-font-size-s, 12px); font-weight: var(--ha-font-weight-medium, 500);
  --mdc-icon-size: 16px;
}
/* a Call Home session carries no picture, so the panel stands on its own */
.stream.audio {
  min-height: 132px;
  background: color-mix(in srgb, var(--primary-text-color) 7%, transparent);
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
}
.stream.audio .stream-video { display: none; }
.stream.audio .stream-overlay { position: static; color: var(--primary-text-color); }
.stream.audio .stream-controls .icon-button { color: var(--secondary-text-color); background: none; }
.stream.audio .stream-controls .icon-button.on {
  color: var(--primary-text-color);
  background: color-mix(in srgb, var(--primary-text-color) 14%, transparent);
}
.stream.audio .stream-controls .icon-button.blocked { color: #fff; background: var(--bt-error-strong); }
.stream.audio .stream-label { display: none; }
.stream.audio .stream-note { position: static; align-self: center; margin: 0 auto var(--ha-space-3, 12px); }

.device-caption {
  font-size: var(--ha-font-size-xs, 10px); line-height: 1.2; letter-spacing: 0.4px;
  color: var(--secondary-text-color); text-align: center;
}

/* --- the display -------------------------------------------------------- */
.screen {
  position: absolute; left: 17%; top: 13.5%; width: 66.5%; height: 39.5%;
  border-radius: 2px; overflow: hidden; background: var(--bt-screen);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-primary-color, #fff); cursor: pointer; outline: none;
  padding: 0; border: none;
}
.screen:focus-visible { box-shadow: 0 0 0 2px var(--tile-color); }
.screen img { width: 100%; height: 100%; object-fit: cover; display: block; }
.screen .placeholder {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  color: color-mix(in srgb, var(--text-primary-color, #fff) 55%, transparent);
  --mdc-icon-size: 22%;
}
.screen .placeholder span {
  font-size: 9px; letter-spacing: 0.4px; text-transform: uppercase;
}

/* --- alert -------------------------------------------------------------- */
.alert {
  position: relative; display: flex; align-items: center; padding: 10px 12px;
  border-radius: var(--ha-border-radius-lg, 12px); overflow: hidden;
}
.alert::before { content: ""; position: absolute; inset: 0; background: var(--tile-color); opacity: 0.12; }
.alert ha-icon { position: relative; flex: none; color: var(--tile-color); --mdc-icon-size: 20px; }
.alert .text {
  position: relative; margin-inline-start: 8px; min-width: 0;
  font-size: var(--ha-font-size-m, 14px); line-height: normal; color: var(--primary-text-color);
}
.alert .text b { font-weight: var(--ha-font-weight-bold, 700); }

/* --- badges ------------------------------------------------------------- */
.badges { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.badge {
  display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px;
  box-sizing: border-box; min-width: 0;
  border-radius: var(--ha-border-radius-pill, 9999px);
  border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
}
.badge ha-icon { --mdc-icon-size: 16px; margin-inline-start: -2px; color: var(--badge-color, var(--secondary-text-color)); }
.badge:focus-visible { outline: 2px solid var(--primary-text-color); outline-offset: 2px; }
.badge .label { font-size: var(--ha-font-size-xs, 10px); font-weight: 500; line-height: 12px; letter-spacing: 0.1px; color: var(--secondary-text-color); }
.badge .value { font-size: var(--ha-font-size-s, 12px); font-weight: 500; line-height: 1.2; letter-spacing: 0.1px; color: var(--primary-text-color); white-space: nowrap; }
.badge .stack { display: flex; flex-direction: column; min-width: 0; }

/* --- buttons ------------------------------------------------------------ */
.features { display: flex; gap: 8px; }
.button {
  position: relative; overflow: hidden; z-index: 0;
  flex: 1 1 0; min-width: 0; min-height: 44px;
  display: flex; align-items: center; justify-content: center; gap: 8px; padding: 0 8px;
  border-radius: var(--radius);
  font-size: var(--ha-font-size-m, 14px); font-weight: var(--ha-font-weight-medium, 500);
  color: var(--primary-text-color); --mdc-icon-size: 20px; outline: none;
}
.button::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: var(--disabled-color, #bdbdbd); opacity: 0.2;
  transition: opacity 180ms ease-in-out;
}
.button:hover:not(:disabled)::before { opacity: 0.3; }
.button.tonal::before { background: var(--tile-color); }
.button.primary::before { background: var(--tile-color); opacity: 1; }
.button.primary { color: var(--text-primary-color, #fff); }
.button.danger::before { background: var(--bt-error-strong); opacity: 1; }
.button.danger { color: #fff; }
.button.success::before { background: var(--bt-success-strong); opacity: 1; }
.button.success { color: #fff; }
.button.success.flash { animation: bt-flash var(--ha-animation-duration-slow, 350ms) ease-out 2; }
/* while it rings, the answer button asks to be pressed */
.button.calling { animation: bt-breathe 2s ease-in-out infinite; }
.button.calling ha-icon { animation: bt-ring 2s ease-in-out infinite; }
.button:focus-visible { box-shadow: 0 0 0 2px var(--tile-color); }
.button:disabled { color: var(--disabled-text-color, #bdbdbd); }
.button > * { position: relative; }
/* One row always: the label shows where it fits, and gives way to the icon alone
   where it does not. A long translation ellipsizes rather than pushing the row. */
.button .text { display: none; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.features[data-count="1"] .text { display: block; }
/* the query sees the container's content box, so these are row widths, not card widths */
@container (min-width: 220px) { .features[data-count="2"] .text { display: block; } }
@container (min-width: 340px) { .features[data-count="3"] .text { display: block; } }
@container (min-width: 460px) { .features[data-count="4"] .text { display: block; } }
@container (min-width: 580px) { .features[data-count="5"] .text { display: block; } }

/* --- recent calls ------------------------------------------------------- */
/* The recent calls live behind a row that expands the card, like a feature row. */
.expander {
  position: relative; overflow: hidden; z-index: 0;
  display: flex; align-items: center; gap: 8px;
  width: 100%; min-height: 44px; padding: 0 12px; box-sizing: border-box;
  border-radius: var(--radius); outline: none;
  font-size: var(--ha-font-size-m, 14px); font-weight: var(--ha-font-weight-medium, 500);
  color: var(--primary-text-color); --mdc-icon-size: 20px;
}
.expander::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: var(--disabled-color, #bdbdbd); opacity: 0.2;
  transition: opacity 180ms ease-in-out;
}
.expander:hover::before { opacity: 0.3; }
.expander:focus-visible { box-shadow: 0 0 0 2px var(--tile-color); }
.expander > * { position: relative; }
.expander .label {
  flex: 1; min-width: 0; text-align: start;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.expander .chev { display: block; transition: transform var(--ha-animation-duration-fast, 150ms) ease-in-out; }
.expander[aria-expanded="true"] .chev { transform: rotate(180deg); }

.history { display: flex; flex-direction: column; gap: 8px; }
.history[hidden] { display: none; }
.empty { font-size: var(--ha-font-size-s, 12px); color: var(--secondary-text-color); }

/* one row per call: snapshot, outcome, when */
.calls { display: flex; flex-direction: column; gap: 2px; }
/* a text button, like the ones core uses to reveal more of a list */
.show-all {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%; min-height: 44px; padding: 0 12px; box-sizing: border-box;
  border-radius: var(--radius); outline: none;
  font-size: var(--ha-font-size-m, 14px); font-weight: var(--ha-font-weight-medium, 500);
  /* the theme's primary colour alone is 2.6:1 on a light card; pulled towards
     the text colour it stays recognisable and passes in light and dark */
  color: var(--primary-text-color);
  color: color-mix(in srgb, var(--primary-color) 60%, var(--primary-text-color));
  --mdc-icon-size: 18px;
}
.show-all::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: var(--primary-color); opacity: 0;
  transition: opacity 120ms ease-in-out;
}
.show-all:hover::before { opacity: 0.08; }
.show-all:focus-visible { box-shadow: 0 0 0 2px var(--primary-text-color); }
.show-all > * { position: relative; }
.call {
  position: relative; overflow: hidden; display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 4px; box-sizing: border-box; text-align: start; outline: none;
  border-radius: var(--ha-border-radius-md, 8px);
}
.call::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: var(--disabled-color, #bdbdbd); opacity: 0;
  transition: opacity 120ms ease-in-out;
}
.call:hover::before { opacity: 0.16; }
.call:focus-visible { box-shadow: inset 0 0 0 2px var(--tile-color); }
.call > * { position: relative; }
.call .thumb, .call .no-thumb {
  flex: none; width: 56px; aspect-ratio: 4 / 3;
  border-radius: var(--ha-border-radius-sm, 4px); overflow: hidden;
}
.call .thumb { object-fit: cover; display: block; background: var(--bt-screen); }
.call .no-thumb {
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--primary-text-color) 8%, transparent);
  color: var(--secondary-text-color); --mdc-icon-size: 20px;
}
.call .info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.call .outcome {
  display: flex; align-items: center; gap: 6px; --mdc-icon-size: 16px;
  font-size: var(--ha-font-size-m, 14px); font-weight: var(--ha-font-weight-medium, 500);
  line-height: 18px; color: var(--primary-text-color);
}
.call .outcome ha-icon { flex: none; color: var(--call-color, var(--secondary-text-color)); }
.call .where, .call .when {
  font-size: var(--ha-font-size-s, 12px); line-height: 16px; color: var(--secondary-text-color);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.call .when { flex: none; text-align: end; font-variant-numeric: tabular-nums; }

/* --- snapshot dialog ---------------------------------------------------- */
dialog {
  width: min(580px, 95vw); max-height: min(80vh, 720px); padding: 0; border: none; overflow: hidden;
  border-radius: var(--ha-dialog-border-radius, var(--ha-border-radius-3xl, 24px));
  background: var(--ha-dialog-surface-background, var(--card-background-color, #fff));
  color: var(--primary-text-color);
  box-shadow: var(--ha-box-shadow-l, 0 16px 32px -6px rgba(0, 0, 0, 0.2));
  font-family: var(--ha-font-family-body, Roboto, Noto, sans-serif);
  flex-direction: column;
  /* core opens and closes its dialogs in about 200ms; browsers without
     allow-discrete simply show them at once */
  opacity: 0;
  transform: translateY(10px) scale(0.97);
  transition:
    opacity var(--ha-animation-duration-normal, 200ms) ease,
    transform var(--ha-animation-duration-normal, 200ms) ease,
    overlay var(--ha-animation-duration-normal, 200ms) allow-discrete,
    display var(--ha-animation-duration-normal, 200ms) allow-discrete;
}
/* display only on [open], or the dialog would lose the UA's own display:none */
dialog[open] { opacity: 1; transform: none; display: flex; }
@starting-style {
  dialog[open] { opacity: 0; transform: translateY(10px) scale(0.97); }
}
dialog::backdrop {
  background: rgba(0, 0, 0, 0.32);
  opacity: 0;
  transition:
    opacity var(--ha-animation-duration-normal, 200ms) ease,
    overlay var(--ha-animation-duration-normal, 200ms) allow-discrete,
    display var(--ha-animation-duration-normal, 200ms) allow-discrete;
}
dialog[open]::backdrop { opacity: 1; }
@starting-style {
  dialog[open]::backdrop { opacity: 0; }
}
.dialog-header { flex: none; display: flex; align-items: center; gap: 8px; padding: 12px 12px 8px 24px; }
.dialog-title {
  flex: 1; min-width: 0;
  font-size: var(--ha-font-size-2xl, 24px); line-height: 1.2;
  font-weight: var(--ha-font-weight-normal, 400);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.icon-button {
  position: relative; overflow: hidden; flex: none;
  width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;
  border-radius: var(--ha-border-radius-circle, 50%);
  color: var(--secondary-text-color); --mdc-icon-size: 24px; outline: none;
}
.icon-button::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: currentColor; opacity: 0; transition: opacity 120ms ease-in-out;
}
.icon-button:hover::before { opacity: 0.08; }
.icon-button:focus-visible { box-shadow: 0 0 0 2px var(--tile-color); }
.icon-button > * { position: relative; }
.dialog-content {
  flex: 1 1 auto; min-height: 0; padding: 0 24px 24px;
  /* scrolls on its own, and the page behind it stays where it is */
  overflow-y: auto; overscroll-behavior: contain;
}
.dialog-content img { width: 100%; height: auto; display: block; border-radius: var(--ha-border-radius-lg, 12px); }
@media (max-width: 870px), (max-height: 500px) {
  /* a bottom sheet, so it slides up instead of scaling in */
  dialog {
    width: 100vw; max-width: 100vw; margin: auto 0 0; max-height: 90vh;
    border-radius: var(--ha-border-radius-2xl, 20px) var(--ha-border-radius-2xl, 20px) 0 0;
    padding-bottom: var(--safe-area-inset-bottom, 0px);
    transform: translateY(24px);
  }
  @starting-style {
    dialog[open] { transform: translateY(24px); }
  }
}

/* --- the picture at full width ------------------------------------------ */
/* While it rings, in every layout, the drawing steps aside for the visitor;
   in a kiosk the picture is always there. */
.shot {
  position: relative; align-self: center; width: 100%; max-width: 480px; min-height: 160px; max-height: 70vh;
  aspect-ratio: var(--bt-shot-aspect, 4 / 3);
  border-radius: var(--ha-border-radius-lg, 12px); overflow: hidden;
  background: var(--bt-screen);
}
.shot[hidden] { display: none; }
.shot img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; }
.shot img[hidden] { display: none; }
.shot-empty {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; color: rgba(255, 255, 255, 0.78); --mdc-icon-size: 40px;
  font-size: var(--ha-font-size-m, 14px);
}
.shot-empty[hidden] { display: none; }
/* text over a picture sits on its own dark plate: 4.5:1 whatever the picture */
.shot-caption {
  position: absolute; inset-inline-start: 10px; bottom: 10px; z-index: 1;
  display: flex; align-items: center; gap: 10px; max-width: calc(100% - 20px); box-sizing: border-box;
  padding: 8px 14px; border-radius: var(--ha-border-radius-lg, 12px);
  background: rgba(0, 0, 0, 0.72); color: #fff;
}
.shot-caption[hidden] { display: none; }
.shot-dot { flex: none; width: 10px; height: 10px; border-radius: var(--ha-border-radius-circle, 50%); background: #fff; }
.shot-dot[hidden] { display: none; }
.ringing .shot-dot { animation: bt-pulse 1.4s ease-in-out infinite; }
.shot-text { min-width: 0; display: flex; flex-direction: column; }
.shot-title, .shot-sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.shot-title { font-size: var(--ha-font-size-l, 16px); font-weight: var(--ha-font-weight-medium, 500); line-height: 22px; }
.shot-sub { font-size: var(--ha-font-size-m, 14px); line-height: 18px; }
.shot-title:empty, .shot-sub:empty { display: none; }

/* --- the unit picker ----------------------------------------------------- */
.units {
  position: relative; z-index: 0; display: flex; flex-wrap: wrap; gap: 4px; padding: 4px;
  border-radius: var(--radius);
}
.units::before {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  border-radius: inherit; background: var(--disabled-color, #bdbdbd); opacity: 0.2;
}
.units[hidden] { display: none; }
.unit {
  /* as wide as its name, sharing what is left; a name too long wraps the row */
  flex: 1 1 auto; min-width: 0; min-height: 44px; box-sizing: border-box;
  display: flex; align-items: center; justify-content: center; gap: 6px; padding: 0 12px;
  border: 2px solid transparent; border-radius: calc(var(--radius) - 4px); outline: none;
  font-size: var(--ha-font-size-m, 14px); font-weight: var(--ha-font-weight-medium, 500);
  color: var(--primary-text-color); --mdc-icon-size: 18px;
}
.unit .text { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.unit ha-icon { flex: none; }
.unit[aria-checked="false"] ha-icon { display: none; }
/* the chosen one carries a border in the text colour and a tick: no hue needed */
.unit[aria-checked="true"] { border-color: var(--primary-text-color); background: var(--card-background-color, transparent); }
.unit:hover:not([aria-checked="true"]) { background: color-mix(in srgb, var(--primary-text-color) 6%, transparent); }
.unit:focus-visible { outline: 2px solid var(--primary-text-color); outline-offset: 2px; }

/* --- while it rings: three large actions --------------------------------- */
.features[data-mode="ring"] { flex-wrap: wrap; }
/* the icon over its word, like a phone's call screen: three fit a phone's width */
.features[data-mode="ring"] .button {
  flex: 1 1 88px; flex-direction: column; gap: 4px; min-height: 64px; padding: 8px 6px;
  font-size: var(--ha-font-size-m, 14px); --mdc-icon-size: 24px;
}
.features[data-mode="ring"] .text { display: block; max-width: 100%; }

/* --- kiosk layout --------------------------------------------------------- */
/* Fills its container. Beside the picture in landscape, under it in portrait:
   the card measures itself (ResizeObserver, with the viewport as fallback)
   and sets data-orient, so it needs no container query to work in an older
   WebView. */
.card[data-layout="kiosk"] { height: 100%; box-sizing: border-box; min-height: 0; }
.card[data-layout="kiosk"] .primary { font-size: var(--ha-font-size-l, 16px); }
.card[data-layout="kiosk"] .secondary { font-size: var(--ha-font-size-m, 14px); line-height: 18px; }
.card[data-layout="kiosk"] .body {
  flex: 1 1 auto; min-height: 0;
  display: grid; gap: var(--ha-space-3, 12px);
  grid-template-columns: minmax(0, 1fr) minmax(184px, 28%);
  grid-template-rows: minmax(0, 1fr);
}
.card[data-layout="kiosk"] .device-wrap,
.card[data-layout="kiosk"] .badges,
.card[data-layout="kiosk"] .expander,
.card[data-layout="kiosk"] .history { display: none; }
.card[data-layout="kiosk"] .shot,
.card[data-layout="kiosk"] .stream {
  grid-column: 1; grid-row: 1; align-self: stretch;
  width: 100%; max-width: none; height: 100%; min-height: 160px; max-height: none; aspect-ratio: auto;
}
.card[data-layout="kiosk"] .stream { display: flex; flex-direction: column; justify-content: center; }
.card[data-layout="kiosk"] .shot[hidden],
.card[data-layout="kiosk"] .stream[hidden] { display: none; }
.card[data-layout="kiosk"] .stream-video { flex: 1 1 auto; min-height: 0; height: 100%; aspect-ratio: auto; }
.card[data-layout="kiosk"] .stream-controls { inset-inline-end: 10px; bottom: 10px; gap: 10px; }
.card[data-layout="kiosk"] .stream-controls .icon-button { width: 56px; height: 56px; --mdc-icon-size: 28px; }
.card[data-layout="kiosk"] .stream-label,
.card[data-layout="kiosk"] .stream-note { font-size: var(--ha-font-size-m, 14px); }
.card[data-layout="kiosk"] .shot-title { font-size: var(--ha-font-size-xl, 20px); line-height: 26px; }
.card[data-layout="kiosk"] .shot-sub { font-size: var(--ha-font-size-l, 16px); line-height: 22px; }
.card[data-layout="kiosk"] .content {
  grid-column: 2; grid-row: 1; min-height: 0; overflow-y: auto;
  /* centred while it fits; when it scrolls, plain centring would cut the top off */
  justify-content: flex-start;
  justify-content: safe center;
}
.card[data-layout="kiosk"] .features { flex-direction: column; }
.card[data-layout="kiosk"] .button {
  flex: 0 0 auto; min-height: 56px; justify-content: flex-start; gap: 12px; padding: 0 16px;
  font-size: var(--ha-font-size-l, 16px); --mdc-icon-size: 24px;
}
.card[data-layout="kiosk"] .button .text { display: block; }
.card[data-layout="kiosk"] .features[data-mode="ring"] .button {
  flex-direction: row; gap: 12px; padding: 0 16px;
  min-height: 72px; font-size: var(--ha-font-size-xl, 20px); --mdc-icon-size: 28px;
}
/* a long word wraps onto a second line rather than losing its end */
.card[data-layout="kiosk"] .button .text {
  white-space: normal; line-height: 1.2; text-align: start;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.card[data-layout="kiosk"][data-orient="portrait"] .features[data-mode="ring"] .button .text { text-align: center; }
.card[data-layout="kiosk"] .unit { min-height: 56px; font-size: var(--ha-font-size-l, 16px); }
.card[data-layout="kiosk"][data-orient="portrait"] .body {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(200px, 1fr) auto;
}
.card[data-layout="kiosk"][data-orient="portrait"] .content { grid-column: 1; grid-row: 2; overflow: visible; }
.card[data-layout="kiosk"][data-orient="portrait"] .features {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}
.card[data-layout="kiosk"][data-orient="portrait"] .features[data-mode="ring"] {
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
}
.card[data-layout="kiosk"][data-orient="portrait"] .features[data-mode="ring"] .button {
  flex-direction: column; justify-content: center; gap: 4px; min-height: 88px; padding: 8px;
  font-size: var(--ha-font-size-l, 16px);
}

/* --- device layout ------------------------------------------------------ */
[data-layout="device"] .device-caption { display: none; }
[data-layout="compact"] .device-wrap { display: none; }
[data-layout="device"] .bt-key[role="button"] { cursor: pointer; }
[data-layout="device"] .bt-key[role="button"]:hover .bt-glyph { fill: var(--tile-color); }
[data-layout="device"] .bt-key[role="button"]:focus-visible .bt-hit {
  fill: color-mix(in srgb, var(--tile-color) 20%, transparent);
  stroke: var(--tile-color); stroke-width: 1.5;
}
[data-layout="device"] .bt-key.off { opacity: 0.35; pointer-events: none; }

/* --- narrow containers --------------------------------------------------- */
@container (max-width: 300px) {
  .device-wrap { width: min(var(--bt-device-width, 140px), 112px); }
}

/* --- motion -------------------------------------------------------------- */
@keyframes bt-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@keyframes bt-breathe {
  0%, 22%, 100% { transform: none; }
  11% { transform: scale(1.035); }
}
@keyframes bt-ring {
  0%, 26%, 100% { transform: rotate(0deg); }
  4% { transform: rotate(-14deg); }
  9% { transform: rotate(12deg); }
  14% { transform: rotate(-10deg); }
  19% { transform: rotate(8deg); }
}
@keyframes bt-spin {
  to { transform: rotate(360deg); }
}
@keyframes bt-flash {
  0%, 100% { transform: none; }
  50% { transform: scale(1.03); }
}
@keyframes bt-halo {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 0.2; }
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
`;

/* --------------------------------------------------------------- the card */

/** Default width of the drawing, per layout. */
const DEVICE_WIDTH = { panel: 140, device: 260 };

/**
 * A notification can link to a dashboard with ?answer=<camera entity>, the way
 * the actionable doorbell notification does, and the card picks the call up by
 * itself. Only the first card on the page may act on it, or two of them would
 * open two sessions towards a device that has very few slots.
 */
const AUTO_ANSWER_PARAM = 'answer';
let autoAnswerTaken = false;

/**
 * ?camera=<camera entity> picks the unit a card shows, without calling it: a
 * View Assist view opened by the doorbell, or a link to one entrance.
 */
const CAMERA_PARAM = 'camera';

const LAYOUTS = ['panel', 'device', 'compact', 'kiosk'];

/**
 * The integration fires this on the bus when a unit rings and when the call
 * ends, naming the camera of the unit that rang. Home Assistant lets only
 * administrators subscribe to it, so the doorbell sensors stay the fallback.
 */
const CALL_EVENT = `${DOMAIN}_call`;
/** How long a ring heard on the bus counts by itself, if no end follows. */
const RING_TTL = 35000;

/** A door the integration reports as released, whatever word it uses for it. */
const LOCK_OPEN_STATES = ['unlocked', 'open', 'opening'];

/** How many past calls the expanded list asks for, and how many it shows inline. */
const HISTORY_LIMIT = 50;
const HISTORY_PREVIEW = 5;

const DEFAULTS = {
  layout: 'panel',
  color: 'blue',
  auto_answer: true,
  show_badges: true,
  show_controls: true,
  show_history: true,
};

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) if (child) node.appendChild(child);
  return node;
}

const icon = (name) => el('ha-icon', { icon: name });

/** The round close button Home Assistant puts in a dialog header. */
const closeButton = (label, onClose) =>
  el('button', { class: 'icon-button', type: 'button', 'aria-label': label, title: label, onclick: onClose }, [
    icon('mdi:close'),
  ]);

class Bticino100xCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement(EDITOR_TYPE);
  }

  static getStubConfig(hass) {
    const entry = Object.values(hass?.entities || {}).find((e) => e.platform === DOMAIN && e.device_id);
    return { device_id: entry ? entry.device_id : '', layout: 'panel' };
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._history = null;
    this._historyKey = null;
    this._historyBusy = false;
    this._expanded = false;
    this._stream = null;
    this._session = null;
    this._soundOn = true;
    this._units = [];
    this._allUnits = [];
    /** The camera of the unit picked while idle; null means the first one. */
    this._selected = null;
    /** The last ring heard on the bus: { camera, moduleName, snapshot, at }. */
    this._ring = null;
    this._badShots = new Set();
  }

  setConfig(config) {
    if (!config) throw new Error('Invalid configuration');
    this._config = { ...DEFAULTS, ...config };
    // show_device: false was how the drawing used to be turned off
    if (this._config.show_device === false) this._config.layout = 'compact';
    delete this._config.show_device;
    if (!LAYOUTS.includes(this._config.layout)) this._config.layout = 'panel';
    this.style.setProperty('--bt-accent', colorVar(this._config.color || 'blue'));
    this.toggleAttribute('kiosk', this._config.layout === 'kiosk');
    this._root = null; // the layout drives the skeleton, so rebuild it
    this.shadowRoot.innerHTML = '';
    this._observeSize();
    if (this._hass) this._render();
  }

  set hass(hass) {
    const old = this._hass;
    this._hass = hass;
    if (!old || this._shouldUpdate(old, hass)) this._render();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._detached = false;
    this._observeSize();
    if (this._hass) this._render();
    // Relative times go stale between state updates, so refresh them on a tick.
    this._tick =
      this._tick ||
      setInterval(() => {
        if (this._root) this._sync();
      }, 60000);
  }

  disconnectedCallback() {
    this._detached = true;
    if (this._tick) {
      clearInterval(this._tick);
      this._tick = null;
    }
    this._unsubscribeCalls();
    this._unobserveSize();
    clearTimeout(this._ringTimer);
    this._ringTimer = null;
    this._ring = null;
    // a WebRTC session must not outlive the card on screen
    this._stopSession();
    this._stream = null;
  }

  getCardSize() {
    const sizes = { device: 6, panel: 4, compact: 3, kiosk: 8 };
    const base = sizes[this._config?.layout] ?? 4;
    return this._expanded ? base + 2 : base;
  }

  getGridOptions() {
    // a kiosk wants a definite height to fill, the others grow with content
    if (this._config?.layout === 'kiosk') return { columns: 'full', rows: 8, min_columns: 6, min_rows: 5 };
    return { columns: 12, min_columns: 6 };
  }

  _shouldUpdate(old, hass) {
    if (old.entities !== hass.entities || old.locale !== hass.locale) return true;
    if (old.language !== hass.language || old.themes !== hass.themes) return true;
    const watched = this._watched || [];
    return watched.some((id) => old.states[id] !== hass.states[id]);
  }

  /* ----------------------------------------------------------- rendering */

  _render() {
    const hass = this._hass;
    const config = this._config;
    if (!hass || !config) return;

    // a card given only a camera (a View Assist view that knows nothing else)
    // works out the intercom from it
    const deviceId = this._deviceId();
    const found = resolveEntities(hass, deviceId);
    // the units come from the whole device, so a card held to one camera still
    // knows when another unit is the one ringing
    const allUnits = resolveUnits(hass, found, this._deviceNames());
    applyOverrides(found, config);
    this._found = found;
    this._allUnits = allUnits;
    this._units = config.camera_entity ? this._overrideUnits(allUnits) : allUnits;
    this._watched = [
      ...new Set([...found.all, ...found.liveCameras, found.snapshot, ...found.locks, ...found.lights]),
    ].filter(Boolean);

    if (!deviceId && !found.all.length) {
      this._renderNotice(t(hass, 'no_device'));
      return;
    }
    if (!found.all.length) {
      this._renderNotice(t(hass, 'no_entities'));
      return;
    }

    this._applyCameraParam();
    this._subscribeCalls();
    if (!this._root) this._build();
    this._sync();
    this._maybeAutoAnswer();
  }

  /** The intercom: the configured one, else the device of camera_entity. */
  _deviceId() {
    const config = this._config;
    if (config.device_id) return config.device_id;
    return (config.camera_entity && this._hass?.entities?.[config.camera_entity]?.device_id) || null;
  }

  /** The names Home Assistant may have put in front of the entity names. */
  _deviceNames() {
    const device = this._hass?.devices?.[this._deviceId()];
    return [device?.name_by_user, device?.name].filter(Boolean);
  }

  /** camera_entity holds the card to one unit, known to the device or not. */
  _overrideUnits(allUnits) {
    const camera = this._config.camera_entity;
    const match = allUnits.filter((unit) => unit.camera === camera);
    if (match.length) return match;
    const attrs = this._hass.states[camera]?.attributes || {};
    return [
      {
        camera,
        moduleId: attrs.module_id ?? null,
        name: shortName(this._hass, camera, this._deviceNames()),
        doorbell: null,
        event: null,
      },
    ];
  }

  /* ---------------------------------------------------- units and ringing */

  /** ?camera= picks the unit; read again only when the address changes. */
  _applyCameraParam() {
    if (!this._units.length) return;
    let wanted = null;
    try {
      wanted = new URLSearchParams(window.location.search).get(CAMERA_PARAM);
    } catch {
      return;
    }
    if (wanted === this._cameraParam) return;
    this._cameraParam = wanted;
    if (wanted && this._units.some((unit) => unit.camera === wanted)) this._selected = wanted;
  }

  _selectedUnit() {
    return this._units.find((unit) => unit.camera === this._selected) || this._units[0] || null;
  }

  _selectUnit(camera) {
    if (!camera || camera === this._selectedUnit()?.camera) return;
    this._selected = camera;
    // a live view follows the unit being looked at
    if (this._stream?.mode === 'video' && this._stream.entityId !== camera) {
      this._startStream(camera, 'video');
      return;
    }
    if (this._root) this._sync();
  }

  /** The camera that Answer, View and auto-answer act on right now. */
  _targetCamera(status = this._status()) {
    if (status.ringing && status.ringUnit) return status.ringUnit.camera;
    return this._selectedUnit()?.camera || null;
  }

  _subscribeCalls() {
    const connection = this._hass?.connection;
    if (!this.isConnected || typeof connection?.subscribeEvents !== 'function') return;
    if (this._callSub?.connection === connection) return;
    this._unsubscribeCalls();
    const sub = { connection, unsub: null, closed: false };
    this._callSub = sub;
    Promise.resolve()
      .then(() => connection.subscribeEvents((event) => this._onCallEvent(event), CALL_EVENT))
      .then((unsub) => {
        if (sub.closed) stopSubscription(unsub);
        else sub.unsub = unsub;
      })
      .catch(() => {
        // not an administrator, most likely: the doorbell sensors still say
        // when it rings, and their module_id says which unit
      });
  }

  _unsubscribeCalls() {
    const sub = this._callSub;
    this._callSub = null;
    if (!sub) return;
    sub.closed = true;
    stopSubscription(sub.unsub);
  }

  /** A ring or an end from the integration, for this device or another one. */
  _onCallEvent(event) {
    const data = event?.data || {};
    if (!this._hass || !this._found) return;
    const unit = this._unitForCall(data);
    if (!unit && !this._ownsEntry(data.entry_id)) return; // another intercom
    if (data.type === 'ring') {
      this._ring = {
        camera: unit?.camera || null,
        moduleName: data.module_name || null,
        snapshot: data.vignette_url || data.snapshot_url || null,
        at: Date.now(),
        seenOn: false,
      };
      clearTimeout(this._ringTimer);
      this._ringTimer = setTimeout(() => {
        this._ringTimer = null;
        if (this._root) this._sync();
      }, RING_TTL + 100);
    } else if (data.type === 'end') {
      if (!this._ring) return;
      const sameUnit = !unit || !this._ring.camera || this._ring.camera === unit.camera;
      if (!sameUnit) return;
      this._ring = null;
    } else {
      return;
    }
    if (this._root) this._sync();
  }

  _unitForCall(data) {
    const units = this._allUnits;
    return (
      (data.camera_entity_id && units.find((unit) => unit.camera === data.camera_entity_id)) ||
      (data.module_id && units.find((unit) => unit.moduleId === data.module_id)) ||
      (data.module_name && units.find((unit) => unit.name === data.module_name)) ||
      null
    );
  }

  _ownsEntry(entryId) {
    const deviceId = this._deviceId();
    if (!deviceId) return true;
    const entries = this._hass.devices?.[deviceId]?.config_entries;
    return !!entryId && Array.isArray(entries) && entries.includes(entryId);
  }

  /**
   * Whether this card rings, and which unit does: the one the bus named, else
   * the one whose doorbell is on, else the only one there is.
   */
  _ringState() {
    const hass = this._hass;
    const isOn = (id) => hass.states[id]?.state === 'on';
    const anyOn = this._found.doorbells.some(isOn);
    let ring = this._ring;
    if (ring) {
      if (anyOn) ring.seenOn = true;
      // the sensor going quiet after it rang is the end, should the bus miss it
      if (Date.now() - ring.at > RING_TTL || (ring.seenOn && !anyOn)) {
        this._ring = null;
        ring = null;
      }
    }
    if (!ring && !anyOn) return { ringing: false, unit: null, ring: null };

    const units = this._allUnits;
    const unit =
      (ring?.camera && units.find((item) => item.camera === ring.camera)) ||
      units.find((item) => item.doorbell && isOn(item.doorbell)) ||
      (units.length === 1 ? units[0] : null);
    // a card held to one unit stays quiet while another one rings
    if (unit && !this._units.some((item) => item.camera === unit.camera)) {
      return { ringing: false, unit: null, ring: null };
    }
    return { ringing: true, unit: unit || null, ring };
  }

  /* -------------------------------------------------------- kiosk shape */

  /** A kiosk lays out by its own shape: controls beside the picture or under it. */
  _observeSize() {
    if (this._config?.layout !== 'kiosk' || !this.isConnected) {
      this._unobserveSize();
      return;
    }
    if (this._resizeObserver || this._onWindowResize) return;
    if (typeof window.ResizeObserver === 'function') {
      this._resizeObserver = new window.ResizeObserver((entries) => {
        const box = entries[entries.length - 1]?.contentRect;
        if (box) this._setOrient(box.width, box.height);
      });
      this._resizeObserver.observe(this);
    } else {
      // an old WebView: the screen's shape is the next best thing
      this._onWindowResize = () => this._setOrient(window.innerWidth, window.innerHeight);
      window.addEventListener('resize', this._onWindowResize);
      this._onWindowResize();
    }
  }

  _unobserveSize() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    if (this._onWindowResize) window.removeEventListener('resize', this._onWindowResize);
    this._onWindowResize = null;
  }

  _setOrient(width, height) {
    if (!width || !height) return;
    const orient = width >= height ? 'landscape' : 'portrait';
    if (orient === this._orient) return;
    // In a container without a height of its own, each shape could measure as
    // the other one; a few flips in a second means that, so stay put.
    const now = Date.now();
    this._flips = (this._flips || []).filter((at) => now - at < 1000);
    if (this._flips.length >= 4) return;
    this._flips.push(now);
    this._orient = orient;
    if (this._root) this._root.card.dataset.orient = orient;
  }

  _orientation() {
    if (this._orient) return this._orient;
    const width = window.innerWidth || 0;
    const height = window.innerHeight || 0;
    return width && height && width < height ? 'portrait' : 'landscape';
  }

  _renderNotice(message) {
    this.shadowRoot.innerHTML = '';
    this._root = null;
    const style = el('style', { text: STYLE });
    const alert = el('div', { class: 'alert' }, [
      icon('mdi:information-outline'),
      el('div', { class: 'text', text: message }),
    ]);
    const card = el('ha-card', {}, [el('div', { class: 'card' }, [alert])]);
    this.shadowRoot.append(style, card);
  }

  _build() {
    const hass = this._hass;
    const interactive = this._config.layout === 'device';
    this.shadowRoot.innerHTML = '';

    // the caches below point at nodes that are about to be thrown away: keeping
    // them would leave the rebuilt card without its badges and buttons
    this._badgeSignature = null;
    this._buttonSignature = null;
    this._listSignature = null;
    this._badgeNodes = {};
    this._buttonNodes = {};

    const nodes = {};
    nodes.icon = icon('mdi:doorbell-video');
    nodes.primary = el('div', { class: 'primary' });
    nodes.secondary = el('div', { class: 'secondary' });
    nodes.dot = el('div', { class: 'live-dot' });
    nodes.head = el(
      'div',
      {
        class: 'head',
        role: 'button',
        tabindex: '0',
        onclick: () => this._openMoreInfo(this._primaryEntity()),
        onkeydown: (ev) => this._activate(ev, () => this._openMoreInfo(this._primaryEntity())),
      },
      [
        el('div', { class: 'tile-icon' }, [nodes.icon]),
        el('div', { class: 'tile-info' }, [nodes.primary, nodes.secondary]),
        nodes.dot,
      ],
    );

    nodes.screenImg = el('img', { alt: '', decoding: 'async', loading: 'lazy' });
    nodes.screenImg.style.display = 'none';
    nodes.standbyText = el('span', { text: t(hass, 'standby') });
    nodes.screenPlaceholder = el('div', { class: 'placeholder' }, [icon('mdi:cctv'), nodes.standbyText]);
    nodes.screen = el(
      'button',
      {
        class: 'screen',
        type: 'button',
        onclick: (ev) => {
          ev.stopPropagation();
          this._openMoreInfo(this._targetCamera() || this._found.snapshot);
        },
      },
      [nodes.screenImg, nodes.screenPlaceholder],
    );

    nodes.device = el('div', { class: 'device', html: deviceSvg(interactive) });
    nodes.device.appendChild(nodes.screen);
    nodes.deviceWrap = el('div', { class: 'device-wrap' }, [
      nodes.device,
      el('div', { class: 'device-caption', text: 'Classe 100X' }),
    ]);

    if (interactive) this._wireKeys(nodes.device);

    nodes.badges = el('div', { class: 'badges' });
    nodes.units = el('div', { class: 'units', role: 'radiogroup', onkeydown: (ev) => this._unitKey(ev) });
    nodes.units.hidden = true;
    nodes.features = el('div', { class: 'features' });
    nodes.content = el('div', { class: 'content' }, [nodes.badges, nodes.units, nodes.features]);

    // the visitor at full width: while it rings, and always in a kiosk
    nodes.shotImg = el('img', { alt: '', decoding: 'async' });
    nodes.shotImg.hidden = true;
    nodes.shotImg.addEventListener('load', () => this._applyShotAspect());
    nodes.shotImg.addEventListener('error', () => this._shotFailed());
    nodes.shotEmptyText = el('span', { text: t(hass, 'standby') });
    nodes.shotEmpty = el('div', { class: 'shot-empty' }, [icon('mdi:cctv'), nodes.shotEmptyText]);
    nodes.shotDot = el('span', { class: 'shot-dot' });
    nodes.shotTitle = el('div', { class: 'shot-title' });
    nodes.shotSub = el('div', { class: 'shot-sub' });
    nodes.shotCaption = el('div', { class: 'shot-caption' }, [
      nodes.shotDot,
      el('div', { class: 'shot-text' }, [nodes.shotTitle, nodes.shotSub]),
    ]);
    nodes.shot = el('div', { class: 'shot' }, [nodes.shotImg, nodes.shotEmpty, nodes.shotCaption]);
    nodes.shot.hidden = true;

    nodes.video = el('video', { class: 'stream-video', autoplay: '', playsinline: '' });
    nodes.video.muted = false;
    // a track can change size mid-call, so listen to both events
    nodes.video.addEventListener('loadedmetadata', () => this._applyVideoAspect());
    nodes.video.addEventListener('resize', () => this._applyVideoAspect());
    nodes.overlayIcon = icon('mdi:phone-in-talk');
    nodes.overlayText = el('span');
    nodes.overlay = el('div', { class: 'stream-overlay' }, [nodes.overlayIcon, nodes.overlayText]);
    nodes.streamIcon = icon('mdi:video');
    nodes.streamText = el('span');
    nodes.streamLabel = el('div', { class: 'stream-label' }, [nodes.streamIcon, nodes.streamText]);
    nodes.micButton = el('button', { class: 'icon-button', type: 'button', onclick: () => this._toggleMic() }, [
      icon('mdi:microphone-off'),
    ]);
    nodes.soundButton = el('button', { class: 'icon-button', type: 'button', onclick: () => this._toggleSound() }, [
      icon('mdi:volume-high'),
    ]);
    nodes.streamControls = el('div', { class: 'stream-controls' }, [nodes.micButton, nodes.soundButton]);
    nodes.micNoteText = el('span');
    nodes.micNote = el('div', { class: 'stream-note', role: 'status' }, [
      icon('mdi:microphone-off'),
      nodes.micNoteText,
    ]);
    nodes.micNote.hidden = true;
    nodes.stream = el('div', { class: 'stream' }, [
      nodes.video,
      nodes.overlay,
      nodes.streamLabel,
      nodes.micNote,
      nodes.streamControls,
    ]);
    nodes.stream.hidden = true;

    nodes.body = el('div', { class: 'body' }, [nodes.deviceWrap, nodes.shot, nodes.stream, nodes.content]);

    nodes.expander = el(
      'button',
      {
        class: 'expander',
        type: 'button',
        'aria-expanded': 'false',
        onclick: () => this._toggleHistory(),
      },
      [
        icon('mdi:history'),
        el('span', { class: 'label', text: t(hass, 'recent') }),
        el('ha-icon', { class: 'chev', icon: 'mdi:chevron-down' }),
      ],
    );
    nodes.expanderLabel = nodes.expander.querySelector('.label');
    nodes.calls = el('div', { class: 'calls' });
    nodes.showAllLabel = el('span', { text: t(hass, 'show_all') });
    nodes.showAll = el('button', { class: 'show-all', type: 'button', onclick: () => this._openAllCalls() }, [
      nodes.showAllLabel,
      el('ha-icon', { icon: 'mdi:chevron-right' }),
    ]);
    nodes.showAll.style.display = 'none';
    nodes.empty = el('div', { class: 'empty', text: t(hass, 'never') });
    nodes.empty.style.display = 'none';
    nodes.history = el('div', { class: 'history' }, [nodes.calls, nodes.showAll, nodes.empty]);
    nodes.history.hidden = true;

    nodes.card = el('div', { class: 'card' }, [nodes.head, nodes.body, nodes.expander, nodes.history]);

    nodes.dialogImg = el('img', { alt: '' });
    nodes.dialogTitle = el('div', { class: 'dialog-title' });
    nodes.dialog = el('dialog', {}, [
      el('div', { class: 'dialog-header' }, [
        nodes.dialogTitle,
        closeButton(t(hass, 'close'), () => nodes.dialog.close()),
      ]),
      el('div', { class: 'dialog-content' }, [nodes.dialogImg]),
    ]);

    nodes.allCalls = el('div', { class: 'calls' });
    nodes.listDialog = el('dialog', {}, [
      el('div', { class: 'dialog-header' }, [
        el('div', { class: 'dialog-title', text: t(hass, 'recent') }),
        closeButton(t(hass, 'close'), () => nodes.listDialog.close()),
      ]),
      el('div', { class: 'dialog-content' }, [nodes.allCalls]),
    ]);

    this.shadowRoot.append(
      el('style', { text: STYLE }),
      el('ha-card', {}, [nodes.card, nodes.listDialog, nodes.dialog]),
    );
    this._root = nodes;
  }

  _wireKeys(deviceNode) {
    const run = (name) => {
      const found = this._found;
      const status = this._status();
      if (!status.reachable && name !== 'bt-hangup') return;
      const target = this._targetCamera(status);
      switch (name) {
        case 'bt-lock':
          this._openDoor(found.locks[0]);
          break;
        case 'bt-star':
          this._toggleLight(found.lights[0]);
          break;
        case 'bt-eye':
        case 'bt-answer':
          if (target) this._toggleStream(target, 'video');
          else this._openMoreInfo(found.snapshot);
          break;
        case 'bt-hangup':
          this._reject();
          break;
        default:
          break;
      }
    };
    for (const key of deviceNode.querySelectorAll(".bt-key[role='button']")) {
      const name = key.dataset.key;
      key.addEventListener('click', () => run(name));
      key.addEventListener('keydown', (ev) => this._activate(ev, () => run(name)));
    }
  }

  _activate(ev, action) {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    action();
  }

  /* ---------------------------------------------------------- derived state */

  _status() {
    const hass = this._hass;
    const found = this._found;
    const ring = this._ringState();
    const ringing = ring.ringing;
    const talking = !ringing && hass.states[found.busy]?.state === 'on';
    const reachable = found.all.some((id) => hass.states[id] && hass.states[id].state !== 'unavailable');
    return { ringing, ringUnit: ring.unit, ring: ring.ring, talking, reachable, active: ringing || talking };
  }

  /** Who is at the door, in a word: the unit, else the device. */
  _ringName(status) {
    return status.ringUnit?.name || status.ring?.moduleName || this._deviceName();
  }

  _primaryEntity() {
    const found = this._found;
    return found.liveCameras[0] || found.doorbells[0] || found.snapshot || found.locks[0] || found.all[0];
  }

  _deviceName() {
    const hass = this._hass;
    if (this._config.name) return this._config.name;
    const device = hass.devices?.[this._deviceId()];
    if (device) return device.name_by_user || device.name;
    const primary = hass.states[this._primaryEntity()];
    return primary?.attributes.friendly_name || 'BTicino';
  }

  /** The moment of the last call, from whichever entity reports it. */
  _lastCallDate() {
    const hass = this._hass;
    const found = this._found;
    const direct = hass.states[found.lastCall];
    if (hasValue(direct)) {
      const parsed = parseDate(direct.state);
      if (parsed) return parsed;
    }
    const snapshot = hass.states[found.snapshot];
    const stamp = snapshot?.attributes.event_time_iso;
    return parseDate(stamp);
  }

  /* ------------------------------------------------------------------ sync */

  _sync() {
    const hass = this._hass;
    const nodes = this._root;
    const config = this._config;
    const status = this._status();
    const kiosk = config.layout === 'kiosk';

    const classes = ['card'];
    if (status.ringing) classes.push('ringing');
    if (status.talking) classes.push('talking');
    if (!status.reachable) classes.push('offline');
    nodes.card.className = classes.join(' ');
    nodes.card.dataset.layout = config.layout;
    if (kiosk) nodes.card.dataset.orient = this._orientation();
    else delete nodes.card.dataset.orient;
    const width = Number(config.device_size) || DEVICE_WIDTH[config.layout] || 140;
    nodes.card.style.setProperty('--bt-device-width', `${width}px`);
    nodes.card.style.setProperty(
      '--tile-color',
      !status.reachable
        ? 'var(--state-unavailable-color, var(--disabled-color, #bdbdbd))'
        : status.active
          ? 'var(--bt-accent)'
          : // the inactive grey is 2.3:1 on a light card; the secondary text colour
            // is the same quiet grey family at 4.8:1, and an icon needs 3:1
            'var(--secondary-text-color, #727272)',
    );

    this._syncStrings();

    nodes.icon.setAttribute(
      'icon',
      config.icon || (status.ringing ? 'mdi:bell-ring' : status.talking ? 'mdi:phone-in-talk' : 'mdi:doorbell-video'),
    );
    nodes.primary.textContent = this._deviceName();

    const lastCall = this._lastCallDate();
    const stateText = !status.reachable
      ? t(hass, 'unavailable')
      : status.ringing
        ? t(hass, 'ringing')
        : status.talking
          ? t(hass, 'talking')
          : t(hass, 'idle');
    // The last call is said once: in its badge when badges show, here otherwise.
    const badges = config.show_badges && !kiosk && !status.ringing;
    // while it rings, the picture's caption names the unit: said once
    let secondary = stateText;
    if (!status.ringing && !(badges && lastCall)) {
      secondary = lastCall
        ? `${stateText} - ${t(hass, 'last_call')} ${relativeTime(hass, lastCall)}`
        : `${stateText} - ${t(hass, 'never')}`;
    }
    nodes.secondary.textContent = secondary;

    // While it rings the drawing steps aside for the visitor; a stream, when
    // one is up, takes the same place. compact and kiosk never draw it.
    const drawn = config.layout === 'panel' || config.layout === 'device';
    nodes.deviceWrap.hidden = !drawn || !!this._stream || status.ringing;

    this._syncStream();
    this._syncShot(status);
    this._syncScreen(status);
    this._syncKeys(status);
    this._syncUnits(status);

    nodes.badges.style.display = badges ? '' : 'none';
    if (badges) this._syncBadges(lastCall);

    // once the lock reports open, the request is no longer under way
    if (this._pendingLock && LOCK_OPEN_STATES.includes(hass.states[this._pendingLock]?.state)) {
      this._clearPendingLock();
    }

    // answering cannot depend on a switch meant to tidy the idle card
    const controls = config.show_controls || status.ringing;
    nodes.features.style.display = controls ? '' : 'none';
    if (controls) this._syncButtons(status);

    this._syncHistory(lastCall, status);
  }

  /** The labels written once at build time still have to follow the language. */
  _syncStrings() {
    const hass = this._hass;
    const nodes = this._root;
    const close = t(hass, 'close');
    nodes.standbyText.textContent = t(hass, 'standby');
    nodes.shotEmptyText.textContent = t(hass, 'standby');
    nodes.expanderLabel.textContent = t(hass, 'recent');
    nodes.empty.textContent = t(hass, 'never');
    nodes.units.setAttribute('aria-label', t(hass, 'unit'));
    nodes.listDialog.querySelector('.dialog-title').textContent = t(hass, 'recent');
    for (const button of this.shadowRoot.querySelectorAll('dialog .icon-button')) {
      button.setAttribute('aria-label', close);
      button.title = close;
    }
  }

  /** The picture of the device's last call, fetched again when it changes. */
  _snapshotUrl() {
    const snapshot = this._hass.states[this._found.snapshot];
    const attrs = snapshot?.attributes || {};
    return freshUrl(attrs.entity_picture, attrs.event_time_iso || snapshot?.last_changed);
  }

  /**
   * What the large picture shows. While it rings: the frame the bus sent with
   * the ring, else the last call's. With several units, idle: the selected
   * unit's own last caller, which its camera serves as its still picture.
   */
  _shotSource(status) {
    if (status.ringing) {
      const fromRing = status.ring?.snapshot;
      if (fromRing && !this._badShots.has(fromRing)) return fromRing;
      return this._snapshotUrl();
    }
    if (this._units.length > 1) {
      const camera = this._hass.states[this._selectedUnit()?.camera];
      const url = freshUrl(camera?.attributes.entity_picture, this._lastCallDate()?.getTime());
      return url && !this._badShots.has(url) ? url : null;
    }
    return this._snapshotUrl();
  }

  _syncShot(status) {
    const hass = this._hass;
    const nodes = this._root;
    const kiosk = this._config.layout === 'kiosk';
    const show = (status.ringing || kiosk) && !this._stream;
    nodes.shot.hidden = !show;
    if (!show) return;

    const src = this._shotSource(status);
    if (src) {
      if (nodes.shotImg.getAttribute('src') !== src) {
        nodes.shot.style.removeProperty('--bt-shot-aspect');
        nodes.shotImg.setAttribute('src', src);
      }
      nodes.shotImg.hidden = false;
      nodes.shotEmpty.hidden = true;
    } else {
      nodes.shotImg.removeAttribute('src');
      nodes.shotImg.hidden = true;
      nodes.shotEmpty.hidden = false;
    }

    let title = '';
    let sub = '';
    if (status.ringing) {
      title = this._ringName(status);
      sub = t(hass, 'ringing');
    } else if (this._units.length > 1) {
      title = this._selectedUnit()?.name || '';
    } else if (src) {
      const taken = parseDate(hass.states[this._found.snapshot]?.attributes.event_time_iso);
      sub = taken ? formatDateTime(hass, taken) : '';
    }
    nodes.shotTitle.textContent = title;
    nodes.shotSub.textContent = sub;
    nodes.shotDot.hidden = !status.ringing;
    nodes.shotCaption.hidden = !title && !sub;
    nodes.shotImg.setAttribute('alt', title || this._deviceName());
  }

  /** Size the picture to what the device took, so nothing is cropped. */
  _applyShotAspect() {
    const img = this._root?.shotImg;
    if (!img?.naturalWidth || !img?.naturalHeight) return;
    this._root.shot.style.setProperty('--bt-shot-aspect', `${img.naturalWidth} / ${img.naturalHeight}`);
  }

  /** A link that expired or a unit without a picture yet: show the next best. */
  _shotFailed() {
    const src = this._root?.shotImg.getAttribute('src');
    if (!src || this._badShots.has(src)) return;
    this._badShots.add(src);
    if (this._root) this._sync();
  }

  _syncScreen(status) {
    const hass = this._hass;
    const nodes = this._root;
    const picture = this._snapshotUrl();

    if (picture) {
      if (nodes.screenImg.getAttribute('src') !== picture) nodes.screenImg.setAttribute('src', picture);
      nodes.screenImg.style.display = '';
      nodes.screenPlaceholder.style.display = 'none';
    } else {
      nodes.screenImg.removeAttribute('src');
      nodes.screenImg.style.display = 'none';
      nodes.screenPlaceholder.style.display = '';
    }

    const target = this._targetCamera(status) || this._found.snapshot;
    nodes.screen.setAttribute('aria-label', `${this._deviceName()} - ${t(hass, 'live')}`);
    nodes.screen.disabled = !target || !status.reachable;
  }

  _syncKeys(status) {
    const nodes = this._root;
    const hass = this._hass;
    const found = this._found;
    const svg = nodes.device;
    const mark = (selector, on, available) => {
      const node = svg.querySelector(selector);
      if (!node) return;
      node.classList.toggle('on', !!on);
      node.classList.toggle('off', available === false);
    };
    const online = status.reachable;
    const unlocked = found.locks.some((id) => LOCK_OPEN_STATES.includes(hass.states[id]?.state));
    mark('.bt-lock', unlocked, online && found.locks.length > 0);
    mark(
      '.bt-star',
      found.lights.some((id) => hass.states[id]?.state === 'on'),
      online && found.lights.length > 0,
    );
    const canSee = online && (found.liveCameras.length > 0 || !!found.snapshot);
    mark('.bt-eye', false, canSee);
    mark('.bt-answer', status.talking, canSee);
    mark('.bt-hangup', false, status.ringing || status.talking);

    const wifi = svg.querySelector('.bt-bell');
    if (wifi) wifi.classList.toggle('on', status.ringing);
  }

  /** One segment per external unit, while idle and only when there is a choice. */
  _syncUnits(status) {
    const nodes = this._root;
    const units = this._units;
    const show = units.length > 1 && !status.ringing;
    nodes.units.hidden = !show;
    if (!show) return;

    const signature = units.map((unit) => `${unit.camera}:${unit.name}`).join('|');
    if (signature !== this._unitSignature) {
      nodes.units.innerHTML = '';
      for (const unit of units) {
        const button = el(
          'button',
          {
            class: 'unit',
            type: 'button',
            role: 'radio',
            'data-camera': unit.camera,
            onclick: () => this._selectUnit(unit.camera),
          },
          [icon('mdi:check'), el('span', { class: 'text', text: unit.name })],
        );
        button.title = unit.name;
        nodes.units.appendChild(button);
      }
      this._unitSignature = signature;
    }
    const selected = this._selectedUnit()?.camera;
    for (const button of nodes.units.querySelectorAll('.unit')) {
      const checked = button.dataset.camera === selected;
      button.setAttribute('aria-checked', checked ? 'true' : 'false');
      // one stop in the tab order; the arrow keys move inside the group
      button.tabIndex = checked ? 0 : -1;
    }
  }

  /** Arrow keys walk the units, the way a radio group does. */
  _unitKey(ev) {
    let step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
    const units = this._units;
    if (!step || !units.length) return;
    ev.preventDefault();
    if (ev.key.endsWith('Left') || ev.key.endsWith('Right')) {
      if (getComputedStyle(this).direction === 'rtl') step = -step;
    }
    const index = Math.max(0, units.indexOf(this._selectedUnit()));
    const next = units[(index + step + units.length) % units.length];
    this._selectUnit(next.camera);
    const buttons = this._root ? [...this._root.units.querySelectorAll('.unit')] : [];
    buttons.find((button) => button.dataset.camera === next.camera)?.focus();
  }

  _syncBadges(lastCall) {
    const hass = this._hass;
    const nodes = this._root;
    const found = this._found;
    const badges = [];

    if (lastCall) {
      badges.push({
        key: 'last',
        icon: 'mdi:phone-clock',
        label: t(hass, 'last_call'),
        value: relativeTime(hass, lastCall),
        title: formatDateTime(hass, lastCall),
        entity: found.lastCall,
      });
    }

    const calls = hass.states[found.calls];
    if (hasValue(calls)) {
      const answered = calls.attributes.answered ?? 0;
      const missed = calls.attributes.missed ?? 0;
      const number = (value) => new Intl.NumberFormat(numberLocale(hass)).format(value);
      badges.push({
        key: 'calls',
        icon: 'mdi:phone-log',
        label: t(hass, 'calls'),
        value: missed > 0 ? `${number(calls.state)} - ${number(missed)} ${t(hass, 'missed')}` : number(calls.state),
        title: `${number(answered)} ${t(hass, 'answered')}, ${number(missed)} ${t(hass, 'missed')}`,
        entity: found.calls,
      });
    }

    const signature = badges.map((b) => b.key).join('|');
    if (this._badgeSignature !== signature) {
      nodes.badges.innerHTML = '';
      this._badgeNodes = {};
      for (const badge of badges) {
        const value = el('div', { class: 'value' });
        const node = el(
          'div',
          {
            class: 'badge',
            role: badge.entity ? 'button' : undefined,
            tabindex: badge.entity ? '0' : undefined,
            onclick: badge.entity ? () => this._openMoreInfo(badge.entity) : undefined,
            onkeydown: badge.entity ? (ev) => this._activate(ev, () => this._openMoreInfo(badge.entity)) : undefined,
          },
          [icon(badge.icon), el('div', { class: 'stack' }, [el('div', { class: 'label', text: badge.label }), value])],
        );
        if (badge.entity) node.style.cursor = 'pointer';
        nodes.badges.appendChild(node);
        this._badgeNodes[badge.key] = {
          node,
          value,
          label: node.querySelector('.label'),
          icon: node.querySelector('ha-icon'),
        };
      }
      this._badgeSignature = signature;
    }

    for (const badge of badges) {
      const refs = this._badgeNodes[badge.key];
      if (!refs) continue;
      refs.value.textContent = badge.value;
      refs.label.textContent = badge.label;
      refs.icon.setAttribute('icon', badge.icon);
      refs.node.style.setProperty('--badge-color', badge.color || 'var(--secondary-text-color)');
      if (badge.title) refs.node.title = badge.title;
    }
  }

  _lockButtons(status) {
    const hass = this._hass;
    const found = this._found;
    return found.locks.slice(0, 3).map((id) => {
      const stateObj = hass.states[id];
      const name = found.locks.length > 1 ? stateObj?.attributes.friendly_name || id : t(hass, 'open_door');
      // the door only stays open for a few seconds, so the button is the receipt
      const isOpen = LOCK_OPEN_STATES.includes(stateObj?.state);
      const waiting = this._pendingLock === id && !isOpen;
      return {
        key: `lock-${id}`,
        icon: isOpen ? 'mdi:lock-open-variant' : waiting ? 'mdi:dots-horizontal' : 'mdi:door-open',
        text: isOpen ? t(hass, 'door_open') : waiting ? t(hass, 'opening') : name,
        variant: isOpen ? 'success' : waiting || status.ringing ? 'tonal' : '',
        disabled: !hasValue(stateObj),
        action: () => this._openDoor(id),
      };
    });
  }

  /** View, Answer or Hang up: the same call, on the unit that matters now. */
  _liveButton(status) {
    const hass = this._hass;
    const found = this._found;
    if (!found.liveCameras.length && !found.snapshot) return null;
    const target = this._targetCamera(status);
    const watching = this._stream?.mode === 'video' && (!target || this._stream.entityId === target);
    const usable = status.reachable && (!target || hass.states[target]?.state !== 'unavailable');
    let liveIcon = 'mdi:video-outline';
    let liveText = t(hass, 'live');
    let liveVariant = '';
    if (watching) {
      liveIcon = 'mdi:phone-hangup';
      liveText = t(hass, 'hang_up');
      liveVariant = 'tonal';
    } else if (status.ringing) {
      liveIcon = 'mdi:phone';
      liveText = t(hass, 'answer');
      liveVariant = 'success';
    }
    return {
      key: 'live',
      icon: liveIcon,
      text: liveText,
      variant: liveVariant,
      calling: liveVariant === 'success',
      // hanging up works whatever the device says; starting a call does not
      disabled: !watching && !usable,
      target,
      action: target ? () => this._toggleStream(target, 'video') : () => this._openMoreInfo(found.snapshot),
    };
  }

  _rejectButton() {
    return {
      key: 'reject',
      icon: 'mdi:phone-hangup',
      text: t(this._hass, 'reject'),
      variant: 'danger',
      disabled: false,
      action: () => this._reject(),
    };
  }

  _syncButtons(status) {
    const hass = this._hass;
    const nodes = this._root;
    const found = this._found;
    const kiosk = this._config.layout === 'kiosk';
    const live = this._liveButton(status);
    const buttons = [];

    if (status.ringing) {
      // Answer, Open door, Reject: the three things a ring asks for, in that order
      if (live) buttons.push(live);
      buttons.push(...this._lockButtons(status));
      if (!this._stream) buttons.push(this._rejectButton());
    } else {
      buttons.push(...this._lockButtons(status));

      if (found.lights.length) {
        const id = found.lights[0];
        const stateObj = hass.states[id];
        const lightOn = stateObj?.state === 'on';
        buttons.push({
          key: 'light',
          icon: lightOn ? 'mdi:lightbulb-on' : 'mdi:lightbulb-outline',
          text: t(hass, 'light'),
          variant: lightOn ? 'tonal' : '',
          disabled: !hasValue(stateObj),
          action: () => this._toggleLight(id),
        });
      }

      if (live) buttons.push(live);

      // Dialling the indoor monitor makes no sense while the door is ringing.
      if (found.callHome && !status.talking) {
        const calling = this._stream?.mode === 'audio';
        buttons.push({
          key: 'call-home',
          icon: calling ? 'mdi:phone-hangup' : 'mdi:home-outline',
          text: t(hass, calling ? 'hang_up' : 'call_home'),
          variant: calling ? 'tonal' : '',
          disabled: !calling && (!status.reachable || hass.states[found.callHome]?.state === 'unavailable'),
          action: () => this._toggleStream(found.callHome, 'audio'),
        });
      }

      if (status.talking && !this._stream) buttons.push(this._rejectButton());

      // a kiosk keeps the call log behind one button instead of a drawer
      if (kiosk && this._config.show_history) {
        buttons.push({
          key: 'history',
          icon: 'mdi:history',
          text: t(hass, 'recent'),
          variant: '',
          disabled: false,
          action: () => this._openAllCalls(),
        });
      }
    }

    nodes.features.dataset.mode = status.ringing ? 'ring' : 'idle';
    const signature = buttons.map((b) => b.key).join('|');
    if (this._buttonSignature !== signature) {
      nodes.features.innerHTML = '';
      this._buttonNodes = {};
      for (const button of buttons) {
        const label = el('span', { class: 'text', text: button.text });
        const node = el('button', { class: 'button', type: 'button' }, [icon(button.icon), label]);
        node.title = button.text;
        node.setAttribute('aria-label', button.text);
        nodes.features.appendChild(node);
        this._buttonNodes[button.key] = { node, label, icon: node.querySelector('ha-icon') };
      }
      this._buttonSignature = signature;
      nodes.features.dataset.count = String(buttons.length);
    }

    for (const button of buttons) {
      const refs = this._buttonNodes[button.key];
      if (!refs) continue;
      refs.node.className = `button ${button.variant}${button.calling ? ' calling' : ''}`.trim();
      refs.node.disabled = button.disabled;
      // the action follows the unit that rings, so it is bound on every pass
      refs.node.onclick = button.action;
      if (button.target) refs.node.dataset.target = button.target;
      else delete refs.node.dataset.target;
      refs.label.textContent = button.text;
      refs.icon.setAttribute('icon', button.icon);
      refs.node.title = button.text;
      refs.node.setAttribute('aria-label', button.text);
      // the flash confirms a door release, nothing else
      const justOpened = button.key.startsWith('lock-') && button.variant === 'success' && refs.variant !== 'success';
      if (justOpened) {
        refs.node.classList.remove('flash');
        void refs.node.offsetWidth; // restart the animation
        refs.node.classList.add('flash');
      }
      refs.variant = button.variant;
    }
  }

  /* ---------------------------------------------------------- live stream */

  _maybeAutoAnswer() {
    if (this._autoAnswerChecked || !this._config.auto_answer) return;
    this._autoAnswerChecked = true;
    if (autoAnswerTaken) return;

    let params;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    const wanted = params.get(AUTO_ANSWER_PARAM);
    if (!wanted) return;

    const found = this._found;
    const mode = found.liveCameras.includes(wanted) ? 'video' : found.callHome === wanted ? 'audio' : null;
    if (!mode) return; // the link names a camera another card owns
    if (mode === 'video') this._selected = wanted;

    autoAnswerTaken = true;
    // drop the parameter, so going back or reloading does not call again
    params.delete(AUTO_ANSWER_PARAM);
    const query = params.toString();
    try {
      history.replaceState(null, '', query ? `${location.pathname}?${query}` : location.pathname);
    } catch {
      /* the call matters more than a tidy address bar */
    }
    setTimeout(() => {
      if (this._root && !this._stream) this._startStream(wanted, mode);
    }, 300);
  }

  _toggleStream(entityId, mode) {
    if (!entityId) return;
    if (this._stream && this._stream.entityId === entityId) {
      this._stopStream();
      return;
    }
    this._startStream(entityId, mode);
  }

  _startStream(entityId, mode) {
    this._stopSession();
    const session = new BticinoCallSession(this._hass, {
      entityId,
      // the indoor monitor has no camera, so Call Home stays voice only
      wantsVideo: mode === 'video',
      onState: () => {
        if (this._session === session && this._root) this._syncStream();
      },
    });
    this._session = session;
    this._stream = { entityId, mode };
    this._soundOn = true;
    session.start();
    this._sync();
  }

  _stopStream() {
    this._stopSession();
    this._stream = null;
    if (this._root) this._sync();
  }

  _stopSession() {
    if (!this._session) return;
    const session = this._session;
    this._session = null;
    session.onState = () => {};
    session.stop();
    if (this._root) {
      this._root.video.srcObject = null;
      this._root.stream.style.removeProperty('--bt-video-aspect');
    }
  }

  /** Size the player to what the device sends, so nothing is letterboxed. */
  _applyVideoAspect() {
    const video = this._root?.video;
    if (!video?.videoWidth || !video?.videoHeight) return;
    this._root.stream.style.setProperty('--bt-video-aspect', `${video.videoWidth} / ${video.videoHeight}`);
  }

  _toggleMic() {
    this._session?.setMic(!this._session.micActive);
  }

  _toggleSound() {
    this._soundOn = !this._soundOn;
    this._syncStream();
  }

  _syncStream() {
    const hass = this._hass;
    const nodes = this._root;
    const stream = this._stream;
    const session = this._session;

    nodes.stream.hidden = !stream;
    if (!stream || !session) return;

    const audioOnly = stream.mode === 'audio';
    nodes.stream.className = audioOnly ? 'stream audio' : 'stream';

    if (nodes.video.srcObject !== session.stream) nodes.video.srcObject = session.stream;
    const hasVideo = !audioOnly && session.stream.getVideoTracks().length > 0;
    // keep the player in the layout while it connects, so the card does not
    // collapse and then jump back open when the first frame lands
    nodes.video.hidden = audioOnly;
    nodes.video.muted = !this._soundOn;
    if (hasVideo) nodes.video.play?.()?.catch(() => {});

    const live = session.state === CALL_STATE.LIVE;
    let overlayIcon = 'mdi:phone-in-talk';
    let overlayText = '';
    let pulsing = false;
    if (session.state === CALL_STATE.ERROR) {
      overlayIcon = 'mdi:phone-alert';
      overlayText = `${t(hass, 'call_failed')} - ${session.error || ''}`.trim();
    } else if (session.state === CALL_STATE.CONNECTING || session.state === CALL_STATE.RECONNECTING) {
      overlayIcon = 'mdi:loading';
      overlayText = t(hass, session.state);
      pulsing = true;
    } else if (audioOnly || !hasVideo) {
      overlayText = t(hass, 'audio_only');
    }
    // the warning belongs where it helps: while the call is not up
    if (!isChromium() && !live) {
      const warning = t(hass, 'browser_warning');
      overlayText = overlayText ? `${overlayText} - ${warning}` : warning;
    }

    nodes.overlay.hidden = hasVideo && live && overlayText === '';
    nodes.overlay.className = pulsing ? 'stream-overlay pulsing' : 'stream-overlay';
    nodes.overlayIcon.setAttribute('icon', overlayIcon);
    nodes.overlayText.textContent = overlayText;

    nodes.streamIcon.setAttribute('icon', audioOnly ? 'mdi:phone-in-talk' : 'mdi:video');
    // with several units, the label says which one is on screen
    const unit = this._units.length > 1 ? this._units.find((item) => item.camera === stream.entityId) : null;
    nodes.streamText.textContent = unit
      ? `${t(hass, 'live_now')} - ${unit.name}`
      : t(hass, audioOnly ? 'audio_only' : 'live_now');
    nodes.streamLabel.hidden = !live;

    const micOn = !!session.micActive;
    // a refused or missing microphone says so, in the user's language; a tap
    // on the button asks again
    const micError = !micOn && session.micError ? t(hass, `mic_${session.micError}`) : '';
    const micLabel = micError || t(hass, micOn ? 'mic_on' : 'mic_off');
    nodes.micButton.className = `icon-button${micOn ? ' on' : micError ? ' blocked' : ''}`;
    nodes.micButton.querySelector('ha-icon').setAttribute('icon', micOn ? 'mdi:microphone' : 'mdi:microphone-off');
    nodes.micButton.setAttribute('aria-label', micLabel);
    nodes.micButton.title = micLabel;
    nodes.micButton.disabled = !live;
    nodes.micNote.hidden = !micError;
    nodes.micNoteText.textContent = micError;

    nodes.soundButton.className = `icon-button${this._soundOn ? ' on' : ''}`;
    nodes.soundButton
      .querySelector('ha-icon')
      .setAttribute('icon', this._soundOn ? 'mdi:volume-high' : 'mdi:volume-off');
    nodes.soundButton.setAttribute('aria-label', t(hass, this._soundOn ? 'sound_on' : 'sound_off'));
    nodes.soundButton.title = t(hass, this._soundOn ? 'sound_on' : 'sound_off');
    nodes.soundButton.hidden = audioOnly && !live;
  }

  /* --------------------------------------------------------------- actions */

  async _call(domain, service, data) {
    try {
      await this._hass.callService(domain, service, data);
    } catch (err) {
      fireEvent(this, 'hass-notification', { message: err?.message ?? String(err) });
    }
  }

  _openDoor(entityId) {
    if (!entityId) return;
    const stateObj = this._hass.states[entityId];
    const supportsOpen = (stateObj?.attributes.supported_features || 0) & 1;
    // show it as under way at once, and give up on that if no state follows
    this._pendingLock = entityId;
    clearTimeout(this._pendingLockTimer);
    this._pendingLockTimer = setTimeout(() => {
      this._clearPendingLock();
      if (this._root) this._sync();
    }, 5000);
    this._call('lock', supportsOpen ? 'open' : 'unlock', { entity_id: entityId });
    this._sync();
  }

  _clearPendingLock() {
    this._pendingLock = null;
    clearTimeout(this._pendingLockTimer);
    this._pendingLockTimer = null;
  }

  _toggleLight(entityId) {
    if (!entityId) return;
    this._call('light', 'toggle', { entity_id: entityId });
  }

  _reject() {
    // the service sends a terminate, which tears the session down anyway
    if (this._stream) this._stopStream();
    this._call(DOMAIN, 'reject_call', {});
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;
    fireEvent(this, 'hass-more-info', { entityId });
  }

  /* ---------------------------------------------------------- recent calls */

  _toggleHistory() {
    this._expanded = !this._expanded;
    // Nothing is fetched until someone asks to see it.
    if (this._expanded && this._historyKey === null) this._loadHistory();
    this._syncHistory(this._lastCallDate());
  }

  _syncHistory(lastCall, status = this._status()) {
    const nodes = this._root;
    // a kiosk opens the log from a button; a ringing card has better things to show
    if (!this._config.show_history || this._config.layout === 'kiosk' || status.ringing) {
      nodes.expander.hidden = true;
      nodes.history.hidden = true;
      if (nodes.listDialog.open) this._paintAllCalls();
      return;
    }
    nodes.expander.hidden = false;
    nodes.expander.setAttribute('aria-expanded', this._expanded ? 'true' : 'false');

    const key = lastCall ? lastCall.toISOString() : 'none';
    if (key !== this._historyKey && this._expanded) {
      this._historyKey = key;
      this._loadHistory();
    }
    this._paintHistory();
  }

  async _loadHistory() {
    const hass = this._hass;
    if (this._historyBusy || !hass?.callWS) return;
    this._historyBusy = true;
    try {
      // The integration serves the log already signed, so one call is enough.
      const entryId = hass.devices?.[this._deviceId()]?.config_entries?.[0];
      const message = { type: `${DOMAIN}/history`, limit: HISTORY_LIMIT };
      if (entryId) message.entry_id = entryId;
      const result = await hass.callWS(message);
      this._history = (result?.events || []).filter((event) => event.timestamp);
      this._historyKey = this._lastCallDate()?.toISOString() ?? 'none';
    } catch {
      this._history = [];
    } finally {
      this._historyBusy = false;
      if (this._root) {
        this._paintHistory();
        if (this._root.listDialog.open) this._paintAllCalls();
      }
    }
  }

  /** How a stored call reads: answered, missed, or still open. */
  _outcome(event) {
    const hass = this._hass;
    if (event.answered === true) {
      return {
        key: 'answered',
        label: t(hass, 'call_answered'),
        icon: 'mdi:phone-check',
        color: 'var(--success-color, #43a047)',
      };
    }
    if (event.answered === false) {
      return {
        key: 'missed',
        label: t(hass, 'call_missed'),
        icon: 'mdi:phone-missed',
        color: 'var(--error-color, #db4437)',
      };
    }
    return {
      key: 'open',
      label: t(hass, 'call_open'),
      icon: 'mdi:phone-incoming',
      color: 'var(--secondary-text-color)',
    };
  }

  /** The time alone for calls from today, the date as well for older ones. */
  _callWhen(date) {
    const hass = this._hass;
    const now = new Date();
    const sameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    return sameDay ? formatTime(hass, date) : formatDateTime(hass, date);
  }

  _paintHistory() {
    const nodes = this._root;
    const events = this._history;
    if (nodes.listDialog.open) this._paintAllCalls();
    nodes.history.hidden = !this._expanded;
    if (!this._expanded) return;

    const loaded = Array.isArray(events);
    nodes.empty.style.display = loaded && !events.length ? '' : 'none';
    if (!loaded || !events.length) {
      nodes.calls.innerHTML = '';
      this._listSignature = null;
      return;
    }
    const signature = events.map((e) => `${e.event_id}:${e.answered}`).join('|');
    const more = events.length > HISTORY_PREVIEW;
    nodes.showAll.style.display = more ? '' : 'none';
    nodes.showAllLabel.textContent = more
      ? `${t(this._hass, 'show_all')} (${events.length})`
      : t(this._hass, 'show_all');

    if (signature !== this._listSignature) {
      this._renderCalls(nodes.calls, events.slice(0, HISTORY_PREVIEW));
      this._listSignature = signature;
    }
  }

  /** The whole log, in its dialog; drawn again only when it changed. */
  _paintAllCalls() {
    const nodes = this._root;
    const events = this._history;
    const signature = Array.isArray(events) ? events.map((e) => `${e.event_id}:${e.answered}`).join('|') : null;
    if (signature === this._allSignature) return;
    this._allSignature = signature;
    if (!Array.isArray(events)) {
      nodes.allCalls.innerHTML = '';
      return;
    }
    this._renderCalls(nodes.allCalls, events);
    if (!events.length) nodes.allCalls.appendChild(el('div', { class: 'empty', text: t(this._hass, 'never') }));
  }

  /** One row per call: snapshot, outcome, when. */
  _renderCalls(container, events) {
    container.innerHTML = '';
    for (const event of events) {
      const outcome = this._outcome(event);
      const when = this._callWhen(new Date(event.timestamp * 1000));
      const picture = event.vignette || event.snapshot;
      const row = el('button', { class: 'call', type: 'button', onclick: () => this._openShot(event) }, [
        picture
          ? el('img', { class: 'thumb', src: picture, alt: '', loading: 'lazy', decoding: 'async' })
          : el('div', { class: 'no-thumb' }, [icon(outcome.icon)]),
        el('div', { class: 'info' }, [
          el('div', { class: 'outcome' }, [icon(outcome.icon), el('span', { text: outcome.label })]),
          el('div', { class: 'where', text: event.module_name || event.module_id || '' }),
        ]),
        el('div', { class: 'when', text: when }),
      ]);
      row.style.setProperty('--call-color', outcome.color);
      row.setAttribute('aria-label', `${outcome.label} - ${when}`);
      container.appendChild(row);
    }
  }

  _openAllCalls() {
    const nodes = this._root;
    // a kiosk opens the log without the drawer, so it may not be loaded yet
    const key = this._lastCallDate()?.toISOString() ?? 'none';
    if (this._history === null || key !== this._historyKey) {
      this._historyKey = key;
      this._loadHistory();
    }
    this._allSignature = undefined;
    this._paintAllCalls();
    if (typeof nodes.listDialog.showModal === 'function' && !nodes.listDialog.open) nodes.listDialog.showModal();
  }

  _openShot(event) {
    const nodes = this._root;
    const picture = event.snapshot || event.vignette;
    if (!picture) return;
    const outcome = this._outcome(event);
    const when = this._callWhen(new Date(event.timestamp * 1000));
    nodes.dialogTitle.textContent = `${outcome.label} - ${when}`;
    nodes.dialogImg.setAttribute('src', picture);
    if (typeof nodes.dialog.showModal === 'function') nodes.dialog.showModal();
  }
}

/* ------------------------------------------------------------------ editor */

/** ha-form is defined by the first core editor that loads, so load one. */
async function loadHaForm() {
  if (customElements.get('ha-form')) return;
  try {
    const helpers = await window.loadCardHelpers?.();
    const card = await helpers?.createCardElement({ type: 'entities', entities: [] });
    await card?.constructor?.getConfigElement?.();
  } catch {
    /* the editor simply stays empty until ha-form shows up */
  }
}

const editorSchema = (hass, config) => [
  { name: 'device_id', required: true, selector: { device: { filter: { integration: DOMAIN } } } },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'name', selector: { text: {} } },
      { name: 'icon', selector: { icon: {} } },
    ],
  },
  {
    name: 'layout',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'panel', label: te(hass, 'layout_panel') },
          { value: 'device', label: te(hass, 'layout_device') },
          { value: 'compact', label: te(hass, 'layout_compact') },
          { value: 'kiosk', label: te(hass, 'layout_kiosk') },
        ],
      },
    },
  },
  { name: 'color', selector: { ui_color: { include_none: false } } },
  // the size only means something while the drawing is on screen
  ...(config.layout === 'compact' || config.layout === 'kiosk'
    ? []
    : [
        {
          name: 'device_size',
          selector: {
            number: { min: 80, max: 320, step: 10, mode: 'slider', unit_of_measurement: 'px' },
          },
        },
      ]),
  {
    name: 'appearance',
    type: 'expandable',
    flatten: true,
    title: te(hass, 'appearance'),
    iconPath: 'M12,18.54L19.37,12.8L21,14.07L12,21.07L3,14.07L4.62,12.81L12,18.54M12,16L3,9L12,2L21,9L12,16Z',
    schema: [
      { name: 'show_badges', selector: { boolean: {} } },
      { name: 'show_controls', selector: { boolean: {} } },
      { name: 'show_history', selector: { boolean: {} } },
      { name: 'auto_answer', selector: { boolean: {} } },
    ],
  },
  {
    name: 'entities',
    type: 'expandable',
    flatten: true,
    title: te(hass, 'entities'),
    iconPath:
      'M3,5H9V11H3V5M5,7V9H7V7H5M11,7H21V9H11V7M11,15H21V17H11V15M5,20L1.5,16.5L2.91,15.09L5,17.17L9.59,12.59L11,14L5,20Z',
    schema: [
      { name: 'camera_entity', selector: { entity: { filter: { integration: DOMAIN, domain: 'camera' } } } },
      { name: 'lock_entity', selector: { entity: { filter: { integration: DOMAIN, domain: 'lock' } } } },
      { name: 'light_entity', selector: { entity: { filter: { integration: DOMAIN, domain: 'light' } } } },
    ],
  },
];

class Bticino100xCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    loadHaForm()
      .then(() => customElements.whenDefined('ha-form'))
      .then(() => this._render());
  }

  _render() {
    if (!this._hass || !this._config || !customElements.get('ha-form')) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.addEventListener('value-changed', (ev) => {
        const config = { ...ev.detail.value };
        for (const [key, value] of Object.entries(DEFAULTS)) if (config[key] === value) delete config[key];
        // a size that matches the layout's own default adds nothing to the YAML
        const fallback = DEVICE_WIDTH[config.layout || DEFAULTS.layout] || 140;
        const drawless = config.layout === 'compact' || config.layout === 'kiosk';
        if (drawless || Number(config.device_size) === fallback) delete config.device_size;
        for (const key of Object.keys(config)) if (config[key] === '' || config[key] === undefined) delete config[key];
        fireEvent(this, 'config-changed', { config });
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    const data = { ...DEFAULTS, ...this._config };
    data.device_size = Number(data.device_size) || DEVICE_WIDTH[data.layout] || 140;
    this._form.data = data;
    this._form.schema = editorSchema(this._hass, data);
    this._form.computeLabel = (schema) => te(this._hass, schema.name) || schema.name;
  }
}

/* ------------------------------------------------------------ registration */

/**
 * Home Assistant swaps window.customElements for a polyfilled registry while
 * it boots, so an element defined too early is unknown to the dashboard.
 */
const define = () => {
  const registry = window.customElements;
  if (!registry.get(CARD_TYPE)) registry.define(CARD_TYPE, Bticino100xCard);
  if (!registry.get(EDITOR_TYPE)) registry.define(EDITOR_TYPE, Bticino100xCardEditor);
};

if (window.customElements.get('home-assistant') || window.customElements.get('hc-main')) {
  define();
} else {
  Promise.race([
    window.customElements.whenDefined('home-assistant'),
    window.customElements.whenDefined('hc-main'),
    new Promise((resolve) => setTimeout(resolve, 30000)),
  ]).then(define);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: 'BTicino Classe 100X',
    description: 'Status, door release and recent calls of a BTicino intercom, with the monitor drawn above it.',
    preview: true,
    documentationURL: 'https://github.com/k-the-hidden-hero/bticino_ha_extras#bticino-classe-100x-card',
  });
}

console.info(`%c BTICINO-100X-CARD %c ${VERSION} `, 'color: #fff; background: #0a8acd; font-weight: 500', '');

export { Bticino100xCard, Bticino100xCardEditor, BticinoCallSession };
