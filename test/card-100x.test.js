// custom:bticino-100x-card with more than one external unit, while it rings,
// in the kiosk layout, offline, and with a microphone the browser refused.
//
// The card is driven in a happy-dom DOM with a fake hass. Its WebRTC session is
// never started: _startStream is replaced per card, so a test sees which camera
// the card would have called.

import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';

// ---- DOM bootstrap -------------------------------------------------------------
const window = new Window({ url: 'http://localhost/lovelace/door' });
for (const key of ['document', 'customElements', 'HTMLElement', 'CustomEvent', 'Event', 'Node']) {
  globalThis[key] = window[key];
}
globalThis.window = window;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.MediaStream = window.MediaStream;

// The card defines itself once Home Assistant's own element exists.
window.customElements.define('home-assistant', class extends window.HTMLElement {});
window.customElements.define('ha-form', class extends window.HTMLElement {});

const cardFile = process.env.CARD_100X_FILE || path.resolve('dist/bticino-100x-card.js');
const { BticinoCallSession } = await import(pathToFileURL(cardFile).href);

// ---- a fake intercom with two external units -----------------------------------
const DEVICE = 'dev1';
const ENTRY = 'entry1';
const FRONT = 'camera.intercom_front_door';
const GATE = 'camera.intercom_gate';
const CALL_HOME = 'camera.intercom_call_home';

function makeConnection() {
  const connection = {
    subscriptions: [],
    unsubscribed: 0,
    async subscribeEvents(callback, eventType) {
      connection.subscriptions.push({ callback, eventType });
      return () => {
        connection.unsubscribed += 1;
      };
    },
    fire(data) {
      for (const sub of connection.subscriptions) {
        if (sub.eventType === 'bticino_intercom_call') sub.callback({ event_type: sub.eventType, data });
      }
    },
  };
  return connection;
}

function makeHass({
  language = 'en',
  ringing = [],
  offline = false,
  moduleIds = true,
  callHomeIcon = 'mdi:phone-classic',
  otherIntercom = false,
  connection = makeConnection(),
} = {}) {
  const put = (id, state, attributes) => [
    id,
    { entity_id: id, state: offline ? 'unavailable' : state, attributes, last_changed: '2026-11-05T09:58:00Z' },
  ];
  const module = (id) => (moduleIds ? { module_id: id } : {});
  const states = Object.fromEntries([
    put(FRONT, 'idle', { friendly_name: 'Intercom Front door', supported_features: 2, ...module('mod-front') }),
    put(GATE, 'idle', { friendly_name: 'Intercom Gate', supported_features: 2, ...module('mod-gate') }),
    // Call Home dials the indoor monitor, so it carries the bridge's module id
    put(CALL_HOME, 'idle', {
      friendly_name: 'Intercom Call Home',
      supported_features: 2,
      ...(callHomeIcon && { icon: callHomeIcon }),
      ...module('70:ee:50:00:00:01'),
    }),
    put('camera.intercom_last_event_snapshot', 'idle', {
      friendly_name: 'Intercom Last Event Snapshot',
      supported_features: 0,
      entity_picture: '/api/camera_proxy/camera.intercom_last_event_snapshot?token=abc',
      event_time_iso: '2026-11-05T09:58:00+00:00',
    }),
    put('binary_sensor.intercom_front_door', ringing.includes('front') ? 'on' : 'off', {
      friendly_name: 'Intercom Front door',
      device_class: 'sound',
      ...module('mod-front'),
    }),
    put('binary_sensor.intercom_gate', ringing.includes('gate') ? 'on' : 'off', {
      friendly_name: 'Intercom Gate',
      device_class: 'sound',
      ...module('mod-gate'),
    }),
    put('event.intercom_front_door', '2026-11-05T09:58:00.000+00:00', {
      friendly_name: 'Intercom Front door',
      device_class: 'doorbell',
      event_types: ['ring'],
      ...module('mod-front'),
    }),
    put('event.intercom_gate', '2026-11-04T18:00:00.000+00:00', {
      friendly_name: 'Intercom Gate',
      device_class: 'doorbell',
      event_types: ['ring'],
      ...module('mod-gate'),
    }),
    put('lock.intercom_door', 'locked', { friendly_name: 'Intercom Door', supported_features: 1 }),
    put('light.intercom_stairs', 'off', { friendly_name: 'Intercom Stair light' }),
    put('sensor.intercom_last_call', '2026-11-05T09:58:00+00:00', {
      friendly_name: 'Intercom Last call',
      device_class: 'timestamp',
    }),
  ]);
  const entities = Object.fromEntries(
    Object.keys(states).map((id) => [id, { entity_id: id, device_id: DEVICE, platform: 'bticino_intercom' }]),
  );
  const devices = { [DEVICE]: { id: DEVICE, name: 'Intercom', config_entries: [ENTRY] } };
  if (otherIntercom) {
    // a second home with its own intercom, which a card must not mix in
    const other = [
      put('camera.holiday_home_entrance', 'idle', {
        friendly_name: 'Holiday home Entrance',
        supported_features: 2,
        module_id: 'mod-holiday',
      }),
      put('binary_sensor.holiday_home_entrance', 'off', {
        friendly_name: 'Holiday home Entrance',
        device_class: 'sound',
        module_id: 'mod-holiday',
      }),
      put('lock.holiday_home_door', 'locked', { friendly_name: 'Holiday home Door', supported_features: 1 }),
    ];
    for (const [id, state] of other) {
      states[id] = state;
      entities[id] = { entity_id: id, device_id: 'dev2', platform: 'bticino_intercom' };
    }
    devices.dev2 = { id: 'dev2', name: 'Holiday home', config_entries: ['entry2'] };
  }
  return {
    language,
    locale: { language },
    states,
    entities,
    devices,
    connection,
    callService: async () => {},
    callWS: async () => ({ events: [] }),
  };
}

const mounted = [];
test.afterEach(() => {
  // the card keeps a clock and a subscription while it is on the page
  while (mounted.length) mounted.pop().remove();
  window.happyDOM.setURL('http://localhost/lovelace/door');
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function mount(config = {}, hass = makeHass()) {
  const card = document.createElement('bticino-100x-card');
  card.setConfig({ device_id: DEVICE, ...config });
  document.body.appendChild(card);
  mounted.push(card);
  card.hass = hass;
  card.calls = [];
  card._startStream = (entityId, mode) => card.calls.push([entityId, mode]);
  await flush(); // the bus subscription resolves on a later tick
  return card;
}

const $ = (card, selector) => card.shadowRoot.querySelector(selector);
const $$ = (card, selector) => [...card.shadowRoot.querySelectorAll(selector)];
const buttons = (card) => $$(card, '.features .button');
const button = (card, label) => buttons(card).find((node) => node.getAttribute('aria-label') === label);
const ring = (hass, unit, camera) =>
  hass.connection.fire({
    type: 'ring',
    entry_id: ENTRY,
    module_id: `mod-${unit}`,
    module_name: unit === 'gate' ? 'Gate' : 'Front door',
    camera_entity_id: camera,
    vignette_url: `https://example.invalid/${unit}.jpg`,
  });

// ---- A: several external units -------------------------------------------------

test('with two units, Answer calls the unit the bus says rang, not the first one', async () => {
  const hass = makeHass();
  const card = await mount({}, hass);
  ring(hass, 'gate', GATE);

  const answer = button(card, 'Answer');
  assert.ok(answer, 'a ringing card offers Answer');
  assert.equal(answer.dataset.target, GATE);
  answer.click();
  assert.deepEqual(card.calls, [[GATE, 'video']]);
  assert.equal($(card, '.secondary').textContent, 'Gate · Incoming call', 'the subtitle names the unit that rang');
});

test('without the bus, the doorbell carrying the same module_id names the unit', async () => {
  const connection = makeConnection();
  connection.subscribeEvents = async () => {
    throw new Error('Unauthorized'); // what a user who is not an administrator gets
  };
  const card = await mount({}, makeHass({ ringing: ['gate'], connection }));

  const answer = button(card, 'Answer');
  assert.equal(answer.dataset.target, GATE);
  answer.click();
  assert.deepEqual(card.calls, [[GATE, 'video']]);
});

test('before module_id existed, the shared module name still pairs doorbell and camera', async () => {
  const card = await mount({}, makeHass({ ringing: ['gate'], moduleIds: false }));
  assert.equal(button(card, 'Answer').dataset.target, GATE);
});

test('a ring from another intercom is ignored, and an end closes ours', async () => {
  const hass = makeHass();
  const card = await mount({}, hass);

  hass.connection.fire({ type: 'ring', entry_id: 'another-home', camera_entity_id: 'camera.elsewhere' });
  assert.equal(button(card, 'Answer'), undefined, 'a ring for another home must not ring here');

  ring(hass, 'gate', GATE);
  assert.ok(button(card, 'Answer'));
  hass.connection.fire({ type: 'end', entry_id: ENTRY, module_id: 'mod-gate' });
  assert.equal(button(card, 'Answer'), undefined, 'the end of the call puts the card back to idle');
  assert.ok(button(card, 'Live'));
});

test('idle with two units, the picker moves View to the chosen unit', async () => {
  const card = await mount();
  const units = $$(card, '.units .unit');
  assert.equal($(card, '.units').hidden, false);
  assert.equal($(card, '.units').getAttribute('role'), 'radiogroup');
  assert.deepEqual(
    units.map((unit) => unit.textContent),
    ['Front door', 'Gate'],
    'the device name is taken off the unit names',
  );
  assert.deepEqual(
    units.map((unit) => unit.getAttribute('aria-checked')),
    ['true', 'false'],
  );
  assert.equal(button(card, 'Live').dataset.target, FRONT, 'the first unit is the default');

  units[1].click();
  assert.equal(button(card, 'Live').dataset.target, GATE);
  assert.deepEqual(
    $$(card, '.units .unit').map((unit) => unit.getAttribute('aria-checked')),
    ['false', 'true'],
  );
  button(card, 'Live').click();
  assert.deepEqual(card.calls, [[GATE, 'video']]);
});

test('the arrow keys move the choice, as in a radio group', async () => {
  const card = await mount();
  $(card, '.units').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(button(card, 'Live').dataset.target, GATE);
  $(card, '.units').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(button(card, 'Live').dataset.target, FRONT, 'it wraps around');
});

test('camera_entity still holds the card to one unit, and another unit ringing leaves it idle', async () => {
  const card = await mount({ camera_entity: FRONT }, makeHass({ ringing: ['gate'] }));
  assert.equal($(card, '.units').hidden, true, 'one unit, no picker');
  assert.equal(button(card, 'Answer'), undefined);
  assert.equal(button(card, 'Live').dataset.target, FRONT);
});

test('camera_entity alone is enough: the card finds the intercom that camera belongs to', async () => {
  const hass = makeHass({ otherIntercom: true });
  let asked = null;
  hass.callWS = async (message) => {
    asked = message;
    return { events: [] };
  };
  // what a View Assist view that only knows the camera from its address embeds
  const card = await mount({ device_id: undefined, layout: 'kiosk', camera_entity: GATE }, hass);

  assert.equal($(card, '.primary').textContent, 'Intercom', 'named after the derived device');
  assert.equal(button(card, 'Live').dataset.target, GATE);
  // one lock, so it reads "Open": the other home's door was left out
  assert.deepEqual(
    buttons(card)
      .map((node) => node.getAttribute('aria-label'))
      .filter((label) => /Open|Door/.test(label)),
    ['Open'],
  );

  hass.connection.fire({ type: 'ring', entry_id: 'entry2', camera_entity_id: 'camera.holiday_home_entrance' });
  assert.equal(button(card, 'Answer'), undefined, 'the other home ringing leaves this card idle');
  ring(hass, 'gate', GATE);
  assert.equal(button(card, 'Answer').dataset.target, GATE);

  hass.connection.fire({ type: 'end', entry_id: ENTRY, module_id: 'mod-gate' });
  button(card, 'Recent calls').click();
  await flush();
  assert.equal(asked.entry_id, ENTRY, 'the call log is asked for the derived intercom');
});

test('Call Home is never taken for an external unit, even with its icon changed in the UI', async () => {
  const card = await mount({}, makeHass({ callHomeIcon: 'mdi:home-sound-in' }));
  assert.deepEqual(
    $$(card, '.units .unit').map((unit) => unit.textContent),
    ['Front door', 'Gate'],
    'only the cameras that share a doorbell module are units',
  );
  assert.ok(button(card, 'Call home'), 'the bridge camera is still offered as Call Home');
});

test('?camera= in the address preselects the unit', async () => {
  window.happyDOM.setURL(`http://localhost/lovelace/door?camera=${GATE}`);
  const card = await mount({ layout: 'kiosk' });
  assert.equal(button(card, 'Live').dataset.target, GATE);
  assert.equal($(card, '.unit[aria-checked="true"]').textContent, 'Gate');
});

// ---- B: ringing, every layout ----------------------------------------------------

for (const layout of ['panel', 'device', 'compact', 'kiosk']) {
  test(`${layout}: while it rings the drawing steps aside for the picture and three large actions`, async () => {
    const hass = makeHass({ ringing: ['front'] });
    const card = await mount({ layout }, hass);

    assert.equal($(card, '.device-wrap').hidden, true, 'no drawing while it rings');
    assert.equal($(card, '.shot').hidden, false, 'the picture shows instead');
    assert.equal($(card, '.secondary').textContent, 'Front door · Incoming call');
    assert.equal($$(card, '.shot > :not(img):not(.shot-empty)').length, 0, 'nothing is drawn over the visitor');
    assert.equal($(card, '.features').dataset.mode, 'ring');
    assert.deepEqual(
      buttons(card).map((node) => node.getAttribute('aria-label')),
      ['Answer', 'Open', 'Reject'],
    );
    assert.equal($(card, '.units').hidden, true, 'no picker while it rings');

    card.hass = makeHass({ connection: hass.connection });
    assert.equal($(card, '.features').dataset.mode, 'idle');
    assert.equal($(card, '.device-wrap').hidden, layout === 'compact' || layout === 'kiosk');
  });
}

test('ringing in Italian: the unit leads the subtitle, the picture carries no caption', async () => {
  const hass = makeHass({ language: 'it' });
  const card = await mount({ layout: 'kiosk' }, hass);
  ring(hass, 'gate', GATE);
  assert.equal($(card, '.secondary').textContent, 'Gate · Chiamata in arrivo');
  assert.equal($(card, '.shot-caption'), null);
  assert.equal($(card, '.shot img').getAttribute('alt'), 'Gate · Chiamata in arrivo', 'said to screen readers instead');

  // back to idle: the subtitle is the state again, with the last call
  hass.connection.fire({ type: 'end', entry_id: ENTRY, module_id: 'mod-gate' });
  assert.match($(card, '.secondary').textContent, /^A riposo · Ultima chiamata /);
});

test('while it rings the buttons show even if they are switched off for the idle card', async () => {
  const card = await mount({ show_controls: false }, makeHass({ ringing: ['front'] }));
  assert.notEqual($(card, '.features').style.display, 'none');
  assert.ok(button(card, 'Answer'));
});

// ---- C: kiosk ---------------------------------------------------------------------

test('kiosk: no drawing, the picture, large controls and the log behind one button', async () => {
  const card = await mount({ layout: 'kiosk' });
  assert.ok(card.hasAttribute('kiosk'), 'the host is marked so it can fill its container');
  assert.equal($(card, '.card').dataset.layout, 'kiosk');
  assert.ok(['landscape', 'portrait'].includes($(card, '.card').dataset.orient));
  assert.equal($(card, '.device-wrap').hidden, true);
  assert.equal($(card, '.shot').hidden, false);
  assert.equal($(card, '.expander').hidden, true, 'no drawer in a kiosk');
  assert.ok(button(card, 'Recent calls'), 'the call log sits behind one button');

  const css = $(card, 'style').textContent;
  assert.match(css, /\.card\[data-layout="kiosk"\] \.button \{[^}]*min-height: 56px/);
  assert.match(css, /\.card\[data-layout="kiosk"\] \.features\[data-mode="ring"\] \.button \{[^}]*min-height: 72px/);
  assert.match(css, /\.card\[data-layout="kiosk"\]\[data-orient="portrait"\] \.body/);
});

test('kiosk: the log button loads the calls and opens them', async () => {
  const hass = makeHass();
  let asked = 0;
  hass.callWS = async (message) => {
    asked += 1;
    assert.equal(message.type, 'bticino_intercom/history');
    return { events: [{ event_id: 'a', timestamp: 1762336680, answered: true, module_name: 'Gate' }] };
  };
  const card = await mount({ layout: 'kiosk' }, hass);
  button(card, 'Recent calls').click();
  await flush();
  assert.equal(asked, 1);
  assert.equal($$(card, 'dialog .calls .call').length, 1);
});

test('the editor offers the kiosk layout, and drops the drawing size for it', async () => {
  const editor = document.createElement('bticino-100x-card-editor');
  document.body.appendChild(editor);
  editor.hass = makeHass({ language: 'it' });
  editor.setConfig({ device_id: DEVICE, layout: 'kiosk' });
  const form = editor.querySelector('ha-form');
  const layout = form.schema.find((item) => item.name === 'layout');
  const kiosk = layout.selector.select.options.find((option) => option.value === 'kiosk');
  assert.match(kiosk.label, /^Kiosk - a tutto schermo/);
  assert.equal(
    form.schema.some((item) => item.name === 'device_size'),
    false,
  );
  editor.remove();
});

// ---- D: offline, microphone, words ------------------------------------------------

test('offline, View and Call home are disabled', async () => {
  const card = await mount({}, makeHass({ offline: true }));
  assert.equal(button(card, 'Live').disabled, true);
  assert.equal(button(card, 'Call home').disabled, true);
  assert.equal($(card, '.screen').disabled, true);
});

test('a refused microphone is shown, in the user language, and the button can ask again', async () => {
  const card = await mount({}, makeHass({ language: 'it' }));
  card._stream = { entityId: FRONT, mode: 'video' };
  card._session = { state: 'live', micActive: false, micError: 'denied', error: null, stream: new MediaStream() };
  card._sync();

  assert.equal($(card, '.stream-note').hidden, false);
  assert.equal($(card, '.stream-note').textContent, 'Microfono bloccato');
  const mic = $(card, '.stream-controls .icon-button');
  assert.match(mic.className, /blocked/);
  assert.equal(mic.getAttribute('aria-label'), 'Microfono bloccato');
  assert.equal(mic.disabled, false);

  card._session.micError = 'insecure';
  card._syncStream();
  assert.equal($(card, '.stream-note').textContent, 'Il microfono richiede HTTPS');
  card._session = null;
  card._stream = null;
});

test('the session records why the microphone is not live instead of swallowing it', async () => {
  const session = new BticinoCallSession(makeHass(), { entityId: FRONT, wantsVideo: true });
  const states = [];
  session.onState = (s) => states.push(s.micError);

  // a page served over plain http
  await session.setMic(true);
  assert.equal(session.micError, 'insecure');

  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: async () => {
        throw Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' });
      },
    },
  });
  await session.setMic(true);
  assert.equal(session.micError, 'denied');
  assert.equal(session.micActive, false);
  assert.deepEqual(states, ['insecure', 'denied']);
  delete globalThis.navigator.mediaDevices;
});

test('Italian carries its accents', async () => {
  const card = document.createElement('bticino-100x-card');
  card.setConfig({ device_id: 'nothing-here' });
  document.body.appendChild(card);
  mounted.push(card);
  card.hass = { ...makeHass({ language: 'it' }), entities: {} };
  assert.equal($(card, '.alert .text').textContent, 'Nessuna entità BTicino trovata per questo dispositivo.');
});

test('the last call is said once: in its badge, or in the status line without badges', async () => {
  const withBadges = await mount({ camera_entity: FRONT });
  assert.ok($$(withBadges, '.badge').length > 0);
  assert.doesNotMatch($(withBadges, '.secondary').textContent, /Last call/);
  assert.match($(withBadges, '.badges').textContent, /Last call/);

  const without = await mount({ camera_entity: FRONT, show_badges: false });
  assert.match($(without, '.secondary').textContent, /Last call/);
});

test('the title is the device name, as the user named it, unless the config names the card', async () => {
  const hass = makeHass();
  hass.devices[DEVICE] = { ...hass.devices[DEVICE], name: 'BTicino Classe 100X', name_by_user: 'Citofono di casa' };
  const card = await mount({}, hass);
  assert.equal($(card, '.primary').textContent, 'Citofono di casa');

  const unnamed = makeHass({ connection: hass.connection });
  unnamed.devices[DEVICE] = { ...unnamed.devices[DEVICE], name: 'BTicino Classe 100X', name_by_user: null };
  card.hass = unnamed;
  assert.equal($(card, '.primary').textContent, 'BTicino Classe 100X');

  const named = await mount({ name: 'Ingresso' }, makeHass());
  assert.equal($(named, '.primary').textContent, 'Ingresso');
});

test('a user who is not an administrator is not subscribed to the bus at all', async () => {
  const hass = makeHass({ ringing: ['gate'] });
  hass.user = { name: 'Wall tablet', is_admin: false };
  const card = await mount({}, hass);
  assert.equal(hass.connection.subscriptions.length, 0, 'Home Assistant would refuse it');
  assert.equal(button(card, 'Answer').dataset.target, GATE, 'the doorbell still says which unit rings');
});

test('the bus subscription ends with the card', async () => {
  const hass = makeHass();
  const card = await mount({}, hass);
  assert.equal(hass.connection.subscriptions.length, 1);
  card.remove();
  mounted.splice(mounted.indexOf(card), 1);
  assert.equal(hass.connection.unsubscribed, 1);
});
