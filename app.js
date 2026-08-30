(() => {
  'use strict';

  const TPW_DESTINATION = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
  const TPW_BASE = 'https://api.themeparks.wiki/v1';
  const QT_PARKS = [
    { id: 4, park: 'Disneyland Park' },
    { id: 28, park: 'Disney Adventure World' }
  ];
  const REFRESH_MS = 5 * 60 * 1000;

  const AREAS = {
    'Disneyland Park entrance': { lat: 48.87070, lon: 2.77972, park: 'Disneyland Park' },
    'Main Street U.S.A.': { lat: 48.87105, lon: 2.77974, park: 'Disneyland Park' },
    'Frontierland': { lat: 48.87155, lon: 2.77695, park: 'Disneyland Park' },
    'Adventureland': { lat: 48.87225, lon: 2.77575, park: 'Disneyland Park' },
    'Fantasyland': { lat: 48.87325, lon: 2.77810, park: 'Disneyland Park' },
    'Discoveryland': { lat: 48.87275, lon: 2.78205, park: 'Disneyland Park' },
    'Disney Adventure World entrance': { lat: 48.86755, lon: 2.77955, park: 'Disney Adventure World' },
    'Production Courtyard': { lat: 48.86755, lon: 2.78055, park: 'Disney Adventure World' },
    'Marvel Avengers Campus': { lat: 48.86675, lon: 2.78165, park: 'Disney Adventure World' },
    'Worlds of Pixar': { lat: 48.86785, lon: 2.78305, park: 'Disney Adventure World' },
    'World of Frozen': { lat: 48.86900, lon: 2.78535, park: 'Disney Adventure World' },
    'Marne-la-Vallée Chessy station': { lat: 48.87052, lon: 2.78278, park: 'station' }
  };

  const COMMITMENTS = [
    { id: 'agrabah', date: '2026-10-30', time: '13:30', name: 'Agrabah Café', area: 'Adventureland', kind: 'meal', hard: true },
    { id: 'walts', date: '2026-10-30', time: '18:30', name: "Walt's", area: 'Main Street U.S.A.', kind: 'meal', hard: true },
    { id: 'pym', date: '2026-10-31', time: '12:30', name: 'PYM Kitchen', area: 'Marvel Avengers Campus', kind: 'meal', hard: true },
    { id: 'silver', date: '2026-10-31', time: '18:30', name: 'Silver Spur Steakhouse', area: 'Frontierland', kind: 'meal', hard: true },
    { id: 'nordic', date: '2026-11-01', time: '13:00', name: 'Nordic Crowns Tavern', area: 'World of Frozen', kind: 'meal', hard: false },
    { id: 'remy', date: '2026-11-01', time: '18:30', name: 'Bistrot Chez Rémy', area: 'Worlds of Pixar', kind: 'meal', hard: true },
    { id: 'train', date: '2026-11-02', time: '18:50', name: 'Train from Marne-la-Vallée Chessy', area: 'Marne-la-Vallée Chessy station', kind: 'train', hard: true }
  ];

  const BASELINES = [
    ['peter pan', 54], ['big thunder', 48], ['autopia', 37], ['buzz lightyear', 36], ['orbitron', 35],
    ['hyperspace mountain', 30], ['dumbo', 29], ['pinocchio', 22], ['indiana jones', 20], ['pirates of the caribbean', 18],
    ['phantom manor', 13], ['star tours', 13], ['small world', 11], ['crush', 71], ['frozen ever after', 63],
    ['ratatouille', 50], ['spider-man', 40], ['spiderman', 40], ['toy soldiers', 40], ['rc racer', 37],
    ['tower of terror', 36], ['flight force', 21], ['cars quatre roues', 13], ['cars road trip', 13], ['tapis volants', 13],
    ['slinky', 13], ['raiponce', 11], ['tangled', 11]
  ];

  const META = [
    { p: 'big thunder', area: 'Frontierland', duration: 5, indoor: false },
    { p: 'phantom manor', area: 'Frontierland', duration: 8, indoor: true },
    { p: 'pirates of the caribbean', area: 'Adventureland', duration: 10, indoor: true },
    { p: 'indiana jones', area: 'Adventureland', duration: 4, indoor: false },
    { p: 'peter pan', area: 'Fantasyland', duration: 4, indoor: true },
    { p: 'pinocchio', area: 'Fantasyland', duration: 4, indoor: true },
    { p: 'blanche-neige', area: 'Fantasyland', duration: 4, indoor: true },
    { p: 'snow white', area: 'Fantasyland', duration: 4, indoor: true },
    { p: 'small world', area: 'Fantasyland', duration: 11, indoor: true },
    { p: 'dumbo', area: 'Fantasyland', duration: 3, indoor: false },
    { p: 'tea cups', area: 'Fantasyland', duration: 3, indoor: false },
    { p: 'hyperspace mountain', area: 'Discoveryland', duration: 5, indoor: true },
    { p: 'buzz lightyear', area: 'Discoveryland', duration: 5, indoor: true },
    { p: 'star tours', area: 'Discoveryland', duration: 7, indoor: true },
    { p: 'orbitron', area: 'Discoveryland', duration: 4, indoor: false },
    { p: 'autopia', area: 'Discoveryland', duration: 7, indoor: false },
    { p: 'nautilus', area: 'Discoveryland', duration: 8, indoor: true },
    { p: 'tower of terror', area: 'Production Courtyard', duration: 6, indoor: true },
    { p: 'flight force', area: 'Marvel Avengers Campus', duration: 5, indoor: true },
    { p: 'spider-man', area: 'Marvel Avengers Campus', duration: 7, indoor: true },
    { p: 'spiderman', area: 'Marvel Avengers Campus', duration: 7, indoor: true },
    { p: 'crush', area: 'Worlds of Pixar', duration: 5, indoor: true },
    { p: 'ratatouille', area: 'Worlds of Pixar', duration: 7, indoor: true },
    { p: 'rc racer', area: 'Worlds of Pixar', duration: 4, indoor: false },
    { p: 'toy soldiers', area: 'Worlds of Pixar', duration: 5, indoor: false },
    { p: 'slinky', area: 'Worlds of Pixar', duration: 4, indoor: false },
    { p: 'cars quatre roues', area: 'Worlds of Pixar', duration: 4, indoor: false },
    { p: 'cars road trip', area: 'Worlds of Pixar', duration: 8, indoor: false },
    { p: 'tapis volants', area: 'Worlds of Pixar', duration: 4, indoor: false },
    { p: 'frozen ever after', area: 'World of Frozen', duration: 6, indoor: true },
    { p: 'raiponce', area: 'World of Frozen', duration: 4, indoor: false },
    { p: 'tangled', area: 'World of Frozen', duration: 4, indoor: false }
  ];

  const state = {
    rides: [],
    entities: [],
    source: null,
    sourceUpdated: null,
    gps: null,
    activeFilter: 'all',
    search: '',
    priorities: loadJSON('dlpPriorities', {}),
    done: loadJSON('dlpDone', {}),
    settings: Object.assign({
      mode: 'balanced', singleRider: false, softPlans: false,
      mealBuffer: 15, trainBuffer: 35, walkSpeed: 55, routeFactor: 1.25,
      preview: false, previewDate: '2026-10-30', previewTime: '17:00', location: 'Disneyland Park entrance'
    }, loadJSON('dlpSettings', {}))
  };

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }
  function save() {
    localStorage.setItem('dlpPriorities', JSON.stringify(state.priorities));
    localStorage.setItem('dlpDone', JSON.stringify(state.done));
    localStorage.setItem('dlpSettings', JSON.stringify(state.settings));
  }

  function norm(s = '') {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[™®©*]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function keyFor(name) { return norm(name).replace(/ single rider$/,''); }
  function baselineFor(name) {
    const n = norm(name);
    const hit = BASELINES.find(([p]) => n.includes(p));
    return hit ? hit[1] : 25;
  }
  function metaFor(name) {
    const n = norm(name);
    const hit = META.find(x => n.includes(x.p));
    return hit || { area: null, duration: 5, indoor: false };
  }
  function areaPoint(area) { return area && AREAS[area] ? AREAS[area] : null; }

  function haversine(a,b) {
    if (!a || !b) return null;
    const R = 6371000, toRad = x => x * Math.PI / 180;
    const dLat = toRad(b.lat-a.lat), dLon = toRad(b.lon-a.lon);
    const q = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(q));
  }
  function walkMinutes(a,b) {
    const d = haversine(a,b);
    if (d == null) return 7;
    return Math.max(1, Math.ceil((d * Number(state.settings.routeFactor)) / Number(state.settings.walkSpeed)));
  }
  function parkHopPenalty(fromPark, toPark) {
    return fromPark && toPark && fromPark !== toPark && fromPark !== 'station' && toPark !== 'station' ? 8 : 0;
  }
  function pointForRide(ride) {
    if (Number.isFinite(ride.lat) && Number.isFinite(ride.lon)) return { lat: ride.lat, lon: ride.lon, park: ride.park };
    const m = metaFor(ride.name);
    return areaPoint(m.area) || (ride.park === 'Disney Adventure World' ? areaPoint('Disney Adventure World entrance') : areaPoint('Disneyland Park entrance'));
  }
  function currentPoint() {
    if (state.gps) return state.gps;
    return areaPoint(state.settings.location) || areaPoint('Disneyland Park entrance');
  }
  function currentPark() {
    if (state.gps) return nearestArea(state.gps).park;
    return (areaPoint(state.settings.location) || {}).park;
  }
  function nearestArea(point) {
    return Object.entries(AREAS).map(([name,p]) => ({name, ...p, d:haversine(point,p)})).sort((a,b)=>a.d-b.d)[0];
  }

  function parisDateTime(date, time) { return new Date(`${date}T${time}:00+01:00`); }
  function plannerNow() {
    if (state.settings.preview) return parisDateTime(state.settings.previewDate, state.settings.previewTime);
    return new Date();
  }
  function parisDateKey(d) {
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  }
  function parisTime(d) {
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function fmtDate(date) {
    return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00+01:00`));
  }
  function bufferFor(c) { return c.kind === 'train' ? Number(state.settings.trainBuffer) : Number(state.settings.mealBuffer); }
  function nextCommitment(now = plannerNow()) {
    const day = parisDateKey(now);
    if (day < '2026-10-30' || day > '2026-11-02') return null;
    const candidates = COMMITMENTS.filter(c => (c.hard || state.settings.softPlans) && parisDateTime(c.date,c.time) > now);
    return candidates.sort((a,b)=>parisDateTime(a.date,a.time)-parisDateTime(b.date,b.time))[0] || null;
  }

  async function fetchThemeParks() {
    const [liveRes, childRes] = await Promise.all([
      fetch(`${TPW_BASE}/entity/${TPW_DESTINATION}/live`, { cache:'no-store' }),
      fetch(`${TPW_BASE}/entity/${TPW_DESTINATION}/children`, { cache:'force-cache' }).catch(()=>null)
    ]);
    if (!liveRes.ok) throw new Error(`ThemeParks.wiki ${liveRes.status}`);
    const live = await liveRes.json();
    const children = childRes && childRes.ok ? await childRes.json() : { children: [] };
    const entities = children.children || [];
    const entityMap = new Map(entities.map(e => [e.id, e]));
    const parkEntities = entities.filter(e => e.entityType === 'PARK');

    const getPark = ent => {
      let x = ent, loops = 0;
      while (x && loops++ < 8) {
        if (x.entityType === 'PARK') return canonicalPark(x.name);
        x = entityMap.get(x.parentId);
      }
      return inferPark(ent?.name || '');
    };

    const rides = (live.liveData || []).filter(x => x.entityType === 'ATTRACTION').map(x => {
      const ent = entityMap.get(x.entityId || x.id) || {};
      const standby = x.queue?.STANDBY?.waitTime;
      const single = x.queue?.SINGLE_RIDER?.waitTime;
      const loc = ent.location || {};
      return {
        id: x.entityId || x.id || keyFor(x.name), name: x.name, park: getPark(ent), status: x.status || 'UNKNOWN',
        wait: Number.isFinite(standby) ? standby : null, singleRiderWait: Number.isFinite(single) ? single : null,
        lastUpdated: x.lastUpdated || null, lat: Number(loc.latitude), lon: Number(loc.longitude)
      };
    });
    return { rides, entities, source: 'ThemeParks.wiki', updated: newestTimestamp(rides) };
  }

  async function fetchQueueTimes() {
    const results = await Promise.all(QT_PARKS.map(async p => {
      const res = await fetch(`https://queue-times.com/parks/${p.id}/queue_times.json`, { cache:'no-store' });
      if (!res.ok) throw new Error(`Queue-Times ${res.status}`);
      const data = await res.json();
      const raw = [...(data.rides || []), ...(data.lands || []).flatMap(l => l.rides || [])];
      return raw.map(r => ({...r, park:p.park}));
    }));
    const all = results.flat();
    const map = new Map();
    for (const r of all) {
      const isSingle = /single rider/i.test(r.name);
      const k = keyFor(r.name);
      if (isSingle) {
        const main = map.get(k) || { id:`qt-${k}`, name:r.name.replace(/\s*single rider\s*/i,''), park:r.park, status:'UNKNOWN', wait:null };
        main.singleRiderWait = r.is_open ? Number(r.wait_time) : null;
        main.lastUpdated = r.last_updated;
        map.set(k, main);
      } else {
        const main = map.get(k) || {};
        Object.assign(main, { id:`qt-${k}`, name:r.name, park:r.park, status:r.is_open ? 'OPERATING' : 'CLOSED', wait:r.is_open ? Number(r.wait_time) : null, lastUpdated:r.last_updated });
        map.set(k, main);
      }
    }
    const rides = [...map.values()];
    return { rides, entities: [], source: 'Queue-Times.com fallback', updated: newestTimestamp(rides) };
  }

  function newestTimestamp(rides) {
    const ts = rides.map(r => r.lastUpdated && new Date(r.lastUpdated)).filter(d => d && !isNaN(d));
    return ts.length ? new Date(Math.max(...ts.map(d=>d.getTime()))) : new Date();
  }
  function canonicalPark(name='') {
    const n = norm(name);
    if (n.includes('adventure world') || n.includes('studios')) return 'Disney Adventure World';
    if (n.includes('disneyland park')) return 'Disneyland Park';
    return inferPark(name);
  }
  function inferPark(name='') {
    const n = norm(name);
    if (['crush','ratatouille','tower of terror','flight force','spider man','spiderman','rc racer','toy soldiers','slinky','frozen ever after','raiponce','tangled','cars road trip','cars quatre'].some(x=>n.includes(x))) return 'Disney Adventure World';
    return 'Disneyland Park';
  }

  async function refreshLive() {
    setStatus('loading','Connecting');
    $('#refreshBtn').disabled = true;
    try {
      let data;
      try { data = await fetchThemeParks(); }
      catch (e) { console.warn(e); data = await fetchQueueTimes(); }
      state.rides = data.rides.filter(r => r.name && !/entry to world of frozen/i.test(r.name));
      state.entities = data.entities;
      state.source = data.source;
      state.sourceUpdated = data.updated;
      enhanceRidesFromEntities();
      setStatus('ok', data.source.includes('fallback') ? 'Fallback live' : 'Live');
      renderAll();
    } catch (e) {
      console.error(e);
      setStatus('bad','Live feed failed');
      toast('Could not reach either live source. Try Refresh live.');
      renderAll();
    } finally {
      $('#refreshBtn').disabled = false;
    }
  }

  function enhanceRidesFromEntities() {
    if (!state.entities.length) return;
    const byName = new Map(state.entities.map(e=>[norm(e.name),e]));
    for (const r of state.rides) {
      const e = byName.get(norm(r.name));
      const loc = e?.location;
      if (loc && Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))) {
        r.lat = Number(loc.latitude); r.lon = Number(loc.longitude);
      }
    }
  }

  function evaluateRide(ride, now, commitment) {
    if (ride.status !== 'OPERATING' || ride.wait == null) return null;
    const k = keyFor(ride.name);
    if (state.priorities[k] === 'skip') return null;
    const meta = metaFor(ride.name);
    const from = currentPoint(), to = pointForRide(ride);
    let walkTo = walkMinutes(from,to) + parkHopPenalty(currentPark(),ride.park);
    let chosenWait = ride.wait, queueLabel = 'Standby';
    if (state.settings.singleRider && Number.isFinite(ride.singleRiderWait) && ride.singleRiderWait < chosenWait) {
      chosenWait = ride.singleRiderWait; queueLabel = 'Single Rider';
    }
    const rideDuration = meta.duration;
    let walkOnward = 0, minutesToTarget = null, fits = true, target = null;
    if (commitment) {
      const cPoint = areaPoint(commitment.area);
      const safeAt = new Date(parisDateTime(commitment.date,commitment.time).getTime() - bufferFor(commitment)*60000);
      minutesToTarget = Math.floor((safeAt-now)/60000);
      walkOnward = walkMinutes(to,cPoint) + parkHopPenalty(ride.park,cPoint?.park);
      const totalNeeded = walkTo + chosenWait + rideDuration + walkOnward;
      fits = totalNeeded <= minutesToTarget;
      target = { safeAt, totalNeeded };
    }
    if (!fits) return null;

    const avg = baselineFor(ride.name);
    const opportunity = Math.max(-25,Math.min(35,(avg-chosenWait)*1.2));
    const priority = state.priorities[k] || 'neutral';
    let score = {must:55,want:27,neutral:0}[priority] || 0;
    score += opportunity;
    score += Math.max(-8,(30-Math.min(chosenWait,60))*.25);
    const distWeight = state.settings.mode === 'lowWalk' ? 2.4 : 1.15;
    score -= walkTo * distWeight;
    if (state.settings.mode === 'queueHunter') score += opportunity*.45;
    if (state.settings.mode === 'rain') score += meta.indoor ? 12 : -25;
    if (state.done[k]) score -= 35;
    if (commitment && target) {
      const slack = minutesToTarget - target.totalNeeded;
      score += Math.min(8, slack*.08);
      if (slack < 10) score -= 9;
    }
    const finish = new Date(now.getTime() + (walkTo+chosenWait+rideDuration)*60000);
    return { ride, score, walkTo, walkOnward, chosenWait, queueLabel, rideDuration, avg, opportunity, priority, finish, meta, minutesToTarget, target };
  }

  function topRecommendations() {
    const now = plannerNow(), c = nextCommitment(now);
    return state.rides.map(r=>evaluateRide(r,now,c)).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,3);
  }

  function renderAll() {
    syncControls();
    renderHero();
    renderRecommendations();
    renderWaitBoard();
    renderSchedule();
    renderSourceAge();
  }

  function renderHero() {
    const now = plannerNow(), c = nextCommitment(now);
    if (!c) {
      $('#nextName').textContent = 'No trip commitment active';
      $('#nextMeta').textContent = state.settings.preview ? 'No later fixed point on this preview day.' : 'Live queues still work. Use Preview to test trip deconfliction.';
      $('#countdown').textContent = '--';
      $('#safeLine').textContent = 'Recommendations are not time-blocked outside the trip dates.';
      return;
    }
    const at = parisDateTime(c.date,c.time), safeAt = new Date(at.getTime()-bufferFor(c)*60000);
    const mins = Math.max(0,Math.floor((safeAt-now)/60000));
    $('#nextName').textContent = c.name;
    $('#nextMeta').textContent = `${fmtDate(c.date)} · ${c.time} · ${c.area}${c.hard?'':' · soft plan'}`;
    $('#countdown').textContent = mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins} min`;
    $('#safeLine').textContent = `Target arrival ${parisTime(safeAt)}. The engine will reject any ride that cannot finish and get you there by then.`;
  }

  function renderRecommendations() {
    const recs = topRecommendations();
    const box = $('#recommendations');
    if (!state.rides.length) { box.innerHTML = '<div class="card loading">No live ride data yet.</div>'; return; }
    if (!recs.length) { box.innerHTML = '<div class="card empty">Nothing operating safely fits the current rules. Head toward the next anchor or relax the filters.</div>'; return; }
    box.innerHTML = recs.map((x,i)=>{
      const opp = x.avg-x.chosenWait;
      const oppText = opp >= 10 ? `${opp}m below 2026 avg` : opp <= -10 ? `${Math.abs(opp)}m above 2026 avg` : 'near usual wait';
      const onward = x.target ? ` · ${x.walkOnward}m onward walk` : '';
      const priorityTag = x.priority === 'must' ? '<span class="tag good">MUST</span>' : x.priority === 'want' ? '<span class="tag">WANT</span>' : '';
      return `<article class="card reco">
        <div class="rank">${i+1}</div>
        <div class="ride-name">${esc(x.ride.name)}</div>
        <div class="muted small">${esc(x.ride.park)} · ${esc(x.meta.area || 'area unknown')}</div>
        <div class="big-wait">${x.chosenWait}<span> min ${x.queueLabel}</span></div>
        <div class="tags"><span class="tag ${opp>=10?'good':opp<=-10?'warn':''}">${oppText}</span><span class="tag">${x.walkTo}m walk</span>${priorityTag}</div>
        <div class="why">Estimated off ride about <strong>${parisTime(x.finish)}</strong>${onward}. ${x.meta.indoor?'Mostly indoors.':'Outdoor exposure possible.'}</div>
      </article>`;
    }).join('');
  }

  function renderWaitBoard() {
    const q = norm(state.search);
    let rides = [...state.rides].sort((a,b)=>(a.wait ?? 999)-(b.wait ?? 999));
    rides = rides.filter(r => {
      const k = keyFor(r.name);
      if (q && !norm(r.name).includes(q)) return false;
      if (state.activeFilter === 'done') return !!state.done[k];
      if (state.activeFilter !== 'all' && r.park !== state.activeFilter) return false;
      return true;
    });
    $('#waitBoard').innerHTML = rides.length ? rides.map(r=>{
      const k = keyFor(r.name), pri = state.priorities[k] || 'neutral', done = !!state.done[k];
      const m = metaFor(r.name);
      const status = r.status === 'OPERATING' ? (r.wait == null ? 'Open' : `${r.wait} min`) : prettyStatus(r.status);
      const sr = Number.isFinite(r.singleRiderWait) ? ` · Single Rider ${r.singleRiderWait}m` : '';
      return `<div class="ride-row ${done?'done':''}">
        <div><div class="ride-title">${esc(r.name)}</div><div class="ride-sub">${esc(r.park)}${m.area?` · ${esc(m.area)}`:''}${sr}</div></div>
        <div class="ride-actions">
          <button class="priority-btn ${pri}" data-priority="${esc(k)}">${priorityLabel(pri)}</button>
          <button class="done-btn ${done?'on':''}" data-done="${esc(k)}">${done?'DONE':'Mark done'}</button>
          <div class="wait-num">${r.status==='OPERATING' && r.wait!=null ? r.wait : '·'}<small>${status}</small></div>
        </div>
      </div>`;
    }).join('') : '<div class="empty">No rides match this view.</div>';

    $$('[data-priority]').forEach(b=>b.addEventListener('click',()=>cyclePriority(b.dataset.priority)));
    $$('[data-done]').forEach(b=>b.addEventListener('click',()=>toggleDone(b.dataset.done)));
  }

  function renderSchedule() {
    const groups = {};
    COMMITMENTS.forEach(c => (groups[c.date] ||= []).push(c));
    $('#scheduleList').innerHTML = Object.entries(groups).map(([date,items])=>`<div class="schedule-day"><div class="schedule-date">${fmtDate(date)}</div>${items.map(c=>`<div class="schedule-item"><strong>${c.time}</strong><span>${esc(c.name)} · ${esc(c.area)}</span>${c.hard?'':'<span class="soft">SOFT</span>'}</div>`).join('')}</div>`).join('');
  }

  function renderSourceAge() {
    if (!state.sourceUpdated) { $('#sourceAge').textContent = 'Waiting for data'; return; }
    const mins = Math.max(0, Math.floor((Date.now()-state.sourceUpdated.getTime())/60000));
    $('#sourceAge').textContent = `${state.source} · updated ${mins < 1 ? 'just now' : `${mins}m ago`}${mins>10?' · STALE?':''}`;
  }

  function prettyStatus(s='UNKNOWN') { return s.toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()); }
  function priorityLabel(p) { return {neutral:'Priority',want:'WANT',must:'MUST',skip:'SKIP'}[p] || 'Priority'; }
  function cyclePriority(k) {
    const order = ['neutral','want','must','skip'];
    const cur = state.priorities[k] || 'neutral';
    const next = order[(order.indexOf(cur)+1)%order.length];
    if (next === 'neutral') delete state.priorities[k]; else state.priorities[k]=next;
    save(); renderAll();
  }
  function toggleDone(k) { state.done[k] = !state.done[k]; if (!state.done[k]) delete state.done[k]; save(); renderAll(); }
  function esc(s='') { return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function setStatus(kind,text) { const e=$('#liveStatus'); e.className=`status-pill ${kind==='ok'?'ok':kind==='bad'?'bad':''}`; e.querySelector('span:last-child').textContent=text; }
  function toast(msg) { const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2200); }

  function syncControls() {
    $('#modeSelect').value = state.settings.mode;
    $('#singleRiderToggle').checked = !!state.settings.singleRider;
    $('#softPlansToggle').checked = !!state.settings.softPlans;
    $('#previewToggle').checked = !!state.settings.preview;
    $('#previewDate').value = state.settings.previewDate;
    $('#previewTime').value = state.settings.previewTime;
    $('#mealBuffer').value = state.settings.mealBuffer;
    $('#trainBuffer').value = state.settings.trainBuffer;
    $('#walkSpeed').value = state.settings.walkSpeed;
    $('#routeFactor').value = state.settings.routeFactor;
    if (!state.gps) $('#locationSelect').value = state.settings.location;
  }

  function initLocationSelect() {
    const s = $('#locationSelect');
    s.innerHTML = Object.keys(AREAS).map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');
    s.value = state.settings.location;
  }

  function useGPS() {
    if (!navigator.geolocation) return toast('This browser does not expose location.');
    $('#gpsBtn').disabled = true; $('#gpsBtn').textContent = 'Locating...';
    navigator.geolocation.getCurrentPosition(pos=>{
      state.gps = { lat:pos.coords.latitude, lon:pos.coords.longitude, park:null };
      const near = nearestArea(state.gps);
      $('#gpsBtn').textContent = `GPS: ${near.name}`;
      $('#gpsBtn').disabled = false;
      toast(`Using GPS near ${near.name}`);
      renderAll();
    }, err=>{
      $('#gpsBtn').disabled = false; $('#gpsBtn').textContent = 'Use my location';
      toast(err.message || 'Location permission failed.');
    }, { enableHighAccuracy:true, timeout:12000, maximumAge:60000 });
  }

  async function copyPacket() {
    const now = plannerNow(), c = nextCommitment(now), recs = topRecommendations();
    const location = state.gps ? `GPS near ${nearestArea(state.gps).name}` : state.settings.location;
    const done = Object.keys(state.done).filter(k=>state.done[k]);
    const lines = [
      'DLP DISPATCHER STATUS',
      `Paris time: ${parisDateKey(now)} ${parisTime(now)}${state.settings.preview?' (preview clock)':''}`,
      `Location: ${location}`,
      `Mode: ${state.settings.mode}; Single Rider: ${state.settings.singleRider?'yes':'no'}`,
      `Live source: ${state.source || 'none'}${state.sourceUpdated?`; updated ${state.sourceUpdated.toISOString()}`:''}`,
      c ? `Next fixed point: ${c.name} at ${c.time}; target arrival ${parisTime(new Date(parisDateTime(c.date,c.time).getTime()-bufferFor(c)*60000))}; area ${c.area}` : 'Next fixed point: none active',
      `Top engine picks: ${recs.map((x,i)=>`${i+1}) ${x.ride.name} ${x.chosenWait}m ${x.queueLabel}, ${x.walkTo}m walk`).join(' | ') || 'none'}`,
      `Done this trip: ${done.length ? done.join(', ') : 'none marked'}`,
      'Please re-check current public live data and tell us the best next move, prioritising enjoyment and fixed bookings over raw ride count.'
    ];
    try { await navigator.clipboard.writeText(lines.join('\n')); toast('Status packet copied. Paste it into ChatGPT.'); }
    catch { prompt('Copy this status packet:', lines.join('\n')); }
  }

  function bind() {
    $('#refreshBtn').addEventListener('click',refreshLive);
    $('#gpsBtn').addEventListener('click',useGPS);
    $('#copyBtn').addEventListener('click',copyPacket);
    $('#locationSelect').addEventListener('change',e=>{ state.gps=null; state.settings.location=e.target.value; $('#gpsBtn').textContent='Use my location'; save(); renderAll(); });
    $('#modeSelect').addEventListener('change',e=>{state.settings.mode=e.target.value;save();renderAll();});
    $('#singleRiderToggle').addEventListener('change',e=>{state.settings.singleRider=e.target.checked;save();renderAll();});
    $('#softPlansToggle').addEventListener('change',e=>{state.settings.softPlans=e.target.checked;save();renderAll();});
    $('#previewToggle').addEventListener('change',e=>{state.settings.preview=e.target.checked;save();renderAll();});
    $('#previewDate').addEventListener('change',e=>{state.settings.previewDate=e.target.value;save();renderAll();});
    $('#previewTime').addEventListener('change',e=>{state.settings.previewTime=e.target.value;save();renderAll();});
    $('#searchInput').addEventListener('input',e=>{state.search=e.target.value;renderWaitBoard();});
    $$('.filter').forEach(b=>b.addEventListener('click',()=>{state.activeFilter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderWaitBoard();}));
    for (const [id,key] of [['mealBuffer','mealBuffer'],['trainBuffer','trainBuffer'],['walkSpeed','walkSpeed'],['routeFactor','routeFactor']]) {
      $(`#${id}`).addEventListener('change',e=>{state.settings[key]=Number(e.target.value);save();renderAll();});
    }
    $('#resetProgress').addEventListener('click',()=>{state.done={};save();renderAll();toast('DONE marks reset.');});
    $('#resetPriorities').addEventListener('click',()=>{state.priorities={};save();renderAll();toast('Priorities reset.');});
  }

  initLocationSelect(); bind(); renderAll(); refreshLive();
  setInterval(refreshLive, REFRESH_MS);
  setInterval(()=>{renderHero();renderSourceAge();},60000);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
