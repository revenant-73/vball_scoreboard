# Courtside — Gym Display

A dependency-free gym display with a paired phone remote, local clock, countdown timer, and one or two volleyball scoreboards. For local development use Node 22.13+ and run `node scripts/dev.mjs`, then open http://127.0.0.1:8765. The local preview uses an in-memory SQLite database; restarting it ends local test sessions. `node scripts/build.mjs` builds a self-contained Cloudflare Worker from the browser assets and worker source. Production sessions use the Sites D1 binding DB and the schema in drizzle/.

## Use

Choose a mode, set the teams or timer, then choose **TV display** to hide editing controls. Exit using the subtle button at the bottom right; desktop keyboards also support F and Escape. Space starts/pauses the timer outside form controls. Timer presets replace the current timer. Custom duration supports 0–99 minutes and 0–59 seconds. A finished timer can be restarted with one tap. The visual alarm always works; optional sound must be enabled through a user gesture and depends on browser/device audio policy.

Scoreboards have independent points, sets, serving indicators and editable team/court names. Swap ends moves team names, scores, sets and service together. Reset asks for confirmation; undo restores previous scoreboard actions. Points are bounded at 0–999 and sets at 0–99, with manual scoring so different practice formats are supported. The app does not automatically decide set or match winners.

## Show it on a TV

Use your device's existing screen mirroring or browser casting features, or connect a laptop by HDMI. iPhone/iPad need an AirPlay-compatible TV/receiver; Android compatibility varies. Desktop Chrome can cast a tab. Both devices normally need the same Wi-Fi; isolated guest networks may block discovery. These connections must be initiated using the device/browser's native tools.

On a laptop, **Open display window** opens a clean view you can place on an extended TV screen or cast as a tab, while controlling the original window. Same-browser windows on the same origin synchronize via BroadcastChannel/localStorage. For independent phone control, use **Connect TV & phone** instead. Phone screen mirroring also mirrors the controls whenever you exit TV display. For two courts on TV, landscape is recommended.

The optional wake-lock checkbox in casting help requests screen wake lock if supported. Keep the page visible and the device unlocked; adjust auto-lock manually if your browser cannot keep it awake. Background browser/OS suspension can delay the alarm, although the countdown recomputes from its saved deadline when resumed.

State is saved in this browser, including running timer deadlines. Private browsing or restricted local storage may prevent persistence. Clear browser storage to clear saved state. Sound setting can persist, but after a reload a fresh user gesture may be required before sound can play.

## Verification

`node --check dist/app.js` and `node --check dist/model.js` validate script syntax. `node --test model.test.cjs` runs model checks where the test file is present. Actual TV casting, AirPlay, phone audio, wake locks and device compatibility require testing with the gym's equipment; source/browser checks do not establish those hardware flows.


## Paired phone remote

1. On the phone choose **Connect TV & phone → Start on this phone**. The existing scores/timer become the new session.
2. On the TV browser or a laptop displaying/casting to the TV, open Courtside, choose **Connect TV & phone**, enter the eight-character session code, and select **TV display**. Alternatively open the copied TV display link.
3. The phone stays on large scoring pads: tap or swipe up adds one point; swipe down or the separate minus button subtracts one. Undo corrects the last local scoreboard change. Modes and timer controls synchronize as well. Team names, sets and serve are in the expandable settings.

The TV page is read-only. It shows no phone controls. Display-link credentials live in the URL fragment until loaded and then in that tab's session storage. Pairing codes grant control to anyone who also has access to this private Site. Existing Site access has not changed: both devices must be able to access it. Sessions expire after 24 hours, and **End session** revokes all devices immediately. Disconnect only leaves the session on that device.

Updates use short polling (roughly 0.8 seconds) with revision checks and retry-safe IDs. Concurrent edits from different remotes cannot silently overwrite each other: the losing remote refreshes and asks the coach to retry. Connection status distinguishes pending/unconfirmed changes; the TV retains the last confirmed display if disconnected. Unconfirmed changes are held in memory and retried while the tab remains open. Avoid closing the remote until confirmed. Timer deadlines use the server clock offset.

Ordinary phone screen mirroring cannot transmit a separate scoreboard while hiding phone controls. Use a TV browser, a laptop on HDMI, or cast the laptop's paired display tab. A native Chromecast receiver/iOS second-screen integration is not included. Actual TV hardware, phone touch behavior, audio and wake lock still need a gym equipment test. Swipe pointer gestures were verified through browser input, not a physical phone.

Run `node --test model.test.cjs remote.test.mjs` for countdown, persistence validation, pairing, read-only TV authorization, revision conflicts, retries, timer clock offset, and expiry/revocation checks. Syntax-check app.js, remote.js and worker/index.mjs before building.
