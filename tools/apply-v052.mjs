import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, text) { fs.writeFileSync(path, text); }
function replaceRequired(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Could not find expected ${label}`);
  return text.replace(from, to);
}

let app = read('app.js');

app = replaceRequired(
  app,
  "    if (HEADLINE_PATTERNS.some(p => n.includes(p))) return { category: 'headline', label: 'Headline ride', bonus: 15 };",
  "    if (HEADLINE_PATTERNS.some(p => n.includes(p))) return { category: 'headline', label: 'Headline ride', bonus: 12 };",
  'headline bonus'
);

app = replaceRequired(
  app,
  "    const dwellMinutes = experienceMinutes(meta);\n    let walkOnward=0, minutesToTarget=null, fits=true, target=null;",
  "    const dwellMinutes = experienceMinutes(meta);\n    const commitmentMinutes = walkTo + chosenWait + dwellMinutes;\n    let walkOnward=0, minutesToTarget=null, fits=true, target=null;",
  'commitment minutes'
);

app = replaceRequired(
  app,
  "    else if (meta.category==='playground') score+=chosenWait<=5?1:-8;\n    else if (chosenWait===0) score-=6;\n    if (parkHop) score-=PARK_HOP_SCORE_PENALTY;",
  "    else if (meta.category==='playground') score+=chosenWait<=5?1:-8;\n    else if (chosenWait===0) score-=6;\n    if (state.settings.mode==='balanced') {\n      if (chosenWait<=10) score+=6;\n      else if (chosenWait<=15) score+=5;\n      else if (chosenWait<=20) score+=2;\n      const excessCommitment=Math.max(0,commitmentMinutes-30);\n      score-=excessCommitment*.60;\n      if (commitmentMinutes<=30) score+=(30-commitmentMinutes)*.12;\n    }\n    if (parkHop) score-=PARK_HOP_SCORE_PENALTY;",
  'balanced efficiency scoring'
);

app = replaceRequired(
  app,
  "    return {ride,score,walkTo,walkOnward,chosenWait,queueLabel,dwellMinutes,avg,opportunity,priority,finish,meta:{...meta,area},minutesToTarget,target,parkHop,rideFresh};",
  "    return {ride,score,walkTo,walkOnward,chosenWait,queueLabel,dwellMinutes,commitmentMinutes,avg,opportunity,priority,finish,meta:{...meta,area},minutesToTarget,target,parkHop,rideFresh};",
  'recommendation return'
);

app = replaceRequired(
  app,
  "    if(x.meta.category==='playground')bits.push('time filler with realistic play time');\n    if(x.parkHop)bits.push('requires park hop');",
  "    if(x.meta.category==='playground')bits.push('time filler with realistic play time');\n    if(state.settings.mode==='balanced'&&x.commitmentMinutes<=30)bits.push('short total commitment');\n    if(['ride','headline'].includes(x.meta.category)&&x.chosenWait<=15)bits.push('short queue now');\n    if(x.parkHop)bits.push('requires park hop');",
  'recommendation reasons'
);

app = app.replace(
  "Includes about ${x.dwellMinutes}m experience time.",
  "Total commitment about <strong>${x.commitmentMinutes}m</strong>, including ${x.dwellMinutes}m experience time."
);

app = app.replace(
  "${x.meta.label}, ${x.dwellMinutes}m experience, data ${x.rideFresh.level}",
  "${x.meta.label}, ${x.dwellMinutes}m experience, ${x.commitmentMinutes}m total commitment, data ${x.rideFresh.level}"
);

app = app.replaceAll('DLP DISPATCHER STATUS v0.5.1', 'DLP DISPATCHER STATUS v0.5.2');
app = app.replaceAll("toast('v0.5.1 status packet copied. Paste it into ChatGPT.')", "toast('v0.5.2 status packet copied. Paste it into ChatGPT.')");
write('app.js', app);

let index = read('index.html');
index = index.replaceAll('30 Oct to 2 Nov 2026 · v0.5.1', '30 Oct to 2 Nov 2026 · v0.5.2');
index = index.replaceAll('styles.css?v=0.5.1', 'styles.css?v=0.5.2');
index = index.replaceAll('app.js?v=0.5.1', 'app.js?v=0.5.2');
write('index.html', index);

let sw = read('sw.js');
sw = sw.replaceAll('dlp-dispatcher-v0.5.1', 'dlp-dispatcher-v0.5.2');
sw = sw.replaceAll('styles.css?v=0.5.1', 'styles.css?v=0.5.2');
sw = sw.replaceAll('app.js?v=0.5.1', 'app.js?v=0.5.2');
write('sw.js', sw);

write('README.md', `# DLP Dispatcher v0.5.2\n\nThis build tunes recommendation quality in Balanced mode.\n\n## Scoring changes\n- Headline rides still get a meaningful boost, but no longer dominate on status alone.\n- Balanced mode now rewards genuinely short live queues.\n- Balanced mode scores total commitment time: walk + queue + attraction experience.\n- Long commitments are progressively penalised, while efficient sub-30-minute opportunities get a small boost.\n- MUST/WANT priorities, fixed-booking protection, freshness gating, feed disagreement penalties and park-hop costs remain intact.\n- Recommendation cards and ChatGPT packets now expose total commitment time for easier testing.\n\n## Goal\nA 40-minute headline queue should not automatically beat a strong 5 to 15 minute family attraction nearby. If the headline wait falls to a genuinely good level, it should rise rapidly back up the ranking.\n`);

console.log('v0.5.2 scoring patch applied');
