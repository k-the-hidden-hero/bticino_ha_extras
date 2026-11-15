// A theme such as Liquid Glass makes cards translucent through
// --ha-card-background and keeps --card-background-color solid. The card read
// --card-background-color first, so it stayed opaque under those themes (#3).
// The panels drawn over the card must stay solid, or the video and the buttons
// under them would show through.

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

const cardFile = process.env.CARD_FILE || path.resolve('src/bticino-intercom-card.js');
await import(pathToFileURL(cardFile).href);

function cardStyles() {
  const card = document.createElement('bticino-intercom-card');
  document.body.appendChild(card);
  card.hass = { language: 'en', states: {}, entities: {}, devices: {}, callWS: async () => ({}) };
  card.setConfig({
    type: 'custom:bticino-intercom-card',
    intercoms: [{ name: 'Front', camera: 'camera.front' }],
  });
  return [...card.shadowRoot.querySelectorAll('style')].map((s) => s.textContent).join('\n');
}

// The declaration of `property` inside the first rule whose selector is `selector`.
function declaration(css, selector, property) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = css.match(new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(rule, `no rule for ${selector}`);
  const decl = rule[1].match(new RegExp(`(?:^|[;\\s])${property}\\s*:\\s*([^;]+);`));
  assert.ok(decl, `${selector} sets no ${property}`);
  return decl[1].trim();
}

test('the card background reads --ha-card-background first, as Home Assistant cards do', () => {
  const css = cardStyles();
  assert.equal(declaration(css, 'ha-card', 'background'), 'var(--bti-bg)');
  assert.match(declaration(css, ':host', '--bti-bg'), /^var\(--ha-card-background,\s*var\(--card-background-color,/);
});

test('the panels drawn over the card keep a solid surface', () => {
  const css = cardStyles();
  assert.match(declaration(css, ':host', '--bti-surface'), /^var\(--card-background-color,/);
  for (const panel of ['.overflow-popup', '.history-overlay', '.history-detail']) {
    assert.equal(declaration(css, panel, 'background'), 'var(--bti-surface)', panel);
  }
});
