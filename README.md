# DLP Dispatcher v0.4

This build folds in the v0.3 shakedown findings.

## Highlights
- Cleaner live-board cards: wait, park, land and attraction type are compact bubbles; source/freshness is tiny text at the bottom.
- Static header to stop iPhone overlap while scrolling.
- Preview control moved near the top.
- PhilharMagic is Show / cinema.
- Frontierland Playground and Pirates' Beach are Play / time filler.
- Category-specific experience time: play areas 25m, shows 15m, walkthroughs 12m, scenic rides 15m, transport 20m, plus known ride durations.
- Booking feasibility is walk + queue + realistic experience + onward walk + booking buffer.
- Recommendations require explicit OPERATING status and attraction data no more than 30 minutes old. Unknown/stale records stay visible but are excluded from recommendations.
- 0m never means open by itself.
- Railroad station strip retained and stale-aware.
- Not now shows Snoozed · Xm in the list with Unsnooze.
- ChatGPT packets include snoozed names/time remaining, experience time and per-attraction freshness.
- Park-hop mode explains when the other park was checked but no hop is worth it.
- Auto-refresh every five minutes plus refresh on app resume when last fetch is over one minute old.
- Queue-Times browser/CORS failures are described clearly instead of just Load failed.
- ThemeParks.wiki land hierarchy is used when available for better location labels.

## Deploy
Upload all seven files to the root of the existing GitHub repository and commit directly to `main`. The v0.4 service worker uses a fresh cache and `?v=0.4.0` asset URLs.
