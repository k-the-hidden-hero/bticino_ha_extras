# Card simulator

A static page that runs `custom:bticino-100x-card` against a fake intercom, so the whole flow can
be driven without a Home Assistant instance or a device on the wall.

```bash
python3 -m http.server 8778
```

Then open <http://localhost:8778/tools/card-demo/> from the repository root. The page imports the
real card file from `dist/`, with a changing query string, so an
edit shows up on reload.

## What it simulates

The intercom has two external units, **Front door** and **Gate**, each with its own camera,
doorbell sensor and doorbell event, all carrying a `module_id` attribute.

- **Ring: front door** and **Ring: gate** start an incoming call from that unit: its doorbell
  sensor turns on, a fresh snapshot appears, a `bticino_intercom_call` ring event goes out on the
  fake bus, every card reacts, and a record is opened in the call log. Nobody answering for 30
  seconds closes it as missed.
- **Answer at the monitor** and **Visitor hangs up** close the call as answered or missed.
- The card's own buttons act for real: **Open** unlocks and relocks after three seconds, **Stair
  light** toggles with the ten second auto-off, **Reject** ends the call, and **Live** and
  **Call home** start a call.
- **Notification: tap Answer** does what the phone does when the actionable notification is
  tapped: it reloads the page with `?answer=<camera>` in the address, with the bell ringing, and
  the card picks the call up on its own and clears the parameter.
- **Go offline** makes every entity unavailable.
- **Bus events** withholds the ring and end events, the way Home Assistant does for a user who is
  not an administrator, so the card has to tell the units apart from the doorbell sensors alone.
- **Microphone** makes the fake call refuse the microphone, to show the blocked state.

Every action is printed in the log, so a flow can be read end to end.

## One card alone

`?view=<layout>` shows a single card instead of the gallery: `?view=kiosk` fills the window the
way a panel view on a wall tablet does. `&theme=dark`, `&lang=it` and `&camera=<camera entity>`
(the unit a kiosk shows first) work with it. `window.sim` drives the page from a script:
`sim.ring('gate')`, `sim.answerAtMonitor()`, `sim.endCall(false, 'why')`, `sim.setOffline(true)`,
`sim.denyMicrophone()`, `sim.busEvents(false)`.

## The call

The page has no Home Assistant behind it, so `_startStream` is replaced with a session that
connects after a moment and, for a video call, serves a canvas animation as its video track. It is
only there to exercise the card's own states - connecting, live, microphone, audio only, hang up.
The real WebRTC path in the card is not covered by this page and needs a device to test.
