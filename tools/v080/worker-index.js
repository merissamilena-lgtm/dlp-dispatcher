import { DurableObject } from 'cloudflare:workers';

const ALLOWED_ORIGINS = new Set([
  'https://merissamilena-lgtm.github.io',
]);
const PARKS = new Set(['4', '28']);
const UPSTREAM_BASE = 'https://queue-times.com/parks';
const VAPID_SUBJECT = 'https://merissamilena-lgtm.github.io/dlp-dispatcher/';
const TOKEN_RE = /^[A-Za-z0-9_-]{20,80}$/;
const DEVICE_RE = /^[A-Za-z0-9_-]{8,80}$/;
const encoder = new TextEncoder();

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,HEAD,PUT,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}
function jsonResponse(body, status = 200, headers = {}) {
  return new Response(body == null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}
function withCors(response, origin) {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return response;
  const headers = new Headers(response.headers);
  for (const [k,v] of Object.entries(corsHeaders(origin))) headers.set(k,v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function hub(env) {
  const id = env.TRIP_HUB.idFromName('family-trip-hub');
  return env.TRIP_HUB.get(id);
}
function base64urlBytes(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function base64urlText(text) { return base64urlBytes(encoder.encode(text)); }
function validHttpsEndpoint(value) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
function parseDerLength(bytes, offset) {
  let len = bytes[offset++];
  if ((len & 0x80) === 0) return { len, offset };
  const count = len & 0x7f;
  len = 0;
  for (let i=0;i<count;i++) len = (len << 8) | bytes[offset++];
  return { len, offset };
}
function joseEcdsaSignature(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length === 64) return bytes;
  let i = 0;
  if (bytes[i++] !== 0x30) throw new Error('Unexpected ECDSA signature format');
  const seq = parseDerLength(bytes, i); i = seq.offset;
  if (bytes[i++] !== 0x02) throw new Error('Missing ECDSA r value');
  const rInfo = parseDerLength(bytes, i); i = rInfo.offset;
  let r = bytes.slice(i, i + rInfo.len); i += rInfo.len;
  if (bytes[i++] !== 0x02) throw new Error('Missing ECDSA s value');
  const sInfo = parseDerLength(bytes, i); i = sInfo.offset;
  let s = bytes.slice(i, i + sInfo.len);
  while (r.length > 32 && r[0] === 0) r = r.slice(1);
  while (s.length > 32 && s[0] === 0) s = s.slice(1);
  if (r.length > 32 || s.length > 32) throw new Error('Invalid ECDSA signature size');
  const out = new Uint8Array(64);
  out.set(r, 32-r.length);
  out.set(s, 64-s.length);
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return jsonResponse({
        ok: true,
        service: 'DLP Dispatcher Cloudflare service',
        version: '0.8.0',
        parks: [4, 28],
        features: ['queue-proxy','trip-sync','web-push'],
      }, 200, origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {});
    }

    if (url.pathname.startsWith('/sync/') || url.pathname.startsWith('/push/')) {
      if (origin && !ALLOWED_ORIGINS.has(origin)) return jsonResponse({ error: 'Origin not allowed' }, 403);
      if (!['GET','HEAD','PUT','POST','DELETE'].includes(request.method)) return jsonResponse({ error: 'Method not allowed' }, 405);
      const response = await hub(env).fetch(request);
      return withCors(response, origin);
    }

    if (!['GET', 'HEAD'].includes(request.method)) {
      return jsonResponse({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD, OPTIONS' });
    }
    const match = url.pathname.match(/^\/parks\/(4|28)\/?$/);
    if (!match || !PARKS.has(match[1])) {
      return jsonResponse({ error: 'Unknown route' }, 404, origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {});
    }
    if (origin && !ALLOWED_ORIGINS.has(origin)) return jsonResponse({ error: 'Origin not allowed' }, 403);

    const parkId = match[1];
    const upstreamUrl = `${UPSTREAM_BASE}/${parkId}/queue_times.json`;
    try {
      const upstream = await fetch(upstreamUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'DLP-Dispatcher/0.8 (+https://merissamilena-lgtm.github.io/dlp-dispatcher/)',
        },
        cf: { cacheEverything: true, cacheTtl: 120 },
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
    } catch {
      return jsonResponse({ error: 'Queue-Times upstream fetch failed' }, 502,
        origin && ALLOWED_ORIGINS.has(origin) ? corsHeaders(origin) : {});
    }
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(hub(env).fetch('https://hub.internal/tick', { method: 'POST' }));
  },
};

export class TripHub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/push/vapid' && request.method === 'GET') {
      const vapid = await this.getVapid();
      return jsonResponse({ publicKey: vapid.publicKey });
    }
    if (path === '/tick' && request.method === 'POST') {
      await this.tick();
      return jsonResponse({ ok: true });
    }

    let match = path.match(/^\/sync\/([A-Za-z0-9_-]{20,80})\/?$/);
    if (match) return this.handleSync(request, match[1]);

    match = path.match(/^\/push\/register\/([A-Za-z0-9_-]{20,80})\/?$/);
    if (match && request.method === 'POST') return this.registerPush(request, match[1]);

    match = path.match(/^\/push\/unregister\/([A-Za-z0-9_-]{20,80})\/([A-Za-z0-9_-]{8,80})\/?$/);
    if (match && request.method === 'POST') return this.unregisterPush(match[1], match[2]);

    match = path.match(/^\/push\/pending\/([A-Za-z0-9_-]{20,80})\/([A-Za-z0-9_-]{8,80})\/?$/);
    if (match && request.method === 'GET') return this.takePending(match[1], match[2]);

    match = path.match(/^\/push\/test\/([A-Za-z0-9_-]{20,80})\/([A-Za-z0-9_-]{8,80})\/?$/);
    if (match && request.method === 'POST') return this.testPush(match[1], match[2]);

    return jsonResponse({ error: 'Unknown cloud route' }, 404);
  }

  async handleSync(request, token) {
    if (!TOKEN_RE.test(token)) return jsonResponse({ error: 'Invalid sync key' }, 400);
    const key = `trip:${token}`;
    const current = await this.ctx.storage.get(key) || { revision: 0, updatedAt: 0, data: null, alerts: [] };
    if (request.method === 'GET' || request.method === 'HEAD') {
      const body = { revision: current.revision, updatedAt: current.updatedAt, data: current.data };
      return request.method === 'HEAD' ? new Response(null, { status: 200 }) : jsonResponse(body);
    }
    if (request.method !== 'PUT') return jsonResponse({ error: 'Method not allowed' }, 405);

    let body;
    try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
    const baseRevision = Number(body?.baseRevision || 0);
    if (baseRevision !== Number(current.revision || 0)) {
      return jsonResponse({ error: 'revision_conflict', revision: current.revision, updatedAt: current.updatedAt, data: current.data }, 409);
    }
    if (!body || typeof body.data !== 'object' || body.data == null) return jsonResponse({ error: 'Missing state data' }, 400);
    if (JSON.stringify(body.data).length > 250000) return jsonResponse({ error: 'State too large' }, 413);
    const alerts = Array.isArray(body.alerts) ? body.alerts.filter(a => a && a.id && a.name && a.targetAt).slice(0,50) : [];
    const record = {
      revision: baseRevision + 1,
      updatedAt: Number(body.updatedAt) || Date.now(),
      data: body.data,
      alerts,
    };
    await this.ctx.storage.put(key, record);
    return jsonResponse({ revision: record.revision, updatedAt: record.updatedAt });
  }

  async registerPush(request, token) {
    if (!TOKEN_RE.test(token)) return jsonResponse({ error: 'Invalid sync key' }, 400);
    let body;
    try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
    const deviceId = String(body?.deviceId || '');
    const subscription = body?.subscription;
    if (!DEVICE_RE.test(deviceId)) return jsonResponse({ error: 'Invalid device id' }, 400);
    if (!subscription || !validHttpsEndpoint(subscription.endpoint)) return jsonResponse({ error: 'Invalid push subscription' }, 400);
    const key = `subs:${token}`;
    const subscriptions = await this.ctx.storage.get(key) || {};
    subscriptions[deviceId] = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime || null,
      keys: subscription.keys || {},
      updatedAt: Date.now(),
    };
    await this.ctx.storage.put(key, subscriptions);
    return jsonResponse({ ok: true, deviceId });
  }

  async unregisterPush(token, deviceId) {
    const key = `subs:${token}`;
    const subscriptions = await this.ctx.storage.get(key) || {};
    delete subscriptions[deviceId];
    await this.ctx.storage.put(key, subscriptions);
    await this.ctx.storage.delete(`pending:${token}:${deviceId}`);
    return jsonResponse({ ok: true });
  }

  async takePending(token, deviceId) {
    const key = `pending:${token}:${deviceId}`;
    const queue = await this.ctx.storage.get(key) || [];
    if (!queue.length) return new Response(null, { status: 204 });
    const [next, ...rest] = queue;
    if (rest.length) await this.ctx.storage.put(key, rest);
    else await this.ctx.storage.delete(key);
    return jsonResponse(next);
  }

  async queuePending(token, deviceId, notification) {
    const key = `pending:${token}:${deviceId}`;
    const queue = await this.ctx.storage.get(key) || [];
    queue.push(notification);
    await this.ctx.storage.put(key, queue.slice(-5));
  }

  async testPush(token, deviceId) {
    const subscriptions = await this.ctx.storage.get(`subs:${token}`) || {};
    const subscription = subscriptions[deviceId];
    if (!subscription) return jsonResponse({ error: 'This device is not registered for alerts' }, 404);
    const notification = {
      title: '🏰 DLP Dispatcher test alert',
      body: 'Push alerts are connected. Timed commitments can now nudge you while the app is asleep.',
      tag: 'dlp-test',
      url: './',
      createdAt: Date.now(),
    };
    await this.queuePending(token, deviceId, notification);
    const result = await this.sendEmptyPush(subscription);
    if (result.gone) {
      delete subscriptions[deviceId];
      await this.ctx.storage.put(`subs:${token}`, subscriptions);
    }
    return jsonResponse({ ok: result.ok, status: result.status }, result.ok ? 200 : 502);
  }

  stageFor(remaining, sent) {
    if (remaining < -10) return null;
    if (remaining <= 5 && !sent.includes('5')) return '5';
    if (remaining <= 15 && !sent.includes('15')) return '15';
    if (remaining <= 30 && !sent.includes('30')) return '30';
    return null;
  }

  sentForStage(stage) {
    if (stage === '5') return ['30','15','5'];
    if (stage === '15') return ['30','15'];
    return ['30'];
  }

  notificationFor(alert, stage) {
    const target = alert.targetLabel ? `Target arrival ${alert.targetLabel}.` : 'A protected timed point is getting close.';
    if (stage === '30') return {
      title: `⏰ ${alert.name} in about 30 min`,
      body: `${target} Keep it in mind; open Dispatcher for the current route.`,
      tag: `dlp-${alert.id}`,
      url: './',
      createdAt: Date.now(),
    };
    if (stage === '15') return {
      title: `⚠️ ${alert.name} is getting close`,
      body: `${target} Open Dispatcher to check live walking time before joining anything else.`,
      tag: `dlp-${alert.id}`,
      url: './',
      createdAt: Date.now(),
    };
    return {
      title: `⛔ Check ${alert.name} now`,
      body: `${target} Open Dispatcher for the GPS-aware route.`,
      tag: `dlp-${alert.id}`,
      url: './',
      createdAt: Date.now(),
    };
  }

  async tick() {
    const now = Date.now();
    const trips = await this.ctx.storage.list({ prefix: 'trip:' });
    for (const [key, trip] of trips) {
      const token = key.slice(5);
      const subscriptions = await this.ctx.storage.get(`subs:${token}`) || {};
      const deviceIds = Object.keys(subscriptions);
      if (!deviceIds.length) continue;
      let subsChanged = false;

      for (const alert of trip.alerts || []) {
        const targetMs = Date.parse(alert.targetAt);
        if (!Number.isFinite(targetMs)) continue;
        const remaining = (targetMs - now) / 60000;
        const sentKey = `sent:${token}:${base64urlText(`${alert.id}|${alert.targetAt}`)}`;
        const sent = await this.ctx.storage.get(sentKey) || [];
        const stage = this.stageFor(remaining, sent);
        if (!stage) continue;
        const notification = this.notificationFor(alert, stage);
        let attempted = false;

        for (const deviceId of deviceIds) {
          const subscription = subscriptions[deviceId];
          if (!subscription) continue;
          attempted = true;
          await this.queuePending(token, deviceId, notification);
          const result = await this.sendEmptyPush(subscription);
          if (result.gone) {
            delete subscriptions[deviceId];
            subsChanged = true;
          }
        }
        if (attempted) await this.ctx.storage.put(sentKey, this.sentForStage(stage));
      }
      if (subsChanged) await this.ctx.storage.put(`subs:${token}`, subscriptions);
    }
  }

  async getVapid() {
    let saved = await this.ctx.storage.get('vapid:keypair');
    if (saved?.privateJwk && saved?.publicKey) return saved;
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign','verify']);
    const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
    const rawPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
    saved = { privateJwk, publicJwk, publicKey: base64urlBytes(rawPublic) };
    await this.ctx.storage.put('vapid:keypair', saved);
    return saved;
  }

  async vapidAuthorization(endpoint) {
    const vapid = await this.getVapid();
    const privateKey = await crypto.subtle.importKey(
      'jwk', vapid.privateJwk,
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
    const audience = new URL(endpoint).origin;
    const header = base64urlText(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
    const payload = base64urlText(JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now()/1000) + 12*60*60,
      sub: VAPID_SUBJECT,
    }));
    const unsigned = `${header}.${payload}`;
    const rawSignature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, encoder.encode(unsigned));
    const signature = base64urlBytes(joseEcdsaSignature(new Uint8Array(rawSignature)));
    return { authorization: `vapid t=${unsigned}.${signature}, k=${vapid.publicKey}` };
  }

  async sendEmptyPush(subscription) {
    try {
      const auth = await this.vapidAuthorization(subscription.endpoint);
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'TTL': '120',
          'Urgency': 'high',
          'Authorization': auth.authorization,
        },
      });
      return { ok: response.ok, status: response.status, gone: response.status === 404 || response.status === 410 };
    } catch {
      return { ok: false, status: 0, gone: false };
    }
  }
}
