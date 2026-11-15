# The intercom on View Assist

When an entrance rings, a [View Assist](https://dinki.github.io/View-Assist/) screen opens a
full-screen intercom view: the BTicino Classe 100X card in its `kiosk` layout, with **Answer**,
**Open** and **Reject** as round buttons along the bottom. The screen stays on the call while it
lasts and goes back to what it was showing 5 seconds after the call is over.

Two pieces do it:

- **The intercom view** ([`view_assist/intercom.yaml`](../view_assist/intercom.yaml)), a view for
  the View Assist dashboard, built like its other views.
- **The blueprint** "BTicino Intercom on View Assist", which opens the view on the screens you
  choose when an entrance rings.

## What you need

- The [BTicino Intercom](https://github.com/k-the-hidden-hero/bticino_intercom) integration, with
  its doorbell (`event`) entities.
- This repository's cards, 2026.11.1 or later: the view reads the call state that version of the
  100X card publishes.
- View Assist with its default dashboard at `/view-assist`. The view uses the dashboard's
  `variable_template`, `responsive_base` and `body_template` button-card templates.
- Home Assistant 2026.7 or later for the blueprint.
- A Chromium-based browser on the screen for live video (the View Assist Companion App on Android
  is one), as for the cards everywhere else.

## 1. Add the view

1. Open the View Assist dashboard, then **Edit dashboard** > three dots > **Raw configuration
   editor**.
2. Paste the content of [`view_assist/intercom.yaml`](../view_assist/intercom.yaml) as a new item
   under `views:`, next to the others, and save.

The view's path is `intercom`. To use another one, change both `path:` and `var_view_path:` in the
view, and give the blueprint the same path.

To check it, open `/view-assist/intercom` on the screen, or call `view_assist.navigate` with that
path. Without a ring the view shows the entrances and gives the screen back after 90 seconds, or
when you tap the close button.

## 2. Import the blueprint

[![Import the blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fk-the-hidden-hero%2Fbticino_ha_extras%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Fbticino_intercom%2Fview_assist_intercom.yaml)

Or go to **Settings > Automations & scenes > Blueprints > Import blueprint** and paste:

```
https://github.com/k-the-hidden-hero/bticino_ha_extras/blob/main/blueprints/automation/bticino_intercom/view_assist_intercom.yaml
```

## 3. Create the automation

From the blueprint, pick:

| Input | What to choose |
|---|---|
| **Doorbells** | The doorbell event entity of every entrance that should open the view |
| **View Assist devices** | The View Assist screens that show the call |
| **Intercom view** | `/view-assist/intercom`, or your own path from step 1 |
| **Timeout** | How long the view keeps the screen when no call shows on it (90 seconds) |

## How the screen behaves

- **The ring.** The card shows every entrance as a tab and selects the one that rings. A screen
  already on the view stays there, and the card switches to the second entrance if that one rings
  too.
- **Hold mode.** A View Assist screen in hold mode keeps its view, so the blueprint lifts hold,
  opens the intercom and tells the view what it was showing. Once the call is over the view goes
  back to it and puts hold back. While the call is on screen, the view holds the screen itself, so
  View Assist does not return to its home screen after its own timeout.
- **The end of the call.** The view gives the screen back 5 seconds after the call is over:
  answered and hung up, rejected, or rung out. When no call shows on it, for example when the ring
  was over before the screen opened, it waits for the timeout. It never keeps the screen longer
  than 15 minutes. The close button gives the screen back at once.

If the screen goes back only after the timeout even though the call showed and ended, the page
is running an older copy of the card. Open **Settings > Dashboards > Resources** and remove any
resource other than the one the Marketplace (HACS before Home Assistant 2026.11) added, such as
an old `bticino-100x-card.js`. The copy that loads first registers the card, and the others are
ignored. Then reload the screen.

The view takes these URL parameters, all optional, so a dashboard button or a script can open it
too:

| Parameter | Meaning |
|---|---|
| `camera` | Show only this entrance (a BTicino camera entity). Without it every entrance has a tab |
| `timeout` | Seconds to keep the screen when no call shows up |
| `restore_mode`, `restore_path` | What to give back. The blueprint sets them when it lifts hold mode |

## Try it without a visitor

With the integration's logger at `debug`, the `bticino_intercom.inject_test_event` action rings
an entrance as a real ring with no video offer would (bticino_intercom 2.0.5-rc3 or later):

```yaml
action: bticino_intercom.inject_test_event
data:
  camera: camera.front_door # the entrance to ring
```

The screen opens the view and the card rings. **Answer** opens the entrance's live view, since a
test ring has no call to pick up, and **Reject** ends the test ring. The doorbell event fires as
for a real ring, so other automations on it, such as phone notifications, run too. A test ring
is not written to the call history unless you add `record_history: true`.
