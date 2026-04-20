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
| **BTicino Intercom Card** | Compact intercom card with live WebRTC video, two-way audio, multi-intercom tabs, call history, and incoming call notifications with ringtone. |

![Idle State](docs/images/card-idle.png)
![Live State](docs/images/card-live.png)
![Call History](docs/images/card-history.png)

## Installation

### HACS (Recommended)

1. Open HACS → Automation
2. Click the three dots → Custom repositories
3. Add `k-the-hidden-hero/bticino_ha_extras` as category **Automation**
4. Install "BTicino HA Extras"
5. Restart Home Assistant

### Manual

Copy the `blueprints/` folder contents into your Home Assistant `config/blueprints/` directory.

For the Lovelace card, copy `dist/bticino-intercom-card.js` to your `config/www/` directory, then add it as a resource:

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
intercoms:
  - name: Front Door
    camera: camera.bticino_intercom_front_door
    actions:
      - entity: lock.front_gate
        service: lock.unlock
      - entity: lock.main_door
        service: lock.unlock
  - name: Side Entrance
    camera: camera.bticino_intercom_side_entrance
    actions:
      - entity: lock.side_gate
        service: lock.unlock
```

**Configuration options:**

| Option | Required | Description |
|--------|----------|-------------|
| `intercoms` | Yes | Array of intercom configurations |
| `intercoms[].name` | Yes | Display name for the intercom tab |
| `intercoms[].camera` | Yes | Camera entity from the BTicino Intercom integration |
| `intercoms[].actions` | No | Quick action buttons (entity + service) |
| `max_actions` | No | Max visible actions before overflow menu (default: 4) |
| `auto_mic` | No | Auto-enable microphone on call start (default: true) |

**Features:**

- **Compact idle** -- minimal footprint with intercom name and "Chiama" button
- **Multi-intercom tabs** -- switch between intercoms via tabs or swipe
- **Live video** -- WebRTC with real audio (Chrome/Chromium only)
- **Two-way audio** -- microphone toggle for talking to visitors
- **Call history** -- browse past calls with snapshots
- **Incoming call** -- ringtone, snapshot preview, Answer/Open/Reject actions
- **Quick actions** -- open doors, toggle lights while on a call

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
