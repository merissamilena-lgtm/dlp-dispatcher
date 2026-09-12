(() => {
  'use strict';

  const TPW_DESTINATION = 'e8d0207f-da8a-4048-bec8-117aa946b2c2';
  const TPW_BASE = 'https://api.themeparks.wiki/v1';
  const QT_PROXY_BASE = 'https://dlp-queue-proxy.rnspecfor.workers.dev';
  const QT_PARKS = [
    { id: 4, park: 'Disneyland Park' },
    { id: 28, park: 'Disney Adventure World' }
  ];
  const REFRESH_MS = 5 * 60 * 1000;
  const DLP_GEOFENCE_METRES = 5000;
  const FEED_AGING_MIN = 10;
  const FEED_STALE_MIN = 20;
  const ATTRACTION_AGING_MIN = 15;
  const ATTRACTION_STALE_MIN = 30;
  const PARK_HOP_TIME_MIN = 15;
  const PARK_HOP_SCORE_PENALTY = 30;
  const NOT_NOW_MIN = 30;
  const HARD_ANCHOR_MIN_SLACK = 5;
  const HARD_ANCHOR_TIGHT_SLACK = 10;
  const SHOW_LOCATIONS = {
    tales: { name: 'Disney Tales of Magic reserved viewing', area: 'Frontierland', locationNote: 'reserved area by the Frontierland entrance' },
    cascade: { name: 'Disney Cascade of Lights reserved viewing', area: 'World of Frozen', locationNote: 'reserved terrace below The Regal View Restaurant & Lounge' }
  };
  const DYNAMIC_ITEM_BUFFERS = { premier: 5, show: 20, other: 10 };
  const RIDER_SWITCH_HANDOVER_MIN = 5;
  const CLOUD_SYNC_POLL_MS = 15 * 1000;
  const SYNC_META_KEY = 'dlpSyncMeta';
  const SYNC_TOKEN_KEY = 'dlpSyncToken';
  const PUSH_DEVICE_KEY = 'dlpPushDeviceId';
  const SYNC_TOKEN_RE = /^d1p_[A-Za-z0-9_-]{20,64}$/;


  const AREAS = {
    'Disneyland Park entrance': { lat: 48.87070, lon: 2.77972, park: 'Disneyland Park' },
    'Main Street U.S.A.': { lat: 48.87105, lon: 2.77974, park: 'Disneyland Park' },
    'Frontierland': { lat: 48.87155, lon: 2.77695, park: 'Disneyland Park' },
    'Adventureland': { lat: 48.87225, lon: 2.77575, park: 'Disneyland Park' },
    'Fantasyland': { lat: 48.87325, lon: 2.77810, park: 'Disneyland Park' },
    'Discoveryland': { lat: 48.87275, lon: 2.78205, park: 'Disneyland Park' },
    'Disney Adventure World entrance': { lat: 48.86755, lon: 2.77955, park: 'Disney Adventure World' },
    'Production Courtyard': { lat: 48.86755, lon: 2.78055, park: 'Disney Adventure World' },
    'Marvel Avengers Campus': { lat: 48.86675, lon: 2.78165, park: 'Disney Adventure World' },
    'Worlds of Pixar': { lat: 48.86785, lon: 2.78305, park: 'Disney Adventure World' },
    'World of Frozen': { lat: 48.86900, lon: 2.78535, park: 'Disney Adventure World' },
    'Marne-la-Vallée Chessy station': { lat: 48.87052, lon: 2.78278, park: 'station' }
  };

  const COMMITMENTS = [
    { id: 'agrabah', date: '2026-10-30', time: '13:30', name: 'Agrabah Café', area: 'Adventureland', kind: 'meal', hard: true },
    { id: 'walts', date: '2026-10-30', time: '18:30', name: "Walt's", area: 'Main Street U.S.A.', kind: 'meal', hard: true },
    { id: 'pym', date: '2026-10-31', time: '12:30', name: 'PYM Kitchen', area: 'Marvel Avengers Campus', kind: 'meal', hard: true },
    { id: 'silver', date: '2026-10-31', time: '18:30', name: 'Silver Spur Steakhouse', area: 'Frontierland', kind: 'meal', hard: true },
    { id: 'nordic', date: '2026-11-01', time: '13:00', name: 'Nordic Crowns Tavern', area: 'World of Frozen', kind: 'meal', hard: false },
    { id: 'remy', date: '2026-11-01', time: '18:30', name: 'Bistrot Chez Rémy', area: 'Worlds of Pixar', kind: 'meal', hard: true },
    { id: 'train', date: '2026-11-02', time: '18:50', name: 'Train from Marne-la-Vallée Chessy', area: 'Marne-la-Vallée Chessy station', kind: 'train', hard: true }
  ];

  const BASELINES = [
    ['peter pan', 54], ['big thunder', 48], ['autopia', 37], ['buzz lightyear', 36], ['orbitron', 35],
    ['hyperspace mountain', 30], ['dumbo', 29], ['pinocchio', 22], ['indiana jones', 20], ['pirates of the caribbean', 18],
    ['phantom manor', 13], ['star tours', 13], ['small world', 11], ['crush', 71], ['frozen ever after', 63],
    ['ratatouille', 50], ['spider-man', 40], ['spiderman', 40], ['toy soldiers', 40], ['rc racer', 37],
    ['tower of terror', 36], ['flight force', 21], ['cars quatre roues', 13], ['cars road trip', 13], ['tapis volants', 13],
    ['slinky', 13], ['raiponce', 11], ['tangled', 11]
  ];

  const META = [
    { p: 'disneyland railroad main street station', area: 'Main Street U.S.A.', duration: 20, indoor: false },
    { p: 'disneyland railroad frontierland depot', area: 'Frontierland', duration: 20, indoor: false },
    { p: 'disneyland railroad fantasyland station', area: 'Fantasyland', duration: 20, indoor: false },
    { p: 'disneyland railroad discoveryland station', area: 'Discoveryland', duration: 20, indoor: false },
    { p: 'thunder mesa riverboat landing', area: 'Frontierland', duration: 15, indoor: false },
    { p: 'frontierland playground', area: 'Frontierland', duration: 25, indoor: false },
    { p: 'pirates beach', area: 'Adventureland', duration: 25, indoor: false },
    { p: 'plage des pirates', area: 'Adventureland', duration: 25, indoor: false },
    { p: 'mickey s philharmagic', area: 'Discoveryland', duration: 15, indoor: true },
    { p: 'philharmagic', area: 'Discoveryland', duration: 15, indoor: true },
    { p: 'la cabane des robinson', area: 'Adventureland', duration: 12, indoor: false },
    { p: 'robinson', area: 'Adventureland', duration: 12, indoor: false },
    { p: 'adventure isle', area: 'Adventureland', duration: 18, indoor: false },
    { p: 'passage enchante d aladdin', area: 'Adventureland', duration: 10, indoor: true },
    { p: 'pirate galleon', area: 'Adventureland', duration: 10, indoor: false },
    { p: 'taniere du dragon', area: 'Fantasyland', duration: 10, indoor: true },
    { p: 'dragon s lair', area: 'Fantasyland', duration: 10, indoor: true },
    { p: 'alice s curious labyrinth', area: 'Fantasyland', duration: 15, indoor: false },
    { p: 'rustler roundup', area: 'Frontierland', duration: 8, indoor: false },
    { p: 'big thunder', area: 'Frontierland', duration: 5, indoor: false },
    { p: 'phantom manor', area: 'Frontierland', duration: 8, indoor: true },
    { p: 'pirates of the caribbean', area: 'Adventureland', duration: 10, indoor: true },
    { p: 'indiana jones', area: 'Adventureland', duration: 4, indoor: false },
    { p: 'peter pan', area: 'Fantasyland', duration: 4, indoor: true },
    { p: 'pinocchio', area: 'Fantasyland', duration: 4, indoor: true },
    { p: 'blanche-neige', area: 'Fantasyland', duration: 4, indoor: true },
    { p: 'snow white', area: 'Fantasyland', duration: 4, indoor: true },
    { p: 'small world', area: 'Fantasyland', duration: 11, indoor: true },
    { p: 'dumbo', area: 'Fantasyland', duration: 3, indoor: false },
    { p: 'tea cups', area: 'Fantasyland', duration: 3, indoor: false },
    { p: 'carrousel', area: 'Fantasyland', duration: 4, indoor: false },
    { p: 'casey jr', area: 'Fantasyland', duration: 5, indoor: false },
    { p: 'hyperspace mountain', area: 'Discoveryland', duration: 5, indoor: true },
    { p: 'buzz lightyear', area: 'Discoveryland', duration: 5, indoor: true },
    { p: 'star tours', area: 'Discoveryland', duration: 7, indoor: true },
    { p: 'orbitron', area: 'Discoveryland', duration: 4, indoor: false },
    { p: 'autopia', area: 'Discoveryland', duration: 7, indoor: false },
    { p: 'nautilus', area: 'Discoveryland', duration: 8, indoor: true },
    { p: 'tower of terror', area: 'Production Courtyard', duration: 6, indoor: true },
    { p: 'flight force', area: 'Marvel Avengers Campus', duration: 5, indoor: true },
    { p: 'spider-man', area: 'Marvel Avengers Campus', duration: 7, indoor: true },
    { p: 'spiderman', area: 'Marvel Avengers Campus', duration: 7, indoor: true },
    { p: 'crush', area: 'Worlds of Pixar', duration: 5, indoor: true },
    { p: 'ratatouille', area: 'Worlds of Pixar', duration: 7, indoor: true },
    { p: 'rc racer', area: 'Worlds of Pixar', duration: 4, indoor: false },
    { p: 'toy soldiers', area: 'Worlds of Pixar', duration: 5, indoor: false },
    { p: 'slinky', area: 'Worlds of Pixar', duration: 4, indoor: false },
    { p: 'cars quatre roues', area: 'Worlds of Pixar', duration: 4, indoor: false },
    { p: 'cars road trip', area: 'Worlds of Pixar', duration: 8, indoor: false },
    { p: 'tapis volants', area: 'Worlds of Pixar', duration: 4, indoor: false },
    { p: 'frozen ever after', area: 'World of Frozen', duration: 6, indoor: true },
    { p: 'raiponce', area: 'World of Frozen', duration: 4, indoor: false },
    { p: 'tangled', area: 'World of Frozen', duration: 4, indoor: false }
  ];

  const EXPERIENCE_RULES = [
    { p: 'mickey s philharmagic', category: 'show', label: 'Show / cinema', bonus: -2 },
    { p: 'philharmagic', category: 'show', label: 'Show / cinema', bonus: -2 },
    { p: 'frontierland playground', category: 'playground', label: 'Play / time filler', bonus: -16 },
    { p: 'pirates beach', category: 'playground', label: 'Play / time filler', bonus: -16 },
    { p: 'plage des pirates', category: 'playground', label: 'Play / time filler', bonus: -16 },
    { p: 'thunder mesa riverboat landing', category: 'scenic', label: 'Scenic ride', bonus: -2 },
    { p: 'le pays des contes de fees', category: 'scenic', label: 'Scenic ride', bonus: 0 },
    { p: 'disneyland railroad', category: 'transport', label: 'Transport', bonus: -34 },
    { p: 'horse drawn streetcars', category: 'transport', label: 'Transport', bonus: -34 },
    { p: 'main street vehicles', category: 'transport', label: 'Transport', bonus: -34 },
    { p: 'rustler roundup', category: 'minor', label: 'Side activity', bonus: -26 },
    { p: 'shootin gallery', category: 'minor', label: 'Side activity', bonus: -26 },
    { p: 'taniere du dragon', category: 'walkthrough', label: 'Walkthrough', bonus: -18 },
    { p: 'dragon s lair', category: 'walkthrough', label: 'Walkthrough', bonus: -18 },
    { p: 'passage enchante d aladdin', category: 'walkthrough', label: 'Walkthrough', bonus: -18 },
    { p: 'adventure isle', category: 'walkthrough', label: 'Walkthrough', bonus: -14 },
    { p: 'mysteres du nautilus', category: 'walkthrough', label: 'Walkthrough', bonus: -16 },
    { p: 'nautilus', category: 'walkthrough', label: 'Walkthrough', bonus: -16 },
    { p: 'alice s curious labyrinth', category: 'walkthrough', label: 'Walkthrough', bonus: -12 },
    { p: 'labyrinth', category: 'walkthrough', label: 'Walkthrough', bonus: -12 },
    { p: 'la cabane des robinson', category: 'walkthrough', label: 'Walkthrough', bonus: -12 },
    { p: 'robinson', category: 'walkthrough', label: 'Walkthrough', bonus: -12 },
    { p: 'liberty arcade', category: 'walkthrough', label: 'Walkthrough', bonus: -24 },
    { p: 'discovery arcade', category: 'walkthrough', label: 'Walkthrough', bonus: -24 },
    { p: 'pirate galleon', category: 'walkthrough', label: 'Walkthrough', bonus: -18 },
    { p: 'meet mickey', category: 'character', label: 'Character', bonus: -4 },
    { p: 'princess pavilion', category: 'character', label: 'Character', bonus: -4 },
    { p: 'hero training center', category: 'character', label: 'Character', bonus: -4 },
    { p: 'welcome to starport', category: 'character', label: 'Character', bonus: -4 }
  ];

  const HEADLINE_PATTERNS = [
    'big thunder', 'peter pan', 'hyperspace mountain', 'crush', 'frozen ever after',
    'tower of terror', 'ratatouille', 'spider man', 'spiderman', 'flight force'
  ];

  const RIDE_GUIDES = [
    { p:'big thunder', type:'Mine-train roller coaster', intensity:'Thrill', summary:'A fast runaway mine-train coaster around and through Big Thunder Mountain.', flags:['Fast','Drops','Dark tunnels','Height restriction'] },
    { p:'phantom manor', type:'Haunted dark ride', intensity:'Moderate', summary:'A slow-moving haunted-house ride through the spooky story of Thunder Mesa.', flags:['Darkness','Spooky scenes','Mostly seated'] },
    { p:'thunder mesa riverboat', type:'Scenic riverboat', intensity:'Gentle', summary:'A relaxed outdoor paddle-steamer cruise around Big Thunder Mountain.', flags:['Gentle','Outdoor','Seated'] },
    { p:'indiana jones', type:'Outdoor roller coaster', intensity:'Thrill', summary:'A compact, fast coaster through temple ruins with an inversion.', flags:['Fast','Inversion','Drops','Height restriction'] },
    { p:'pirates of the caribbean', type:'Boat dark ride', intensity:'Moderate', summary:'An indoor boat journey through large pirate sets, music and battle scenes.', flags:['Darkness','Small drops','Water ride','Seated'] },
    { p:'peter pan', type:'Suspended dark ride', intensity:'Gentle', summary:'Board a flying pirate ship and soar above scenes from Peter Pan.', flags:['Darkness','Elevated ride vehicle','Family ride'] },
    { p:'pinocchio', type:'Classic dark ride', intensity:'Gentle', summary:'A seated storybook ride through scenes from Pinocchio.', flags:['Darkness','Some scary imagery','Family ride'] },
    { p:'blanche-neige', type:'Classic dark ride', intensity:'Gentle', summary:'A seated Snow White story ride with the Evil Queen and darker forest scenes.', flags:['Darkness','Scary imagery','Family ride'] },
    { p:'snow white', type:'Classic dark ride', intensity:'Gentle', summary:'A seated Snow White story ride with the Evil Queen and darker forest scenes.', flags:['Darkness','Scary imagery','Family ride'] },
    { p:'small world', type:'Indoor boat ride', intensity:'Gentle', summary:'A long, gentle boat ride through colourful musical scenes from around the world.', flags:['Very gentle','Music','Seated','Good breather'] },
    { p:'dumbo', type:'Flying spinner', intensity:'Gentle', summary:'Dumbo vehicles circle in the air while you control how high you fly.', flags:['Spinning/circling','Outdoor','Height control'] },
    { p:'tea cups', type:'Spinning ride', intensity:'Gentle to spinny', summary:'Classic teacups. The whole platform rotates and you can spin your own cup as much as you dare.', flags:['Very spinny if you choose','Outdoor'] },
    { p:'carrousel', type:'Carousel', intensity:'Gentle', summary:'Traditional horse carousel in Fantasyland.', flags:['Gentle','Circling','Outdoor'] },
    { p:'casey jr', type:'Family coaster / train', intensity:'Gentle', summary:'A small outdoor train ride with mild coaster-like hills around Storybook Land.', flags:['Small hills','Outdoor','Family ride'] },
    { p:'pays des contes', type:'Scenic boat ride', intensity:'Gentle', summary:'Small boats glide past miniature scenes from Disney fairy tales.', flags:['Gentle','Outdoor','Seated'] },
    { p:'philharmagic', type:'4D cinema show', intensity:'Gentle', summary:'A seated 3D musical film with simple 4D theatre effects.', flags:['3D glasses','Loud moments','Indoor','Seated'] },
    { p:'hyperspace mountain', type:'Indoor roller coaster', intensity:'Thrill', summary:'A fast Star Wars coaster in near-darkness with launches, inversions and strong forces.', flags:['Fast','Darkness','Inversions','Height restriction'] },
    { p:'buzz lightyear', type:'Interactive dark ride', intensity:'Gentle', summary:'Ride through Toy Story scenes and use laser cannons to shoot targets for points.', flags:['Darkness','Interactive','Vehicle rotates'] },
    { p:'star tours', type:'Motion simulator', intensity:'Moderate', summary:'A seated Star Wars flight simulator that moves sharply in sync with the screen.', flags:['Motion simulator','3D','Can cause motion sickness','Height restriction'] },
    { p:'orbitron', type:'Flying spinner', intensity:'Gentle to moderate', summary:'Rocket ships circle high above Discoveryland while you control altitude.', flags:['Spinning/circling','Elevated','Outdoor'] },
    { p:'autopia', type:'Drive-your-own car ride', intensity:'Gentle', summary:'Drive a petrol-powered car around a guided outdoor roadway.', flags:['Outdoor','You steer','Engine noise'] },
    { p:'tower of terror', type:'Drop tower dark ride', intensity:'Thrill', summary:'A Twilight Zone themed lift ride with repeated sudden vertical drops and launches.', flags:['Big drops','Darkness','Height restriction','Strong forces'] },
    { p:'flight force', type:'Indoor launched coaster', intensity:'Thrill', summary:'A fast Marvel coaster in darkness with a launch and inversions.', flags:['Fast','Launch','Darkness','Inversions','Height restriction'] },
    { p:'spider-man', type:'Interactive dark ride', intensity:'Moderate', summary:'A moving interactive ride where you fling virtual webs at Spider-Bots with your hands.', flags:['Interactive','Screens','Vehicle movement','Indoor'] },
    { p:'spiderman', type:'Interactive dark ride', intensity:'Moderate', summary:'A moving interactive ride where you fling virtual webs at Spider-Bots with your hands.', flags:['Interactive','Screens','Vehicle movement','Indoor'] },
    { p:'crush', type:'Spinning roller coaster', intensity:'Thrill', summary:'A Finding Nemo coaster where the turtle-shell vehicle spins freely through dark and outdoor sections.', flags:['Spinning','Fast','Darkness','Drops','Height restriction'] },
    { p:'ratatouille', type:'Trackless 3D dark ride', intensity:'Gentle to moderate', summary:'Trackless vehicles scurry through oversized Ratatouille scenes with large 3D screens.', flags:['3D','Screens','Some spinning','Indoor'] },
    { p:'rc racer', type:'Shuttle coaster', intensity:'Thrill', summary:'A giant RC car races back and forth up a U-shaped track, getting higher each swing.', flags:['Repeated drops','High points','Height restriction','Outdoor'] },
    { p:'toy soldiers', type:'Parachute drop ride', intensity:'Moderate', summary:'Seats rise high on a tower and descend in a series of parachute-style drops.', flags:['Height','Drops','Outdoor','Height restriction'] },
    { p:'slinky', type:'Spinning family ride', intensity:'Gentle', summary:'Slinky Dog circles a wavy track while the ride rotates around the centre.', flags:['Spinning/circling','Outdoor','Family ride'] },
    { p:'cars quatre roues', type:'Spinning car ride', intensity:'Gentle to spinny', summary:'Cars rotate around each other on a flat figure-eight style layout. Gentle overall, but definitely spinny.', flags:['Spinny','Outdoor','Family ride'] },
    { p:'cars road trip', type:'Scenic tram ride', intensity:'Gentle', summary:'A seated road-trip tram through Cars scenery with one large water-and-fire effects scene.', flags:['Seated','Loud effects','Water effects','Mostly gentle'] },
    { p:'tapis volants', type:'Flying spinner', intensity:'Gentle', summary:'Magic carpets circle in the air while riders control height and tilt.', flags:['Spinning/circling','Outdoor','Height control'] },
    { p:'frozen ever after', type:'Boat dark ride', intensity:'Gentle to moderate', summary:'A Frozen boat journey through Arendelle with a backwards section and a small drop.', flags:['Darkness','Backwards section','Small drop','Water ride'] },
    { p:'raiponce', type:'Spinning family ride', intensity:'Gentle to spinny', summary:'A Tangled-themed family ride with rotating vehicles and a strong spinning element.', flags:['Spinny','Outdoor','Family ride'] },
    { p:'tangled', type:'Spinning family ride', intensity:'Gentle to spinny', summary:'A Tangled-themed family ride with rotating vehicles and a strong spinning element.', flags:['Spinny','Outdoor','Family ride'] },
    { p:'disneyland railroad', type:'Park train', intensity:'Gentle', summary:'A full-size steam-style railway connecting stations around Disneyland Park.', flags:['Transport','Seated','Good breather'] },
    { p:'main street vehicles', type:'Main Street transport', intensity:'Gentle', summary:'A short ride along Main Street in a period-style vehicle.', flags:['Transport','Outdoor','Gentle'] },
    { p:'horse drawn streetcars', type:'Horse-drawn transport', intensity:'Gentle', summary:'A gentle horse-drawn streetcar journey along Main Street.', flags:['Transport','Outdoor','Gentle'] },
    { p:'adventure isle', type:'Exploration walkthrough', intensity:'Gentle', summary:'Explore caves, bridges and paths around Adventure Isle at your own pace.', flags:['Walkthrough','Uneven paths','Outdoor'] },
    { p:'alice s curious labyrinth', type:'Maze walkthrough', intensity:'Gentle', summary:'An outdoor hedge maze through Wonderland, with optional tower viewpoints.', flags:['Walkthrough','Outdoor','Stairs optional'] },
    { p:'labyrinth', type:'Maze walkthrough', intensity:'Gentle', summary:'An outdoor hedge maze through Wonderland, with optional tower viewpoints.', flags:['Walkthrough','Outdoor','Stairs optional'] },
    { p:'robinson', type:'Treehouse walkthrough', intensity:'Gentle', summary:'A self-paced climb through the Swiss Family Robinson treehouse.', flags:['Walkthrough','Many stairs','Outdoor'] },
    { p:'passage enchante d aladdin', type:'Walkthrough', intensity:'Gentle', summary:'A short indoor walkthrough past miniature scenes from Aladdin.', flags:['Walkthrough','Indoor','Dark areas'] },
    { p:'taniere du dragon', type:'Walkthrough / creature scene', intensity:'Gentle', summary:'Walk beneath the castle to see a large animatronic dragon in a dark cave.', flags:['Darkness','Dragon may scare little ones','Walkthrough'] },
    { p:'dragon s lair', type:'Walkthrough / creature scene', intensity:'Gentle', summary:'Walk beneath the castle to see a large animatronic dragon in a dark cave.', flags:['Darkness','Dragon may scare little ones','Walkthrough'] },
    { p:'nautilus', type:'Walkthrough', intensity:'Gentle', summary:'Explore Captain Nemo’s submarine rooms in a short atmospheric walkthrough.', flags:['Walkthrough','Darkness','Indoor'] },
    { p:'frontierland playground', type:'Playground', intensity:'Gentle', summary:'A place for the children to run, climb and play rather than a timed ride.', flags:['Play time','Outdoor','Allow 20–30 min'] },
    { p:'pirates beach', type:'Playground', intensity:'Gentle', summary:'Pirate-themed outdoor play area for climbing and burning off energy.', flags:['Play time','Outdoor','Allow 20–30 min'] },
    { p:'plage des pirates', type:'Playground', intensity:'Gentle', summary:'Pirate-themed outdoor play area for climbing and burning off energy.', flags:['Play time','Outdoor','Allow 20–30 min'] },
    { p:'meet mickey', type:'Character meet', intensity:'Gentle', summary:'Indoor character meeting experience rather than a ride.', flags:['Character','Photos','Indoor'] },
    { p:'princess pavilion', type:'Character meet', intensity:'Gentle', summary:'Queue to meet a Disney Princess in an indoor photo setting.', flags:['Character','Photos','Indoor'] },
    { p:'hero training center', type:'Character meet', intensity:'Gentle', summary:'Marvel character meeting experience rather than a ride.', flags:['Character','Photos','Indoor'] }
  ];

  const state = {
    rides: [],
    entities: [],
    source: null,
    sourceUpdated: null,
    secondarySource: null,
    secondaryUpdated: null,
    feedDisagreements: [],
    secondaryError: null,
    lastFetchedAt: null,
    gps: null,
    gpsAccuracy: null,
    gpsWatchId: null,
    gpsLastRenderAt: 0,
    routingReady: false,
    routingError: null,
    routingLocations: null,
    routingGraph: null,
    activeFilter: 'all',
    activeView: 'now',
    currentUrgency: 'none',
    search: '',
    priorities: loadJSON('dlpPriorities', {}),
    done: loadJSON('dlpDone', {}),
    notNow: loadJSON('dlpNotNow', {}),
    riderSwitch: loadJSON('dlpRiderSwitch', {}),
    dynamicCommitments: loadJSON('dlpDynamicCommitments', []),
    sync: Object.assign({
      token: localStorage.getItem(SYNC_TOKEN_KEY) || '',
      revision: 0,
      localModifiedAt: 0,
      lastSyncedAt: 0,
      pushEnabled: false,
      deviceId: localStorage.getItem(PUSH_DEVICE_KEY) || ''
    }, loadJSON(SYNC_META_KEY, {})),
    syncApplying: false,
    syncPushTimer: null,
    syncBusy: false,
    cloudBackendReady: false,
    cloudBackendChecked: false,
    settings: Object.assign({
      mode: 'balanced', singleRider: false, parkHop: false, softPlans: false, precisionRouting: true,
      mealBuffer: 15, trainBuffer: 35, walkSpeed: 55, routeFactor: 1.25,
      preview: false, previewDate: '2026-10-30', previewTime: '17:00', location: 'Disneyland Park entrance', locationSource: 'default'
    }, loadJSON('dlpSettings', {}))
  };

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
  }
  function persistSyncMeta() {
    const meta={
      revision:Number(state.sync.revision||0),
      localModifiedAt:Number(state.sync.localModifiedAt||0),
      lastSyncedAt:Number(state.sync.lastSyncedAt||0),
      pushEnabled:!!state.sync.pushEnabled,
      deviceId:state.sync.deviceId||''
    };
    localStorage.setItem(SYNC_META_KEY,JSON.stringify(meta));
    if(state.sync.token)localStorage.setItem(SYNC_TOKEN_KEY,state.sync.token);else localStorage.removeItem(SYNC_TOKEN_KEY);
    if(state.sync.deviceId)localStorage.setItem(PUSH_DEVICE_KEY,state.sync.deviceId);else localStorage.removeItem(PUSH_DEVICE_KEY);
  }
  function save(options={}) {
    localStorage.setItem('dlpPriorities', JSON.stringify(state.priorities));
    localStorage.setItem('dlpDone', JSON.stringify(state.done));
    localStorage.setItem('dlpNotNow', JSON.stringify(state.notNow));
    localStorage.setItem('dlpRiderSwitch', JSON.stringify(state.riderSwitch));
    localStorage.setItem('dlpDynamicCommitments', JSON.stringify(state.dynamicCommitments));
    localStorage.setItem('dlpSettings', JSON.stringify(state.settings));
    if(!state.syncApplying&&!options.remote){
      state.sync.localModifiedAt=Date.now();
      persistSyncMeta();
      scheduleCloudPush();
    }
  }

  function norm(s = '') {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[™®©*]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }
  function keyFor(name) { return norm(name).replace(/ single rider$/,''); }
  function baselineFor(name) {
    const n = norm(name);
    const hit = BASELINES.find(([p]) => n.includes(p));
    return hit ? hit[1] : null;
  }
  function experienceFor(name) {
    const n = norm(name);
    const special = EXPERIENCE_RULES.find(x => n.includes(x.p));
    if (special) return special;
    if (HEADLINE_PATTERNS.some(p => n.includes(p))) return { category: 'headline', label: 'Headline ride', bonus: 12 };
    return { category: 'ride', label: 'Ride', bonus: 5 };
  }
  function metaFor(name) {
    const n = norm(name);
    const hit = META.find(x => n.includes(x.p));
    return { ...(hit || { area: null, duration: 5, indoor: false }), ...experienceFor(name) };
  }
  function guideFor(name,meta=metaFor(name)) {
    const n=norm(name),hit=RIDE_GUIDES.find(x=>n.includes(x.p));
    if(hit)return hit;
    const fallbacks={
      show:{type:'Show / cinema',intensity:'Gentle',summary:'A seated or standing entertainment experience rather than a conventional ride.',flags:['Show']},
      playground:{type:'Play area',intensity:'Gentle',summary:'A flexible play stop for the children rather than a fixed-duration ride.',flags:['Play time','Allow 20–30 min']},
      walkthrough:{type:'Walkthrough',intensity:'Gentle',summary:'Explore this attraction on foot at your own pace.',flags:['Walkthrough']},
      character:{type:'Character experience',intensity:'Gentle',summary:'A character meeting or photo experience rather than a ride.',flags:['Character','Photos']},
      transport:{type:'Park transport',intensity:'Gentle',summary:'A transport attraction that also works as a breather while moving around the park.',flags:['Transport','Seated']},
      scenic:{type:'Scenic attraction',intensity:'Gentle',summary:'A slower attraction designed more for scenery and atmosphere than thrills.',flags:['Scenic']},
      headline:{type:'Headline ride',intensity:'Moderate to thrill',summary:'A major Disney attraction. Tap the live card front for wait and planning information.',flags:['Major attraction']},
      ride:{type:'Theme-park ride',intensity:'Moderate',summary:'A seated Disney attraction. The live card front shows its current wait and planning state.',flags:['Ride']}
    };
    return fallbacks[meta.category]||fallbacks.ride;
  }
  function areaPoint(area) { return area && AREAS[area] ? AREAS[area] : null; }

  function haversine(a,b) {
    if (!a || !b) return null;
    const R = 6371000, toRad = x => x * Math.PI / 180;
    const dLat = toRad(b.lat-a.lat), dLon = toRad(b.lon-a.lon);
    const q = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(q));
  }
  function legacyWalkMinutes(a,b) {
    const d = haversine(a,b);
    if (d == null) return 7;
    return Math.max(1, Math.ceil((d * Number(state.settings.routeFactor)) / Number(state.settings.walkSpeed)));
  }
  function walkMinutes(a,b) {
    const routed=precisionRouteMeters(a,b);
    if(Number.isFinite(routed))return Math.max(1,Math.ceil(routed/Number(state.settings.walkSpeed)));
    return legacyWalkMinutes(a,b);
  }
  function precisionRoutingEnabled() { return !!state.settings.precisionRouting && sessionMode()==='TEST' && !!state.routingReady; }
  function graphNearest(point) {
    if (!state.routingGraph || !point) return null;
    const key=`${Number(point.lat).toFixed(5)},${Number(point.lon).toFixed(5)}`;
    if(state.routingGraph.snapCache.has(key))return state.routingGraph.snapCache.get(key);
    let best=null;
    for(const n of state.routingGraph.nodes){const d=haversine(point,n);if(!best||d<best.d)best={id:n.id,lat:n.lat,lon:n.lon,d};}
    if(best)state.routingGraph.snapCache.set(key,best);
    return best;
  }
  function dijkstraFrom(startId) {
    const g=state.routingGraph;if(!g)return null;
    if(g.sourceCache.has(startId))return g.sourceCache.get(startId);
    const dist=new Map([[startId,0]]), heap=[[0,startId]];
    function push(item){heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;}
    function pop(){if(!heap.length)return null;const root=heap[0],last=heap.pop();if(heap.length){let i=0;heap[0]=last;while(true){let l=i*2+1,r=l+1,b=i;if(l<heap.length&&heap[l][0]<heap[b][0])b=l;if(r<heap.length&&heap[r][0]<heap[b][0])b=r;if(b===i)break;[heap[i],heap[b]]=[heap[b],heap[i]];i=b;}}return root;}
    while(heap.length){const [du,u]=pop();if(du!==dist.get(u))continue;for(const [v,w] of (g.adj.get(u)||[])){const nd=du+w;if(nd<(dist.get(v)??Infinity)){dist.set(v,nd);push([nd,v]);}}}
    g.sourceCache.set(startId,dist);if(g.sourceCache.size>6){const first=g.sourceCache.keys().next().value;if(first!==startId)g.sourceCache.delete(first);}
    return dist;
  }
  function precisionRouteMeters(a,b) {
    if(!precisionRoutingEnabled())return null;
    const A=graphNearest(a),B=graphNearest(b);if(!A||!B)return null;
    let distMap=state.routingGraph.sourceCache.get(A.id), graphM;
    if(distMap)graphM=distMap.get(B.id);
    else {distMap=state.routingGraph.sourceCache.get(B.id);if(distMap)graphM=distMap.get(A.id);}
    if(graphM==null){distMap=dijkstraFrom(A.id);graphM=distMap?.get(B.id);}
    if(!Number.isFinite(graphM))return null;
    return A.d+graphM+B.d;
  }
  function prepareRoutingContext(commitment=null) {
    if(!precisionRoutingEnabled())return;
    const cur=graphNearest(currentPoint());if(cur)dijkstraFrom(cur.id);
    if(commitment){const cp=graphNearest(pointForCommitment(commitment));if(cp)dijkstraFrom(cp.id);}
  }
  function routingAttraction(name){return state.routingLocations?.attractions?.[keyFor(name)]||null;}
  function pointForCommitment(c){
    if(!c)return null;
    if(c.kind==='premier'&&c.rideKey){
      const ride=state.rides.find(r=>keyFor(r.name)===c.rideKey);
      if(ride)return pointForRide(ride,'entrance');
    }
    if(c.point&&Number.isFinite(Number(c.point.lat))&&Number.isFinite(Number(c.point.lon)))return {lat:Number(c.point.lat),lon:Number(c.point.lon),park:c.point.park||areaPoint(c.area)?.park};
    const p=precisionRoutingEnabled()?state.routingLocations?.commitments?.[c.id]?.entrance:null;
    return p?{lat:p.lat,lon:p.lon,park:areaPoint(c.area)?.park}:areaPoint(c.area);
  }
  async function loadRoutingData(){
    try{
      const [gr,lr]=await Promise.all([fetch('data/routing-graph.json?v=0.6.1'),fetch('data/routing-locations.json?v=0.6.1')]);
      if(!gr.ok||!lr.ok)throw new Error(`routing data ${gr.status}/${lr.status}`);
      const raw=await gr.json(),loc=await lr.json(),nodes=raw.nodes.map(n=>({id:n[0],lat:n[1],lon:n[2]})),adj=new Map();
      for(const n of nodes)adj.set(n.id,[]);for(const [a,b,m] of raw.edges){if(adj.has(a)&&adj.has(b)){adj.get(a).push([b,m]);adj.get(b).push([a,m]);}}
      state.routingGraph={nodes,adj,snapCache:new Map(),sourceCache:new Map(),generatedAt:raw.generatedAt,profile:raw.profile};state.routingLocations=loc;state.routingReady=true;state.routingError=null;renderAll();
    }catch(e){console.warn('Precision routing unavailable',e);state.routingError=String(e?.message||e);state.routingReady=false;renderAll();}
  }


  function isThemePark(park) { return park === 'Disneyland Park' || park === 'Disney Adventure World'; }
  function isParkHop(fromPark, toPark) { return isThemePark(fromPark) && isThemePark(toPark) && fromPark !== toPark; }
  function parkHopPenalty(fromPark, toPark) { return isParkHop(fromPark, toPark) ? PARK_HOP_TIME_MIN : 0; }
  function deferredUntil(k) { return Number(state.notNow[k] || 0); }
  function isDeferred(k) {
    const until = deferredUntil(k);
    if (!until) return false;
    if (until <= Date.now()) { delete state.notNow[k]; save(); return false; }
    return true;
  }
  function rideRowId(k) { return `ride-${k.replace(/[^a-z0-9]+/g,'-')}`; }
  function pointForRide(ride, purpose='entrance') {
    const routed=precisionRoutingEnabled()?routingAttraction(ride.name)?.[purpose]:null;
    if(routed&&Number.isFinite(routed.lat)&&Number.isFinite(routed.lon))return {lat:routed.lat,lon:routed.lon,park:ride.park,confidence:routed.confidence};
    if (Number.isFinite(ride.lat) && Number.isFinite(ride.lon)) return { lat: ride.lat, lon: ride.lon, park: ride.park };
    const m = metaFor(ride.name);
    return areaPoint(ride.area) || areaPoint(m.area) || (ride.park === 'Disney Adventure World' ? areaPoint('Disney Adventure World entrance') : areaPoint('Disneyland Park entrance'));
  }
  function dlpEntrancePoint() { return areaPoint('Disneyland Park entrance'); }
  function gpsDistanceFromDLP() { return state.gps ? haversine(state.gps, dlpEntrancePoint()) : null; }
  function gpsNearDLP() { const d = gpsDistanceFromDLP(); return d != null && d <= DLP_GEOFENCE_METRES; }
  function sessionMode() { return !state.settings.preview && gpsNearDLP() ? 'LIVE' : 'TEST'; }
  function currentPoint() {
    if (gpsNearDLP()) return state.gps;
    return areaPoint(state.settings.location) || areaPoint('Disneyland Park entrance');
  }
  function currentPark() {
    if (gpsNearDLP()) return nearestArea(state.gps).park;
    return (areaPoint(state.settings.location) || {}).park;
  }
  function locationSourceLabel() {
    if (gpsNearDLP()) return 'GPS';
    if (state.gps) return `GPS outside resort, routing uses ${state.settings.locationSource || 'default'}`;
    return state.settings.locationSource === 'manual' ? 'manual' : 'default';
  }
  function nearestArea(point) {
    return Object.entries(AREAS).map(([name,p]) => ({name, ...p, d:haversine(point,p)})).sort((a,b)=>a.d-b.d)[0];
  }

  function parisDateTime(date, time) { return new Date(`${date}T${time}:00+01:00`); }
  function plannerNow() {
    if (state.settings.preview) return parisDateTime(state.settings.previewDate, state.settings.previewTime);
    return new Date();
  }
  function parisDateKey(d) {
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  }
  function parisTime(d) {
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'}).format(d);
  }
  function fmtDate(date) {
    return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00+01:00`));
  }
  function allCommitments(){ return [...COMMITMENTS,...state.dynamicCommitments]; }
  function commitmentDisplayTime(c){ return c?.kind==='premier'&&c.endTime ? `${c.time}–${c.endTime}` : c?.time; }
  function commitmentTargetClock(c){ return c?.kind==='premier'&&c.endTime ? c.endTime : c?.time; }
  function commitmentDateTime(c){ return parisDateTime(c.date,commitmentTargetClock(c)); }
  function bufferFor(c) {
    const custom=Number(c?.buffer);
    if(Number.isFinite(custom))return custom;
    if(c?.kind==='train')return Number(state.settings.trainBuffer);
    if(c?.kind==='premier')return DYNAMIC_ITEM_BUFFERS.premier;
    if(c?.kind==='show')return DYNAMIC_ITEM_BUFFERS.show;
    if(c?.kind==='other')return DYNAMIC_ITEM_BUFFERS.other;
    return Number(state.settings.mealBuffer);
  }
  function nextCommitment(now = plannerNow()) {
    const day = parisDateKey(now);
    if (day < '2026-10-30' || day > '2026-11-02') return null;
    const candidates = allCommitments().filter(c => (c.hard || state.settings.softPlans) && commitmentDateTime(c) > now);
    return candidates.sort((a,b)=>commitmentDateTime(a)-commitmentDateTime(b))[0] || null;
  }

  async function fetchThemeParks() {
    const [liveRes, childRes] = await Promise.all([
      fetch(`${TPW_BASE}/entity/${TPW_DESTINATION}/live`, { cache:'no-store' }),
      fetch(`${TPW_BASE}/entity/${TPW_DESTINATION}/children`, { cache:'force-cache' }).catch(()=>null)
    ]);
    if (!liveRes.ok) throw new Error(`ThemeParks.wiki ${liveRes.status}`);
    const live = await liveRes.json();
    const children = childRes && childRes.ok ? await childRes.json() : { children: [] };
    const entities = children.children || [];
    const entityMap = new Map(entities.map(e => [e.id, e]));
    const getPark = ent => { let x=ent,loops=0; while(x&&loops++<10){ if(x.entityType==='PARK') return canonicalPark(x.name); x=entityMap.get(x.parentId); } return inferPark(ent?.name||''); };
    const getArea = ent => { let x=ent,loops=0; while(x&&loops++<10){ if(x.entityType==='LAND') return canonicalArea(x.name); x=entityMap.get(x.parentId); } return null; };
    const rides = (live.liveData || []).filter(x => x.entityType === 'ATTRACTION').map(x => {
      const ent = entityMap.get(x.entityId || x.id) || {};
      const standby = x.queue?.STANDBY?.waitTime;
      const single = x.queue?.SINGLE_RIDER?.waitTime;
      const loc = ent.location || {};
      return { id:x.entityId||x.id||keyFor(x.name), name:x.name, park:getPark(ent), area:getArea(ent), status:x.status||'UNKNOWN', wait:Number.isFinite(standby)?standby:null, singleRiderWait:Number.isFinite(single)?single:null, lastUpdated:x.lastUpdated||null, lat:Number(loc.latitude), lon:Number(loc.longitude) };
    });
    return { rides, entities, source:'ThemeParks.wiki', updated:newestTimestamp(rides) };
  }

  async function fetchQueueTimes() {
    const results = await Promise.all(QT_PARKS.map(async p => {
      const res = await fetch(`${QT_PROXY_BASE}/parks/${p.id}`, { cache:'no-store' });
      if (!res.ok) throw new Error(`Queue-Times proxy ${res.status}`);
      const data = await res.json();
      const raw = [...(data.rides || []), ...(data.lands || []).flatMap(l => l.rides || [])];
      return raw.map(r => ({...r, park:p.park}));
    }));
    const all = results.flat();
    const map = new Map();
    for (const r of all) {
      const isSingle = /single rider/i.test(r.name);
      const k = keyFor(r.name);
      if (isSingle) {
        const main = map.get(k) || { id:`qt-${k}`, name:r.name.replace(/\s*single rider\s*/i,''), park:r.park, status:'UNKNOWN', wait:null };
        main.singleRiderWait = r.is_open ? Number(r.wait_time) : null;
        main.lastUpdated = r.last_updated;
        map.set(k, main);
      } else {
        const main = map.get(k) || {};
        Object.assign(main, { id:`qt-${k}`, name:r.name, park:r.park, status:r.is_open ? 'OPERATING' : 'CLOSED', wait:r.is_open ? Number(r.wait_time) : null, lastUpdated:r.last_updated });
        map.set(k, main);
      }
    }
    const rides = [...map.values()];
    return { rides, entities: [], source: 'Queue-Times.com', updated: newestTimestamp(rides) };
  }

  function newestTimestamp(rides) {
    const ts = rides.map(r => r.lastUpdated && new Date(r.lastUpdated)).filter(d => d && !isNaN(d));
    return ts.length ? new Date(Math.max(...ts.map(d=>d.getTime()))) : new Date();
  }
  function canonicalPark(name='') {
    const n = norm(name);
    if (n.includes('adventure world') || n.includes('studios')) return 'Disney Adventure World';
    if (n.includes('disneyland park')) return 'Disneyland Park';
    return inferPark(name);
  }
  function canonicalArea(name='') {
    const n = norm(name);
    if (n.includes('main street')) return 'Main Street U.S.A.';
    if (n.includes('frontierland')) return 'Frontierland';
    if (n.includes('adventureland')) return 'Adventureland';
    if (n.includes('fantasyland')) return 'Fantasyland';
    if (n.includes('discoveryland')) return 'Discoveryland';
    if (n.includes('avengers')) return 'Marvel Avengers Campus';
    if (n.includes('pixar')) return 'Worlds of Pixar';
    if (n.includes('frozen')) return 'World of Frozen';
    if (n.includes('production courtyard') || n.includes('world premiere')) return 'Production Courtyard';
    return name || null;
  }
  function inferPark(name='') {
    const n = norm(name);
    if (['crush','ratatouille','tower of terror','flight force','spider man','spiderman','rc racer','toy soldiers','slinky','frozen ever after','raiponce','tangled','cars road trip','cars quatre'].some(x=>n.includes(x))) return 'Disney Adventure World';
    return 'Disneyland Park';
  }

  function ageMinutes(date) {
    if (!date || isNaN(date)) return null;
    return Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  }
  function attractionFreshness(ride) {
    if (!ride?.lastUpdated) return { level:'unknown', mins:null };
    const d = new Date(ride.lastUpdated);
    if (isNaN(d)) return { level:'unknown', mins:null };
    const mins = ageMinutes(d);
    if (mins > ATTRACTION_STALE_MIN) return { level:'stale', mins };
    if (mins > ATTRACTION_AGING_MIN) return { level:'aging', mins };
    return { level:'fresh', mins };
  }
  function feedFreshness() {
    const mins = ageMinutes(state.sourceUpdated);
    if (mins == null) return { level: 'unknown', mins: null };
    if (mins > FEED_STALE_MIN) return { level: 'stale', mins };
    if (mins > FEED_AGING_MIN) return { level: 'aging', mins };
    return { level: 'fresh', mins };
  }
  function compareFeeds(primaryRides, secondaryRides) {
    const secondaryMap = new Map(secondaryRides.map(r => [keyFor(r.name), r]));
    const disagreements = [];
    for (const r of primaryRides) {
      delete r.feedDisagreement;
      delete r.secondaryWait;
      delete r.secondaryStatus;
      delete r.crossChecked;
      const other = secondaryMap.get(keyFor(r.name));
      if (!other) continue;
      r.crossChecked = true;
      r.secondaryWait = other.wait;
      r.secondaryStatus = other.status;
      const pOpen = r.status === 'OPERATING';
      const sOpen = other.status === 'OPERATING';
      if (pOpen !== sOpen && !['UNKNOWN', null].includes(r.status) && !['UNKNOWN', null].includes(other.status)) {
        r.feedDisagreement = { kind: 'status', primary: r.status, secondary: other.status };
      } else if (pOpen && sOpen && Number.isFinite(r.wait) && Number.isFinite(other.wait)) {
        const diff = Math.abs(r.wait - other.wait);
        if (diff >= 15) r.feedDisagreement = { kind: 'wait', primary: r.wait, secondary: other.wait, diff };
      }
      if (r.feedDisagreement) disagreements.push({ name: r.name, ...r.feedDisagreement });
    }
    return disagreements;
  }

  function friendlySecondaryError(reason) {
    const message = String(reason?.message || reason || 'browser fetch failed');
    if (/load failed|failed to fetch|networkerror/i.test(message)) return 'Queue-Times proxy unreachable';
    return `Queue-Times proxy: ${message}`;
  }

  let refreshInFlight = null;

  async function refreshLive() {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
    setStatus('loading','Connecting');
    $('#refreshBtn').disabled = true;
    try {
      const [tpwResult, qtResult] = await Promise.allSettled([fetchThemeParks(), fetchQueueTimes()]);
      const tpw = tpwResult.status === 'fulfilled' ? tpwResult.value : null;
      const qt = qtResult.status === 'fulfilled' ? qtResult.value : null;
      state.secondaryError = tpw && !qt ? friendlySecondaryError(qtResult.reason) : (!tpw && qt ? `ThemeParks.wiki: ${tpwResult.reason?.message || 'fetch failed'}` : null);
      if (!tpw && !qt) throw new Error('Both live feeds failed');

      const primary = tpw || qt;
      const secondary = tpw && qt ? qt : null;
      state.rides = primary.rides.filter(r => r.name && !/entry to world of frozen/i.test(r.name));
      state.entities = primary.entities || [];
      state.source = primary.source;
      state.sourceUpdated = primary.updated;
      state.secondarySource = secondary?.source || null;
      state.secondaryUpdated = secondary?.updated || null;
      state.feedDisagreements = secondary ? compareFeeds(state.rides, secondary.rides) : [];
      state.lastFetchedAt = new Date();
      enhanceRidesFromEntities();

      const freshness = feedFreshness();
      const statusText = !tpw ? 'Fallback live' : freshness.level === 'stale' ? 'Live data stale' : 'Live';
      setStatus(freshness.level === 'stale' ? 'warn' : 'ok', statusText);
      renderAll();
    } catch (e) {
      console.error(e);
      setStatus('bad','Live feed failed');
      toast('Could not reach either live source. Try Refresh live.');
      renderAll();
    } finally {
      $('#refreshBtn').disabled = false;
    }
    })();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  function enhanceRidesFromEntities() {
    if (!state.entities.length) return;
    const byName = new Map(state.entities.map(e=>[norm(e.name),e]));
    for (const r of state.rides) {
      const e = byName.get(norm(r.name));
      const loc = e?.location;
      if (loc && Number.isFinite(Number(loc.latitude)) && Number.isFinite(Number(loc.longitude))) {
        r.lat = Number(loc.latitude); r.lon = Number(loc.longitude);
      }
    }
  }

  function experienceMinutes(meta) {
    const defaults = { headline:5, ride:5, scenic:15, show:15, playground:25, walkthrough:12, minor:8, character:8, transport:20 };
    return Math.max(Number(meta.duration || 0), defaults[meta.category] || 5);
  }
  function riderSwitchEligible(meta){return ['ride','headline','scenic'].includes(meta.category);}
  function riderSwitchOn(ride,meta=metaFor(ride.name)){return riderSwitchEligible(meta)&&!!state.riderSwitch[keyFor(ride.name)];}
  function experienceMinutesForRide(ride,meta){
    const base=experienceMinutes(meta);
    return riderSwitchOn(ride,meta)?base*2+RIDER_SWITCH_HANDOVER_MIN:base;
  }

  function evaluateRide(ride, now, commitment) {
    if (ride.status !== 'OPERATING' || ride.wait == null) return null;
    const rideFresh = attractionFreshness(ride);
    if (rideFresh.level === 'stale' || rideFresh.level === 'unknown') return null;
    if (ride.feedDisagreement?.kind === 'status') return null;
    const k = keyFor(ride.name);
    if (state.priorities[k] === 'skip' || state.done[k] || isDeferred(k)) return null;
    const meta = metaFor(ride.name);
    const area = ride.area || meta.area;
    const fromPark = currentPark();
    const parkHop = isParkHop(fromPark, ride.park);
    if (parkHop && !state.settings.parkHop) return null;
    const from = currentPoint(), to = pointForRide(ride,'entrance'), rideExit=pointForRide(ride,'exit');
    const walkTo = walkMinutes(from,to) + parkHopPenalty(fromPark,ride.park);
    let chosenWait = ride.wait, queueLabel = 'Standby';
    if (state.settings.singleRider && Number.isFinite(ride.singleRiderWait) && ride.singleRiderWait < chosenWait) { chosenWait=ride.singleRiderWait; queueLabel='Single Rider'; }
    const dwellMinutes = experienceMinutesForRide(ride,meta);
    const commitmentMinutes = walkTo + chosenWait + dwellMinutes;
    let walkOnward=0, minutesToTarget=null, fits=true, target=null, anchorConsumption=null, anchorSlack=null, tightFit=false;
    if (commitment) {
      const cPoint=pointForCommitment(commitment);
      const safeAt=new Date(commitmentDateTime(commitment).getTime()-bufferFor(commitment)*60000);
      minutesToTarget=Math.floor((safeAt-now)/60000);
      walkOnward=walkMinutes(rideExit,cPoint)+parkHopPenalty(ride.park,cPoint?.park);
      const totalNeeded=walkTo+chosenWait+dwellMinutes+walkOnward;
      anchorConsumption=totalNeeded;
      anchorSlack=minutesToTarget-totalNeeded;
      const requiredSlack=commitment.hard?HARD_ANCHOR_MIN_SLACK:0;
      fits=anchorSlack>=requiredSlack;
      tightFit=!!commitment.hard&&anchorSlack>=HARD_ANCHOR_MIN_SLACK&&anchorSlack<HARD_ANCHOR_TIGHT_SLACK;
      target={safeAt,totalNeeded,slack:anchorSlack,requiredSlack};
    }
    if (!fits) return null;
    const avg=baselineFor(ride.name);
    let opportunity=0;
    if (avg!=null && ['ride','headline'].includes(meta.category)) opportunity=Math.max(-25,Math.min(35,(avg-chosenWait)*1.2));
    const priority=state.priorities[k]||'neutral';
    let score={must:65,want:30,neutral:0}[priority]||0;
    score+=meta.bonus+opportunity;
    if (['ride','headline'].includes(meta.category)) score+=Math.max(-8,(30-Math.min(chosenWait,60))*.22);
    else if (meta.category==='scenic') score+=Math.max(-5,(20-Math.min(chosenWait,45))*.10);
    else if (meta.category==='show') score+=chosenWait<=10?2:-3;
    else if (meta.category==='playground') score+=chosenWait<=5?1:-8;
    else if (chosenWait===0) score-=6;
    if (state.settings.mode==='balanced') {
      if (chosenWait<=10) score+=6;
      else if (chosenWait<=15) score+=5;
      else if (chosenWait<=20) score+=2;
      const excessCommitment=Math.max(0,commitmentMinutes-30);
      score-=excessCommitment*.60;
      if (commitmentMinutes<=30) score+=(30-commitmentMinutes)*.12;
    }
    if (parkHop) score-=PARK_HOP_SCORE_PENALTY;
    score-=walkTo*(state.settings.mode==='lowWalk'?2.4:1.15);
    if (state.settings.mode==='queueHunter') score+=opportunity*.45;
    if (state.settings.mode==='rain') score+=meta.indoor?12:-25;
    if (ride.feedDisagreement?.kind==='wait') score-=12;
    if (rideFresh.level==='aging') score-=8;
    if (commitment&&target) { const slack=target.slack; score+=Math.min(8,slack*.08); if(slack<10)score-=9; if(slack<20&&['ride','headline','scenic','show'].includes(meta.category))score+=4; }
    const finish=new Date(now.getTime()+(walkTo+chosenWait+dwellMinutes)*60000);
    return {ride,score,walkTo,walkOnward,chosenWait,queueLabel,dwellMinutes,commitmentMinutes,anchorConsumption,anchorSlack,tightFit,avg,opportunity,priority,finish,meta:{...meta,area},minutesToTarget,target,parkHop,rideFresh};
  }

  function recommendationReason(x) {
    const bits=[];
    if(x.priority==='must')bits.push('marked MUST'); else if(x.priority==='want')bits.push('marked WANT');
    if(x.avg!=null&&x.avg-x.chosenWait>=10)bits.push(`${x.avg-x.chosenWait}m below usual`);
    if(x.walkTo<=4)bits.push('very close'); else if(x.walkTo<=8)bits.push('nearby');
    if(x.meta.category==='headline')bits.push('headline ride');
    if(x.meta.category==='scenic')bits.push('scenic attraction');
    if(x.meta.category==='show')bits.push('show / cinema');
    if(x.meta.category==='playground')bits.push('time filler with realistic play time');
    if(riderSwitchOn(x.ride,x.meta))bits.push('Rider Switch timing included');
    if(state.settings.mode==='balanced'&&x.commitmentMinutes<=30)bits.push('short total commitment');
    if(precisionRoutingEnabled())bits.push('stroller-route walking estimate');
    if(['ride','headline'].includes(x.meta.category)&&x.chosenWait<=15)bits.push('short queue now');
    if(x.parkHop)bits.push('requires park hop');
    if(x.rideFresh.level==='aging')bits.push('queue update is aging');
    if(x.ride.feedDisagreement?.kind==='wait')bits.push('feeds disagree on wait');
    if(x.tightFit)bits.push('tight fit with booking protected');
    return bits.length?bits.join(', '):'solid fit for the current rules';
  }
  function allRecommendations(){const now=plannerNow(),c=nextCommitment(now);prepareRoutingContext(c);return state.rides.map(r=>evaluateRide(r,now,c)).filter(Boolean).sort((a,b)=>b.score-a.score);}
  function topRecommendations(){return allRecommendations().slice(0,3);}

  function renderAll() {
    syncControls();
    renderSession();
    renderPreviewSummary();
    renderHero();
    renderRecommendations();
    renderWaitBoard();
    renderSchedule();
    renderSourceAge();
    activateView(state.activeView,false);
    renderSyncStatus();
  }

  function renderSession() {
    const live = sessionMode() === 'LIVE';
    const banner = $('#sessionBanner');
    banner.className = `session-banner ${live ? 'live' : 'test'}`;
    $('#sessionMode').textContent = live ? 'LIVE MODE' : 'TEST MODE';
    if (live) {
      const near = nearestArea(state.gps);
      $('#sessionDetail').textContent = `GPS confirms you are at Disneyland Paris near ${near.name}. Live routing is enabled.`;
    } else if (state.settings.preview) {
      $('#sessionDetail').textContent = 'Preview clock is active. This is a simulation using current queue data.';
    } else if (state.gps) {
      const km = (gpsDistanceFromDLP()/1000).toFixed(1);
      $('#sessionDetail').textContent = `GPS is ${km} km from Disneyland Paris. Routing uses the selected test area, not your physical location.`;
    } else {
      $('#sessionDetail').textContent = 'No in-resort GPS fix. Recommendations are a simulation using the selected test area.';
    }
  }

  function renderPreviewSummary() {
    const e=$('#previewSummary'); if(!e)return; if(!state.settings.preview){e.textContent='Preview: off';return;} e.textContent=`Preview: ${fmtDate(state.settings.previewDate)} ${state.settings.previewTime}`;
  }

  function renderHero() {
    const now = plannerNow(), c = nextCommitment(now);
    if (!c) {
      $('#nextName').textContent = 'No trip commitment active';
      $('#nextMeta').textContent = state.settings.preview ? 'No later timed point on this preview day.' : 'Live queues still work. Use Preview to test trip deconfliction.';
      $('#countdown').textContent = '--';
      $('#safeLine').textContent = 'Recommendations are not time-blocked outside the trip dates.';
      const ub=$('#urgencyBadge');if(ub){ub.hidden=true;ub.className='urgency-badge';}
      $('.hero').classList.remove('urgency-safe','urgency-tight','urgency-now');
      state.currentUrgency='none';
      return;
    }
    const at = commitmentDateTime(c), safeAt = new Date(at.getTime()-bufferFor(c)*60000);
    const mins = Math.max(0,Math.floor((safeAt-now)/60000));
    $('#nextName').textContent = c.name;
    const timeMeta=c.kind==='premier'?`Premier Access ${commitmentDisplayTime(c)}`:commitmentDisplayTime(c);
    $('#nextMeta').textContent = `${fmtDate(c.date)} · ${timeMeta} · ${c.area}${c.locationNote?` · ${c.locationNote}`:''}${c.hard?'':' · soft plan'}`;
    $('#countdown').textContent = mins >= 60 ? `${Math.floor(mins/60)}h ${mins%60}m` : `${mins} min`;
    const cPoint=pointForCommitment(c), directWalk=walkMinutes(currentPoint(),cPoint)+parkHopPenalty(currentPark(),cPoint?.park), directSlack=mins-directWalk;
    const urgency=directSlack<=HARD_ANCHOR_MIN_SLACK?'now':directSlack<15?'tight':'safe';
    state.currentUrgency=urgency;
    const ub=$('#urgencyBadge');if(ub){ub.hidden=false;ub.className=`urgency-badge ${urgency}`;ub.textContent=urgency==='now'?'⛔ MOVE NOW':urgency==='tight'?'⚠ GETTING TIGHT':'✓ SAFE';}
    $('.hero').classList.remove('urgency-safe','urgency-tight','urgency-now');$('.hero').classList.add(`urgency-${urgency}`);
    const targetLabel='Target arrival';
    $('#safeLine').textContent = `${targetLabel} ${parisTime(safeAt)} · about ${directWalk}m direct walk · ${directSlack}m direct-route slack. The engine rejects anything that cannot finish and get you there safely.`;
  }

  function renderRecommendations() {
    const recs = topRecommendations(), all = allRecommendations(), box = $('#recommendations');
    if (!state.rides.length) { box.innerHTML = '<div class="card loading">No live attraction data yet.</div>'; renderParkHopNote([]); return; }
    if (!recs.length) { const c=nextCommitment(plannerNow());let msg='Nothing with fresh, explicit OPEN data safely fits the current rules.';if(c){const cp=pointForCommitment(c),safeAt=new Date(commitmentDateTime(c).getTime()-bufferFor(c)*60000),mins=Math.max(0,Math.floor((safeAt-plannerNow())/60000)),walk=walkMinutes(currentPoint(),cp)+parkHopPenalty(currentPark(),cp?.park),slack=mins-walk;msg=slack<=HARD_ANCHOR_MIN_SLACK?`⛔ MOVE NOW · Head to ${c.name}. No attraction fits with a safe transfer margin.`:`No attraction fits safely. Start heading toward ${c.name} or enjoy the area without joining another queue.`;}box.innerHTML=`<div class="card empty ${msg.startsWith('⛔')?'move-now':''}">${esc(msg)}</div>`; renderParkHopNote(all); return; }
    box.innerHTML = recs.map((x,i)=>{
      const k=keyFor(x.ride.name), opp=x.avg==null?null:x.avg-x.chosenWait;
      const oppText=opp==null?'no historical baseline':opp>=10?`${opp}m below 2026 avg`:opp<=-10?`${Math.abs(opp)}m above 2026 avg`:'near usual wait';
      const onward=x.target?` · ${x.walkOnward}m onward walk · ${x.anchorConsumption}m to anchor · ${x.anchorSlack}m slack`:'';
      const priorityTag=x.priority==='must'?'<span class="tag good">MUST</span>':x.priority==='want'?'<span class="tag">WANT</span>':'';
      const disagreeTag=x.ride.feedDisagreement?.kind==='wait'?'<span class="tag warn">FEEDS DISAGREE</span>':'';
      const hopTag=x.parkHop?'<span class="tag warn">PARK HOP</span>':'';
      const agingTag=x.rideFresh.level==='aging'?'<span class="tag warn">AGING DATA</span>':'';
      const tightTag=x.tightFit?'<span class="tag warn">⚠ TIGHT FIT</span>':'';
      const routeTag=precisionRoutingEnabled()?'<span class="tag good">STROLLER ROUTE</span>':'';
      const attention=i===0&&state.currentUrgency==='tight'?' attention-tight':i===0&&state.currentUrgency==='now'?' attention-now':'';
      return `<article class="card reco ${x.tightFit?'tight-fit':'safe-fit'}${attention}" data-card-jump="${esc(k)}"><div class="rank">${i+1}</div><button class="ride-link" data-jump="${esc(k)}">${esc(x.ride.name)}</button><div class="location-line"><span class="chip">${esc(x.ride.park)}</span>${x.meta.area?`<span class="chip">${esc(x.meta.area)}</span>`:''}</div><div class="big-wait">${x.chosenWait}<span> min ${x.queueLabel}</span></div><div class="tags"><span class="tag category">${esc(x.meta.label)}</span><span class="tag ${opp!=null&&opp>=10?'good':opp!=null&&opp<=-10?'warn':''}">${oppText}</span><span class="tag">${x.walkTo}m walk</span>${priorityTag}${disagreeTag}${hopTag}${agingTag}${tightTag}${routeTag}</div><div class="why"><strong>Why:</strong> ${esc(recommendationReason(x))}. Estimated finished about <strong>${parisTime(x.finish)}</strong>${onward}. Total commitment about <strong>${x.commitmentMinutes}m</strong>, including ${x.dwellMinutes}m experience time.</div><div class="reco-actions"><button class="done-btn" data-reco-done="${esc(k)}">DONE</button><button class="not-now-btn" data-reco-notnow="${esc(k)}">Not now</button></div></article>`;
    }).join('');
    $$('[data-reco-done]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();markDoneWithUndo(b.dataset.recoDone);}));
    $$('[data-reco-notnow]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();deferRide(b.dataset.recoNotnow);}));
    $$('[data-jump]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();jumpToRide(b.dataset.jump);}));
    $$('[data-card-jump]').forEach(card=>card.addEventListener('click',()=>jumpToRide(card.dataset.cardJump)));
    renderParkHopNote(all);
  }
  function renderParkHopNote(all){const e=$('#parkHopNote');if(!state.settings.parkHop){e.hidden=true;e.textContent='';return;}const hasHop=all.slice(0,3).some(x=>x.parkHop);e.hidden=false;e.textContent=hasHop?'Other park checked. A park-hop candidate is strong enough to appear above.':'Other park checked. No hop is currently worth the extra transfer time.';}
  function rideAgeLabel(r){const f=attractionFreshness(r);if(f.mins==null)return'update time unknown';return f.mins<1?'updated just now':`updated ${f.mins}m ago`;}
  function deferredRemaining(k){const until=deferredUntil(k);if(!until||until<=Date.now())return 0;return Math.max(1,Math.ceil((until-Date.now())/60000));}
  function waitValueFor(r,m){const fresh=attractionFreshness(r);if(r.status!=='OPERATING')return{text:prettyStatus(r.status),cls:'closed'};if(fresh.level==='stale'||fresh.level==='unknown')return{text:r.wait==null?'OPEN?':`${r.wait} min`,cls:'stale'};if(r.wait==null)return{text:'OPEN · wait unavailable',cls:'open'};const avg=baselineFor(r.name);if(avg==null||!['ride','headline','scenic'].includes(m.category))return{text:`${r.wait} min`,cls:fresh.level==='aging'?'warn':'open'};const delta=avg-r.wait;if(delta>=10)return{text:`${r.wait} min · ${delta}m below avg`,cls:'good'};if(delta<=-10)return{text:`${r.wait} min · ${Math.abs(delta)}m above avg`,cls:'warn'};return{text:`${r.wait} min · near avg`,cls:'open'};}
  function railroadSummary(){const stations=[['Main Street','disneyland railroad main street station'],['Frontierland','disneyland railroad frontierland depot'],['Fantasyland','disneyland railroad fantasyland station'],['Discoveryland','disneyland railroad discoveryland station']];const found=stations.map(([label,pat])=>[label,state.rides.find(r=>norm(r.name).includes(pat))]).filter(x=>x[1]);if(!found.length)return'';const cells=found.map(([label,r])=>{const fresh=attractionFreshness(r),stale=fresh.level==='stale'||fresh.level==='unknown';const val=r.status==='OPERATING'?(r.wait==null?'OPEN':`${r.wait}m`):'CLOSED';const cls=stale?'stale':r.status==='OPERATING'?'open':'closed';return`<span class="rail-station ${cls}"><strong>${label}</strong> ${val}${stale?' · STALE':''}</span>`;}).join('');return`<div class="railroad-strip"><div class="railroad-title">Disneyland Railroad stations</div><div class="railroad-stations">${cells}</div></div>`;}
  function renderWaitBoard(){
    const q=norm(state.search),freshRank=r=>({fresh:0,aging:1,unknown:2,stale:3}[attractionFreshness(r).level]??3);
    const clear=$('#clearSearch');if(clear)clear.hidden=!state.search;
    let rides=[...state.rides].sort((a,b)=>{const cp=currentPark();if(a.park!==b.park){if(a.park===cp)return-1;if(b.park===cp)return 1;return a.park.localeCompare(b.park);}const ao=a.status==='OPERATING'?0:1,bo=b.status==='OPERATING'?0:1;if(ao!==bo)return ao-bo;const af=freshRank(a),bf=freshRank(b);if(af!==bf)return af-bf;return(a.wait??999)-(b.wait??999);});
    rides=rides.filter(r=>{const k=keyFor(r.name);if(q&&!norm(r.name).includes(q))return false;if(state.activeFilter==='done')return!!state.done[k];if(state.activeFilter!=='all'&&r.park!==state.activeFilter)return false;return true;});
    const showRail=!q&&(state.activeFilter==='all'||state.activeFilter==='Disneyland Park');
    const rows=rides.length?rides.map(r=>{const k=keyFor(r.name),pri=state.priorities[k]||'neutral',done=!!state.done[k],m0=metaFor(r.name),area=r.area||m0.area,m={...m0,area},value=waitValueFor(r,m),fresh=attractionFreshness(r),stale=fresh.level==='stale'||fresh.level==='unknown';const sr=Number.isFinite(r.singleRiderWait)?`Single Rider ${r.singleRiderWait}m`:null,avg=baselineFor(r.name),typical=avg!=null&&['ride','headline','scenic'].includes(m.category)?`2026 avg ${avg}m`:null,snoozed=isDeferred(k),snoozeMins=snoozed?deferredRemaining(k):0;let confidence=r.feedDisagreement?(r.feedDisagreement.kind==='status'?'feeds disagree on status':`other feed ${r.secondaryWait}m`):r.crossChecked?'cross-checked':`${state.source||'live source'} only`;const chips=[`<span class="chip wait ${value.cls}">${esc(value.text)}</span>`,`<span class="chip">${esc(r.park)}</span>`,area?`<span class="chip">${esc(area)}</span>`:'',`<span class="chip category">${esc(m.label)}</span>`,stale?'<span class="chip stale">STALE</span>':fresh.level==='aging'?'<span class="chip warn">AGING</span>':'',snoozed?`<span class="chip warn">Snoozed · ${snoozeMins}m</span>`:''].filter(Boolean).join('');const context=[typical,sr].filter(Boolean).map(esc).join(' · ');return`<div class="ride-row ${done?'done':''} ${stale?'stale':''} ${r.status!=='OPERATING'?'closed':''}" id="${rideRowId(k)}"><div class="ride-title">${esc(r.name)}</div><div class="quick-chips">${chips}</div>${context?`<div class="ride-context">${context}</div>`:''}<div class="ride-actions"><button class="priority-btn ${pri}" data-priority="${esc(k)}">${priorityLabel(pri)}</button><button class="done-btn ${done?'on':''}" data-done="${esc(k)}">${done?'DONE':'Mark done'}</button>${snoozed?`<button class="unsnooze-btn" data-unsnooze="${esc(k)}">Unsnooze</button>`:''}</div><div class="data-foot">${esc(confidence)} · ${esc(rideAgeLabel(r))}${stale?' · excluded from recommendations':''}${r.status!=='OPERATING'?` · ${esc(prettyStatus(r.status))}`:''}</div></div>`;}).join(''):'<div class="empty">No attractions match this view.</div>';
    $('#waitBoard').innerHTML=`${showRail?railroadSummary():''}${rows}`;
    decorateRideCards();
    $$('[data-priority]').forEach(b=>b.addEventListener('click',()=>cyclePriority(b.dataset.priority)));
    $$('[data-done]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.done;if(state.done[k])toggleDone(k);else markDoneWithUndo(k);}));
    $$('[data-unsnooze]').forEach(b=>b.addEventListener('click',()=>{delete state.notNow[b.dataset.unsnooze];save();renderAll();toast('Snooze cleared.');}));
    $$('[data-rider-switch]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggleRiderSwitch(b.dataset.riderSwitch);}));
  }

  function dynamicKindLabel(c){ return c.kind==='premier'?'PREMIER':c.kind==='show'?'SHOW':c.kind==='other'?'TIMED':''; }
  function populateTimedRideOptions(){
    const dl=$('#rideOptions');if(!dl)return;
    dl.innerHTML=[...state.rides].sort((a,b)=>a.name.localeCompare(b.name)).map(r=>`<option value="${esc(r.name)}"></option>`).join('');
  }
  function updateTimedForm(){
    const type=$('#timedType')?.value||'premier';
    $('#timedPremierFields').hidden=type!=='premier';
    $('#timedShowFields').hidden=type!=='show';
    $('#timedOtherFields').hidden=type!=='other';
    const help=$('#timedHelp');if(help)help.textContent=type==='premier'?'Premier Access uses the end of the Disney time window as a hard deadline, with a 5-minute arrival margin.':type==='show'?'Reserved viewing is treated as a hard show-time commitment with a 20-minute arrival margin.':'Other timed items use a 10-minute arrival margin.';
  }
  function addTimedItem(){
    const type=$('#timedType').value,date=$('#timedDate').value,id=`dyn-${Date.now().toString(36)}`;
    let item={id,date,hard:true,dynamic:true,kind:type};
    if(type==='premier'){
      const entered=$('#timedRide').value.trim(),start=$('#timedStart').value,end=$('#timedEnd').value;
      const ride=state.rides.find(r=>keyFor(r.name)===keyFor(entered))||state.rides.find(r=>norm(entered).length>3&&norm(r.name).includes(norm(entered)));
      if(!ride)return toast('Pick a ride from the current attraction list.');
      if(!start||!end)return toast('Add both the start and end of the Premier Access window.');
      if(end<=start)return toast('Premier Access end time must be after the start time.');
      const area=ride.area||metaFor(ride.name).area||currentPark();
      item={...item,name:`${ride.name} · Premier Access`,rideName:ride.name,rideKey:keyFor(ride.name),area,time:start,endTime:end,buffer:DYNAMIC_ITEM_BUFFERS.premier};
    }else if(type==='show'){
      const preset=SHOW_LOCATIONS[$('#timedShow').value],time=$('#timedShowTime').value;
      if(!preset||!time)return toast('Choose the show and time.');
      item={...item,...preset,time,buffer:DYNAMIC_ITEM_BUFFERS.show};
    }else{
      const name=$('#timedOtherName').value.trim(),area=$('#timedOtherArea').value,time=$('#timedOtherTime').value;
      if(!name||!area||!time)return toast('Add a name, area and time.');
      item={...item,name,area,time,buffer:DYNAMIC_ITEM_BUFFERS.other};
    }
    state.dynamicCommitments.push(item);save();renderAll();
    $('#timedDetails').open=false;
    if(type==='premier'){$('#timedRide').value='';$('#timedStart').value='';$('#timedEnd').value='';}
    else if(type==='other'){$('#timedOtherName').value='';$('#timedOtherTime').value='';}
    toast('Timed item added and protected.');
  }
  function removeTimedItem(id){
    state.dynamicCommitments=state.dynamicCommitments.filter(x=>x.id!==id);save();renderAll();toast('Timed item removed.');
  }
  function renderSchedule() {
    const groups = {};
    allCommitments().sort((a,b)=>commitmentDateTime(a)-commitmentDateTime(b)).forEach(c => (groups[c.date] ||= []).push(c));
    $('#scheduleList').innerHTML = Object.entries(groups).map(([date,items])=>`<div class="schedule-day"><div class="schedule-date">${fmtDate(date)}</div>${items.map(c=>{const t=commitmentDisplayTime(c),kind=dynamicKindLabel(c),note=c.locationNote?` · ${c.locationNote}`:'';return `<div class="schedule-item ${c.dynamic?'dynamic':''}"><strong>${t}</strong><span>${esc(c.name)} · ${esc(c.area)}${esc(note)}</span><span class="schedule-badges">${kind?`<span class="timed-chip">${kind}</span>`:c.hard?'':'<span class="soft">SOFT</span>'}${c.dynamic?`<button class="remove-timed" data-remove-timed="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">×</button>`:''}</span></div>`;}).join('')}</div>`).join('');
    $$('[data-remove-timed]').forEach(b=>b.addEventListener('click',()=>removeTimedItem(b.dataset.removeTimed)));
    populateTimedRideOptions();
  }

  function renderSourceAge() {
    const top=$('#topUpdated');
    if(!state.sourceUpdated){$('#sourceAge').textContent='Waiting for data';$('#feedHealth').textContent='Cross-check not available yet.';if(top)top.textContent='Waiting for live data';return;}
    const fresh=feedFreshness(),age=fresh.mins<1?'just now':`${fresh.mins}m ago`,flag=fresh.level==='stale'?' · STALE':fresh.level==='aging'?' · AGING':'';
    $('#sourceAge').textContent=`${state.source} · feed ${age}${flag}`;
    const fetchedAge=state.lastFetchedAt?ageMinutes(state.lastFetchedAt):null;if(top)top.textContent=fetchedAge==null?`${state.source}`:`Refreshed ${fetchedAge<1?'just now':`${fetchedAge}m ago`}`;
    if(state.secondarySource){const count=state.feedDisagreements.length;$('#feedHealth').textContent=count?`${state.secondarySource} cross-check: ${count} disagreement${count===1?'':'s'}. Status conflicts are excluded from recommendations.`:`${state.secondarySource} cross-check: no material disagreements.`;}
    else if(state.secondaryError)$('#feedHealth').textContent=`${state.secondaryError}. ThemeParks.wiki remains the live source; the ChatGPT packet asks for an independent public re-check.`;
    else $('#feedHealth').textContent='Only one live source is reachable. Treat recommendations with a little more caution.';
  }

  function prettyStatus(s='UNKNOWN') { return String(s || 'UNKNOWN').toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()); }
  function priorityLabel(p) { return {neutral:'Priority',want:'WANT',must:'MUST',skip:'SKIP'}[p] || 'Priority'; }
  function cyclePriority(k) {
    const order = ['neutral','want','must','skip'];
    const cur = state.priorities[k] || 'neutral';
    const next = order[(order.indexOf(cur)+1)%order.length];
    if (next === 'neutral') delete state.priorities[k]; else state.priorities[k]=next;
    save(); renderAll();
  }
  function toggleDone(k) { state.done[k] = !state.done[k]; if (!state.done[k]) delete state.done[k]; save(); renderAll(); }
  function markDoneWithUndo(k) {
    const wasDone = !!state.done[k];
    state.done[k] = true; save(); renderAll();
    showUndoToast('Marked DONE', () => { if (!wasDone) delete state.done[k]; save(); renderAll(); });
  }
  function deferRide(k) {
    const previous = state.notNow[k];
    state.notNow[k] = Date.now() + NOT_NOW_MIN*60000; save(); renderAll();
    showUndoToast(`Hidden for ${NOT_NOW_MIN} minutes`, () => { if (previous) state.notNow[k]=previous; else delete state.notNow[k]; save(); renderAll(); });
  }

  function activateView(view,scrollTop=true){
    const next=view==='rides'?'rides':'now';
    state.activeView=next;
    const now=$('#viewNow'),rides=$('#viewRides');
    if(now)now.hidden=next!=='now';
    if(rides)rides.hidden=next!=='rides';
    $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));
    if(scrollTop)window.scrollTo({top:0,behavior:'smooth'});
  }
  function toggleRiderSwitch(k){
    if(state.riderSwitch[k])delete state.riderSwitch[k];else state.riderSwitch[k]=true;
    save();renderAll();toast(state.riderSwitch[k]?'Rider Switch timing on.':'Rider Switch timing off.');
  }
  function decorateRideCards(){
    $$('.ride-row').forEach(row=>{
      const id=row.id||'';
      const ride=state.rides.find(r=>rideRowId(keyFor(r.name))===id);
      if(!ride)return;
      const rideKey=keyFor(ride.name),meta=metaFor(ride.name),guide=guideFor(ride.name,meta);
      const front=document.createElement('div');front.className='ride-card-face ride-card-front';
      while(row.firstChild)front.appendChild(row.firstChild);
      const actions=front.querySelector('.ride-actions');
      if(actions&&riderSwitchEligible(meta)){
        const button=document.createElement('button');
        button.type='button';button.className=`rider-switch-btn ${state.riderSwitch[rideKey]?'on':''}`;
        button.dataset.riderSwitch=rideKey;
        button.textContent=state.riderSwitch[rideKey]?'Rider Switch ON':'Rider Switch';
        actions.appendChild(button);
      }
      const hint=document.createElement('div');hint.className='tap-hint';hint.textContent='Tap card for ride guide';front.appendChild(hint);
      const back=document.createElement('div');back.className='ride-card-face ride-card-back';
      const flags=(guide.flags||[]).map(x=>`<span class="chip">${esc(x)}</span>`).join('');
      back.innerHTML=`<div class="ride-guide-top"><div><div class="eyebrow">WHAT IS IT?</div><div class="ride-guide-type">${esc(guide.type)}</div></div><div class="ride-guide-intensity">${esc(guide.intensity)}</div></div><div class="ride-guide-summary">${esc(guide.summary)}</div><div class="ride-guide-flags">${flags}</div><div class="ride-guide-foot">About ${experienceMinutes(meta)}m experience time in Dispatcher · tap again to return to live wait and controls.</div>`;
      row.append(front,back);
      row.addEventListener('click',e=>{
        if(e.target.closest('button,input,select,a,label'))return;
        row.classList.toggle('flipped');
      });
    });
  }
  function jumpToRide(k) {
    activateView('rides',false);
    state.activeFilter = 'all'; state.search = ''; $('#searchInput').value = '';
    $$('.filter').forEach(x=>x.classList.toggle('active',x.dataset.filter==='all'));
    renderWaitBoard();
    requestAnimationFrame(()=>{ const row=document.getElementById(rideRowId(k)); if (row) { row.scrollIntoView({behavior:'smooth',block:'center'}); row.classList.add('flash'); setTimeout(()=>row.classList.remove('flash'),1600); } });
  }
  function esc(s='') { return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function setStatus(kind,text) { const e=$('#liveStatus'); e.className=`status-pill ${kind==='ok'?'ok':kind==='bad'?'bad':kind==='warn'?'warn':''}`; e.querySelector('span:last-child').textContent=text; }
  function toast(msg) {
    const t=$('#toast'), text=$('#toastText'), undo=$('#toastUndo');
    text.textContent=msg; undo.hidden=true; undo.onclick=null; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2400);
  }
  function showUndoToast(msg, fn) {
    const t=$('#toast'), text=$('#toastText'), undo=$('#toastUndo');
    text.textContent=msg; undo.hidden=false; undo.onclick=()=>{ clearTimeout(toast.t); t.classList.remove('show'); fn(); };
    t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>{t.classList.remove('show'); undo.hidden=true;},4200);
  }

  function syncableSettings(){
    const {preview,previewDate,previewTime,location,locationSource,...shared}=state.settings;
    return shared;
  }
  function cloudStateData(){
    return {
      priorities:state.priorities,
      done:state.done,
      notNow:state.notNow,
      riderSwitch:state.riderSwitch,
      dynamicCommitments:state.dynamicCommitments,
      settings:syncableSettings()
    };
  }
  function cloudAlerts(){
    const now=Date.now();
    return allCommitments().filter(c=>c.hard).map(c=>{
      const target=new Date(commitmentDateTime(c).getTime()-bufferFor(c)*60000);
      return {id:c.id,name:c.name,kind:c.kind||'timed',targetAt:target.toISOString(),targetLabel:parisTime(target),displayTime:commitmentDisplayTime(c),date:c.date};
    }).filter(a=>Date.parse(a.targetAt)>now-10*60000);
  }
  function randomUrlToken(bytes=18){
    const raw=crypto.getRandomValues(new Uint8Array(bytes));
    let binary='';for(const b of raw)binary+=String.fromCharCode(b);
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function ensureSyncToken(){
    if(state.sync.token)return state.sync.token;
    state.sync.token=`d1p_${randomUrlToken()}`;
    state.sync.revision=0;state.sync.localModifiedAt=Date.now();state.sync.lastSyncedAt=0;
    persistSyncMeta();renderSyncStatus();scheduleCloudPush();
    return state.sync.token;
  }
  function syncKeyPreview(token){return token&&token.length>12?`${token.slice(0,8)}…${token.slice(-5)}`:token||'';}
  async function probeCloudBackend(){
    try{
      const response=await fetch(`${QT_PROXY_BASE}/health`,{cache:'no-store'});
      const body=response.ok?await response.json():null;
      const features=Array.isArray(body?.features)?body.features:[];
      state.cloudBackendReady=!!response.ok&&features.includes('trip-sync')&&features.includes('web-push');
    }catch{state.cloudBackendReady=false;}
    state.cloudBackendChecked=true;
    renderSyncStatus();
    return state.cloudBackendReady;
  }
  function renderSyncStatus(message=null,kind=null){
    const status=$('#syncStatus'),keyLine=$('#syncKeyLine'),key=$('#syncKeyPreview'),create=$('#createSyncBtn'),copy=$('#copySyncBtn'),unlink=$('#unlinkSyncBtn');
    if(!status)return;
    const linkBtn=$('#linkSyncBtn'),linkInput=$('#syncKeyInput');
    if(state.cloudBackendChecked&&!state.cloudBackendReady){
      status.className='sync-status warn';
      status.textContent='Cloud sync code is ready, but the Cloudflare backend upgrade still needs its one-time deployment.';
      if(create){create.hidden=false;create.disabled=true;}if(copy)copy.hidden=true;if(unlink){unlink.hidden=!state.sync.token;unlink.disabled=false;}
      if(linkBtn)linkBtn.disabled=true;if(linkInput)linkInput.disabled=true;
      renderAlertStatus();return;
    }
    if(create)create.disabled=false;if(linkBtn)linkBtn.disabled=false;if(linkInput)linkInput.disabled=false;
    const linked=!!state.sync.token;
    if(keyLine)keyLine.hidden=!linked;if(key)key.textContent=linked?syncKeyPreview(state.sync.token):'';
    if(create)create.hidden=linked;if(copy)copy.hidden=!linked;if(unlink)unlink.hidden=!linked;
    status.className=`sync-status ${kind||''}`.trim();
    if(message)status.textContent=message;
    else if(!linked)status.textContent='Not linked to Cloudflare yet.';
    else if(state.sync.lastSyncedAt)status.textContent=`Cloud linked · revision ${state.sync.revision} · last synced ${Math.max(0,Math.floor((Date.now()-state.sync.lastSyncedAt)/1000))}s ago`;
    else status.textContent='Cloud linked · waiting for first sync.';
    renderAlertStatus();
  }
  function renderAlertStatus(){
    const status=$('#alertStatus'),enable=$('#enableAlertsBtn'),test=$('#testAlertBtn');if(!status)return;
    if(state.cloudBackendChecked&&!state.cloudBackendReady){status.textContent='Trip alerts are staged, but the Cloudflare push backend is not active yet.';if(enable){enable.textContent='Enable trip alerts';enable.disabled=true;}if(test)test.hidden=true;return;}
    const permission=typeof Notification==='undefined'?'unsupported':Notification.permission;
    if(state.sync.pushEnabled&&permission==='granted'){
      status.textContent='Notifications enabled on this copy.';if(enable){enable.textContent='Alerts enabled';enable.disabled=true;}if(test)test.hidden=false;
    }else{
      status.textContent=permission==='denied'?'Notifications are blocked in iOS settings.':permission==='unsupported'?'Notifications are not supported in this browser.':'Notifications are off.';
      if(enable){enable.textContent='Enable trip alerts';enable.disabled=permission==='denied'||permission==='unsupported';}if(test)test.hidden=true;
    }
  }
  function applyCloudData(data){
    if(!data||typeof data!=='object')return;
    state.syncApplying=true;
    try{
      if(data.priorities&&typeof data.priorities==='object')state.priorities=data.priorities;
      if(data.done&&typeof data.done==='object')state.done=data.done;
      if(data.notNow&&typeof data.notNow==='object')state.notNow=data.notNow;
      if(data.riderSwitch&&typeof data.riderSwitch==='object')state.riderSwitch=data.riderSwitch;
      if(Array.isArray(data.dynamicCommitments))state.dynamicCommitments=data.dynamicCommitments;
      if(data.settings&&typeof data.settings==='object')state.settings={...state.settings,...data.settings};
      save({remote:true});
      renderAll();
    }finally{state.syncApplying=false;}
  }
  function scheduleCloudPush(){
    if(!state.sync?.token||state.syncApplying)return;
    clearTimeout(state.syncPushTimer);
    state.syncPushTimer=setTimeout(()=>cloudPut().catch(()=>{}),650);
  }
  async function cloudPut(retry=true){
    if(!state.sync.token||state.syncBusy)return false;
    state.syncBusy=true;
    const payloadModified=Number(state.sync.localModifiedAt||Date.now());
    const baseRevision=Number(state.sync.revision||0);
    try{
      const response=await fetch(`${QT_PROXY_BASE}/sync/${encodeURIComponent(state.sync.token)}`,{
        method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({baseRevision,updatedAt:payloadModified,data:cloudStateData(),alerts:cloudAlerts()})
      });
      const body=await response.json().catch(()=>({}));
      if(response.status===409&&retry){
        state.sync.revision=Number(body.revision||0);
        const remoteUpdated=Number(body.updatedAt||0);
        if(body.data&&remoteUpdated>Number(state.sync.localModifiedAt||0)){
          applyCloudData(body.data);state.sync.localModifiedAt=remoteUpdated;state.sync.lastSyncedAt=remoteUpdated;persistSyncMeta();renderSyncStatus('Updated from the newer cloud copy.','ok');return true;
        }
        persistSyncMeta();
        state.syncBusy=false;
        return cloudPut(false);
      }
      if(!response.ok)throw new Error(body.error||`Cloud sync ${response.status}`);
      state.sync.revision=Number(body.revision||baseRevision+1);
      state.sync.lastSyncedAt=payloadModified;
      persistSyncMeta();renderSyncStatus(null,'ok');
      return true;
    }catch(e){renderSyncStatus(`Cloud unavailable · local copy is safe (${e.message||e}).`,'warn');return false;}
    finally{
      state.syncBusy=false;
      if(state.sync.token&&Number(state.sync.localModifiedAt||0)>Number(state.sync.lastSyncedAt||0))scheduleCloudPush();
    }
  }
  async function cloudPull({forceRemote=false}={}){
    if(!state.sync.token||state.syncBusy)return false;
    state.syncBusy=true;
    try{
      const response=await fetch(`${QT_PROXY_BASE}/sync/${encodeURIComponent(state.sync.token)}`,{cache:'no-store'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||`Cloud sync ${response.status}`);
      const remoteRevision=Number(body.revision||0),remoteUpdated=Number(body.updatedAt||0);
      if(body.data&&(forceRemote||remoteRevision>Number(state.sync.revision||0))){
        if(forceRemote||remoteUpdated>=Number(state.sync.localModifiedAt||0)){
          applyCloudData(body.data);state.sync.localModifiedAt=remoteUpdated;state.sync.lastSyncedAt=remoteUpdated;
        }
        state.sync.revision=remoteRevision;persistSyncMeta();
      }else if(!body.data&&forceRemote){
        state.sync.revision=remoteRevision;state.sync.localModifiedAt=Date.now();persistSyncMeta();
      }
      renderSyncStatus(null,'ok');
      return {body,needsPush:!body.data||Number(state.sync.localModifiedAt||0)>Number(state.sync.lastSyncedAt||0)};
    }catch(e){renderSyncStatus(`Cloud unavailable · local copy is safe (${e.message||e}).`,'warn');return false;}
    finally{state.syncBusy=false;}
  }
  async function createCloudSync(){
    if(!state.cloudBackendReady)return toast('Cloud sync backend activation is still pending.');
    ensureSyncToken();
    state.sync.localModifiedAt=Date.now();persistSyncMeta();
    const ok=await cloudPut();if(ok){renderSyncStatus('Cloud sync started. Copy the private key into your other copy of Dispatcher.','ok');toast('Cloud sync started.');}
    return ok;
  }
  async function linkCloudSync(){
    if(!state.cloudBackendReady)return toast('Cloud sync backend activation is still pending.');
    const input=$('#syncKeyInput'),token=(input?.value||'').trim();
    if(!SYNC_TOKEN_RE.test(token))return toast('That does not look like a Dispatcher sync key.');
    state.sync.token=token;state.sync.revision=0;state.sync.localModifiedAt=0;state.sync.lastSyncedAt=0;state.sync.pushEnabled=false;persistSyncMeta();renderSyncStatus('Checking cloud state…');
    const pulled=await cloudPull({forceRemote:true});
    if(pulled&&pulled.needsPush){state.sync.localModifiedAt=Date.now();persistSyncMeta();await cloudPut();}
    if(pulled){if(input)input.value='';toast('This copy is linked.');}
  }
  async function copySyncKey(){
    if(!state.sync.token)return;
    try{await navigator.clipboard.writeText(state.sync.token);toast('Private sync key copied.');}
    catch{prompt('Copy this private sync key:',state.sync.token);}
  }
  async function unlinkCloudSync(){
    const token=state.sync.token,deviceId=state.sync.deviceId;
    try{
      const reg=await navigator.serviceWorker?.ready;
      const subscription=await reg?.pushManager?.getSubscription();
      if(subscription)await subscription.unsubscribe();
      if(token&&deviceId)await fetch(`${QT_PROXY_BASE}/push/unregister/${encodeURIComponent(token)}/${encodeURIComponent(deviceId)}`,{method:'POST'}).catch(()=>{});
      reg?.active?.postMessage({type:'CLEAR_PUSH_CONTEXT'});
    }catch{}
    clearTimeout(state.syncPushTimer);
    state.sync={token:'',revision:0,localModifiedAt:0,lastSyncedAt:0,pushEnabled:false,deviceId:''};
    localStorage.removeItem(SYNC_TOKEN_KEY);localStorage.removeItem(PUSH_DEVICE_KEY);localStorage.removeItem(SYNC_META_KEY);
    renderSyncStatus();toast('This copy is unlinked. Local trip data was kept.');
  }
  function base64UrlToBytes(value){
    const padding='='.repeat((4-value.length%4)%4),base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(base64),out=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;
  }
  function standalonePwa(){return window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;}
  async function enableTripAlerts(){
    if(!state.cloudBackendReady)return toast('Trip-alert backend activation is still pending.');
    if(!standalonePwa())return toast('Open the installed Home Screen app to enable iPhone push alerts.');
    if(!('serviceWorker'in navigator)||!('PushManager'in window))return toast('This browser does not support web push.');
    if(!('Notification'in window))return toast('Notifications are not available here.');
    ensureSyncToken();
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){renderAlertStatus();return toast('Notification permission was not granted.');}
    try{
      const reg=await navigator.serviceWorker.register('sw.js');
      await navigator.serviceWorker.ready;
      const keyResponse=await fetch(`${QT_PROXY_BASE}/push/vapid`,{cache:'no-store'});
      if(!keyResponse.ok)throw new Error('Cloud push service is not ready');
      const {publicKey}=await keyResponse.json();
      let subscription=await reg.pushManager.getSubscription();
      if(!subscription)subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToBytes(publicKey)});
      if(!state.sync.deviceId)state.sync.deviceId=`dev_${randomUrlToken(12)}`;
      const response=await fetch(`${QT_PROXY_BASE}/push/register/${encodeURIComponent(state.sync.token)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({deviceId:state.sync.deviceId,subscription:subscription.toJSON()})
      });
      if(!response.ok)throw new Error('Could not register this phone');
      state.sync.pushEnabled=true;persistSyncMeta();
      reg.active?.postMessage({type:'SET_PUSH_CONTEXT',context:{syncToken:state.sync.token,deviceId:state.sync.deviceId}});
      scheduleCloudPush();renderAlertStatus();toast('Trip alerts enabled.');
    }catch(e){state.sync.pushEnabled=false;persistSyncMeta();renderAlertStatus();toast(e.message||'Could not enable trip alerts.');}
  }
  async function testTripAlert(){
    if(!state.cloudBackendReady)return toast('Trip-alert backend activation is still pending.');
    if(!state.sync.token||!state.sync.deviceId)return toast('Enable trip alerts first.');
    try{
      const response=await fetch(`${QT_PROXY_BASE}/push/test/${encodeURIComponent(state.sync.token)}/${encodeURIComponent(state.sync.deviceId)}`,{method:'POST'});
      if(!response.ok)throw new Error('Test alert could not be sent');
      toast('Test alert sent.');
    }catch(e){toast(e.message||'Test alert failed.');}
  }
  async function startCloudSyncLoop(){
    renderSyncStatus();
    await probeCloudBackend();
    if(state.cloudBackendReady&&state.sync.token){cloudPull().then(result=>{if(result?.needsPush)scheduleCloudPush();});}
    setInterval(()=>{if(state.cloudBackendReady&&state.sync.token&&document.visibilityState==='visible')cloudPull().then(result=>{if(result?.needsPush)scheduleCloudPush();});},CLOUD_SYNC_POLL_MS);
  }

  function syncControls() {
    $('#modeSelect').value = state.settings.mode;
    $('#singleRiderToggle').checked = !!state.settings.singleRider;
    $('#parkHopToggle').checked = !!state.settings.parkHop;
    $('#softPlansToggle').checked = !!state.settings.softPlans;
    const pr=$('#precisionRoutingToggle');if(pr){pr.checked=!!state.settings.precisionRouting;pr.disabled=sessionMode()==='LIVE';}
    $('#previewToggle').checked = !!state.settings.preview;
    $('#previewDate').value = state.settings.previewDate;
    $('#previewTime').value = state.settings.previewTime;
    $('#mealBuffer').value = state.settings.mealBuffer;
    $('#trainBuffer').value = state.settings.trainBuffer;
    $('#walkSpeed').value = state.settings.walkSpeed;
    $('#routeFactor').value = state.settings.routeFactor;
    if (!gpsNearDLP()) $('#locationSelect').value = state.settings.location;
  }

  function initLocationSelect() {
    const s = $('#locationSelect');
    s.innerHTML = Object.keys(AREAS).map(a=>`<option value="${esc(a)}">${esc(a)}</option>`).join('');
    s.value = state.settings.location;
  }

  function useGPS() {
    if (!navigator.geolocation) return toast('This browser does not expose location.');
    if(state.gpsWatchId!=null){navigator.geolocation.clearWatch(state.gpsWatchId);state.gpsWatchId=null;}
    $('#gpsBtn').disabled=true;$('#gpsBtn').textContent='Locating...';let first=true;
    state.gpsWatchId=navigator.geolocation.watchPosition(pos=>{
      const accuracy=Number(pos.coords.accuracy||999),next={lat:pos.coords.latitude,lon:pos.coords.longitude,park:null};
      if(!first&&accuracy>80&&Number(state.gpsAccuracy||999)<40)return;
      const moved=state.gps?haversine(state.gps,next):Infinity,now=Date.now();state.gps=next;state.gpsAccuracy=accuracy;
      const near=nearestArea(state.gps),inPark=gpsNearDLP();$('#gpsBtn').disabled=false;
      if(inPark){$('#gpsBtn').textContent=`GPS live · ±${Math.round(accuracy)}m`;if(first)toast(`LIVE GPS tracking near ${near.name}`);}
      else{$('#gpsBtn').textContent='GPS: outside DLP';if(first)toast(`GPS is ${(gpsDistanceFromDLP()/1000).toFixed(1)} km from DLP. Staying in TEST mode.`);navigator.geolocation.clearWatch(state.gpsWatchId);state.gpsWatchId=null;}
      if(first||moved>=8||now-state.gpsLastRenderAt>=15000){state.gpsLastRenderAt=now;renderAll();}first=false;
    },err=>{$('#gpsBtn').disabled=false;$('#gpsBtn').textContent='Use my location';toast(err.message||'Location permission failed.');if(state.gpsWatchId!=null){navigator.geolocation.clearWatch(state.gpsWatchId);state.gpsWatchId=null;}},{enableHighAccuracy:true,timeout:12000,maximumAge:5000});
  }

  function feedDisagreementSummary(d) {
    if (!d) return 'unknown disagreement';
    if (d.kind === 'status') return `${d.name}: status, ThemeParks.wiki ${d.primary} vs Queue-Times.com ${d.secondary}`;
    if (d.kind === 'wait') return `${d.name}: wait, ThemeParks.wiki ${d.primary}m vs Queue-Times.com ${d.secondary}m (${d.diff}m difference)`;
    return `${d.name || 'unknown attraction'}: ${d.kind || 'unknown'} disagreement`;
  }

  function priorityStateSummary(level) {
    const keys=Object.keys(state.priorities).filter(k=>state.priorities[k]===level);
    if(!keys.length)return 'none';
    return keys.map(k=>state.rides.find(r=>keyFor(r.name)===k)?.name||k).join(', ');
  }

  function priorityDiagnostic(k,now,commitment) {
    const priority=state.priorities[k]||'neutral';
    const tag=priority.toUpperCase();
    const ride=state.rides.find(r=>keyFor(r.name)===k);
    const name=ride?.name||k;
    if(!ride)return `${name}: ${tag}, excluded: not in current live feed`;
    if(priority==='skip')return `${name}: SKIP, excluded by user`;
    if(state.done[k])return `${name}: ${tag}, excluded: DONE`;
    if(isDeferred(k))return `${name}: ${tag}, excluded: snoozed ${deferredRemaining(k)}m`;
    if(ride.status!=='OPERATING')return `${name}: ${tag}, excluded: ${prettyStatus(ride.status)}`;
    if(ride.wait==null)return `${name}: ${tag}, excluded: wait unavailable`;
    const freshness=attractionFreshness(ride);
    if(freshness.level==='stale'||freshness.level==='unknown')return `${name}: ${tag}, excluded: ${freshness.level} data${freshness.mins==null?'':` ${freshness.mins}m old`}`;
    if(ride.feedDisagreement?.kind==='status')return `${name}: ${tag}, excluded: feeds disagree on operating status`;
    const fromPark=currentPark();
    const parkHop=isParkHop(fromPark,ride.park);
    if(parkHop&&!state.settings.parkHop)return `${name}: ${tag}, excluded: park hop disabled`;
    const result=evaluateRide(ride,now,commitment);
    if(result){
      const anchor=result.target?`, anchor consumption ${result.anchorConsumption}m, slack ${result.anchorSlack}m${result.tightFit?', TIGHT FIT':''}`:'';
      return `${name}: ${tag}, eligible, score ${result.score.toFixed(1)}, ${result.chosenWait}m ${result.queueLabel}${anchor}`;
    }
    if(commitment){
      const meta=metaFor(ride.name), from=currentPoint(), to=pointForRide(ride,'entrance'), rideExit=pointForRide(ride,'exit');
      const walkTo=walkMinutes(from,to)+parkHopPenalty(fromPark,ride.park);
      let chosenWait=ride.wait;
      if(state.settings.singleRider&&Number.isFinite(ride.singleRiderWait)&&ride.singleRiderWait<chosenWait)chosenWait=ride.singleRiderWait;
      const dwellMinutes=experienceMinutesForRide(ride,meta), cPoint=pointForCommitment(commitment);
      const safeAt=new Date(commitmentDateTime(commitment).getTime()-bufferFor(commitment)*60000);
      const minutesToTarget=Math.floor((safeAt-now)/60000);
      const walkOnward=walkMinutes(rideExit,cPoint)+parkHopPenalty(ride.park,cPoint?.park);
      const totalNeeded=walkTo+chosenWait+dwellMinutes+walkOnward;
      const slack=minutesToTarget-totalNeeded, required=commitment.hard?HARD_ANCHOR_MIN_SLACK:0;
      return `${name}: ${tag}, excluded: anchor slack ${slack}m < ${required}m minimum (${totalNeeded}m needed)`;
    }
    return `${name}: ${tag}, excluded by current rules`;
  }

  function legacyPointForRide(ride) {
    if (Number.isFinite(ride.lat) && Number.isFinite(ride.lon)) return { lat: ride.lat, lon: ride.lon, park: ride.park };
    const m = metaFor(ride.name);
    return areaPoint(ride.area) || areaPoint(m.area) || (ride.park === 'Disney Adventure World' ? areaPoint('Disney Adventure World entrance') : areaPoint('Disneyland Park entrance'));
  }
  function endpointEvidence(point) {
    if (!point) return 'unmapped';
    return `${point.confidence || 'unknown'} (${point.source || 'unknown'})`;
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
      `to ride precision ${x.walkTo}m vs legacy ${toLegacy}m`,
      `entrance ${endpointEvidence(locationData?.entrance)}`,
      `exit ${endpointEvidence(locationData?.exit)}`
    ];
    if (commitment) {
      const precisionAnchor = pointForCommitment(commitment);
      const legacyAnchor = areaPoint(commitment.area);
      const legacyOnward = legacyWalkMinutes(legacyRide,legacyAnchor) + parkHopPenalty(x.ride.park,legacyAnchor?.park);
      const anchorEvidence = commitment.kind==='premier' ? routingAttraction(commitment.rideName)?.entrance : state.routingLocations?.commitments?.[commitment.id]?.entrance;
      bits.push(`onward precision ${x.walkOnward}m vs legacy ${legacyOnward}m`);
      bits.push(`anchor entrance ${endpointEvidence(anchorEvidence)}`);
      const entrySnap = graphNearest(precisionEntry), exitSnap = graphNearest(precisionExit), anchorSnap = graphNearest(precisionAnchor);
      if (entrySnap) bits.push(`entry snap ${Math.round(entrySnap.d)}m`);
      if (exitSnap) bits.push(`exit snap ${Math.round(exitSnap.d)}m`);
      if (anchorSnap) bits.push(`anchor snap ${Math.round(anchorSnap.d)}m`);
    }
    return `${x.ride.name}: ${bits.join('; ')}`;
  }

  function packetRecommendation(x,rank) {
    const anchor=x.target?`, ${x.walkOnward}m onward, ${x.anchorConsumption}m anchor consumption, ${x.anchorSlack}m anchor slack${x.tightFit?', TIGHT FIT':''}`:'';
    return `${rank}) ${x.ride.name} ${x.chosenWait}m ${x.queueLabel}, ${x.walkTo}m walk, ${x.meta.label}, ${x.dwellMinutes}m experience, ${x.commitmentMinutes}m attraction commitment${anchor}, score ${x.score.toFixed(1)}, data ${x.rideFresh.level}${x.rideFresh.mins==null?'':` ${x.rideFresh.mins}m old`}; reason: ${recommendationReason(x)}`;
  }

  async function copyPacket() {
    const now = plannerNow(), c = nextCommitment(now), allRecs = allRecommendations(), recs = allRecs.slice(0,3), nextRecs = allRecs.slice(3,6);
    const live = sessionMode() === 'LIVE';
    const near = state.gps ? nearestArea(state.gps) : null;
    const location = live ? `GPS near ${near.name}` : state.settings.location;
    const doneKeys = Object.keys(state.done).filter(k=>state.done[k]);
    const doneNames = doneKeys.map(k => state.rides.find(r => keyFor(r.name) === k)?.name || k);
    const fresh = feedFreshness();
    let sessionDetail;
    if (live) sessionDetail = `GPS confirmed within Disneyland Paris; accuracy about ${Math.round(state.gpsAccuracy || 0)}m`;
    else if (state.settings.preview) sessionDetail = 'TEST MODE; preview simulation; physical park presence is not used';
    else if (state.gps) sessionDetail = `NOT PHYSICALLY IN PARK CONFIRMED; GPS ${(gpsDistanceFromDLP()/1000).toFixed(1)} km from DLP`;
    else sessionDetail = 'TEST MODE; physical park presence unconfirmed because there is no in-resort GPS fix';

    let commitmentLine = 'Next timed point: none active';
    let safeMinutesLine = 'Safe time remaining: not constrained by a timed point';
    if (c) {
      const safeAt = new Date(commitmentDateTime(c).getTime()-bufferFor(c)*60000);
      const safeMins = Math.max(0, Math.floor((safeAt-now)/60000));
      const anchorType=c.hard?'HARD':'SOFT', appliedBuffer=bufferFor(c), residual=c.hard?`; minimum residual slack ${HARD_ANCHOR_MIN_SLACK}m`:'';
      const displayTime=commitmentDisplayTime(c), timing=c.kind==='premier'?`window ${displayTime}; target arrival ${parisTime(safeAt)}`:`at ${displayTime}; target arrival ${parisTime(safeAt)}`;
      commitmentLine = `Next timed point: ${c.name} ${timing}; area ${c.area}; ${anchorType}; buffer ${appliedBuffer}m${residual}`;
      safeMinutesLine = `Safe time remaining: ${safeMins} minutes until target arrival`;
    }

    const lines = [
      'DLP DISPATCHER STATUS v0.8.2',
      `Session: ${live ? 'LIVE' : 'TEST'}`,
      `Session detail: ${sessionDetail}`,
      `Paris time: ${parisDateKey(now)} ${parisTime(now)}${state.settings.preview?' (preview clock)':''}`,
      `Routing location: ${location}`,
      `Location source: ${locationSourceLabel()}`,
      `Mode: ${state.settings.mode}; Single Rider: ${state.settings.singleRider?'yes':'no'}; Park hopping: ${state.settings.parkHop?'consider':'stay in current park'}`,
      `Current park for routing: ${currentPark() || 'unknown'}`,
      `Routing model: ${precisionRoutingEnabled()?'precision stroller graph (TEST), exact entrance/exit where confidence allows':state.settings.precisionRouting&&!state.routingReady?`legacy estimate; precision data unavailable${state.routingError?` (${state.routingError})`:''}`:'legacy straight-line estimate'}`,
      `Primary live source: ${state.source || 'none'}${state.sourceUpdated?`; updated ${state.sourceUpdated.toISOString()}`:''}; freshness ${fresh.level}${fresh.mins==null?'':` (${fresh.mins}m old)`}`,
      `Secondary cross-check: ${state.secondarySource || 'unavailable'}; material disagreements ${state.feedDisagreements.length}${state.secondaryError?`; diagnostic ${state.secondaryError}`:''}`,
      `Feed disagreement detail: ${state.feedDisagreements.length ? state.feedDisagreements.map(feedDisagreementSummary).join(' | ') : 'none'}`,
      commitmentLine,
      safeMinutesLine,
      `Timed items: ${state.dynamicCommitments.length ? state.dynamicCommitments.map(x=>`${x.name} (${fmtDate(x.date)} ${commitmentDisplayTime(x)})`).join(' | ') : 'none'}`,
      `Rider Switch: ${Object.keys(state.riderSwitch).filter(k=>state.riderSwitch[k]).map(k=>state.rides.find(r=>keyFor(r.name)===k)?.name||k).join(', ')||'none'}`,
      `Top engine picks: ${recs.map((x,i)=>packetRecommendation(x,i+1)).join(' | ') || 'none'}`,
      ...(!live ? [
        `Routing diagnostics: ${precisionRoutingEnabled() ? (recs.map(x=>routingDiagnostic(x,c)).filter(Boolean).join(' | ') || 'no eligible top candidates') : 'precision routing disabled or unavailable'}`,
        `Priority state: MUST: ${priorityStateSummary('must')} | WANT: ${priorityStateSummary('want')} | SKIP: ${priorityStateSummary('skip')}`,
        `Priority diagnostics: ${Object.keys(state.priorities).filter(k=>['must','want','skip'].includes(state.priorities[k])).map(k=>priorityDiagnostic(k,now,c)).join(' | ') || 'none'}`,
        `Next eligible candidates: ${nextRecs.map((x,i)=>packetRecommendation(x,i+4)).join(' | ') || 'none'}`
      ] : []),
      `Done this trip: ${doneNames.length ? doneNames.join(', ') : 'none marked'}`,
      `Deferred/not now: ${Object.keys(state.notNow).filter(isDeferred).map(k=>{const name=state.rides.find(r=>keyFor(r.name)===k)?.name||k;return `${name} (${deferredRemaining(k)}m remaining)`;}).join(', ')||'none'}`,
      live
        ? 'Please re-check current public live data and tell us the best next move, prioritising enjoyment and fixed bookings over raw ride count.'
        : 'TEST PACKET ONLY. Do not treat us as physically at Disneyland Paris. Re-check current public live data only to evaluate whether the dispatcher logic and rankings look sensible.'
    ];
    try { await navigator.clipboard.writeText(lines.join('\n')); toast('v0.8.2 status packet copied. Paste it into ChatGPT.'); }
    catch { prompt('Copy this status packet:', lines.join('\n')); }
  }

  function bind() {
    $('#refreshBtn').addEventListener('click',refreshLive);
    $('#gpsBtn').addEventListener('click',useGPS);
    $('#copyBtn').addEventListener('click',copyPacket);
    $$('[data-view]').forEach(b=>b.addEventListener('click',()=>activateView(b.dataset.view)));
    $('#locationSelect').addEventListener('change',e=>{ state.gps=null; state.gpsAccuracy=null; state.settings.location=e.target.value; state.settings.locationSource='manual'; $('#gpsBtn').textContent='Use my location'; save(); renderAll(); });
    $('#modeSelect').addEventListener('change',e=>{state.settings.mode=e.target.value;save();renderAll();});
    $('#singleRiderToggle').addEventListener('change',e=>{state.settings.singleRider=e.target.checked;save();renderAll();});
    $('#parkHopToggle').addEventListener('change',e=>{state.settings.parkHop=e.target.checked;save();renderAll();});
    $('#softPlansToggle').addEventListener('change',e=>{state.settings.softPlans=e.target.checked;save();renderAll();});
    $('#timedType').addEventListener('change',updateTimedForm);
    $('#addTimedItem').addEventListener('click',addTimedItem);
    $('#precisionRoutingToggle').addEventListener('change',e=>{state.settings.precisionRouting=e.target.checked;save();renderAll();});
    $('#previewToggle').addEventListener('change',e=>{state.settings.preview=e.target.checked;save();renderAll();});
    $('#previewDate').addEventListener('change',e=>{state.settings.previewDate=e.target.value;save();renderAll();});
    $('#previewTime').addEventListener('change',e=>{state.settings.previewTime=e.target.value;save();renderAll();});
    $('#searchInput').addEventListener('input',e=>{state.search=e.target.value;renderWaitBoard();});
    $('#clearSearch').addEventListener('click',()=>{state.search='';$('#searchInput').value='';renderWaitBoard();$('#searchInput').focus();});
    $$('.filter').forEach(b=>b.addEventListener('click',()=>{state.activeFilter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('active',x===b));renderWaitBoard();}));
    for (const [id,key] of [['mealBuffer','mealBuffer'],['trainBuffer','trainBuffer'],['walkSpeed','walkSpeed'],['routeFactor','routeFactor']]) {
      $(`#${id}`).addEventListener('change',e=>{state.settings[key]=Number(e.target.value);save();renderAll();});
    }
    $('#resetProgress').addEventListener('click',()=>{state.done={};save();renderAll();toast('DONE marks reset.');});
    $('#resetPriorities').addEventListener('click',()=>{state.priorities={};save();renderAll();toast('Priorities reset.');});
    $('#resetRiderSwitch').addEventListener('click',()=>{state.riderSwitch={};save();renderAll();toast('Rider Switch selections reset.');});
    $('#createSyncBtn').addEventListener('click',createCloudSync);
    $('#linkSyncBtn').addEventListener('click',linkCloudSync);
    $('#copySyncBtn').addEventListener('click',copySyncKey);
    $('#unlinkSyncBtn').addEventListener('click',unlinkCloudSync);
    $('#enableAlertsBtn').addEventListener('click',enableTripAlerts);
    $('#testAlertBtn').addEventListener('click',testTripAlert);
  }

  function refreshOnResume(){if(document.visibilityState!=='visible')return;const age=state.lastFetchedAt?(Date.now()-state.lastFetchedAt.getTime()):Infinity;if(age>60000)refreshLive();else{renderSourceAge();renderWaitBoard();}}
  initLocationSelect();
  const timedArea=$('#timedOtherArea');if(timedArea)timedArea.innerHTML=Object.entries(AREAS).filter(([,p])=>isThemePark(p.park)).map(([name])=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
  const timedDate=$('#timedDate');if(timedDate)timedDate.value=state.settings.previewDate||'2026-10-30';
  bind(); updateTimedForm(); renderAll(); loadRoutingData(); refreshLive(); startCloudSyncLoop();
  if(state.sync.token&&state.sync.deviceId&&'serviceWorker'in navigator){navigator.serviceWorker.ready.then(reg=>reg.active?.postMessage({type:'SET_PUSH_CONTEXT',context:{syncToken:state.sync.token,deviceId:state.sync.deviceId}})).catch(()=>{});}
  setInterval(refreshLive, REFRESH_MS);
  setInterval(()=>{renderHero();renderPreviewSummary();renderSourceAge();renderWaitBoard();},60000);
  document.addEventListener('visibilitychange',refreshOnResume);
  window.addEventListener('pageshow',refreshOnResume);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
