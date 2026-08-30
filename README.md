# DLP Dispatcher v0.2

A mobile-first Disneyland Paris decision tool built around the 30 Oct to 2 Nov 2026 trip.

## What changed in v0.2

- Adds an automatic **TEST / LIVE** safety mode. LIVE requires a GPS fix within 5 km of Disneyland Paris and Preview must be off.
- GPS readings outside Disneyland Paris no longer wreck test routing. The app keeps using the selected test area instead.
- Adds attraction classes so transport, walkthroughs, play areas and side activities do not beat proper rides just because they report a 0 minute wait.
- Unknown attractions no longer receive a fake 25 minute historical baseline.
- Runs ThemeParks.wiki and Queue-Times.com together when both are reachable.
- Flags material queue disagreements and excludes attractions when the two feeds disagree on open/closed status.
- Flags aging and stale primary data.
- Expands the ChatGPT packet with session mode, location source, feed age, cross-feed disagreements, safe time to the next anchor, attraction class and recommendation reasons.
- Updates the service worker to prefer fresh app files and take over immediately after deployment.

## Core behaviour

- Pulls attraction status and waits every five minutes.
- Separates Standby and Single Rider where exposed.
- Scores the next move using current wait, known 2026 typical wait, experience class, walking estimate, user priority, weather mode and the next fixed booking.
- Rejects attractions that cannot finish and still reach the next fixed point by the configured safety buffer.
- Stores MUST / WANT / SKIP priorities and DONE marks locally on the device.
- Includes a preview clock for dry runs before the trip.

## Preloaded anchors

- Fri 30 Oct, 13:30: Agrabah Café
- Fri 30 Oct, 18:30: Walt's
- Sat 31 Oct, 12:30: PYM Kitchen
- Sat 31 Oct, 18:30: Silver Spur Steakhouse
- Sun 1 Nov, 13:00: Nordic Crowns Tavern, SOFT because it is not booked
- Sun 1 Nov, 18:30: Bistrot Chez Rémy
- Mon 2 Nov, 18:50: train from Marne-la-Vallée Chessy

## Safety margins

Defaults are 15 minutes early for restaurant bookings and 35 minutes early for the train. Walking speed defaults to 55 m/min with a 1.25 route multiplier.

## Hosting

Host this folder over HTTPS. GitHub Pages is suitable. There is no server-side code, API key or login.

When replacing an older version, upload all files in this folder to the repository root. The v0.2 service worker uses a new cache name and `skipWaiting()` / `clients.claim()` so an installed Home Screen app should update after GitHub Pages deploys and the app is reopened. If the old version is still visible, open the site in Safari once, refresh, then reopen the Home Screen app.

## Data and attribution

Primary live source: ThemeParks.wiki. Secondary cross-check and fallback: Queue-Times.com. Live data remains best-effort. The official Disneyland Paris app remains authoritative for operational changes, paid access and virtual queues.

## Still deliberately approximate

- Walking estimates use live entity coordinates when supplied, otherwise area centroids.
- Ride durations are approximate and conservative.
- Attraction classification is rule-based and will be tuned from dry runs.
- The engine does not buy Premier Access or join Disney virtual queues.
- Nordic Crowns Tavern only blocks time when "Block time for soft plans" is enabled.
