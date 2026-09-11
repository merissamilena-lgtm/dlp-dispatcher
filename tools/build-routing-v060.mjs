import fs from 'node:fs';

const DEST='e8d0207f-da8a-4048-bec8-117aa946b2c2';
const B={south:48.8630,west:2.7700,north:48.8768,east:2.7878};
const bbox=`${B.south},${B.west},${B.north},${B.east}`;
const VERSION='0.6.0';

function norm(s=''){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[™®©*]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function toks(s){return new Set(norm(s).split(' ').filter(Boolean));}
function similarity(a,b){const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;const as=norm(a),bs=norm(b);if(as===bs)return 1;if(as.includes(bs)||bs.includes(as))return .9;let i=0;for(const x of A)if(B.has(x))i++;return i/(A.size+B.size-i);}
function hav(a,b){if(!a||!b)return Infinity;const R=6371000,r=x=>x*Math.PI/180,dLat=r(b.lat-a.lat),dLon=r(b.lon-a.lon),q=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
function tpCoord(e){const lat=Number(e?.location?.latitude),lon=Number(e?.location?.longitude);return Number.isFinite(lat)&&Number.isFinite(lon)?{lat,lon}:null;}
function osmCoord(e){if(Number.isFinite(e?.lat)&&Number.isFinite(e?.lon))return{lat:e.lat,lon:e.lon};if(Number.isFinite(e?.center?.lat)&&Number.isFinite(e?.center?.lon))return{lat:e.center.lat,lon:e.center.lon};if(Array.isArray(e?.geometry)&&e.geometry.length){let lat=0,lon=0,n=0;for(const p of e.geometry){if(Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)){lat+=p.lat;lon+=p.lon;n++;}}if(n)return{lat:lat/n,lon:lon/n};}return null;}
function names(e){const t=e?.tags||{};return[t.name,t['name:en'],t['name:fr'],t.alt_name,t.short_name].filter(Boolean);}
function flatten(root){const out=[],seen=new Set();function walk(v){if(!v)return;if(Array.isArray(v)){v.forEach(walk);return;}if(typeof v!=='object')return;if(v.id&&v.entityType&&!seen.has(v.id)){seen.add(v.id);out.push(v);}if(Array.isArray(v.children))v.children.forEach(walk);}walk(root?.children??root);return out;}
async function json(url,opts={}){const r=await fetch(url,{...opts,headers:{'User-Agent':'DLP-Dispatcher-routing-builder/0.6',...(opts.headers||{})},signal:AbortSignal.timeout(65000)});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.json();}
async function overpass(query){const body=new URLSearchParams({data:query}).toString();let last;for(const url of ['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter','https://overpass.kumi.systems/api/interpreter']){for(let attempt=1;attempt<=2;attempt++){try{return await json(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});}catch(e){last=e;console.warn(`${url} attempt ${attempt}: ${e.message}`);await new Promise(r=>setTimeout(r,1500*attempt));}}}throw last;}
function nearest(list,c,get=osmCoord){let best=null;for(const x of list){const xc=get(x);if(!xc)continue;const d=hav(c,xc);if(!best||d<best.distance)best={item:x,coord:xc,distance:d};}return best;}
function match(e,features){const c=tpCoord(e);let best=null;for(const o of features){const oc=osmCoord(o);if(!oc)continue;const d=hav(c,oc);if(d>300)continue;let s=0;for(const n of names(o))s=Math.max(s,similarity(e.name,n));if(!best||s>best.score||(s===best.score&&d<best.distance))best={item:o,score:s,distance:d};}return best&&best.score>=.48?best:null;}

const poiQuery=`[out:json][timeout:45];(node["entrance"](${bbox});nwr["tourism"="attraction"](${bbox});nwr["attraction"](${bbox});nwr["amenity"~"^(restaurant|fast_food)$"](${bbox}););out body center;`;
const walkQuery=`[out:json][timeout:45];way["highway"~"^(footway|pedestrian|path|corridor|living_street)$"](${bbox});out body geom;`;
const [tpRaw,poiRaw,walkRaw]=await Promise.all([json(`https://api.themeparks.wiki/v1/entity/${DEST}/children`),overpass(poiQuery),overpass(walkQuery)]);
const entities=flatten(tpRaw),attractions=entities.filter(e=>e.entityType==='ATTRACTION'&&tpCoord(e)),dining=entities.filter(e=>['RESTAURANT','DINING'].includes(e.entityType)&&tpCoord(e));
const dedupe=new Map();for(const e of poiRaw.elements||[])dedupe.set(`${e.type}:${e.id}`,e);const pois=[...dedupe.values()];
const entranceNodes=pois.filter(e=>e.type==='node'&&e.tags?.entrance);
const guestEntrances=entranceNodes.filter(e=>!['no','exit','private'].includes(String(e.tags?.entrance||'').toLowerCase()));
const exits=entranceNodes.filter(e=>String(e.tags?.entrance||'').toLowerCase()==='exit');
const attractionFeatures=pois.filter(e=>e.tags?.attraction||e.tags?.tourism==='attraction');
const diningFeatures=pois.filter(e=>['restaurant','fast_food'].includes(e.tags?.amenity));

const nodeMap=new Map(),edgeSet=new Set(),edges=[];
function addNode(id,lat,lon){if(Number.isFinite(lat)&&Number.isFinite(lon)&&!nodeMap.has(id))nodeMap.set(id,[id,+lat.toFixed(7),+lon.toFixed(7)]);}
function blocked(w){const t=w.tags||{},access=String(t.access||'').toLowerCase(),foot=String(t.foot||'').toLowerCase(),wheel=String(t.wheelchair||'').toLowerCase();return ['private','no'].includes(access)||foot==='no'||wheel==='no';}
for(const w of walkRaw.elements||[]){if(w.type!=='way'||!Array.isArray(w.nodes)||w.nodes.length<2||blocked(w))continue;const geom=w.geometry||[];for(let i=0;i<w.nodes.length;i++){const g=geom[i];if(g)addNode(w.nodes[i],g.lat,g.lon);if(!i||!geom[i-1]||!g)continue;const a=w.nodes[i-1],b=w.nodes[i];const k=a<b?`${a}:${b}`:`${b}:${a}`;if(edgeSet.has(k))continue;edgeSet.add(k);const m=Math.max(1,Math.round(hav({lat:geom[i-1].lat,lon:geom[i-1].lon},{lat:g.lat,lon:g.lon})));edges.push([a,b,m]);}}

function pointFromNode(n,confidence,source){return n?{lat:+n.lat.toFixed(7),lon:+n.lon.toFixed(7),confidence,source,osmNode:n.id}:null;}
function sameWayNode(matchResult,list){if(matchResult?.item?.type!=='way'||!Array.isArray(matchResult.item.nodes))return null;return list.find(n=>matchResult.item.nodes.includes(n.id))||null;}
function entryFor(e,features){const c=tpCoord(e),m=match(e,features),same=sameWayNode(m,guestEntrances);if(same)return pointFromNode(same,'strong','osm-same-feature');const near=nearest(guestEntrances,c);if(near&&near.distance<=20)return {...pointFromNode(near.item,'candidate','osm-nearby'),distanceFromPoiM:Math.round(near.distance)};return {...c,confidence:'fallback',source:'themeparks-poi'};}
function exitFor(e,features){const c=tpCoord(e),m=match(e,features),same=sameWayNode(m,exits);if(same)return pointFromNode(same,'strong','osm-exit-same-feature');return {...c,confidence:'fallback',source:'themeparks-poi'};}

const locationEntries={};
for(const e of attractions){locationEntries[norm(e.name)]={name:e.name,type:'attraction',entityId:e.id,poi:tpCoord(e),entrance:entryFor(e,attractionFeatures),exit:exitFor(e,attractionFeatures)};}
const commitmentAliases={
  agrabah:['Agrabah Café','Agrabah Café Restaurant'],
  walts:["Walt's",'Walt’s – an American restaurant'],
  pym:['PYM Kitchen'],
  silver:['Silver Spur Steakhouse'],
  nordic:['Nordic Crowns Tavern'],
  remy:['Bistrot Chez Rémy']
};
const commitments={};
for(const [id,aliases] of Object.entries(commitmentAliases)){let e=null;for(const a of aliases){e=dining.find(x=>similarity(x.name,a)>=.8);if(e)break;}if(e)commitments[id]={name:e.name,type:'commitment',entityId:e.id,poi:tpCoord(e),entrance:entryFor(e,diningFeatures)};}

fs.mkdirSync('data',{recursive:true});
const graph={version:VERSION,generatedAt:new Date().toISOString(),profile:'stroller-step-free',bbox:B,nodes:[...nodeMap.values()],edges};
const locations={version:VERSION,generatedAt:graph.generatedAt,policy:{entrance:'same-feature OSM, else <=20m candidate, else ThemeParks POI',exit:'same-feature OSM exit, else ThemeParks POI',productionUse:false},attractions:locationEntries,commitments};
fs.writeFileSync('data/routing-graph.json',JSON.stringify(graph));
fs.writeFileSync('data/routing-locations.json',JSON.stringify(locations,null,2)+'\n');
console.log(JSON.stringify({nodes:graph.nodes.length,edges:graph.edges.length,attractions:Object.keys(locationEntries).length,commitments:Object.keys(commitments).length,strongEntrances:Object.values(locationEntries).filter(x=>x.entrance.confidence==='strong').length,candidateEntrances:Object.values(locationEntries).filter(x=>x.entrance.confidence==='candidate').length,strongExits:Object.values(locationEntries).filter(x=>x.exit.confidence==='strong').length},null,2));
