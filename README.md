# Courtside — Gym Display

A dependency-free gym display for a local clock, countdown timer, one volleyball court or two independent courts. Open the hosted URL on a phone or computer. For local development, serve `dist/` with any static HTTP server; for example `python -m http.server 8765 --directory dist` from this folder, then visit http://localhost:8765.

## Use

Choose a mode, set the teams or timer, then choose **TV display** to hide editing controls. Exit using the subtle button at the bottom right; desktop keyboards also support F and Escape. Space starts/pauses the timer outside form controls. Timer presets replace the current timer. Custom duration supports 0–99 minutes and 0–59 seconds. A finished timer can be restarted with one tap. The visual alarm always works; optional sound must be enabled through a user gesture and depends on browser/device audio policy.

Scoreboards have independent points, sets, serving indicators and editable team/court names. Swap ends moves team names, scores, sets and service together. Reset asks for confirmation; undo restores previous scoreboard actions. Points are bounded at 0–999 and sets at 0–99, with manual scoring so different practice formats are supported. The app does not automatically decide set or match winners.

## Show it on a TV

Use your device's existing screen mirroring or browser casting features, or connect a laptop by HDMI. iPhone/iPad need an AirPlay-compatible TV/receiver; Android compatibility varies. Desktop Chrome can cast a tab. Both devices normally need the same Wi-Fi; isolated guest networks may block discovery. These connections must be initiated using the device/browser's native tools.

On a laptop, **Open display window** opens a clean view you can place on an extended TV screen or cast as a tab, while controlling the original window. Same-browser windows on the same origin synchronize via BroadcastChannel/localStorage. This is **not** independent phone-to-TV pairing or cross-device remote control. Phone screen mirroring also mirrors the controls whenever you exit TV display. For two courts on TV, landscape is recommended.

The optional wake-lock checkbox in casting help requests screen wake lock if supported. Keep the page visible and the device unlocked; adjust auto-lock manually if your browser cannot keep it awake. Background browser/OS suspension can delay the alarm, although the countdown recomputes from its saved deadline when resumed.

State is saved in this browser, including running timer deadlines. Private browsing or restricted local storage may prevent persistence. Clear browser storage to clear saved state. Sound setting can persist, but after a reload a fresh user gesture may be required before sound can play.

## Verification

`node --check dist/app.js` and `node --check dist/model.js` validate script syntax. `node --test model.test.cjs` runs model checks where the test file is present. Actual TV casting, AirPlay, phone audio, wake locks and device compatibility require testing with the gym's equipment; source/browser checks do not establish those hardware flows.
