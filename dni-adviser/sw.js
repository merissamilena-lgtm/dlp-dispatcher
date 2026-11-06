/* Adviser aide-memoire app shell only. Do not cache incident or person data. */
const CACHE='dni-adviser-shell-v081';
const ASSETS=['./','./index.html','./app.webmanifest','./icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(x=>x.startsWith('dni-adviser-')&&x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url),scope=new URL('./',self.registration.scope);
 if(u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok&&ASSETS.some(p=>new URL(p,scope).pathname===u.pathname)){let c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));}return r;}).catch(()=>caches.match(e.request)));
});
