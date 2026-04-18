# BTicino Intercom Card — Design Spec

## Goal

A single, modular Lovelace card that provides a complete intercom experience: live video with audio, door/light controls, and incoming call handling. Supports 1-N intercoms with 0-N cameras, configurable actions, and three distinct UI states.

## Configuration

```yaml
type: custom:bticino-intercom-card
intercoms:
  - name: Citofono Strada
    camera: camera.bticino_intercom_casella_citofono_strada
    poster: camera.bticino_intercom_casella_last_event_vignette
    call_sensor: binary_sensor.bticino_intercom_casella_citofono_strada
    actions:
      - entity: lock.bticino_intercom_casella_porta_esterna
        icon: mdi:gate
        label: Porta Est.
        service: lock.unlock
      - entity: light.bticino_intercom_casella_luci_scale
        icon: mdi:stairs
        label: Luci
        service: light.turn_on
  - name: Citofono Ingresso
    # no camera — audio-only intercom
    call_sensor: binary_sensor.bticino_intercom_casella_citofono_ingresso
    actions:
      - entity: lock.bticino_intercom_casella_porta_interna
        icon: mdi:door
        label: Porta Int.
        service: lock.unlock
max_visible_actions: 4  # optional, default 4. Overflow goes to "..." menu
```

## Card Structure

```
┌─────────────────────────────────┐
│  Title          [tab1] [tab2]   │  ← tabs for multi-intercom
├─────────────────────────────────┤
│                                 │
│         VIDEO / AUDIO GIF       │  ← main content area (4:3)
│         (overlay controls)      │
│                                 │
├─────────────────────────────────┤
│  [🔓 Porta] [💡 Luci] [⋯]     │  ← action bar (hidden during call)
└─────────────────────────────────┘
```

## Three UI States

### 1. IDLE

The card is not streaming and no call is active.

**Main area**: Poster image (from `poster` entity) or intercom icon (if no camera). Large centered play button overlay.

**Tabs**: Visible, user can switch between intercoms manually.

**Action bar**: Visible with configured actions. First `max_visible_actions` shown, rest in overflow menu ("...").

**Status badge**: "Ready" or entity connection status.

### 2. LIVE (on-demand)

The user clicked play to view the camera feed.

**Main area**: 
- With camera: live WebRTC video (with AudioContext silence track for mic activation)
- Without camera: animated audio equalizer/soundwave GIF

**Overlay controls** (appear on hover/tap, auto-hide after 3s):
- Play/pause
- Volume mute/unmute
- Microphone toggle (two-way audio via getUserMedia)
- Fullscreen

**Tabs**: Visible, user can switch intercoms (stops current stream, starts new one).

**Action bar**: Visible with configured actions.

**Status badge**: Red "LIVE" indicator.

**Auto-reconnect**: Device terminates sessions after ~30s. Card auto-reconnects transparently with brief "Reconnecting..." status.

### 3. INCOMING CALL

Someone rings the doorbell. The card detects via `call_sensor` entity going to `on`.

**Auto-switch**: Card automatically selects the tab of the ringing intercom.

**Main area**: Snapshot preview (from poster entity) or last event image. If video was already playing, keeps the live feed.

**Call overlay** (prominent, covers the main area):
- Caller info: "Qualcuno al citofono" + intercom name
- Three large buttons:
  - **Rispondi** (green) — starts WebRTC stream (answer mode)
  - **Apri** (blue) — unlocks the configured primary lock
  - **Rifiuta** (red) — dismisses the call overlay

**Action bar**: HIDDEN during incoming call to focus on call actions.

**Accessing other actions during call**: 
- Mobile: swipe up from bottom reveals action bar
- Desktop: small overflow "..." button in corner

**Transition**: After answering → state becomes LIVE with mic/volume/fullscreen overlay. After call ends (sensor off) → returns to IDLE.

## Main Content Area

Always maintains the same dimensions (4:3 aspect ratio) regardless of content:

| Scenario | Content |
|----------|---------|
| Idle, has camera | Poster image + play button |
| Idle, no camera | Static intercom icon + play button |
| Live, has camera | WebRTC video stream |
| Live, no camera | Live audio visualizer (canvas driven by AnalyserNode from real audio stream) |
| Incoming call | Snapshot preview + call overlay |

## Action Buttons

Each action is a configurable entity + service call:

```yaml
actions:
  - entity: lock.porta_esterna    # entity_id to monitor state
    icon: mdi:gate                # MDI icon
    label: Porta Est.             # display label
    service: lock.unlock          # HA service to call
    service_data: {}              # optional service data
```

**Visual behavior**:
- Default: icon + label, subtle background
- Active state: colored highlight (e.g., lock unlocked → green, light on → yellow)
- Feedback: brief animation on tap (ripple or pulse)

**Overflow menu**: When actions exceed `max_visible_actions`, a "..." button opens a popup/dropdown with the remaining actions.

## Multi-Intercom Navigation

**Tabs**: Horizontal tabs at top of card, one per intercom. Shows intercom name. Active tab has underline/highlight.

**Swipe**: On mobile, swipe left/right on the video area to switch intercoms. Dots indicator optional.

**Both work simultaneously**: tap tabs or swipe.

**Incoming call override**: When a call comes in, the card auto-switches to that intercom's tab regardless of which one is currently selected. After call ends, stays on that tab (doesn't auto-switch back).

## Audio Implementation

The card uses the AudioContext + OscillatorNode (0Hz) trick to activate the BTicino device's microphone:

1. On play: create `AudioContext` → `OscillatorNode(0Hz)` → `createMediaStreamDestination()` → `addTrack()` to PeerConnection
2. This generates `sendrecv` + real SSRC in the SDP offer
3. Device receives silence RTP → activates its microphone
4. Device sends real audio → card plays it unmuted

Two-way audio (microphone button): replaces the silence oscillator track with `getUserMedia({audio: true})`. Push the mic button → browser asks for permission → user speaks → audio goes to device.

## Responsive Design

**Mobile (< 600px)**:
- Single column, full width
- Tabs become swipeable pills
- Action buttons: icons only (labels hidden), or 2-column grid
- Swipe up for overflow actions during call

**Desktop (≥ 600px)**:
- Card has max-width (e.g., 480px)
- Tabs as horizontal bar
- Action buttons: icon + label, single row

## Styling

- Dark background (`var(--ha-card-background)`)
- Rounded corners matching HA cards (`var(--ha-card-border-radius)`)
- Uses HA CSS variables throughout for theme compatibility
- `ha-card` wrapper for native HA look
- Video area: black background, rounded corners
- Status badges: colored pills (green=ready, red=live, orange=ringing)

## WebRTC Signaling

Uses HA WebSocket API:
1. `camera/webrtc/offer` — send SDP offer
2. Capture `session_id` from `session` event
3. `camera/webrtc/candidate` — forward browser ICE candidates (with session_id)
4. Receive device ICE candidates and answer via event subscription

## YAML Validation

Required fields:
- `intercoms`: at least one entry
- Each intercom: `name` required, everything else optional

Optional fields with defaults:
- `camera`: null (audio-only mode)
- `poster`: null (uses camera entity_picture if camera set, else intercom icon)
- `call_sensor`: null (no incoming call detection)
- `actions`: [] (no action buttons)
- `max_visible_actions`: 4

## File Structure

Single JS file, no build step:
```
cards/
  bticino-intercom-card.js
```

## Audio Visualizer (no-camera mode)

When an intercom has no camera, the main content area shows a **live audio visualizer** driven by the real audio stream:

1. Get audio track from `RTCPeerConnection` remote stream
2. Route through `AudioContext` → `AnalyserNode` (fftSize: 256)
3. Render `getByteFrequencyData()` on a `<canvas>` element using `requestAnimationFrame`
4. Style: vertical bars or waveform, colored to match the card theme
5. Bars react to the interlocutor's voice in real-time
6. When audio is silent: bars at minimum height (subtle idle animation)
7. When someone speaks: bars jump to match volume/frequency

This replaces a static GIF with a dynamic visualization that gives real feedback about the audio connection quality and when someone is speaking.

## Out of Scope (Future)

- Call history / event log in card
- PTZ controls
- Recording / screenshot button
- Multiple simultaneous video streams
- Integration with HA notifications (handled by blueprint separately)
