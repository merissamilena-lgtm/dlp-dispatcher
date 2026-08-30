# DLP Dispatcher v0.3

A mobile-first Disneyland Paris decision tool built around the 30 Oct to 2 Nov 2026 trip.

## What changed in v0.3

- Recommendations now **stay in the current park by default**. Cross-park recommendations only appear when **Consider the other park** is enabled.
- Park hops carry a substantial walking/time and scoring penalty, so a decent ride in the other park no longer beats a sensible nearby move by accident.
- Recommendation cards are actionable: tap the card/name to jump to the attraction in the live board, tap **DONE** to complete it, or **Not now** to hide it from recommendations for 30 minutes.
- DONE and Not now actions from recommendation cards have a brief **Undo** control.
- Thunder Mesa Riverboat Landing and similar experiences are classified as **Scenic ride**, below headline/standard rides but above walkthrough/transport filler.
- Disneyland Railroad stations are treated separately, with a compact station-status strip showing Main Street, Frontierland, Fantasyland and Discoveryland when those entries are present in the live feed.
- Live-board rows are richer: park, land, attraction class, current status/wait, 2026 average where known, Single Rider, feed confidence and update age.
- The live board sorts the current park first.
- The secondary-feed failure reason is included in the UI and ChatGPT packet, which makes browser/CORS failures diagnosable instead of merely saying "unavailable".
- ChatGPT packets now include current routing park, park-hopping policy and count of temporarily deferred attractions.

## Core behaviour

- Pulls ThemeParks.wiki live attraction status and waits every five minutes.
- Attempts Queue-Times.com as a secondary cross-check/fallback where the browser permits it.
- Separates Standby and Single Rider where exposed.
- Scores the next move using current wait, known 2026 average wait, attraction class, walking estimate, user priority, park-switch cost, weather mode and the next fixed booking.
- Rejects attractions that cannot finish and still reach the next fixed point by the configured safety buffer.
- Stores MUST / WANT / SKIP priorities, DONE marks, temporary Not now choices and settings locally on the device.
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

When replacing v0.2, upload all seven files in this folder to the repository root. The v0.3 service worker uses a fresh cache name and fresh asset query strings.

## Data and attribution

Primary live source: ThemeParks.wiki. Secondary cross-check and fallback: Queue-Times.com. Live data remains best-effort. The official Disneyland Paris app remains authoritative for operational changes, paid access and virtual queues.

## Still deliberately approximate

- Walking estimates use live entity coordinates where supplied, otherwise area centroids.
- Ride durations are approximate and conservative.
- The 2026 wait baselines are broad averages rather than hour-of-day predictions.
- Attraction classification remains rule-based and will continue to be tuned from dry runs.
- The engine does not buy Premier Access or join Disney virtual queues.
- Nordic Crowns Tavern only blocks time when "Block time for soft plans" is enabled.
