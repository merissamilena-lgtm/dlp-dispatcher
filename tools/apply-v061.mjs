import fs from 'node:fs';

function mustReplace(text, search, replacement, label) {
  if (!text.includes(search)) throw new Error(`Missing expected text for ${label}`);
  return text.replace(search, replacement);
}

let app = fs.readFileSync('app.js', 'utf8');
let index = fs.readFileSync('index.html', 'utf8');
let sw = fs.readFileSync('sw.js', 'utf8');
let readme = fs.readFileSync('README.md', 'utf8');

app = mustReplace(app,
`  function walkMinutes(a,b) {
    const routed=precisionRouteMeters(a,b);
    if(Number.isFinite(routed))return Math.max(1,Math.ceil(routed/Number(state.settings.walkSpeed)));
    const d = haversine(a,b);
    if (d == null) return 7;
    return Math.max(1, Math.ceil((d * Number(state.settings.routeFactor)) / Number(state.settings.walkSpeed)));
  }`,
`  function legacyWalkMinutes(a,b) {
    const d = haversine(a,b);
    if (d == null) return 7;
    return Math.max(1, Math.ceil((d * Number(state.settings.routeFactor)) / Number(state.settings.walkSpeed)));
  }
  function walkMinutes(a,b) {
    const routed=precisionRouteMeters(a,b);
    if(Number.isFinite(routed))return Math.max(1,Math.ceil(routed/Number(state.settings.walkSpeed)));
    return legacyWalkMinutes(a,b);
  }`,
'legacy walk helper');

app = mustReplace(app,
`  function packetRecommendation(x,rank) {
    const anchor=x.target?\`, \${x.walkOnward}m onward, \${x.anchorConsumption}m anchor consumption, \${x.anchorSlack}m anchor slack\${x.tightFit?', TIGHT FIT':''}\`:'';
    return \`\${rank}) \${x.ride.name} \${x.chosenWait}m \${x.queueLabel}, \${x.walkTo}m walk, \${x.meta.label}, \${x.dwellMinutes}m experience, \${x.commitmentMinutes}m attraction commitment\${anchor}, score \${x.score.toFixed(1)}, data \${x.rideFresh.level}\${x.rideFresh.mins==null?'':\` \${x.rideFresh.mins}m old\`}; reason: \${recommendationReason(x)}\`;
  }`,
`  function legacyPointForRide(ride) {
    if (Number.isFinite(ride.lat) && Number.isFinite(ride.lon)) return { lat: ride.lat, lon: ride.lon, park: ride.park };
    const m = metaFor(ride.name);
    return areaPoint(ride.area) || areaPoint(m.area) || (ride.park === 'Disney Adventure World' ? areaPoint('Disney Adventure World entrance') : areaPoint('Disneyland Park entrance'));
  }
  function endpointEvidence(point) {
    if (!point) return 'unmapped';
    return \`\${point.confidence || 'unknown'} (\${point.source || 'unknown'})\`;
  }
  function routingDiagnostic(x, commitment) {
    if (!precisionRoutingEnabled()) return null;
    const from = currentPoint();
    const legacyRide = legacyPointForRide(x.ride);
    const precisionEntry = pointForRide(x.ride,'entrance');
    const precisionExit = pointForRide(x.ride,'exit');
    const locationData = routingAttraction(x.ride.name);
    const toLegacy = legacyWalkMinutes(from,legacyRide) + parkHopPenalty(currentPark(),x.ride.park);
    const bits = [
      \`to ride precision \${x.walkTo}m vs legacy \${toLegacy}m\`,
      \`entrance \${endpointEvidence(locationData?.entrance)}\`,
      \`exit \${endpointEvidence(locationData?.exit)}\`
    ];
    if (commitment) {
      const precisionAnchor = pointForCommitment(commitment);
      const legacyAnchor = areaPoint(commitment.area);
      const legacyOnward = legacyWalkMinutes(legacyRide,legacyAnchor) + parkHopPenalty(x.ride.park,legacyAnchor?.park);
      const anchorEvidence = state.routingLocations?.commitments?.[commitment.id]?.entrance;
      bits.push(\`onward precision \${x.walkOnward}m vs legacy \${legacyOnward}m\`);
      bits.push(\`anchor entrance \${endpointEvidence(anchorEvidence)}\`);
      const entrySnap = graphNearest(precisionEntry), exitSnap = graphNearest(precisionExit), anchorSnap = graphNearest(precisionAnchor);
      if (entrySnap) bits.push(\`entry snap \${Math.round(entrySnap.d)}m\`);
      if (exitSnap) bits.push(\`exit snap \${Math.round(exitSnap.d)}m\`);
      if (anchorSnap) bits.push(\`anchor snap \${Math.round(anchorSnap.d)}m\`);
    }
    return \`\${x.ride.name}: \${bits.join('; ')}\`;
  }

  function packetRecommendation(x,rank) {
    const anchor=x.target?\`, \${x.walkOnward}m onward, \${x.anchorConsumption}m anchor consumption, \${x.anchorSlack}m anchor slack\${x.tightFit?', TIGHT FIT':''}\`:'';
    return \`\${rank}) \${x.ride.name} \${x.chosenWait}m \${x.queueLabel}, \${x.walkTo}m walk, \${x.meta.label}, \${x.dwellMinutes}m experience, \${x.commitmentMinutes}m attraction commitment\${anchor}, score \${x.score.toFixed(1)}, data \${x.rideFresh.level}\${x.rideFresh.mins==null?'':\` \${x.rideFresh.mins}m old\`}; reason: \${recommendationReason(x)}\`;
  }`,
'routing diagnostics helpers');

app = mustReplace(app,
`      'DLP DISPATCHER STATUS v0.6.0',`,
`      'DLP DISPATCHER STATUS v0.6.1',`,
'packet version');

app = mustReplace(app,
`      \`Top engine picks: \${recs.map((x,i)=>packetRecommendation(x,i+1)).join(' | ') || 'none'}\`,
      ...(!live ? [
        \`Priority state: MUST: \${priorityStateSummary('must')} | WANT: \${priorityStateSummary('want')} | SKIP: \${priorityStateSummary('skip')}\`,`,
`      \`Top engine picks: \${recs.map((x,i)=>packetRecommendation(x,i+1)).join(' | ') || 'none'}\`,
      ...(!live ? [
        \`Routing diagnostics: \${precisionRoutingEnabled() ? (recs.map(x=>routingDiagnostic(x,c)).filter(Boolean).join(' | ') || 'no eligible top candidates') : 'precision routing disabled or unavailable'}\`,
        \`Priority state: MUST: \${priorityStateSummary('must')} | WANT: \${priorityStateSummary('want')} | SKIP: \${priorityStateSummary('skip')}\`,`,
'routing diagnostics packet line');

app = mustReplace(app,
`toast('v0.6.0 status packet copied. Paste it into ChatGPT.');`,
`toast('v0.6.1 status packet copied. Paste it into ChatGPT.');`,
'toast version');

app = app.replaceAll('?v=0.6.0', '?v=0.6.1');
index = index.replaceAll('v0.6.0', 'v0.6.1').replaceAll('?v=0.6.0', '?v=0.6.1');
sw = sw.replaceAll('v0.6.0', 'v0.6.1').replaceAll('?v=0.6.0', '?v=0.6.1');
readme = readme.replace('# DLP Dispatcher v0.6.0', '# DLP Dispatcher v0.6.1');
readme = readme.replace('This build adds the first precision-routing test layer while preserving the v0.5.3 scoring and booking safety rules.', 'This build adds TEST packet route-vs-legacy diagnostics to the precision-routing layer while preserving the v0.5.3 scoring and booking safety rules.');
readme += `\n\n## v0.6.1 routing diagnostics\n- TEST packets compare precision stroller-graph walking time with the previous legacy estimate for each top candidate.\n- Reports attraction entrance and exit confidence/source, plus fixed-point entrance confidence.\n- Reports graph snap distance for ride entrance, ride exit and fixed point so weak endpoint geometry is visible during validation.\n- No scoring weights or hard-anchor safety thresholds changed.\n`;

fs.writeFileSync('app.js', app);
fs.writeFileSync('index.html', index);
fs.writeFileSync('sw.js', sw);
fs.writeFileSync('README.md', readme);
console.log('Applied DLP Dispatcher v0.6.1 routing diagnostics patch.');
