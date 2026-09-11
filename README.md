# DLP Dispatcher v0.6.1

This build adds TEST packet route-vs-legacy diagnostics to the precision-routing layer while preserving the v0.5.3 scoring and booking safety rules.

## Precision routing
- TEST-only feature flag. LIVE recommendations continue to fall back to the proven legacy model.
- Loads a locally hosted OpenStreetMap pedestrian graph generated for the Disneyland Paris resort.
- Pushchair profile excludes steps and explicitly private/no-foot routes.
- Uses curated/strong or candidate queue entrances where public map evidence supports them, otherwise falls back to ThemeParks.wiki attraction coordinates.
- Routes onward travel from attraction exit data where available, with safe POI fallback.
- Fixed-point restaurants use attraction-level/entrance-level coordinates instead of land centres where available.
- Continuous high-accuracy GPS tracking starts in-resort after Use my location; poor fixes are damped.

## Glanceable urgency
- Green SAFE, yellow GETTING TIGHT / TIGHT FIT, red MOVE NOW.
- The next-anchor card now reports direct walking time and remaining direct-route slack.
- Empty recommendation state becomes an explicit MOVE NOW instruction when the family needs to head to the anchor immediately.

## Safety
Precision routing is deliberately TEST-only until route comparisons are validated. The v0.5.3 hard-anchor residual-slack rule remains intact.


## v0.6.1 routing diagnostics
- TEST packets compare precision stroller-graph walking time with the previous legacy estimate for each top candidate.
- Reports attraction entrance and exit confidence/source, plus fixed-point entrance confidence.
- Reports graph snap distance for ride entrance, ride exit and fixed point so weak endpoint geometry is visible during validation.
- No scoring weights or hard-anchor safety thresholds changed.
