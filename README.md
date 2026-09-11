# DLP Dispatcher v0.5

This build adds a real dual-source live-data path.

## Highlights
- ThemeParks.wiki remains the primary live source.
- Queue-Times now runs through a Cloudflare Worker proxy, so the browser can use it as a proper secondary cross-check instead of being blocked by CORS.
- Status disagreements between the feeds remain excluded from recommendations.
- Material wait-time disagreements are flagged and penalised.
- Queue-Times attribution is linked in the app footer.
- Live refreshes are de-duplicated so manual refresh, resume refresh and the five-minute timer cannot start overlapping fetches.
- All v0.4 freshness, OPEN-only gating, realistic dwell-time, booking deconfliction, snooze and park-hop logic is retained.

## Cloudflare Worker
The proxy lives in `worker/` and deploys as `dlp-queue-proxy`. It permits requests from the GitHub Pages origin and proxies Queue-Times park IDs 4 and 28.

## Deploy
The repository is connected to both GitHub Pages and Cloudflare Workers. Commits to `main` redeploy the app and the Worker automatically.
