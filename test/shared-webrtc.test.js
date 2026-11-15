// The call both cards share, driven against stand-ins for the browser and for
// Home Assistant's connection, so the contract with the server is pinned:
// where the offer goes, when the device's peer slot is handed back, what the
// integration is told, and that hanging up at an awkward moment leaves no
// microphone open.

import test from 'node:test';
import assert from 'node:assert/strict';

class FakeTrack {
  constructor(kind) {
    this.kind = kind;
    this.stopped = false;
  }
  stop() {
    this.stopped = true;
  }
}

class FakeStream {
  constructor(tracks = []) {
    this.tracks = tracks;
  }
  addTrack(track) {
    this.tracks.push(track);
  }
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio');
  }
  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video');
  }
}

const peers = [];
class FakePeerConnection {
  constructor(config) {
    this.config = config;
    this.senders = [];
    this.connectionState = 'new';
    this.closed = false;
    peers.push(this);
  }
  addTransceiver(trackOrKind) {
    if (typeof trackOrKind === 'string') return;
    const sender = {
      track: trackOrKind,
      replaceTrack: async (track) => {
        sender.track = track;
      },
    };
    this.senders.push(sender);
  }
  getSenders() {
    return this.senders;
  }
  async createOffer() {
    return { type: 'offer', sdp: 'v=0 offer' };
  }
  async setLocalDescription(description) {
    this.localDescription = description;
  }
  async setRemoteDescription(description) {
    this.remoteDescription = description;
  }
  async addIceCandidate() {}
  close() {
    this.closed = true;
  }
  becomes(state) {
    this.connectionState = state;
    this.onconnectionstatechange?.();
  }
}

/** A promise the test resolves by hand, for replies that take their time. */
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

let microphone = () => Promise.resolve(new FakeStream([new FakeTrack('audio')]));

globalThis.MediaStream = FakeStream;
globalThis.RTCPeerConnection = FakePeerConnection;
globalThis.AudioContext = class {
  state = 'running';
  createOscillator() {
    return { frequency: { value: 1 }, connect() {}, start() {}, stop() {} };
  }
  createMediaStreamDestination() {
    return { stream: new FakeStream([new FakeTrack('audio')]) };
  }
  resume() {
    return Promise.resolve();
  }
  close() {}
};
globalThis.WebSocket = class {
  constructor() {
    throw new Error('the call opened a socket of its own');
  }
};
globalThis.window = { isSecureContext: true };
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: { userAgent: 'Chrome/130', mediaDevices: { getUserMedia: () => microphone() } },
});

const { BticinoCallSession, CALL_STATE } = await import('../src/shared/webrtc.js');

function fakeHass({ connected = () => Promise.reject({ code: 'unknown_command', message: 'Unknown command.' }) } = {}) {
  const hass = {
    subscriptions: [],
    sent: [],
    nextSubscription: null,
    connection: {
      subscribeMessage(callback, message, options) {
        const subscription = { callback, message, options, unsubscribed: false };
        hass.subscriptions.push(subscription);
        const unsubscribe = () => {
          subscription.unsubscribed = true;
          return Promise.resolve();
        };
        if (hass.nextSubscription) {
          const pending = hass.nextSubscription;
          hass.nextSubscription = null;
          return pending.promise.then(() => unsubscribe);
        }
        return Promise.resolve(unsubscribe);
      },
    },
    callWS(message) {
      hass.sent.push(message);
      if (message.type === 'camera/webrtc/get_client_config') return Promise.resolve({ configuration: {} });
      if (message.type === 'bticino_intercom/webrtc_connected') return connected(message);
      return Promise.resolve(null);
    },
  };
  return hass;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
async function until(condition) {
  for (let i = 0; i < 50 && !condition(); i += 1) await settle();
  assert.ok(condition(), 'the call never got there');
}

/** The server's side of a handshake, from the offer to the answer. */
async function answer(hass, sessionId) {
  await until(() => hass.subscriptions.some((item) => !item.answered));
  const subscription = hass.subscriptions.find((item) => !item.answered);
  subscription.answered = true;
  subscription.callback({ type: 'session', session_id: sessionId });
  subscription.callback({ type: 'answer', answer: 'v=0 answer' });
  await settle();
  return subscription;
}

const reports = (hass) => hass.sent.filter((message) => message.type === 'bticino_intercom/webrtc_connected');
const newCall = (hass, options = {}) =>
  new BticinoCallSession(hass, { entityId: 'camera.front_door', wantsVideo: true, ...options });

test('the offer goes out on the connection the page already has, never resubscribed', async () => {
  const hass = fakeHass();
  const call = newCall(hass);
  call.start();

  await until(() => hass.subscriptions.length === 1);
  const [subscription] = hass.subscriptions;
  assert.deepEqual(subscription.message, {
    type: 'camera/webrtc/offer',
    entity_id: 'camera.front_door',
    offer: 'v=0 offer',
  });
  assert.deepEqual(subscription.options, { resubscribe: false });
  call.stop();
});

test('every connection is reported with its own session, reconnects included', async () => {
  const hass = fakeHass({ connected: () => Promise.resolve(null) });
  const call = newCall(hass);
  call.start();

  const first = await answer(hass, 'session-1');
  peers.at(-1).becomes('connected');
  assert.equal(call.state, CALL_STATE.LIVE);

  // what a dropped connection does once its reconnect delay is over
  call._reconnects = 1;
  call._connect();
  const second = await answer(hass, 'session-2');
  peers.at(-1).becomes('connected');

  assert.deepEqual(
    reports(hass).map((message) => [message.entity_id, message.session_id]),
    [
      ['camera.front_door', 'session-1'],
      ['camera.front_door', 'session-2'],
    ],
  );
  assert.equal(first.unsubscribed, true, 'the session left behind still holds a peer slot');
  assert.equal(second.unsubscribed, false);
  call.stop();
});

test('an integration without the command is not an error', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const hass = fakeHass();
  const call = newCall(hass);
  call.start();

  await answer(hass, 'session-1');
  peers.at(-1).becomes('connected');
  await settle();

  assert.equal(reports(hass).length, 1);
  assert.equal(call.state, CALL_STATE.LIVE);
  assert.equal(warn.mock.callCount(), 0);
  call.stop();
});

test('hanging up hands the device its peer slot back', async () => {
  const hass = fakeHass();
  const call = newCall(hass);
  call.start();
  const subscription = await answer(hass, 'session-1');
  const peer = peers.at(-1);
  peer.becomes('connected');

  call.stop();

  assert.equal(subscription.unsubscribed, true);
  assert.equal(peer.closed, true);
  assert.equal(call.state, CALL_STATE.CLOSED);
});

test('a call that fails lets go of the slot and the microphone at once', async () => {
  const track = new FakeTrack('audio');
  microphone = () => Promise.resolve(new FakeStream([track]));
  const hass = fakeHass();
  const call = newCall(hass);
  call.start();

  await until(() => hass.subscriptions.length === 1);
  const [subscription] = hass.subscriptions;
  await settle();
  subscription.callback({ type: 'error', code: 'webrtc_offer_failed', message: 'Max number of peers reached' });
  await until(() => call.state === CALL_STATE.ERROR);

  assert.match(call.error, /Max number of peers reached/);
  assert.equal(subscription.unsubscribed, true, 'nobody may be there to tap Dismiss');
  assert.equal(peers.at(-1).closed, true);
  assert.equal(track.stopped, true);
  assert.equal(call._reconnectTimer ?? null, null);
  microphone = () => Promise.resolve(new FakeStream([new FakeTrack('audio')]));
});

test('hanging up while the browser asks for the microphone leaves none open', async () => {
  const track = new FakeTrack('audio');
  const prompt = deferred();
  microphone = () => prompt.promise;
  const hass = fakeHass();
  const call = newCall(hass);
  call.start();

  call.stop();
  prompt.resolve(new FakeStream([track]));
  await settle();
  await settle();

  assert.equal(track.stopped, true);
  assert.equal(hass.subscriptions.length, 0, 'an offer went out for a call already hung up');
  microphone = () => Promise.resolve(new FakeStream([new FakeTrack('audio')]));
});

test('the microphone button too: a late grant is closed, a late refusal stays quiet', async () => {
  const hass = fakeHass();
  const notices = [];
  const call = newCall(hass, { autoMic: false, onNotice: (key) => notices.push(key) });
  call.start();
  await answer(hass, 'session-1');
  peers.at(-1).becomes('connected');

  const granted = new FakeTrack('audio');
  const prompt = deferred();
  microphone = () => prompt.promise;
  const asking = call.setMic(true);
  call.stop();
  prompt.resolve(new FakeStream([granted]));
  await asking;

  assert.equal(granted.stopped, true);
  assert.equal(call.micActive, false);

  const late = newCall(fakeHass(), { autoMic: false, onNotice: (key) => notices.push(key) });
  const refusal = deferred();
  microphone = () => refusal.promise.then(() => Promise.reject(new Error('NotAllowedError')));
  const refusing = late.setMic(true);
  late.stop();
  refusal.resolve();
  await refusing;

  assert.deepEqual(notices, [], 'a refusal for a call that is over has nobody to tell');
  microphone = () => Promise.resolve(new FakeStream([new FakeTrack('audio')]));
});

test('an offer still on its way when the call ends is released when it lands', async () => {
  const hass = fakeHass();
  const reply = deferred();
  hass.nextSubscription = reply;
  const call = newCall(hass);
  call.start();

  await until(() => hass.subscriptions.length === 1);
  call.stop();
  reply.resolve();
  await settle();

  assert.equal(hass.subscriptions[0].unsubscribed, true);
});
