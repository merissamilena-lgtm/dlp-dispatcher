const CACHE='dlp-dispatcher-v0.8.0';
const PUSH_CONTEXT_CACHE='dlp-push-context-v1';
const PUSH_CONTEXT_URL='./__push_context__';
const CLOUD_BASE='https://dlp-queue-proxy.rnspecfor.workers.dev';
const ASSETS=['./','index.html','styles.css?v=0.8.0','app.js?v=0.8.0','manifest.webmanifest','icon.svg'];

self.addEventListener('install',e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(x=>x!==CACHE&&x!==PUSH_CONTEXT_CACHE).map(x=>caches.delete(x))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(
    fetch(e.request)
      .then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r;})
      .catch(()=>caches.match(e.request).then(h=>h||caches.match('./')))
  );
});

async function savePushContext(context){
  const cache=await caches.open(PUSH_CONTEXT_CACHE);
  const url=new URL(PUSH_CONTEXT_URL,self.registration.scope).href;
  if(!context?.syncToken||!context?.deviceId){await cache.delete(url);return;}
  await cache.put(url,new Response(JSON.stringify(context),{headers:{'Content-Type':'application/json'}}));
}

async function readPushContext(){
  try{
    const cache=await caches.open(PUSH_CONTEXT_CACHE);
    const url=new URL(PUSH_CONTEXT_URL,self.registration.scope).href;
    const response=await cache.match(url);
    return response?await response.json():null;
  }catch{return null;}
}

self.addEventListener('message',e=>{
  if(e.data?.type==='SET_PUSH_CONTEXT')e.waitUntil(savePushContext(e.data.context));
  if(e.data?.type==='CLEAR_PUSH_CONTEXT')e.waitUntil(savePushContext(null));
});

self.addEventListener('push',e=>{
  e.waitUntil((async()=>{
    let notification={
      title:'🏰 DLP Dispatcher',
      body:'A protected trip time is getting close. Open Dispatcher for the current route.',
      tag:'dlp-dispatcher',
      url:'./'
    };
    const context=await readPushContext();
    if(context?.syncToken&&context?.deviceId){
      try{
        const response=await fetch(`${CLOUD_BASE}/push/pending/${encodeURIComponent(context.syncToken)}/${encodeURIComponent(context.deviceId)}`,{cache:'no-store'});
        if(response.ok){const pending=await response.json();if(pending?.title)notification={...notification,...pending};}
      }catch{}
    }
    await self.registration.showNotification(notification.title,{
      body:notification.body,
      tag:notification.tag||'dlp-dispatcher',
      renotify:true,
      icon:'icon.svg',
      badge:'icon.svg',
      data:{url:notification.url||'./'}
    });
  })());
});

self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil((async()=>{
    const target=new URL(e.notification.data?.url||'./',self.registration.scope).href;
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      if(new URL(client.url).origin===new URL(target).origin){
        await client.focus();
        if('navigate' in client&&client.url!==target)await client.navigate(target);
        return;
      }
    }
    if(self.clients.openWindow)await self.clients.openWindow(target);
  })());
});
