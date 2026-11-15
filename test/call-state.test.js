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
for (const key of ['document', 'customElements', 'HTMLElement', 'CustomEvent', 'Event', 'Node']) {
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
