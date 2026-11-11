// Assembles the static site in docs/ (served by GitHub Pages): library, lab, design system, and the files that make it installable.
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
copyFileSync('dist/aid.js', 'docs/aid.js');
for (const [src, out] of [['demo/index.html', 'docs/lab.html'], ['demo/system.html', 'docs/system.html']]) {
  const html = readFileSync(src, 'utf8').replace(/from '\.\.\/dist\/aid\.js'/g, "from './aid.js'").replace("import '../dist/aid.js';", "import './aid.js';");
  writeFileSync(out, html);
}
writeFileSync('docs/manifest.webmanifest', JSON.stringify({
  name: 'AID Design System', short_name: 'AID', start_url: './system.html', scope: './', display: 'standalone',
  background_color: '#EEF0F3', theme_color: '#EEF0F3',
  icons: [{ src: 'img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }],
}, null, 2));
// Network first, cache as a fallback: the site stays current online and still opens offline.
writeFileSync('docs/sw.js', `const C='aid-v1';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(['./system.html','./lab.html','./index.html','./aid.js'])))});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 e.respondWith(fetch(r).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put(r,y));return x}).catch(()=>caches.match(r)))});
`);
console.log('docs/ ready');
