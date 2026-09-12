import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const mustReplace=(source,from,to,label)=>{
  if(!source.includes(from))throw new Error(`Missing patch anchor: ${label}`);
  return source.replace(from,to);
};
const mustInsertAfter=(source,anchor,addition,label)=>mustReplace(source,anchor,anchor+addition,label);

let app=read('app.js');
let styles=read('styles.css');

// Constants and the human-readable ride guide catalogue.
app=mustInsertAfter(app,
  "  const DYNAMIC_ITEM_BUFFERS = { premier: 5, show: 20, other: 10 };\n",
  "  const RIDER_SWITCH_HANDOVER_MIN = 5;\n  const CLOUD_SYNC_POLL_MS = 15 * 1000;\n  const SYNC_META_KEY = 'dlpSyncMeta';\n  const SYNC_TOKEN_KEY = 'dlpSyncToken';\n  const PUSH_DEVICE_KEY = 'dlpPushDeviceId';\n  const SYNC_TOKEN_RE = /^d1p_[A-Za-z0-9_-]{20,64}$/;\n\n",
  'v0.8 constants');

const guideBlock=`
  const RIDE_GUIDES = [
    { p:'big thunder', type:'Mine-train roller coaster', intensity:'Thrill', summary:'A fast runaway mine-train coaster around and through Big Thunder Mountain.', flags:['Fast','Drops','Dark tunnels','Height restriction'] },
    { p:'phantom manor', type:'Haunted dark ride', intensity:'Moderate', summary:'A slow-moving haunted-house ride through the spooky story of Thunder Mesa.', flags:['Darkness','Spooky scenes','Mostly seated'] },
    { p:'thunder mesa riverboat', type:'Scenic riverboat', intensity:'Gentle', summary:'A relaxed outdoor paddle-steamer cruise around Big Thunder Mountain.', flags:['Gentle','Outdoor','Seated'] },
    { p:'indiana jones', type:'Outdoor roller coaster', intensity:'Thrill', summary:'A compact, fast coaster through temple ruins with an inversion.', flags:['Fast','Inversion','Drops','Height restriction'] },
    { p:'pirates of the caribbean', type:'Boat dark ride', intensity:'Moderate', summary:'An indoor boat journey through large pirate sets, music and battle scenes.', flags:['Darkness','Small drops','Water ride','Seated'] },
    { p:'peter pan', type:'Suspended dark ride', intensity:'Gentle', summary:'Board a flying pirate ship and soar above scenes from Peter Pan.', flags:['Darkness','Elevated ride vehicle','Family ride'] },
    { p:'pinocchio', type:'Classic dark ride', intensity:'Gentle', summary:'A seated storybook ride through scenes from Pinocchio.', flags:['Darkness','Some scary imagery','Family ride'] },
    { p:'blanche-neige', type:'Classic dark ride', intensity:'Gentle', summary:'A seated Snow White story ride with the Evil Queen and darker forest scenes.', flags:['Darkness','Scary imagery','Family ride'] },
    { p:'snow white', type:'Classic dark ride', intensity:'Gentle', summary:'A seated Snow White story ride with the Evil Queen and darker forest scenes.', flags:['Darkness','Scary imagery','Family ride'] },
    { p:'small world', type:'Indoor boat ride', intensity:'Gentle', summary:'A long, gentle boat ride through colourful musical scenes from around the world.', flags:['Very gentle','Music','Seated','Good breather'] },
    { p:'dumbo', type:'Flying spinner', intensity:'Gentle', summary:'Dumbo vehicles circle in the air while you control how high you fly.', flags:['Spinning/circling','Outdoor','Height control'] },
    { p:'tea cups', type:'Spinning ride', intensity:'Gentle to spinny', summary:'Classic teacups. The whole platform rotates and you can spin your own cup as much as you dare.', flags:['Very spinny if you choose','Outdoor'] },
    { p:'carrousel', type:'Carousel', intensity:'Gentle', summary:'Traditional horse carousel in Fantasyland.', flags:['Gentle','Circling','Outdoor'] },
    { p:'casey jr', type:'Family coaster / train', intensity:'Gentle', summary:'A small outdoor train ride with mild coaster-like hills around Storybook Land.', flags:['Small hills','Outdoor','Family ride'] },
    { p:'pays des contes', type:'Scenic boat ride', intensity:'Gentle', summary:'Small boats glide past miniature scenes from Disney fairy tales.', flags:['Gentle','Outdoor','Seated'] },
    { p:'philharmagic', type:'4D cinema show', intensity:'Gentle', summary:'A seated 3D musical film with simple 4D theatre effects.', flags:['3D glasses','Loud moments','Indoor','Seated'] },
    { p:'hyperspace mountain', type:'Indoor roller coaster', intensity:'Thrill', summary:'A fast Star Wars coaster in near-darkness with launches, inversions and strong forces.', flags:['Fast','Darkness','Inversions','Height restriction'] },
    { p:'buzz lightyear', type:'Interactive dark ride', intensity:'Gentle', summary:'Ride through Toy Story scenes and use laser cannons to shoot targets for points.', flags:['Darkness','Interactive','Vehicle rotates'] },
    { p:'star tours', type:'Motion simulator', intensity:'Moderate', summary:'A seated Star Wars flight simulator that moves sharply in sync with the screen.', flags:['Motion simulator','3D','Can cause motion sickness','Height restriction'] },
    { p:'orbitron', type:'Flying spinner', intensity:'Gentle to moderate', summary:'Rocket ships circle high above Discoveryland while you control altitude.', flags:['Spinning/circling','Elevated','Outdoor'] },
    { p:'autopia', type:'Drive-your-own car ride', intensity:'Gentle', summary:'Drive a petrol-powered car around a guided outdoor roadway.', flags:['Outdoor','You steer','Engine noise'] },
    { p:'tower of terror', type:'Drop tower dark ride', intensity:'Thrill', summary:'A Twilight Zone themed lift ride with repeated sudden vertical drops and launches.', flags:['Big drops','Darkness','Height restriction','Strong forces'] },
    { p:'flight force', type:'Indoor launched coaster', intensity:'Thrill', summary:'A fast Marvel coaster in darkness with a launch and inversions.', flags:['Fast','Launch','Darkness','Inversions','Height restriction'] },
    { p:'spider-man', type:'Interactive dark ride', intensity:'Moderate', summary:'A moving interactive ride where you fling virtual webs at Spider-Bots with your hands.', flags:['Interactive','Screens','Vehicle movement','Indoor'] },
    { p:'spiderman', type:'Interactive dark ride', intensity:'Moderate', summary:'A moving interactive ride where you fling virtual webs at Spider-Bots with your hands.', flags:['Interactive','Screens','Vehicle movement','Indoor'] },
    { p:'crush', type:'Spinning roller coaster', intensity:'Thrill', summary:'A Finding Nemo coaster where the turtle-shell vehicle spins freely through dark and outdoor sections.', flags:['Spinning','Fast','Darkness','Drops','Height restriction'] },
    { p:'ratatouille', type:'Trackless 3D dark ride', intensity:'Gentle to moderate', summary:'Trackless vehicles scurry through oversized Ratatouille scenes with large 3D screens.', flags:['3D','Screens','Some spinning','Indoor'] },
    { p:'rc racer', type:'Shuttle coaster', intensity:'Thrill', summary:'A giant RC car races back and forth up a U-shaped track, getting higher each swing.', flags:['Repeated drops','High points','Height restriction','Outdoor'] },
    { p:'toy soldiers', type:'Parachute drop ride', intensity:'Moderate', summary:'Seats rise high on a tower and descend in a series of parachute-style drops.', flags:['Height','Drops','Outdoor','Height restriction'] },
    { p:'slinky', type:'Spinning family ride', intensity:'Gentle', summary:'Slinky Dog circles a wavy track while the ride rotates around the centre.', flags:['Spinning/circling','Outdoor','Family ride'] },
    { p:'cars quatre roues', type:'Spinning car ride', intensity:'Gentle to spinny', summary:'Cars rotate around each other on a flat figure-eight style layout. Gentle overall, but definitely spinny.', flags:['Spinny','Outdoor','Family ride'] },
    { p:'cars road trip', type:'Scenic tram ride', intensity:'Gentle', summary:'A seated road-trip tram through Cars scenery with one large water-and-fire effects scene.', flags:['Seated','Loud effects','Water effects','Mostly gentle'] },
    { p:'tapis volants', type:'Flying spinner', intensity:'Gentle', summary:'Magic carpets circle in the air while riders control height and tilt.', flags:['Spinning/circling','Outdoor','Height control'] },
    { p:'frozen ever after', type:'Boat dark ride', intensity:'Gentle to moderate', summary:'A Frozen boat journey through Arendelle with a backwards section and a small drop.', flags:['Darkness','Backwards section','Small drop','Water ride'] },
    { p:'raiponce', type:'Spinning family ride', intensity:'Gentle to spinny', summary:'A Tangled-themed family ride with rotating vehicles and a strong spinning element.', flags:['Spinny','Outdoor','Family ride'] },
    { p:'tangled', type:'Spinning family ride', intensity:'Gentle to spinny', summary:'A Tangled-themed family ride with rotating vehicles and a strong spinning element.', flags:['Spinny','Outdoor','Family ride'] },
    { p:'disneyland railroad', type:'Park train', intensity:'Gentle', summary:'A full-size steam-style railway connecting stations around Disneyland Park.', flags:['Transport','Seated','Good breather'] },
    { p:'main street vehicles', type:'Main Street transport', intensity:'Gentle', summary:'A short ride along Main Street in a period-style vehicle.', flags:['Transport','Outdoor','Gentle'] },
    { p:'horse drawn streetcars', type:'Horse-drawn transport', intensity:'Gentle', summary:'A gentle horse-drawn streetcar journey along Main Street.', flags:['Transport','Outdoor','Gentle'] },
    { p:'adventure isle', type:'Exploration walkthrough', intensity:'Gentle', summary:'Explore caves, bridges and paths around Adventure Isle at your own pace.', flags:['Walkthrough','Uneven paths','Outdoor'] },
    { p:'alice s curious labyrinth', type:'Maze walkthrough', intensity:'Gentle', summary:'An outdoor hedge maze through Wonderland, with optional tower viewpoints.', flags:['Walkthrough','Outdoor','Stairs optional'] },
    { p:'labyrinth', type:'Maze walkthrough', intensity:'Gentle', summary:'An outdoor hedge maze through Wonderland, with optional tower viewpoints.', flags:['Walkthrough','Outdoor','Stairs optional'] },
    { p:'robinson', type:'Treehouse walkthrough', intensity:'Gentle', summary:'A self-paced climb through the Swiss Family Robinson treehouse.', flags:['Walkthrough','Many stairs','Outdoor'] },
    { p:'passage enchante d aladdin', type:'Walkthrough', intensity:'Gentle', summary:'A short indoor walkthrough past miniature scenes from Aladdin.', flags:['Walkthrough','Indoor','Dark areas'] },
    { p:'taniere du dragon', type:'Walkthrough / creature scene', intensity:'Gentle', summary:'Walk beneath the castle to see a large animatronic dragon in a dark cave.', flags:['Darkness','Dragon may scare little ones','Walkthrough'] },
    { p:'dragon s lair', type:'Walkthrough / creature scene', intensity:'Gentle', summary:'Walk beneath the castle to see a large animatronic dragon in a dark cave.', flags:['Darkness','Dragon may scare little ones','Walkthrough'] },
    { p:'nautilus', type:'Walkthrough', intensity:'Gentle', summary:'Explore Captain Nemo’s submarine rooms in a short atmospheric walkthrough.', flags:['Walkthrough','Darkness','Indoor'] },
    { p:'frontierland playground', type:'Playground', intensity:'Gentle', summary:'A place for the children to run, climb and play rather than a timed ride.', flags:['Play time','Outdoor','Allow 20–30 min'] },
    { p:'pirates beach', type:'Playground', intensity:'Gentle', summary:'Pirate-themed outdoor play area for climbing and burning off energy.', flags:['Play time','Outdoor','Allow 20–30 min'] },
    { p:'plage des pirates', type:'Playground', intensity:'Gentle', summary:'Pirate-themed outdoor play area for climbing and burning off energy.', flags:['Play time','Outdoor','Allow 20–30 min'] },
    { p:'meet mickey', type:'Character meet', intensity:'Gentle', summary:'Indoor character meeting experience rather than a ride.', flags:['Character','Photos','Indoor'] },
    { p:'princess pavilion', type:'Character meet', intensity:'Gentle', summary:'Queue to meet a Disney Princess in an indoor photo setting.', flags:['Character','Photos','Indoor'] },
    { p:'hero training center', type:'Character meet', intensity:'Gentle', summary:'Marvel character meeting experience rather than a ride.', flags:['Character','Photos','Indoor'] }
  ];
`;
app=mustInsertAfter(app,
  "  const HEADLINE_PATTERNS = [\n    'big thunder', 'peter pan', 'hyperspace mountain', 'crush', 'frozen ever after',\n    'tower of terror', 'ratatouille', 'spider man', 'spiderman', 'flight force'\n  ];\n",
  guideBlock,
  'ride guide catalogue');

// State now includes the separate view, Rider Switch choices, and optional cloud metadata.
app=mustReplace(app,
`    activeFilter: 'all',
    search: '',
    priorities: loadJSON('dlpPriorities', {}),
    done: loadJSON('dlpDone', {}),
    notNow: loadJSON('dlpNotNow', {}),
    dynamicCommitments: loadJSON('dlpDynamicCommitments', []),
    settings: Object.assign({`,
`    activeFilter: 'all',
    activeView: 'now',
    currentUrgency: 'none',
    search: '',
    priorities: loadJSON('dlpPriorities', {}),
    done: loadJSON('dlpDone', {}),
    notNow: loadJSON('dlpNotNow', {}),
    riderSwitch: loadJSON('dlpRiderSwitch', {}),
    dynamicCommitments: loadJSON('dlpDynamicCommitments', []),
    sync: Object.assign({
      token: localStorage.getItem(SYNC_TOKEN_KEY) || '',
      revision: 0,
      localModifiedAt: 0,
      lastSyncedAt: 0,
      pushEnabled: false,
      deviceId: localStorage.getItem(PUSH_DEVICE_KEY) || ''
    }, loadJSON(SYNC_META_KEY, {})),
    syncApplying: false,
    syncPushTimer: null,
    syncBusy: false,
    settings: Object.assign({`,
  'state additions');

app=mustReplace(app,
`  function save() {
    localStorage.setItem('dlpPriorities', JSON.stringify(state.priorities));
    localStorage.setItem('dlpDone', JSON.stringify(state.done));
    localStorage.setItem('dlpNotNow', JSON.stringify(state.notNow));
    localStorage.setItem('dlpDynamicCommitments', JSON.stringify(state.dynamicCommitments));
    localStorage.setItem('dlpSettings', JSON.stringify(state.settings));
  }
`,
`  function persistSyncMeta() {
    const meta={
      revision:Number(state.sync.revision||0),
      localModifiedAt:Number(state.sync.localModifiedAt||0),
      lastSyncedAt:Number(state.sync.lastSyncedAt||0),
      pushEnabled:!!state.sync.pushEnabled,
      deviceId:state.sync.deviceId||''
    };
    localStorage.setItem(SYNC_META_KEY,JSON.stringify(meta));
    if(state.sync.token)localStorage.setItem(SYNC_TOKEN_KEY,state.sync.token);else localStorage.removeItem(SYNC_TOKEN_KEY);
    if(state.sync.deviceId)localStorage.setItem(PUSH_DEVICE_KEY,state.sync.deviceId);else localStorage.removeItem(PUSH_DEVICE_KEY);
  }
  function save(options={}) {
    localStorage.setItem('dlpPriorities', JSON.stringify(state.priorities));
    localStorage.setItem('dlpDone', JSON.stringify(state.done));
    localStorage.setItem('dlpNotNow', JSON.stringify(state.notNow));
    localStorage.setItem('dlpRiderSwitch', JSON.stringify(state.riderSwitch));
    localStorage.setItem('dlpDynamicCommitments', JSON.stringify(state.dynamicCommitments));
    localStorage.setItem('dlpSettings', JSON.stringify(state.settings));
    if(!state.syncApplying&&!options.remote){
      state.sync.localModifiedAt=Date.now();
      persistSyncMeta();
      scheduleCloudPush();
    }
  }
`,
  'save and sync metadata');

// Plain-English guide helpers live next to the existing attraction metadata helpers.
app=mustInsertAfter(app,
`  function metaFor(name) {
    const n = norm(name);
    const hit = META.find(x => n.includes(x.p));
    return { ...(hit || { area: null, duration: 5, indoor: false }), ...experienceFor(name) };
  }
`,
`  function guideFor(name,meta=metaFor(name)) {
    const n=norm(name),hit=RIDE_GUIDES.find(x=>n.includes(x.p));
    if(hit)return hit;
    const fallbacks={
      show:{type:'Show / cinema',intensity:'Gentle',summary:'A seated or standing entertainment experience rather than a conventional ride.',flags:['Show']},
      playground:{type:'Play area',intensity:'Gentle',summary:'A flexible play stop for the children rather than a fixed-duration ride.',flags:['Play time','Allow 20–30 min']},
      walkthrough:{type:'Walkthrough',intensity:'Gentle',summary:'Explore this attraction on foot at your own pace.',flags:['Walkthrough']},
      character:{type:'Character experience',intensity:'Gentle',summary:'A character meeting or photo experience rather than a ride.',flags:['Character','Photos']},
      transport:{type:'Park transport',intensity:'Gentle',summary:'A transport attraction that also works as a breather while moving around the park.',flags:['Transport','Seated']},
      scenic:{type:'Scenic attraction',intensity:'Gentle',summary:'A slower attraction designed more for scenery and atmosphere than thrills.',flags:['Scenic']},
      headline:{type:'Headline ride',intensity:'Moderate to thrill',summary:'A major Disney attraction. Tap the live card front for wait and planning information.',flags:['Major attraction']},
      ride:{type:'Theme-park ride',intensity:'Moderate',summary:'A seated Disney attraction. The live card front shows its current wait and planning state.',flags:['Ride']}
    };
    return fallbacks[meta.category]||fallbacks.ride;
  }
`,
  'ride guide helper');

// Rider Switch adds a second ride cycle and handover, never a second standby queue.
app=mustInsertAfter(app,
`  function experienceMinutes(meta) {
    const defaults = { headline:5, ride:5, scenic:15, show:15, playground:25, walkthrough:12, minor:8, character:8, transport:20 };
    return Math.max(Number(meta.duration || 0), defaults[meta.category] || 5);
  }
`,
`  function riderSwitchEligible(meta){return ['ride','headline','scenic'].includes(meta.category);}
  function riderSwitchOn(ride,meta=metaFor(ride.name)){return riderSwitchEligible(meta)&&!!state.riderSwitch[keyFor(ride.name)];}
  function experienceMinutesForRide(ride,meta){
    const base=experienceMinutes(meta);
    return riderSwitchOn(ride,meta)?base*2+RIDER_SWITCH_HANDOVER_MIN:base;
  }
`,
  'Rider Switch timing helper');
app=mustReplace(app,"    const dwellMinutes = experienceMinutes(meta);","    const dwellMinutes = experienceMinutesForRide(ride,meta);",'primary dwell timing');
app=mustReplace(app,"      const dwellMinutes=experienceMinutes(meta), cPoint=pointForCommitment(commitment);","      const dwellMinutes=experienceMinutesForRide(ride,meta), cPoint=pointForCommitment(commitment);",'diagnostic dwell timing');
app=mustInsertAfter(app,
  "    if(x.meta.category==='playground')bits.push('time filler with realistic play time');\n",
  "    if(riderSwitchOn(x.ride,x.meta))bits.push('Rider Switch timing included');\n",
  'recommendation Rider Switch reason');

// Hero wording and current urgency are shared with the #1 recommendation card.
app=mustReplace(app,
  "      $('#nextMeta').textContent = state.settings.preview ? 'No later fixed point on this preview day.' : 'Live queues still work. Use Preview to test trip deconfliction.';",
  "      $('#nextMeta').textContent = state.settings.preview ? 'No later timed point on this preview day.' : 'Live queues still work. Use Preview to test trip deconfliction.';",
  'no timed point wording');
app=mustInsertAfter(app,
  "      $('.hero').classList.remove('urgency-safe','urgency-tight','urgency-now');\n",
  "      state.currentUrgency='none';\n",
  'clear urgency');
app=mustInsertAfter(app,
  "    const urgency=directSlack<=HARD_ANCHOR_MIN_SLACK?'now':directSlack<15?'tight':'safe';\n",
  "    state.currentUrgency=urgency;\n",
  'store urgency');
app=mustReplace(app,
  "    const targetLabel=c.kind==='premier'?'Latest safe arrival':'Target arrival';",
  "    const targetLabel='Target arrival';",
  'Premier target wording');

app=mustInsertAfter(app,
  "      const routeTag=precisionRoutingEnabled()?'<span class=\"tag good\">STROLLER ROUTE</span>':'';\n",
  "      const attention=i===0&&state.currentUrgency==='tight'?' attention-tight':i===0&&state.currentUrgency==='now'?' attention-now':'';\n",
  'recommendation urgency class');
app=mustReplace(app,
  "      return `<article class=\"card reco ${x.tightFit?'tight-fit':'safe-fit'}\" data-card-jump=\"${esc(k)}\">",
  "      return `<article class=\"card reco ${x.tightFit?'tight-fit':'safe-fit'}${attention}\" data-card-jump=\"${esc(k)}\">",
  'recommendation urgency markup');

// Now / Rides navigation and Rider Switch toggles.
const browserHelpers=`
  function activateView(view,scrollTop=true){
    const next=view==='rides'?'rides':'now';
    state.activeView=next;
    const now=$('#viewNow'),rides=$('#viewRides');
    if(now)now.hidden=next!=='now';
    if(rides)rides.hidden=next!=='rides';
    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));
    if(scrollTop)window.scrollTo({top:0,behavior:'smooth'});
  }
  function toggleRiderSwitch(k){
    if(state.riderSwitch[k])delete state.riderSwitch[k];else state.riderSwitch[k]=true;
    save();renderAll();toast(state.riderSwitch[k]?'Rider Switch timing on.':'Rider Switch timing off.');
  }
  function decorateRideCards(){
    $$('.ride-row').forEach(row=>{
      const id=row.id||'',k=id.replace(/^ride-/,'').replace(/-/g,' ');
      const ride=state.rides.find(r=>rideRowId(keyFor(r.name))===id);
      if(!ride)return;
      const rideKey=keyFor(ride.name),meta=metaFor(ride.name),guide=guideFor(ride.name,meta);
      const front=document.createElement('div');front.className='ride-card-face ride-card-front';
      while(row.firstChild)front.appendChild(row.firstChild);
      const actions=front.querySelector('.ride-actions');
      if(actions&&riderSwitchEligible(meta)){
        const button=document.createElement('button');
        button.type='button';button.className=`rider-switch-btn ${state.riderSwitch[rideKey]?'on':''}`;
        button.dataset.riderSwitch=rideKey;
        button.textContent=state.riderSwitch[rideKey]?'Rider Switch ON':'Rider Switch';
        actions.appendChild(button);
      }
      const hint=document.createElement('div');hint.className='tap-hint';hint.textContent='Tap card for ride guide';front.appendChild(hint);
      const back=document.createElement('div');back.className='ride-card-face ride-card-back';
      const flags=(guide.flags||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join('');
      back.innerHTML=`<div class="ride-guide-top"><div><div class="eyebrow">WHAT IS IT?</div><div class="ride-guide-type">${esc(guide.type)}</div></div><div class="ride-guide-intensity">${esc(guide.intensity)}</div></div><div class="ride-guide-summary">${esc(guide.summary)}</div><div class="ride-guide-flags">${flags}</div><div class="ride-guide-foot">About ${experienceMinutes(meta)}m experience time in Dispatcher · tap again to return to live wait and controls.</div>`;
      row.append(front,back);
      row.addEventListener('click',e=>{
        if(e.target.closest('button,input,select,a,label'))return;
        row.classList.toggle('flipped');
      });
    });
  }
`;
app=mustInsertAfter(app,
  "  function deferRide(k) {\n    const previous = state.notNow[k];\n    state.notNow[k] = Date.now() + NOT_NOW_MIN*60000; save(); renderAll();\n    showUndoToast(`Hidden for ${NOT_NOW_MIN} minutes`, () => { if (previous) state.notNow[k]=previous; else delete state.notNow[k]; save(); renderAll(); });\n  }\n",
  browserHelpers,
  'view and Rider Switch helpers');
app=mustReplace(app,
`  function jumpToRide(k) {
    state.activeFilter = 'all'; state.search = ''; $('#searchInput').value = '';
`,
`  function jumpToRide(k) {
    activateView('rides',false);
    state.activeFilter = 'all'; state.search = ''; $('#searchInput').value = '';
`,
  'jump to Rides view');

app=mustInsertAfter(app,
  "    const q=norm(state.search),freshRank=r=>({fresh:0,aging:1,unknown:2,stale:3}[attractionFreshness(r).level]??3);\n",
  "    const clear=$('#clearSearch');if(clear)clear.hidden=!state.search;\n",
  'clear search visibility');
app=mustInsertAfter(app,
  "    $('#waitBoard').innerHTML=`${showRail?railroadSummary():''}${rows}`;\n",
  "    decorateRideCards();\n",
  'decorate ride cards');
app=mustInsertAfter(app,
  "    $$('[data-unsnooze]').forEach(b=>b.addEventListener('click',()=>{delete state.notNow[b.dataset.unsnooze];save();renderAll();toast('Snooze cleared.');}));\n",
  "    $$('[data-rider-switch]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleRiderSwitch(b.dataset.riderSwitch);}));\n",
  'bind Rider Switch buttons');

// Cloud sync and Web Push. Local state remains authoritative when offline.
const cloudBlock=`
  function syncableSettings(){
    const {preview,previewDate,previewTime,location,locationSource,...shared}=state.settings;
    return shared;
  }
  function cloudStateData(){
    return {
      priorities:state.priorities,
      done:state.done,
      notNow:state.notNow,
      riderSwitch:state.riderSwitch,
      dynamicCommitments:state.dynamicCommitments,
      settings:syncableSettings()
    };
  }
  function cloudAlerts(){
    const now=Date.now();
    return allCommitments().filter(c=>c.hard).map(c=>{
      const target=new Date(commitmentDateTime(c).getTime()-bufferFor(c)*60000);
      return {id:c.id,name:c.name,kind:c.kind||'timed',targetAt:target.toISOString(),targetLabel:parisTime(target),displayTime:commitmentDisplayTime(c),date:c.date};
    }).filter(a=>Date.parse(a.targetAt)>now-10*60000);
  }
  function randomUrlToken(bytes=18){
    const raw=crypto.getRandomValues(new Uint8Array(bytes));
    let binary='';for(const b of raw)binary+=String.fromCharCode(b);
    return btoa(binary).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
  }
  function ensureSyncToken(){
    if(state.sync.token)return state.sync.token;
    state.sync.token=`d1p_${randomUrlToken()}`;
    state.sync.revision=0;state.sync.localModifiedAt=Date.now();state.sync.lastSyncedAt=0;
    persistSyncMeta();renderSyncStatus();scheduleCloudPush();
    return state.sync.token;
  }
  function syncKeyPreview(token){return token&&token.length>12?`${token.slice(0,8)}…${token.slice(-5)}`:token||'';}
  function renderSyncStatus(message=null,kind=null){
    const status=$('#syncStatus'),keyLine=$('#syncKeyLine'),key=$('#syncKeyPreview'),create=$('#createSyncBtn'),copy=$('#copySyncBtn'),unlink=$('#unlinkSyncBtn');
    if(!status)return;
    const linked=!!state.sync.token;
    if(keyLine)keyLine.hidden=!linked;if(key)key.textContent=linked?syncKeyPreview(state.sync.token):'';
    if(create)create.hidden=linked;if(copy)copy.hidden=!linked;if(unlink)unlink.hidden=!linked;
    status.className=`sync-status ${kind||''}`.trim();
    if(message)status.textContent=message;
    else if(!linked)status.textContent='Not linked to Cloudflare yet.';
    else if(state.sync.lastSyncedAt)status.textContent=`Cloud linked · revision ${state.sync.revision} · last synced ${Math.max(0,Math.floor((Date.now()-state.sync.lastSyncedAt)/1000))}s ago`;
    else status.textContent='Cloud linked · waiting for first sync.';
    renderAlertStatus();
  }
  function renderAlertStatus(){
    const status=$('#alertStatus'),enable=$('#enableAlertsBtn'),test=$('#testAlertBtn');if(!status)return;
    const permission=typeof Notification==='undefined'?'unsupported':Notification.permission;
    if(state.sync.pushEnabled&&permission==='granted'){
      status.textContent='Notifications enabled on this copy.';if(enable){enable.textContent='Alerts enabled';enable.disabled=true;}if(test)test.hidden=false;
    }else{
      status.textContent=permission==='denied'?'Notifications are blocked in iOS settings.':'Notifications are off.';
      if(enable){enable.textContent='Enable trip alerts';enable.disabled=permission==='denied';}if(test)test.hidden=true;
    }
  }
  function applyCloudData(data){
    if(!data||typeof data!=='object')return;
    state.syncApplying=true;
    try{
      if(data.priorities&&typeof data.priorities==='object')state.priorities=data.priorities;
      if(data.done&&typeof data.done==='object')state.done=data.done;
      if(data.notNow&&typeof data.notNow==='object')state.notNow=data.notNow;
      if(data.riderSwitch&&typeof data.riderSwitch==='object')state.riderSwitch=data.riderSwitch;
      if(Array.isArray(data.dynamicCommitments))state.dynamicCommitments=data.dynamicCommitments;
      if(data.settings&&typeof data.settings==='object')state.settings={...state.settings,...data.settings};
      save({remote:true});
      renderAll();
    }finally{state.syncApplying=false;}
  }
  function scheduleCloudPush(){
    if(!state.sync?.token||state.syncApplying)return;
    clearTimeout(state.syncPushTimer);
    state.syncPushTimer=setTimeout(()=>cloudPut().catch(()=>{}),650);
  }
  async function cloudPut(retry=true){
    if(!state.sync.token||state.syncBusy)return false;
    state.syncBusy=true;
    const payloadModified=Number(state.sync.localModifiedAt||Date.now());
    const baseRevision=Number(state.sync.revision||0);
    try{
      const response=await fetch(`${QT_PROXY_BASE}/sync/${encodeURIComponent(state.sync.token)}`,{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({baseRevision,updatedAt:payloadModified,data:cloudStateData(),alerts:cloudAlerts()})
      });
      const body=await response.json().catch(()=>({}));
      if(response.status===409&&retry){
        state.sync.revision=Number(body.revision||0);
        const remoteUpdated=Number(body.updatedAt||0);
        if(body.data&&remoteUpdated>Number(state.sync.localModifiedAt||0)){
          applyCloudData(body.data);state.sync.localModifiedAt=remoteUpdated;state.sync.lastSyncedAt=remoteUpdated;persistSyncMeta();renderSyncStatus('Updated from the newer cloud copy.','ok');return true;
        }
        persistSyncMeta();
        state.syncBusy=false;
        return cloudPut(false);
      }
      if(!response.ok)throw new Error(body.error||`Cloud sync ${response.status}`);
      state.sync.revision=Number(body.revision||baseRevision+1);
      state.sync.lastSyncedAt=payloadModified;
      persistSyncMeta();renderSyncStatus(null,'ok');
      return true;
    }catch(e){renderSyncStatus(`Cloud unavailable · local copy is safe (${e.message||e}).`,'warn');return false;}
    finally{
      state.syncBusy=false;
      if(state.sync.token&&Number(state.sync.localModifiedAt||0)>Number(state.sync.lastSyncedAt||0))scheduleCloudPush();
    }
  }
  async function cloudPull({forceRemote=false}={}){
    if(!state.sync.token||state.syncBusy)return false;
    state.syncBusy=true;
    try{
      const response=await fetch(`${QT_PROXY_BASE}/sync/${encodeURIComponent(state.sync.token)}`,{cache:'no-store'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||`Cloud sync ${response.status}`);
      const remoteRevision=Number(body.revision||0),remoteUpdated=Number(body.updatedAt||0);
      if(body.data&&(forceRemote||remoteRevision>Number(state.sync.revision||0))){
        if(forceRemote||remoteUpdated>=Number(state.sync.localModifiedAt||0)){
          applyCloudData(body.data);state.sync.localModifiedAt=remoteUpdated;state.sync.lastSyncedAt=remoteUpdated;
        }
        state.sync.revision=remoteRevision;persistSyncMeta();
      }else if(!body.data&&forceRemote){
        state.sync.revision=remoteRevision;state.sync.localModifiedAt=Date.now();persistSyncMeta();
      }
      renderSyncStatus(null,'ok');
      return {body,needsPush:!body.data||Number(state.sync.localModifiedAt||0)>Number(state.sync.lastSyncedAt||0)};
    }catch(e){renderSyncStatus(`Cloud unavailable · local copy is safe (${e.message||e}).`,'warn');return false;}
    finally{state.syncBusy=false;}
  }
  async function createCloudSync(){
    ensureSyncToken();
    state.sync.localModifiedAt=Date.now();persistSyncMeta();
    const ok=await cloudPut();if(ok){renderSyncStatus('Cloud sync started. Copy the private key into your other copy of Dispatcher.','ok');toast('Cloud sync started.');}
    return ok;
  }
  async function linkCloudSync(){
    const input=$('#syncKeyInput'),token=(input?.value||'').trim();
    if(!SYNC_TOKEN_RE.test(token))return toast('That does not look like a Dispatcher sync key.');
    state.sync.token=token;state.sync.revision=0;state.sync.localModifiedAt=0;state.sync.lastSyncedAt=0;state.sync.pushEnabled=false;persistSyncMeta();renderSyncStatus('Checking cloud state…');
    const pulled=await cloudPull({forceRemote:true});
    if(pulled&&pulled.needsPush){state.sync.localModifiedAt=Date.now();persistSyncMeta();await cloudPut();}
    if(pulled){if(input)input.value='';toast('This copy is linked.');}
  }
  async function copySyncKey(){
    if(!state.sync.token)return;
    try{await navigator.clipboard.writeText(state.sync.token);toast('Private sync key copied.');}
    catch{prompt('Copy this private sync key:',state.sync.token);}
  }
  async function unlinkCloudSync(){
    const token=state.sync.token,deviceId=state.sync.deviceId;
    try{
      const reg=await navigator.serviceWorker?.ready;
      const subscription=await reg?.pushManager?.getSubscription();
      if(subscription)await subscription.unsubscribe();
      if(token&&deviceId)await fetch(`${QT_PROXY_BASE}/push/unregister/${encodeURIComponent(token)}/${encodeURIComponent(deviceId)}`,{method:'POST'}).catch(()=>{});
      reg?.active?.postMessage({type:'CLEAR_PUSH_CONTEXT'});
    }catch{}
    clearTimeout(state.syncPushTimer);
    state.sync={token:'',revision:0,localModifiedAt:0,lastSyncedAt:0,pushEnabled:false,deviceId:''};
    localStorage.removeItem(SYNC_TOKEN_KEY);localStorage.removeItem(PUSH_DEVICE_KEY);localStorage.removeItem(SYNC_META_KEY);
    renderSyncStatus();toast('This copy is unlinked. Local trip data was kept.');
  }
  function base64UrlToBytes(value){
    const padding='='.repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;
  }
  function standalonePwa(){return window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;}
  async function enableTripAlerts(){
    if(!standalonePwa())return toast('Open the installed Home Screen app to enable iPhone push alerts.');
    if(!('serviceWorker'in navigator)&&!('PushManager'in window))return toast('This browser does not support web push.');
    if(!('Notification'in window))return toast('Notifications are not available here.');
    ensureSyncToken();
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){renderAlertStatus();return toast('Notification permission was not granted.');}
    try{
      const reg=await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      const keyResponse=await fetch(`${QT_PROXY_BASE}/push/vapid`,{cache:'no-store'});
      if(!keyResponse.ok)throw new Error('Cloud push service is not ready');
      const {publicKey}=await keyResponse.json();
      let subscription=await reg.pushManager.getSubscription();
      if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToBytes(publicKey)});
      if(!state.sync.deviceId)state.sync.deviceId=`dev_${randomUrlToken(12)}`;
      const response=await fetch(`${QT_PROXY_BASE}/push/register/${encodeURIComponent(state.sync.token)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deviceId:state.sync.deviceId,subscription:subscription.toJSON()})
      });
      if(!response.ok)throw new Error('Could not register this phone');
      state.sync.pushEnabled=true;persistSyncMeta();
      reg.active?.postMessage({type:'SET_PUSH_CONTEXT',context:{syncToken:state.sync.token,deviceId:state.sync.deviceId}});
      scheduleCloudPush();renderAlertStatus();toast('Trip alerts enabled.');
    }catch(e){state.sync.pushEnabled=false;persistSyncMeta();renderAlertStatus();toast(e.message||'Could not enable trip alerts.');}
  }
  async function testTripAlert(){
    if(!state.sync.token||!state.sync.deviceId)return toast('Enable trip alerts first.');
    try{
      const response=await fetch(`${QT_PROXY_BASE}/push/test/${encodeURIComponent(state.sync.token)}/${encodeURIComponent(state.sync.deviceId)}`,{method:'POST'});
      if(!response.ok)throw new Error('Test alert could not be sent');
      toast('Test alert sent.');
    }catch(e){toast(e.message||'Test alert failed.');}
  }
  function startCloudSyncLoop(){
    renderSyncStatus();
    if(state.sync.token){cloudPull().then(result=>{if(result?.needsPush)scheduleCloudPush();});}
    setInterval(()=>{if(state.sync.token&&document.visibilityState==='visible')cloudPull().then(result=>{if(result?.needsPush)scheduleCloudPush();});},CLOUD_SYNC_POLL_MS);
  }
`;
app=mustInsertAfter(app,
`  function showUndoToast(msg, fn) {
    const t=$('#toast'), text=$('#toastText'), undo=$('#toastUndo');
    text.textContent=msg; undo.hidden=false; undo.onclick=()=>{ clearTimeout(toast.t); t.classList.remove('show'); fn(); };
    t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>{t.classList.remove('show'); undo.hidden=true;},4200);
  }
`,
  cloudBlock,
  'cloud sync and push functions');

// renderAll now preserves the selected top-level view and refreshes optional cloud UI.
app=mustInsertAfter(app,
  "    renderSourceAge();\n",
  "    activateView(state.activeView,false);\n    renderSyncStatus();\n",
  'render view and sync status');

// Packet language and Rider Switch diagnostics.
app=mustReplace(app,"    let commitmentLine = 'Next fixed point: none active';","    let commitmentLine = 'Next timed point: none active';",'packet no timed point');
app=mustReplace(app,"    let safeMinutesLine = 'Safe time remaining: not constrained by a fixed point';","    let safeMinutesLine = 'Safe time remaining: not constrained by a timed point';",'packet safe wording');
app=mustReplace(app,
  "      const displayTime=commitmentDisplayTime(c), timing=c.kind==='premier'?`window ${displayTime}; latest safe arrival ${parisTime(safeAt)}`:`at ${displayTime}; target arrival ${parisTime(safeAt)}`;",
  "      const displayTime=commitmentDisplayTime(c), timing=c.kind==='premier'?`window ${displayTime}; target arrival ${parisTime(safeAt)}`:`at ${displayTime}; target arrival ${parisTime(safeAt)}`;",
  'packet Premier target wording');
app=mustReplace(app,"      commitmentLine = `Next fixed point: ${c.name} ${timing}; area ${c.area}; ${anchorType}; buffer ${appliedBuffer}m${residual}`;","      commitmentLine = `Next timed point: ${c.name} ${timing}; area ${c.area}; ${anchorType}; buffer ${appliedBuffer}m${residual}`;",'packet timed point label');
app=mustInsertAfter(app,
  "      `Timed items: ${state.dynamicCommitments.length ? state.dynamicCommitments.map(x=>`${x.name} (${fmtDate(x.date)} ${commitmentDisplayTime(x)})`).join(' | ') : 'none'}`,\n",
  "      `Rider Switch: ${Object.keys(state.riderSwitch).filter(k=>state.riderSwitch[k]).map(k=>state.rides.find(r=>keyFor(r.name)===k)?.name||k).join(', ')||'none'}`,\n",
  'packet Rider Switch line');

// Bind new controls.
app=mustInsertAfter(app,
  "    $('#copyBtn').addEventListener('click',copyPacket);\n",
  "    $$('[data-view]').forEach(b=>b.addEventListener('click',()=>activateView(b.dataset.view)));\n",
  'view tabs binding');
app=mustReplace(app,
  "    $('#searchInput').addEventListener('input',e=>{state.search=e.target.value;renderWaitBoard();});",
  "    $('#searchInput').addEventListener('input',e=>{state.search=e.target.value;renderWaitBoard();});\n    $('#clearSearch').addEventListener('click',()=>{state.search='';$('#searchInput').value='';renderWaitBoard();$('#searchInput').focus();});",
  'search clear binding');
app=mustInsertAfter(app,
  "    $('#resetPriorities').addEventListener('click',()=>{state.priorities={};save();renderAll();toast('Priorities reset.');});\n",
  "    $('#resetRiderSwitch').addEventListener('click',()=>{state.riderSwitch={};save();renderAll();toast('Rider Switch selections reset.');});\n    $('#createSyncBtn').addEventListener('click',createCloudSync);\n    $('#linkSyncBtn').addEventListener('click',linkCloudSync);\n    $('#copySyncBtn').addEventListener('click',copySyncKey);\n    $('#unlinkSyncBtn').addEventListener('click',unlinkCloudSync);\n    $('#enableAlertsBtn').addEventListener('click',enableTripAlerts);\n    $('#testAlertBtn').addEventListener('click',testTripAlert);\n",
  'v0.8 settings bindings');

// A service-worker context reminder on startup repairs push context after service-worker replacement.
app=mustReplace(app,
`  bind(); updateTimedForm(); renderAll(); loadRoutingData(); refreshLive();
  setInterval(refreshLive, REFRESH_MS);`,
`  bind(); updateTimedForm(); renderAll(); loadRoutingData(); refreshLive(); startCloudSyncLoop();
  if(state.sync.token&&state.sync.deviceId&&'serviceWorker'in navigator){navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:'SET_PUSH_CONTEXT',context:{syncToken:state.sync.token,deviceId:state.sync.deviceId}})).catch(()=>{});}
  setInterval(refreshLive, REFRESH_MS);`,
  'startup cloud loop');

// Cache/version text bump is deliberately last so validation can detect stale references.
app=app.replaceAll('v0.7.2','v0.8.0');

// Production static assets come from the staged templates. Existing CSS is preserved then v0.8 overrides are appended.
const cssAppend=read('tools/v080/styles-append.css');
if(!styles.includes('/* v0.8.0 operational views'))styles=styles.trimEnd()+cssAppend+'\n';
write('styles.css',styles);
write('index.html',read('tools/v080/index.html'));
write('sw.js',read('tools/v080/sw.js'));
write('manifest.webmanifest',read('tools/v080/manifest.webmanifest'));
write('README.md',read('tools/v080/README.md'));
write('worker/src/index.js',read('tools/v080/worker-index.js'));
write('worker/wrangler.jsonc',read('tools/v080/wrangler.jsonc'));
write('app.js',app);

console.log('Applied DLP Dispatcher v0.8.0 polish pass.');
