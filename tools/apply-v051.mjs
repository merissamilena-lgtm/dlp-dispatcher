import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text); }
function replaceRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Could not find expected ${label}`);
  return text.replace(from, to);
}

let app = read('app.js');

app = replaceRequired(
  app,
  "  async function copyPacket() {\n",
  `  function feedDisagreementSummary(d) {\n    if (!d) return 'unknown disagreement';\n    if (d.kind === 'status') return \`${'${d.name}'}: status, ThemeParks.wiki ${'${d.primary}'} vs Queue-Times.com ${'${d.secondary}'}\`;\n    if (d.kind === 'wait') return \`${'${d.name}'}: wait, ThemeParks.wiki ${'${d.primary}'}m vs Queue-Times.com ${'${d.secondary}'}m (${ '${d.diff}' }m difference)\`;\n    return \`${'${d.name || \'unknown attraction\'}'}: ${'${d.kind || \'unknown\'}'} disagreement\`;\n  }\n\n  async function copyPacket() {\n`,
  'feed disagreement formatter'
);

app = replaceRequired(
  app,
  "      `Secondary cross-check: ${state.secondarySource || 'unavailable'}; material disagreements ${state.feedDisagreements.length}${state.secondaryError?`; diagnostic ${state.secondaryError}`:''}`,\n      commitmentLine,",
  "      `Secondary cross-check: ${state.secondarySource || 'unavailable'}; material disagreements ${state.feedDisagreements.length}${state.secondaryError?`; diagnostic ${state.secondaryError}`:''}`,\n      `Feed disagreement detail: ${state.feedDisagreements.length ? state.feedDisagreements.map(feedDisagreementSummary).join(' | ') : 'none'}`,\n      commitmentLine,",
  'packet disagreement line'
);

app = app.replaceAll('DLP DISPATCHER STATUS v0.5', 'DLP DISPATCHER STATUS v0.5.1');
app = app.replaceAll("toast('v0.5 status packet copied. Paste it into ChatGPT.')", "toast('v0.5.1 status packet copied. Paste it into ChatGPT.')");
write('app.js', app);

let index = read('index.html');
index = index.replaceAll('30 Oct to 2 Nov 2026 · v0.5', '30 Oct to 2 Nov 2026 · v0.5.1');
index = index.replaceAll('styles.css?v=0.5.0', 'styles.css?v=0.5.1');
index = index.replaceAll('app.js?v=0.5.0', 'app.js?v=0.5.1');
write('index.html', index);

let sw = read('sw.js');
sw = sw.replaceAll('dlp-dispatcher-v0.5.0', 'dlp-dispatcher-v0.5.1');
sw = sw.replaceAll('styles.css?v=0.5.0', 'styles.css?v=0.5.1');
sw = sw.replaceAll('app.js?v=0.5.0', 'app.js?v=0.5.1');
write('sw.js', sw);

let readme = read('README.md');
readme = readme.replace(/^# DLP Dispatcher v0\.5$/m, '# DLP Dispatcher v0.5.1');
if (!readme.includes('Feed-disagreement details are now included')) {
  readme = readme.replace('## Highlights\n', '## Highlights\n- Feed-disagreement details are now included in the ChatGPT status packet, with attraction name and both source values.\n');
}
write('README.md', readme);

console.log('v0.5.1 patch applied');
