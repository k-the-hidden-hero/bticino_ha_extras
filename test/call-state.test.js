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

test('auto-answer handles one card per link, survives a throwing replaceState, and repeats on later links', async (t) => {
  const started = [];
  const makeAutoCard = () => {
    const card = document.createElement('bticino-100x-card');
    card._startStream = (entityId, mode) => {
      started.push({ card, entityId, mode });
      card._stream = { entityId, mode };
    };
    document.body.appendChild(card);
    card.setConfig({ type: 'custom:bticino-100x-card', device_id: DEVICE, auto_answer: true });
    t.after(() => card.remove());
    return card;
  };

  // First notification: two cards on the page, replaceState works -> only one answers.
  window.history.replaceState(null, '', '/?answer=camera.gate');
  const card1 = makeAutoCard();
  const card2 = makeAutoCard();
  card1.hass = hassWith('on');
  card2.hass = hassWith('on');
  await new Promise((r) => setTimeout(r, 350));

  assert.equal(started.length, 1);
  assert.equal(started[0].card, card1);
  assert.equal(card1._answeredRing, true);
  assert.equal(window.location.search, '');

  // Hang up and receive a second notification in the same session -> answers again.
  card1._stopStream();
  window.history.replaceState(null, '', '/?answer=camera.gate');
  card1.hass = hassWith('on');
  await new Promise((r) => setTimeout(r, 350));
  assert.equal(started.length, 2);

  // If replaceState throws, the URL-keyed guard prevents both card2 and post-hangup re-renders from looping.
  card1._stopStream();
  window.history.replaceState(null, '', '/?answer=camera.gate');
  const origReplace = window.history.replaceState.bind(window.history);
  window.history.replaceState = () => {
    throw new Error('blocked');
  };
  t.after(() => {
    window.history.replaceState = origReplace;
    origReplace(null, '', '/');
  });

  card1.hass = hassWith('on');
  card2.hass = hassWith('on');
  await new Promise((r) => setTimeout(r, 350));
  assert.equal(started.length, 3);

  card1._stopStream();
  card1.hass = hassWith('off');
  await new Promise((r) => setTimeout(r, 350));
  assert.equal(started.length, 3);
});
