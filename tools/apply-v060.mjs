import fs from 'node:fs';

function read(p){return fs.readFileSync(p,'utf8');}
function write(p,t){fs.writeFileSync(p,t);}
function req(t,from,to,label){if(t.includes(to))return t;if(!t.includes(from))throw new Error(`Missing ${label}`);return t.replace(from,to);}

let app=read('app.js');

app=req(app,
"      mode: 'balanced', singleRider: false, parkHop: false, softPlans: false,\n      mealBuffer: 15, trainBuffer: 35, walkSpeed: 55, routeFactor: 1.25,",
"      mode: 'balanced', singleRider: false, parkHop: false, softPlans: false, precisionRouting: true,\n      mealBuffer: 15, trainBuffer: 35, walkSpeed: 55, routeFactor: 1.25,",
'precision setting');

app=req(app,
"    gpsAccuracy: null,\n    activeFilter: 'all',",
"    gpsAccuracy: null,\n    gpsWatchId: null,\n    gpsLastRenderAt: 0,\n    routingReady: false,\n    routingError: null,\n    routingLocations: null,\n    routingGraph: null,\n    activeFilter: 'all',",
'routing state');

const routingFns=`  function precisionRoutingEnabled() { return !!state.settings.precisionRouting && sessionMode()==='TEST' && !!state.routingReady; }\n  function graphNearest(point) {\n    if (!state.routingGraph || !point) return null;\n    const key=\`${'${Number(point.lat).toFixed(5)},${Number(point.lon).toFixed(5)}'}\`;\n    if(state.routingGraph.snapCache.has(key))return state.routingGraph.snapCache.get(key);\n    let best=null;\n    for(const n of state.routingGraph.nodes){const d=haversine(point,n);if(!best||d<best.d)best={id:n.id,lat:n.lat,lon:n.lon,d};}\n    if(best)state.routingGraph.snapCache.set(key,best);\n    return best;\n  }\n  function dijkstraFrom(startId) {\n    const g=state.routingGraph;if(!g)return null;\n    if(g.sourceCache.has(startId))return g.sourceCache.get(startId);\n    const dist=new Map([[startId,0]]), heap=[[0,startId]];\n    function push(item){heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;}\n    function pop(){if(!heap.length)return null;const root=heap[0],last=heap.pop();if(heap.length){let i=0;heap[0]=last;while(true){let l=i*2+1,r=l+1,b=i;if(l<heap.length&&heap[l][0]<heap[b][0])b=l;if(r<heap.length&&heap[r][0]<heap[b][0])b=r;if(b===i)break;[heap[i],heap[b]]=[heap[b],heap[i]];i=b;}}return root;}\n    while(heap.length){const [du,u]=pop();if(du!==dist.get(u))continue;for(const [v,w] of (g.adj.get(u)||[])){const nd=du+w;if(nd<(dist.get(v)??Infinity)){dist.set(v,nd);push([nd,v]);}}}\n    g.sourceCache.set(startId,dist);if(g.sourceCache.size>6){const first=g.sourceCache.keys().next().value;if(first!==startId)g.sourceCache.delete(first);}\n    return dist;\n  }\n  function precisionRouteMeters(a,b) {\n    if(!precisionRoutingEnabled())return null;\n    const A=graphNearest(a),B=graphNearest(b);if(!A||!B)return null;\n    let distMap=state.routingGraph.sourceCache.get(A.id), graphM;\n    if(distMap)graphM=distMap.get(B.id);\n    else {distMap=state.routingGraph.sourceCache.get(B.id);if(distMap)graphM=distMap.get(A.id);}\n    if(graphM==null){distMap=dijkstraFrom(A.id);graphM=distMap?.get(B.id);}\n    if(!Number.isFinite(graphM))return null;\n    return A.d+graphM+B.d;\n  }\n  function prepareRoutingContext(commitment=null) {\n    if(!precisionRoutingEnabled())return;\n    const cur=graphNearest(currentPoint());if(cur)dijkstraFrom(cur.id);\n    if(commitment){const cp=graphNearest(pointForCommitment(commitment));if(cp)dijkstraFrom(cp.id);}\n  }\n  function routingAttraction(name){return state.routingLocations?.attractions?.[keyFor(name)]||null;}\n  function pointForCommitment(c){const p=precisionRoutingEnabled()?state.routingLocations?.commitments?.[c?.id]?.entrance:null;return p?{lat:p.lat,lon:p.lon,park:areaPoint(c.area)?.park}:areaPoint(c?.area);}\n  async function loadRoutingData(){\n    try{\n      const [gr,lr]=await Promise.all([fetch('data/routing-graph.json?v=0.6.0'),fetch('data/routing-locations.json?v=0.6.0')]);\n      if(!gr.ok||!lr.ok)throw new Error(\`routing data ${'${gr.status}/${lr.status}'}\`);\n      const raw=await gr.json(),loc=await lr.json(),nodes=raw.nodes.map(n=>({id:n[0],lat:n[1],lon:n[2]})),adj=new Map();\n      for(const n of nodes)adj.set(n.id,[]);for(const [a,b,m] of raw.edges){if(adj.has(a)&&adj.has(b)){adj.get(a).push([b,m]);adj.get(b).push([a,m]);}}\n      state.routingGraph={nodes,adj,snapCache:new Map(),sourceCache:new Map(),generatedAt:raw.generatedAt,profile:raw.profile};state.routingLocations=loc;state.routingReady=true;state.routingError=null;renderAll();\n    }catch(e){console.warn('Precision routing unavailable',e);state.routingError=String(e?.message||e);state.routingReady=false;renderAll();}\n  }\n\n`;

app=req(app,
"  function walkMinutes(a,b) {\n    const d = haversine(a,b);\n    if (d == null) return 7;\n    return Math.max(1, Math.ceil((d * Number(state.settings.routeFactor)) / Number(state.settings.walkSpeed)));\n  }",
"  function walkMinutes(a,b) {\n    const routed=precisionRouteMeters(a,b);\n    if(Number.isFinite(routed))return Math.max(1,Math.ceil(routed/Number(state.settings.walkSpeed)));\n    const d = haversine(a,b);\n    if (d == null) return 7;\n    return Math.max(1, Math.ceil((d * Number(state.settings.routeFactor)) / Number(state.settings.walkSpeed)));\n  }\n"+routingFns,
'precision routing functions');

app=req(app,
"  function pointForRide(ride) {\n    if (Number.isFinite(ride.lat) && Number.isFinite(ride.lon)) return { lat: ride.lat, lon: ride.lon, park: ride.park };",
"  function pointForRide(ride, purpose='entrance') {\n    const routed=precisionRoutingEnabled()?routingAttraction(ride.name)?.[purpose]:null;\n    if(routed&&Number.isFinite(routed.lat)&&Number.isFinite(routed.lon))return {lat:routed.lat,lon:routed.lon,park:ride.park,confidence:routed.confidence};\n    if (Number.isFinite(ride.lat) && Number.isFinite(ride.lon)) return { lat: ride.lat, lon: ride.lon, park: ride.park };",
'ride routing point');

app=req(app,
"    const from = currentPoint(), to = pointForRide(ride);\n    const walkTo = walkMinutes(from,to) + parkHopPenalty(fromPark,ride.park);",
"    const from = currentPoint(), to = pointForRide(ride,'entrance'), rideExit=pointForRide(ride,'exit');\n    const walkTo = walkMinutes(from,to) + parkHopPenalty(fromPark,ride.park);",
'ride entrance routing');

app=req(app,
"      const cPoint=areaPoint(commitment.area);",
"      const cPoint=pointForCommitment(commitment);",
'commitment routing point');
app=req(app,
"      walkOnward=walkMinutes(to,cPoint)+parkHopPenalty(ride.park,cPoint?.park);",
"      walkOnward=walkMinutes(rideExit,cPoint)+parkHopPenalty(ride.park,cPoint?.park);",
'ride exit onward routing');

app=req(app,
"  function allRecommendations(){const now=plannerNow(),c=nextCommitment(now);return state.rides.map(r=>evaluateRide(r,now,c)).filter(Boolean).sort((a,b)=>b.score-a.score);}",
"  function allRecommendations(){const now=plannerNow(),c=nextCommitment(now);prepareRoutingContext(c);return state.rides.map(r=>evaluateRide(r,now,c)).filter(Boolean).sort((a,b)=>b.score-a.score);}",
'prepare routing context');

app=req(app,
"      const meta=metaFor(ride.name), from=currentPoint(), to=pointForRide(ride);\n      const walkTo=walkMinutes(from,to)+parkHopPenalty(fromPark,ride.park);",
"      const meta=metaFor(ride.name), from=currentPoint(), to=pointForRide(ride,'entrance'), rideExit=pointForRide(ride,'exit');\n      const walkTo=walkMinutes(from,to)+parkHopPenalty(fromPark,ride.park);",
'diagnostic entrance');
app=req(app,
"      const dwellMinutes=experienceMinutes(meta), cPoint=areaPoint(commitment.area);",
"      const dwellMinutes=experienceMinutes(meta), cPoint=pointForCommitment(commitment);",
'diagnostic commitment');
app=req(app,
"      const walkOnward=walkMinutes(to,cPoint)+parkHopPenalty(ride.park,cPoint?.park);",
"      const walkOnward=walkMinutes(rideExit,cPoint)+parkHopPenalty(ride.park,cPoint?.park);",
'diagnostic exit');

app=req(app,
"    if(state.settings.mode==='balanced'&&x.commitmentMinutes<=30)bits.push('short total commitment');",
"    if(state.settings.mode==='balanced'&&x.commitmentMinutes<=30)bits.push('short total commitment');\n    if(precisionRoutingEnabled())bits.push('stroller-route walking estimate');",
'precision recommendation reason');

app=req(app,
"      $('#safeLine').textContent = 'Recommendations are not time-blocked outside the trip dates.';\n      return;",
"      $('#safeLine').textContent = 'Recommendations are not time-blocked outside the trip dates.';\n      const ub=$('#urgencyBadge');if(ub){ub.hidden=true;ub.className='urgency-badge';}\n      $('.hero').classList.remove('urgency-safe','urgency-tight','urgency-now');\n      return;",
'hero no anchor urgency');

app=req(app,
"    $('#countdown').textContent = mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins} min`;\n    $('#safeLine').textContent = `Target arrival ${parisTime(safeAt)}. The engine will reject any attraction that cannot finish and get you there by then.`;",
"    $('#countdown').textContent = mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins} min`;\n    const cPoint=pointForCommitment(c), directWalk=walkMinutes(currentPoint(),cPoint)+parkHopPenalty(currentPark(),cPoint?.park), directSlack=mins-directWalk;\n    const urgency=directSlack<=HARD_ANCHOR_MIN_SLACK?'now':directSlack<15?'tight':'safe';\n    const ub=$('#urgencyBadge');if(ub){ub.hidden=false;ub.className=`urgency-badge ${urgency}`;ub.textContent=urgency==='now'?'⛔ MOVE NOW':urgency==='tight'?'⚠ GETTING TIGHT':'✓ SAFE';}\n    $('.hero').classList.remove('urgency-safe','urgency-tight','urgency-now');$('.hero').classList.add(`urgency-${urgency}`);\n    $('#safeLine').textContent = `Target arrival ${parisTime(safeAt)} · about ${directWalk}m direct walk · ${directSlack}m direct-route slack. The engine rejects anything that cannot finish and get you there safely.`;",
'hero urgency');

app=req(app,
"    if (!recs.length) { box.innerHTML = '<div class=\"card empty\">Nothing with fresh, explicit OPEN data safely fits the current rules. Head toward the next anchor or relax the filters.</div>'; renderParkHopNote(all); return; }",
"    if (!recs.length) { const c=nextCommitment(plannerNow());let msg='Nothing with fresh, explicit OPEN data safely fits the current rules.';if(c){const cp=pointForCommitment(c),safeAt=new Date(parisDateTime(c.date,c.time).getTime()-bufferFor(c)*60000),mins=Math.max(0,Math.floor((safeAt-plannerNow())/60000)),walk=walkMinutes(currentPoint(),cp)+parkHopPenalty(currentPark(),cp?.park),slack=mins-walk;msg=slack<=HARD_ANCHOR_MIN_SLACK?`⛔ MOVE NOW · Head to ${c.name}. No attraction fits with a safe transfer margin.`:`No attraction fits safely. Start heading toward ${c.name} or enjoy the area without joining another queue.`;}box.innerHTML=`<div class=\"card empty ${msg.startsWith('⛔')?'move-now':''}\">${esc(msg)}</div>`; renderParkHopNote(all); return; }",
'no recommendation guidance');

app=req(app,
"      const tightTag=x.tightFit?'<span class=\"tag warn\">TIGHT FIT</span>':'';\n      return `<article class=\"card reco\"",
"      const tightTag=x.tightFit?'<span class=\"tag warn\">⚠ TIGHT FIT</span>':'';\n      const routeTag=precisionRoutingEnabled()?'<span class=\"tag good\">STROLLER ROUTE</span>':'';\n      return `<article class=\"card reco ${x.tightFit?'tight-fit':'safe-fit'}\"",
'tight card class');
app=req(app,
"${priorityTag}${disagreeTag}${hopTag}${agingTag}${tightTag}</div>",
"${priorityTag}${disagreeTag}${hopTag}${agingTag}${tightTag}${routeTag}</div>",
'route tag');

app=req(app,
"    $('#softPlansToggle').checked = !!state.settings.softPlans;\n    $('#previewToggle').checked = !!state.settings.preview;",
"    $('#softPlansToggle').checked = !!state.settings.softPlans;\n    const pr=$('#precisionRoutingToggle');if(pr){pr.checked=!!state.settings.precisionRouting;pr.disabled=sessionMode()==='LIVE';}\n    $('#previewToggle').checked = !!state.settings.preview;",
'sync routing toggle');

app=req(app,
"  function useGPS() {\n    if (!navigator.geolocation) return toast('This browser does not expose location.');",
"  function useGPS() {\n    if (!navigator.geolocation) return toast('This browser does not expose location.');",
'gps anchor');
const oldGps=app.match(/  function useGPS\(\) \{[\s\S]*?\n  \}\n\n  function feedDisagreementSummary/);
if(!oldGps)throw new Error('Missing GPS function block');
const newGps=`  function useGPS() {\n    if (!navigator.geolocation) return toast('This browser does not expose location.');\n    if(state.gpsWatchId!=null){navigator.geolocation.clearWatch(state.gpsWatchId);state.gpsWatchId=null;}\n    $('#gpsBtn').disabled=true;$('#gpsBtn').textContent='Locating...';let first=true;\n    state.gpsWatchId=navigator.geolocation.watchPosition(pos=>{\n      const accuracy=Number(pos.coords.accuracy||999),next={lat:pos.coords.latitude,lon:pos.coords.longitude,park:null};\n      if(!first&&accuracy>80&&Number(state.gpsAccuracy||999)<40)return;\n      const moved=state.gps?haversine(state.gps,next):Infinity,now=Date.now();state.gps=next;state.gpsAccuracy=accuracy;\n      const near=nearestArea(state.gps),inPark=gpsNearDLP();$('#gpsBtn').disabled=false;\n      if(inPark){$('#gpsBtn').textContent=\`GPS live · ±${'${Math.round(accuracy)}'}m\`;if(first)toast(\`LIVE GPS tracking near ${'${near.name}'}\`);}\n      else{$('#gpsBtn').textContent='GPS: outside DLP';if(first)toast(\`GPS is ${'${(gpsDistanceFromDLP()/1000).toFixed(1)}'} km from DLP. Staying in TEST mode.\`);navigator.geolocation.clearWatch(state.gpsWatchId);state.gpsWatchId=null;}\n      if(first||moved>=8||now-state.gpsLastRenderAt>=15000){state.gpsLastRenderAt=now;renderAll();}first=false;\n    },err=>{$('#gpsBtn').disabled=false;$('#gpsBtn').textContent='Use my location';toast(err.message||'Location permission failed.');if(state.gpsWatchId!=null){navigator.geolocation.clearWatch(state.gpsWatchId);state.gpsWatchId=null;}},{enableHighAccuracy:true,timeout:12000,maximumAge:5000});\n  }\n\n  function feedDisagreementSummary`;
app=app.replace(oldGps[0],newGps);

app=req(app,
"    $('#softPlansToggle').addEventListener('change',e=>{state.settings.softPlans=e.target.checked;save();renderAll();});\n    $('#previewToggle').addEventListener('change',e=>{state.settings.preview=e.target.checked;save();renderAll();});",
"    $('#softPlansToggle').addEventListener('change',e=>{state.settings.softPlans=e.target.checked;save();renderAll();});\n    $('#precisionRoutingToggle').addEventListener('change',e=>{state.settings.precisionRouting=e.target.checked;save();renderAll();});\n    $('#previewToggle').addEventListener('change',e=>{state.settings.preview=e.target.checked;save();renderAll();});",
'bind routing toggle');

app=req(app,
"      `Current park for routing: ${currentPark() || 'unknown'}`,",
"      `Current park for routing: ${currentPark() || 'unknown'}`,\n      `Routing model: ${precisionRoutingEnabled()?'precision stroller graph (TEST), exact entrance/exit where confidence allows':state.settings.precisionRouting&&!state.routingReady?`legacy estimate; precision data unavailable${state.routingError?` (${state.routingError})`:''}`:'legacy straight-line estimate'}`,",
'packet routing line');

app=app.replaceAll('DLP DISPATCHER STATUS v0.5.3','DLP DISPATCHER STATUS v0.6.0');
app=app.replaceAll("toast('v0.5.3 status packet copied. Paste it into ChatGPT.')","toast('v0.6.0 status packet copied. Paste it into ChatGPT.')");
app=req(app,
"  initLocationSelect(); bind(); renderAll(); refreshLive();",
"  initLocationSelect(); bind(); renderAll(); loadRoutingData(); refreshLive();",
'load routing startup');
write('app.js',app);

let index=read('index.html');
index=index.replaceAll('30 Oct to 2 Nov 2026 · v0.5.3','30 Oct to 2 Nov 2026 · v0.6.0');
index=index.replaceAll('styles.css?v=0.5.3','styles.css?v=0.6.0').replaceAll('app.js?v=0.5.3','app.js?v=0.6.0');
index=req(index,
'<div class="safe-line" id="safeLine">Recommendations are not time-blocked outside the trip dates.</div>',
'<div class="urgency-badge" id="urgencyBadge" hidden></div><div class="safe-line" id="safeLine">Recommendations are not time-blocked outside the trip dates.</div>',
'urgency badge');
index=req(index,
'<label class="switch-label"><input type="checkbox" id="softPlansToggle" /> Block time for soft plans</label></div></section>',
'<label class="switch-label"><input type="checkbox" id="softPlansToggle" /> Block time for soft plans</label><label class="switch-label"><input type="checkbox" id="precisionRoutingToggle" checked /> Precision routing (TEST · pushchair)</label></div></section>',
'precision control');
write('index.html',index);

let css=read('styles.css');
css += `\n/* v0.6 glanceable urgency */\n.urgency-badge{display:inline-flex;margin-top:12px;border:1px solid var(--line);border-radius:999px;padding:6px 10px;font-size:11px;font-weight:950;letter-spacing:.05em}.urgency-badge.safe{color:var(--good);border-color:rgba(101,211,154,.55);background:rgba(101,211,154,.08)}.urgency-badge.tight{color:var(--warn);border-color:rgba(243,201,105,.65);background:rgba(243,201,105,.1)}.urgency-badge.now{color:var(--bad);border-color:rgba(255,127,136,.72);background:rgba(255,127,136,.12)}.hero.urgency-safe{border-color:rgba(101,211,154,.35)}.hero.urgency-tight{border-color:rgba(243,201,105,.65);box-shadow:0 0 0 1px rgba(243,201,105,.12),var(--shadow)}.hero.urgency-now{border-color:rgba(255,127,136,.78);box-shadow:0 0 0 1px rgba(255,127,136,.18),var(--shadow)}.reco.tight-fit{border-color:rgba(243,201,105,.68);box-shadow:0 0 0 1px rgba(243,201,105,.08),var(--shadow)}.reco.safe-fit{border-color:rgba(101,211,154,.24)}.empty.move-now{color:#ffd5d8;border-color:rgba(255,127,136,.72);background:rgba(255,127,136,.10);font-weight:900}\n`;
write('styles.css',css);

let sw=read('sw.js');
sw=sw.replaceAll('dlp-dispatcher-v0.5.3','dlp-dispatcher-v0.6.0').replaceAll('styles.css?v=0.5.3','styles.css?v=0.6.0').replaceAll('app.js?v=0.5.3','app.js?v=0.6.0');
write('sw.js',sw);

write('README.md',`# DLP Dispatcher v0.6.0\n\nThis build adds the first precision-routing test layer while preserving the v0.5.3 scoring and booking safety rules.\n\n## Precision routing\n- TEST-only feature flag. LIVE recommendations continue to fall back to the proven legacy model.\n- Loads a locally hosted OpenStreetMap pedestrian graph generated for the Disneyland Paris resort.\n- Pushchair profile excludes steps and explicitly private/no-foot routes.\n- Uses curated/strong or candidate queue entrances where public map evidence supports them, otherwise falls back to ThemeParks.wiki attraction coordinates.\n- Routes onward travel from attraction exit data where available, with safe POI fallback.\n- Fixed-point restaurants use attraction-level/entrance-level coordinates instead of land centres where available.\n- Continuous high-accuracy GPS tracking starts in-resort after Use my location; poor fixes are damped.\n\n## Glanceable urgency\n- Green SAFE, yellow GETTING TIGHT / TIGHT FIT, red MOVE NOW.\n- The next-anchor card now reports direct walking time and remaining direct-route slack.\n- Empty recommendation state becomes an explicit MOVE NOW instruction when the family needs to head to the anchor immediately.\n\n## Safety\nPrecision routing is deliberately TEST-only until route comparisons are validated. The v0.5.3 hard-anchor residual-slack rule remains intact.\n`);
console.log('v0.6.0 precision routing patch applied');
