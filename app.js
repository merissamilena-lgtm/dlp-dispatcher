(() => {
  'use strict';

  const TPW_DESTINATION = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
  const TPW_BASE = 'https://api.themeparks.wiki/v1';
  const QT_PROXY_BASE = 'https://dlp-queue-proxy.rnspecfor.workers.dev';
  const QT_PARKS = [
    { id: 4, park: 'Disneyland Park' },
    { id: 28, park: 'Disney Adventure World' }
  ];
  const REFRESH_MS = 5 * 60 * 1000;
  const DLP_GEOFENCE_METRES = 5000;
  const FEED_AGING_MIN = 10;
  const FEED_STALE_MIN = 20;
  const ATTRACTION_AGING_MIN = 15;
  const ATTRACTION_STALE_MIN = 30;
  const PARK_HOP_TIME_MIN = 15;
  const PARK_HOP_SCORE_PENALTY = 30;
  const NOT_NOW_MIN = 30;

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
    { p: 'disneyland railroad main street station', area: 'Main Street U.S.A.', duration: 20, indoor: false },
    { p: 'disneyland railroad frontierland depot', area: 'Frontierland', duration: 20, indoor: false },
    { p: 'disneyland railroad fantasyland station', area: 'Fantasyland', duration: 20, indoor: false },
    { p: 'disneyland railroad discoveryland station', area: 'Discoveryland', duration: 20, indoor: false },
    { p: 'thunder mesa riverboat landing', area: 'Frontierland', duration: 15, indoor: false },
    { p: 'frontierland playground', area: 'Frontierland', duration: 25, indoor: false },
    { p: 'pirates beach', area: 'Adventureland', duration: 25, indoor: false },
    { p: 'plage des pirates', area: 'Adventureland', duration: 25, indoor: false },
    { p: 'mickey s philharmagic', area: 'Discoveryland', duration: 15, indoor: true },
    { p: 'philharmagic', area: 'Discoveryland', duration: 15, indoor: true },
    { p: 'la cabane des robinson', area: 'Adventureland', duration: 12, indoor: false },
    { p: 'robinson', area: 'Adventureland', duration: 12, indoor: false },
    { p: 'adventure isle', area: 'Adventureland', duration: 18, indoor: false },
    { p: 'passage enchante d aladdin', area: 'Adventureland', duration: 10, indoor: true },
    { p: 'pirate galleon', area: 'Adventureland', duration: 10, indoor: false },
    { p: 'taniere du dragon', area: 'Fantasyland', duration: 10, indoor: true },
    { p: 'dragon s lair', area: 'Fantasyland', duration: 10, indoor: true },
    { p: 'alice s curious labyrinth', area: 'Fantasyland', duration: 15, indoor: false },
    { p: 'rustler roundup', area: 'Frontierland', duration: 8, indoor: false },
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
    { p: 'carrousel', area: 'Fantasyland', duration: 4, indoor: false },
    { p: 'casey jr', area: 'Fantasyland', duration: 5, indoor: false },
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

  const EXPERIENCE_RULES = [
    { p: 'mickey s philharmagic', category: 'show', label: 'Show / cinema', bonus: -2 },
    { p: 'philharmagic', category: 'show', label: 'Show / cinema', bonus: -2 },
    { p: 'frontierland playground', category: 'playground', label: 'Play / time filler', bonus: -16 },
    { p: 'pirates beach', category: 'playground', label: 'Play / time filler', bonus: -16 },
    { p: 'plage des pirates', category: 'playground', label: 'Play / time filler', bonus: -16 },
    { p: 'thunder mesa riverboat landing', category: 'scenic', label: 'Scenic ride', bonus: -2 },
    { p: 'le pays des contes de fees', category: 'scenic', label: 'Scenic ride', bonus: 0 },
    { p: 'disneyland railroad', category: 'transport', label: 'Transport', bonus: -34 },
    { p: 'horse drawn streetcars', category: 'transport', label: 'Transport', bonus: -34 },
    { p: 'main street vehicles', category: 'transport', label: 'Transport', bonus: -34 },
    { p: 'rustler roundup', category: 'minor', label: 'Side activity', bonus: -26 },
    { p: 'shootin gallery', category: 'minor', label: 'Side activity', bonus: -26 },
    { p: 'taniere du dragon', category: 'walkthrough', label: 'Walkthrough', bonus: -18 },
    { p: 'dragon s lair', category: 'walkthrough', label: 'Walkthrough', bonus: -18 },
    { p: 'passage enchante d aladdin', category: 'walkthrough', label: 'Walkthrough', bonus: -18 },
    { p: 'adventure isle', category: 'walkthrough', label: 'Walkthrough', bonus: -14 },
    { p: 'mysteres du nautilus', category: 'walkthrough', label: 'Walkthrough', bonus: -16 },
    { p: 'nautilus', category: 'walkthrough', label: 'Walkthrough', bonus: -16 },
    { p: 'alice s curious labyrinth', category: 'walkthrough', label: 'Walkthrough', bonus: -12 },
    { p: 'labyrinth', category: 'walkthrough', label: 'Walkthrough', bonus: -12 },
    { p: 'la cabane des robinson', category: 'walkthrough', label: 'Walkthrough', bonus: -12 },
    { p: 'robinson', category: 'walkthrough', label: 'Walkthrough', bonus: -12 },
    { p: 'liberty arcade', category: 'walkthrough', label: 'Walkthrough', bonus: -24 },
    { p: 'discovery arcade', category: 'walkthrough', label: 'Walkthrough', bonus: -24 },
    { p: 'pirate galleon', category: 'walkthrough', label: 'Walkthrough', bonus: -18 },
    { p: 'meet mickey', category: 'character', label: 'Character', bonus: -4 },
    { p: 'princess pavilion', category: 'character', label: 'Character', bonus: -4 },
    { p: 'hero training center', category: 'character', label: 'Character', bonus: -4 },
    { p: 'welcome to starport', category: 'character', label: 'Character', bonus: -4 }
  ];

  const HEADLINE_PATTERNS = [
    'big thunder', 'peter pan', 'hyperspace mountain', 'crush', 'frozen ever after',
    'tower of terror', 'ratatouille', 'spider man', 'spiderman', 'flight force'
  ];

  const state = {
    rides: [],
    entities: [],
    source: null,
    sourceUpdated: null,
    secondarySource: null,
    secondaryUpdated: null,
    feedDisagreements: [],
    secondaryError: null,
    lastFetchedAt: null,
    gps: null,
    gpsAccuracy: null,
    activeFilter: 'all',
    search: '',
    priorities: loadJSON('dlpPriorities', {}),
    done: loadJSON('dlpDone', {}),
    notNow: loadJSON('dlpNotNow', {}),
    settings: Object.assign({
      mode: 'balanced', singleRider: false, parkHop: false, softPlans: false,
      mealBuffer: 15, trainBuffer: 35, walkSpeed: 55, routeFactor: 1.25,
      preview: false, previewDate: '2026-10-30', previewTime: '17:00', location: 'Disneyland Park entrance', locationSource: 'default'
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
    localStorage.setItem('dlpNotNow', JSON.stringify(state.notNow));
    localStorage.setItem('dlpSettings', JSON.stringify(state.settings));
  }

  function norm(s = '') {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[™®©*]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function keyFor(name) { return norm(name).replace(/ single rider$/,''); }
  function baselineFor(name) {
    const n = norm(name);
    const hit = BASELINES.find(([p]) => n.includes(p));
    return hit ? hit[1] : null;
  }
  function experienceFor(name) {
    const n = norm(name);
    const special = EXPERIENCE_RULES.find(x => n.includes(x.p));
    if (special) return special;
    if (HEADLINE_PATTERNS.some(p => n.includes(p))) return { category: 'headline', label: 'Headline ride', bonus: 15 };
    return { category: 'ride', label: 'Ride', bonus: 5 };
  }
  function metaFor(name) {
    const n = norm(name);
    const hit = META.find(x => n.includes(x.p));
    return { ...(hit || { area: null, duration: 5, indoor: false }), ...experienceFor(name) };
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
  function isThemePark(park) { return park === 'Disneyland Park' || park === 'Disney Adventure World'; }
  function isParkHop(fromPark, toPark) { return isThemePark(fromPark) && isThemePark(toPark) && fromPark !== toPark; }
  function parkHopPenalty(fromPark, toPark) { return isParkHop(fromPark, toPark) ? PARK_HOP_TIME_MIN : 0; }
  function deferredUntil(k) { return Number(state.notNow[k] || 0); }
  function isDeferred(k) {
    const until = deferredUntil(k);
    if (!until) return false;
    if (until <= Date.now()) { delete state.notNow[k]; save(); return false; }
    return true;
  }
  function rideRowId(k) { return `ride-${k.replace(/[^a-z0-9]+/g,'-')}`; }
  function pointForRide(ride) {
    if (Number.isFinite(ride.lat) && Number.isFinite(ride.lon)) return { lat: ride.lat, lon: ride.lon, park: ride.park };
    const m = metaFor(ride.name);
    return areaPoint(ride.area) || areaPoint(m.area) || (ride.park === 'Disney Adventure World' ? areaPoint('Disney Adventure World entrance') : areaPoint('Disneyland Park entrance'));
  }
  function dlpEntrancePoint() { return areaPoint('Disneyland Park entrance'); }
  function gpsDistanceFromDLP() { return state.gps ? haversine(state.gps, dlpEntrancePoint()) : null; }
  function gpsNearDLP() { const d = gpsDistanceFromDLP(); return d != null && d <= DLP_GEOFENCE_METRES; }
  function sessionMode() { return !state.settings.preview && gpsNearDLP() ? 'LIVE' : 'TEST'; }
  function currentPoint() {
    if (gpsNearDLP()) return state.gps;
    return areaPoint(state.settings.location) || areaPoint('Disneyland Park entrance');
  }
  function currentPark() {
    if (gpsNearDLP()) return nearestArea(state.gps).park;
    return (areaPoint(state.settings.location) || {}).park;
  }
  function locationSourceLabel() {
    if (gpsNearDLP()) return 'GPS';
    if (state.gps) return `GPS outside resort, routing uses ${state.settings.locationSource || 'default'}`;
    return state.settings.locationSource === 'manual' ? 'manual' : 'default';
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
    const getPark = ent => { let x=ent,loops=0; while(x&&loops++<10){ if(x.entityType==='PARK') return canonicalPark(x.name); x=entityMap.get(x.parentId); } return inferPark(ent?.name||''); };
    const getArea = ent => { let x=ent,loops=0; while(x&&loops++<10){ if(x.entityType==='LAND') return canonicalArea(x.name); x=entityMap.get(x.parentId); } return null; };
    const rides = (live.liveData || []).filter(x => x.entityType === 'ATTRACTION').map(x => {
      const ent = entityMap.get(x.entityId || x.id) || {};
      const standby = x.queue?.STANDBY?.waitTime;
      const single = x.queue?.SINGLE_RIDER?.waitTime;
      const loc = ent.location || {};
      return { id:x.entityId||x.id||keyFor(x.name), name:x.name, park:getPark(ent), area:getArea(ent), status:x.status||'UNKNOWN', wait:Number.isFinite(standby)?standby:null, singleRiderWait:Number.isFinite(single)?single:null, lastUpdated:x.lastUpdated||null, lat:Number(loc.latitude), lon:Number(loc.longitude) };
    });
    return { rides, entities, source:'ThemeParks.wiki', updated:newestTimestamp(rides) };
  }

  async function fetchQueueTimes() {
    const results = await Promise.all(QT_PARKS.map(async p => {
      const res = await fetch(`${QT_PROXY_BASE}/parks/${p.id}`, { cache:'no-store' });
      if (!res.ok) throw new Error(`Queue-Times proxy ${res.status}`);
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
    return { rides, entities: [], source: 'Queue-Times.com', updated: newestTimestamp(rides) };
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
  function canonicalArea(name='') {
    const n = norm(name);
    if (n.includes('main street')) return 'Main Street U.S.A.';
    if (n.includes('frontierland')) return 'Frontierland';
    if (n.includes('adventureland')) return 'Adventureland';
    if (n.includes('fantasyland')) return 'Fantasyland';
    if (n.includes('discoveryland')) return 'Discoveryland';
    if (n.includes('avengers')) return 'Marvel Avengers Campus';
    if (n.includes('pixar')) return 'Worlds of Pixar';
    if (n.includes('frozen')) return 'World of Frozen';
    if (n.includes('production courtyard') || n.includes('world premiere')) return 'Production Courtyard';
    return name || null;
  }
  function inferPark(name='') {
    const n = norm(name);
    if (['crush','ratatouille','tower of terror','flight force','spider man','spiderman','rc racer','toy soldiers','slinky','frozen ever after','raiponce','tangled','cars road trip','cars quatre'].some(x=>n.includes(x))) return 'Disney Adventure World';
    return 'Disneyland Park';
  }

  function ageMinutes(date) {
    if (!date || isNaN(date)) return null;
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  }
  function attractionFreshness(ride) {
    if (!ride?.lastUpdated) return { level:'unknown', mins:null };
    const d = new Date(ride.lastUpdated);
    if (isNaN(d)) return { level:'unknown', mins:null };
    const mins = ageMinutes(d);
    if (mins > ATTRACTION_STALE_MIN) return { level:'stale', mins };
    if (mins > ATTRACTION_AGING_MIN) return { level:'aging', mins };
    return { level:'fresh', mins };
  }
  function feedFreshness() {
    const mins = ageMinutes(state.sourceUpdated);
    if (mins == null) return { level: 'unknown', mins: null };
    if (mins > FEED_STALE_MIN) return { level: 'stale', mins };
    if (mins > FEED_AGING_MIN) return { level: 'aging', mins };
    return { level: 'fresh', mins };
  }
  function compareFeeds(primaryRides, secondaryRides) {
    const secondaryMap = new Map(secondaryRides.map(r => [keyFor(r.name), r]));
    const disagreements = [];
    for (const r of primaryRides) {
      delete r.feedDisagreement;
      delete r.secondaryWait;
      delete r.secondaryStatus;
      delete r.crossChecked;
      const other = secondaryMap.get(keyFor(r.name));
      if (!other) continue;
      r.crossChecked = true;
      r.secondaryWait = other.wait;
      r.secondaryStatus = other.status;
      const pOpen = r.status === 'OPERATING';
      const sOpen = other.status === 'OPERATING';
      if (pOpen !== sOpen && !['UNKNOWN', null].includes(r.status) && !['UNKNOWN', null].includes(other.status)) {
        r.feedDisagreement = { kind: 'status', primary: r.status, secondary: other.status };
      } else if (pOpen && sOpen && Number.isFinite(r.wait) && Number.isFinite(other.wait)) {
        const diff = Math.abs(r.wait - other.wait);
        if (diff >= 15) r.feedDisagreement = { kind: 'wait', primary: r.wait, secondary: other.wait, diff };
      }
      if (r.feedDisagreement) disagreements.push({ name: r.name, ...r.feedDisagreement });
    }
    return disagreements;
  }

  function friendlySecondaryError(reason) {
    const message = String(reason?.message || reason || 'browser fetch failed');
    if (/load failed|failed to fetch|networkerror/i.test(message)) return 'Queue-Times proxy unreachable';
    return `Queue-Times proxy: ${message}`;
  }

  let refreshInFlight = null;

  async function refreshLive() {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
    setStatus('loading','Connecting');
    $('#refreshBtn').disabled = true;
    try {
      const [tpwResult, qtResult] = await Promise.allSettled([fetchThemeParks(), fetchQueueTimes()]);
      const tpw = tpwResult.status === 'fulfilled' ? tpwResult.value : null;
      const qt = qtResult.status === 'fulfilled' ? qtResult.value : null;
      state.secondaryError = tpw && !qt ? friendlySecondaryError(qtResult.reason) : (!tpw && qt ? `ThemeParks.wiki: ${tpwResult.reason?.message || 'fetch failed'}` : null);
      if (!tpw && !qt) throw new Error('Both live feeds failed');

      const primary = tpw || qt;
      const secondary = tpw && qt ? qt : null;
      state.rides = primary.rides.filter(r => r.name && !/entry to world of frozen/i.test(r.name));
      state.entities = primary.entities || [];
      state.source = primary.source;
      state.sourceUpdated = primary.updated;
      state.secondarySource = secondary?.source || null;
      state.secondaryUpdated = secondary?.updated || null;
      state.feedDisagreements = secondary ? compareFeeds(state.rides, secondary.rides) : [];
      state.lastFetchedAt = new Date();
      enhanceRidesFromEntities();

      const freshness = feedFreshness();
      const statusText = !tpw ? 'Fallback live' : freshness.level === 'stale' ? 'Live data stale' : 'Live';
      setStatus(freshness.level === 'stale' ? 'warn' : 'ok', statusText);
      renderAll();
    } catch (e) {
      console.error(e);
      setStatus('bad','Live feed failed');
      toast('Could not reach either live source. Try Refresh live.');
      renderAll();
    } finally {
      $('#refreshBtn').disabled = false;
    }
    })();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
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

  function experienceMinutes(meta) {
    const defaults = { headline:5, ride:5, scenic:15, show:15, playground:25, walkthrough:12, minor:8, character:8, transport:20 };
    return Math.max(Number(meta.duration || 0), defaults[meta.category] || 5);
  }

  function evaluateRide(ride, now, commitment) {
    if (ride.status !== 'OPERATING' || ride.wait == null) return null;
    const rideFresh = attractionFreshness(ride);
    if (rideFresh.level === 'stale' || rideFresh.level === 'unknown') return null;
    if (ride.feedDisagreement?.kind === 'status') return null;
    const k = keyFor(ride.name);
    if (state.priorities[k] === 'skip' || state.done[k] || isDeferred(k)) return null;
    const meta = metaFor(ride.name);
    const area = ride.area || meta.area;
    const fromPark = currentPark();
    const parkHop = isParkHop(fromPark, ride.park);
    if (parkHop && !state.settings.parkHop) return null;
    const from = currentPoint(), to = pointForRide(ride);
    const walkTo = walkMinutes(from,to) + parkHopPenalty(fromPark,ride.park);
    let chosenWait = ride.wait, queueLabel = 'Standby';
    if (state.settings.singleRider && Number.isFinite(ride.singleRiderWait) && ride.singleRiderWait < chosenWait) { chosenWait=ride.singleRiderWait; queueLabel='Single Rider'; }
    const dwellMinutes = experienceMinutes(meta);
    let walkOnward=0, minutesToTarget=null, fits=true, target=null;
    if (commitment) {
      const cPoint=areaPoint(commitment.area);
      const safeAt=new Date(parisDateTime(commitment.date,commitment.time).getTime()-bufferFor(commitment)*60000);
      minutesToTarget=Math.floor((safeAt-now)/60000);
      walkOnward=walkMinutes(to,cPoint)+parkHopPenalty(ride.park,cPoint?.park);
      const totalNeeded=walkTo+chosenWait+dwellMinutes+walkOnward;
      fits=totalNeeded<=minutesToTarget;
      target={safeAt,totalNeeded};
    }
    if (!fits) return null;
    const avg=baselineFor(ride.name);
    let opportunity=0;
    if (avg!=null && ['ride','headline'].includes(meta.category)) opportunity=Math.max(-25,Math.min(35,(avg-chosenWait)*1.2));
    const priority=state.priorities[k]||'neutral';
    let score={must:65,want:30,neutral:0}[priority]||0;
    score+=meta.bonus+opportunity;
    if (['ride','headline'].includes(meta.category)) score+=Math.max(-8,(30-Math.min(chosenWait,60))*.22);
    else if (meta.category==='scenic') score+=Math.max(-5,(20-Math.min(chosenWait,45))*.10);
    else if (meta.category==='show') score+=chosenWait<=10?2:-3;
    else if (meta.category==='playground') score+=chosenWait<=5?1:-8;
    else if (chosenWait===0) score-=6;
    if (parkHop) score-=PARK_HOP_SCORE_PENALTY;
    score-=walkTo*(state.settings.mode==='lowWalk'?2.4:1.15);
    if (state.settings.mode==='queueHunter') score+=opportunity*.45;
    if (state.settings.mode==='rain') score+=meta.indoor?12:-25;
    if (ride.feedDisagreement?.kind==='wait') score-=12;
    if (rideFresh.level==='aging') score-=8;
    if (commitment&&target) { const slack=minutesToTarget-target.totalNeeded; score+=Math.min(8,slack*.08); if(slack<10)score-=9; if(slack<20&&['ride','headline','scenic','show'].includes(meta.category))score+=4; }
    const finish=new Date(now.getTime()+(walkTo+chosenWait+dwellMinutes)*60000);
    return {ride,score,walkTo,walkOnward,chosenWait,queueLabel,dwellMinutes,avg,opportunity,priority,finish,meta:{...meta,area},minutesToTarget,target,parkHop,rideFresh};
  }

  function recommendationReason(x) {
    const bits=[];
    if(x.priority==='must')bits.push('marked MUST'); else if(x.priority==='want')bits.push('marked WANT');
    if(x.avg!=null&&x.avg-x.chosenWait>=10)bits.push(`${x.avg-x.chosenWait}m below usual`);
    if(x.walkTo<=4)bits.push('very close'); else if(x.walkTo<=8)bits.push('nearby');
    if(x.meta.category==='headline')bits.push('headline ride');
    if(x.meta.category==='scenic')bits.push('scenic attraction');
    if(x.meta.category==='show')bits.push('show / cinema');
    if(x.meta.category==='playground')bits.push('time filler with realistic play time');
    if(x.parkHop)bits.push('requires park hop');
    if(x.rideFresh.level==='aging')bits.push('queue update is aging');
    if(x.ride.feedDisagreement?.kind==='wait')bits.push('feeds disagree on wait');
    return bits.length?bits.join(', '):'solid fit for the current rules';
  }
  function allRecommendations(){const now=plannerNow(),c=nextCommitment(now);return state.rides.map(r=>evaluateRide(r,now,c)).filter(Boolean).sort((a,b)=>b.score-a.score);}
  function topRecommendations(){return allRecommendations().slice(0,3);}

  function renderAll() {
    syncControls();
    renderSession();
    renderPreviewSummary();
    renderHero();
    renderRecommendations();
    renderWaitBoard();
    renderSchedule();
    renderSourceAge();
  }

  function renderSession() {
    const live = sessionMode() === 'LIVE';
    const banner = $('#sessionBanner');
    banner.className = `session-banner ${live ? 'live' : 'test'}`;
    $('#sessionMode').textContent = live ? 'LIVE MODE' : 'TEST MODE';
    if (live) {
      const near = nearestArea(state.gps);
      $('#sessionDetail').textContent = `GPS confirms you are at Disneyland Paris near ${near.name}. Live routing is enabled.`;
    } else if (state.settings.preview) {
      $('#sessionDetail').textContent = 'Preview clock is active. This is a simulation using current queue data.';
    } else if (state.gps) {
      const km = (gpsDistanceFromDLP()/1000).toFixed(1);
      $('#sessionDetail').textContent = `GPS is ${km} km from Disneyland Paris. Routing uses the selected test area, not your physical location.`;
    } else {
      $('#sessionDetail').textContent = 'No in-resort GPS fix. Recommendations are a simulation using the selected test area.';
    }
  }

  function renderPreviewSummary() {
    const e=$('#previewSummary'); if(!e)return; if(!state.settings.preview){e.textContent='Preview: off';return;} e.textContent=`Preview: ${fmtDate(state.settings.previewDate)} ${state.settings.previewTime}`;
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
    $('#safeLine').textContent = `Target arrival ${parisTime(safeAt)}. The engine will reject any attraction that cannot finish and get you there by then.`;
  }

  function renderRecommendations() {
    const recs = topRecommendations(), all = allRecommendations(), box = $('#recommendations');
    if (!state.rides.length) { box.innerHTML = '<div class="card loading">No live attraction data yet.</div>'; renderParkHopNote([]); return; }
    if (!recs.length) { box.innerHTML = '<div class="card empty">Nothing with fresh, explicit OPEN data safely fits the current rules. Head toward the next anchor or relax the filters.</div>'; renderParkHopNote(all); return; }
    box.innerHTML = recs.map((x,i)=>{
      const k=keyFor(x.ride.name), opp=x.avg==null?null:x.avg-x.chosenWait;
      const oppText=opp==null?'no historical baseline':opp>=10?`${opp}m below 2026 avg`:opp<=-10?`${Math.abs(opp)}m above 2026 avg`:'near usual wait';
      const onward=x.target?` · ${x.walkOnward}m onward walk`:'';
      const priorityTag=x.priority==='must'?'<span class="tag good">MUST</span>':x.priority==='want'?'<span class="tag">WANT</span>':'';
      const disagreeTag=x.ride.feedDisagreement?.kind==='wait'?'<span class="tag warn">FEEDS DISAGREE</span>':'';
      const hopTag=x.parkHop?'<span class="tag warn">PARK HOP</span>':'';
      const agingTag=x.rideFresh.level==='aging'?'<span class="tag warn">AGING DATA</span>':'';
      return `<article class="card reco" data-card-jump="${esc(k)}"><div class="rank">${i+1}</div><button class="ride-link" data-jump="${esc(k)}">${esc(x.ride.name)}</button><div class="location-line"><span class="chip">${esc(x.ride.park)}</span>${x.meta.area?`<span class="chip">${esc(x.meta.area)}</span>`:''}</div><div class="big-wait">${x.chosenWait}<span> min ${x.queueLabel}</span></div><div class="tags"><span class="tag category">${esc(x.meta.label)}</span><span class="tag ${opp!=null&&opp>=10?'good':opp!=null&&opp<=-10?'warn':''}">${oppText}</span><span class="tag">${x.walkTo}m walk</span>${priorityTag}${disagreeTag}${hopTag}${agingTag}</div><div class="why"><strong>Why:</strong> ${esc(recommendationReason(x))}. Estimated finished about <strong>${parisTime(x.finish)}</strong>${onward}. Includes about ${x.dwellMinutes}m experience time.</div><div class="reco-actions"><button class="done-btn" data-reco-done="${esc(k)}">DONE</button><button class="not-now-btn" data-reco-notnow="${esc(k)}">Not now</button></div></article>`;
    }).join('');
    $$('[data-reco-done]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();markDoneWithUndo(b.dataset.recoDone);}));
    $$('[data-reco-notnow]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();deferRide(b.dataset.recoNotnow);}));
    $$('[data-jump]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();jumpToRide(b.dataset.jump);}));
    $$('[data-card-jump]').forEach(card=>card.addEventListener('click',()=>jumpToRide(card.dataset.cardJump)));
    renderParkHopNote(all);
  }
  function renderParkHopNote(all){const e=$('#parkHopNote');if(!state.settings.parkHop){e.hidden=true;e.textContent='';return;}const hasHop=all.slice(0,3).some(x=>x.parkHop);e.hidden=false;e.textContent=hasHop?'Other park checked. A park-hop candidate is strong enough to appear above.':'Other park checked. No hop is currently worth the extra transfer time.';}
  function rideAgeLabel(r){const f=attractionFreshness(r);if(f.mins==null)return'update time unknown';return f.mins<1?'updated just now':`updated ${f.mins}m ago`;}
  function deferredRemaining(k){const until=deferredUntil(k);if(!until||until<=Date.now())return 0;return Math.max(1,Math.ceil((until-Date.now())/60000));}
  function waitValueFor(r,m){const fresh=attractionFreshness(r);if(r.status!=='OPERATING')return{text:prettyStatus(r.status),cls:'closed'};if(fresh.level==='stale'||fresh.level==='unknown')return{text:r.wait==null?'OPEN?':`${r.wait} min`,cls:'stale'};if(r.wait==null)return{text:'OPEN · wait unavailable',cls:'open'};const avg=baselineFor(r.name);if(avg==null||!['ride','headline','scenic'].includes(m.category))return{text:`${r.wait} min`,cls:fresh.level==='aging'?'warn':'open'};const delta=avg-r.wait;if(delta>=10)return{text:`${r.wait} min · ${delta}m below avg`,cls:'good'};if(delta<=-10)return{text:`${r.wait} min · ${Math.abs(delta)}m above avg`,cls:'warn'};return{text:`${r.wait} min · near avg`,cls:'open'};}
  function railroadSummary(){const stations=[['Main Street','disneyland railroad main street station'],['Frontierland','disneyland railroad frontierland depot'],['Fantasyland','disneyland railroad fantasyland station'],['Discoveryland','disneyland railroad discoveryland station']];const found=stations.map(([label,pat])=>[label,state.rides.find(r=>norm(r.name).includes(pat))]).filter(x=>x[1]);if(!found.length)return'';const cells=found.map(([label,r])=>{const fresh=attractionFreshness(r),stale=fresh.level==='stale'||fresh.level==='unknown';const val=r.status==='OPERATING'?(r.wait==null?'OPEN':`${r.wait}m`):'CLOSED';const cls=stale?'stale':r.status==='OPERATING'?'open':'closed';return`<span class="rail-station ${cls}"><strong>${label}</strong> ${val}${stale?' · STALE':''}</span>`;}).join('');return`<div class="railroad-strip"><div class="railroad-title">Disneyland Railroad stations</div><div class="railroad-stations">${cells}</div></div>`;}
  function renderWaitBoard(){
    const q=norm(state.search),freshRank=r=>({fresh:0,aging:1,unknown:2,stale:3}[attractionFreshness(r).level]??3);
    let rides=[...state.rides].sort((a,b)=>{const cp=currentPark();if(a.park!==b.park){if(a.park===cp)return-1;if(b.park===cp)return 1;return a.park.localeCompare(b.park);}const ao=a.status==='OPERATING'?0:1,bo=b.status==='OPERATING'?0:1;if(ao!==bo)return ao-bo;const af=freshRank(a),bf=freshRank(b);if(af!==bf)return af-bf;return(a.wait??999)-(b.wait??999);});
    rides=rides.filter(r=>{const k=keyFor(r.name);if(q&&!norm(r.name).includes(q))return false;if(state.activeFilter==='done')return!!state.done[k];if(state.activeFilter!=='all'&&r.park!==state.activeFilter)return false;return true;});
    const showRail=!q&&(state.activeFilter==='all'||state.activeFilter==='Disneyland Park');
    const rows=rides.length?rides.map(r=>{const k=keyFor(r.name),pri=state.priorities[k]||'neutral',done=!!state.done[k],m0=metaFor(r.name),area=r.area||m0.area,m={...m0,area},value=waitValueFor(r,m),fresh=attractionFreshness(r),stale=fresh.level==='stale'||fresh.level==='unknown';const sr=Number.isFinite(r.singleRiderWait)?`Single Rider ${r.singleRiderWait}m`:null,avg=baselineFor(r.name),typical=avg!=null&&['ride','headline','scenic'].includes(m.category)?`2026 avg ${avg}m`:null,snoozed=isDeferred(k),snoozeMins=snoozed?deferredRemaining(k):0;let confidence=r.feedDisagreement?(r.feedDisagreement.kind==='status'?'feeds disagree on status':`other feed ${r.secondaryWait}m`):r.crossChecked?'cross-checked':`${state.source||'live source'} only`;const chips=[`<span class="chip wait ${value.cls}">${esc(value.text)}</span>`,`<span class="chip">${esc(r.park)}</span>`,area?`<span class="chip">${esc(area)}</span>`:'',`<span class="chip category">${esc(m.label)}</span>`,stale?'<span class="chip stale">STALE</span>':fresh.level==='aging'?'<span class="chip warn">AGING</span>':'',snoozed?`<span class="chip warn">Snoozed · ${snoozeMins}m</span>`:''].filter(Boolean).join('');const context=[typical,sr].filter(Boolean).map(esc).join(' · ');return`<div class="ride-row ${done?'done':''} ${stale?'stale':''} ${r.status!=='OPERATING'?'closed':''}" id="${rideRowId(k)}"><div class="ride-title">${esc(r.name)}</div><div class="quick-chips">${chips}</div>${context?`<div class="ride-context">${context}</div>`:''}<div class="ride-actions"><button class="priority-btn ${pri}" data-priority="${esc(k)}">${priorityLabel(pri)}</button><button class="done-btn ${done?'on':''}" data-done="${esc(k)}">${done?'DONE':'Mark done'}</button>${snoozed?`<button class="unsnooze-btn" data-unsnooze="${esc(k)}">Unsnooze</button>`:''}</div><div class="data-foot">${esc(confidence)} · ${esc(rideAgeLabel(r))}${stale?' · excluded from recommendations':''}${r.status!=='OPERATING'?` · ${esc(prettyStatus(r.status))}`:''}</div></div>`;}).join(''):'<div class="empty">No attractions match this view.</div>';
    $('#waitBoard').innerHTML=`${showRail?railroadSummary():''}${rows}`;
    $$('[data-priority]').forEach(b=>b.addEventListener('click',()=>cyclePriority(b.dataset.priority)));
    $$('[data-done]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.done;if(state.done[k])toggleDone(k);else markDoneWithUndo(k);}));
    $$('[data-unsnooze]').forEach(b=>b.addEventListener('click',()=>{delete state.notNow[b.dataset.unsnooze];save();renderAll();toast('Snooze cleared.');}));
  }

  function renderSchedule() {
    const groups = {};
    COMMITMENTS.forEach(c => (groups[c.date] ||= []).push(c));
    $('#scheduleList').innerHTML = Object.entries(groups).map(([date,items])=>`<div class="schedule-day"><div class="schedule-date">${fmtDate(date)}</div>${items.map(c=>`<div class="schedule-item"><strong>${c.time}</strong><span>${esc(c.name)} · ${esc(c.area)}</span>${c.hard?'':'<span class="soft">SOFT</span>'}</div>`).join('')}</div>`).join('');
  }

  function renderSourceAge() {
    const top=$('#topUpdated');
    if(!state.sourceUpdated){$('#sourceAge').textContent='Waiting for data';$('#feedHealth').textContent='Cross-check not available yet.';if(top)top.textContent='Waiting for live data';return;}
    const fresh=feedFreshness(),age=fresh.mins<1?'just now':`${fresh.mins}m ago`,flag=fresh.level==='stale'?' · STALE':fresh.level==='aging'?' · AGING':'';
    $('#sourceAge').textContent=`${state.source} · feed ${age}${flag}`;
    const fetchedAge=state.lastFetchedAt?ageMinutes(state.lastFetchedAt):null;if(top)top.textContent=fetchedAge==null?`${state.source}`:`Refreshed ${fetchedAge<1?'just now':`${fetchedAge}m ago`}`;
    if(state.secondarySource){const count=state.feedDisagreements.length;$('#feedHealth').textContent=count?`${state.secondarySource} cross-check: ${count} disagreement${count===1?'':'s'}. Status conflicts are excluded from recommendations.`:`${state.secondarySource} cross-check: no material disagreements.`;}
    else if(state.secondaryError)$('#feedHealth').textContent=`${state.secondaryError}. ThemeParks.wiki remains the live source; the ChatGPT packet asks for an independent public re-check.`;
    else $('#feedHealth').textContent='Only one live source is reachable. Treat recommendations with a little more caution.';
  }

  function prettyStatus(s='UNKNOWN') { return String(s || 'UNKNOWN').toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()); }
  function priorityLabel(p) { return {neutral:'Priority',want:'WANT',must:'MUST',skip:'SKIP'}[p] || 'Priority'; }
  function cyclePriority(k) {
    const order = ['neutral','want','must','skip'];
    const cur = state.priorities[k] || 'neutral';
    const next = order[(order.indexOf(cur)+1)%order.length];
    if (next === 'neutral') delete state.priorities[k]; else state.priorities[k]=next;
    save(); renderAll();
  }
  function toggleDone(k) { state.done[k] = !state.done[k]; if (!state.done[k]) delete state.done[k]; save(); renderAll(); }
  function markDoneWithUndo(k) {
    const wasDone = !!state.done[k];
    state.done[k] = true; save(); renderAll();
    showUndoToast('Marked DONE', () => { if (!wasDone) delete state.done[k]; save(); renderAll(); });
  }
  function deferRide(k) {
    const previous = state.notNow[k];
    state.notNow[k] = Date.now() + NOT_NOW_MIN*60000; save(); renderAll();
    showUndoToast(`Hidden for ${NOT_NOW_MIN} minutes`, () => { if (previous) state.notNow[k]=previous; else delete state.notNow[k]; save(); renderAll(); });
  }
  function jumpToRide(k) {
    state.activeFilter = 'all'; state.search = ''; $('#searchInput').value = '';
    $$('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));
    renderWaitBoard();
    requestAnimationFrame(()=>{ const row=document.getElementById(rideRowId(k)); if (row) { row.scrollIntoView({behavior:'smooth',block:'center'}); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1600); } });
  }
  function esc(s='') { return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function setStatus(kind,text) { const e=$('#liveStatus'); e.className=`status-pill ${kind==='ok'?'ok':kind==='bad'?'bad':kind==='warn'?'warn':''}`; e.querySelector('span:last-child').textContent=text; }
  function toast(msg) {
    const t=$('#toast'), text=$('#toastText'), undo=$('#toastUndo');
    text.textContent=msg; undo.hidden=true; undo.onclick=null; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2400);
  }
  function showUndoToast(msg, fn) {
    const t=$('#toast'), text=$('#toastText'), undo=$('#toastUndo');
    text.textContent=msg; undo.hidden=false; undo.onclick=()=>{ clearTimeout(toast.t); t.classList.remove('show'); fn(); };
    t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>{t.classList.remove('show'); undo.hidden=true;},4200);
  }

  function syncControls() {
    $('#modeSelect').value = state.settings.mode;
    $('#singleRiderToggle').checked = !!state.settings.singleRider;
    $('#parkHopToggle').checked = !!state.settings.parkHop;
    $('#softPlansToggle').checked = !!state.settings.softPlans;
    $('#previewToggle').checked = !!state.settings.preview;
    $('#previewDate').value = state.settings.previewDate;
    $('#previewTime').value = state.settings.previewTime;
    $('#mealBuffer').value = state.settings.mealBuffer;
    $('#trainBuffer').value = state.settings.trainBuffer;
    $('#walkSpeed').value = state.settings.walkSpeed;
    $('#routeFactor').value = state.settings.routeFactor;
    if (!gpsNearDLP()) $('#locationSelect').value = state.settings.location;
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
      state.gpsAccuracy = pos.coords.accuracy;
      const near = nearestArea(state.gps);
      if (gpsNearDLP()) {
        $('#gpsBtn').textContent = `GPS: ${near.name}`;
        toast(`LIVE mode enabled near ${near.name}`);
      } else {
        const km = (gpsDistanceFromDLP()/1000).toFixed(1);
        $('#gpsBtn').textContent = 'GPS: outside DLP';
        toast(`GPS is ${km} km from DLP. Staying in TEST mode.`);
      }
      $('#gpsBtn').disabled = false;
      renderAll();
    }, err=>{
      $('#gpsBtn').disabled = false; $('#gpsBtn').textContent = 'Use my location';
      toast(err.message || 'Location permission failed.');
    }, { enableHighAccuracy:true, timeout:12000, maximumAge:60000 });
  }

  function feedDisagreementSummary(d) {
    if (!d) return 'unknown disagreement';
    if (d.kind === 'status') return `${d.name}: status, ThemeParks.wiki ${d.primary} vs Queue-Times.com ${d.secondary}`;
    if (d.kind === 'wait') return `${d.name}: wait, ThemeParks.wiki ${d.primary}m vs Queue-Times.com ${d.secondary}m (${d.diff}m difference)`;
    return `${d.name || 'unknown attraction'}: ${d.kind || 'unknown'} disagreement`;
  }

  async function copyPacket() {
    const now = plannerNow(), c = nextCommitment(now), recs = topRecommendations();
    const live = sessionMode() === 'LIVE';
    const near = state.gps ? nearestArea(state.gps) : null;
    const location = live ? `GPS near ${near.name}` : state.settings.location;
    const doneKeys = Object.keys(state.done).filter(k=>state.done[k]);
    const doneNames = doneKeys.map(k => state.rides.find(r => keyFor(r.name) === k)?.name || k);
    const fresh = feedFreshness();
    let sessionDetail;
    if (live) sessionDetail = `GPS confirmed within Disneyland Paris; accuracy about ${Math.round(state.gpsAccuracy || 0)}m`;
    else if (state.settings.preview) sessionDetail = 'TEST MODE; preview simulation; physical park presence is not used';
    else if (state.gps) sessionDetail = `NOT PHYSICALLY IN PARK CONFIRMED; GPS ${(gpsDistanceFromDLP()/1000).toFixed(1)} km from DLP`;
    else sessionDetail = 'TEST MODE; physical park presence unconfirmed because there is no in-resort GPS fix';

    let commitmentLine = 'Next fixed point: none active';
    let safeMinutesLine = 'Safe time remaining: not constrained by a fixed point';
    if (c) {
      const safeAt = new Date(parisDateTime(c.date,c.time).getTime()-bufferFor(c)*60000);
      const safeMins = Math.max(0, Math.floor((safeAt-now)/60000));
      commitmentLine = `Next fixed point: ${c.name} at ${c.time}; target arrival ${parisTime(safeAt)}; area ${c.area}`;
      safeMinutesLine = `Safe time remaining: ${safeMins} minutes until target arrival`;
    }

    const lines = [
      'DLP DISPATCHER STATUS v0.5.1',
      `Session: ${live ? 'LIVE' : 'TEST'}`,
      `Session detail: ${sessionDetail}`,
      `Paris time: ${parisDateKey(now)} ${parisTime(now)}${state.settings.preview?' (preview clock)':''}`,
      `Routing location: ${location}`,
      `Location source: ${locationSourceLabel()}`,
      `Mode: ${state.settings.mode}; Single Rider: ${state.settings.singleRider?'yes':'no'}; Park hopping: ${state.settings.parkHop?'consider':'stay in current park'}`,
      `Current park for routing: ${currentPark() || 'unknown'}`,
      `Primary live source: ${state.source || 'none'}${state.sourceUpdated?`; updated ${state.sourceUpdated.toISOString()}`:''}; freshness ${fresh.level}${fresh.mins==null?'':` (${fresh.mins}m old)`}`,
      `Secondary cross-check: ${state.secondarySource || 'unavailable'}; material disagreements ${state.feedDisagreements.length}${state.secondaryError?`; diagnostic ${state.secondaryError}`:''}`,
      `Feed disagreement detail: ${state.feedDisagreements.length ? state.feedDisagreements.map(feedDisagreementSummary).join(' | ') : 'none'}`,
      commitmentLine,
      safeMinutesLine,
      `Top engine picks: ${recs.map((x,i)=>`${i+1}) ${x.ride.name} ${x.chosenWait}m ${x.queueLabel}, ${x.walkTo}m walk, ${x.meta.label}, ${x.dwellMinutes}m experience, data ${x.rideFresh.level}${x.rideFresh.mins==null?'':` ${x.rideFresh.mins}m old`}; reason: ${recommendationReason(x)}`).join(' | ') || 'none'}`,
      `Done this trip: ${doneNames.length ? doneNames.join(', ') : 'none marked'}`,
      `Deferred/not now: ${Object.keys(state.notNow).filter(isDeferred).map(k=>{const name=state.rides.find(r=>keyFor(r.name)===k)?.name||k;return `${name} (${deferredRemaining(k)}m remaining)`;}).join(', ')||'none'}`,
      live
        ? 'Please re-check current public live data and tell us the best next move, prioritising enjoyment and fixed bookings over raw ride count.'
        : 'TEST PACKET ONLY. Do not treat us as physically at Disneyland Paris. Re-check current public live data only to evaluate whether the dispatcher logic and rankings look sensible.'
    ];
    try { await navigator.clipboard.writeText(lines.join('\n')); toast('v0.5.1 status packet copied. Paste it into ChatGPT.'); }
    catch { prompt('Copy this status packet:', lines.join('\n')); }
  }

  function bind() {
    $('#refreshBtn').addEventListener('click',refreshLive);
    $('#gpsBtn').addEventListener('click',useGPS);
    $('#copyBtn').addEventListener('click',copyPacket);
    $('#locationSelect').addEventListener('change',e=>{ state.gps=null; state.gpsAccuracy=null; state.settings.location=e.target.value; state.settings.locationSource='manual'; $('#gpsBtn').textContent='Use my location'; save(); renderAll(); });
    $('#modeSelect').addEventListener('change',e=>{state.settings.mode=e.target.value;save();renderAll();});
    $('#singleRiderToggle').addEventListener('change',e=>{state.settings.singleRider=e.target.checked;save();renderAll();});
    $('#parkHopToggle').addEventListener('change',e=>{state.settings.parkHop=e.target.checked;save();renderAll();});
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

  function refreshOnResume(){if(document.visibilityState!=='visible')return;const age=state.lastFetchedAt?(Date.now()-state.lastFetchedAt.getTime()):Infinity;if(age>60000)refreshLive();else{renderSourceAge();renderWaitBoard();}}
  initLocationSelect(); bind(); renderAll(); refreshLive();
  setInterval(refreshLive, REFRESH_MS);
  setInterval(()=>{renderHero();renderPreviewSummary();renderSourceAge();renderWaitBoard();},60000);
  document.addEventListener('visibilitychange',refreshOnResume);
  window.addEventListener('pageshow',refreshOnResume);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
