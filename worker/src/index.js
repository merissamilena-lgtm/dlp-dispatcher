const ALLOWED_ORIGINS = new Set([
  'https://merissamilena-lgtm.github.io',
]);

const PARKS = new Set(['4', '28']);
const UPSTREAM_BASE = 'https://queue-times.com/parks';

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD, OPTIONS' });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        ok: true,
        service: 'DLP Queue-Times proxy',
        parks: [4, 28],
      }, 200, origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {});
    }

    const match = url.pathname.match(/^\/parks\/(4|28)\/?$/);
    if (!match || !PARKS.has(match[1])) {
      return jsonResponse({ error: 'Unknown park' }, 404, origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {});
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return jsonResponse({ error: 'Origin not allowed' }, 403);
    }

    const parkId = match[1];
    const upstreamUrl = `${UPSTREAM_BASE}/${parkId}/queue_times.json`;

    try {
      const upstream = await fetch(upstreamUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DLP-Dispatcher/0.5 (+https://merissamilena-lgtm.github.io/dlp-dispatcher/)',
        },
        cf: {
          cacheEverything: true,
          cacheTtl: 120,
        },
      });

      if (!upstream.ok) {
        return jsonResponse({ error: `Queue-Times upstream returned ${upstream.status}` }, 502,
          origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {});
      }

      const data = await upstream.text();
      const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
        'X-DLP-Proxy': 'queue-times',
        ...(origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {}),
      };

      return new Response(request.method === 'HEAD' ? null : data, { status: 200, headers });
    } catch (error) {
      return jsonResponse({ error: 'Queue-Times upstream fetch failed' }, 502,
        origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {});
    }
  },
};
