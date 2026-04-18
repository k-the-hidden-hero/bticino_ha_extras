/**
 * BTicino Intercom Card
 *
 * Custom Lovelace card for BTicino Classe 100X/300X video intercom systems.
 * Enables live video WITH audio by injecting a silent audio track into the
 * WebRTC offer, which tricks the device into activating its microphone.
 *
 * Home Assistant's built-in camera player uses recvonly for audio (no track),
 * so the device sends silence. This card creates an AudioContext with a 0Hz
 * OscillatorNode to produce a real silent audio track, making Chrome generate
 * sendrecv + a real SSRC in the SDP offer.
 *
 * @version 1.0.0
 * @license MIT
 */

const CARD_VERSION = '1.0.0';

const STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

class BticinoIntercomCard extends HTMLElement {
  // --- Lifecycle ---

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;

    // WebRTC state
    this._pc = null;
    this._ws = null;
    this._audioCtx = null;
    this._oscillator = null;
    this._remoteStream = null;
    this._statsInterval = null;

    // UI state
    this._status = STATUS.IDLE;
    this._playing = false;
    this._muted = false;
    this._wantPlay = false; // user intent: should we be streaming?
    this._reconnectTimer = null;
    this._micActive = false;
    this._micStream = null;
    this._micSender = null;
  }

  set hass(hass) {
    this._hass = hass;
    // Update poster image if visible and not playing
    if (!this._playing) {
      this._updatePoster();
    }
    // Update title if using entity name
    this._updateTitle();
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity (camera entity)');
    }
    this._config = config;
    this._render();
  }

  getCardSize() {
    return 5;
  }

  static getConfigElement() {
    // Could return a config editor element, but keeping it simple
    return undefined;
  }

  static getStubConfig() {
    return { entity: 'camera.bticino_intercom' };
  }

  connectedCallback() {
    // Re-render when attached to DOM
    if (this._config) {
      this._render();
    }
  }

  disconnectedCallback() {
    // Clean up everything when card is removed from DOM
    this._cleanup();
  }

  // --- Rendering ---

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --bti-primary: var(--primary-color, #03a9f4);
          --bti-bg: var(--ha-card-background, var(--card-background-color, #fff));
          --bti-text: var(--primary-text-color, #212121);
          --bti-text-secondary: var(--secondary-text-color, #727272);
          --bti-radius: var(--ha-card-border-radius, 12px);
          --bti-shadow: var(--ha-card-box-shadow, 0 2px 2px 0 rgba(0,0,0,.14), 0 1px 5px 0 rgba(0,0,0,.12), 0 3px 1px -2px rgba(0,0,0,.2));
        }
        ha-card {
          overflow: hidden;
          position: relative;
        }
        .video-container {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          background: #000;
          cursor: pointer;
          overflow: hidden;
        }
        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .poster-container {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
        }
        .poster-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .poster-container.hidden {
          display: none;
        }
        .play-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: background 0.2s;
        }
        .play-overlay:hover {
          background: rgba(0, 0, 0, 0.15);
        }
        .play-overlay.hidden {
          display: none;
        }
        .play-overlay svg {
          width: 72px;
          height: 72px;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
          opacity: 0.9;
          transition: opacity 0.2s, transform 0.2s;
        }
        .play-overlay:hover svg {
          opacity: 1;
          transform: scale(1.08);
        }
        .status-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          pointer-events: none;
          transition: opacity 0.3s;
          font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif);
        }
        .status-badge.idle { display: none; }
        .status-badge.connecting,
        .status-badge.reconnecting {
          background: rgba(255, 152, 0, 0.85);
          color: #fff;
        }
        .status-badge.connected {
          background: rgba(76, 175, 80, 0.85);
          color: #fff;
          animation: fade-out 3s 2s forwards;
        }
        .status-badge.error {
          background: rgba(244, 67, 54, 0.85);
          color: #fff;
        }
        @keyframes fade-out {
          to { opacity: 0; }
        }
        .controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: var(--bti-bg);
        }
        .controls-left, .controls-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .title {
          font-size: 14px;
          font-weight: 500;
          color: var(--bti-text);
          padding: 0 8px;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--paper-font-body1_-_font-family, 'Roboto', sans-serif);
        }
        .ctrl-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--bti-text-secondary);
          transition: background 0.2s, color 0.2s;
        }
        .ctrl-btn:hover {
          background: var(--divider-color, rgba(0,0,0,0.08));
          color: var(--bti-text);
        }
        .ctrl-btn:active {
          background: var(--divider-color, rgba(0,0,0,0.12));
        }
        .ctrl-btn.active {
          color: var(--bti-primary);
        }
        .ctrl-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }
        .ctrl-btn:disabled:hover {
          background: none;
        }
        .ctrl-btn svg {
          width: 22px;
          height: 22px;
          fill: currentColor;
        }
        .ctrl-btn.mic-btn.active {
          color: var(--error-color, #db4437);
        }
      </style>
      <ha-card>
        <div class="video-container" id="video-container">
          <video id="video" autoplay playsinline></video>
          <div class="poster-container" id="poster-container">
            <img id="poster-img" alt="" />
          </div>
          <div class="play-overlay" id="play-overlay">
            <svg viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
          <div class="status-badge idle" id="status-badge"></div>
        </div>
        <div class="controls">
          <div class="controls-left">
            <button class="ctrl-btn" id="btn-play" title="Play / Stop">
              ${this._svgPlay()}
            </button>
            <span class="title" id="title"></span>
          </div>
          <div class="controls-right">
            <button class="ctrl-btn mic-btn" id="btn-mic" title="Microphone" disabled>
              ${this._svgMicOff()}
            </button>
            <button class="ctrl-btn" id="btn-mute" title="Mute / Unmute" disabled>
              ${this._svgVolumeUp()}
            </button>
            <button class="ctrl-btn" id="btn-fullscreen" title="Fullscreen" disabled>
              ${this._svgFullscreen()}
            </button>
          </div>
        </div>
      </ha-card>
    `;

    // Bind events
    this._bindEvents();
    this._updatePoster();
    this._updateTitle();
  }

  _bindEvents() {
    const overlay = this.shadowRoot.getElementById('play-overlay');
    const btnPlay = this.shadowRoot.getElementById('btn-play');
    const btnMute = this.shadowRoot.getElementById('btn-mute');
    const btnMic = this.shadowRoot.getElementById('btn-mic');
    const btnFs = this.shadowRoot.getElementById('btn-fullscreen');

    overlay.addEventListener('click', () => this._togglePlay());
    btnPlay.addEventListener('click', () => this._togglePlay());
    btnMute.addEventListener('click', () => this._toggleMute());
    btnMic.addEventListener('click', () => this._toggleMic());
    btnFs.addEventListener('click', () => this._toggleFullscreen());
  }

  // --- SVG Icons ---

  _svgPlay() {
    return '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  }

  _svgStop() {
    return '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>';
  }

  _svgVolumeUp() {
    return '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
  }

  _svgVolumeOff() {
    return '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
  }

  _svgMicOn() {
    return '<svg viewBox="0 0 24 24"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>';
  }

  _svgMicOff() {
    return '<svg viewBox="0 0 24 24"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>';
  }

  _svgFullscreen() {
    return '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
  }

  // --- UI updates ---

  _updateStatus(status, text) {
    this._status = status;
    const badge = this.shadowRoot?.getElementById('status-badge');
    if (!badge) return;
    badge.className = `status-badge ${status}`;
    badge.textContent = text || status;
    // Reset animation for connected badge
    if (status === STATUS.CONNECTED) {
      badge.style.animation = 'none';
      badge.offsetHeight; // force reflow
      badge.style.animation = '';
    }
  }

  _updatePoster() {
    const posterContainer = this.shadowRoot?.getElementById('poster-container');
    const posterImg = this.shadowRoot?.getElementById('poster-img');
    if (!posterContainer || !posterImg) return;

    const posterEntity = this._config?.poster_entity;
    if (posterEntity && this._hass?.states[posterEntity]) {
      const entityPic = this._hass.states[posterEntity].attributes.entity_picture;
      if (entityPic) {
        posterImg.src = entityPic;
        posterContainer.classList.remove('hidden');
        return;
      }
    }

    // Fallback: try the main camera entity
    const entity = this._config?.entity;
    if (entity && this._hass?.states[entity]) {
      const entityPic = this._hass.states[entity].attributes.entity_picture;
      if (entityPic) {
        posterImg.src = entityPic;
        posterContainer.classList.remove('hidden');
        return;
      }
    }

    posterContainer.classList.add('hidden');
  }

  _updateTitle() {
    const titleEl = this.shadowRoot?.getElementById('title');
    if (!titleEl) return;

    if (this._config?.title) {
      titleEl.textContent = this._config.title;
    } else if (this._config?.entity && this._hass?.states[this._config.entity]) {
      titleEl.textContent = this._hass.states[this._config.entity].attributes.friendly_name || '';
    }
  }

  _updatePlayButton() {
    const btn = this.shadowRoot?.getElementById('btn-play');
    if (!btn) return;
    btn.innerHTML = this._playing ? this._svgStop() : this._svgPlay();
    btn.title = this._playing ? 'Stop' : 'Play';
  }

  _updateControlStates() {
    const btnMute = this.shadowRoot?.getElementById('btn-mute');
    const btnMic = this.shadowRoot?.getElementById('btn-mic');
    const btnFs = this.shadowRoot?.getElementById('btn-fullscreen');
    if (!btnMute || !btnMic || !btnFs) return;

    const active = this._status === STATUS.CONNECTED;
    btnMute.disabled = !active;
    btnMic.disabled = !active;
    btnFs.disabled = !this._playing;
  }

  _updateMuteButton() {
    const btn = this.shadowRoot?.getElementById('btn-mute');
    if (!btn) return;
    btn.innerHTML = this._muted ? this._svgVolumeOff() : this._svgVolumeUp();
  }

  _updateMicButton() {
    const btn = this.shadowRoot?.getElementById('btn-mic');
    if (!btn) return;
    btn.innerHTML = this._micActive ? this._svgMicOn() : this._svgMicOff();
    btn.classList.toggle('active', this._micActive);
  }

  // --- Actions ---

  _togglePlay() {
    if (this._playing) {
      this._wantPlay = false;
      this._stop();
    } else {
      this._wantPlay = true;
      this._start();
    }
  }

  _toggleMute() {
    if (!this._playing) return;
    this._muted = !this._muted;
    const video = this.shadowRoot?.getElementById('video');
    if (video) video.muted = this._muted;
    this._updateMuteButton();
  }

  async _toggleMic() {
    if (!this._playing || this._status !== STATUS.CONNECTED) return;

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

      // Replace the silent audio track with the real mic track
      const senders = this._pc.getSenders();
      const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
      if (audioSender) {
        await audioSender.replaceTrack(micTrack);
        this._micSender = audioSender;
      }

      this._micActive = true;
      this._updateMicButton();
    } catch (err) {
      console.warn('[bticino-card] Mic access denied or failed:', err);
    }
  }

  _stopMic() {
    // Replace mic track back with the saved silence track
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
    this._updateMicButton();
  }

  _toggleFullscreen() {
    const container = this.shadowRoot?.getElementById('video-container');
    if (!container) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen().catch(() => {});
    }
  }

  // --- WebRTC ---

  async _start() {
    this._playing = true;
    this._updatePlayButton();

    // Hide poster, show video
    const posterContainer = this.shadowRoot?.getElementById('poster-container');
    const overlay = this.shadowRoot?.getElementById('play-overlay');
    if (posterContainer) posterContainer.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');

    this._updateStatus(STATUS.CONNECTING, 'Connecting...');
    this._updateControlStates();

    try {
      await this._connect();
    } catch (err) {
      console.error('[bticino-card] Connection failed:', err);
      this._updateStatus(STATUS.ERROR, 'Error');
      this._scheduleReconnect();
    }
  }

  async _connect() {
    // Clean up any previous connection
    this._closeConnection();

    // 1. Create AudioContext + silent oscillator for the audio track
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
        this._updateStatus(STATUS.CONNECTED, 'Live');
        this._updateControlStates();
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
      if (e.candidate && this._ws?.readyState === WebSocket.OPEN) {
        // Forward local ICE candidates to the device via HA WebSocket.
        // HA's camera/webrtc/candidate command relays them through SignalingClient.
        this._ws.send(JSON.stringify({
          id: 2,
          type: 'camera/webrtc/candidate',
          entity_id: this._config.entity,
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

    // 4. Send via HA WebSocket (own connection with auth)
    await this._signalViaWebSocket(this._pc.localDescription.sdp);
  }

  async _signalViaWebSocket(offerSdp) {
    // The promise resolves once the SDP answer is applied, but the WebSocket
    // stays open so that late ICE candidates can still be processed.
    return new Promise((resolve, reject) => {
      if (!this._hass) {
        reject(new Error('No hass object'));
        return;
      }

      // Build WS URL from current page location
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
          // Get the token from the HA connection
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
            entity_id: this._config.entity,
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
          if (evt.type === 'answer') {
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
            // ICE candidates can arrive before or after the answer;
            // the handler keeps running after the promise settles.
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

  _scheduleReconnect() {
    if (!this._wantPlay) return;
    if (this._reconnectTimer) return;

    this._updateStatus(STATUS.RECONNECTING, 'Reconnecting...');
    this._updateControlStates();

    this._reconnectTimer = setTimeout(async () => {
      this._reconnectTimer = null;
      if (!this._wantPlay) return;

      try {
        await this._connect();
      } catch (err) {
        console.error('[bticino-card] Reconnect failed:', err);
        this._updateStatus(STATUS.ERROR, 'Error');
        this._scheduleReconnect();
      }
    }, 2000);
  }

  _stop() {
    this._playing = false;
    this._wantPlay = false;
    this._cleanup();

    // Show poster and play overlay again
    this._updatePoster();
    const overlay = this.shadowRoot?.getElementById('play-overlay');
    if (overlay) overlay.classList.remove('hidden');

    this._updateStatus(STATUS.IDLE, '');
    this._updatePlayButton();
    this._updateControlStates();

    // Clear video
    const video = this.shadowRoot?.getElementById('video');
    if (video) video.srcObject = null;
  }

  _closeConnection() {
    this._stopMic();

    if (this._statsInterval) {
      clearInterval(this._statsInterval);
      this._statsInterval = null;
    }

    if (this._pc) {
      this._pc.ontrack = null;
      this._pc.onconnectionstatechange = null;
      this._pc.oniceconnectionstatechange = null;
      try { this._pc.close(); } catch (_) {}
      this._pc = null;
    }

    if (this._ws) {
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
  }

  _cleanup() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._closeConnection();
  }
}

// --- Card registration ---

customElements.define('bticino-intercom-card', BticinoIntercomCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'bticino-intercom-card',
  name: 'BTicino Intercom',
  description: 'Live video with audio from BTicino intercom devices',
  preview: false,
  documentationURL: 'https://github.com/k-the-hidden-hero/bticino_ha_extras',
});

console.info(
  `%c BTICINO-INTERCOM-CARD %c v${CARD_VERSION} `,
  'background: #03a9f4; color: white; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;',
  'background: #444; color: white; padding: 2px 6px; border-radius: 0 4px 4px 0;',
);
