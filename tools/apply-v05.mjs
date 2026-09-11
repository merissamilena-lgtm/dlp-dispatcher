import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, text) {
  fs.writeFileSync(path, text);
}

function replaceRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Could not find expected ${label}`);
  return text.replace(from, to);
}

let app = read('app.js');
app = replaceRequired(
  app,
  "  const TPW_BASE = 'https://api.themeparks.wiki/v1';\n",
  "  const TPW_BASE = 'https://api.themeparks.wiki/v1';\n  const QT_PROXY_BASE = 'https://dlp-queue-proxy.rnspecfor.workers.dev';\n",
  'ThemeParks constant'
);
app = replaceRequired(
  app,
  "      const res = await fetch(`https://queue-times.com/parks/${p.id}/queue_times.json`, { cache:'no-store' });\n      if (!res.ok) throw new Error(`Queue-Times ${res.status}`);",
  "      const res = await fetch(`${QT_PROXY_BASE}/parks/${p.id}`, { cache:'no-store' });\n      if (!res.ok) throw new Error(`Queue-Times proxy ${res.status}`);",
  'Queue-Times fetch'
);
app = replaceRequired(
  app,
  "    if (/load failed|failed to fetch|cors|networkerror/i.test(message)) return 'Queue-Times browser cross-check blocked by browser/CORS';\n    return `Queue-Times: ${message}`;",
  "    if (/load failed|failed to fetch|networkerror/i.test(message)) return 'Queue-Times proxy unreachable';\n    return `Queue-Times proxy: ${message}`;",
  'Queue-Times error text'
);
app = replaceRequired(
  app,
  "  async function refreshLive() {\n    setStatus('loading','Connecting');\n",
  "  let refreshInFlight = null;\n\n  async function refreshLive() {\n    if (refreshInFlight) return refreshInFlight;\n    refreshInFlight = (async () => {\n    setStatus('loading','Connecting');\n",
  'refresh start'
);
app = replaceRequired(
  app,
  "    } finally {\n      $('#refreshBtn').disabled = false;\n    }\n  }\n\n  function enhanceRidesFromEntities()",
  "    } finally {\n      $('#refreshBtn').disabled = false;\n    }\n    })();\n    try {\n      return await refreshInFlight;\n    } finally {\n      refreshInFlight = null;\n    }\n  }\n\n  function enhanceRidesFromEntities()",
  'refresh end'
);
app = app.replaceAll('DLP DISPATCHER STATUS v0.4', 'DLP DISPATCHER STATUS v0.5');
app = app.replaceAll("toast('v0.4 status packet copied. Paste it into ChatGPT.')", "toast('v0.5 status packet copied. Paste it into ChatGPT.')");
write('app.js', app);

let index = read('index.html');
index = index.replaceAll('30 Oct to 2 Nov 2026 · v0.4', '30 Oct to 2 Nov 2026 · v0.5');
index = index.replaceAll('styles.css?v=0.4.0', 'styles.css?v=0.5.0');
index = index.replaceAll('app.js?v=0.4.0', 'app.js?v=0.5.0');
index = replaceRequired(
  index,
  'Primary live data: <a href="https://themeparks.wiki/" target="_blank" rel="noreferrer">ThemeParks.wiki</a>. Queue-Times is used as a secondary cross-check only when the browser permits it.',
  'Primary live data: <a href="https://themeparks.wiki/" target="_blank" rel="noreferrer">ThemeParks.wiki</a>. Secondary cross-check: <a href="https://queue-times.com/" target="_blank" rel="noreferrer">Powered by Queue-Times.com</a> via the DLP Dispatcher proxy.',
  'footer attribution'
);
write('index.html', index);

let sw = read('sw.js');
sw = sw.replaceAll('dlp-dispatcher-v0.4.0', 'dlp-dispatcher-v0.5.0');
sw = sw.replaceAll('styles.css?v=0.4.0', 'styles.css?v=0.5.0');
sw = sw.replaceAll('app.js?v=0.4.0', 'app.js?v=0.5.0');
write('sw.js', sw);

write('README.md', `# DLP Dispatcher v0.5

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
The proxy lives in \`worker/\` and deploys as \`dlp-queue-proxy\`. It permits requests from the GitHub Pages origin and proxies Queue-Times park IDs 4 and 28.

## Deploy
The repository is connected to both GitHub Pages and Cloudflare Workers. Commits to \`main\` redeploy the app and the Worker automatically.
`);

console.log('v0.5 patch applied');
