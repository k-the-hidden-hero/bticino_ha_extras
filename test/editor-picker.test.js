// Regression tests for the visual editor of bticino-intercom-card.
//
// Issue #60: the camera (and action-entity) ha-entity-picker elements are created
// asynchronously, after _bindIntercomEvents() has already attached the global
// [data-ic-field]/[data-act-field] listeners. Without an explicit listener bound at
// creation time, a value-changed never updates _config, so the selection is silently
// dropped and the editor appears to "revert to the default camera".
//
// These tests drive the real editor element in a happy-dom DOM and assert that
// changing a dynamically-created picker dispatches a config-changed with the new value.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';

// ---- DOM bootstrap -------------------------------------------------------------
const window = new Window({ url: 'http://localhost/' });
for (const key of ['document', 'customElements', 'HTMLElement', 'CustomEvent', 'Event', 'Node']) {
  globalThis[key] = window[key];
}
globalThis.window = window;

// Stub ha-entity-picker so the editor's _ensureEntityPicker() short-circuits
// (it returns early when customElements.get('ha-entity-picker') is truthy).
class HaEntityPickerStub extends window.HTMLElement {}
window.customElements.define('ha-entity-picker', HaEntityPickerStub);

// Load the card (side-effect: registers the custom elements). CARD_FILE lets us
// point the same suite at the pre-fix file to confirm the test is a real regression.
const cardFile = process.env.CARD_FILE || path.resolve('dist/bticino-intercom-card.js');
await import(pathToFileURL(cardFile).href);

// ---- helpers -------------------------------------------------------------------
const BASE_CONFIG = {
  type: 'custom:bticino-intercom-card',
  intercoms: [
    {
      name: 'Front',
      camera: 'camera.old_one',
      actions: [{ entity: 'lock.old_lock', service: 'lock.unlock' }],
    },
  ],
};

async function makeEditor(config = BASE_CONFIG) {
  const editor = document.createElement('bticino-intercom-card-editor');
  document.body.appendChild(editor);
  editor.setConfig(structuredClone(config));
  // Flush the microtask + timer that creates the entity pickers asynchronously.
  await new Promise((r) => setTimeout(r, 0));
  return editor;
}

function captureConfigChanged(editor) {
  const events = [];
  editor.addEventListener('config-changed', (e) => events.push(e.detail.config));
  return events;
}

function fireValueChanged(el, value) {
  el.value = value;
  el.dispatchEvent(new CustomEvent('value-changed', { detail: { value }, bubbles: true, composed: true }));
}

// ---- tests ---------------------------------------------------------------------
test('camera picker is created in the editor', async () => {
  const editor = await makeEditor();
  const cam = editor.shadowRoot.querySelector('[data-ic-field="camera"]');
  assert.ok(cam, 'camera ha-entity-picker should be present in the editor');
});

test('changing the camera picker persists via config-changed (issue #60)', async () => {
  const editor = await makeEditor();
  const events = captureConfigChanged(editor);
  const cam = editor.shadowRoot.querySelector('[data-ic-field="camera"]');

  fireValueChanged(cam, 'camera.new_one');

  assert.ok(events.length > 0, 'a config-changed event must fire when the camera changes');
  const cfg = events.at(-1);
  assert.equal(cfg.intercoms[0].camera, 'camera.new_one');
});

test('changing an action entity picker persists via config-changed (issue #60)', async () => {
  const editor = await makeEditor();
  const events = captureConfigChanged(editor);
  const ent = editor.shadowRoot.querySelector('[data-act-field="entity"]');
  assert.ok(ent, 'action entity ha-entity-picker should be present');

  fireValueChanged(ent, 'lock.new_lock');

  assert.ok(events.length > 0, 'a config-changed event must fire when the action entity changes');
  const cfg = events.at(-1);
  assert.equal(cfg.intercoms[0].actions[0].entity, 'lock.new_lock');
});

// ---- Call Home ------------------------------------------------------------------
// The indoor monitor is a separate, voice-only camera entity. The card dials it
// through a second button, so the editor needs its own picker and the config has
// to round-trip the extra key.

test('call home picker is created in the editor', async () => {
  const editor = await makeEditor();
  const picker = editor.shadowRoot.querySelector('[data-ic-field="call_home"]');
  assert.ok(picker, 'call_home ha-entity-picker should be present in the editor');
});

test('choosing a call home camera persists via config-changed', async () => {
  const editor = await makeEditor();
  const events = captureConfigChanged(editor);
  const picker = editor.shadowRoot.querySelector('[data-ic-field="call_home"]');

  fireValueChanged(picker, 'camera.intercom_call_home');

  assert.equal(events.length, 1);
  assert.equal(events[0].intercoms[0].call_home, 'camera.intercom_call_home');
});

test('call home is omitted from the config when left empty', async () => {
  const editor = await makeEditor();
  const events = captureConfigChanged(editor);
  const cam = editor.shadowRoot.querySelector('[data-ic-field="camera"]');

  fireValueChanged(cam, 'camera.new_one');

  assert.equal(Object.hasOwn(events[0].intercoms[0], 'call_home'), false);
});

test('the card shows one call button without call_home and two with it', async () => {
  const card = document.createElement('bticino-intercom-card');
  document.body.appendChild(card);
  card.hass = { language: 'it', states: {}, entities: {}, devices: {}, callWS: async () => ({}) };

  card.setConfig(structuredClone(BASE_CONFIG));
  assert.ok(card.shadowRoot.getElementById('call-pill'), 'the entrance button is always present');
  assert.equal(card.shadowRoot.getElementById('call-home-pill'), null);

  const withHome = structuredClone(BASE_CONFIG);
  withHome.intercoms[0].call_home = 'camera.intercom_call_home';
  card.setConfig(withHome);

  const homePill = card.shadowRoot.getElementById('call-home-pill');
  assert.ok(homePill, 'the call home button appears once call_home is configured');
  assert.match(homePill.textContent, /Casa/);
  assert.match(card.shadowRoot.getElementById('call-pill').textContent, /Esterno/);
});

test('call home negotiates audio only, the entrance keeps video', async () => {
  const card = document.createElement('bticino-intercom-card');
  const withHome = structuredClone(BASE_CONFIG);
  withHome.intercoms[0].call_home = 'camera.intercom_call_home';
  card.setConfig(withHome);

  card._callTarget = 'home';
  assert.equal(card._callEntity, 'camera.intercom_call_home');
  assert.equal(card._callWantsVideo, false);

  card._callTarget = 'external';
  assert.equal(card._callEntity, 'camera.old_one');
  assert.equal(card._callWantsVideo, true);
});
