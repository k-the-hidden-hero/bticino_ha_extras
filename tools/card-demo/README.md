# Card simulator

A static page that runs both cards - `custom:bticino-100x-card` and `custom:bticino-intercom-card`
- against a fake intercom, so the whole flow can be driven without a Home Assistant instance or a
device on the wall. The cards are not faked: their real WebRTC call, `src/shared/webrtc.js`, runs
here as it does in Home Assistant, and what is simulated is everything on the other end of it.

```bash
python3 -m http.server 8778
```

Then open <http://localhost:8778/tools/card-demo/> from the repository root, in Chrome or another
Chromium browser. The page imports the cards from `src/`, with a changing query string, so an edit
shows up on reload - no build in between, because the browser follows the cards' own imports. An
edit to `src/shared/webrtc.js` may need a hard reload, since the cards import it without one.

## What it simulates

- **Ring front door** starts an incoming call: the doorbell sensor turns on, a fresh snapshot
  appears, every card reacts, and a record is opened in the call log. Nobody answering for 30
  seconds closes it as missed.
- **Answer at the monitor** and **Visitor hangs up** close the call as answered or missed.
- The card's own buttons act for real: **Open** unlocks and relocks after three seconds, **Stair
  light** toggles with the ten second auto-off, **Reject** ends the call, and **Live** and
  **Call home** start a call.
- **Notification: tap Answer** does what the phone does when the actionable notification is
  tapped: it reloads the page with `?answer=<camera>` in the address, with the bell ringing, and
  the card picks the call up on its own and clears the parameter.
- **Ring gate** rings the second external unit, so the pairing can be seen: the header names the
  entrance and **Answer** opens that unit's camera, not the first one.
- **One entrance only / Two entrances** adds or removes the second external unit, which is what
  decides whether the tabs appear at all: most homes have one, and the card should look right there
  too.
- **Refuse microphone** makes the browser deny it. The page answers `getUserMedia` itself - a quiet
  tone, or a refusal - so there is no permission prompt, and the call's real microphone path runs:
  asked up front and refused, the call goes on without it; refused from the button, it says so in a
  toast and stays live. Toasts appear bottom left and in the log.
- **Drop module_id** removes the attribute from every entity, the way an integration older than
  k-the-hidden-hero/bticino_intercom#115 behaves, so the single-unit fallback can be checked.
- **Go offline** makes every entity unavailable.
- **Kiosk: upright / landscape** turns the wall tablet at the bottom of the page between 960x480
  and 480x800, drawn at its real pixel size and scaled down only when the window is narrower, so
  the call screen can be read the way it will be on the wall.
- **Kiosk: hide controls** sets `show_controls: false` on the tablet. The row goes, and the
  microphone and the sound come back to the corner of the picture, since a call has to keep them.

### The device and the integration

- **Device busy** has someone else - the app on a phone, another tablet - hold every peer slot of
  the bridge, so the next call is refused with *Max number of peers reached*, as the real one is.
- **Device silent** makes the bridge take a slot and never answer. After its 15 seconds the call
  fails, and the log shows the slot handed back on the spot rather than when someone taps Dismiss.
- **Drop the call** has the bridge drop every call it holds. The cards notice a few seconds later,
  reconnect with a new session, and report it.
- **Older integration** answers `bticino_intercom/webrtc_connected` with `unknown_command`, the way
  an integration without it does, and the call carries on regardless.

The state line counts the bridge's peer slots, and the log follows every call through: the offer
going out on the page's own connection with `resubscribe: false`, the slot taken and released,
the media up, and each `webrtc_connected` with the session it belongs to.

The swatches set the accent colour on every card at once, the way `color` does in the config, so
the palette can be checked against both themes.

Every action is printed in the log, so a flow can be read end to end.

## The screenshots in the README

The page doubles as the rig that takes them: `?shot=<card>` leaves that one card alone on the
page, and `ring=front|gate`, `answer`, `upright` and `dark` put it in the state wanted. `g1` to
`g5` are the cards down the page and `kiosk` is the wall tablet.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --force-device-scale-factor=2 --use-gl=swiftshader --enable-unsafe-swiftshader \
  --autoplay-policy=no-user-gesture-required --virtual-time-budget=9000 \
  --window-size=960,480 --screenshot=docs/images/card-100x-kiosk.png \
  "http://localhost:8778/tools/card-demo/index.html?shot=kiosk&ring=gate"
```

The window size is the picture: a card is 460 wide plus the page's 20px margins, and its height
has to be read off the page first. Software GL and the autoplay flag are what make the canvas
reach the video element in a headless run; without them the player comes out black.

A headless Chrome never gets a WebRTC call up between two peer connections in one page - the offer,
the answer and the candidates all cross, the media does not - so in this mode, and only in it, an
answered call goes live at once on the simulated camera, with no device behind it.

## The call

The default card on the page carries only a `device_id` plus one free action pointing at
`lock.driveway_gate`, an entity that is deliberately not part of the integration, so the default
configuration and the extra buttons are both on screen next to the configured cards. Under it is
`bticino-intercom-card`, the card this repository started with, configured for both entrances: it
gets the ring through `bticino_intercom_call` events like in Home Assistant, and answers on the same
shared call. Its ringtone is a file Home Assistant serves from `/local`, so here each ring logs one
404 for it.

Behind the call, the page plays the parts a dashboard does not have: Home Assistant's connection,
whose `subscribeMessage` takes the offer; the integration, which answers it with a session, an
answer and candidates; and the bridge, a second `RTCPeerConnection` in the page that sends a canvas
animation back as the entrance's camera, with a peer slot per call and only two of them. So the
real exchange runs in the browser - SDP, ICE, the silence the device needs, reconnects, teardown -
and only the far end is pretend. What it cannot show is the firmware itself: its payload types,
its SDP limits and how it answers a ring still need a device on the wall.
