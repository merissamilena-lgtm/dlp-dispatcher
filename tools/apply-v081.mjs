import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const replaceExact=(s,bad,good,label)=>{
  if(!s.includes(bad))throw new Error(`Missing ${label}`);
  return s.split(bad).join(good);
};

let app=read('app.js'),html=read('index.html'),sw=read('sw.js'),readme=read('README.md');
app=replaceExact(app,"$('[data-view]').forEach","$$('[data-view]').forEach",'view selector');
app=replaceExact(app,"$('.ride-row').forEach","$$('.ride-row').forEach",'ride row selector');
app=replaceExact(app,"$('[data-unsnooze]').forEach","$$('[data-unsnooze]').forEach",'unsnooze selector');
app=replaceExact(app,"$('[data-rider-switch]').forEach","$$('[data-rider-switch]').forEach",'Rider Switch selector');
app=app.replaceAll('v0.8.0','v0.8.1');
html=html.replaceAll('v0.8.0','v0.8.1').replaceAll('?v=0.8.0','?v=0.8.1');
sw=sw.replaceAll('v0.8.0','v0.8.1').replaceAll('?v=0.8.0','?v=0.8.1');
readme=readme.replaceAll('v0.8.0','v0.8.1');
write('app.js',app);write('index.html',html);write('sw.js',sw);write('README.md',readme);
console.log('Applied v0.8.1 selector and cache-bust hotfix.');
