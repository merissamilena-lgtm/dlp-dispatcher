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
  "  const PARK_HOP_SCORE_PENALTY = 30;\n  const NOT_NOW_MIN = 30;",
  "  const PARK_HOP_SCORE_PENALTY = 30;\n  const NOT_NOW_MIN = 30;\n  const HARD_ANCHOR_MIN_SLACK = 5;\n  const HARD_ANCHOR_TIGHT_SLACK = 10;",
  'hard-anchor safety constants'
);

app = replaceRequired(
  app,
  "    let walkOnward=0, minutesToTarget=null, fits=true, target=null;\n    if (commitment) {\n      const cPoint=areaPoint(commitment.area);\n      const safeAt=new Date(parisDateTime(commitment.date,commitment.time).getTime()-bufferFor(commitment)*60000);\n      minutesToTarget=Math.floor((safeAt-now)/60000);\n      walkOnward=walkMinutes(to,cPoint)+parkHopPenalty(ride.park,cPoint?.park);\n      const totalNeeded=walkTo+chosenWait+dwellMinutes+walkOnward;\n      fits=totalNeeded<=minutesToTarget;\n      target={safeAt,totalNeeded};\n    }",
  "    let walkOnward=0, minutesToTarget=null, fits=true, target=null, anchorConsumption=null, anchorSlack=null, tightFit=false;\n    if (commitment) {\n      const cPoint=areaPoint(commitment.area);\n      const safeAt=new Date(parisDateTime(commitment.date,commitment.time).getTime()-bufferFor(commitment)*60000);\n      minutesToTarget=Math.floor((safeAt-now)/60000);\n      walkOnward=walkMinutes(to,cPoint)+parkHopPenalty(ride.park,cPoint?.park);\n      const totalNeeded=walkTo+chosenWait+dwellMinutes+walkOnward;\n      anchorConsumption=totalNeeded;\n      anchorSlack=minutesToTarget-totalNeeded;\n      const requiredSlack=commitment.hard?HARD_ANCHOR_MIN_SLACK:0;\n      fits=anchorSlack>=requiredSlack;\n      tightFit=!!commitment.hard&&anchorSlack>=HARD_ANCHOR_MIN_SLACK&&anchorSlack<HARD_ANCHOR_TIGHT_SLACK;\n      target={safeAt,totalNeeded,slack:anchorSlack,requiredSlack};\n    }",
  'hard-anchor feasibility gate'
);

app = replaceRequired(
  app,
  "    if (commitment&&target) { const slack=minutesToTarget-target.totalNeeded; score+=Math.min(8,slack*.08); if(slack<10)score-=9; if(slack<20&&['ride','headline','scenic','show'].includes(meta.category))score+=4; }",
  "    if (commitment&&target) { const slack=target.slack; score+=Math.min(8,slack*.08); if(slack<10)score-=9; if(slack<20&&['ride','headline','scenic','show'].includes(meta.category))score+=4; }",
  'anchor slack scoring'
);

app = replaceRequired(
  app,
  "    return {ride,score,walkTo,walkOnward,chosenWait,queueLabel,dwellMinutes,commitmentMinutes,avg,opportunity,priority,finish,meta:{...meta,area},minutesToTarget,target,parkHop,rideFresh};",
  "    return {ride,score,walkTo,walkOnward,chosenWait,queueLabel,dwellMinutes,commitmentMinutes,anchorConsumption,anchorSlack,tightFit,avg,opportunity,priority,finish,meta:{...meta,area},minutesToTarget,target,parkHop,rideFresh};",
  'recommendation anchor diagnostics'
);

app = replaceRequired(
  app,
  "    if(x.ride.feedDisagreement?.kind==='wait')bits.push('feeds disagree on wait');\n    return bits.length?bits.join(', '):'solid fit for the current rules';",
  "    if(x.ride.feedDisagreement?.kind==='wait')bits.push('feeds disagree on wait');\n    if(x.tightFit)bits.push('tight fit with booking protected');\n    return bits.length?bits.join(', '):'solid fit for the current rules';",
  'tight-fit recommendation reason'
);

app = replaceRequired(
  app,
  "      const onward=x.target?` · ${x.walkOnward}m onward walk`:'';\n      const priorityTag=x.priority==='must'?'<span class=\"tag good\">MUST</span>':x.priority==='want'?'<span class=\"tag\">WANT</span>':'';\n      const disagreeTag=x.ride.feedDisagreement?.kind==='wait'?'<span class=\"tag warn\">FEEDS DISAGREE</span>':'';\n      const hopTag=x.parkHop?'<span class=\"tag warn\">PARK HOP</span>':'';\n      const agingTag=x.rideFresh.level==='aging'?'<span class=\"tag warn\">AGING DATA</span>':'';",
  "      const onward=x.target?` · ${x.walkOnward}m onward walk · ${x.anchorConsumption}m to anchor · ${x.anchorSlack}m slack`:'';\n      const priorityTag=x.priority==='must'?'<span class=\"tag good\">MUST</span>':x.priority==='want'?'<span class=\"tag\">WANT</span>':'';\n      const disagreeTag=x.ride.feedDisagreement?.kind==='wait'?'<span class=\"tag warn\">FEEDS DISAGREE</span>':'';\n      const hopTag=x.parkHop?'<span class=\"tag warn\">PARK HOP</span>':'';\n      const agingTag=x.rideFresh.level==='aging'?'<span class=\"tag warn\">AGING DATA</span>':'';\n      const tightTag=x.tightFit?'<span class=\"tag warn\">TIGHT FIT</span>':'';",
  'recommendation anchor display'
);

app = replaceRequired(
  app,
  "${priorityTag}${disagreeTag}${hopTag}${agingTag}</div>",
  "${priorityTag}${disagreeTag}${hopTag}${agingTag}${tightTag}</div>",
  'tight-fit recommendation tag'
);

const packetHelpers = `  function priorityStateSummary(level) {\n    const keys=Object.keys(state.priorities).filter(k=>state.priorities[k]===level);\n    if(!keys.length)return 'none';\n    return keys.map(k=>state.rides.find(r=>keyFor(r.name)===k)?.name||k).join(', ');\n  }\n\n  function priorityDiagnostic(k,now,commitment) {\n    const priority=state.priorities[k]||'neutral';\n    const tag=priority.toUpperCase();\n    const ride=state.rides.find(r=>keyFor(r.name)===k);\n    const name=ride?.name||k;\n    if(!ride)return \`${'${name}'}: ${'${tag}'}, excluded: not in current live feed\`;\n    if(priority==='skip')return \`${'${name}'}: SKIP, excluded by user\`;\n    if(state.done[k])return \`${'${name}'}: ${'${tag}'}, excluded: DONE\`;\n    if(isDeferred(k))return \`${'${name}'}: ${'${tag}'}, excluded: snoozed ${'${deferredRemaining(k)}'}m\`;\n    if(ride.status!=='OPERATING')return \`${'${name}'}: ${'${tag}'}, excluded: ${'${prettyStatus(ride.status)}'}\`;\n    if(ride.wait==null)return \`${'${name}'}: ${'${tag}'}, excluded: wait unavailable\`;\n    const freshness=attractionFreshness(ride);\n    if(freshness.level==='stale'||freshness.level==='unknown')return \`${'${name}'}: ${'${tag}'}, excluded: ${'${freshness.level}'} data${'${freshness.mins==null?\'\':` ${freshness.mins}m old`}'}\`;\n    if(ride.feedDisagreement?.kind==='status')return \`${'${name}'}: ${'${tag}'}, excluded: feeds disagree on operating status\`;\n    const fromPark=currentPark();\n    const parkHop=isParkHop(fromPark,ride.park);\n    if(parkHop&&!state.settings.parkHop)return \`${'${name}'}: ${'${tag}'}, excluded: park hop disabled\`;\n    const result=evaluateRide(ride,now,commitment);\n    if(result){\n      const anchor=result.target?\`, anchor consumption ${'${result.anchorConsumption}'}m, slack ${'${result.anchorSlack}'}m${'${result.tightFit?\', TIGHT FIT\':\'\'}'}\`:'';\n      return \`${'${name}'}: ${'${tag}'}, eligible, score ${'${result.score.toFixed(1)}'}, ${'${result.chosenWait}'}m ${'${result.queueLabel}'}${'${anchor}'}\`;\n    }\n    if(commitment){\n      const meta=metaFor(ride.name), from=currentPoint(), to=pointForRide(ride);\n      const walkTo=walkMinutes(from,to)+parkHopPenalty(fromPark,ride.park);\n      let chosenWait=ride.wait;\n      if(state.settings.singleRider&&Number.isFinite(ride.singleRiderWait)&&ride.singleRiderWait<chosenWait)chosenWait=ride.singleRiderWait;\n      const dwellMinutes=experienceMinutes(meta), cPoint=areaPoint(commitment.area);\n      const safeAt=new Date(parisDateTime(commitment.date,commitment.time).getTime()-bufferFor(commitment)*60000);\n      const minutesToTarget=Math.floor((safeAt-now)/60000);\n      const walkOnward=walkMinutes(to,cPoint)+parkHopPenalty(ride.park,cPoint?.park);\n      const totalNeeded=walkTo+chosenWait+dwellMinutes+walkOnward;\n      const slack=minutesToTarget-totalNeeded, required=commitment.hard?HARD_ANCHOR_MIN_SLACK:0;\n      return \`${'${name}'}: ${'${tag}'}, excluded: anchor slack ${'${slack}'}m < ${'${required}'}m minimum (${'${totalNeeded}'}m needed)\`;\n    }\n    return \`${'${name}'}: ${'${tag}'}, excluded by current rules\`;\n  }\n\n  function packetRecommendation(x,rank) {\n    const anchor=x.target?\`, ${'${x.walkOnward}'}m onward, ${'${x.anchorConsumption}'}m anchor consumption, ${'${x.anchorSlack}'}m anchor slack${'${x.tightFit?\', TIGHT FIT\':\'\'}'}\`:'';\n    return \`${'${rank}'}) ${'${x.ride.name}'} ${'${x.chosenWait}'}m ${'${x.queueLabel}'}, ${'${x.walkTo}'}m walk, ${'${x.meta.label}'}, ${'${x.dwellMinutes}'}m experience, ${'${x.commitmentMinutes}'}m attraction commitment${'${anchor}'}, score ${'${x.score.toFixed(1)}'}, data ${'${x.rideFresh.level}'}${'${x.rideFresh.mins==null?\'\':` ${x.rideFresh.mins}m old`}'}; reason: ${'${recommendationReason(x)}'}\`;\n  }\n\n`;

app = replaceRequired(
  app,
  "  async function copyPacket() {\n    const now = plannerNow(), c = nextCommitment(now), recs = topRecommendations();",
  packetHelpers + "  async function copyPacket() {\n    const now = plannerNow(), c = nextCommitment(now), allRecs = allRecommendations(), recs = allRecs.slice(0,3), nextRecs = allRecs.slice(3,6);",
  'packet diagnostic helpers'
);

app = replaceRequired(
  app,
  "      commitmentLine = `Next fixed point: ${c.name} at ${c.time}; target arrival ${parisTime(safeAt)}; area ${c.area}`;",
  "      const anchorType=c.hard?'HARD':'SOFT', appliedBuffer=bufferFor(c), residual=c.hard?`; minimum residual slack ${HARD_ANCHOR_MIN_SLACK}m`:'';\n      commitmentLine = `Next fixed point: ${c.name} at ${c.time}; target arrival ${parisTime(safeAt)}; area ${c.area}; ${anchorType}; buffer ${appliedBuffer}m${residual}`;",
  'packet anchor metadata'
);

app = replaceRequired(
  app,
  "      `Top engine picks: ${recs.map((x,i)=>`${i+1}) ${x.ride.name} ${x.chosenWait}m ${x.queueLabel}, ${x.walkTo}m walk, ${x.meta.label}, ${x.dwellMinutes}m experience, ${x.commitmentMinutes}m total commitment, data ${x.rideFresh.level}${x.rideFresh.mins==null?'':` ${x.rideFresh.mins}m old`}; reason: ${recommendationReason(x)}`).join(' | ') || 'none'}`,\n      `Done this trip: ${doneNames.length ? doneNames.join(', ') : 'none marked'}` ,",
  "      `Top engine picks: ${recs.map((x,i)=>packetRecommendation(x,i+1)).join(' | ') || 'none'}`,\n      ...(!live ? [\n        `Priority state: MUST: ${priorityStateSummary('must')} | WANT: ${priorityStateSummary('want')} | SKIP: ${priorityStateSummary('skip')}`,\n        `Priority diagnostics: ${Object.keys(state.priorities).filter(k=>['must','want','skip'].includes(state.priorities[k])).map(k=>priorityDiagnostic(k,now,c)).join(' | ') || 'none'}`,\n        `Next eligible candidates: ${nextRecs.map((x,i)=>packetRecommendation(x,i+4)).join(' | ') || 'none'}`\n      ] : []),\n      `Done this trip: ${doneNames.length ? doneNames.join(', ') : 'none marked'}` ,",
  'expanded TEST packet diagnostics'
);

app = app.replaceAll('DLP DISPATCHER STATUS v0.5.2', 'DLP DISPATCHER STATUS v0.5.3');
app = app.replaceAll("toast('v0.5.2 status packet copied. Paste it into ChatGPT.')", "toast('v0.5.3 status packet copied. Paste it into ChatGPT.')");
write('app.js', app);

let index = read('index.html');
index = index.replaceAll('30 Oct to 2 Nov 2026 · v0.5.2', '30 Oct to 2 Nov 2026 · v0.5.3');
index = index.replaceAll('styles.css?v=0.5.2', 'styles.css?v=0.5.3');
index = index.replaceAll('app.js?v=0.5.2', 'app.js?v=0.5.3');
write('index.html', index);

let sw = read('sw.js');
sw = sw.replaceAll('dlp-dispatcher-v0.5.2', 'dlp-dispatcher-v0.5.3');
sw = sw.replaceAll('styles.css?v=0.5.2', 'styles.css?v=0.5.3');
sw = sw.replaceAll('app.js?v=0.5.2', 'app.js?v=0.5.3');
write('sw.js', sw);

write('README.md', `# DLP Dispatcher v0.5.3\n\nThis build hardens fixed-booking protection and expands TEST-mode diagnostics without changing the v0.5.2 recommendation philosophy.\n\n## Booking safety\n- Hard anchors require at least 5 minutes of residual slack after walk, queue, attraction time and onward travel are counted.\n- Hard-anchor candidates with under 5 minutes remaining are rejected.\n- Candidates with 5 to 9 minutes remaining are allowed but visibly marked TIGHT FIT.\n- Soft plans keep the existing zero-slack feasibility rule.\n\n## TEST packet diagnostics\n- Lists active MUST, WANT and SKIP priorities.\n- Explains whether priority attractions are eligible or why they were excluded.\n- Reports score, onward walk, anchor consumption and anchor slack for recommendations.\n- Includes the next three eligible candidates after the top three.\n- Reports whether the next anchor is HARD or SOFT, its applied buffer and the hard-anchor residual-slack rule.\n\n## Intent\nProtect fixed reservations first, while making test packets detailed enough to diagnose why the engine chose or rejected an attraction without dumping the entire live board.\n`);

if (!app.includes('HARD_ANCHOR_MIN_SLACK = 5')) throw new Error('Hard-anchor safety constant missing after patch');
if (!app.includes('Priority diagnostics:')) throw new Error('TEST diagnostics missing after patch');
console.log('v0.5.3 safety and diagnostics patch applied');
