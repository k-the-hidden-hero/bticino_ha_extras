# BTicino HA Extras

Blueprints, Lovelace cards, and companion resources for the [BTicino Intercom](https://github.com/k-the-hidden-hero/bticino_intercom) Home Assistant integration.

## What's Included

### Blueprints

| Blueprint | Description |
|-----------|-------------|
| **Intercom Notification** | Urgent push notification when the doorbell rings, with live snapshot preview and actionable buttons: *Answer*, *Open Door*, *Reject* |

### Lovelace Cards

*Coming soon* — custom intercom card with live video, door controls, and call history.

## Installation

### HACS (Recommended)

1. Open HACS → Automation
2. Click the three dots → Custom repositories
3. Add `k-the-hidden-hero/bticino_ha_extras` as category **Automation**
4. Install "BTicino HA Extras"
5. Restart Home Assistant

### Manual

Copy the `blueprints/` folder contents into your Home Assistant `config/blueprints/` directory.

## Requirements

- [BTicino Intercom](https://github.com/k-the-hidden-hero/bticino_intercom) integration (v1.9.6+ for notifications, v2.0+ for WebRTC video)
- Home Assistant Companion App (for push notifications)

## Usage

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
