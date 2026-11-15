/**
 * What HACS installs: one file, both cards.
 *
 * They share the call in shared/webrtc.js and nothing else - each keeps its
 * own element name, editor and entry in the card picker, so a dashboard can
 * use either or both.
 */

import './bticino-intercom-card.js';
import './bticino-100x-card.js';
