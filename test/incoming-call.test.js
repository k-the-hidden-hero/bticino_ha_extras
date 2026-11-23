import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';

const window = new Window({ url: 'https://ha.example.test/' });
for (const key of ['document', 'customElements', 'HTMLElement', 'CustomEvent', 'Event', 'Node', 'MediaStream']) {
  globalThis[key] = window[key];
}
globalThis.window = window;
window.customElements.define('home-assistant', class extends window.HTMLElement {});
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
globalThis.history = window.history;
let tones = 0;
let stops = 0;
globalThis.Audio = class {
  play() {
    tones++;
    return Promise.resolve();
  }
  pause() {
    stops++;
  }
};

await import(pathToFileURL(process.env.CARD_FILE || path.resolve('src/bticino-intercom-card.js')).href);

const CONFIG = {
  intercoms: [
    { name: 'Front', camera: 'camera.front', actions: [{ entity: 'lock.front', service: 'lock.unlock' }] },
    { name: 'Gate', camera: 'camera.gate', actions: [{ entity: 'lock.gate', service: 'lock.unlock' }] },
  ],
  ignore_ssl_warning: true,
};

function makeHass({ admin = false, denied = false } = {}) {
  const messages = [];
  const services = [];
  const callbacks = [];
  const unsubscribed = [];
  const hass = {
    language: 'en',
    user: { is_admin: admin },
    states: {},
    entities: {},
    devices: {},
    messages,
    services,
    callbacks,
    unsubscribed,
    connection: {
      subscribeEvents(callback) {
        callbacks.push(callback);
        return denied ? Promise.reject(new Error('unauthorized')) : Promise.resolve(() => unsubscribed.push(callback));
      },
    },
    callWS: async (message) => {
      messages.push(message);
      return { path: message.path };
    },
    callService: (...args) => services.push(args),
  };
  for (const name of ['front', 'gate']) {
    hass.states[`camera.${name}`] = { attributes: { module_id: name } };
    hass.states[`binary_sensor.${name}`] = {
      entity_id: `binary_sensor.${name}`,
      state: 'off',
      last_changed: '2026-11-15T10:00:00Z',
      attributes: { module_id: name, ringing: null },
    };
    hass.entities[`camera.${name}`] = { device_id: 'home', platform: 'bticino_intercom' };
    hass.entities[`binary_sensor.${name}`] = { device_id: 'home', platform: 'bticino_intercom' };
  }
  hass.devices.home = { id: 'home', config_entries: ['entry-home'] };
  return hass;
}

function ring(hass, name = 'front', metadata = { session_id: 'call-1' }, started = '2026-11-15T10:01:00Z') {
  hass.states = {
    ...hass.states,
    [`binary_sensor.${name}`]: {
      ...hass.states[`binary_sensor.${name}`],
      state: 'on',
      last_changed: started,
      attributes: { module_id: name, ringing: metadata },
    },
  };
}

function quiet(hass, name = 'front', state = 'off') {
  hass.states = {
    ...hass.states,
    [`binary_sensor.${name}`]: { ...hass.states[`binary_sensor.${name}`], state },
  };
}

function makeCard(hass, config = CONFIG) {
  const card = document.createElement('bticino-intercom-card');
  card.setConfig(structuredClone(config));
  card.hass = hass;
  document.body.appendChild(card);
  return card;
}

const incoming = (card) => !!card.shadowRoot.querySelector('ha-card.ringing');
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

afterEach(async () => {
  document.body.replaceChildren();
  await settle();
  tones = 0;
  stops = 0;
});

test('a non-admin opening after the ring sees Answer/Open/Reject without querying ringing or subscribing to events', () => {
  const hass = makeHass();
  ring(hass);
  const card = makeCard(hass);
  assert.ok(incoming(card));
  for (const id of ['ring-answer', 'ring-open', 'ring-reject']) assert.ok(card.shadowRoot.getElementById(id));
  assert.ok(hass.messages.every((message) => message.type === 'auth/sign_path'));
  assert.equal(hass.callbacks.length, 0);
  assert.equal(card._playing, false);
  assert.equal(tones, 1);
});

test('ringing also updates on an already open dashboard and after connection replacement', () => {
  const hass = makeHass();
  const card = makeCard(hass);
  assert.equal(incoming(card), false);
  ring(hass);
  card.hass = { ...hass };
  assert.ok(incoming(card));
  card.hass = { ...hass, connection: { subscribeEvents: () => assert.fail('non-admin subscription') } };
  assert.ok(incoming(card));
  assert.equal(tones, 1);
});

test('browser clock skew does not change the server sensor state', () => {
  const oldNow = Date.now;
  try {
    for (const skew of [-86400000, 86400000]) {
      Date.now = () => oldNow() + skew;
      const hass = makeHass();
      ring(hass);
      const card = makeCard(hass);
      assert.ok(incoming(card));
      card.remove();
    }
  } finally {
    Date.now = oldNow;
  }
});

test('metadata enrichment preserves the ringtone and restores normal controls when ringing stops', async () => {
  const hass = makeHass();
  const card = makeCard(hass);
  const original = card.shadowRoot.getElementById('action-bar').innerHTML;
  ring(hass, 'front', {});
  card.hass = { ...hass };
  ring(hass, 'front', { session_id: 'call-1', snapshot_url: '/api/snapshot/new.jpg' });
  card.hass = { ...hass };
  await settle();
  assert.equal(tones, 1);
  assert.equal(card.shadowRoot.querySelector('#ring-snapshot img').getAttribute('src'), '/api/snapshot/new.jpg');
  assert.equal(card._ringSessionId, 'call-1');
  quiet(hass);
  card.hass = { ...hass };
  assert.equal(incoming(card), false);
  assert.equal(card.shadowRoot.getElementById('action-bar').innerHTML, original);
  assert.ok(stops >= 1);
});

for (const sensorFirst of [true, false]) {
  test(`an unanswered sensor ring shows the missed-call label (${sensorFirst ? 'sensor' : 'event'} first)`, async () => {
    const hass = makeHass({ admin: true });
    ring(hass);
    const card = makeCard(hass);
    await settle();
    const end = { data: { type: 'end', session_id: 'call-1', reason: 'timeout' } };
    if (sensorFirst) {
      quiet(hass);
      card.hass = { ...hass };
      assert.equal(incoming(card), false);
      assert.equal(card.shadowRoot.querySelector('.content-name').textContent, 'Front');
    }
    hass.callbacks[0](end);
    assert.equal(incoming(card), false);
    assert.match(card.shadowRoot.querySelector('.content-name').textContent, /Missed call/);
    // An unrelated update while the sensor is still on must not reopen it.
    card.hass = { ...hass };
    assert.equal(incoming(card), false);
    quiet(hass);
    card.hass = { ...hass };
    const timer = card._missedCallTimer;
    hass.callbacks[0](end);
    assert.equal(card._missedCallTimer, timer);
    assert.match(card.shadowRoot.querySelector('.content-name').textContent, /Missed call/);
  });
}

test('sensor-off alone does not report a missed call for admins or non-admins', async () => {
  for (const admin of [true, false]) {
    const hass = makeHass({ admin });
    ring(hass);
    const card = makeCard(hass);
    quiet(hass);
    card.hass = { ...hass };
    await settle();
    assert.equal(incoming(card), false);
    assert.equal(card.shadowRoot.querySelector('.content-name').textContent, 'Front');
    assert.equal(hass.callbacks.length, admin ? 1 : 0);
    card.remove();
  }
});

test('answered, rejected and dismissed sensor rings do not become missed calls', async () => {
  for (const action of ['_answerIncomingCall', '_rejectIncomingCall', '_dismissIncomingCall']) {
    const hass = makeHass({ admin: true });
    ring(hass);
    const card = makeCard(hass);
    card._connect = () => {};
    await settle();
    card[action]();
    quiet(hass);
    card.hass = { ...hass };
    hass.callbacks[0]({ data: { type: 'end', session_id: 'call-1', reason: 'timeout' } });
    assert.doesNotMatch(card.shadowRoot.querySelector('.content-name').textContent, /Missed call/);
    card.remove();
  }
});

test('a rescinded sensor ring was answered elsewhere and does not show a missed call', async () => {
  const hass = makeHass({ admin: true });
  ring(hass);
  const card = makeCard(hass);
  await settle();
  quiet(hass);
  card.hass = { ...hass };
  hass.callbacks[0]({ data: { type: 'end', session_id: 'call-1', reason: 'rescind' } });
  assert.equal(card.shadowRoot.querySelector('.content-name').textContent, 'Front');
  hass.callbacks[0]({ data: { type: 'end', session_id: 'call-1', reason: 'timeout' } });
  assert.equal(card.shadowRoot.querySelector('.content-name').textContent, 'Front');
});

test('a delayed end for an older ring cannot clear a newer ring or report it as missed', async () => {
  const hass = makeHass({ admin: true });
  ring(hass);
  const card = makeCard(hass);
  await settle();
  ring(hass, 'front', { session_id: 'call-2' }, '2026-11-15T10:02:00Z');
  card.hass = { ...hass };
  for (const session_id of ['unrelated', 'call-1', undefined]) {
    hass.callbacks[0]({ data: { type: 'end', session_id, reason: 'timeout' } });
    assert.ok(incoming(card));
    assert.equal(card.shadowRoot.querySelector('.content-name').textContent, 'Front');
  }
});

test('missed-call tracking is reset on reconfiguration and removal', async () => {
  for (const reconfigure of [true, false]) {
    const hass = makeHass({ admin: true });
    ring(hass);
    const card = makeCard(hass);
    await settle();
    quiet(hass);
    card.hass = { ...hass };
    if (reconfigure) card.setConfig(structuredClone(CONFIG));
    else {
      card.remove();
      document.body.appendChild(card);
      await settle();
    }
    hass.callbacks.at(-1)({ data: { type: 'end', session_id: 'call-1', reason: 'timeout' } });
    assert.equal(card.shadowRoot.querySelector('.content-name').textContent, 'Front');
    card.remove();
  }
});

test('duplicate state updates and re-rendering preserve the same ring without restarting audio', () => {
  const hass = makeHass();
  ring(hass);
  const card = makeCard(hass);
  card.hass = { ...hass };
  card._render();
  assert.ok(incoming(card));
  assert.equal(tones, 1);
  quiet(hass);
  card.hass = { ...hass };
  assert.equal(card.shadowRoot.querySelectorAll('.ring-action').length, 0);
});

test('an originally empty action bar is restored', () => {
  const hass = makeHass();
  const card = makeCard(hass, { intercoms: [{ name: 'Front', camera: 'camera.front' }], ignore_ssl_warning: true });
  const original = card.shadowRoot.getElementById('action-bar').innerHTML;
  ring(hass);
  card.hass = { ...hass };
  quiet(hass);
  card.hass = { ...hass };
  assert.equal(card.shadowRoot.getElementById('action-bar').innerHTML, original);
});

test('history metadata cannot be mistaken for the current call', () => {
  const hass = makeHass();
  ring(hass, 'front', {});
  Object.assign(hass.states['binary_sensor.front'].attributes, { session_id: 'historical', snapshot_url: '/old.jpg' });
  const card = makeCard(hass);
  assert.ok(incoming(card));
  assert.equal(card._ringData.session_id, undefined);
  assert.equal(card._ringData.snapshot_url, undefined);
  assert.ok(hass.messages.every((message) => message.path !== '/old.jpg'));
});

test('sensor off, unknown, unavailable or removed clears controls but does not hang up a live stream', () => {
  for (const state of ['off', 'unknown', 'unavailable', 'removed']) {
    const hass = makeHass();
    ring(hass);
    const card = makeCard(hass);
    const stream = { entityId: 'camera.front', stop: () => assert.fail('sensor-off ended the media') };
    card._session = stream;
    card._playing = true;
    if (state === 'removed') delete hass.states['binary_sensor.front'];
    else quiet(hass, 'front', state);
    card.hass = { ...hass };
    assert.equal(incoming(card), false);
    assert.equal(card._session, stream);
    card._session = null;
    card.remove();
  }
});

test('the correct intercom and actions are selected for a ring at another entrance', () => {
  const hass = makeHass();
  ring(hass, 'gate');
  const card = makeCard(hass);
  assert.equal(card._activeIntercom.camera, 'camera.gate');
  assert.match(card.shadowRoot.querySelector('.content-name').textContent, /Gate/);
  card.shadowRoot.getElementById('ring-open').click();
  assert.deepEqual(hass.services[0].slice(0, 2), ['lock', 'unlock']);
  assert.deepEqual(hass.services[0][3], { entity_id: 'lock.gate' });
});

test('pairing requires both the same bridge device and module, and the integration platform', () => {
  const hass = makeHass();
  ring(hass);
  hass.entities['binary_sensor.front'].device_id = 'different-home';
  const card = makeCard(hass);
  assert.equal(incoming(card), false);
  hass.entities['binary_sensor.front'].device_id = 'home';
  hass.entities['binary_sensor.front'].platform = 'unrelated';
  hass.entities = { ...hass.entities };
  card.hass = { ...hass };
  assert.equal(incoming(card), false);
  hass.entities['binary_sensor.front'].platform = 'bticino_intercom';
  hass.entities = { ...hass.entities };
  hass.states['binary_sensor.front'].attributes.module_id = 'wrong-unit';
  card.hass = { ...hass };
  assert.equal(incoming(card), false);
});

test('pairing waits for the camera registry and module metadata to arrive', () => {
  const hass = makeHass();
  ring(hass);
  delete hass.states['camera.front'].attributes.module_id;
  const card = makeCard(hass);
  assert.equal(incoming(card), false);
  hass.states['camera.front'].attributes.module_id = 'front';
  delete hass.entities['camera.front'];
  hass.entities = { ...hass.entities };
  card.hass = { ...hass };
  assert.equal(incoming(card), false);
  hass.entities['camera.front'] = { device_id: 'home', platform: 'bticino_intercom' };
  hass.entities = { ...hass.entities };
  card.hass = { ...hass };
  assert.ok(incoming(card));
});

test('registry scans are cached while ringing still follows current sensor states', () => {
  const hass = makeHass();
  for (let index = 0; index < 4900; index++) hass.entities[`sensor.unrelated_${index}`] = { platform: 'other' };
  let scans = 0;
  hass.entities = new Proxy(hass.entities, {
    ownKeys(target) {
      scans++;
      return Reflect.ownKeys(target);
    },
  });
  const card = makeCard(hass);
  assert.equal(scans, 1);
  for (let update = 0; update < 10; update++) card.hass = { ...hass };
  ring(hass);
  card.hass = { ...hass };
  assert.ok(incoming(card));
  quiet(hass);
  card.hass = { ...hass };
  assert.equal(incoming(card), false);
  assert.equal(scans, 1);
});

test('a changed registry rebuilds sensor matches, including additions, removals and bridge changes', () => {
  const hass = makeHass();
  ring(hass);
  const card = makeCard(hass);
  assert.ok(incoming(card));
  const sensor = hass.entities['binary_sensor.front'];
  hass.entities = { ...hass.entities, 'binary_sensor.front': { ...sensor, device_id: 'another-home' } };
  card.hass = { ...hass };
  assert.equal(incoming(card), false);
  hass.entities = { ...hass.entities, 'binary_sensor.front': sensor };
  card.hass = { ...hass };
  assert.ok(incoming(card));
  const { 'binary_sensor.front': removed, ...remaining } = hass.entities;
  hass.entities = remaining;
  card.hass = { ...hass };
  assert.equal(incoming(card), false);
  hass.entities = { ...hass.entities, 'binary_sensor.front_replaced': removed };
  hass.states['binary_sensor.front_replaced'] = {
    ...hass.states['binary_sensor.front'],
    entity_id: 'binary_sensor.front_replaced',
  };
  card.hass = { ...hass };
  assert.ok(incoming(card));
});

test('cached registry ids still handle late module metadata and card configuration changes', () => {
  const hass = makeHass();
  ring(hass, 'gate');
  delete hass.states['camera.gate'].attributes.module_id;
  delete hass.states['binary_sensor.gate'].attributes.module_id;
  const card = makeCard(hass, { intercoms: [CONFIG.intercoms[0]], ignore_ssl_warning: true });
  assert.equal(incoming(card), false);
  card.setConfig(structuredClone(CONFIG));
  assert.equal(incoming(card), false);
  hass.states['camera.gate'].attributes.module_id = 'gate';
  card.hass = { ...hass };
  assert.equal(incoming(card), false);
  hass.states['binary_sensor.gate'].attributes.module_id = 'gate';
  card.hass = { ...hass };
  assert.ok(incoming(card));
  card.setConfig({ intercoms: [CONFIG.intercoms[0]], ignore_ssl_warning: true });
  assert.equal(incoming(card), false);
  card.setConfig({ intercoms: [{ ...CONFIG.intercoms[1], name: 'Back gate' }], ignore_ssl_warning: true });
  assert.ok(incoming(card));
  assert.equal(card._ringData.module_name, 'Back gate');
});

test('dismissing or rejecting suppresses only the current ring until it ends', () => {
  for (const action of ['_dismissIncomingCall', '_rejectIncomingCall']) {
    const hass = makeHass();
    ring(hass);
    const card = makeCard(hass);
    card[action]();
    card.hass = { ...hass };
    assert.equal(incoming(card), false);
    quiet(hass);
    card.hass = { ...hass };
    ring(hass, 'front', { session_id: 'next-call' }, '2026-11-15T10:02:00Z');
    card.hass = { ...hass };
    assert.ok(incoming(card));
    if (action === '_rejectIncomingCall') assert.equal(hass.services[0][1], 'reject_call');
    card.remove();
  }
});

test('a new session while the sensor remains on replaces a dismissed ring', () => {
  const hass = makeHass();
  ring(hass);
  const card = makeCard(hass);
  card._dismissIncomingCall();
  ring(hass, 'front', { session_id: 'next-call' });
  card.hass = { ...hass };
  assert.ok(incoming(card));
});

test('answering starts the selected call only once and ignores state updates until the ring ends', () => {
  const hass = makeHass();
  ring(hass, 'gate');
  const card = makeCard(hass);
  let starts = 0;
  card._connect = () => starts++;
  card.shadowRoot.getElementById('ring-answer').click();
  assert.equal(starts, 1);
  assert.equal(card._callEntity, 'camera.gate');
  card.hass = { ...hass };
  assert.equal(incoming(card), false);
  quiet(hass, 'gate');
  card.hass = { ...hass };
  assert.equal(card._playing, true);
});

test('the regular card plays audio when the video has no frame', () => {
  const card = makeCard(makeHass());
  const sound = { kind: 'audio' };
  const picture = { kind: 'video', muted: true };
  const call = { state: 'live', stream: new MediaStream([picture, sound]), micActive: false };
  const video = card.shadowRoot.getElementById('video');
  const audio = card.shadowRoot.getElementById('call-audio');
  let playRequests = 0;
  audio.play = async () => playRequests++;
  card._playing = true;
  card._onCallState(call);

  assert.deepEqual(video.srcObject.getVideoTracks(), [picture]);
  assert.equal(video.readyState, 0);
  assert.equal(video.muted, true);
  assert.deepEqual(audio.srcObject.getAudioTracks(), [sound]);
  assert.deepEqual(audio.srcObject.getVideoTracks(), []);
  card._onCallState(call);
  assert.equal(playRequests, 1, 'a state update must not restart audio');

  const volume = card.shadowRoot.getElementById('vc-volume');
  volume.click();
  assert.equal(audio.muted, true);
  volume.click();
  assert.equal(audio.muted, false);
  assert.equal(playRequests, 2, 'unmuting can retry playback from a user gesture');

  call.state = 'error';
  card._onCallState(call);
  assert.equal(audio.srcObject, null);
  call.state = 'live';
  card._onCallState(call);
  card._hangUp();
  assert.equal(audio.srcObject, null);
  assert.equal(video.srcObject, null);
});

test('ringing during live view keeps its media and shows the overlay and ringtone', () => {
  const hass = makeHass();
  const card = makeCard(hass);
  const stream = { entityId: 'camera.front', stop: () => assert.fail('incoming ring interrupted the stream') };
  card._session = stream;
  card._playing = true;
  card._setState('live');
  ring(hass, 'gate');
  card.hass = { ...hass };
  assert.ok(incoming(card));
  assert.equal(tones, 1);
  assert.equal(card._session, stream);
  assert.equal(card._callEntity, 'camera.front');
  assert.ok(card.shadowRoot.querySelector('.tab[data-tab-idx="0"]').classList.contains('live'));
  assert.ok(card.shadowRoot.querySelector('.tab[data-tab-idx="1"]').classList.contains('ring'));
  card.shadowRoot.getElementById('ring-open').click();
  assert.deepEqual(hass.services[0][3], { entity_id: 'lock.gate' });
  card._session = null;
});

test('a live media update does not fade the still-ringing overlay', () => {
  const hass = makeHass();
  ring(hass);
  const card = makeCard(hass);
  const call = { state: 'live', stream: new window.MediaStream(), micActive: false };
  card._onCallState(call);
  assert.ok(incoming(card));
  assert.equal(card.shadowRoot.getElementById('ring-snapshot').style.opacity, '');
  quiet(hass);
  card.hass = { ...hass };
  card._onCallState(call);
  assert.equal(card.shadowRoot.getElementById('ring-snapshot'), null);
});

test('answering a different entrance explicitly replaces the live view', () => {
  const hass = makeHass();
  const card = makeCard(hass);
  let stopped = 0;
  let starts = 0;
  card._session = { entityId: 'camera.front', stop: () => stopped++ };
  card._playing = true;
  card._connect = () => starts++;
  ring(hass, 'gate');
  card.hass = { ...hass };
  card.shadowRoot.getElementById('ring-answer').click();
  assert.equal(stopped, 1);
  assert.equal(starts, 1);
  assert.equal(card._callEntity, 'camera.gate');
  assert.equal(incoming(card), false);
});

test('answering while already viewing the ringing entrance reuses that stream', () => {
  const hass = makeHass();
  const card = makeCard(hass);
  const stream = { entityId: 'camera.front', stop: () => assert.fail('same stream was replaced') };
  card._session = stream;
  card._playing = true;
  card._connect = () => assert.fail('a second call was started');
  ring(hass);
  card.hass = { ...hass };
  card.shadowRoot.getElementById('ring-answer').click();
  assert.equal(incoming(card), false);
  assert.equal(card._session, stream);
  card._session = null;
});

test('a real media-end event hangs up an answered call, while an unrelated end leaves it open', async () => {
  const hass = makeHass({ admin: true });
  ring(hass);
  const card = makeCard(hass);
  let stopped = 0;
  card._connect = () => {};
  card.shadowRoot.getElementById('ring-answer').click();
  card._session = { entityId: 'camera.front', stop: () => stopped++ };
  card._state = 'live';
  await settle();
  hass.callbacks[0]({ data: { type: 'end', session_id: 'other-call' } });
  assert.equal(stopped, 0);
  hass.callbacks[0]({ data: { type: 'end', session_id: 'call-1' } });
  assert.equal(stopped, 1);
  assert.equal(card._playing, false);
});

test('an admin subscription failure is handled once, while sensor restoration still works', async () => {
  const hass = makeHass({ admin: true, denied: true });
  ring(hass);
  const card = makeCard(hass);
  await settle();
  for (let i = 0; i < 3; i++) card.hass = { ...hass };
  assert.equal(hass.callbacks.length, 1);
  assert.ok(incoming(card));
});

test('custom ring events cannot resurrect a sensor that has already stopped', async () => {
  const hass = makeHass({ admin: true });
  const card = makeCard(hass);
  await settle();
  hass.callbacks[0]({ data: { type: 'ring', camera_entity_id: 'camera.front', session_id: 'old' } });
  assert.equal(incoming(card), false);
  hass.callbacks[0]({ data: { type: 'ring', camera_entity_id: 'camera.unconfigured', session_id: 'foreign' } });
  assert.equal(incoming(card), false);
});

test('legacy ring events remain available to admins without a matching sensor', async () => {
  const hass = makeHass({ admin: true });
  delete hass.entities['binary_sensor.front'];
  const card = makeCard(hass);
  await settle();
  hass.callbacks[0]({ data: { type: 'ring', camera_entity_id: 'camera.front', session_id: 'legacy' } });
  assert.ok(incoming(card));
  hass.callbacks[0]({ data: { type: 'end', session_id: 'legacy' } });
  assert.equal(incoming(card), false);
});

test('reconfiguration stops an irrelevant ring and connection changes dispose the old subscription', async () => {
  const hass = makeHass({ admin: true });
  ring(hass);
  const card = makeCard(hass);
  card.setConfig({ intercoms: [CONFIG.intercoms[1]], ignore_ssl_warning: true });
  assert.equal(incoming(card), false);
  const next = makeHass({ admin: true });
  card.hass = next;
  await settle();
  assert.equal(hass.unsubscribed.length, 1);
  hass.callbacks[0]({ data: { type: 'ring', camera_entity_id: 'camera.gate' } });
  assert.equal(incoming(card), false);
});

test('removal stops the ringtone and a reattached card restores the still-ringing sensor', async () => {
  const hass = makeHass({ admin: true });
  ring(hass);
  const card = makeCard(hass);
  card.remove();
  await settle();
  assert.ok(stops > 0);
  assert.equal(hass.unsubscribed.length, 1);
  document.body.appendChild(card);
  assert.ok(incoming(card));
});
