import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const replaceExact=(s,bad,good,label)=>{if(!s.includes(bad))throw new Error(`Missing ${label}`);return s.split(bad).join(good);};
const insertAfter=(s,anchor,addition,label)=>replaceExact(s,anchor,anchor+addition,label);

let app=read('app.js'),html=read('index.html'),styles=read('styles.css'),sw=read('sw.js'),readme=read('README.md');

app=insertAfter(app,
`    syncBusy: false,\n`,
`    cloudBackendReady: false,\n    cloudBackendChecked: false,\n`,
'cloud backend state');

app=insertAfter(app,
`  function syncKeyPreview(token){return token&&token.length>12?\`${'${token.slice(0,8)}'}…${'${token.slice(-5)}'}\`:token||'';}\n`,
`  async function probeCloudBackend(){\n    try{\n      const response=await fetch(\`${'${QT_PROXY_BASE}'}/health\`,{cache:'no-store'});\n      const body=response.ok?await response.json():null;\n      const features=Array.isArray(body?.features)?body.features:[];\n      state.cloudBackendReady=!!response.ok&&features.includes('trip-sync')&&features.includes('web-push');\n    }catch{state.cloudBackendReady=false;}\n    state.cloudBackendChecked=true;\n    renderSyncStatus();\n    return state.cloudBackendReady;\n  }\n`,
'cloud backend probe');

app=replaceExact(app,
`    if(!status)return;\n    const linked=!!state.sync.token;\n`,
`    if(!status)return;\n    const linkBtn=$('#linkSyncBtn'),linkInput=$('#syncKeyInput');\n    if(state.cloudBackendChecked&&!state.cloudBackendReady){\n      status.className='sync-status warn';\n      status.textContent='Cloud sync code is ready, but the Cloudflare backend upgrade still needs its one-time deployment.';\n      if(create){create.hidden=false;create.disabled=true;}if(copy)copy.hidden=true;if(unlink){unlink.hidden=!state.sync.token;unlink.disabled=false;}\n      if(linkBtn)linkBtn.disabled=true;if(linkInput)linkInput.disabled=true;\n      renderAlertStatus();return;\n    }\n    if(create)create.disabled=false;if(linkBtn)linkBtn.disabled=false;if(linkInput)linkInput.disabled=false;\n    const linked=!!state.sync.token;\n`,
'render sync backend guard');

app=replaceExact(app,
`    const permission=typeof Notification==='undefined'?'unsupported':Notification.permission;\n`,
`    if(state.cloudBackendChecked&&!state.cloudBackendReady){status.textContent='Trip alerts are staged, but the Cloudflare push backend is not active yet.';if(enable){enable.textContent='Enable trip alerts';enable.disabled=true;}if(test)test.hidden=true;return;}\n    const permission=typeof Notification==='undefined'?'unsupported':Notification.permission;\n`,
'render alert backend guard');

app=replaceExact(app,
`  async function createCloudSync(){\n    ensureSyncToken();\n`,
`  async function createCloudSync(){\n    if(!state.cloudBackendReady)return toast('Cloud sync backend activation is still pending.');\n    ensureSyncToken();\n`,
'create sync guard');
app=replaceExact(app,
`  async function linkCloudSync(){\n    const input=$('#syncKeyInput'),token=(input?.value||'').trim();\n`,
`  async function linkCloudSync(){\n    if(!state.cloudBackendReady)return toast('Cloud sync backend activation is still pending.');\n    const input=$('#syncKeyInput'),token=(input?.value||'').trim();\n`,
'link sync guard');
app=replaceExact(app,
`  async function enableTripAlerts(){\n    if(!standalonePwa())return toast('Open the installed Home Screen app to enable iPhone push alerts.');\n`,
`  async function enableTripAlerts(){\n    if(!state.cloudBackendReady)return toast('Trip-alert backend activation is still pending.');\n    if(!standalonePwa())return toast('Open the installed Home Screen app to enable iPhone push alerts.');\n`,
'alert enable guard');
app=replaceExact(app,
`  async function testTripAlert(){\n    if(!state.sync.token||!state.sync.deviceId)return toast('Enable trip alerts first.');\n`,
`  async function testTripAlert(){\n    if(!state.cloudBackendReady)return toast('Trip-alert backend activation is still pending.');\n    if(!state.sync.token||!state.sync.deviceId)return toast('Enable trip alerts first.');\n`,
'test alert guard');

app=replaceExact(app,
`  function startCloudSyncLoop(){\n    renderSyncStatus();\n    if(state.sync.token){cloudPull().then(result=>{if(result?.needsPush)scheduleCloudPush();});}\n    setInterval(()=>{if(state.sync.token&&document.visibilityState==='visible')cloudPull().then(result=>{if(result?.needsPush)scheduleCloudPush();});},CLOUD_SYNC_POLL_MS);\n  }\n`,
`  async function startCloudSyncLoop(){\n    renderSyncStatus();\n    await probeCloudBackend();\n    if(state.cloudBackendReady&&state.sync.token){cloudPull().then(result=>{if(result?.needsPush)scheduleCloudPush();});}\n    setInterval(()=>{if(state.cloudBackendReady&&state.sync.token&&document.visibilityState==='visible')cloudPull().then(result=>{if(result?.needsPush)scheduleCloudPush();});},CLOUD_SYNC_POLL_MS);\n  }\n`,
'cloud sync loop capability probe');

if(!styles.includes('.view-tabs')) throw new Error('View tabs CSS anchor missing');
if(styles.includes('/* v0.8.2 sticky view tabs */')) throw new Error('Sticky view tabs already applied');
styles += `\n\n/* v0.8.2 sticky view tabs */\n.view-tabs{position:sticky;top:env(safe-area-inset-top);z-index:40;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 -4px 16px;padding:8px 4px;background:linear-gradient(180deg,rgba(9,11,18,.97),rgba(9,11,18,.90));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.06)}\n.view-tab{width:100%;padding:10px 14px;border-radius:999px;color:var(--muted);background:rgba(14,19,33,.94);box-shadow:0 6px 18px rgba(0,0,0,.18)}\n.view-tab.active{color:var(--text);border-color:var(--accent);background:rgba(122,162,255,.14);box-shadow:0 0 0 1px rgba(122,162,255,.10),0 6px 18px rgba(0,0,0,.18)}\n@media(max-width:520px){.view-tabs{margin-left:-6px;margin-right:-6px;padding-left:6px;padding-right:6px}}\n`;

app=app.replaceAll('v0.8.1','v0.8.2');
html=html.replaceAll('v0.8.1','v0.8.2').replaceAll('?v=0.8.1','?v=0.8.2');
sw=sw.replaceAll('v0.8.1','v0.8.2').replaceAll('?v=0.8.1','?v=0.8.2');
readme=readme.replaceAll('v0.8.1','v0.8.2');
if(!readme.includes('## Deployment note'))readme += `\n## Deployment note\nThe v0.8.2 PWA probes the existing Cloudflare Worker before enabling cloud sync or Web Push controls. If the Worker has not yet been upgraded with the Durable Object / push build, those controls stay safely disabled while all local/offline Dispatcher features continue to work.\n`;
if(!readme.includes('## Sticky navigation'))readme += `\n## Sticky navigation\nThe Now / Rides switcher stays pinned to the top of the viewport while scrolling, so either view is one tap away even deep in the ride list.\n`;
write('app.js',app);write('index.html',html);write('styles.css',styles);write('sw.js',sw);write('README.md',readme);
console.log('Applied DLP Dispatcher v0.8.2 cloud guard + sticky view tabs.');
