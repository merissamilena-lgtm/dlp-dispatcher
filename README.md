# DLP Dispatcher v0.1

A mobile-first Disneyland Paris decision tool built around the 30 Oct to 2 Nov 2026 trip.

## What it does

- Pulls live attraction status and waits from ThemeParks.wiki every five minutes.
- Falls back to Queue-Times.com if the primary live feed fails.
- Separates Standby and Single Rider when the source exposes both.
- Scores the next ride using current wait, 2026 typical wait, walking estimate, user priority, weather mode and the next fixed booking.
- Rejects any attraction that cannot finish and still reach the next booking by the configured safety buffer.
- Stores MUST / WANT / SKIP priorities and DONE marks in the browser on the device.
- Can use phone GPS when hosted in a secure browser context.
- Copies a compact status packet to paste into ChatGPT for a second opinion using fresh web checks.
- Includes a preview clock for testing the booking logic before the trip.

## Preloaded anchors

- Fri 30 Oct, 13:30: Agrabah Café
- Fri 30 Oct, 18:30: Walt's
- Sat 31 Oct, 12:30: PYM Kitchen
- Sat 31 Oct, 18:30: Silver Spur Steakhouse
- Sun 1 Nov, 13:00: Nordic Crowns Tavern, marked SOFT because it is not booked
- Sun 1 Nov, 18:30: Bistrot Chez Rémy
- Mon 2 Nov, 18:50: train from Marne-la-Vallée Chessy

## Safety margins

Defaults are 15 minutes early for restaurant bookings and 35 minutes early for the train. Walking speed defaults to 55 m/min with a 1.25 route multiplier to account for paths rather than straight-line distance.

## Running it

For full iPhone behaviour, including GPS and Add to Home Screen, host this folder over HTTPS. Any simple static host is enough. The app has no server-side code, API key or account login.

For a quick desktop test from the folder, run a small local HTTP server, for example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser.

Opening `index.html` directly may display the UI, but browsers can restrict live cross-origin requests, geolocation and service workers from local `file://` pages. HTTPS hosting is the intended trip setup.

## Data and attribution

Primary live source: ThemeParks.wiki. Fallback: Queue-Times.com. The footer keeps source attribution visible. Live data is best-effort and should be treated as a snapshot. The official Disneyland Paris app remains authoritative for operational changes, paid access and virtual queues.

## Deliberate v0.1 limitations

- Walking estimates use live entity coordinates when ThemeParks.wiki supplies them, otherwise area centroids.
- Ride durations are approximate and deliberately conservative.
- Historical comparison uses hardcoded 2026 Queue-Times averages for the major rides and a generic baseline for unknown attractions.
- The engine does not buy Premier Access or join Disney virtual queues.
- Nordic Crowns Tavern is a soft lunch placeholder at 13:00 and does not block rides unless "Block time for soft plans" is enabled.
