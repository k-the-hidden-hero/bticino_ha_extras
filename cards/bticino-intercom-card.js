/**
 * BTicino Intercom Card v2.0
 *
 * Custom Lovelace card for BTicino Classe 100X/300X video intercom systems.
 * Provides live video WITH audio, configurable door/light action buttons,
 * two-way audio via microphone toggle, and auto-reconnect.
 *
 * Audio trick: injects a silent audio track (AudioContext + OscillatorNode 0Hz)
 * into the WebRTC offer, which tricks the BTicino device into activating its
 * microphone. HA's built-in camera player uses recvonly (no track), so the
 * device sends silence. This card generates sendrecv + a real SSRC in the SDP.
 *
 * Config:
 *   type: custom:bticino-intercom-card
 *   camera: camera.entity_id
 *   poster: camera.poster_entity_id
 *   title: Card Title
 *   actions:
 *     - entity: lock.entity_id
 *       icon: mdi:gate
 *       label: Label
 *       service: lock.unlock
 *   max_actions: 4
 *
 * @version 2.0.0
 * @license MIT
 */

const CARD_VERSION = '2.0.0';

const STATE = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  LIVE: 'live',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

// MDI icon SVG paths (viewBox 0 0 24 24)
const ICONS = {
  play: 'M8,5.14V19.14L19,12.14L8,5.14Z',
  pause: 'M14,19H18V5H14M6,19H10V5H6V19Z',
  stop: 'M18,18H6V6H18V18Z',
  volumeHigh: 'M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z',
  volumeOff: 'M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z',
  mic: 'M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z',
  micOff: 'M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C9.12,17.64 7.47,16.66 6.32,15.25L7.77,13.8C8.61,14.82 9.83,15.5 11.2,15.5H12.8C14.96,15.14 16.5,13.27 16.5,11H18.5M12,2A3,3 0 0,1 15,5V11C15,11.35 14.94,11.69 14.84,12L3.65,0.81L2.39,2.07L21.61,21.29L22.87,20.03L14.97,12.13V12.13C15,12.09 15,12.04 15,12V5A3,3 0 0,0 12,2M9,5V10.18L14,15.18V11A5,5 0 0,0 9,5Z',
  fullscreen: 'M5,5H10V7H7V10H5V5M14,5H19V10H17V7H14V5M17,14H19V19H14V17H17V14M10,17V19H5V14H7V17H10Z',
  dots: 'M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z',
  close: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24"><path d="${ICONS[name]}"/></svg>`;
}

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

  /* ---- Title bar ---- */
  .title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 8px;
  }
  .title-bar .title {
    font-size: 15px;
    font-weight: 500;
    color: var(--bti-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
    flex: 1;
  }
  .status-pill {
    flex-shrink: 0;
    margin-left: 10px;
    padding: 3px 10px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    line-height: 1.4;
    user-select: none;
  }
  .status-pill.ready {
    background: rgba(76, 175, 80, 0.2);
    color: #66bb6a;
  }
  .status-pill.connecting,
  .status-pill.reconnecting {
    background: rgba(255, 152, 0, 0.2);
    color: #ffa726;
  }
  .status-pill.live {
    background: rgba(244, 67, 54, 0.25);
    color: #ef5350;
  }
  .status-pill.error {
    background: rgba(244, 67, 54, 0.2);
    color: #ef5350;
  }

  /* ---- Video area ---- */
  .video-area {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    background: #000;
    overflow: hidden;
    border-radius: 8px;
    margin: 0 0 0 0;
  }
  video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    background: #000;
  }

  /* Poster */
  .poster {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #000;
    z-index: 2;
    transition: opacity 0.3s ease;
  }
  .poster.hidden { opacity: 0; pointer-events: none; }
  .poster img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* Play button overlay (IDLE) */
  .play-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
    cursor: pointer;
    background: rgba(0,0,0,0.35);
    transition: background 0.2s ease, opacity 0.3s ease;
  }
  .play-overlay:hover { background: rgba(0,0,0,0.2); }
  .play-overlay.hidden { opacity: 0; pointer-events: none; }
  .play-btn {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255,255,255,0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  .play-overlay:hover .play-btn {
    transform: scale(1.08);
    box-shadow: 0 6px 28px rgba(0,0,0,0.5);
  }
  .play-btn svg {
    width: 28px;
    height: 28px;
    fill: #1c1c1e;
    margin-left: 3px; /* optical center for play triangle */
  }

  /* ---- Video overlay controls (LIVE) ---- */
  .video-controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: linear-gradient(transparent, rgba(0,0,0,0.7));
    z-index: 4;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
  .video-controls.visible {
    opacity: 1;
    pointer-events: auto;
  }
  .video-controls .ctrl-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .vc-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,0.12);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    transition: background 0.15s, color 0.15s, transform 0.1s;
    padding: 0;
  }
  .vc-btn:hover { background: rgba(255,255,255,0.25); }
  .vc-btn:active { transform: scale(0.92); }
  .vc-btn svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
  .vc-btn.mic-active {
    background: rgba(76, 175, 80, 0.35);
    color: #66bb6a;
  }

  /* ---- Action bar ---- */
  .action-bar {
    display: flex;
    align-items: stretch;
    justify-content: center;
    gap: 2px;
    padding: 10px 12px 12px;
    position: relative;
  }
  .action-btn {
    flex: 1;
    max-width: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 6px 8px;
    border: none;
    border-radius: 10px;
    background: rgba(255,255,255,0.06);
    cursor: pointer;
    color: var(--bti-text-secondary);
    transition: background 0.15s, color 0.15s, transform 0.1s;
    position: relative;
    overflow: hidden;
  }
  .action-btn:hover {
    background: rgba(255,255,255,0.12);
    color: var(--bti-text);
  }
  .action-btn:active { transform: scale(0.95); }
  .action-btn svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
    flex-shrink: 0;
  }
  .action-btn .action-label {
    font-size: 10px;
    font-weight: 500;
    line-height: 1.2;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  /* Active state highlights */
  .action-btn.active-lock {
    background: rgba(76, 175, 80, 0.18);
    color: #66bb6a;
  }
  .action-btn.active-light {
    background: rgba(255, 235, 59, 0.15);
    color: #ffee58;
  }
  .action-btn.active-default {
    background: rgba(3, 169, 244, 0.18);
    color: #29b6f6;
  }

  /* Pulse animation on click */
  @keyframes action-pulse {
    0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); }
    100% { box-shadow: 0 0 0 12px rgba(255,255,255,0); }
  }
  .action-btn.pulse {
    animation: action-pulse 0.35s ease-out;
  }

  /* Overflow menu */
  .overflow-popup {
    position: absolute;
    bottom: calc(100% + 4px);
    right: 12px;
    background: var(--bti-bg);
    border: 1px solid var(--bti-divider);
    border-radius: 10px;
    padding: 4px;
    min-width: 150px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    z-index: 10;
    display: none;
  }
  .overflow-popup.open { display: block; }
  .overflow-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: none;
    border-radius: 8px;
    background: none;
    cursor: pointer;
    color: var(--bti-text-secondary);
    font-size: 13px;
    font-family: inherit;
    width: 100%;
    text-align: left;
    transition: background 0.12s, color 0.12s;
  }
  .overflow-item:hover {
    background: rgba(255,255,255,0.08);
    color: var(--bti-text);
  }
  .overflow-item svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
    flex-shrink: 0;
  }

  /* Responsive: narrow cards hide labels */
  @container (max-width: 350px) {
    .action-btn .action-label { display: none; }
  }
  @media (max-width: 350px) {
    .action-btn .action-label { display: none; }
  }
`;

// ---------------------------------------------------------------------------
// Card class
// ---------------------------------------------------------------------------

class BticinoIntercomCard extends HTMLElement {

  // ========== Lifecycle ==========

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;

    // WebRTC state
    this._pc = null;
    this._ws = null;
    this._sessionId = null;
    this._candidateMsgId = 100;
    this._audioCtx = null;
    this._oscillator = null;
    this._silenceTrack = null;
    this._remoteStream = null;

    // Mic state
    this._micActive = false;
    this._micStream = null;
    this._micSender = null;

    // UI state
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

    // Bound handlers for cleanup
    this._boundDocClick = this._onDocumentClick.bind(this);
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    if (!prev && hass && this._config) {
      this._render();
    }
    // Update dynamic parts without re-rendering
    this._updatePoster();
    this._updateActionStates();
  }

  setConfig(config) {
    if (!config.camera) {
      throw new Error('Required: camera entity');
    }
    this._config = {
      camera: config.camera,
      poster: config.poster || null,
      title: config.title || null,
      actions: config.actions || [],
      max_actions: config.max_actions ?? 4,
    };
    if (this._hass) {
      this._render();
    }
  }

  getCardSize() {
    return 5;
  }

  static getStubConfig() {
    return {
      camera: 'camera.bticino_intercom',
      title: 'Intercom',
      actions: [],
    };
  }

  connectedCallback() {
    if (this._config && this._hass) {
      this._render();
    }
  }

  disconnectedCallback() {
    this._cleanup();
    document.removeEventListener('click', this._boundDocClick);
  }

  // ========== Rendering ==========

  _render() {
    const title = this._config.title || this._entityName(this._config.camera) || 'Intercom';
    const actions = this._config.actions;
    const maxActions = this._config.max_actions;
    const visibleActions = actions.slice(0, maxActions);
    const overflowActions = actions.slice(maxActions);
    const hasOverflow = overflowActions.length > 0;

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        <div class="title-bar">
          <div class="title">${this._esc(title)}</div>
          <div class="status-pill ready" id="status-pill">Ready</div>
        </div>

        <div class="video-area" id="video-area">
          <video id="video" autoplay playsinline></video>

          <div class="poster" id="poster">
            <img id="poster-img" alt="" />
          </div>

          <div class="play-overlay" id="play-overlay">
            <div class="play-btn">${icon('play')}</div>
          </div>

          <div class="video-controls" id="video-controls">
            <div class="ctrl-group">
              <button class="vc-btn" id="vc-playpause" title="Stop">${icon('stop')}</button>
              <button class="vc-btn" id="vc-volume" title="Mute">${icon('volumeHigh')}</button>
              <button class="vc-btn" id="vc-mic" title="Microphone">${icon('micOff')}</button>
            </div>
            <div class="ctrl-group">
              <button class="vc-btn" id="vc-fullscreen" title="Fullscreen">${icon('fullscreen')}</button>
            </div>
          </div>
        </div>

        <div class="action-bar" id="action-bar">
          ${visibleActions.map((a, i) => this._renderActionBtn(a, i)).join('')}
          ${hasOverflow ? `
            <button class="action-btn" id="overflow-btn" title="More actions">
              ${icon('dots')}
              <span class="action-label">...</span>
            </button>
          ` : ''}
          ${hasOverflow ? `
            <div class="overflow-popup" id="overflow-popup">
              ${overflowActions.map((a, i) => this._renderOverflowItem(a, maxActions + i)).join('')}
            </div>
          ` : ''}
        </div>
      </ha-card>
    `;

    this._bindEvents();
    this._updatePoster();
    this._updateActionStates();
  }

  _renderActionBtn(action, index) {
    const iconPath = this._resolveIconPath(action.icon);
    return `
      <button class="action-btn" data-action-idx="${index}" title="${this._esc(action.label || '')}">
        <svg viewBox="0 0 24 24"><path d="${iconPath}"/></svg>
        ${action.label ? `<span class="action-label">${this._esc(action.label)}</span>` : ''}
      </button>
    `;
  }

  _renderOverflowItem(action, index) {
    const iconPath = this._resolveIconPath(action.icon);
    return `
      <button class="overflow-item" data-action-idx="${index}">
        <svg viewBox="0 0 24 24"><path d="${iconPath}"/></svg>
        <span>${this._esc(action.label || action.entity)}</span>
      </button>
    `;
  }

  _resolveIconPath(mdiIcon) {
    // Map common mdi:xxx names to our SVG paths; fallback to a generic circle
    if (!mdiIcon) return ICONS.dots;
    const name = mdiIcon.replace('mdi:', '');
    const map = {
      gate: 'M8.81,6.44V3H2V21H4V13H8.81V18.56L14,12L8.81,6.44M22,3H15.19V6.44L20.38,12L15.19,17.56V21H22V3Z',
      door: 'M12,3L2,12H5V20H19V12H22L12,3M12,8.75A2.25,2.25 0 0,1 14.25,11A2.25,2.25 0 0,1 12,13.25A2.25,2.25 0 0,1 9.75,11A2.25,2.25 0 0,1 12,8.75Z',
      lightbulb: 'M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21Z',
      'lightbulb-outline': 'M12,2A7,7 0 0,0 5,9C5,11.38 6.19,13.47 8,14.74V17A1,1 0 0,0 9,18H15A1,1 0 0,0 16,17V14.74C17.81,13.47 19,11.38 19,9A7,7 0 0,0 12,2M9,21A1,1 0 0,0 10,22H14A1,1 0 0,0 15,21V20H9V21M12,4A5,5 0 0,1 17,9C17,11.05 15.81,12.83 14,13.71V16H10V13.71C8.19,12.83 7,11.05 7,9A5,5 0 0,1 12,4Z',
      lock: 'M12,17A2,2 0 0,0 14,15C14,13.89 13.1,13 12,13A2,2 0 0,0 10,15A2,2 0 0,0 12,17M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10C4,8.89 4.9,8 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z',
      'lock-open': 'M12,17C10.89,17 10,16.1 10,15C10,13.89 10.89,13 12,13A2,2 0 0,1 14,15A2,2 0 0,1 12,17M18,20V10H6V20H18M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V10A2,2 0 0,1 6,8H15V6A3,3 0 0,0 12,3A3,3 0 0,0 9,6H7A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18Z',
      stairs: 'M15,5V9H11V13H7V17H3V20H7V17H11V13H15V9H19V5H15Z',
    };
    return map[name] || ICONS.dots;
  }

  // ========== Event binding ==========

  _bindEvents() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    // Play overlay
    $('play-overlay')?.addEventListener('click', () => this._startPlay());

    // Video area — hover/tap for controls
    const videoArea = $('video-area');
    videoArea?.addEventListener('mouseenter', () => this._showControls());
    videoArea?.addEventListener('mouseleave', () => this._hideControlsDelayed());
    videoArea?.addEventListener('touchstart', (e) => {
      // Only react to touches on the video area itself, not on control buttons
      if (e.target === videoArea || e.target.tagName === 'VIDEO') {
        this._toggleControlsVisibility();
      }
    }, { passive: true });

    // Video overlay controls
    $('vc-playpause')?.addEventListener('click', (e) => { e.stopPropagation(); this._stopPlay(); });
    $('vc-volume')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleMute(); });
    $('vc-mic')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleMic(); });
    $('vc-fullscreen')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleFullscreen(); });

    // Action buttons
    this.shadowRoot.querySelectorAll('.action-btn[data-action-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.actionIdx, 10);
        this._executeAction(idx, btn);
      });
    });

    // Overflow button
    $('overflow-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleOverflow();
    });

    // Overflow items
    this.shadowRoot.querySelectorAll('.overflow-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(item.dataset.actionIdx, 10);
        this._executeAction(idx, item);
        this._closeOverflow();
      });
    });

    // Close overflow on outside click
    document.removeEventListener('click', this._boundDocClick);
    document.addEventListener('click', this._boundDocClick);
  }

  _onDocumentClick() {
    if (this._overflowOpen) {
      this._closeOverflow();
    }
  }

  // ========== Status & UI updates ==========

  _setState(state, label) {
    this._state = state;
    const pill = this.shadowRoot?.getElementById('status-pill');
    if (!pill) return;

    const labels = {
      [STATE.IDLE]: 'Ready',
      [STATE.CONNECTING]: 'Connecting...',
      [STATE.LIVE]: 'LIVE',
      [STATE.RECONNECTING]: 'Reconnecting...',
      [STATE.ERROR]: 'Error',
    };

    pill.textContent = label || labels[state] || state;
    pill.className = 'status-pill';
    switch (state) {
      case STATE.IDLE: pill.classList.add('ready'); break;
      case STATE.CONNECTING: pill.classList.add('connecting'); break;
      case STATE.LIVE: pill.classList.add('live'); break;
      case STATE.RECONNECTING: pill.classList.add('reconnecting'); break;
      case STATE.ERROR: pill.classList.add('error'); break;
    }
  }

  _updatePoster() {
    const posterEl = this.shadowRoot?.getElementById('poster');
    const imgEl = this.shadowRoot?.getElementById('poster-img');
    if (!posterEl || !imgEl || !this._hass) return;

    if (this._playing) {
      posterEl.classList.add('hidden');
      return;
    }

    // Try poster entity first, then camera entity
    const candidates = [this._config?.poster, this._config?.camera].filter(Boolean);
    for (const entityId of candidates) {
      const entity = this._hass.states[entityId];
      if (entity?.attributes?.entity_picture) {
        imgEl.src = entity.attributes.entity_picture;
        posterEl.classList.remove('hidden');
        return;
      }
    }
    // No poster available — still show black
    posterEl.classList.add('hidden');
  }

  _updateActionStates() {
    if (!this._hass || !this._config) return;
    const actions = this._config.actions;

    // Update visible action buttons
    this.shadowRoot?.querySelectorAll('.action-btn[data-action-idx]').forEach(btn => {
      const idx = parseInt(btn.dataset.actionIdx, 10);
      const action = actions[idx];
      if (!action) return;
      this._applyActiveClass(btn, action);
    });

    // Update overflow items too
    this.shadowRoot?.querySelectorAll('.overflow-item[data-action-idx]').forEach(item => {
      const idx = parseInt(item.dataset.actionIdx, 10);
      const action = actions[idx];
      if (!action) return;
      // For overflow items, we just change color, no class
    });
  }

  _applyActiveClass(btn, action) {
    btn.classList.remove('active-lock', 'active-light', 'active-default');
    const entity = this._hass?.states[action.entity];
    if (!entity) return;

    const domain = action.entity.split('.')[0];
    const isActive = ['on', 'unlocked', 'open'].includes(entity.state);

    if (isActive) {
      if (domain === 'lock') btn.classList.add('active-lock');
      else if (domain === 'light') btn.classList.add('active-light');
      else btn.classList.add('active-default');
    }
  }

  // ========== Video controls visibility ==========

  _showControls() {
    if (!this._playing) return;
    const ctrl = this.shadowRoot?.getElementById('video-controls');
    if (ctrl) ctrl.classList.add('visible');
    this._controlsVisible = true;
    this._resetControlsTimer();
  }

  _hideControlsDelayed() {
    this._resetControlsTimer();
    this._controlsTimer = setTimeout(() => this._hideControls(), 3000);
  }

  _hideControls() {
    const ctrl = this.shadowRoot?.getElementById('video-controls');
    if (ctrl) ctrl.classList.remove('visible');
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
    if (this._controlsVisible) {
      this._hideControls();
    } else {
      this._showControls();
      this._hideControlsDelayed();
    }
  }

  // ========== Action buttons ==========

  _executeAction(index, btnEl) {
    const action = this._config.actions[index];
    if (!action || !this._hass) return;

    // Parse service: "lock.unlock" -> domain="lock", service="unlock"
    const [domain, service] = action.service.split('.');
    if (!domain || !service) return;

    this._hass.callService(domain, service, action.service_data || {}, { entity_id: action.entity });

    // Pulse feedback
    if (btnEl) {
      btnEl.classList.remove('pulse');
      // Force reflow
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
    const popup = this.shadowRoot?.getElementById('overflow-popup');
    if (popup) popup.classList.remove('open');
    this._overflowOpen = false;
  }

  // ========== Play / Stop ==========

  _startPlay() {
    if (this._playing) return;
    this._wantPlay = true;
    this._playing = true;
    this._reconnectCount = 0;

    // Hide poster and play overlay
    const poster = this.shadowRoot?.getElementById('poster');
    const overlay = this.shadowRoot?.getElementById('play-overlay');
    if (poster) poster.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');

    this._setState(STATE.CONNECTING);
    this._connect();
  }

  _stopPlay() {
    this._wantPlay = false;
    this._playing = false;
    this._hideControls();
    this._cleanup();

    // Clear video
    const video = this.shadowRoot?.getElementById('video');
    if (video) video.srcObject = null;

    // Show poster and play overlay again
    const poster = this.shadowRoot?.getElementById('poster');
    const overlay = this.shadowRoot?.getElementById('play-overlay');
    if (poster) poster.classList.remove('hidden');
    if (overlay) overlay.classList.remove('hidden');

    this._updatePoster();
    this._setState(STATE.IDLE);
  }

  // ========== Mute ==========

  _toggleMute() {
    if (!this._playing) return;
    this._muted = !this._muted;
    const video = this.shadowRoot?.getElementById('video');
    if (video) video.muted = this._muted;

    const btn = this.shadowRoot?.getElementById('vc-volume');
    if (btn) btn.innerHTML = icon(this._muted ? 'volumeOff' : 'volumeHigh');
  }

  // ========== Microphone ==========

  async _toggleMic() {
    if (!this._playing || this._state !== STATE.LIVE) return;

    if (this._micActive) {
      this._stopMic();
    } else {
      await this._startMic();
    }
  }

  async _startMic() {
    try {
      this._micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const micTrack = this._micStream.getAudioTracks()[0];

      // Find the audio sender and replace silence track with mic track
      const senders = this._pc?.getSenders();
      const audioSender = senders?.find(s => s.track && s.track.kind === 'audio');
      if (audioSender) {
        await audioSender.replaceTrack(micTrack);
        this._micSender = audioSender;
      }

      this._micActive = true;
      this._updateMicUI();
    } catch (err) {
      console.warn('[bticino-card] Mic access denied or failed:', err);
    }
  }

  _stopMic() {
    // Replace mic track back with silence track
    if (this._micSender && this._silenceTrack) {
      this._micSender.replaceTrack(this._silenceTrack);
    }

    // Stop mic stream
    if (this._micStream) {
      this._micStream.getTracks().forEach(t => t.stop());
      this._micStream = null;
    }

    this._micActive = false;
    this._micSender = null;
    this._updateMicUI();
  }

  _updateMicUI() {
    const btn = this.shadowRoot?.getElementById('vc-mic');
    if (!btn) return;
    btn.innerHTML = icon(this._micActive ? 'mic' : 'micOff');
    btn.classList.toggle('mic-active', this._micActive);
  }

  // ========== Fullscreen ==========

  _toggleFullscreen() {
    const area = this.shadowRoot?.getElementById('video-area');
    if (!area) return;

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      area.requestFullscreen().catch(() => {});
    }
  }

  // ========== WebRTC Connection ==========

  async _connect() {
    // Tear down any previous connection
    this._closeConnection();

    try {
      // 1. Create AudioContext + silent oscillator for audio track
      this._audioCtx = new AudioContext();
      const osc = this._audioCtx.createOscillator();
      osc.frequency.value = 0; // 0 Hz = silence
      const dest = this._audioCtx.createMediaStreamDestination();
      osc.connect(dest);
      osc.start();
      this._oscillator = osc;

      const silenceStream = dest.stream;
      this._silenceTrack = silenceStream.getAudioTracks()[0];

      // 2. Create RTCPeerConnection
      this._pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      // Add silence audio track (makes SDP sendrecv with real SSRC)
      this._pc.addTrack(this._silenceTrack, silenceStream);

      // Add video transceiver (recvonly)
      this._pc.addTransceiver('video', { direction: 'recvonly' });

      // Remote stream -> video element
      this._remoteStream = new MediaStream();
      const video = this.shadowRoot?.getElementById('video');
      if (video) {
        video.srcObject = this._remoteStream;
        video.muted = this._muted;
      }

      this._pc.ontrack = (e) => {
        console.log(`[bticino-card] Got ${e.track.kind} track`);
        this._remoteStream.addTrack(e.track);
      };

      this._pc.onconnectionstatechange = () => {
        const state = this._pc?.connectionState;
        console.log(`[bticino-card] Connection state: ${state}`);
        if (state === 'connected') {
          this._reconnectCount = 0;
          this._setState(STATE.LIVE);
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          if (this._wantPlay) {
            this._scheduleReconnect();
          }
        }
      };

      this._pc.oniceconnectionstatechange = () => {
        console.log(`[bticino-card] ICE state: ${this._pc?.iceConnectionState}`);
      };

      this._pc.onicecandidate = (e) => {
        if (e.candidate && this._ws?.readyState === WebSocket.OPEN && this._sessionId) {
          this._candidateMsgId = (this._candidateMsgId || 100) + 1;
          this._ws.send(JSON.stringify({
            id: this._candidateMsgId,
            type: 'camera/webrtc/candidate',
            entity_id: this._config.camera,
            session_id: this._sessionId,
            candidate: {
              candidate: e.candidate.candidate,
              sdpMLineIndex: e.candidate.sdpMLineIndex,
              sdpMid: e.candidate.sdpMid,
            },
          }));
        }
      };

      // 3. Create offer
      const offer = await this._pc.createOffer();
      await this._pc.setLocalDescription(offer);

      // 4. Send via HA WebSocket
      await this._signalViaWebSocket(this._pc.localDescription.sdp);

    } catch (err) {
      console.error('[bticino-card] Connection failed:', err);
      this._setState(STATE.ERROR);
      if (this._wantPlay) {
        this._scheduleReconnect();
      }
    }
  }

  async _signalViaWebSocket(offerSdp) {
    return new Promise((resolve, reject) => {
      if (!this._hass) {
        reject(new Error('No hass object'));
        return;
      }

      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${location.host}/api/websocket`;

      this._ws = new WebSocket(wsUrl);
      let msgId = 1;
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Signaling timeout'));
        }
      }, 15000);

      this._ws.onerror = (e) => {
        console.error('[bticino-card] WS error:', e);
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(new Error('WebSocket error'));
        }
      };

      this._ws.onclose = () => {
        console.log('[bticino-card] Signaling WS closed');
      };

      this._ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'auth_required') {
          const token = this._hass.auth?.data?.access_token
            || this._hass.connection?.options?.auth?.data?.access_token;
          if (!token) {
            clearTimeout(timeout);
            settled = true;
            reject(new Error('No auth token available'));
            return;
          }
          this._ws.send(JSON.stringify({ type: 'auth', access_token: token }));

        } else if (msg.type === 'auth_ok') {
          // Send WebRTC offer
          this._ws.send(JSON.stringify({
            id: msgId,
            type: 'camera/webrtc/offer',
            entity_id: this._config.camera,
            offer: offerSdp,
          }));

        } else if (msg.type === 'auth_invalid') {
          clearTimeout(timeout);
          settled = true;
          reject(new Error('Authentication failed'));

        } else if (msg.type === 'result') {
          if (!msg.success) {
            console.error('[bticino-card] Offer rejected:', msg.error);
            clearTimeout(timeout);
            settled = true;
            reject(new Error(msg.error?.message || 'Offer rejected'));
          }
          // success: wait for answer/candidate events

        } else if (msg.type === 'event') {
          const evt = msg.event;

          if (evt.type === 'session') {
            this._sessionId = evt.session_id;
            console.log(`[bticino-card] Session ID: ${this._sessionId}`);

          } else if (evt.type === 'answer') {
            try {
              await this._pc.setRemoteDescription({ type: 'answer', sdp: evt.answer });
              console.log('[bticino-card] Remote description set');
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

          } else if (evt.type === 'candidate') {
            if (evt.candidate) {
              try {
                await this._pc.addIceCandidate({
                  candidate: evt.candidate.candidate,
                  sdpMLineIndex: evt.candidate.sdp_m_line_index
                    ?? evt.candidate.sdpMLineIndex
                    ?? 0,
                });
              } catch (err) {
                console.warn('[bticino-card] ICE candidate error:', err);
              }
            }

          } else if (evt.type === 'error') {
            console.error('[bticino-card] Signaling error:', evt);
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

  // ========== Reconnect ==========

  _scheduleReconnect() {
    if (!this._wantPlay) return;
    if (this._reconnectTimer) return;

    this._reconnectCount++;
    if (this._reconnectCount > this._maxRetries) {
      this._setState(STATE.ERROR, 'Connection lost');
      return;
    }

    this._setState(STATE.RECONNECTING, `Reconnecting... (${this._reconnectCount}/${this._maxRetries})`);

    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      if (!this._wantPlay) return;
      this._connect();
    }, 2000);
  }

  // ========== Cleanup ==========

  _closeConnection() {
    this._stopMic();

    if (this._pc) {
      this._pc.ontrack = null;
      this._pc.onconnectionstatechange = null;
      this._pc.oniceconnectionstatechange = null;
      this._pc.onicecandidate = null;
      try { this._pc.close(); } catch (_) {}
      this._pc = null;
    }

    if (this._ws) {
      this._ws.onmessage = null;
      this._ws.onerror = null;
      this._ws.onclose = null;
      try { this._ws.close(); } catch (_) {}
      this._ws = null;
    }

    if (this._oscillator) {
      try { this._oscillator.stop(); } catch (_) {}
      this._oscillator = null;
    }

    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch (_) {}
      this._audioCtx = null;
    }

    this._silenceTrack = null;
    this._remoteStream = null;
    this._sessionId = null;
  }

  _cleanup() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._resetControlsTimer();
    this._closeConnection();
  }

  // ========== Helpers ==========

  _entityName(entityId) {
    if (!entityId || !this._hass) return null;
    const entity = this._hass.states[entityId];
    return entity?.attributes?.friendly_name || null;
  }

  _esc(str) {
    if (!str) return '';
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

customElements.define('bticino-intercom-card', BticinoIntercomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'bticino-intercom-card',
  name: 'BTicino Intercom',
  description: 'Live video with audio from BTicino intercom',
  preview: true,
});

console.info(
  `%c BTICINO-INTERCOM-CARD %c v${CARD_VERSION} `,
  'background: #03a9f4; color: white; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #444; color: white; padding: 2px 6px; border-radius: 0 4px 4px 0;',
);
