import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const replaceExact=(s,bad,good,label)=>{if(!s.includes(bad))throw new Error(`Missing ${label}`);return s.split(bad).join(good);};
const insertAfter=(s,anchor,addition,label)=>replaceExact(s,anchor,anchor+addition,label);
const insertBefore=(s,anchor,addition,label)=>replaceExact(s,anchor,addition+anchor,label);

let app=read('app.js'),html=read('index.html'),styles=read('styles.css'),sw=read('sw.js'),readme=read('README.md');

app=insertAfter(app,
`    entities: [],\n`,
`    liveEntities: [],\n    explorePois: [],\n    exploreLookup: new Map(),\n`,
'explore entity state');

app=replaceExact(app,
`    activeFilter: 'all',\n    activeView: 'now',\n    currentUrgency: 'none',\n    search: '',\n`,
`    activeFilter: 'all',\n    activeView: 'now',\n    exploreCategory: 'rides',\n    exploreTarget: loadJSON('dlpExploreTarget', null),\n    currentUrgency: 'none',\n    search: '',\n`,
'explore UI state');

app=replaceExact(app,
`    return { rides, entities, source:'ThemeParks.wiki', updated:newestTimestamp(rides) };\n`,
`    return { rides, entities, liveEntities:live.liveData||[], source:'ThemeParks.wiki', updated:newestTimestamp(rides) };\n`,
'ThemeParks live entity passthrough');

app=replaceExact(app,
`    return { rides, entities: [], source: 'Queue-Times.com', updated: newestTimestamp(rides) };\n`,
`    return { rides, entities: [], liveEntities: [], source: 'Queue-Times.com', updated: newestTimestamp(rides) };\n`,
'Queue Times live entity placeholder');

app=replaceExact(app,
`      state.rides = primary.rides.filter(r => r.name && !/entry to world of frozen/i.test(r.name));\n      state.entities = primary.entities || [];\n      state.source = primary.source;\n`,
`      state.rides = primary.rides.filter(r => r.name && !/entry to world of frozen/i.test(r.name));\n      state.entities = primary.entities || [];\n      state.liveEntities = primary.liveEntities || [];\n      state.source = primary.source;\n`,
'refresh explore live entities');

app=replaceExact(app,
`    renderRecommendations();\n    renderWaitBoard();\n    renderSchedule();\n    renderSourceAge();\n    activateView(state.activeView,false);\n`,
`    renderRecommendations();\n    renderExplore();\n    renderSchedule();\n    renderSourceAge();\n    renderGuidance();\n    activateView(state.activeView,false);\n`,
'render explore pipeline');

app=replaceExact(app,
`  function activateView(view,scrollTop=true){\n    const next=view==='rides'?'rides':'now';\n    state.activeView=next;\n    const now=$('#viewNow'),rides=$('#viewRides');\n    if(now)now.hidden=next!=='now';\n    if(rides)rides.hidden=next!=='rides';\n    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));\n    if(scrollTop)window.scrollTo({top:0,behavior:'smooth'});\n  }\n`,
`  function activateView(view,scrollTop=true){\n    const next=view==='explore'?'explore':'now';\n    state.activeView=next;\n    const now=$('#viewNow'),explore=$('#viewExplore');\n    if(now)now.hidden=next!=='now';\n    if(explore)explore.hidden=next!=='explore';\n    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));\n    if(scrollTop)window.scrollTo({top:0,behavior:'smooth'});\n  }\n`,
'activate Explore view');

const exploreFns = String.raw`
  function entityContext(ent){
    const index=new Map(state.entities.map(e=>[e.id,e]));
    let x=ent,park=null,area=null,loops=0;
    while(x&&loops++<12){
      if(!area&&x.entityType==='LAND')area=canonicalArea(x.name);
      if(!park&&x.entityType==='PARK')park=canonicalPark(x.name);
      x=index.get(x.parentId);
    }
    return {park:park||inferPark(ent?.name||''),area};
  }
  function entityPoint(ent){
    const loc=ent?.location||{},lat=Number(loc.latitude),lon=Number(loc.longitude);
    return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;
  }
  function exploreWalkMinutes(item){
    const lat=Number(item?.lat),lon=Number(item?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;
    const to={lat,lon,park:item.park};
    let mins=walkMinutes(currentPoint(),to);
    if(isParkHop(currentPark(),item.park))mins+=PARK_HOP_TIME_MIN;
    return mins;
  }
  function exploreTime(iso){
    const d=new Date(iso);if(isNaN(d))return null;
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);
  }
  function showLiveFor(id){return state.liveEntities.find(x=>(x.entityId||x.id)===id)||null;}
  function showSummary(id){
    const live=showLiveFor(id),times=Array.isArray(live?.showtimes)?live.showtimes:[];
    const now=Date.now()-5*60000;
    const upcoming=times.filter(x=>Date.parse(x.startTime)>=now).sort((a,b)=>Date.parse(a.startTime)-Date.parse(b.startTime)).slice(0,3).map(x=>exploreTime(x.startTime)).filter(Boolean);
    if(upcoming.length)return `Next today: ${upcoming.join(' · ')}`;
    if(live?.status)return `Live status: ${prettyStatus(live.status)}`;
    return 'No live showtimes in the current feed. Check Disney for schedule changes.';
  }
  function exploreKindLabel(kind){return {food:'FOOD',show:'SHOW',toilet:'TOILETS',baby:'BABY CARE',babychange:'BABY CHANGE',firstaid:'FIRST AID',water:'WATER'}[kind]||'EXPLORE';}
  function makeEntityExploreItem(ent,kind){
    const context=entityContext(ent),point=entityPoint(ent)||areaPoint(context.area)||areaPoint(context.park==='Disney Adventure World'?'Disney Adventure World entrance':'Disneyland Park entrance');
    if(!point)return null;
    return {id:`entity-${ent.id}`,entityId:ent.id,kind,name:ent.name,park:context.park,area:context.area,lat:point.lat,lon:point.lon,source:'ThemeParks.wiki',tags:[kind,ent.entityType,context.park,context.area].filter(Boolean),note:kind==='show'?showSummary(ent.id):'Disneyland Paris dining entity from the live park-data catalogue.'};
  }
  function makePoiExploreItem(p){
    return {id:`poi-${p.id}`,kind:p.kind,name:p.name,park:p.park,area:p.area,lat:Number(p.lat),lon:Number(p.lon),source:p.source||'Mapped service',tags:p.tags||[],note:p.note||null,precision:p.precision||'mapped'};
  }
  function exploreCard(item){
    const walk=exploreWalkMinutes(item),walkText=walk==null?'route unavailable':`~${walk} min walk`,area=[item.park,item.area].filter(Boolean).join(' · '),flags=(item.tags||[]).filter(x=>!['food','show','RESTAURANT','SHOW',item.park,item.area].includes(x)).slice(0,4);
    const chips=[`<span class="chip category">${esc(exploreKindLabel(item.kind))}</span>`,area?`<span class="chip">${esc(area)}</span>`:'',...flags.map(x=>`<span class="chip">${esc(String(x))}</span>`)].filter(Boolean).join('');
    const precision=item.precision==='area'?'<span class="explore-approx">area pin</span>':'';
    return `<article class="explore-card"><div class="explore-card-top"><div><div class="explore-name">${esc(item.name)}</div><div class="quick-chips">${chips}</div></div><div class="explore-walk">${esc(walkText)}</div></div>${item.note?`<div class="explore-note">${esc(item.note)}</div>`:''}<div class="explore-card-foot"><span>${esc(item.source||'Park data')} ${precision}</span><button class="guide-btn" type="button" data-guide="${esc(item.id)}">Guide me</button></div></article>`;
  }
  function setExploreTarget(item){
    if(!item)return;
    state.exploreTarget={name:item.name,kind:item.kind,park:item.park,area:item.area,lat:Number(item.lat),lon:Number(item.lon),source:item.source||null};
    localStorage.setItem('dlpExploreTarget',JSON.stringify(state.exploreTarget));
    renderGuidance();toast(`Guiding to ${item.name}.`);
  }
  function setRideExploreTarget(k){
    const ride=state.rides.find(r=>keyFor(r.name)===k);if(!ride)return;
    const p=pointForRide(ride,'entrance'),m=metaFor(ride.name);if(!p)return toast('No route point is available for this attraction.');
    setExploreTarget({name:ride.name,kind:'ride',park:ride.park,area:ride.area||m.area,lat:p.lat,lon:p.lon,source:'ThemeParks.wiki / routing data'});
  }
  function clearExploreTarget(){state.exploreTarget=null;localStorage.removeItem('dlpExploreTarget');renderGuidance();}
  function renderGuidance(){
    const bar=$('#guidanceBanner');if(!bar)return;
    const t=state.exploreTarget;if(!t){bar.hidden=true;bar.innerHTML='';return;}
    const mins=exploreWalkMinutes(t),cross=isParkHop(currentPark(),t.park),where=[t.park,t.area].filter(Boolean).join(' · ');
    bar.hidden=false;
    bar.innerHTML=`<div class="guidance-main"><div class="guidance-label">GUIDING TO</div><strong>${esc(t.name)}</strong><span>${mins==null?'Walking time unavailable':`~${mins} min${cross?' incl. park transfer':''}`} · ${esc(where)}</span></div><button type="button" id="clearGuidance">Clear</button>`;
    $('#clearGuidance')?.addEventListener('click',clearExploreTarget);
  }
  async function loadExploreData(){
    try{
      const res=await fetch('data/explore-pois.json?v=0.9.0',{cache:'force-cache'});if(!res.ok)throw new Error(`Explore data ${res.status}`);
      const data=await res.json();state.explorePois=Array.isArray(data.points)?data.points:[];renderExplore();
    }catch(e){console.warn('Explore service POIs unavailable',e);state.explorePois=[];renderExplore();}
  }
  function renderExplore(){
    const board=$('#exploreBoard'),ridePanel=$('#rideExplorePanel');if(!board||!ridePanel)return;
    const cat=state.exploreCategory||'rides',q=norm(state.search);
    const clear=$('#clearSearch');if(clear)clear.hidden=!state.search;
    $$('[data-explore-cat]').forEach(b=>b.classList.toggle('active',b.dataset.exploreCat===cat));
    const showRides=cat==='rides'||cat==='all';ridePanel.hidden=!showRides;
    if(showRides)renderWaitBoard();
    state.exploreLookup=new Map();
    let items=[];
    if(cat==='all'||cat==='food'){
      items.push(...state.entities.filter(e=>e.entityType==='RESTAURANT').map(e=>makeEntityExploreItem(e,'food')).filter(Boolean));
    }
    if(cat==='all'||cat==='shows'){
      items.push(...state.entities.filter(e=>e.entityType==='SHOW').map(e=>makeEntityExploreItem(e,'show')).filter(Boolean));
    }
    if(cat==='all'||cat==='essentials')items.push(...state.explorePois.map(makePoiExploreItem));
    if(q)items=items.filter(x=>norm([x.name,x.park,x.area,x.kind,...(x.tags||[])].filter(Boolean).join(' ')).includes(q));
    items.forEach(x=>state.exploreLookup.set(x.id,x));
    items.sort((a,b)=>(exploreWalkMinutes(a)??999)-(exploreWalkMinutes(b)??999)||a.name.localeCompare(b.name));
    board.hidden=cat==='rides';
    board.innerHTML=cat==='rides'?'':items.length?items.map(exploreCard).join(''):`<div class="empty">No ${esc(cat==='all'?'Explore':cat)} results match this search.</div>`;
    $$('[data-guide]').forEach(b=>b.addEventListener('click',()=>setExploreTarget(state.exploreLookup.get(b.dataset.guide))));
  }
`;
app=insertBefore(app,`  function renderWaitBoard(){\n`,exploreFns,'Explore functions');

app=replaceExact(app,
`      if(actions&&riderSwitchEligible(meta)){\n        const button=document.createElement('button');\n        button.type='button';button.className=\`rider-switch-btn ${'${state.riderSwitch[rideKey]'}?'on':''}\`;\n        button.dataset.riderSwitch=rideKey;\n        button.textContent=state.riderSwitch[rideKey]?'Rider Switch ON':'Rider Switch';\n        actions.appendChild(button);\n      }\n      const hint=document.createElement('div');`,
`      if(actions&&riderSwitchEligible(meta)){\n        const button=document.createElement('button');\n        button.type='button';button.className=\`rider-switch-btn ${'${state.riderSwitch[rideKey]'}?'on':''}\`;\n        button.dataset.riderSwitch=rideKey;\n        button.textContent=state.riderSwitch[rideKey]?'Rider Switch ON':'Rider Switch';\n        actions.appendChild(button);\n      }\n      if(actions){const guide=document.createElement('button');guide.type='button';guide.className='guide-btn';guide.dataset.guideRide=rideKey;guide.textContent='Guide';actions.appendChild(guide);}\n      const hint=document.createElement('div');`,
'ride guide button');

app=replaceExact(app,
`    $$('[data-rider-switch]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleRiderSwitch(b.dataset.riderSwitch);}));\n  }\n`,
`    $$('[data-rider-switch]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleRiderSwitch(b.dataset.riderSwitch);}));\n    $$('[data-guide-ride]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();setRideExploreTarget(b.dataset.guideRide);}));\n  }\n`,
'ride guide listeners');

app=replaceExact(app,
`  function jumpToRide(k) {\n    activateView('rides',false);\n    state.activeFilter = 'all'; state.search = ''; $('#searchInput').value = '';\n    $$('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));\n    renderWaitBoard();\n`,
`  function jumpToRide(k) {\n    activateView('explore',false);\n    state.exploreCategory='rides';state.activeFilter = 'all'; state.search = ''; $('#searchInput').value = '';\n    $$('[data-explore-cat]').forEach(x=>x.classList.toggle('active',x.dataset.exploreCat==='rides'));\n    $$('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));\n    renderExplore();\n`,
'jump to ride Explore');

app=replaceExact(app,
`    $('#searchInput').addEventListener('input',e=>{state.search=e.target.value;renderWaitBoard();});\n    $('#clearSearch').addEventListener('click',()=>{state.search='';$('#searchInput').value='';renderWaitBoard();$('#searchInput').focus();});\n`,
`    $('#searchInput').addEventListener('input',e=>{state.search=e.target.value;renderExplore();});\n    $('#clearSearch').addEventListener('click',()=>{state.search='';$('#searchInput').value='';renderExplore();$('#searchInput').focus();});\n    $$('[data-explore-cat]').forEach(b=>b.addEventListener('click',()=>{state.exploreCategory=b.dataset.exploreCat;renderExplore();}));\n`,
'Explore search bindings');

app=replaceExact(app,
`  function refreshOnResume(){if(document.visibilityState!=='visible')return;const age=state.lastFetchedAt?(Date.now()-state.lastFetchedAt.getTime()):Infinity;if(age>60000)refreshLive();else{renderSourceAge();renderWaitBoard();}}\n`,
`  function refreshOnResume(){if(document.visibilityState!=='visible')return;const age=state.lastFetchedAt?(Date.now()-state.lastFetchedAt.getTime()):Infinity;if(age>60000)refreshLive();else{renderSourceAge();renderExplore();renderGuidance();}}\n`,
'resume Explore rendering');

app=replaceExact(app,
`  bind(); updateTimedForm(); renderAll(); loadRoutingData(); refreshLive(); startCloudSyncLoop();\n`,
`  bind(); updateTimedForm(); renderAll(); loadRoutingData(); loadExploreData(); refreshLive(); startCloudSyncLoop();\n`,
'Explore data initialization');

app=replaceExact(app,
`      \`Timed items: ${'${state.dynamicCommitments.length ? state.dynamicCommitments.map(x=>`${x.name} (${fmtDate(x.date)} ${commitmentDisplayTime(x)})`).join(\' | \') : \'none\'}'}\`,\n`,
`      \`Timed items: ${'${state.dynamicCommitments.length ? state.dynamicCommitments.map(x=>`${x.name} (${fmtDate(x.date)} ${commitmentDisplayTime(x)})`).join(\' | \') : \'none\'}'}\`,\n      \`Guidance target: ${'${state.exploreTarget ? `${state.exploreTarget.name} · ${exploreWalkMinutes(state.exploreTarget)??\'?\'}m walk · ${state.exploreTarget.area||state.exploreTarget.park||\'location\'}` : \'none\'}'}\`,\n`,
'packet guidance line');

html=replaceExact(html,
`    <nav class="view-tabs" aria-label="Dispatcher views">\n      <button class="view-tab active" type="button" data-view="now">Now</button>\n      <button class="view-tab" type="button" data-view="rides">Rides</button>\n    </nav>\n`,
`    <div class="sticky-nav-wrap">\n      <nav class="view-tabs" aria-label="Dispatcher views">\n        <button class="view-tab active" type="button" data-view="now">Now</button>\n        <button class="view-tab" type="button" data-view="explore">Explore</button>\n      </nav>\n      <div class="guidance-banner" id="guidanceBanner" hidden></div>\n    </div>\n`,
'Now Explore navigation');

const oldRides=`    <div id="viewRides" class="view-panel" hidden>\n      <section><div class="section-heading waits-heading"><div><div class="eyebrow">LIVE BOARD</div><h2>Rides</h2><div class="muted small rides-help">Browse when you want to. Tap a ride card to flip it over for a plain-English description.</div></div><div class="search-wrap"><input class="search" id="searchInput" type="search" placeholder="Search attractions" /><button class="search-clear" id="clearSearch" type="button" hidden>Clear</button></div></div><div class="filter-row"><button class="filter active" data-filter="all">All</button><button class="filter" data-filter="Disneyland Park">Disneyland Park</button><button class="filter" data-filter="Disney Adventure World">Adventure World</button><button class="filter" data-filter="done">Done</button></div><div id="waitBoard" class="wait-board"></div></section>\n    </div>\n`;
const newExplore=`    <div id="viewExplore" class="view-panel" hidden>\n      <section><div class="section-heading waits-heading explore-heading"><div><div class="eyebrow">PARK NAVIGATOR</div><h2>Explore</h2><div class="muted small rides-help">Search the parks, not just the rides. Food, shows and useful family stuff live here too.</div></div><div class="search-wrap"><input class="search" id="searchInput" type="search" placeholder="Ride, restaurant, show, toilet…" /><button class="search-clear" id="clearSearch" type="button" hidden>Clear</button></div></div>\n      <div class="explore-cats"><button class="explore-cat" data-explore-cat="all">All</button><button class="explore-cat active" data-explore-cat="rides">Rides</button><button class="explore-cat" data-explore-cat="food">Food</button><button class="explore-cat" data-explore-cat="shows">Shows</button><button class="explore-cat" data-explore-cat="essentials">Essentials</button></div>\n      <div id="exploreBoard" class="explore-board" hidden></div>\n      <div id="rideExplorePanel"><div class="filter-row"><button class="filter active" data-filter="all">All rides</button><button class="filter" data-filter="Disneyland Park">Disneyland Park</button><button class="filter" data-filter="Disney Adventure World">Adventure World</button><button class="filter" data-filter="done">Done</button></div><div id="waitBoard" class="wait-board"></div></div></section>\n    </div>\n`;
html=replaceExact(html,oldRides,newExplore,'Explore view markup');

styles += `\n\n/* v0.9.0 Explore + Safari-stable sticky navigation */\nhtml{max-width:100%;overflow-x:clip}\nbody{max-width:100%;overflow-x:clip}\n.sticky-nav-wrap{position:-webkit-sticky;position:sticky;top:env(safe-area-inset-top);z-index:80;margin:0 -4px 16px;padding:8px 4px;background:linear-gradient(180deg,rgba(9,11,18,.985),rgba(9,11,18,.93));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.07)}\n.sticky-nav-wrap .view-tabs{position:static!important;top:auto!important;margin:0;padding:0;background:none;border:0;backdrop-filter:none;-webkit-backdrop-filter:none}\n.guidance-banner{margin-top:8px;border:1px solid rgba(122,162,255,.45);background:rgba(16,23,42,.96);border-radius:14px;padding:10px 11px;display:flex;gap:10px;align-items:center;justify-content:space-between;box-shadow:0 8px 24px rgba(0,0,0,.26)}\n.guidance-banner[hidden]{display:none}.guidance-main{display:grid;gap:2px;min-width:0}.guidance-main strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.guidance-main span{color:var(--muted);font-size:10px}.guidance-label{color:#8fa9e8;font-size:9px;font-weight:950;letter-spacing:.12em}.guidance-banner button{padding:7px 9px;font-size:10px;flex:0 0 auto}\n.explore-cats{display:flex;gap:7px;overflow-x:auto;padding:0 0 10px;scrollbar-width:none}.explore-cats::-webkit-scrollbar{display:none}.explore-cat{white-space:nowrap;padding:9px 12px;color:var(--muted)}.explore-cat.active{color:var(--text);border-color:var(--accent);background:rgba(122,162,255,.12)}\n.explore-board{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-bottom:12px}.explore-board[hidden],#rideExplorePanel[hidden]{display:none}.explore-card{background:rgba(19,24,39,.82);border:1px solid var(--line);border-radius:15px;padding:12px;display:flex;flex-direction:column;gap:9px;min-width:0}.explore-card-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.explore-name{font-size:16px;font-weight:900;line-height:1.25}.explore-walk{font-size:11px;font-weight:900;color:#c9d6ff;white-space:nowrap}.explore-note{font-size:11px;line-height:1.45;color:var(--muted)}.explore-card-foot{margin-top:auto;padding-top:8px;border-top:1px solid rgba(41,49,73,.7);display:flex;align-items:center;justify-content:space-between;gap:8px;color:#697289;font-size:9px}.explore-card-foot .guide-btn,.guide-btn{padding:7px 9px;font-size:10px;border-radius:9px;color:#b9ccff;border-color:rgba(122,162,255,.42)}.explore-approx{color:var(--warn)}\n@media(max-width:720px){.explore-board{grid-template-columns:1fr}.sticky-nav-wrap{margin-left:-6px;margin-right:-6px;padding-left:6px;padding-right:6px}}\n`;

sw=replaceExact(sw,
`const ASSETS=['./','index.html','styles.css?v=0.8.2','app.js?v=0.8.2','manifest.webmanifest','icon.svg'];\n`,
`const ASSETS=['./','index.html','styles.css?v=0.9.0','app.js?v=0.9.0','manifest.webmanifest','icon.svg','data/explore-pois.json?v=0.9.0'];\n`,
'v0.9 service worker assets');

app=app.replaceAll('v0.8.2','v0.9.0');
html=html.replaceAll('v0.8.2','v0.9.0').replaceAll('?v=0.8.2','?v=0.9.0');
sw=sw.replaceAll('dlp-dispatcher-v0.8.2','dlp-dispatcher-v0.9.0');
readme=readme.replaceAll('v0.8.2','v0.9.0');
readme += `\n## v0.9.0 Explore\nRides has grown into Explore: one searchable park navigator for rides, ThemeParks.wiki restaurant entities, ThemeParks.wiki shows and live showtimes, plus mapped essentials such as toilets, baby-changing information, drinking water and First Aid. Any mapped result can become a temporary guidance target using the existing family walking model. The Now / Explore switcher now sits in a sticky wrapper and horizontal overflow uses CSS clip rather than a scrolling ancestor, specifically to avoid the iOS Safari sticky failure seen in v0.8.2.\n`;

write('app.js',app);write('index.html',html);write('styles.css',styles);write('sw.js',sw);write('README.md',readme);
console.log('Applied DLP Dispatcher v0.9.0 Explore navigator.');
