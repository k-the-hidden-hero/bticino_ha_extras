# Multi-Intercom Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-intercom card into a multi-intercom card with tabs, swipe navigation, and call-oriented UX (phone/hangup buttons, connecting animation, colored mic).

**Architecture:** Single-file rewrite of `cards/bticino-intercom-card.js`. Config changes from flat `camera`/`actions` to `intercoms[]` array. UI adds tab bar, replaces play/stop with call/hangup semantics, adds connecting animation. WebRTC logic stays the same but uses the active intercom's camera entity.

**Tech Stack:** Vanilla JS, Shadow DOM, Home Assistant Lovelace custom card API. No build system. Manual deploy+test via SSH to HA instance.

**Testing:** No automated test framework. Each task includes manual verification: deploy to HA (`cat file.js | ssh root@ha.asgard.lan -p 22222 "docker exec -i homeassistant tee /config/www/bticino-intercom-card.js > /dev/null"`), update cache buster, Ctrl+Shift+R in browser.

**Spec:** `docs/superpowers/specs/2026-04-19-multi-intercom-card-design.md`

---

### Task 1: Constants, SVG icons, config parsing

**Files:**
- Modify: `cards/bticino-intercom-card.js:36-56` (constants), `cards/bticino-intercom-card.js:296-350` (constructor + setConfig)

- [ ] **Step 1: Replace PLAY_ICON with call/hangup SVG constants**

Replace the existing `PLAY_ICON` constant and add new icon constants:

```javascript
const CARD_VERSION = '4.0.0';

// ... STATE and ERROR_MESSAGES stay the same ...

const ICON_PHONE = '<svg viewBox="0 0 24 24"><path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>';
const ICON_HANGUP = '<svg viewBox="0 0 24 24" style="transform:rotate(135deg)"><path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>';
```

- [ ] **Step 2: Update constructor — add `_activeIndex` and swipe tracking state**

Add after `this._sslWarningDismissed = false;`:

```javascript
    this._activeIndex = 0;
    this._touchStartX = 0;
    this._touchStartY = 0;
```

- [ ] **Step 3: Rewrite `setConfig` for `intercoms[]` format**

Replace the entire `setConfig` method:

```javascript
  setConfig(config) {
    if (!config.intercoms || !Array.isArray(config.intercoms) || config.intercoms.length === 0) {
      throw new Error('Required: intercoms array with at least one entry');
    }
    for (const ic of config.intercoms) {
      if (!ic.name || !ic.camera) throw new Error('Each intercom requires name and camera');
    }
    this._config = {
      intercoms: config.intercoms.map(ic => ({
        name: ic.name,
        camera: ic.camera,
        actions: ic.actions || [],
      })),
      max_actions: config.max_actions ?? 4,
      auto_mic: config.auto_mic ?? true,
      ignore_ssl_warning: config.ignore_ssl_warning ?? false,
      title: config.title || null,
    };
    this._activeIndex = 0;
    if (this._hass) this._render();
  }
```

- [ ] **Step 4: Update `getStubConfig`**

```javascript
  static getStubConfig() {
    return {
      intercoms: [{ name: 'Intercom', camera: 'camera.bticino_intercom', actions: [] }],
    };
  }
```

- [ ] **Step 5: Add `_activeIntercom` helper getter**

Add after `getCardSize()`:

```javascript
  get _activeIntercom() {
    return this._config.intercoms[this._activeIndex];
  }
```

- [ ] **Step 6: Commit**

```
git add cards/bticino-intercom-card.js
git commit -m "feat: config parsing for intercoms[] array (v4.0.0 breaking change)"
```

---

### Task 2: CSS — tab bar, call/hangup buttons, connecting animation, mic colors, swipe dots

**Files:**
- Modify: `cards/bticino-intercom-card.js` — `CARD_STYLES` template literal (lines 61-290)

- [ ] **Step 1: Add tab bar CSS**

Add after `.status-pill.error` styles and before `.warning-banner`:

```css
  .tab-bar {
    display: flex;
    gap: 4px;
    padding: 0 12px 8px;
  }
  .tab-bar.hidden { display: none; }
  .tab {
    flex: 1;
    text-align: center;
    padding: 8px 0;
    border-radius: 8px;
    background: rgba(255,255,255,0.06);
    color: var(--bti-text-secondary);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    font-family: inherit;
    transition: background 0.15s, color 0.15s;
  }
  .tab:hover { background: rgba(255,255,255,0.1); }
  .tab.active {
    background: rgba(3,169,244,0.15);
    color: var(--bti-primary);
    font-weight: 600;
  }
```

- [ ] **Step 2: Replace play overlay CSS with call button CSS**

Replace `.play-overlay` and `.play-btn` CSS blocks with:

```css
  .call-overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 0; z-index: 3; cursor: pointer;
    background: rgba(0,0,0,0.35); transition: background 0.2s ease, opacity 0.3s ease;
  }
  .call-overlay:hover { background: rgba(0,0,0,0.2); }
  .call-overlay.hidden { opacity: 0; pointer-events: none; }
  .call-btn {
    width: 64px; height: 64px; border-radius: 50%;
    background: rgba(76,175,80,0.9);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    box-shadow: 0 4px 24px rgba(76,175,80,0.4);
  }
  .call-overlay:hover .call-btn { transform: scale(1.08); box-shadow: 0 6px 28px rgba(76,175,80,0.5); }
  .call-btn svg { width: 28px; height: 28px; fill: #fff; }
```

- [ ] **Step 3: Add connecting animation CSS**

```css
  .connecting-overlay {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 16px; z-index: 3; background: rgba(0,0,0,0.7);
    opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
  }
  .connecting-overlay.visible { opacity: 1; pointer-events: auto; }
  .connecting-rings {
    position: relative; width: 64px; height: 64px;
  }
  .connecting-rings .ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 3px solid #66bb6a;
    animation: pulse-ring 1.5s ease-out infinite;
  }
  .connecting-rings .ring:nth-child(2) { animation-delay: 0.4s; }
  .connecting-rings .ring-center {
    position: absolute; inset: 0; border-radius: 50%;
    background: rgba(76,175,80,0.2);
    display: flex; align-items: center; justify-content: center;
    animation: pulse-dot 1.5s ease-in-out infinite;
  }
  .connecting-rings .ring-center svg { width: 28px; height: 28px; fill: #66bb6a; }
  .connecting-text {
    color: #66bb6a; font-size: 12px; font-weight: 500; letter-spacing: 0.5px;
  }
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  @keyframes pulse-dot {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
```

- [ ] **Step 4: Add hangup button and mic-muted CSS**

Replace the existing `.vc-btn.mic-active` line and add:

```css
  .vc-btn.hangup {
    background: rgba(244,67,54,0.85); color: #fff;
  }
  .vc-btn.hangup:hover { background: rgba(244,67,54,1); }
  .vc-btn.hangup svg { width: 20px; height: 20px; fill: #fff; transform: rotate(135deg); }
  .vc-btn.mic-active { background: rgba(76,175,80,0.35); color: #66bb6a; }
  .vc-btn.mic-muted { background: rgba(244,67,54,0.35); color: #ef5350; }
```

- [ ] **Step 5: Add swipe dots CSS**

```css
  .swipe-dots {
    position: absolute; bottom: 8px; left: 0; right: 0;
    display: flex; justify-content: center; gap: 6px;
    z-index: 3; pointer-events: none;
  }
  .swipe-dots.hidden { display: none; }
  .swipe-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: rgba(255,255,255,0.3);
    transition: background 0.2s ease;
  }
  .swipe-dot.active { background: var(--bti-primary); }
```

- [ ] **Step 6: Commit**

```
git add cards/bticino-intercom-card.js
git commit -m "style: CSS for tabs, call/hangup buttons, connecting animation, swipe dots"
```

---

### Task 3: Rendering — tab bar, call overlay, connecting animation, updated controls

**Files:**
- Modify: `cards/bticino-intercom-card.js` — `_render()`, `_renderActionBtn()`, related methods

- [ ] **Step 1: Rewrite `_render()` with tab bar, call overlay, connecting animation, and updated controls**

Replace the entire `_render()` method. Key changes:
- Title uses `this._config.title` or "Intercom"
- Tab bar from `this._config.intercoms` (hidden if length === 1)
- Actions from `this._activeIntercom.actions`
- Call overlay replaces play overlay (green phone button)
- Connecting overlay with pulsing rings
- Video controls: hangup button replaces stop, mic icon reflects active/muted

```javascript
  _render() {
    const title = this._config.title || 'Intercom';
    const intercoms = this._config.intercoms;
    const ic = this._activeIntercom;
    const actions = ic.actions;
    const maxActions = this._config.max_actions;
    const visibleActions = actions.slice(0, maxActions);
    const overflowActions = actions.slice(maxActions);
    const hasOverflow = overflowActions.length > 0;
    const showTabs = intercoms.length > 1;
    const isFirefox = /Firefox/i.test(navigator.userAgent);
    const isInsecure = !window.isSecureContext;
    const showSslWarning = isInsecure && !this._config.ignore_ssl_warning && !this._sslWarningDismissed;

    this.shadowRoot.innerHTML = `
      <style>${CARD_STYLES}</style>
      <ha-card>
        <div class="title-bar">
          <div class="title">${this._esc(title)}</div>
          <div class="status-pill ready" id="status-pill">Ready</div>
        </div>
        <div class="tab-bar${showTabs ? '' : ' hidden'}" id="tab-bar">
          ${intercoms.map((t, i) => `<button class="tab${i === this._activeIndex ? ' active' : ''}" data-tab-idx="${i}">${this._esc(t.name)}</button>`).join('')}
        </div>
        ${isFirefox ? `
        <div class="warning-banner firefox">
          <ha-icon icon="mdi:firefox"></ha-icon>
          <div>Firefox is not supported — this card requires <b>Chrome</b> or a Chromium-based browser.
          <a href="https://github.com/k-the-hidden-hero/bticino_intercom/blob/main/docs/firefox-webrtc-investigation.md" target="_blank" rel="noopener">Learn why</a></div>
        </div>
        ` : ''}
        ${showSslWarning ? `
        <div class="warning-banner ssl" id="ssl-warning">
          <ha-icon icon="mdi:shield-alert-outline"></ha-icon>
          <div>Non-secure connection (HTTP) — the microphone requires HTTPS. Video and incoming audio work normally.</div>
          <button class="dismiss-btn" id="dismiss-ssl">Ignore</button>
        </div>
        ` : ''}
        <div class="video-area" id="video-area">
          <video id="video" autoplay playsinline></video>
          <div class="poster" id="poster"><img id="poster-img" alt="" /></div>
          <div class="call-overlay" id="call-overlay"><div class="call-btn">${ICON_PHONE}</div></div>
          <div class="connecting-overlay" id="connecting-overlay">
            <div class="connecting-rings">
              <div class="ring"></div>
              <div class="ring"></div>
              <div class="ring-center">${ICON_PHONE}</div>
            </div>
            <div class="connecting-text">Connessione in corso...</div>
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
          <div class="swipe-dots${showTabs ? '' : ' hidden'}" id="swipe-dots">
            ${intercoms.map((_, i) => `<div class="swipe-dot${i === this._activeIndex ? ' active' : ''}"></div>`).join('')}
          </div>
        </div>
        <div class="action-bar" id="action-bar">
          ${visibleActions.map((a, i) => this._renderActionBtn(a, i)).join('')}
          ${hasOverflow ? `<button class="action-btn" id="overflow-btn" title="More"><ha-icon icon="mdi:dots-vertical"></ha-icon><span class="action-label">...</span></button>` : ''}
          ${hasOverflow ? `<div class="overflow-popup" id="overflow-popup">${overflowActions.map((a, i) => this._renderOverflowItem(a, maxActions + i)).join('')}</div>` : ''}
        </div>
      </ha-card>
    `;
    this._bindEvents();
    this._updatePoster();
    this._updateActionStates();
  }
```

- [ ] **Step 2: Commit**

```
git add cards/bticino-intercom-card.js
git commit -m "feat: render tab bar, call/hangup buttons, connecting animation"
```

---

### Task 4: Event binding — tabs, call/hangup, swipe

**Files:**
- Modify: `cards/bticino-intercom-card.js` — `_bindEvents()`, add `_bindSwipe()`, `_switchIntercom()`

- [ ] **Step 1: Rewrite `_bindEvents()` for new elements**

Replace the entire `_bindEvents()` method. Key changes:
- Tab click handlers
- Call overlay click → `_startCall()`
- Hangup button → `_hangUp()`
- Swipe binding on video area
- Action buttons use `this._activeIntercom.actions`

```javascript
  _bindEvents() {
    const $ = (id) => this.shadowRoot.getElementById(id);
    $('call-overlay')?.addEventListener('click', () => this._startCall());
    $('error-dismiss')?.addEventListener('click', (e) => { e.stopPropagation(); this._dismissError(); });

    this.shadowRoot.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => this._switchIntercom(parseInt(tab.dataset.tabIdx, 10)));
    });

    const videoArea = $('video-area');
    videoArea?.addEventListener('mouseenter', () => this._showControls());
    videoArea?.addEventListener('mouseleave', () => this._hideControlsDelayed());
    videoArea?.addEventListener('touchstart', (e) => {
      if (!this._playing) return;
      if (e.target === videoArea || e.target.tagName === 'VIDEO') this._toggleControlsVisibility();
    }, { passive: true });

    this._bindSwipe(videoArea);

    $('vc-hangup')?.addEventListener('click', (e) => { e.stopPropagation(); this._hangUp(); });
    $('vc-volume')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleMute(); });
    $('vc-mic')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleMic(); });
    $('vc-fullscreen')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleFullscreen(); });

    this.shadowRoot.querySelectorAll('.action-btn[data-action-idx]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._executeAction(parseInt(btn.dataset.actionIdx, 10), btn);
      });
    });

    $('overflow-btn')?.addEventListener('click', (e) => { e.stopPropagation(); this._toggleOverflow(); });
    this.shadowRoot.querySelectorAll('.overflow-item').forEach(item => {
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

    document.removeEventListener('click', this._boundDocClick);
    document.addEventListener('click', this._boundDocClick);
  }
```

- [ ] **Step 2: Add `_bindSwipe()` method**

Add after `_bindEvents()`:

```javascript
  _bindSwipe(el) {
    if (!el || this._config.intercoms.length <= 1) return;
    el.addEventListener('touchstart', (e) => {
      this._touchStartX = e.touches[0].clientX;
      this._touchStartY = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - this._touchStartX;
      const dy = e.changedTouches[0].clientY - this._touchStartY;
      if (Math.abs(dx) < 50 || Math.abs(dy) > 30) return;
      const max = this._config.intercoms.length - 1;
      if (dx < 0 && this._activeIndex < max) this._switchIntercom(this._activeIndex + 1);
      else if (dx > 0 && this._activeIndex > 0) this._switchIntercom(this._activeIndex - 1);
    }, { passive: true });
  }
```

- [ ] **Step 3: Add `_switchIntercom()` method**

Add after `_bindSwipe()`:

```javascript
  _switchIntercom(index) {
    if (index === this._activeIndex || index < 0 || index >= this._config.intercoms.length) return;
    if (this._playing) this._hangUp();
    this._activeIndex = index;
    this._render();
  }
```

- [ ] **Step 4: Commit**

```
git add cards/bticino-intercom-card.js
git commit -m "feat: tab click, swipe gesture, intercom switching"
```

---

### Task 5: Call semantics — rename startPlay/stopPlay, update state transitions

**Files:**
- Modify: `cards/bticino-intercom-card.js` — rename and update play/stop methods, update `_setState`, `_updatePoster`, `_updateActionStates`, `_executeAction`, `_dismissError`

- [ ] **Step 1: Rename `_startPlay()` to `_startCall()` and update CONNECTING overlay**

Replace `_startPlay()`:

```javascript
  async _startCall() {
    if (this._playing) return;
    this._wantPlay = true;
    this._playing = true;
    this._reconnectCount = 0;

    if (!this._audioCtx || this._audioCtx.state === 'closed') {
      this._audioCtx = new AudioContext();
    }

    if (this._config.auto_mic && window.isSecureContext && navigator.mediaDevices?.getUserMedia) {
      try {
        this._micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (_) {}
    }

    this.shadowRoot?.getElementById('poster')?.classList.add('hidden');
    this.shadowRoot?.getElementById('call-overlay')?.classList.add('hidden');
    this.shadowRoot?.getElementById('connecting-overlay')?.classList.add('visible');

    this._setState(STATE.CONNECTING);
    this._connect();
  }
```

- [ ] **Step 2: Rename `_stopPlay()` to `_hangUp()` and hide connecting overlay**

Replace `_stopPlay()`:

```javascript
  _hangUp() {
    this._wantPlay = false;
    this._playing = false;
    this._hideControls();
    this._cleanup();
    const video = this.shadowRoot?.getElementById('video');
    if (video) video.srcObject = null;
    this.shadowRoot?.getElementById('error-overlay')?.classList.remove('visible');
    this.shadowRoot?.getElementById('connecting-overlay')?.classList.remove('visible');
    this.shadowRoot?.getElementById('poster')?.classList.remove('hidden');
    this.shadowRoot?.getElementById('call-overlay')?.classList.remove('hidden');
    this._updatePoster();
    this._setState(STATE.IDLE);
  }
```

- [ ] **Step 3: Update `_setState` — hide connecting overlay when LIVE**

Add to `_setState`, after updating the pill:

```javascript
  _setState(state, label) {
    this._state = state;
    const pill = this.shadowRoot?.getElementById('status-pill');
    if (!pill) return;
    const labels = {
      [STATE.IDLE]: 'Ready', [STATE.CONNECTING]: 'Connecting...',
      [STATE.LIVE]: 'LIVE', [STATE.RECONNECTING]: 'Reconnecting...', [STATE.ERROR]: 'Error',
    };
    pill.textContent = label || labels[state] || state;
    pill.className = `status-pill ${state === STATE.IDLE ? 'ready' : state}`;
    if (state === STATE.LIVE) {
      this.shadowRoot?.getElementById('connecting-overlay')?.classList.remove('visible');
    }
  }
```

- [ ] **Step 4: Update `_dismissError` to call `_hangUp`**

```javascript
  _dismissError() {
    this.shadowRoot?.getElementById('error-overlay')?.classList.remove('visible');
    this._hangUp();
  }
```

- [ ] **Step 5: Update `_updatePoster` to use active intercom's camera**

Replace `_updatePoster`:

```javascript
  _updatePoster() {
    const posterEl = this.shadowRoot?.getElementById('poster');
    const imgEl = this.shadowRoot?.getElementById('poster-img');
    if (!posterEl || !imgEl || !this._hass || !this._config) return;
    if (this._playing) { posterEl.classList.add('hidden'); return; }
    const cameraId = this._activeIntercom.camera;
    const entity = this._hass.states[cameraId];
    if (entity?.attributes?.entity_picture) {
      imgEl.src = entity.attributes.entity_picture;
      posterEl.classList.remove('hidden');
    } else {
      posterEl.classList.add('hidden');
    }
  }
```

- [ ] **Step 6: Update `_updateActionStates` to use active intercom's actions**

```javascript
  _updateActionStates() {
    if (!this._hass || !this._config) return;
    const actions = this._activeIntercom.actions;
    this.shadowRoot?.querySelectorAll('.action-btn[data-action-idx]').forEach(btn => {
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
```

- [ ] **Step 7: Update `_executeAction` to use active intercom's actions**

```javascript
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
```

- [ ] **Step 8: Update `_updateMicUI` — add mic-muted class**

```javascript
  _updateMicUI() {
    const btn = this.shadowRoot?.getElementById('vc-mic');
    if (!btn) return;
    btn.innerHTML = `<ha-icon icon="mdi:${this._micActive ? 'microphone' : 'microphone-off'}"></ha-icon>`;
    btn.classList.remove('mic-active', 'mic-muted');
    btn.classList.add(this._micActive ? 'mic-active' : 'mic-muted');
  }
```

- [ ] **Step 9: Commit**

```
git add cards/bticino-intercom-card.js
git commit -m "feat: call/hangup semantics, connecting animation, per-intercom poster and actions"
```

---

### Task 6: WebRTC — use active intercom's camera entity

**Files:**
- Modify: `cards/bticino-intercom-card.js` — `_connect()`, `_signalViaWebSocket()`, `_sendCandidate()`

- [ ] **Step 1: Update `_connect()` to use `this._activeIntercom.camera`**

In `_connect()`, replace:
```javascript
entity_id: this._config.camera,
```
with:
```javascript
entity_id: this._activeIntercom.camera,
```

This appears in the `callWS` for ICE server config (1 occurrence).

- [ ] **Step 2: Update `_signalViaWebSocket()` to use active intercom's camera**

In `_signalViaWebSocket()`, replace both occurrences of `this._config.camera` with `this._activeIntercom.camera`:
1. In the `camera/webrtc/offer` message
2. (There's only one in this method)

- [ ] **Step 3: Update `_sendCandidate()` to use active intercom's camera**

Replace `this._config.camera` with `this._activeIntercom.camera` in the `camera/webrtc/candidate` message.

- [ ] **Step 4: Commit**

```
git add cards/bticino-intercom-card.js
git commit -m "feat: WebRTC signaling uses active intercom's camera entity"
```

---

### Task 7: Update `hass` setter and registration

**Files:**
- Modify: `cards/bticino-intercom-card.js` — `set hass()`, registration block

- [ ] **Step 1: Update `set hass()` — no change needed for poster/actions since they already call the right methods**

The `set hass()` method already calls `_updatePoster()` and `_updateActionStates()` which now use `_activeIntercom`. No change needed. Verify it still works.

- [ ] **Step 2: Update registration description**

```javascript
window.customCards.push({
  type: 'bticino-intercom-card',
  name: 'BTicino Intercom',
  description: 'Multi-intercom card with live video, audio, and door controls (Chrome/Chromium only)',
  preview: true,
});
```

- [ ] **Step 3: Remove old `PLAY_ICON` constant if still present**

Search for `PLAY_ICON` and remove the line. It was replaced by `ICON_PHONE` and `ICON_HANGUP` in Task 1.

- [ ] **Step 4: Commit**

```
git add cards/bticino-intercom-card.js
git commit -m "chore: update registration, remove old play icon"
```

---

### Task 8: Deploy and manual test

- [ ] **Step 1: Deploy to HA**

```bash
cat cards/bticino-intercom-card.js | ssh root@ha.asgard.lan -p 22222 "docker exec -i homeassistant tee /config/www/bticino-intercom-card.js > /dev/null"
```

- [ ] **Step 2: Update cache buster**

Update the HA lovelace resource `?v=` parameter to `?v=400`.

- [ ] **Step 3: Update dashboard config**

Change the Lovelace card YAML from old flat format to new `intercoms[]` format:

```yaml
type: custom:bticino-intercom-card
title: Intercom
intercoms:
  - name: Strada
    camera: camera.bticino_intercom_casella_citofono_strada
    actions:
      - entity: lock.bticino_intercom_casella_porta_esterna
        icon: mdi:gate
        label: Cancello
        service: lock.unlock
      - entity: light.bticino_intercom_casella_luci_scale
        icon: mdi:lightbulb
        label: Luci Scale
        service: light.turn_on
  - name: Ingresso
    camera: camera.bticino_intercom_casella_citofono_ingresso
    actions:
      - entity: lock.bticino_intercom_casella_porta_esterna
        icon: mdi:gate
        label: Cancello
        service: lock.unlock
```

- [ ] **Step 4: Browser test — Ctrl+Shift+R and verify**

Check:
1. Tab bar shows "Strada" and "Ingresso" tabs
2. Clicking tabs switches poster image and action buttons
3. Green phone call button replaces old play button
4. Clicking call button shows connecting animation (pulsing rings)
5. Video connects and shows live feed with hangup (red phone) button
6. Mic button shows green when active, red when muted
7. Swipe left/right on video area switches tabs (mobile or touch simulation)
8. Swipe dots update to match active tab
9. Single-intercom config hides tab bar and swipe dots

- [ ] **Step 5: Final commit**

```
git add cards/bticino-intercom-card.js
git commit -m "feat: multi-intercom card v4.0.0 — tabs, swipe, call UX"
```
