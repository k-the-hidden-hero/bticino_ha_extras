// The integration closes a call record with the outcome it learned from the
// device: `answered_elsewhere` when someone picked up, `missed_call` when
// nobody did. The card only knew `incoming_call`, `answered_elsewhere` and
// `terminated`, so a `missed_call` record fell through to the raw-type
// fallback and rendered as an unstyled "MISSED_CALL" chip.

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
class HaEntityPickerStub extends window.HTMLElement {}
window.customElements.define('ha-entity-picker', HaEntityPickerStub);

const cardFile = process.env.CARD_FILE || path.resolve('dist/bticino-intercom-card.js');
await import(pathToFileURL(cardFile).href);

function makeCard() {
  const card = document.createElement('bticino-intercom-card');
  document.body.appendChild(card);
  card.hass = { language: 'en', states: {}, entities: {}, devices: {}, callWS: async () => ({}) };
  card.setConfig({
    type: 'custom:bticino-intercom-card',
    intercoms: [{ name: 'Front', camera: 'camera.front' }],
  });
  return card;
}

const EVENTS = [
  { title: '2026-08-27 16:04:31 — Front (missed_call)' },
  { title: '2026-08-27 15:00:00 — Front (accepted_call)' },
  { title: '2026-08-26 11:09:32 — Front (incoming_call)' },
  { title: '2026-08-25 09:00:00 — Front (answered_elsewhere)' },
  { title: '2026-08-24 08:00:00 — Front (terminated)' },
];

test('every event type the integration writes gets a label and a badge class', () => {
  const card = makeCard();
  card._historyEvents = EVENTS;
  card._renderHistoryList(EVENTS, 'entry123');

  const badges = [...card.shadowRoot.querySelectorAll('.history-badge')];
  assert.deepEqual(
    badges.map((b) => b.textContent),
    ['Missed', 'Answered', 'Missed', 'Answered', 'Rejected'],
  );
  // The raw type is never shown: that is what an unmapped type looks like.
  for (const badge of badges) {
    assert.doesNotMatch(badge.textContent, /_/, 'a raw event type leaked into the badge');
  }
});

test('the detail view maps the new types too', async () => {
  const card = makeCard();
  card._historyEvents = EVENTS;
  await card._openHistoryDetail(EVENTS[0], 'entry123', 0);

  const badge = card.shadowRoot.querySelector('#history-detail-bar .history-badge');
  assert.ok(badge, 'the detail bar should carry a badge');
  assert.equal(badge.textContent, 'Missed');
  assert.match(badge.className, /missed_call/);
});
