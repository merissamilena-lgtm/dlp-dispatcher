import fs from 'node:fs';

const path='tools/apply-v080.mjs';
let s=fs.readFileSync(path,'utf8');

function replaceBlock(startMarker,endMarker,replacement,label){
  const start=s.indexOf(startMarker);
  if(start<0)throw new Error(`Missing ${label} start marker`);
  const end=s.indexOf(endMarker,start);
  if(end<0)throw new Error(`Missing ${label} end marker`);
  s=s.slice(0,start)+replacement+s.slice(end);
}

replaceBlock(
  'const browserHelpers=`',
  'app=mustInsertAfter(app,\n  "  function deferRide',
  "const browserHelpers=read('tools/v080/app-browser-block.txt');\n",
  'browser helper block'
);

replaceBlock(
  'const cloudBlock=`',
  'app=mustInsertAfter(app,\n`  function showUndoToast',
  "const cloudBlock=read('tools/v080/app-cloud-block.txt');\n",
  'cloud helper block'
);

fs.writeFileSync(path,s);
console.log('Rewired v0.8.0 patcher to load staged browser/cloud blocks as text.');
