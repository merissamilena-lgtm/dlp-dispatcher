# DLP Dispatcher v0.8.1

Phone-first Disneyland Paris trip dispatcher for 30 Oct to 2 Nov 2026. It combines live waits, realistic attraction time, stroller-friendly walking, priorities and protected timed commitments so the family gets a useful next move without optimising the fun out of the day.

## v0.8.1 polish pass
- Main **Now** view stays operational: next timed point, top three recommendations, controls and schedule.
- Full live attraction catalogue moves to a separate **Rides** view.
- Ride cards can flip to a plain-English description with ride type, intensity, useful motion/theme flags and approximate experience time.
- Ride browser gets an explicit **Clear** search control.
- iPhone time controls get a stricter intrinsic-width override while retaining the normal iOS time picker.
- The #1 recommendation inherits yellow **GETTING TIGHT** or red **MOVE NOW** emphasis from the protected timed point.

## Rider Switch
Rider Switch is selected per attraction by the user. When enabled, the timing model adds a second ride experience plus a five-minute handover allowance, but does not invent a second standby queue. This is deliberately a family timing allowance rather than an eligibility claim.

## Timed commitments
- Premier Access One windows use the end of the entered Disney window as the deadline, with a five-minute arrival buffer.
- Reserved viewing uses a 20-minute arrival margin.
- Other hard timed items use a 10-minute margin.
- Restaurants and train commitments retain their configured buffers.
- The existing five-minute hard-anchor residual safety rule remains unchanged.

## Cloud sync
The app remains offline-first in local storage. A user can optionally create a long random private sync key and link Safari plus the installed Home Screen app to the same Cloudflare Durable Object state. Synced state includes priorities, DONE marks, snoozes, Rider Switch selections, dynamic timed items and trip settings. GPS is never synced.

Sync uses monotonically increasing revisions so an older browser copy cannot silently overwrite newer cloud state. The sync key is a bearer secret generated in the browser and is not stored in the public repository.

## Push alerts
The installed Home Screen PWA can opt in to standards-based Web Push. Cloudflare checks protected timed targets once per minute and sends conservative background nudges at roughly 30, 15 and 5 minutes before the buffered target. Background alerts do not claim to know current GPS position; opening Dispatcher restores the normal GPS-aware walking calculation.

Push subscriptions and the VAPID private key are stored in Cloudflare Durable Object storage, not in the public repository.

## Precision routing
- TEST-only feature flag. LIVE recommendations continue to fall back to the proven legacy model.
- Uses the local stroller/step-free OpenStreetMap graph where available.
- Curated or candidate attraction entrances are used where public evidence supports them; safe attraction-POI fallbacks remain.
- The scoring weights and hard-anchor safety thresholds are unchanged from the validated engine.

## Live data
ThemeParks.wiki remains the primary live feed. Queue-Times.com is used as a secondary cross-check through the Cloudflare Worker. Material status conflicts are excluded and large wait disagreements are penalised rather than silently trusted.
