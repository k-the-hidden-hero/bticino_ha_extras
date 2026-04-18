# BTicino HA Extras

Blueprints, Lovelace cards, and companion resources for the [BTicino Intercom](https://github.com/k-the-hidden-hero/bticino_intercom) Home Assistant integration.

## What's Included

### Blueprints

| Blueprint | Description |
|-----------|-------------|
| **Intercom Notification** | Urgent push notification when the doorbell rings, with live snapshot preview and actionable buttons: *Answer*, *Open Door*, *Reject* |

### Lovelace Cards

| Card | Description |
|------|-------------|
| **BTicino Intercom Card** | Live video with real audio from BTicino intercom cameras. Solves the audio problem that HA's built-in player cannot (the device requires a real outbound audio track to activate its microphone). |

## Installation

### HACS (Recommended)

1. Open HACS → Automation
2. Click the three dots → Custom repositories
3. Add `k-the-hidden-hero/bticino_ha_extras` as category **Automation**
4. Install "BTicino HA Extras"
5. Restart Home Assistant

### Manual

Copy the `blueprints/` folder contents into your Home Assistant `config/blueprints/` directory.

For the Lovelace card, copy `cards/bticino-intercom-card.js` to your `config/www/` directory, then add it as a resource:

1. Go to **Settings -> Dashboards -> Resources**
2. Click **Add Resource**
3. URL: `/local/bticino-intercom-card.js`
4. Type: **JavaScript Module**
5. Click **Create**

## Requirements

- [BTicino Intercom](https://github.com/k-the-hidden-hero/bticino_intercom) integration (v1.9.6+ for notifications, v2.0+ for WebRTC video)
- Home Assistant Companion App (for push notifications)

## Usage

### BTicino Intercom Card

Add the card to any dashboard:

```yaml
type: custom:bticino-intercom-card
entity: camera.bticino_intercom_casella_citofono_strada
poster_entity: camera.bticino_intercom_casella_last_event_vignette  # optional
title: Citofono Strada  # optional, defaults to entity friendly name
```

**Configuration options:**

| Option | Required | Description |
|--------|----------|-------------|
| `entity` | Yes | Camera entity from the BTicino Intercom integration |
| `poster_entity` | No | Entity to use for the poster image (e.g., last event snapshot camera) |
| `title` | No | Card title (defaults to the entity's friendly name) |

**Controls:**

- **Play/Stop** -- click the video area or the play button to start/stop the stream
- **Mute/Unmute** -- toggle audio playback
- **Microphone** -- enable two-way audio (uses your device's microphone)
- **Fullscreen** -- expand the video to fill the screen

The card does not auto-connect on dashboard load to save device resources. The BTicino device terminates WebRTC sessions after ~30 seconds of inactivity; the card auto-reconnects transparently as long as the stream is active.

### Intercom Notification Blueprint

1. Go to **Settings → Automations & Scenes → Blueprints**
2. Find "BTicino Intercom Notification"
3. Click **Create Automation**
4. Configure:
   - **Notify targets**: Select your mobile devices
   - **Door lock**: Choose which lock to open (porta esterna / interna)
   - **Camera**: Select the live video camera entity (optional, for "Answer" action)
5. Save

When the doorbell rings:
- You'll receive an urgent notification (bypasses Do Not Disturb)
- If a snapshot is available, the notification updates with a preview image
- Tap **Answer** to open the live video stream
- Tap **Open Door** to unlock without answering
- Tap **Reject** to dismiss

## Related Projects

- [bticino_intercom](https://github.com/k-the-hidden-hero/bticino_intercom) — Home Assistant custom integration for BTicino Classe 100X/300X
- [pybticino](https://github.com/k-the-hidden-hero/pybticino) — Python library for the BTicino/Netatmo API

## License

MIT
