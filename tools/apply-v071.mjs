import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
let app=read('app.js'),html=read('index.html'),sw=read('sw.js'),readme=read('README.md');

if(!app.includes("$('[data-remove-timed]').forEach")) throw new Error('Timed remove selector bug anchor missing');
app=app.replace("$('[data-remove-timed]').forEach","$$('[data-remove-timed]').forEach");
app=app.replaceAll('v0.7.0','v0.7.1');
html=html.replaceAll('v0.7.0','v0.7.1').replaceAll('?v=0.6.1','?v=0.7.1');
sw=sw.replaceAll('v0.7.0','v0.7.1').replaceAll('?v=0.6.1','?v=0.7.1');
readme=readme.replaceAll('v0.7.0','v0.7.1');

write('app.js',app);write('index.html',html);write('sw.js',sw);write('README.md',readme);
console.log('Applied v0.7.1 timed-item runtime/cache hotfix.');
