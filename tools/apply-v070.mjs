import fs from 'node:fs';

const read = p => fs.readFileSync(p,'utf8');
const write = (p,s) => fs.writeFileSync(p,s);
function replaceOnce(s, oldText, newText, label){
  if(!s.includes(oldText)) throw new Error(`Missing patch anchor: ${label}`);
  return s.replace(oldText,newText);
}

let app = read('app.js');
let html = read('index.html');
let css = read('styles.css');
let sw = read('sw.js');
let readme = read('README.md');

app = app.replaceAll('v0.6.1','v0.7.0');
html = html.replaceAll('v0.6.1','v0.7.0');
sw = sw.replaceAll('v0.6.1','v0.7.0');
readme = readme.replace('# DLP Dispatcher v0.6.0','# DLP Dispatcher v0.7.0').replace('# DLP Dispatcher v0.6.1','# DLP Dispatcher v0.7.0');

app = replaceOnce(app,
`  const HARD_ANCHOR_TIGHT_SLACK = 10;\n`,
`  const HARD_ANCHOR_TIGHT_SLACK = 10;\n  const SHOW_LOCATIONS = {\n    tales: { name: 'Disney Tales of Magic reserved viewing', area: 'Frontierland', locationNote: 'reserved area by the Frontierland entrance' },\n    cascade: { name: 'Disney Cascade of Lights reserved viewing', area: 'World of Frozen', locationNote: 'reserved terrace below The Regal View Restaurant & Lounge' }\n  };\n  const DYNAMIC_ITEM_BUFFERS = { premier: 5, show: 20, other: 10 };\n`, 'constants');

app = replaceOnce(app,
`    notNow: loadJSON('dlpNotNow', {}),\n    settings: Object.assign({`,
`    notNow: loadJSON('dlpNotNow', {}),\n    dynamicCommitments: loadJSON('dlpDynamicCommitments', []),\n    settings: Object.assign({`, 'dynamic state');

app = replaceOnce(app,
`    localStorage.setItem('dlpNotNow', JSON.stringify(state.notNow));\n    localStorage.setItem('dlpSettings', JSON.stringify(state.settings));`,
`    localStorage.setItem('dlpNotNow', JSON.stringify(state.notNow));\n    localStorage.setItem('dlpDynamicCommitments', JSON.stringify(state.dynamicCommitments));\n    localStorage.setItem('dlpSettings', JSON.stringify(state.settings));`, 'dynamic save');

app = replaceOnce(app,
`  function routingAttraction(name){return state.routingLocations?.attractions?.[keyFor(name)]||null;}\n  function pointForCommitment(c){const p=precisionRoutingEnabled()?state.routingLocations?.commitments?.[c?.id]?.entrance:null;return p?{lat:p.lat,lon:p.lon,park:areaPoint(c.area)?.park}:areaPoint(c?.area);}`,
`  function routingAttraction(name){return state.routingLocations?.attractions?.[keyFor(name)]||null;}\n  function pointForCommitment(c){\n    if(!c)return null;\n    if(c.kind==='premier'&&c.rideKey){\n      const ride=state.rides.find(r=>keyFor(r.name)===c.rideKey);\n      if(ride)return pointForRide(ride,'entrance');\n    }\n    if(c.point&&Number.isFinite(Number(c.point.lat))&&Number.isFinite(Number(c.point.lon)))return {lat:Number(c.point.lat),lon:Number(c.point.lon),park:c.point.park||areaPoint(c.area)?.park};\n    const p=precisionRoutingEnabled()?state.routingLocations?.commitments?.[c.id]?.entrance:null;\n    return p?{lat:p.lat,lon:p.lon,park:areaPoint(c.area)?.park}:areaPoint(c.area);\n  }`, 'commitment routing');

const oldTimeBlock = `  function bufferFor(c) { return c.kind === 'train' ? Number(state.settings.trainBuffer) : Number(state.settings.mealBuffer); }\n  function nextCommitment(now = plannerNow()) {\n    const day = parisDateKey(now);\n    if (day < '2026-10-30' || day > '2026-11-02') return null;\n    const candidates = COMMITMENTS.filter(c => (c.hard || state.settings.softPlans) && parisDateTime(c.date,c.time) > now);\n    return candidates.sort((a,b)=>parisDateTime(a.date,a.time)-parisDateTime(b.date,b.time))[0] || null;\n  }`;
const newTimeBlock = `  function allCommitments(){ return [...COMMITMENTS,...state.dynamicCommitments]; }\n  function commitmentDisplayTime(c){ return c?.kind==='premier'&&c.endTime ? \`${'${c.time}'}–${'${c.endTime}'}\` : c?.time; }\n  function commitmentTargetClock(c){ return c?.kind==='premier'&&c.endTime ? c.endTime : c?.time; }\n  function commitmentDateTime(c){ return parisDateTime(c.date,commitmentTargetClock(c)); }\n  function bufferFor(c) {\n    const custom=Number(c?.buffer);\n    if(Number.isFinite(custom))return custom;\n    if(c?.kind==='train')return Number(state.settings.trainBuffer);\n    if(c?.kind==='premier')return DYNAMIC_ITEM_BUFFERS.premier;\n    if(c?.kind==='show')return DYNAMIC_ITEM_BUFFERS.show;\n    if(c?.kind==='other')return DYNAMIC_ITEM_BUFFERS.other;\n    return Number(state.settings.mealBuffer);\n  }\n  function nextCommitment(now = plannerNow()) {\n    const day = parisDateKey(now);\n    if (day < '2026-10-30' || day > '2026-11-02') return null;\n    const candidates = allCommitments().filter(c => (c.hard || state.settings.softPlans) && commitmentDateTime(c) > now);\n    return candidates.sort((a,b)=>commitmentDateTime(a)-commitmentDateTime(b))[0] || null;\n  }`;
app = replaceOnce(app,oldTimeBlock,newTimeBlock,'commitment timing');

app = app.replaceAll('parisDateTime(commitment.date,commitment.time)','commitmentDateTime(commitment)');
app = app.replaceAll('parisDateTime(c.date,c.time)','commitmentDateTime(c)');

app = replaceOnce(app,
`    $('#nextMeta').textContent = \`${'${fmtDate(c.date)}'} · ${'${c.time}'} · ${'${c.area}'}${'${c.hard?\'\':\' · soft plan\'}'}\`;`,
`    const timeMeta=c.kind==='premier'?\`Premier Access ${'${commitmentDisplayTime(c)}'}\`:commitmentDisplayTime(c);\n    $('#nextMeta').textContent = \`${'${fmtDate(c.date)}'} · ${'${timeMeta}'} · ${'${c.area}'}${'${c.locationNote?` · ${c.locationNote}`:\'\'}'}${'${c.hard?\'\':\' · soft plan\'}'}\`;`, 'hero metadata');

app = replaceOnce(app,
`    $('#safeLine').textContent = \`Target arrival ${'${parisTime(safeAt)}'} · about ${'${directWalk}'}m direct walk · ${'${directSlack}'}m direct-route slack. The engine rejects anything that cannot finish and get you there safely.\`;`,
`    const targetLabel=c.kind==='premier'?'Latest safe arrival':'Target arrival';\n    $('#safeLine').textContent = \`${'${targetLabel}'} ${'${parisTime(safeAt)}'} · about ${'${directWalk}'}m direct walk · ${'${directSlack}'}m direct-route slack. The engine rejects anything that cannot finish and get you there safely.\`;`, 'hero safe line');

app = replaceOnce(app,
`      const anchorEvidence = state.routingLocations?.commitments?.[commitment.id]?.entrance;`,
`      const anchorEvidence = commitment.kind==='premier' ? routingAttraction(commitment.rideName)?.entrance : state.routingLocations?.commitments?.[commitment.id]?.entrance;`, 'routing diagnostic dynamic anchor');

app = replaceOnce(app,
`      commitmentLine = \`Next fixed point: ${'${c.name}'} at ${'${c.time}'}; target arrival ${'${parisTime(safeAt)}'}; area ${'${c.area}'}; ${'${anchorType}'}; buffer ${'${appliedBuffer}'}m${'${residual}'}\`;`,
`      const displayTime=commitmentDisplayTime(c), timing=c.kind==='premier'?\`window ${'${displayTime}'}; latest safe arrival ${'${parisTime(safeAt)}'}\`:\`at ${'${displayTime}'}; target arrival ${'${parisTime(safeAt)}'}\`;\n      commitmentLine = \`Next fixed point: ${'${c.name}'} ${'${timing}'}; area ${'${c.area}'}; ${'${anchorType}'}; buffer ${'${appliedBuffer}'}m${'${residual}'}\`;`, 'packet commitment line');

app = replaceOnce(app,
`      safeMinutesLine,\n      \`Top engine picks:`,
`      safeMinutesLine,\n      \`Timed items: ${'${state.dynamicCommitments.length ? state.dynamicCommitments.map(x=>`${x.name} (${fmtDate(x.date)} ${commitmentDisplayTime(x)})`).join(\' | \') : \'none\'}'}\`,\n      \`Top engine picks:`, 'packet timed items');

const scheduleRegex = /  function renderSchedule\(\) \{[\s\S]*?\n  \}\n\n  function renderSourceAge\(\) \{/;
if(!scheduleRegex.test(app)) throw new Error('Missing renderSchedule block');
const scheduleReplacement = `  function dynamicKindLabel(c){ return c.kind==='premier'?'PREMIER':c.kind==='show'?'SHOW':c.kind==='other'?'TIMED':''; }\n  function populateTimedRideOptions(){\n    const dl=$('#rideOptions');if(!dl)return;\n    dl.innerHTML=[...state.rides].sort((a,b)=>a.name.localeCompare(b.name)).map(r=>\`<option value="${'${esc(r.name)}'}"></option>\`).join('');\n  }\n  function updateTimedForm(){\n    const type=$('#timedType')?.value||'premier';\n    $('#timedPremierFields').hidden=type!=='premier';\n    $('#timedShowFields').hidden=type!=='show';\n    $('#timedOtherFields').hidden=type!=='other';\n    const help=$('#timedHelp');if(help)help.textContent=type==='premier'?'Premier Access uses the end of the Disney time window as a hard deadline, with a 5-minute arrival margin.':type==='show'?'Reserved viewing is treated as a hard show-time commitment with a 20-minute arrival margin.':'Other timed items use a 10-minute arrival margin.';\n  }\n  function addTimedItem(){\n    const type=$('#timedType').value,date=$('#timedDate').value,id=\`dyn-${'${Date.now().toString(36)}'}\`;\n    let item={id,date,hard:true,dynamic:true,kind:type};\n    if(type==='premier'){\n      const entered=$('#timedRide').value.trim(),start=$('#timedStart').value,end=$('#timedEnd').value;\n      const ride=state.rides.find(r=>keyFor(r.name)===keyFor(entered))||state.rides.find(r=>norm(entered).length>3&&norm(r.name).includes(norm(entered)));\n      if(!ride)return toast('Pick a ride from the current attraction list.');\n      if(!start||!end)return toast('Add both the start and end of the Premier Access window.');\n      if(end<=start)return toast('Premier Access end time must be after the start time.');\n      const area=ride.area||metaFor(ride.name).area||currentPark();\n      item={...item,name:\`${'${ride.name}'} · Premier Access\`,rideName:ride.name,rideKey:keyFor(ride.name),area,time:start,endTime:end,buffer:DYNAMIC_ITEM_BUFFERS.premier};\n    }else if(type==='show'){\n      const preset=SHOW_LOCATIONS[$('#timedShow').value],time=$('#timedShowTime').value;\n      if(!preset||!time)return toast('Choose the show and time.');\n      item={...item,...preset,time,buffer:DYNAMIC_ITEM_BUFFERS.show};\n    }else{\n      const name=$('#timedOtherName').value.trim(),area=$('#timedOtherArea').value,time=$('#timedOtherTime').value;\n      if(!name||!area||!time)return toast('Add a name, area and time.');\n      item={...item,name,area,time,buffer:DYNAMIC_ITEM_BUFFERS.other};\n    }\n    state.dynamicCommitments.push(item);save();renderAll();\n    $('#timedDetails').open=false;\n    if(type==='premier'){$('#timedRide').value='';$('#timedStart').value='';$('#timedEnd').value='';}\n    else if(type==='other'){$('#timedOtherName').value='';$('#timedOtherTime').value='';}\n    toast('Timed item added and protected.');\n  }\n  function removeTimedItem(id){\n    state.dynamicCommitments=state.dynamicCommitments.filter(x=>x.id!==id);save();renderAll();toast('Timed item removed.');\n  }\n  function renderSchedule() {\n    const groups = {};\n    allCommitments().sort((a,b)=>commitmentDateTime(a)-commitmentDateTime(b)).forEach(c => (groups[c.date] ||= []).push(c));\n    $('#scheduleList').innerHTML = Object.entries(groups).map(([date,items])=>\`<div class="schedule-day"><div class="schedule-date">${'${fmtDate(date)}'}</div>${'${items.map(c=>{const t=commitmentDisplayTime(c),kind=dynamicKindLabel(c),note=c.locationNote?` · ${c.locationNote}`:\'\';return `<div class="schedule-item ${c.dynamic?\'dynamic\':\'\'}"><strong>${t}</strong><span>${esc(c.name)} · ${esc(c.area)}${esc(note)}</span><span class="schedule-badges">${kind?`<span class="timed-chip">${kind}</span>`:c.hard?\'\':\'<span class="soft">SOFT</span>\'}${c.dynamic?`<button class="remove-timed" data-remove-timed="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">×</button>`:\'\'}</span></div>`;}).join(\'\')}'}</div>\`).join('');\n    $$('[data-remove-timed]').forEach(b=>b.addEventListener('click',()=>removeTimedItem(b.dataset.removeTimed)));\n    populateTimedRideOptions();\n  }\n\n  function renderSourceAge() {`;
app = app.replace(scheduleRegex,scheduleReplacement);

app = replaceOnce(app,
`    $('#softPlansToggle').addEventListener('change',e=>{state.settings.softPlans=e.target.checked;save();renderAll();});`,
`    $('#softPlansToggle').addEventListener('change',e=>{state.settings.softPlans=e.target.checked;save();renderAll();});\n    $('#timedType').addEventListener('change',updateTimedForm);\n    $('#addTimedItem').addEventListener('click',addTimedItem);`, 'timed bind');

app = replaceOnce(app,
`  initLocationSelect(); bind(); renderAll(); loadRoutingData(); refreshLive();`,
`  initLocationSelect();\n  const timedArea=$('#timedOtherArea');if(timedArea)timedArea.innerHTML=Object.entries(AREAS).filter(([,p])=>isThemePark(p.park)).map(([name])=>\`<option value="${'${esc(name)}'}">${'${esc(name)}'}</option>\`).join('');\n  const timedDate=$('#timedDate');if(timedDate)timedDate.value=state.settings.previewDate||'2026-10-30';\n  bind(); updateTimedForm(); renderAll(); loadRoutingData(); refreshLive();`, 'timed init');

html = replaceOnce(html,
`<div><div class="label">NEXT FIXED POINT</div>`,
`<div><div class="label">NEXT TIMED POINT</div>`, 'hero label');

html = replaceOnce(html,
`    <section><div class="section-heading"><div><div class="eyebrow">LIVE BOARD</div><h2>All waits</h2></div><input class="search" id="searchInput" type="search" placeholder="Search attractions" /></div><div class="filter-row">`,
`    <section><div class="section-heading waits-heading"><div><div class="eyebrow">LIVE BOARD</div><h2>All waits</h2></div><input class="search" id="searchInput" type="search" placeholder="Search attractions" /></div><div class="filter-row">`, 'wait heading');

html = replaceOnce(html,
`    <section class="card"><div class="section-heading compact"><div><div class="eyebrow">ANCHORS</div><h2>Your schedule</h2></div></div><div id="scheduleList" class="schedule-list"></div><p class="muted small">Meal target arrival is 15 minutes early. Train target arrival is 35 minutes early. These can be changed in Settings.</p></section>`,
`    <section class="card"><div class="section-heading compact"><div><div class="eyebrow">ANCHORS</div><h2>Your schedule</h2></div></div><div id="scheduleList" class="schedule-list"></div><details class="timed-add" id="timedDetails"><summary>+ Add timed item</summary><div class="timed-form"><div class="timed-grid"><label><span>Type</span><select id="timedType"><option value="premier">Premier Access</option><option value="show">Show / reserved viewing</option><option value="other">Other timed item</option></select></label><label><span>Date</span><select id="timedDate"><option value="2026-10-30">Fri 30 Oct</option><option value="2026-10-31">Sat 31 Oct</option><option value="2026-11-01">Sun 1 Nov</option><option value="2026-11-02">Mon 2 Nov</option></select></label></div><div id="timedPremierFields"><label><span>Attraction</span><input id="timedRide" type="text" list="rideOptions" autocomplete="off" placeholder="Start typing a ride" /><datalist id="rideOptions"></datalist></label><div class="timed-grid"><label><span>Window starts</span><input id="timedStart" type="time" /></label><label><span>Window ends</span><input id="timedEnd" type="time" /></label></div></div><div id="timedShowFields" hidden><label><span>Reserved viewing</span><select id="timedShow"><option value="tales">Disney Tales of Magic · Frontierland entrance</option><option value="cascade">Disney Cascade of Lights · Regal View terrace</option></select></label><label><span>Show time</span><input id="timedShowTime" type="time" /></label></div><div id="timedOtherFields" hidden><label><span>Name</span><input id="timedOtherName" type="text" autocomplete="off" placeholder="Character slot, show, meet-up…" /></label><div class="timed-grid"><label><span>Area</span><select id="timedOtherArea"></select></label><label><span>Time</span><input id="timedOtherTime" type="time" /></label></div></div><p class="muted small" id="timedHelp"></p><button class="primary" id="addTimedItem" type="button">Save timed item</button></div></details><p class="muted small schedule-note">Meals use a 15-minute arrival buffer, the train 35 minutes, Premier Access 5 minutes before the end of its window, and reserved viewing 20 minutes before show time.</p></section>`, 'timed form');

css += `\n\n/* v0.7 timed commitments + iPhone input containment */\nhtml,body{max-width:100%;overflow-x:hidden}input,select{min-width:0;max-width:100%}input[type=time]{display:block;width:100%;min-width:0;max-width:100%;font-size:16px}.preview-grid>*{min-width:0}.timed-add{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}.timed-add summary{color:#c9d6ff}.timed-form{display:grid;gap:12px}.timed-form label{display:grid;gap:6px;min-width:0;color:var(--muted);font-size:11px;font-weight:700}.timed-form input,.timed-form select{width:100%;padding:11px 12px;font-size:16px}.timed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.timed-grid>*{min-width:0}.schedule-badges{display:flex;gap:6px;align-items:center;justify-content:flex-end}.timed-chip{color:#b9ccff;font-size:9px;border:1px solid rgba(122,162,255,.45);padding:3px 6px;border-radius:999px;white-space:nowrap}.remove-timed{padding:2px 7px;border-radius:999px;color:var(--bad);font-size:14px;line-height:1.2}.schedule-item.dynamic{padding:8px 0}.schedule-note{margin-top:12px;margin-bottom:0}@media(max-width:720px){.waits-heading{display:grid;grid-template-columns:minmax(0,1fr);align-items:start}.waits-heading .search{width:100%;max-width:100%;font-size:16px;margin-top:10px}.timed-grid{grid-template-columns:1fr}.preview-panel{left:auto;right:auto;max-width:calc(100vw - 28px)}.preview-grid label,.timed-form label{min-width:0}}\n`;

sw = sw.replaceAll('dlp-dispatcher-v0.6.0','dlp-dispatcher-v0.7.0');

if(!readme.includes('## Timed commitments')) readme += `\n\n## Timed commitments\n- Add Premier Access One windows during the day. The end of the window is treated as a hard deadline with a 5-minute arrival margin.\n- Add reserved viewing for Disney Tales of Magic or Disney Cascade of Lights. These use a 20-minute arrival margin and route to the relevant park area.\n- Add arbitrary hard timed items with an area and time.\n- Dynamic timed items persist locally and can be removed from the schedule.\n\n## Mobile layout fixes\n- The ride search field stacks full-width on narrow screens so iOS focus no longer pans the whole app sideways.\n- Time inputs and form controls are constrained to their grid cells to prevent iOS intrinsic-width overflow.\n`;

write('app.js',app);write('index.html',html);write('styles.css',css);write('sw.js',sw);write('README.md',readme);
console.log('Applied DLP Dispatcher v0.7.0 timed commitments and mobile input fixes.');
