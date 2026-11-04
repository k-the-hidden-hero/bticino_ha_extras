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

- **Suona il campanello** starts an incoming call: the doorbell sensor turns on, a fresh snapshot
  appears, every card reacts, and a record is opened in the call log. Nobody answering for 30
  seconds closes it as missed.
- **Rispondi dal monitor** and **Il visitatore riaggancia** close the call as answered or missed.
- The card's own buttons act for real: **Apri** unlocks and relocks after three seconds, **Luce
  scale** toggles with the ten second auto-off, **Rifiuta** ends the call, and **Guarda** and
  **Chiama casa** start a call.
- **Notifica: tocca Rispondi** does what the phone does when the actionable notification is
  tapped: it reloads the page with `?answer=<camera>` in the address, with the bell ringing, and
  the card picks the call up on its own and clears the parameter.
- **Vai offline** makes every entity unavailable.

Every action is printed in the log, so a flow can be read end to end.

## The call

The page has no Home Assistant behind it, so `_startStream` is replaced with a session that
connects after a moment and, for a video call, serves a canvas animation as its video track. It is
only there to exercise the card's own states - connecting, live, microphone, audio only, hang up.
The real WebRTC path in the card is not covered by this page and needs a device to test.
