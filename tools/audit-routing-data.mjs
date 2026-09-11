import fs from 'node:fs';

const TP_DESTINATION = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
const BBOX = { south: 48.8630, west: 2.7700, north: 48.8768, east: 2.7878 };
const GENERATED_AT = new Date().toISOString();

function norm(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©*]/g, '')
    .replace(/\b(the|presented by|disneyland|paris)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(s) { return new Set(norm(s).split(' ').filter(Boolean)); }
function jaccard(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
function nameScore(a, b) {
  const A = norm(a), B = norm(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.88;
  return jaccard(A, B);
}
function hav(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000, r = x => x * Math.PI / 180;
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(q));
}
function coordOfEntity(e) {
  const lat = Number(e?.location?.latitude), lon = Number(e?.location?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}
function centroid(el) {
  if (Number.isFinite(el.lat) && Number.isFinite(el.lon)) return { lat: el.lat, lon: el.lon };
  if (Array.isArray(el.geometry) && el.geometry.length) {
    let lat = 0, lon = 0, n = 0;
    for (const p of el.geometry) if (Number.isFinite(p?.lat) && Number.isFinite(p?.lon)) { lat += p.lat; lon += p.lon; n++; }
    if (n) return { lat: lat / n, lon: lon / n };
  }
  return null;
}
function flattenChildren(root) {
  const out = [];
  const seen = new Set();
  function walk(v) {
    if (!v) return;
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (typeof v !== 'object') return;
    if (v.id && v.entityType && !seen.has(v.id)) { seen.add(v.id); out.push(v); }
    if (Array.isArray(v.children)) for (const x of v.children) walk(x);
  }
  walk(root?.children ?? root);
  return out;
}
async function getJson(url, options = {}) {
  const r = await fetch(url, { ...options, headers: { 'User-Agent': 'DLP-Dispatcher-routing-audit/0.1', ...(options.headers || {}) }, signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} for ${url}`);
  return r.json();
}
async function fetchThemeParks() {
  return getJson(`https://api.themeparks.wiki/v1/entity/${TP_DESTINATION}/children`);
}
async function fetchOverpass() {
  const b = `${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`;
  const query = `[out:json][timeout:60];(\n` +
    `way["highway"](${b});\n` +
    `node["entrance"](${b});\n` +
    `way["building"](${b});\n` +
    `nwr["tourism"="attraction"](${b});\n` +
    `nwr["attraction"](${b});\n` +
    `nwr["amenity"="restaurant"](${b});\n` +
    `nwr["amenity"="fast_food"](${b});\n` +
    `nwr["railway"="station"](${b});\n` +
    `);out body geom;`;
  const body = new URLSearchParams({ data: query }).toString();
  const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  let last;
  for (const url of endpoints) {
    try {
      return await getJson(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    } catch (e) { last = e; }
  }
  throw last;
}

class UF {
  constructor() { this.p = new Map(); this.sz = new Map(); }
  add(x) { if (!this.p.has(x)) { this.p.set(x, x); this.sz.set(x, 1); } }
  find(x) { let p = this.p.get(x); if (p === x) return x; p = this.find(p); this.p.set(x, p); return p; }
  union(a, b) { this.add(a); this.add(b); a = this.find(a); b = this.find(b); if (a === b) return; if (this.sz.get(a) < this.sz.get(b)) [a, b] = [b, a]; this.p.set(b, a); this.sz.set(a, this.sz.get(a) + this.sz.get(b)); }
  sizes() { const m = new Map(); for (const x of this.p.keys()) { const r = this.find(x); m.set(r, (m.get(r) || 0) + 1); } return [...m.values()].sort((a,b)=>b-a); }
}

const WALK_HIGHWAYS = new Set(['footway','pedestrian','path','steps','corridor','living_street']);
function walkableWay(w) {
  const h = w.tags?.highway;
  if (!WALK_HIGHWAYS.has(h)) return false;
  const access = w.tags?.access;
  const foot = w.tags?.foot;
  if ((access === 'private' || access === 'no') && !['yes','designated','permissive'].includes(foot)) return false;
  return true;
}
function namesFor(el) {
  const t = el.tags || {};
  return [t.name, t['name:en'], t['name:fr'], t.alt_name, t.short_name].filter(Boolean);
}
function labelFor(el) { return namesFor(el)[0] || `${el.type}/${el.id}`; }
function osmKind(el) {
  const t = el.tags || {};
  if (t.entrance) return 'entrance';
  if (t.attraction || t.tourism === 'attraction') return 'attraction';
  if (t.amenity === 'restaurant' || t.amenity === 'fast_food') return 'dining';
  if (t.railway === 'station') return 'station';
  if (t.building) return 'building';
  if (t.highway) return 'path';
  return 'other';
}

const [tpRaw, osmRaw] = await Promise.all([fetchThemeParks(), fetchOverpass()]);
const entities = flattenChildren(tpRaw);
const attractions = entities.filter(e => e.entityType === 'ATTRACTION');
const dining = entities.filter(e => e.entityType === 'RESTAURANT' || e.entityType === 'DINING');
const parks = entities.filter(e => e.entityType === 'PARK');
const tpWithCoords = entities.filter(coordOfEntity);
const attractionCoords = attractions.filter(coordOfEntity);
const diningCoords = dining.filter(coordOfEntity);

const els = osmRaw.elements || [];
const entrances = els.filter(e => e.type === 'node' && e.tags?.entrance && !['no','exit'].includes(e.tags.entrance));
const namedEntrances = entrances.filter(e => namesFor(e).length);
const osmFeatures = els.filter(e => ['attraction','dining','station','building'].includes(osmKind(e)) && centroid(e));
const osmAttractions = els.filter(e => osmKind(e) === 'attraction' && centroid(e));
const osmDining = els.filter(e => osmKind(e) === 'dining' && centroid(e));
const walkWays = els.filter(e => e.type === 'way' && walkableWay(e) && Array.isArray(e.nodes) && e.nodes.length > 1);

const uf = new UF();
const graphCoords = new Map();
for (const w of walkWays) {
  const geom = Array.isArray(w.geometry) ? w.geometry : [];
  for (let i = 0; i < w.nodes.length; i++) {
    const id = w.nodes[i]; uf.add(id);
    const g = geom[i]; if (g && Number.isFinite(g.lat) && Number.isFinite(g.lon)) graphCoords.set(id, {lat:g.lat,lon:g.lon});
    if (i) uf.union(w.nodes[i-1], id);
  }
}
const compSizes = uf.sizes();
const graphNodes = uf.p.size;
const largestComp = compSizes[0] || 0;

function nearest(items, c) {
  let best = null;
  for (const x of items) {
    const xc = x.__coord || centroid(x);
    const d = hav(c, xc);
    if (!best || d < best.distance) best = { item:x, distance:d, coord:xc };
  }
  return best;
}
const graphPoints = [...graphCoords.entries()].map(([id,c]) => ({ id, __coord:c }));
function bestOsmMatch(e) {
  const c = coordOfEntity(e);
  if (!c) return null;
  let best = null;
  for (const o of osmFeatures) {
    const d = hav(c, centroid(o));
    if (d > 300) continue;
    let s = 0;
    for (const n of namesFor(o)) s = Math.max(s, nameScore(e.name, n));
    if (!best || s > best.score || (s === best.score && d < best.distance)) best = { item:o, score:s, distance:d };
  }
  return best && best.score >= 0.48 ? best : null;
}

const attractionAudit = attractionCoords.map(e => {
  const c = coordOfEntity(e);
  const match = bestOsmMatch(e);
  const ne = nearest(entrances, c);
  const ng = nearest(graphPoints, c);
  const sameWayEntrance = match?.item?.type === 'way' && Array.isArray(match.item.nodes)
    ? entrances.find(n => match.item.nodes.includes(n.id)) : null;
  let entranceConfidence = 'none';
  if (sameWayEntrance) entranceConfidence = 'strong';
  else if (ne && ne.distance <= 25) entranceConfidence = 'candidate';
  else if (ne && ne.distance <= 60) entranceConfidence = 'nearby';
  return {
    id:e.id, name:e.name, parkId:e.parkId || null, coordinate:c,
    osmMatch: match ? { type:match.item.type, id:match.item.id, name:labelFor(match.item), score:+match.score.toFixed(2), distanceM:Math.round(match.distance) } : null,
    nearestEntrance: ne ? { id:ne.item.id, tag:ne.item.tags?.entrance || null, name:namesFor(ne.item)[0] || null, distanceM:Math.round(ne.distance), coordinate:ne.coord } : null,
    entranceOnMatchedWay: sameWayEntrance ? { id:sameWayEntrance.id, tag:sameWayEntrance.tags?.entrance || null, name:namesFor(sameWayEntrance)[0] || null, coordinate:{lat:sameWayEntrance.lat,lon:sameWayEntrance.lon} } : null,
    entranceConfidence,
    nearestWalkGraphM: ng ? Math.round(ng.distance) : null,
  };
});

const diningAudit = diningCoords.map(e => {
  const c = coordOfEntity(e), ne = nearest(entrances, c), ng = nearest(graphPoints, c), match = bestOsmMatch(e);
  return { id:e.id, name:e.name, coordinate:c, osmMatch:match ? {name:labelFor(match.item),score:+match.score.toFixed(2),distanceM:Math.round(match.distance)}:null, nearestEntranceM:ne?Math.round(ne.distance):null, nearestWalkGraphM:ng?Math.round(ng.distance):null };
});

const counts = {
  themeparks: {
    entities: entities.length, parks: parks.length, attractions: attractions.length, dining: dining.length,
    entitiesWithCoordinates: tpWithCoords.length, attractionsWithCoordinates: attractionCoords.length, diningWithCoordinates: diningCoords.length,
  },
  osm: {
    elements: els.length, attractionFeatures: osmAttractions.length, diningFeatures: osmDining.length,
    entrances: entrances.length, namedEntrances: namedEntrances.length,
    walkWays: walkWays.length, walkGraphNodes: graphNodes, walkGraphComponents: compSizes.length,
    largestWalkComponentNodes: largestComp, largestWalkComponentShare: graphNodes ? +(largestComp / graphNodes * 100).toFixed(1) : 0,
  },
  attractionCoverage: {
    osmNameMatches: attractionAudit.filter(x=>x.osmMatch).length,
    strongEntrances: attractionAudit.filter(x=>x.entranceConfidence==='strong').length,
    candidateEntrances25m: attractionAudit.filter(x=>x.entranceConfidence==='candidate').length,
    nearbyEntrances60m: attractionAudit.filter(x=>x.entranceConfidence==='nearby').length,
    noNearbyEntrance60m: attractionAudit.filter(x=>x.entranceConfidence==='none').length,
    centroidWithin25mOfWalkGraph: attractionAudit.filter(x=>x.nearestWalkGraphM!=null&&x.nearestWalkGraphM<=25).length,
    centroidWithin50mOfWalkGraph: attractionAudit.filter(x=>x.nearestWalkGraphM!=null&&x.nearestWalkGraphM<=50).length,
  }
};

const report = { generatedAt:GENERATED_AT, bbox:BBOX, counts, attractions:attractionAudit, dining:diningAudit };
fs.mkdirSync('docs', { recursive:true });
fs.writeFileSync('docs/routing-audit.json', JSON.stringify(report, null, 2) + '\n');

const c = counts;
const low = attractionAudit.filter(x=>x.entranceConfidence==='none').sort((a,b)=>(a.nearestEntrance?.distanceM??9999)-(b.nearestEntrance?.distanceM??9999));
const strong = attractionAudit.filter(x=>x.entranceConfidence==='strong');
const candidate = attractionAudit.filter(x=>['candidate','nearby'].includes(x.entranceConfidence)).sort((a,b)=>a.nearestEntrance.distanceM-b.nearestEntrance.distanceM);
const graphFar = attractionAudit.filter(x=>x.nearestWalkGraphM==null||x.nearestWalkGraphM>50).sort((a,b)=>(b.nearestWalkGraphM??9999)-(a.nearestWalkGraphM??9999));
const md = `# DLP precision-routing data audit\n\nGenerated ${GENERATED_AT}. This is a machine audit of current ThemeParks.wiki entity coordinates against an OpenStreetMap/Overpass extract for the two Disneyland Paris parks. It does **not** treat an arbitrary nearby OSM building entrance as a verified ride queue entrance.\n\n## Coverage snapshot\n\n- ThemeParks.wiki: ${c.themeparks.attractions} attractions, ${c.themeparks.attractionsWithCoordinates} with coordinates; ${c.themeparks.dining} dining entities, ${c.themeparks.diningWithCoordinates} with coordinates.\n- OSM extract: ${c.osm.attractionFeatures} attraction features, ${c.osm.diningFeatures} dining features, ${c.osm.entrances} entrance nodes (${c.osm.namedEntrances} named).\n- Guest-walk graph candidate: ${c.osm.walkWays} foot/pedestrian/path/steps/corridor ways, ${c.osm.walkGraphNodes} nodes, ${c.osm.walkGraphComponents} components; largest component contains ${c.osm.largestWalkComponentShare}% of graph nodes.\n- Attraction/OSM name matches: ${c.attractionCoverage.osmNameMatches}/${c.themeparks.attractionsWithCoordinates}.\n- Entrance evidence: ${c.attractionCoverage.strongEntrances} strong same-feature entrance(s); ${c.attractionCoverage.candidateEntrances25m} additional entrance candidate(s) within 25 m; ${c.attractionCoverage.nearbyEntrances60m} additional nearby entrance(s) within 60 m; ${c.attractionCoverage.noNearbyEntrance60m} with no entrance node within 60 m.\n- Walk-network proximity: ${c.attractionCoverage.centroidWithin25mOfWalkGraph}/${c.themeparks.attractionsWithCoordinates} attraction coordinates are within 25 m of the candidate walk graph; ${c.attractionCoverage.centroidWithin50mOfWalkGraph}/${c.themeparks.attractionsWithCoordinates} within 50 m.\n\n## Interpretation\n\nThe public data is suitable for replacing land-centre routing with attraction-level routing now. It is **not** sufficient to blindly call every nearest OSM entrance the standby queue entrance. Queue-mouth and ride-exit coordinates still need a curated overlay, especially where an attraction is represented by a centroid/track/building rather than a guest entrance.\n\nA practical v0.6 routing stack should therefore use: curated queue entrance/exit when verified; OSM/ThemeParks attraction coordinate as fallback; then area centre only as the last fallback. Walking should use the extracted pedestrian graph, with a short snap connector from GPS/POI to the graph and conservative penalties when the snap or GPS fix is poor.\n\n## Strong same-feature entrance evidence\n\n${strong.length ? strong.map(x=>`- ${x.name}: OSM entrance node ${x.entranceOnMatchedWay.id}`).join('\n') : '- None found by strict same-way test.'}\n\n## Nearby entrance candidates requiring human verification\n\n${candidate.slice(0,30).map(x=>`- ${x.name}: ${x.nearestEntrance.distanceM} m to nearest OSM entrance node (${x.entranceConfidence}).`).join('\n') || '- None.'}\n\n## No OSM entrance within 60 m\n\n${low.map(x=>`- ${x.name}: nearest entrance ${x.nearestEntrance ? `${x.nearestEntrance.distanceM} m` : 'not found'}.`).join('\n') || '- None.'}\n\n## Attraction coordinates more than 50 m from candidate walk graph\n\n${graphFar.map(x=>`- ${x.name}: ${x.nearestWalkGraphM == null ? 'no graph snap' : `${x.nearestWalkGraphM} m`}.`).join('\n') || '- None.'}\n\n## Next implementation step\n\nDo not replace production routing yet. Build a small curated overlay for the high-value attractions and all fixed-point restaurants first, then validate route outputs against known park geography. Once that overlay is sound, continuous GPS + graph routing can be introduced behind a feature flag while v0.5.3 remains the fallback.\n`;
fs.writeFileSync('docs/routing-audit.md', md);
console.log(JSON.stringify(counts, null, 2));
