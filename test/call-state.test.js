// The 100X card publishes where the call is on its host element, as it does
// the layout, so a page around it can tell a call in progress from an idle
// card without reaching into the shadow root. The View Assist intercom view
// keeps the screen until the call is over and then gives it back.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';

const window = new Window({ url: 'http://localhost/' });
for (const key of ['document', 'customElements', 'HTMLElement', 'CustomEvent', 'Event', 'Node', 'MediaStream']) {
  globalThis[key] = window[key];
}
globalThis.window = window;
// the card registers itself once Home Assistant's own element exists
window.customElements.define('home-assistant', class extends window.HTMLElement {});

const cardFile = process.env.CARD_FILE || path.resolve('src/bticino-100x-card.js');
await import(pathToFileURL(cardFile).href);

const DEVICE = 'bridge-device';

function hassWith(doorbell) {
  const entity = (entity_id) => ({ entity_id, platform: 'bticino_intercom', device_id: DEVICE });
  return {
    language: 'en',
    entities: {
      'camera.gate': entity('camera.gate'),
      'binary_sensor.gate_call': entity('binary_sensor.gate_call'),
    },
    devices: {},
    states: {
      'camera.gate': {
        entity_id: 'camera.gate',
        state: 'idle',
        attributes: { supported_features: 2, module_id: 'gate', friendly_name: 'Gate' },
      },
      'binary_sensor.gate_call': {
        entity_id: 'binary_sensor.gate_call',
        state: doorbell,
        attributes: { device_class: 'sound', module_id: 'gate', friendly_name: 'Gate' },
      },
    },
    callWS: async () => ({ events: [] }),
    callService: async () => {},
  };
}

function makeCard() {
  const card = document.createElement('bticino-100x-card');
  // no WebRTC here: what is checked is the state the card publishes
  card._startStream = (entityId, mode) => {
    card._stream = { entityId, mode };
  };
  document.body.appendChild(card);
  card.setConfig({ type: 'custom:bticino-100x-card', device_id: DEVICE });
  return card;
}

test('the host element says whether a call rings, is up or is over', (t) => {
  const card = makeCard();
  // detaching stops the card's minute tick, which would keep the test alive
  t.after(() => card.remove());
  card.hass = hassWith('off');
  assert.equal(card.dataset.call, 'idle');

  card.hass = hassWith('on');
  assert.equal(card.dataset.call, 'ringing');

  card._toggleStream('camera.gate', 'video');
  card._sync();
  assert.equal(card.dataset.call, 'talking');

  card._stream = null;
  card.hass = hassWith('off');
  assert.equal(card.dataset.call, 'idle');
});

for (const mode of ['video', 'audio']) {
  test(`the 100X card plays call audio in ${mode} mode without video frames`, (t) => {
    const card = makeCard();
    t.after(() => card.remove());
    card.hass = hassWith('off');
    const { audio, video, soundButton } = card._root;
    const sound = { kind: 'audio' };
    const picture = { kind: 'video', muted: true };
    const stream = new MediaStream(mode === 'video' ? [picture, sound] : [sound]);
    let playRequests = 0;
    audio.play = async () => playRequests++;
    card._toggleStream('camera.gate', mode);
    card._session = { stream, state: 'live', stop() {} };
    card._syncStream();

    assert.equal(video.hidden, mode === 'audio');
    assert.equal(video.readyState, 0);
    assert.equal(video.muted, true);
    assert.deepEqual(audio.srcObject.getAudioTracks(), [sound]);
    assert.deepEqual(audio.srcObject.getVideoTracks(), []);
    card._syncStream();
    assert.equal(playRequests, 1, 'a state update must not restart audio');

    soundButton.click();
    assert.equal(audio.muted, true);
    soundButton.click();
    assert.equal(audio.muted, false);
    assert.equal(playRequests, 2);

    card._session.state = 'error';
    card._syncStream();
    assert.equal(audio.srcObject, null);
    card._session.state = 'live';
    card._syncStream();
    card._stopStream();
    assert.equal(audio.srcObject, null);
    assert.equal(video.srcObject, null);
  });
}
