# DLP Queue-Times proxy

Small Cloudflare Worker used by DLP Dispatcher to fetch Queue-Times server-side and return it to the GitHub Pages app with browser-safe CORS headers.

## Routes

- `/health` service health check
- `/parks/4` Disneyland Park
- `/parks/28` Disney Adventure World

The Worker is deliberately not an open proxy. It only accepts the two Disneyland Paris park IDs and only grants browser CORS access to the production DLP Dispatcher origin.

## Cloudflare setup

Connect this GitHub repository to a Worker named `dlp-queue-proxy` and set the Worker root directory to `worker`.

Deploy command: `npx wrangler deploy`
