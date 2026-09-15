import fs from 'node:fs';

const BBOX = { south:48.863, west:2.770, north:48.8768, east:2.7878 };
const AREAS = [
  { name:'Main Street U.S.A.', park:'Disneyland Park', lat:48.87105, lon:2.77974 },
  { name:'Frontierland', park:'Disneyland Park', lat:48.87155, lon:2.77695 },
  { name:'Adventureland', park:'Disneyland Park', lat:48.87225, lon:2.77575 },
  { name:'Fantasyland', park:'Disneyland Park', lat:48.87325, lon:2.77810 },
  { name:'Discoveryland', park:'Disneyland Park', lat:48.87275, lon:2.78205 },
  { name:'Production Courtyard', park:'Disney Adventure World', lat:48.86755, lon:2.78055 },
  { name:'Marvel Avengers Campus', park:'Disney Adventure World', lat:48.86675, lon:2.78165 },
  { name:'Worlds of Pixar', park:'Disney Adventure World', lat:48.86785, lon:2.78305 },
  { name:'World of Frozen', park:'Disney Adventure World', lat:48.86900, lon:2.78535 }
];

const official = [
  {
    id:'official-baby-dlp', kind:'baby', name:'Baby Care Centre', park:'Disneyland Park', area:'Main Street U.S.A.',
    lat:48.87105, lon:2.77974, precision:'area', source:'Disneyland Paris',
    tags:['baby care','baby change','changing','feeding','bottle','microwave','family'],
    note:'Official Baby Care Centre near Plaza Gardens. Area-level pin: follow Disney signage for the final metres.'
  },
  {
    id:'official-firstaid-dlp', kind:'firstaid', name:'First Aid', park:'Disneyland Park', area:'Main Street U.S.A.',
    lat:48.87105, lon:2.77974, precision:'area', source:'Disneyland Paris',
    tags:['first aid','medical','health','help'],
    note:'Official First Aid location on Main Street U.S.A. Area-level pin: follow Disney signage for the final metres.'
  },
  {
    id:'official-baby-daw', kind:'baby', name:'Baby Care Centre', park:'Disney Adventure World', area:'Production Courtyard',
    lat:48.86755, lon:2.77955, precision:'area', source:'Disneyland Paris',
    tags:['baby care','baby change','changing','feeding','bottle','microwave','family'],
    note:'Official Baby Care Centre by Studio Services. Area-level pin: follow Disney signage for the final metres.'
  },
  {
    id:'official-firstaid-daw', kind:'firstaid', name:'First Aid', park:'Disney Adventure World', area:'Production Courtyard',
    lat:48.86755, lon:2.77955, precision:'area', source:'Disneyland Paris',
    tags:['first aid','medical','health','help'],
    note:'Official First Aid location near the park entrance / Studio Services. Area-level pin: follow Disney signage for the final metres.'
  }
];

function haversine(a,b){
  const R=6371000,toRad=x=>x*Math.PI/180;
  const dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon);
  const q=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}
function parkFor(lat){ return lat >= 48.8696 ? 'Disneyland Park' : 'Disney Adventure World'; }
function areaFor(lat,lon,park){
  return AREAS.filter(x=>x.park===park).sort((a,b)=>haversine({lat,lon},a)-haversine({lat,lon},b))[0]?.name || park;
}
function coord(el){
  if(Number.isFinite(el.lat)&&Number.isFinite(el.lon))return{lat:el.lat,lon:el.lon};
  if(Number.isFinite(el.center?.lat)&&Number.isFinite(el.center?.lon))return{lat:el.center.lat,lon:el.center.lon};
  return null;
}
function classify(tags={}){
  if(tags.amenity==='toilets')return'toilet';
  if(tags.amenity==='drinking_water')return'water';
  if(tags.emergency==='first_aid'||tags.amenity==='first_aid')return'firstaid';
  if(tags.changing_table==='yes'||tags.baby_changing==='yes')return'babychange';
  return null;
}
function labelFor(kind,tags={}){
  if(tags.name)return tags.name;
  return {toilet:'Toilets',water:'Drinking water',firstaid:'First Aid',babychange:'Baby changing'}[kind]||'Park service';
}
function tagsFor(kind,t={}){
  const out=[];
  if(kind==='toilet')out.push('toilet','toilets','restroom','bathroom','loo','wc');
  if(kind==='water')out.push('water','drinking water','refill');
  if(kind==='firstaid')out.push('first aid','medical','health','help');
  if(kind==='babychange')out.push('baby change','changing','baby');
  if(t.changing_table==='yes'||t.baby_changing==='yes')out.push('baby change','changing','baby');
  if(t.wheelchair==='yes')out.push('wheelchair','accessible');
  if(t.unisex==='yes')out.push('unisex');
  return [...new Set(out)];
}

async function fetchOverpass(){
  const b=`${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`;
  const query=`[out:json][timeout:45];(nwr["amenity"="toilets"](${b});nwr["amenity"="drinking_water"](${b});nwr["emergency"="first_aid"](${b});nwr["amenity"="first_aid"](${b});nwr["changing_table"="yes"](${b});nwr["baby_changing"="yes"](${b}););out center tags;`;
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  let lastError=null;
  for(const url of endpoints){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),55000);
    try{
      const res=await fetch(url,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded','user-agent':'DLP-Dispatcher/0.9 (+https://github.com/merissamilena-lgtm/dlp-dispatcher)'},body:new URLSearchParams({data:query}),signal:controller.signal});
      if(!res.ok)throw new Error(`${url} ${res.status}`);
      const data=await res.json();
      return { elements:Array.isArray(data.elements)?data.elements:[], endpoint:url };
    }catch(e){ lastError=e; }
    finally{ clearTimeout(timer); }
  }
  throw lastError||new Error('Overpass unavailable');
}

let osm=[],endpoint=null,error=null;
try{
  const result=await fetchOverpass();osm=result.elements;endpoint=result.endpoint;
}catch(e){
  error=String(e?.message||e);
  console.warn('Overpass unavailable; building official-services fallback only:',error);
}

const seen=new Set();
const points=[];
for(const el of osm){
  const c=coord(el),kind=classify(el.tags||{});if(!c||!kind)continue;
  const key=`${kind}:${c.lat.toFixed(5)}:${c.lon.toFixed(5)}`;if(seen.has(key))continue;seen.add(key);
  const park=parkFor(c.lat),area=areaFor(c.lat,c.lon,park),tags=el.tags||{};
  points.push({
    id:`osm-${el.type}-${el.id}`,
    kind,
    name:labelFor(kind,tags),
    park,area,lat:c.lat,lon:c.lon,
    precision:'mapped',source:'OpenStreetMap',
    tags:tagsFor(kind,tags),
    note:kind==='toilet'&&(tags.changing_table==='yes'||tags.baby_changing==='yes')?'Mapped toilets with baby-changing information.':null
  });
}

const payload={
  generatedAt:new Date().toISOString(),
  bbox:BBOX,
  source:{osm:endpoint,osmError:error,official:'Disneyland Paris service-location descriptions'},
  points:[...official,...points].sort((a,b)=>a.park.localeCompare(b.park)||a.kind.localeCompare(b.kind)||a.name.localeCompare(b.name))
};
fs.mkdirSync('data',{recursive:true});
fs.writeFileSync('data/explore-pois.json',JSON.stringify(payload,null,2)+'\n');
const counts=payload.points.reduce((a,p)=>{a[p.kind]=(a[p.kind]||0)+1;return a;},{});
console.log('Explore POIs:',counts,'total',payload.points.length,'Overpass',endpoint||'fallback');
