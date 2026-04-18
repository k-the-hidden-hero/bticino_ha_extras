# Intercom Card Phase 1: Base Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the BTicino intercom card with proper config schema, IDLE/LIVE states, configurable action buttons with overflow menu, and dark themed UI matching the approved mockup design.

**Architecture:** Single JS file using vanilla custom elements (no build step). The card wraps the existing WebRTC + AudioContext audio trick in a polished UI with two states (IDLE with poster/play button, LIVE with video + overlay controls). Action buttons are configured via YAML and rendered as a row with overflow menu for excess items.

**Tech Stack:** Vanilla JS, Custom Elements, CSS custom properties (HA theme vars), HA WebSocket API for WebRTC signaling.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cards/bticino-intercom-card.js` | Rewrite | Complete card: config, rendering, WebRTC, actions |

## Design Reference

- Spec: `docs/specs/2026-04-18-intercom-card-design.md`
- Mockup: Gemini-generated mockup (dark theme, video area + action bar)
- Working prototype: current `cards/bticino-intercom-card.js` (WebRTC + audio working)

## Config Schema (Phase 1 — single intercom)

```yaml
type: custom:bticino-intercom-card
camera: camera.bticino_intercom_casella_citofono_strada
poster: camera.bticino_intercom_casella_last_event_vignette
title: Citofono Strada
actions:
  - entity: lock.bticino_intercom_casella_porta_esterna
    icon: mdi:gate
    label: Porta Est.
    service: lock.unlock
  - entity: light.bticino_intercom_casella_luci_scale
    icon: mdi:lightbulb
    label: Luci
    service: light.toggle
max_actions: 4
```

Note: Phase 1 uses flat config (not nested `intercoms[]`). Multi-intercom (Phase 2) will wrap this in the `intercoms[]` array.

---

### Task 1: Card skeleton with config and IDLE state

Rewrite the card JS with:
- Custom element registration (`bticino-intercom-card`)
- Config validation (`setConfig`)
- HACS card registration
- Shadow DOM with styles
- IDLE state rendering: title bar, video area with poster + play button, action bar

**Files:**
- Rewrite: `cards/bticino-intercom-card.js`

- [ ] **Step 1: Write card skeleton**

Write the full card skeleton with:
- `setConfig(config)` — validates required `camera` or `actions`, stores config
- `set hass(hass)` — stores hass, triggers render
- `render()` — creates shadow DOM with: title bar, video area (poster + play overlay), action bar
- CSS using HA variables for dark/light theme compatibility
- Card registration for HACS picker

The card should show in IDLE state:
- Title bar: card title (from config or entity friendly_name) + status badge ("Ready")
- Video area: 4:3 aspect ratio, black background, poster image from `poster` entity's `entity_picture`, large centered play button
- Action bar: row of buttons from `actions` config, each with icon + label. If more than `max_actions`, last slot becomes "..." overflow button.
- Overflow menu: popup with remaining actions

CSS requirements:
- Dark background (`var(--card-background-color, var(--ha-card-background, #1a1a1a))`)
- Rounded corners (`var(--ha-card-border-radius, 12px)`)
- `ha-card` wrapper
- Video area: black, rounded corners, position relative for overlays
- Play button: 64px white circle with play triangle, centered, semi-transparent background
- Action buttons: icon (24px) + label (12px), column layout, subtle background on hover
- Status badge: small pill, green for ready
- Responsive: on narrow screens, action labels hide (icon only)

- [ ] **Step 2: Deploy and test IDLE state**

```bash
cat cards/bticino-intercom-card.js | ssh root@ha.asgard.lan -p 22222 "docker exec -i homeassistant tee /config/www/bticino-intercom-card.js > /dev/null"
```

Test: add card to dashboard, verify poster shows, play button visible, action buttons render.

- [ ] **Step 3: Commit**

```bash
git add cards/bticino-intercom-card.js
git commit -m "feat: card skeleton with IDLE state, config, and action bar"
```

---

### Task 2: WebRTC LIVE state with audio

Port the working WebRTC + AudioContext code from the current card into the new structure. When user clicks play:

1. Create AudioContext + OscillatorNode(0Hz) → silence track
2. Create RTCPeerConnection, addTrack(silenceTrack), addTransceiver('video', recvonly)
3. createOffer → send via HA WebSocket (camera/webrtc/offer)
4. Capture session_id from "session" event
5. Handle answer → setRemoteDescription
6. Forward ICE candidates both directions (browser→device via camera/webrtc/candidate with session_id, device→browser via addIceCandidate)
7. Attach remote stream to video element
8. On disconnect/close: auto-reconnect after 2s

**Files:**
- Modify: `cards/bticino-intercom-card.js`

- [ ] **Step 1: Implement LIVE state**

When play is clicked:
- Hide play overlay, show video element
- Status badge: "Connecting..." (orange) → "LIVE" (red) on connected
- Create WebRTC connection with audio trick
- Signaling via separate WebSocket to `/api/websocket` (auth with `this._hass.auth.data.access_token`)
- Video overlay controls: pause button (bottom-left), volume toggle (bottom-left next to pause), mic toggle, fullscreen (bottom-right)
- Controls auto-hide after 3s, reappear on hover/tap

When stop is clicked or connection fails:
- Close PeerConnection, close WebSocket
- Show poster + play button again (IDLE state)
- Status badge back to "Ready"

Auto-reconnect:
- On `connectionState === 'failed'` or `'closed'`: wait 2s, reconnect
- Show "Reconnecting..." status
- Max 5 retries, then show error

- [ ] **Step 2: Deploy and test LIVE state**

Deploy to HA, click play, verify:
- Video streams
- Audio works (device mic activated by silence track)
- Overlay controls visible on hover
- Close/reopen works
- Auto-reconnect on ~30s device timeout

- [ ] **Step 3: Commit**

```bash
git add cards/bticino-intercom-card.js
git commit -m "feat: LIVE state with WebRTC video + audio and overlay controls"
```

---

### Task 3: Action buttons functionality

Make action buttons actually call HA services when clicked.

**Files:**
- Modify: `cards/bticino-intercom-card.js`

- [ ] **Step 1: Implement action button clicks**

When an action button is clicked:
- Call `this._hass.callService(domain, service, serviceData, {entity_id})` 
  - Parse domain/service from config `service` field (e.g., "lock.unlock" → domain="lock", service="unlock")
  - `entity_id` from config `entity` field
- Visual feedback: button briefly highlights (pulse animation, 300ms)
- Active state indication: if entity state is "on"/"unlocked"/"open", button gets colored highlight:
  - Lock entities: green when unlocked
  - Light entities: yellow when on
  - Default: blue when active

Overflow menu:
- "..." button opens a popup positioned above the button
- Popup contains the remaining action buttons in a vertical list
- Click outside closes the popup
- Each item: icon + label, full width, same click behavior

- [ ] **Step 2: Deploy and test actions**

Deploy, test:
- Click lock button → door unlocks (verify via HA state)
- Click light button → light toggles
- Visual feedback on click
- Overflow menu if > max_actions configured

- [ ] **Step 3: Commit**

```bash
git add cards/bticino-intercom-card.js
git commit -m "feat: action buttons with service calls, active states, and overflow menu"
```

---

### Task 4: Two-way audio (microphone button)

Add microphone toggle in the video overlay controls.

**Files:**
- Modify: `cards/bticino-intercom-card.js`

- [ ] **Step 1: Implement mic toggle**

Mic button in overlay controls:
- Default: mic-off icon, not active
- Click: request `getUserMedia({audio: true})`
  - On success: replace the silence oscillator track with the real mic track via `sender.replaceTrack(micTrack)`
  - Button changes to mic-on icon with green highlight
  - Browser shows mic permission indicator
- Click again: replace mic track back with silence oscillator track
  - Button back to mic-off
- On error (permission denied): show brief error toast, keep silence track

- [ ] **Step 2: Deploy and test mic**

Deploy, test:
- Click mic → browser asks permission
- Speak → audio goes to device (verify half-duplex behavior)
- Click mic again → stops sending voice
- Permission denied → graceful fallback

- [ ] **Step 3: Commit**

```bash
git add cards/bticino-intercom-card.js
git commit -m "feat: two-way audio with microphone toggle"
```

---

### Task 5: Polish and deploy

Final cleanup and deploy.

**Files:**
- Modify: `cards/bticino-intercom-card.js`
- Modify: `README.md`

- [ ] **Step 1: Visual polish**

- Smooth transitions between IDLE/LIVE states (fade/opacity)
- Play button hover effect (scale)
- Video controls fade in/out (opacity transition 200ms)
- Action button ripple effect on click
- Error state: if WebRTC fails after retries, show error message in video area with retry button
- Loading state: spinner in video area while connecting

- [ ] **Step 2: Update README**

Update card documentation in README with new config schema and screenshots.

- [ ] **Step 3: Deploy final version to HA**

```bash
cat cards/bticino-intercom-card.js | ssh root@ha.asgard.lan -p 22222 "docker exec -i homeassistant tee /config/www/bticino-intercom-card.js > /dev/null"
```

- [ ] **Step 4: Commit and push**

```bash
git add cards/bticino-intercom-card.js README.md
git commit -m "feat: intercom card v2 — phase 1 complete"
git push origin main
```
