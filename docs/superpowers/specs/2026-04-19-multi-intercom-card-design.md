# Multi-Intercom Card — Design Spec

**Date:** 2026-04-19
**Status:** Approved
**Scope:** Phase 2 of bticino-intercom-card — multi-intercom support with tabs, swipe, and call-oriented UX

## Overview

Transform the single-intercom card into a multi-intercom card that manages multiple BTicino external units (e.g., "Citofono Strada" and "Citofono Ingresso") within a single Lovelace card. Each intercom has its own WebRTC session, poster image, and action buttons. Only one intercom is active at a time (device hardware limitation).

## Config Format

Breaking change from v3.x flat config. No backwards compatibility needed (not yet released publicly).

```yaml
type: custom:bticino-intercom-card
intercoms:
  - name: Strada
    camera: camera.citofono_strada
    actions:
      - entity: lock.cancello_strada
        icon: mdi:gate
        label: Cancello
        service: lock.unlock
      - entity: light.luci_scale
        icon: mdi:lightbulb
        label: Luci
        service: light.turn_on
  - name: Ingresso
    camera: camera.citofono_ingresso
    actions:
      - entity: lock.cancello_ingresso
        icon: mdi:gate
        label: Cancello
        service: lock.unlock
max_actions: 4        # per-intercom action bar limit (overflow menu for extras)
auto_mic: true        # auto-activate mic on call start
ignore_ssl_warning: false
```

### Validation

- `intercoms` array is required, minimum 1 element
- Each intercom must have `name` and `camera`
- `actions` is optional per intercom (defaults to empty)
- `max_actions`, `auto_mic`, `ignore_ssl_warning` are global (top-level)

### Single Intercom Behavior

When `intercoms` has exactly 1 element, the tab bar is hidden. The card behaves identically to a single-intercom card — no visual difference.

## UI Layout (top to bottom)

### 1. Title Bar
- Fixed at top
- Left: card title (optional top-level `title`, or "Intercom")
- Right: status pill (Ready / Connecting / Live / Error)

### 2. Tab Bar
- One tab per intercom, labeled with `name`
- Active tab: highlighted with `--bti-primary` background (rgba), bold text
- Inactive tabs: subtle background, secondary text color
- Click to switch intercom
- Hidden when only 1 intercom is configured

### 3. Warning Banners (global)
- Firefox detection banner (red, persistent, link to docs)
- SSL/HTTPS banner (amber, dismissable via button or `ignore_ssl_warning` config)
- Position: between tab bar and video area
- These are global, not per-intercom

### 4. Video Area
- Aspect ratio: 4/3
- Three visual states (see Call States below)
- **Swipe gesture** (mobile): horizontal swipe on video area to switch intercom
  - Touch threshold: 50px horizontal movement
  - Animation: CSS translateX slide transition
  - Updates tab bar highlight to match
- **Swipe dots**: small dot indicators overlaid at bottom of video area
  - Active dot: `--bti-primary` color
  - Inactive dots: white with low opacity
  - Hidden when only 1 intercom

### 5. Action Bar
- Displays actions for the **active intercom only**
- Changes when switching tabs
- Same overflow menu behavior as current card (max_actions threshold)
- Action buttons: icon + label, service calls, active state highlights, pulse animation

## Call States

### IDLE
- **Poster**: last event snapshot from camera entity (or empty dark background)
- **Call button**: green circle (76,175,80) with phone icon (mdi:phone), centered on poster
- **Semantics**: "tap to call the intercom" — not a generic play button
- **Status pill**: "Ready" (green)

### CONNECTING
- **Background**: dark, poster fades out
- **Animation**: pulsing concentric rings expanding from center phone icon
  - Two rings with staggered delay (0s, 0.4s), scale 1→1.8, fade out
  - Phone icon pulses subtly (scale 1→1.1)
  - Color: green (#66bb6a)
- **Text**: "Connessione in corso..." below the animation
- **Status pill**: "Connecting..." (amber)

### LIVE
- **Video**: live WebRTC feed visible
- **Overlay controls** (bottom gradient bar, show on hover/touch):
  - Left group:
    - **Hangup button**: red circle (244,67,54) with rotated phone icon (135deg) — "riaggancia"
    - **Volume**: standard mute/unmute toggle
    - **Microphone**: green background (76,175,80 @ 0.35) when active, red (244,67,54 @ 0.35) when muted
  - Right group:
    - **Fullscreen**: standard fullscreen toggle
- **Status pill**: "LIVE" (red)
- **Mic auto-activation**: if `auto_mic: true`, mic starts active (green) when call connects

### ERROR
- Same as current: overlay with error icon, friendly message, dismiss button

## Intercom Switching

### Tab Click
1. If a WebRTC session is live, stop it (close peer connection, websocket)
2. Update `_activeIndex` to new tab
3. Re-render action bar with new intercom's actions
4. Show new intercom's poster in video area
5. Reset state to IDLE

### Swipe (mobile)
1. Detect horizontal swipe on video area (`touchstart` → `touchmove` → `touchend`)
2. Threshold: 50px horizontal movement, with less than 30px vertical (prevent scroll conflicts)
3. Animate video area sliding left/right with CSS `transform: translateX()`
4. On swipe completion: same logic as tab click (stop session, switch, reset)

### Auto-switch on Incoming Call
1. Monitor `call_sensor` entity state or coordinator dispatcher signal
2. When a call event arrives for a specific module, find the matching intercom by `camera` entity
3. If the ringing intercom is not the active tab, auto-switch to it
4. If a WebRTC session is active on another tab, stop it first
5. Show the incoming call state (Phase 3 scope — for now, just switch to the tab)

## Internal Architecture

### State Management

```
_activeIndex: number          // currently selected intercom tab (0-based)
_intercoms: IntercomConfig[]  // parsed from config.intercoms
_state: State                 // IDLE | CONNECTING | LIVE | RECONNECTING | ERROR (shared)
```

Each intercom's WebRTC session is ephemeral — created on call start, destroyed on hangup or tab switch. No persistent connections.

### Key Methods

- `_render()`: generates full card HTML including tab bar, video area for active intercom, action bar for active intercom
- `_switchIntercom(index)`: stops current session if any, updates `_activeIndex`, re-renders action bar and poster
- `_startCall()`: replaces `_startPlay()` — initiates WebRTC session for `_intercoms[_activeIndex].camera`
- `_hangUp()`: replaces `_stopPlay()` — terminates WebRTC session, returns to IDLE
- `_connect()`: same WebRTC logic, uses `_intercoms[_activeIndex].camera` for signaling
- `_bindSwipe()`: attaches touch handlers to video area for horizontal swipe detection

### Config Parsing

`setConfig(config)` validates and normalizes:
```javascript
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
```

### CSS Additions

- `.tab-bar`: flex container for intercom tabs
- `.tab`: individual tab button
- `.tab.active`: highlighted active tab
- `.swipe-dots`: dot container overlaid on video
- `.call-btn`: green phone button (IDLE state)
- `.connecting-animation`: pulsing rings container
- `.hangup-btn`: red phone button (LIVE state)
- `.vc-btn.mic-active`: green mic indicator
- `.vc-btn.mic-muted`: red mic indicator

## File Changes

All changes in a single file: `cards/bticino-intercom-card.js`

- Replace flat config parsing with `intercoms[]` array
- Add tab bar rendering and click handlers
- Add swipe gesture detection on video area
- Replace play button with phone call button
- Replace stop button with hangup button
- Add connecting animation
- Update mic button styling (green active, red muted)
- Version bump to 4.0.0 (breaking config change)

## Out of Scope

- Phase 3: Incoming call overlay (Rispondi/Apri/Rifiuta)
- Phase 4: Audio visualizer for camera-less intercoms
- Phase 5: Polish + HACS distribution
- Simultaneous multi-stream (hardware limitation: one peer at a time)
