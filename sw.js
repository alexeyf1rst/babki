/* Своё дело — офлайн-кэш. Меняешь файлы приложения — подними версию. */
const V='svoe-delo-v4';
const SHELL=['./','./index.html','./styles.css','./fonts.css','./data.js','./render.js','./app.js',
  './manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./icon-180.png',
  './fonts/manrope-400-800-cyrillic.woff2',
  './fonts/manrope-400-800-latin.woff2',
  './fonts/oswald-500-700-cyrillic.woff2',
  './fonts/oswald-500-700-latin.woff2',
  './fonts/plexmono-400-cyrillic.woff2',
  './fonts/plexmono-400-latin.woff2',
  './fonts/plexmono-600-cyrillic.woff2',
  './fonts/plexmono-600-latin.woff2'];

self.addEventListener('install',e=>{
  /* каждый файл кладём отдельно: если одного нет, кэш всё равно соберётся */
  e.waitUntil(caches.open(V)
    .then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{}))))
    .then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
function put(req,res){
  if(res&&res.ok){const copy=res.clone();caches.open(V).then(c=>c.put(req,copy)).catch(()=>{})}
  return res;
}
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  let url;
  try{url=new URL(req.url)}catch(err){return}
  /* шрифты лежат рядом, наружу приложение не ходит вообще */
  if(url.origin!==self.location.origin)return;

  /* страница, стили и код — сначала сеть, чтобы правки доезжали; офлайн — из кэша */
  if(req.mode==='navigate'||/\.(html|css|js)$/.test(url.pathname)){
    e.respondWith(fetch(req).then(r=>put(req,r))
      .catch(()=>caches.match(req).then(m=>m||caches.match('./index.html'))));
    return;
  }
  /* остальное — сначала кэш: иконки и шрифты не меняются */
  e.respondWith(caches.match(req).then(m=>m||fetch(req).then(r=>put(req,r)).catch(()=>m)));
});
