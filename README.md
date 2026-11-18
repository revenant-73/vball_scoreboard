# Courtside — Gym Display

Source repository: https://github.com/revenant-73/vball_scoreboard

Local project folder: `D:\Websites-Apps\vball_scoreboard`.

Live Netlify app: https://vball-scoreboard.netlify.app

The browser display is plain HTML/CSS/JavaScript. Netlify serves the frontend and routes `/api/*` to a serverless function using managed Postgres for paired sessions. GitHub Pages alone cannot run the phone remote backend.

For a quick local preview, run `node scripts/dev.mjs` and open http://127.0.0.1:8765. This preview uses in-memory SQLite and needs Node 22.13+; restarting it ends local test sessions. It binds to loopback and is not reachable from another phone or TV.

For the Netlify backend, run `npm ci`, then `netlify dev` and `netlify database migrations apply`. Netlify local development uses its Postgres-compatible database. The SQL migrations under `netlify/database/migrations/` are applied automatically to hosted databases during deployment. `node scripts/build-netlify.mjs` copies only browser assets to `public/`; server code and credentials are never published as static files.

The previous Sites/Cloudflare deployment remains separate and unchanged. Its original build command is `node scripts/build.mjs`; the Netlify adapter uses the same tested session API with Postgres-compatible storage. Session codes are specific to the host that created them.

## Touch display (default)

Open the app on the phone and mirror the screen to a compatible TV. The phone and TV show the same display. Keep the phone open/unlocked, use landscape for a wall TV, and consider Do Not Disturb to prevent notifications on the TV. No pairing code or backend is needed for this screen-mirroring flow; local state is saved in the phone browser.

- Tap the navy or red score area to add one point. Swipe up/down on that side to add/subtract one. Team-name taps edit the name instead of scoring.
- Tap scoreboard titles or team names to edit them. The TV will also show the edit dialog while mirroring.
- Tap timer digits to start/pause. Hold for 0.75 seconds to request a reset, then confirm. Tap the duration label to change the preset time.
- Swipe left/right between clock, timer, one scoreboard and two scoreboards. The small bottom-right grid icon opens the same mode choices plus settings, undo and full-screen options.
- Dual scoreboards operate independently. Use settings to adjust sets, service, swap ends or reset scores. Three-digit scores remain supported.
- Keyboard users can Tab to a name or score and use Enter/Space. All swipe actions also have menu/button alternatives.

The optional paired phone remote and read-only TV browser remain available under the grid menu's **Separate TV browser (optional)** option. That setup uses the server; ordinary screen mirroring does not. Existing sessions and saved score data are preserved.

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

The TV page is read-only. It shows no phone controls. Display-link credentials live in the URL fragment until loaded and then in that tab's session storage. The Netlify app can be opened by coaches without an account. Treat the session code as a remote key: anyone with it can control that session. Sessions expire after 24 hours, and **End session** revokes all devices immediately. Disconnect only leaves the session on that device.

Updates use short polling (roughly 0.8 seconds) with revision checks and retry-safe IDs. Concurrent edits from different remotes cannot silently overwrite each other: the losing remote refreshes and asks the coach to retry. Connection status distinguishes pending/unconfirmed changes; the TV retains the last confirmed display if disconnected. Unconfirmed changes are held in memory and retried while the tab remains open. Avoid closing the remote until confirmed. Timer deadlines use the server clock offset.

Ordinary phone screen mirroring cannot transmit a separate scoreboard while hiding phone controls. Use a TV browser, a laptop on HDMI, or cast the laptop's paired display tab. A native Chromecast receiver/iOS second-screen integration is not included. Actual TV hardware, phone touch behavior, audio and wake lock still need a gym equipment test. Swipe pointer gestures were verified through browser input, not a physical phone.

Run `node --test model.test.cjs remote.test.mjs postgres.test.mjs touch.test.cjs` for countdown, persistence validation, pairing, read-only TV authorization, revision conflicts, retries, timer clock offset, and expiry/revocation checks. Syntax-check app.js, remote.js and worker/index.mjs before building.


## Netlify deployment

Netlify configuration lives in `netlify.toml`. Build output is `public/`, functions are in `netlify/functions/`, and the Postgres compatibility adapter is `server/postgres-db.mjs`. Runtime database configuration is supplied by Netlify; do not commit connection strings or `.netlify/` state. The production branch is `main` in the linked GitHub repository.

The test suite exercises the same session API against both SQLite and Netlify's local Postgres-compatible engine, including pairing, read-only displays, concurrent updates, safe retries, expiry and session termination. Migration files are additive and must not be edited after deployment. No scores from the old host are copied: open the new URL on both devices and start a new session.
