// =====================================================================
//  POXIT PRICING  (file: PoxitPricing.gs)
//  GENERATED from the quote tool (index.html) by tools/build-pricing.js.
//  Do not edit by hand: paste the new version whenever the tool's pricing changes.
//  Pricing version: ce7b072e064b
// =====================================================================
var PXP = (function () {
  // No screen on the server: anything that would touch it is never called here
  var window = {}, document = undefined, navigator = {}, alert = function () {};
  var localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  var measureShapes = [];
  var showPricingBreakdown = false;
const PRICE = {
  epoxy: { 'Flake Internal':90, 'Flake External':110, 'Quartz Internal':90, 'Metallic Internal':140, 'Solid Colour — Full System':85, 'Solid Colour — No Topcoat':65 },
  flakeUp: { 'Standard':0, 'Marble Tone':5, 'Stone Grip':5, 'Natural Stone':10, 'Classic XL':8, 'Special Blend':12 },
  conc: { 'Hard':0, 'Medium':0, 'Soft':20 },
  coat: { 'None':0, 'Single Paint':10, 'Multi-Paint':20, 'Epoxy Removal':40, 'Poxit Overlay':0 },
  addons: { nonslip:10, mvb:20, xtopcoat:15, turnup:30, silicone:18, coving:50, border:35 },
  regrout: {
    porcelain: { overtop:20, grindout:65 },
    stone: { overtop:25, grindout:85 }
  },
  fastcure: { '1':20, '2':40 },
  logo: { '150':'Over-Flake Small — $150', '250':'Over-Flake Medium — $250', '200':'Flat/Dead-Flat Small — $200', '350':'Flat/Dead-Flat Medium — $350' },
  stencil: { '25':'Easy — $25/m²', '40':'Medium — $40/m²', '60':'Hard — $60/m²', '85':'Very Hard — $85/m²' },
  tintedPrep: { 'Pressure Wash':30, 'Grind Prep':60 },
  seal: { 'Same-Day Sealer':20, 'Premium Next-Day Sealer':35, 'Essential Seal':20, 'Premium Matte':30, 'Premium Gloss':35, 'Elite Matte':40, 'Elite Gloss':45 },
  sealMin: { 'Same-Day Sealer':200, 'Premium Next-Day Sealer':300, 'Essential Seal':200, 'Premium Matte':250, 'Premium Gloss':280, 'Elite Matte':300, 'Elite Gloss':350 },
  sealDesc: { 'Same-Day Sealer':'Clean and seal, finished the same day', 'Premium Next-Day Sealer':'Premium sealer, final coat the next day for a tougher, longer lasting finish', 'Essential Seal':'Entry · damp-tolerant penetrating · satin', 'Premium Matte':'Solvent acrylic · natural/low sheen', 'Premium Gloss':'Solvent wet-look enhancer', 'Elite Matte':'Semi-penetrating · tough · longest matte life', 'Elite Gloss':'2-pack UV gloss · max durability' },
  coatingMinJob: 1800, coatingMinArea: 20,
  suburbKm: {
    'Upper Coomera':0, 'Oxenford':2.5, 'Coomera':4, 'Maudsland':5.2, 'Helensvale':5.5,
    'Wongawallan':5.6, 'Hope Island':6, 'Pacific Pines':6, 'Pimpama':6.3, 'Willow Vale':6.6,
    'Gaven':7.5, 'Guanaba':8.3, 'Coombabah':8.5, 'Arundel':9.5, 'Paradise Point':9.6,
    'Mount Nathan':10, 'Norwell':10.1, 'Runaway Bay':10.4, 'Hollywell':10.4, 'Ormeau Hills':10.5,
    'Clagiraba':10.7, 'Parkwood':11.3, 'Jacobs Well':12.1, 'Ormeau':12.3, 'Biggera Waters':12.5,
    'Molendinar':13.4, 'Labrador':13.6, 'Nerang':13.9, 'Highland Park':14.4, 'Southport':14.6,
    'Yatala':14.9, 'Tamborine Mountain':15, 'Ashmore':15.7, 'Stapylton':15.8, 'Gilston':16.4,
    'Benowa':16.9, 'Main Beach':17.2, 'Carrara':17.3, 'Bundall':18.5, 'Advancetown':18.6,
    'Surfers Paradise':19.5, 'Worongary':19.5, 'Merrimac':20.5, 'Canungra':20.8, 'Tallai':21.1,
    'Clear Island Waters':21.2, 'Broadbeach':21.8, 'Mermaid Waters':22.5, 'Mermaid Beach':23.3,
    'Robina':23.8, 'Mudgeeraba':24.1, 'Nobby Beach':24.7, 'Varsity Lakes':25.5, 'Miami':25.9,
    'Reedy Creek':27.4, 'Bonogin':27.7, 'Burleigh Waters':28, 'Burleigh Heads':28.5,
    'Tallebudgera':30.5, 'Elanora':31.1, 'Palm Beach':31.8, 'Tallebudgera Valley':32.2,
    'Currumbin Waters':33.8, 'Currumbin':34.2, 'Tugun':36.4, 'Currumbin Valley':37.6,
    'Bilinga':38.3, 'Kirra':39.5, 'Coolangatta':40.4, 'Tweed Heads':41.3
  },
  travelFreeKm: 25, travelRate: 1.75,
  gs: { 'Premium Grind & Seal':85, 'Elite Grind & Seal':90 },
  // Matte topcoat for epoxy: matting agent added to the Armourthane topcoat, priced per m² from the kit cost
  matte: { kitCost:0, kitM2:100, markup:2 },
  gsMin: { 'Premium Grind & Seal':450, 'Elite Grind & Seal':450 },
  gsDesc: { 'Premium Grind & Seal':'Grind prep + Premium matte seal · complete finish', 'Elite Grind & Seal':'Grind prep + Elite matte seal · complete finish' },
  aqua: 20,
  grindType: { 'Light Surface Prep':40, 'Medium Grind':45, 'Heavy Grind/Levelling':65 },
  grindMvb: 20, trip: 80, lip: 60,
  polished: 120,
  joint: 40, routing: 8, softcut: 12,
  silJoint: 8, polyJoint: 18,
  crackRate: 40, crackMin: 120,
  spall: { small:35, med:55, large:90, area:110 },
  // Cementitious spalling: Large = 70% of the epoxy Large rate ($90), rounded to the nearest $5
  spallCem: { small:25, med:40, large:65 },
  // Commercial & Chemical Resistant Systems (ex GST). mat = internal material cost, never printed.
  comm: {
    'Hychem Premium': { floor:120, wall:100, coving:80, mat:{ floor:27, wall:25, coving:8 } },
    'Sika Standard':  { floor:75,  wall:50,  coving:80, mat:{ floor:0,  wall:0,  coving:0 } }
  },
  commJoint: { 'Hyflex NS':35, 'Hyflex FC':25 },
  commRouting: 8,
  demo: { carpet:15, laminate:28, vinyl:40, tile:45, tileMosaic:60, cabinetry:60 },
  kitchenStrip: [ {max:6, price:1200}, {max:10, price:2800}, {max:Infinity, price:4800} ],
  pwUpsell: {
    single: { '2':400, '3':480, '4':560, '5':650 },
    double: { '2':480, '3':570, '4':700, '5':820 }
  },
  pwUpsellMods: { diffAccess:120 },
  roofWash: {
    single: { '2':700, '3':850, '4':1000, '5':1200 },
    double: { '2':850, '3':1000, '4':1150, '5':1350 }
  },
  rampMortarBucketKg: 10, rampMortarBucketCost: 48.74, rampCoverage: 1.4,
  rampEpoxyBatchKg: 22.2, rampEpoxyBatchCost: 55, rampEpoxyCoverage: 1.8, rampEpoxyMultiplier: 2.2,
  coreDrill: { '25mm (Weep Hole)': 220, 'Up to 75mm': 250, 'Up to 102mm': 300, 'Up to 152mm': 380 },
  coreDrillPvc: 45, coreDrillSilicone: 25,
  care: { 'Level 2 Refresh Coat': {rate:20,min:500}, 'Level 3 Full Rejuvenation': {rate:32,min:900}, 'Level 3 + Reflake': {rate:44,min:900} },
  careNonslip: 10,
  shine: { 'Standard — Clean, Apply & Light Buff':15, 'Premium — Clean, Apply & Full Machine Post-Buff':20 },
  cancer: { rate:1800, min:450, rebar:150 },
  skim: 20, skimMin: 400,
  pw: { 'Basic':5, 'Standard':8, 'Heavy':15 },
  pwDesc: { 'Basic':'Plain water, no product', 'Standard':'Liquid chlorine, dwell time, no scrubbing', 'Heavy':'Degrease' },
  pwMin: 250, pwAqua: 10,
  // Pressure Clean Plan: recurring maintenance. Per visit = area x tier rate x (1 - discount), never below pwMin. Client sees monthly (annual / 12).
  // months = minimum commitment. Annual needs 24 months (2 visits) or it's just a discounted one off wash.
  pwPlan: { 'Monthly':{visits:12,disc:0.25,months:12}, 'Quarterly':{visits:4,disc:0.20,months:12}, 'Six Monthly':{visits:2,disc:0.15,months:12}, 'Annual':{visits:1,disc:0.10,months:24} },
  pwPlanUpfront: 0.05, // pay the year upfront
  pwPlanPay: ['Client Chooses','Monthly','Yearly Upfront'],
  // Line marking: rates are NEW SET-OUT. Re-mark over an existing layout = lmRemark x rate (lines, hatching, bays only).
  // Market basis: Gold Coast Oct 2026 warehouse lines $4-$20/lm, bays $15-$50, accessible bay $200-$400, stencils $50-$400, removal $8-$20/lm, mobilisation $250-$800 (all inc GST).
  lmItems: {
    safety:     { label:'Safety / Aisle Line (up to 100mm)', unit:'lm',  Paint:9,   Epoxy:15,  remark:true },
    walkway:    { label:'Walkway / Wide Line (150mm)',       unit:'lm',  Paint:12,  Epoxy:20,  remark:true },
    hatch:      { label:'Hazard Hatching',                   unit:'m²',  Paint:30,  Epoxy:45,  remark:true },
    bay:        { label:'Car Park Bay',                      unit:'bay', Paint:40,  Epoxy:90,  remark:true },
    accessible: { label:'Accessible Bay with Symbol',        unit:'bay', Paint:290, Epoxy:400, remark:true },
    stencil:    { label:'Stencil (arrow, number, letter)',   unit:'each',Paint:120, Epoxy:150, remark:false },
    custom:     { label:'Custom Symbol / Logo Stencil',      unit:'each',Paint:250, Epoxy:300, remark:false },
    removal:    { label:'Old Line Removal (grind off)',      unit:'lm',  Paint:14,  Epoxy:14,  remark:false }
  },
  lmRemark: 0.75, lmMin: 450,
  waste: { 'Light':0.39, 'Medium':0.86, 'Heavy':1.57 },
  wasteRun: 150
};
const PRICE_DEFAULTS = JSON.parse(JSON.stringify(PRICE, function(k, v){ return v === Infinity ? 'Infinity' : v; }));
function priceTableSpec() {
  const g = [];
  function keys(title, base, unit, label) {
    const o = PRICE[base]; if (!o) return;
    g.push({ title:title, rows: Object.keys(o).filter(function(k){ return typeof o[k] === 'number'; }).map(function(k){ return { path:[base,k], label: label ? label(k) : k, unit:unit }; }) });
  }
  keys('Epoxy systems', 'epoxy', '$/m²');
  keys('Flake range upgrade', 'flakeUp', '$/m²');
  g.push({ title:'Surface prep (added to epoxy)', rows: [{ path:['conc','Soft'], label:'Soft concrete + densifier', unit:'$/m²' }]
    .concat(Object.keys(PRICE.coat).filter(function(k){ return k !== 'None' && k !== 'Poxit Overlay'; }).map(function(k){ return { path:['coat',k], label:k, unit:'$/m²' }; })) });
  g.push({ title:'Epoxy add-ons', rows: [
    { path:['addons','nonslip'], label:'Non-slip aggregate', unit:'$/m²' }, { path:['addons','mvb'], label:'Moisture vapour barrier', unit:'$/m²' },
    { path:['addons','xtopcoat'], label:'Extra topcoat', unit:'$/m²' }, { path:['fastcure','1'], label:'Fast-cure polyaspartic, 1 coat', unit:'$/m²' },
    { path:['fastcure','2'], label:'Fast-cure polyaspartic, 2 coats', unit:'$/m²' }, { path:['addons','turnup'], label:'Turn-ups 100mm', unit:'$/lm' },
    { path:['addons','silicone'], label:'Silicone bead', unit:'$/lm' }, { path:['addons','coving'], label:'Coving (standard)', unit:'$/lm' },
    { path:['addons','border'], label:'Border / banding', unit:'$/lm' } ] });
  g.push({ title:'Matte topcoat (epoxy)', note:'Price per m² = kit cost ÷ kit coverage × markup. Default mix: 500 g matting agent per 20 L Armourthane kit.', rows: [
    { path:['matte','kitCost'], label:'Matting agent cost per 20 L kit', unit:'$' }, { path:['matte','kitM2'], label:'Coverage per kit', unit:'m²' },
    { path:['matte','markup'], label:'Markup', unit:'×' } ] });
  g.push({ title:'Clean & seal', rows: SEAL_TIERS.map(function(k){ return { path:['seal',k], label:k, unit:'$/m²' }; })
    .concat(SEAL_TIERS.map(function(k){ return { path:['sealMin',k], label:k + ' minimum', unit:'$' }; })) });
  keys('Tinted sealant', 'tintedPrep', '$/m²');
  g.push({ title:'Grind & seal', rows: Object.keys(PRICE.gs).map(function(k){ return { path:['gs',k], label:k, unit:'$/m²' }; })
    .concat(Object.keys(PRICE.gsMin).map(function(k){ return { path:['gsMin',k], label:k + ' minimum', unit:'$' }; })) });
  g.push({ title:'Grinding, polishing, AquaSeal', rows: Object.keys(PRICE.grindType).map(function(k){ return { path:['grindType',k], label:k, unit:'$/m²' }; })
    .concat([{ path:['grindMvb'], label:'Grinding MVB', unit:'$/m²' }, { path:['polished'], label:'Polished concrete', unit:'$/m²' }, { path:['aqua'], label:'AquaSeal', unit:'$/m²' }]) });
  g.push({ title:'Commercial systems', rows: [].concat.apply([], Object.keys(PRICE.comm).map(function(sys) {
    return [{ path:['comm',sys,'floor'], label:sys + ' floor', unit:'$/m²' }, { path:['comm',sys,'wall'], label:sys + ' walls', unit:'$/m²' },
            { path:['comm',sys,'coving'], label:sys + ' coving', unit:'$/lm' }];
  })).concat([{ path:['comm','Hychem Premium','mat','floor'], label:'Hychem material cost, floor', unit:'$/m²' },
              { path:['comm','Hychem Premium','mat','wall'], label:'Hychem material cost, walls', unit:'$/m²' },
              { path:['comm','Hychem Premium','mat','coving'], label:'Hychem material cost, coving', unit:'$/lm' }])
    .concat(Object.keys(PRICE.commJoint).map(function(k){ return { path:['commJoint',k], label:'Joint sealant ' + k, unit:'$/lm' }; })) });
  g.push({ title:'Repairs', rows: [
    { path:['crackRate'], label:'Crack repair', unit:'$/lm' }, { path:['crackMin'], label:'Crack repair minimum', unit:'$' },
    { path:['spall','small'], label:'Spalling epoxy, small', unit:'$ ea' }, { path:['spall','med'], label:'Spalling epoxy, medium', unit:'$ ea' },
    { path:['spall','large'], label:'Spalling epoxy, large', unit:'$ ea' }, { path:['spall','area'], label:'Spalling epoxy, patched area', unit:'$/m²' },
    { path:['spallCem','small'], label:'Spalling cementitious, small', unit:'$ ea' }, { path:['spallCem','med'], label:'Spalling cementitious, medium', unit:'$ ea' },
    { path:['spallCem','large'], label:'Spalling cementitious, large', unit:'$ ea' }, { path:['skim'], label:'Skim coat', unit:'$/m²' },
    { path:['skimMin'], label:'Skim coat minimum', unit:'$' }, { path:['cancer','rate'], label:'Concrete cancer', unit:'$/m²' },
    { path:['cancer','min'], label:'Concrete cancer minimum', unit:'$' }, { path:['cancer','rebar'], label:'New rebar', unit:'$/lm' } ] });
  g.push({ title:'Joints & cuts', rows: [
    { path:['joint'], label:'Control joint', unit:'$/lm' }, { path:['routing'], label:'Routing', unit:'$/lm' }, { path:['softcut'], label:'Soft cut', unit:'$/lm' },
    { path:['silJoint'], label:'Silicone joint filling', unit:'$/lm' }, { path:['polyJoint'], label:'Polyurethane joint filling', unit:'$/lm' } ] });
  g.push({ title:'Pressure washing', rows: Object.keys(PRICE.pw).map(function(k){ return { path:['pw',k], label:k, unit:'$/m²' }; })
    .concat([{ path:['pwMin'], label:'Wash minimum', unit:'$' }, { path:['pwAqua'], label:'AquaSeal after wash', unit:'$/m²' }]) });
  g.push({ title:'Site & travel', rows: [
    { path:['travelFreeKm'], label:'Free travel zone', unit:'km' }, { path:['travelRate'], label:'Travel rate', unit:'$/km' },
    { path:['waste','Light'], label:'Waste, light grind', unit:'$/m²' }, { path:['waste','Medium'], label:'Waste, medium grind', unit:'$/m²' },
    { path:['waste','Heavy'], label:'Waste, heavy grind', unit:'$/m²' }, { path:['wasteRun'], label:'Tip run', unit:'$' },
    { path:['coatingMinJob'], label:'Small job minimum', unit:'$' } ] });
  return g;
}
function priceGet(obj, path) { return path.reduce(function(o, k){ return o === undefined || o === null ? undefined : o[k]; }, obj); }
function priceSet(obj, path, v) { let o = obj; for (let i = 0; i < path.length - 1; i++) { if (!o[path[i]]) return; o = o[path[i]]; } o[path[path.length - 1]] = v; }
function priceKey(path) { return path.join('|'); }
let PRICE_OVERRIDES = {};
function applyPriceOverrides(map) {
  const ok = {};
  priceTableSpec().forEach(function(g){ g.rows.forEach(function(r) {
    const k = priceKey(r.path);
    const def = priceGet(PRICE_DEFAULTS, r.path);
    const v = map && map[k] !== undefined && map[k] !== '' ? parseFloat(map[k]) : NaN;
    if (isFinite(v) && v >= 0 && v !== def) { priceSet(PRICE, r.path, v); ok[k] = v; }
    else priceSet(PRICE, r.path, def);
  }); });
  PRICE_OVERRIDES = ok;
  return ok;
}
const SERVICES = [
  { key:'epoxy',    icon:'🪨', name:'Epoxy Flooring', rate:'Flake / Quartz / Metallic / Solid Colour — from $65/m²' },
  { key:'tinted',   icon:'🎨', name:'Tinted Sealant', rate:'Pressure wash $30/m² · Grind prep $60/m²' },
  { key:'seal',     icon:'💧', name:'Cleaning &amp; Sealing', rate:'Same-day sealer $20/m² · Premium next-day $35/m²' },
  { key:'gs',       icon:'🪓', name:'Grind &amp; Seal', rate:'Prep + seal — Premium $85/m² · Elite $90/m²' },
  { key:'grind',    icon:'⚙️', name:'Concrete Grinding', rate:'$40–$50/m²' },
  { key:'polished', icon:'✨', name:'Polished Concrete', rate:'Mechanical polish — $120/m²' },
  { key:'care',     icon:'♻️', name:'Care Plan Refresh', rate:'Existing care plan clients' },
  { key:'shine',    icon:'🧽', name:'Clean Grip & Shine', rate:'Standard $15/m² · Premium post-buff $20/m²' },
];
function freshState() {
  return {
    client: { first:'', last:'', phone:'', email:'', address:'', suburb:'', location:'', entity:'Company', area:'', date:'', valid:'', ref:'', internalNotes:'', clientNotes:'' },
    services: {},
    docService: '',
    epoxyZones: [], tintedZones: [], sealZones: [], gsZones: [], aquaZones: [], grindZones: [], polishedZones: [], careZones: [], shineZones: [],
    grindExtras: { trip:0, lip:0 },
    cracks: [], spalling: { small:0, med:0, large:0, area:0 },
    spallingCem: { small:0, med:0, large:0 },
    spallingOpt: { alternatives:false, include:'epoxy' },
    commAreas: [],
    commDiscount: { type:'none', amount:0, label:'' },
    commSikaSpec: 'Sika commercial epoxy floor and wall system',
    lineEdits: {},
    skim: { area:0, note:'' },
    joints: [], softCuts: [], siliconeJoints: [], polyJoints: [], coreHoles: [],
    ramps: [],
    cancerPatches: [], cancerRebarLm: 0,
    pwZones: [], pwJob: { tier:'Standard', oil:false, aqua:false },
    pwPlan: { enabled:false, area:0, freq:'Six Monthly', tier:'Standard', reward:true, pay:'Client Chooses', showQuote:false, showInvoice:false },
    lmLines: [], lmJob: { material:'Epoxy', remark:false },
    waste: { enabled:false, m2:0, tier:'Medium', runFee:true, runs:1 },
    demo: { carpet:0, laminate:0, vinyl:0, tile:0, tileMosaic:0, kitchenArea:0, cabinetryLm:0 },
    pwUpsell: { enabled:false, beds:'3', doubleStorey:false, diffAccess:false },
    roofWash: { enabled:false, beds:'3', doubleStorey:false },
    coatingMinOn: true,
    saveKey: '',
    custom: { adjustType:'none', adjustAmount:0, items: [], travelKm:0, travelDays:1, carePromo:false },
    generalAddons: { nonslip:false, nonslipM2:0, mvb:false, mvbM2:0, xtopcoat:false, xtopcoatM2:0, fastcure:false, fastcureCoats:'2', fastcureM2:0, turnup:false, turnupLm:0, silicone:false, silicLm:0, coving:false, covingLm:0, border:false, borderLm:0, logo:false, logoType:'150', stencil:false, stencilM2:0, stencilDiff:'25' },
    overrides: {},
    // Site step: what is filled in automatically (any manual change switches that one off)
    auto: { days:true, travel:true, waste:true },
    travel: { mode:'suburb', place:'', km:0 }
  };
}
let S = freshState();


function setPath(obj, path, value) {
  const parts = path.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  o[parts[parts.length-1]] = value;
}
function getPath(obj, path) {
  return path.split('.').reduce(function(o,k){ return (o !== undefined && o !== null) ? o[k] : undefined; }, obj);
}
const SEAL_TIERS = ['Same-Day Sealer','Premium Next-Day Sealer'];
function finishText(z) { return z && z.finish ? ' · ' + z.finish + ' finish' : ''; }
function zoneFloorRate(list, z) {
  if (list === 'epoxyZones') { let r = PRICE.epoxy[z.sys] || 85; if (z.sys !== 'Metallic Internal' && z.sys.indexOf('Solid Colour') !== 0) r += PRICE.flakeUp[z.flake] || 0; return r; }
  if (list === 'tintedZones') return PRICE.tintedPrep[z.prep] || 30;
  if (list === 'sealZones') return PRICE.seal[z.type] || 20;
  if (list === 'gsZones') return PRICE.gs[z.type] || 75;
  if (list === 'aquaZones') return PRICE.aqua;
  return 0;
}
function zoneWallRate(list, z) {
  const r = parseFloat(z.wallRate);
  return (z.wallRate !== '' && z.wallRate !== undefined && z.wallRate !== null && isFinite(r)) ? r : zoneFloorRate(list, z);
}
function wallM2(z) { return z && z.walls ? (parseFloat(z.wallM2) || 0) : 0; }
function wallAddon(list, z) {
  const m = wallM2(z);
  if (!(m > 0)) return null;
  const r = zoneWallRate(list, z);
  return { label:'Walls (' + m + 'm² @ $' + r + '/m²)', price: m * r };
}
function matteRate() {
  const m = PRICE.matte || {};
  const cost = parseFloat(m.kitCost) || 0, cov = parseFloat(m.kitM2) || 0, mk = parseFloat(m.markup) || 0;
  return cov > 0 ? Math.round(cost / cov * mk * 100) / 100 : 0;
}
function matteAddon(z) {
  if (!z || z.finish !== 'Matte') return null;
  const m2 = (z.area || 0) + wallM2(z);
  const r = matteRate();
  if (!(m2 > 0) || !(r > 0)) return null;
  return { label:'Matte Topcoat (' + m2 + 'm² @ $' + r.toFixed(2) + '/m²)', price: m2 * r };
}
function regroutPrice(z) {
  if (!z.regrout || !(z.regroutM2 > 0)) return 0;
  const surf = z.regroutSurface || 'porcelain';
  const opt = z.regroutOption || 'overtop';
  return z.regroutM2 * (PRICE.regrout[surf][opt] || 0);
}
function regroutLabel(z) {
  const surf = (z.regroutSurface === 'stone') ? 'Natural Stone' : 'Porcelain/Ceramic';
  const opt = (z.regroutOption === 'grindout') ? 'grind out & regrout' : 'grout over top';
  return 'Regrouting — ' + surf + ', ' + opt + ' (' + z.regroutM2 + 'm²)';
}
function zoneDefaults(type) {
  if (type === 'epoxy') return { name:'', sys:'Flake Internal', flake:'Standard', conc:'Hard', coat:'None', area:0, finish:'Gloss', walls:false, wallM2:0, wallRate:'',
    addons:{ nonslip:false, mvb:false, xtopcoat:false, fastcure:false, fastcureCoats:'2', turnup:false, turnupLm:0, silicone:false, silicLm:0, coving:false, covingLm:0, border:false, borderLm:0, logo:false, logoType:'150', stencil:false, stencilM2:0, stencilDiff:'25' } };
  if (type === 'tinted') return { name:'', prep:'Pressure Wash', colour:'', coats:'2', area:0, finish:'Gloss', walls:false, wallM2:0, wallRate:'' };
  if (type === 'seal') return { name:'', type:'Same-Day Sealer', area:0, finish:'Matte', walls:false, wallM2:0, wallRate:'', regrout:false, regroutSurface:'porcelain', regroutOption:'overtop', regroutM2:0 };
  if (type === 'gs') return { name:'', type:'Premium Grind & Seal', area:0, finish:'Matte', walls:false, wallM2:0, wallRate:'' };
  if (type === 'aqua') return { name:'', area:0, walls:false, wallM2:0, wallRate:'' };
  if (type === 'grind') return { name:'', type:'Light Surface Prep', area:0, mvb:false };
  if (type === 'polished') return { name:'', gloss:'Satin', area:0 };
  if (type === 'care') return { name:'', type:'Level 2 Refresh Coat', area:0, nonslip:false };
  if (type === 'shine') return { name:'', tier:'Standard — Clean, Apply & Light Buff', area:0 };
  if (type === 'pw') return { name:'', area:0 };
  if (type === 'comm') return { name:'', system:'Hychem Premium', floor:0, wall:0, coving:0, joints:0, jointType:'Hyflex NS', routing:false, qty:1 };
  return null;
}
const ZONE_LISTS = { epoxy:'epoxyZones', tinted:'tintedZones', seal:'sealZones', gs:'gsZones', aqua:'aquaZones', grind:'grindZones', polished:'polishedZones', care:'careZones', shine:'shineZones', pw:'pwZones', comm:'commAreas' };
function generalAddonsList() {
  const g = S.generalAddons; const list = [];
  if (g.nonslip && g.nonslipM2 > 0) list.push({ label:'Non-slip Aggregate (' + g.nonslipM2 + 'm²)', price: g.nonslipM2*PRICE.addons.nonslip });
  if (g.mvb && g.mvbM2 > 0) list.push({ label:'Moisture Vapour Barrier (' + g.mvbM2 + 'm²)', price: g.mvbM2*PRICE.addons.mvb });
  if (g.xtopcoat && g.xtopcoatM2 > 0) list.push({ label:'Extra Topcoat (' + g.xtopcoatM2 + 'm²)', price: g.xtopcoatM2*PRICE.addons.xtopcoat });
  if (g.fastcure && g.fastcureM2 > 0) list.push({ label:'Fast-Cure Polyaspartic (' + g.fastcureCoats + ' Coat' + (g.fastcureCoats==='2'?'s':'') + ', ' + g.fastcureM2 + 'm²)', price: g.fastcureM2*(PRICE.fastcure[g.fastcureCoats]||40) });
  if (g.turnup && g.turnupLm > 0) list.push({ label:'Turn-ups 100mm (' + g.turnupLm + 'lm)', price: g.turnupLm*PRICE.addons.turnup });
  if (g.silicone && g.silicLm > 0) list.push({ label:'Silicone Bead (' + g.silicLm + 'lm)', price: g.silicLm*PRICE.addons.silicone });
  if (g.coving && g.covingLm > 0) list.push({ label:'Coving (' + g.covingLm + 'lm)', price: g.covingLm*PRICE.addons.coving });
  if (g.border && g.borderLm > 0) list.push({ label:'Border/Banding (' + g.borderLm + 'lm)', price: g.borderLm*PRICE.addons.border });
  if (g.logo) list.push({ label:'Vinyl Logo — ' + (PRICE.logo[g.logoType]||'').split('—')[0].trim(), price: parseFloat(g.logoType)||0 });
  if (g.stencil && g.stencilM2 > 0) list.push({ label:'Stencil (' + g.stencilM2 + 'm²)', price: g.stencilM2*(parseFloat(g.stencilDiff)||25) });
  return list;
}
function coreHolePrice(h) {
  const base = PRICE.coreDrill[h.size] || 220;
  const per = base + (h.pvc ? PRICE.coreDrillPvc : 0) + (h.silicone ? PRICE.coreDrillSilicone : 0);
  return per * (h.qty || 1);
}
function calcRamp(r) {
  const riseM = (r.rise||0) / 1000;
  const lengthM = riseM * (r.ratio||12);
  const footprintM2 = lengthM * (r.width||0);
  const avgThicknessMm = (r.rise||0) / 2;
  const material = r.material || 'epoxysand';
  if (material === 'rapidset') {
    const kgNeeded = PRICE.rampCoverage * avgThicknessMm * footprintM2;
    const buckets = kgNeeded > 0 ? Math.ceil(kgNeeded / PRICE.rampMortarBucketKg) : 0;
    const cost = buckets * PRICE.rampMortarBucketCost;
    return { material:material, lengthM:lengthM, footprintM2:footprintM2, kgNeeded:kgNeeded, buckets:buckets, materialsCost:cost, cost:cost };
  }
  const kgNeeded = PRICE.rampEpoxyCoverage * avgThicknessMm * footprintM2;
  const batches = kgNeeded > 0 ? Math.ceil(kgNeeded / PRICE.rampEpoxyBatchKg) : 0;
  const materialsCost = batches * PRICE.rampEpoxyBatchCost;
  const cost = materialsCost * PRICE.rampEpoxyMultiplier;
  return { material:material, lengthM:lengthM, footprintM2:footprintM2, kgNeeded:kgNeeded, batches:batches, materialsCost:materialsCost, cost:cost };
}
function cancerPatchArea(p) { return ((p.lengthMm||0) * (p.widthMm||0) * (p.qty||1)) / 1e6; }
function cancerCalc() {
  let area = 0;
  S.cancerPatches.forEach(function(p){ area += cancerPatchArea(p); });
  const byArea = area * PRICE.cancer.rate;
  const base = area > 0 ? Math.max(byArea, PRICE.cancer.min) : 0;
  const rebar = base > 0 ? (S.cancerRebarLm||0) * PRICE.cancer.rebar : 0;
  return { area:area, byArea:byArea, base:base, minApplied: area > 0 && byArea < PRICE.cancer.min, rebar:rebar, total:base + rebar };
}
function cancerSection() {
  const c = cancerCalc();
  if (c.base <= 0) return null;
  const add = [];
  S.cancerPatches.forEach(function(p,i) {
    const a = cancerPatchArea(p);
    if (a <= 0) return;
    add.push({ label:(p.name||'Patch '+(i+1)) + ' — ' + p.lengthMm + ' × ' + p.widthMm + 'mm' + ((p.qty||1) > 1 ? ' × ' + p.qty : '') + ' (' + a.toFixed(3) + 'm²)', price:a*PRICE.cancer.rate });
  });
  if (c.minApplied) add.push({ label:'Minimum callout top-up ($' + PRICE.cancer.min + ' min)', price:c.base - c.byArea });
  if (c.rebar > 0) add.push({ label:'New rebar welded in — ' + S.cancerRebarLm + 'lm @ $' + PRICE.cancer.rebar + '/lm', price:c.rebar });
  return { key:'cancer', category:'🔧 Concrete Cancer Repair', zoneName:'', desc:'Chop out affected concrete, clean rebar, epoxy rust-inhibiting primer, patch · ' + c.area.toFixed(3) + 'm² total', addons:add, subtotal:c.total };
}
function pwTier() { return S.pwJob.oil ? 'Heavy' : S.pwJob.tier; }
function pwCalc() {
  let area = 0;
  S.pwZones.forEach(function(z){ area += (z.area||0); });
  const tier = pwTier();
  const byArea = area * PRICE.pw[tier];
  const wash = area > 0 ? Math.max(byArea, PRICE.pwMin) : 0;
  const aqua = (S.pwJob.aqua && area > 0) ? area * PRICE.pwAqua : 0;
  return { area:area, tier:tier, byArea:byArea, wash:wash, minApplied: area > 0 && byArea < PRICE.pwMin, aqua:aqua, total:wash + aqua };
}
function pwSection() {
  const c = pwCalc();
  if (c.total <= 0) return null;
  const add = [];
  S.pwZones.forEach(function(z,i) {
    if (!(z.area > 0)) return;
    add.push({ label:(z.name||'Area '+(i+1)) + ' — ' + z.area + 'm² @ $' + PRICE.pw[c.tier] + '/m²', price:z.area*PRICE.pw[c.tier] });
  });
  if (c.minApplied) add.push({ label:'Minimum callout top-up ($' + PRICE.pwMin + ' min)', price:c.wash - c.byArea });
  if (c.aqua > 0) add.push({ label:'AquaSeal after wash — ' + c.area + 'm² @ $' + PRICE.pwAqua + '/m²', price:c.aqua });
  return { key:'pw', category:'🧼 Pressure Washing', zoneName:'', desc:c.tier + ' tier (' + PRICE.pwDesc[c.tier].toLowerCase() + ')' + (S.pwJob.oil ? ', oil stains' : '') + ' · ' + c.area + 'm²', addons:add, subtotal:c.total };
}
function r2(n) { return Math.round(n * 100) / 100; }
function pwPlanCalc() {
  const p = S.pwPlan || freshState().pwPlan;
  const f = PRICE.pwPlan[p.freq] || PRICE.pwPlan['Six Monthly'];
  const rate = PRICE.pw[p.tier] || PRICE.pw['Standard'];
  const area = parseFloat(p.area) || 0;
  const full = area * rate;
  const byArea = full * (1 - f.disc);
  const perVisit = area > 0 ? Math.max(byArea, PRICE.pwMin) : 0;
  const rewardVisit = area > 0 ? Math.max(full * (1 - 2 * f.disc), PRICE.pwMin) : 0;
  const credit = (p.reward && area > 0) ? Math.max(0, perVisit - rewardVisit) : 0;
  const annual = perVisit * f.visits;
  const monthly = r2(annual / 12);
  const upfront = r2(annual * (1 - PRICE.pwPlanUpfront));
  const minVisits = Math.round(f.visits * f.months / 12);
  return { on: !!p.enabled && area > 0, area:area, freq:p.freq, tier:p.tier, rate:rate, disc:f.disc, visits:f.visits,
    full:full, byArea:byArea, perVisit:perVisit, minApplied: area > 0 && byArea < PRICE.pwMin,
    reward: !!p.reward, rewardDisc: 2 * f.disc, rewardVisit:rewardVisit, credit:credit,
    annual:annual, monthly:monthly, monthlyInc: r2(annual * 1.1 / 12),
    upfront:upfront, upfrontInc: r2(annual * (1 - PRICE.pwPlanUpfront) * 1.1),
    minMonths:f.months, minVisits:minVisits, termValue: perVisit * minVisits - credit };
}
function pwPlanDocHTML(withBreakdown) {
  const c = pwPlanCalc();
  if (!c.on) return '';
  const freqTxt = { 'Monthly':'a maintenance clean every month', 'Quarterly':'four maintenance cleans a year, one every three months', 'Six Monthly':'two maintenance cleans a year, one every six months', 'Annual':'a maintenance clean every year' }[c.freq] || '';
  const pay = (S.pwPlan && S.pwPlan.pay) || 'Client Chooses';
  const save = Math.round(PRICE.pwPlanUpfront*100);
  let rows = '';
  if (pay === 'Monthly') rows = '<div class="payment-row due"><div>Plan Price, Paid Monthly (Inc GST)</div><div class="p-amount">' + fmt(c.monthlyInc) + ' per month</div></div>';
  else if (pay === 'Yearly Upfront') rows = '<div class="payment-row due"><div>Plan Price, Paid Yearly Upfront with ' + save + '% Saving (Inc GST)</div><div class="p-amount">' + fmt(c.upfrontInc) + ' per year</div></div>';
  else rows = '<div class="payment-row due"><div>Pay Monthly (Inc GST)</div><div class="p-amount">' + fmt(c.monthlyInc) + ' per month</div></div>' +
    '<div class="payment-row"><div>Or Pay Yearly Upfront and Save ' + save + '% (Inc GST)</div><div class="p-amount">' + fmt(c.upfrontInc) + ' per year</div></div>';
  if (withBreakdown) rows += '<div class="payment-row"><div>Per Visit (Ex GST), ' + c.visits + ' visit' + (c.visits>1?'s':'') + ' a year</div><div class="p-amount">' + fmt(c.perVisit) + '</div></div>' +
    '<div class="payment-row"><div>Annual (Ex GST)</div><div class="p-amount">' + fmt(c.annual) + '</div></div>';
  if (c.credit > 0) rows += '<div class="payment-row"><div><strong>Sign Up Bonus:</strong> your second visit is ' + Math.round(c.rewardDisc*100) + '% off, credited to that visit\'s bill</div><div class="p-amount">' + fmt(c.credit * 1.1) + ' off</div></div>';
  rows += '<div class="payment-row"><div>Minimum Commitment</div><div class="p-amount">' + c.minMonths + ' months (' + c.minVisits + ' visits)</div></div>';
  return '<div class="payment-box" style="margin-top:16px;"><div class="payment-title">Poxit Pressure Clean Plan: ' + c.freq + '</div>' +
    '<p style="font-size:11.5px;line-height:1.7;color:#333;margin-bottom:8px;">Keep your ' + c.area + 'm² looking freshly cleaned all year round with ' + freqTxt + ', booked in for you so you never have to think about it.</p>' +
    rows +
    '<p style="font-size:10.5px;line-height:1.6;color:#555;margin-top:8px;">The plan covers routine maintenance cleaning. Your first visit is charged at full price as quoted above. If a surface has built up substantial dirt or staining between visits, an additional charge may apply on the day where deemed necessary, and we will always let you know before any extra work goes ahead. Full terms are set out in the Poxit Pressure Clean Plan Agreement.</p></div>';
}
function lmRate(type) {
  const it = PRICE.lmItems[type];
  if (!it) return 0;
  const base = it[S.lmJob.material] || 0;
  return (S.lmJob.remark && it.remark) ? Math.round(base * PRICE.lmRemark * 100) / 100 : base;
}
function lmCalc() {
  let byItems = 0;
  S.lmLines.forEach(function(l){ byItems += (parseFloat(l.qty)||0) * lmRate(l.type); });
  const total = byItems > 0 ? Math.max(byItems, PRICE.lmMin) : 0;
  return { byItems:byItems, total:total, minApplied: byItems > 0 && byItems < PRICE.lmMin };
}
function lmSection() {
  const c = lmCalc();
  if (c.total <= 0) return null;
  const add = [];
  S.lmLines.forEach(function(l, i) {
    const q = parseFloat(l.qty) || 0;
    if (!(q > 0)) return;
    const it = PRICE.lmItems[l.type];
    add.push({ label:it.label + (l.name ? ' (' + l.name + ')' : '') + ' — ' + q + ' ' + it.unit + ' @ $' + lmRate(l.type) + '/' + it.unit, price:q * lmRate(l.type) });
  });
  if (c.minApplied) add.push({ label:'Minimum callout top-up ($' + PRICE.lmMin + ' min)', price:c.total - c.byItems });
  return { key:'lm', category:'🦺 Line Marking', zoneName:'', desc:S.lmJob.material + ' line marking' + (S.lmJob.remark ? ', re-mark over existing layout' : ', new set-out'), addons:add, subtotal:c.total };
}
function jobGrindArea() {
  let a = 0;
  ['epoxyZones','gsZones','grindZones','polishedZones'].forEach(function(l){ S[l].forEach(function(z){ a += (z.area||0); }); });
  S.tintedZones.forEach(function(z){ if (z.prep === 'Grind Prep') a += (z.area||0); });
  (S.commAreas || []).forEach(function(c){ a += commNum(c.floor) * commQty(c); });
  return Math.round(a*100)/100;
}
function autoFlags() {
  if (!S.auto || typeof S.auto !== 'object') S.auto = { days:false, travel:false, waste:false };
  return S.auto;
}
const DAY_RULES = {
  epoxy:[2,80], metallic:[3,60], solidNoTop:[1,80], tinted:[1,100], sealSame:[1,150], sealNext:[2,150],
  gs:[2,80], grind:[1,80], polished:[3,60], aqua:[1,200], care:[1,100], shine:[1,150], comm:[3,60], pw:[1,300]
};
function daysFor(rule, m2) {
  if (!(m2 > 0)) return 0;
  const r = DAY_RULES[rule];
  return r[0] + Math.max(0, Math.ceil((m2 - r[1]) / r[1] - 1e-9));
}
function sumArea(list, filter) {
  let t = 0;
  (S[list] || []).forEach(function(z){ if (!filter || filter(z)) t += (parseFloat(z.area) || 0) + wallM2(z); });
  return Math.round(t*100)/100;
}
function estimateDays() {
  const parts = [];
  function add(label, rule, m2) { const d = daysFor(rule, m2); if (d > 0) parts.push({ label:label, m2:m2, days:d }); }
  add('Metallic epoxy', 'metallic', sumArea('epoxyZones', function(z){ return z.sys === 'Metallic Internal'; }));
  add('Solid colour, no topcoat', 'solidNoTop', sumArea('epoxyZones', function(z){ return z.sys === 'Solid Colour — No Topcoat'; }));
  add('Epoxy', 'epoxy', sumArea('epoxyZones', function(z){ return z.sys !== 'Metallic Internal' && z.sys !== 'Solid Colour — No Topcoat'; }));
  add('Tinted seal', 'tinted', sumArea('tintedZones'));
  add('Same-day seal', 'sealSame', sumArea('sealZones', function(z){ return z.type !== 'Premium Next-Day Sealer'; }));
  add('Premium next-day seal', 'sealNext', sumArea('sealZones', function(z){ return z.type === 'Premium Next-Day Sealer'; }));
  add('Grind & seal', 'gs', sumArea('gsZones'));
  add('Grinding', 'grind', sumArea('grindZones'));
  add('Polished concrete', 'polished', sumArea('polishedZones'));
  add('AquaSeal', 'aqua', sumArea('aquaZones'));
  add('Care plan refresh', 'care', sumArea('careZones'));
  add('Grip & shine', 'shine', sumArea('shineZones'));
  let comm = 0; (S.commAreas || []).forEach(function(c){ comm += (commNum(c.floor) + commNum(c.wall)) * commQty(c); });
  add('Commercial system', 'comm', Math.round(comm*100)/100);
  add('Pressure washing', 'pw', sumArea('pwZones'));
  let days = parts.reduce(function(m, x){ return Math.max(m, x.days); }, 0);
  const d = S.demo || {};
  const heavyDemo = (parseFloat(d.tile)||0) + (parseFloat(d.tileMosaic)||0) + (parseFloat(d.vinyl)||0) + (parseFloat(d.kitchenArea)||0);
  if (heavyDemo > 20) { days += 1; parts.push({ label:'Tile, vinyl or kitchen removal first', m2:heavyDemo, days:1, extra:true }); }
  if (days === 0) {
    const other = (S.lmLines || []).length || (S.cracks || []).length || (S.joints || []).length || (S.softCuts || []).length ||
      (S.coreHoles || []).length || (S.ramps || []).length || (S.cancerPatches || []).length || (S.skim && S.skim.area > 0) || heavyDemo > 0;
    if (other) parts.push({ label:'Repairs, joints or line marking', m2:0, days:1 });
    days = 1;
  }
  return { days: days, parts: parts };
}
function travelOneWayKm() {
  const t = S.travel || {};
  if (t.mode === 'custom') return parseFloat(t.km) || 0;
  const d = PRICE.suburbKm[S.client.suburb];
  return d === undefined ? 0 : d;
}
function travelBillableAuto() {
  return Math.max(0, +(travelOneWayKm() - PRICE.travelFreeKm).toFixed(1));
}
function wasteAuto() {
  const m2 = jobGrindArea();
  let tier = 'Light';
  const heavy = S.epoxyZones.some(function(z){ return z.coat === 'Epoxy Removal'; }) || S.grindZones.some(function(z){ return /^Heavy/.test(z.type); });
  const med = S.epoxyZones.some(function(z){ return z.coat === 'Single Paint' || z.coat === 'Multi-Paint'; }) || S.grindZones.some(function(z){ return /^Medium/.test(z.type); });
  if (heavy) tier = 'Heavy'; else if (med) tier = 'Medium';
  return { m2: m2, tier: tier, runs: Math.max(1, Math.ceil(m2 / 150)) };
}
function applyAutoSite() {
  const a = autoFlags();
  if (!S.travel) S.travel = { mode:'suburb', place:'', km:0 };
  if (S.travel.mode === 'custom') S.client.suburb = S.travel.place || '';
  if (a.days) S.custom.travelDays = estimateDays().days;
  if (a.travel) S.custom.travelKm = travelBillableAuto();
  if (a.waste) {
    const w = wasteAuto();
    S.waste.enabled = w.m2 > 0; S.waste.m2 = w.m2; S.waste.tier = w.tier; S.waste.runFee = true; S.waste.runs = w.runs;
  }
}
function wasteSections() {
  const w = S.waste, out = [];
  if (!w.enabled) return out;
  const rate = PRICE.waste[w.tier] || 0;
  const fee = (w.m2||0) * rate;
  if (fee > 0) out.push({ key:'waste', category:'🚛 Waste Disposal', zoneName:'', desc:w.tier + ' grind · ' + w.m2 + 'm² @ $' + rate + '/m²', addons:[], subtotal:fee });
  const runs = Math.max(0, Math.round(w.runs||0));
  if (w.runFee && runs > 0) out.push({ key:'wasteRun', category:'🚛 Disposal Run Travel', zoneName:'', desc:runs + ' tip run' + (runs===1?'':'s') + ' @ $' + PRICE.wasteRun + '/run', addons:[], subtotal:runs*PRICE.wasteRun });
  return out;
}
function epoxyZoneTotal(z) {
  const area = z.area || 0;
  const a = z.addons;
  let rate = PRICE.epoxy[z.sys] || 85;
  if (z.sys !== 'Metallic Internal' && z.sys.indexOf('Solid Colour') !== 0) rate += PRICE.flakeUp[z.flake] || 0;
  rate += PRICE.conc[z.conc] || 0;
  rate += PRICE.coat[z.coat] || 0;
  let total = area * rate;
  if (a.nonslip) total += area * PRICE.addons.nonslip;
  if (a.mvb) total += area * PRICE.addons.mvb;
  if (a.xtopcoat) total += area * PRICE.addons.xtopcoat;
  if (a.fastcure) total += area * (PRICE.fastcure[a.fastcureCoats] || 40);
  if (a.turnup) {
    total += (a.turnupLm||0) * PRICE.addons.turnup;
    if (a.silicone) total += (a.silicLm||0) * PRICE.addons.silicone;
    if (a.coving) total += (a.covingLm||0) * PRICE.addons.coving;
  }
  if (a.border) total += (a.borderLm||0) * PRICE.addons.border;
  if (a.logo) total += parseFloat(a.logoType) || 0;
  if (a.stencil) total += (a.stencilM2||0) * (parseFloat(a.stencilDiff)||25);
  const wa = wallAddon('epoxyZones', z); if (wa) total += wa.price;
  const ma = matteAddon(z); if (ma) total += ma.price;
  return total;
}
function epoxyAddonsList(z) {
  const area = z.area || 0; const a = z.addons; const list = [];
  if (PRICE.conc[z.conc] > 0) list.push({ label:'Soft Concrete + Densifier', price: area*PRICE.conc[z.conc] });
  if (PRICE.coat[z.coat] > 0) list.push({ label: z.coat + ' (Coating Removal)', price: area*PRICE.coat[z.coat] });
  if (a.nonslip) list.push({ label:'Non-slip Aggregate', price: area*PRICE.addons.nonslip });
  if (a.mvb) list.push({ label:'Moisture Vapour Barrier', price: area*PRICE.addons.mvb });
  if (a.xtopcoat) list.push({ label:'Extra Topcoat (Smoothness)', price: area*PRICE.addons.xtopcoat });
  if (a.fastcure) list.push({ label:'Fast-Cure Polyaspartic (' + a.fastcureCoats + ' Coat' + (a.fastcureCoats==='2'?'s':'') + ')', price: area*(PRICE.fastcure[a.fastcureCoats]||40) });
  if (a.turnup && a.turnupLm > 0) list.push({ label:'Turn-ups 100mm (' + a.turnupLm + 'lm)', price: a.turnupLm*PRICE.addons.turnup });
  if (a.turnup && a.silicone && a.silicLm > 0) list.push({ label:'Silicone Bead (' + a.silicLm + 'lm)', price: a.silicLm*PRICE.addons.silicone });
  if (a.turnup && a.coving && a.covingLm > 0) list.push({ label:'Coving (' + a.covingLm + 'lm)', price: a.covingLm*PRICE.addons.coving });
  if (a.border && a.borderLm > 0) list.push({ label:'Border/Banding (' + a.borderLm + 'lm)', price: a.borderLm*PRICE.addons.border });
  if (a.logo) list.push({ label:'Vinyl Logo — ' + (PRICE.logo[a.logoType]||'').split('—')[0].trim(), price: parseFloat(a.logoType)||0 });
  if (a.stencil && a.stencilM2 > 0) list.push({ label:'Stencil (' + a.stencilM2 + 'm²)', price: a.stencilM2*(parseFloat(a.stencilDiff)||25) });
  const wa = wallAddon('epoxyZones', z); if (wa) list.push(wa);
  const ma = matteAddon(z); if (ma) list.push(ma);
  return list;
}
function buildSections() { return applyLineEdits(buildSectionsRaw()); }
function buildSectionsRaw() {
  applyAutoSite();
  const sections = [];
  S.epoxyZones.forEach(function(z,i) {
    if (!z.area && !wallM2(z)) return;
    let desc = z.sys;
    if (z.sys !== 'Metallic Internal' && z.sys.indexOf('Solid Colour') !== 0 && z.flake !== 'Standard') desc += ' — ' + z.flake;
    desc += ' · ' + (z.area || 0) + 'm²' + finishText(z) + ' · Diamond Grind Included';
    sections.push({ key:'epoxy-'+i, category:'🪨 Epoxy Floor System', zoneName:z.name||('Zone '+(i+1)), desc:desc, addons:epoxyAddonsList(z), subtotal:epoxyZoneTotal(z) });
  });
  S.tintedZones.forEach(function(z,i) {
    if (!z.area && !wallM2(z)) return;
    const area = z.area || 0;
    const rate = PRICE.tintedPrep[z.prep] || 30;
    const extra = z.coats === '3' ? area * 10 : 0;
    const addons = extra > 0 ? [{label:'3rd Coat', price:extra}] : [];
    const wa = wallAddon('tintedZones', z); if (wa) addons.push(wa);
    sections.push({ key:'tinted-'+i, category:'🎨 Tinted Sealant', zoneName:z.name||('Zone '+(i+1)), desc:z.prep + ' + Tinted Seal · ' + (z.colour||'Colour TBC') + ' · ' + z.coats + ' coats · ' + area + 'm²' + finishText(z), addons:addons, subtotal:area*rate+extra+(wa?wa.price:0) });
  });
  S.sealZones.forEach(function(z,i) {
    if (!z.area && !wallM2(z)) return;
    var area = z.area || 0;
    var rate = PRICE.seal[z.type] || 20;
    var min = PRICE.sealMin[z.type] || 0;
    var sub = area > 0 ? Math.max(area*rate, min) : 0;
    var rg = regroutPrice(z);
    var addons = [];
    if (rg > 0) addons.push({ label:regroutLabel(z), price:rg });
    var wa = wallAddon('sealZones', z); if (wa) addons.push(wa);
    sections.push({ key:'seal-'+i, category:'💧 Cleaning &amp; Sealing', zoneName:z.name||('Zone '+(i+1)), desc:z.type + ' · ' + area + 'm²' + (area > 0 && area*rate < min ? ' (min charge $' + min + ')' : '') + finishText(z), addons:addons, subtotal:sub + rg + (wa?wa.price:0) });
  });
  S.gsZones.forEach(function(z,i) {
    if (!z.area && !wallM2(z)) return;
    var area = z.area || 0;
    var rate = PRICE.gs[z.type] || 75;
    var min = PRICE.gsMin[z.type] || 0;
    var sub = area > 0 ? Math.max(area*rate, min) : 0;
    var wa = wallAddon('gsZones', z);
    sections.push({ key:'gs-'+i, category:'🪓 Grind &amp; Seal', zoneName:z.name||('Zone '+(i+1)), desc:z.type + ' · ' + area + 'm²' + (area > 0 && area*rate < min ? ' (min charge $' + min + ')' : '') + finishText(z), addons:wa ? [wa] : [], subtotal:sub + (wa?wa.price:0) });
  });
  S.aquaZones.forEach(function(z,i) {
    if (!z.area && !wallM2(z)) return;
    var area = z.area || 0;
    var wa = wallAddon('aquaZones', z);
    sections.push({ key:'aqua-'+i, category:'🌧 AquaSeal Penetrating Sealer', zoneName:z.name||('Zone '+(i+1)), desc:area + 'm²', addons:wa ? [wa] : [], subtotal:area*PRICE.aqua + (wa?wa.price:0) });
  });
  let gSub = 0; const gAdd = [];
  S.grindZones.forEach(function(z,i) {
    if (!z.area) return;
    const base = z.area*(PRICE.grindType[z.type]||40);
    gSub += base;
    gAdd.push({ label:z.type + ' — ' + (z.name||'Zone '+(i+1)) + ' (' + z.area + 'm²)', price:base });
    if (z.mvb) { const m = z.area*PRICE.grindMvb; gSub += m; gAdd.push({ label:'MVB — ' + (z.name||'Zone '+(i+1)), price:m }); }
  });
  if (S.grindExtras.trip > 0) { const t = S.grindExtras.trip*PRICE.trip; gSub += t; gAdd.push({ label:'Trip Hazard Removal × ' + S.grindExtras.trip, price:t }); }
  if (S.grindExtras.lip > 0) { const l = S.grindExtras.lip*PRICE.lip; gSub += l; gAdd.push({ label:'Expansion Joint Lip Grind × ' + S.grindExtras.lip, price:l }); }
  if (gSub > 0) sections.push({ key:'grind', category:'⚙️ Concrete Grinding', zoneName:'', desc:'', addons:gAdd, subtotal:gSub });
  S.polishedZones.forEach(function(z,i) {
    if (!z.area) return;
    sections.push({ key:'polished-'+i, category:'✨ Polished Concrete', zoneName:z.name||('Zone '+(i+1)), desc:'Mechanical Polish · ' + z.gloss + ' · ' + z.area + 'm²', addons:[], subtotal:z.area*PRICE.polished });
  });
  S.careZones.forEach(function(z,i) {
    if (!z.area) return;
    const cfg = PRICE.care[z.type] || PRICE.care['Level 2 Refresh Coat'];
    const ns = z.nonslip ? z.area*PRICE.careNonslip : 0;
    const addons = ns > 0 ? [{label:'Non-slip Add-on', price:ns}] : [];
    sections.push({ key:'care-'+i, category:'♻️ Care Plan Refresh', zoneName:z.name||('Zone '+(i+1)), desc:z.type + ' · ' + z.area + 'm²', addons:addons, subtotal:Math.max(cfg.min, z.area*cfg.rate)+ns });
  });
  S.shineZones.forEach(function(z,i) {
    if (!z.area) return;
    const rate = PRICE.shine[z.tier] || 15;
    sections.push({ key:'shine-'+i, category:'🧽 Clean Grip & Shine', zoneName:z.name||('Zone '+(i+1)), desc:z.tier + ' · ' + z.area + 'm²', addons:[], subtotal:z.area*rate });
  });
  let cSub = 0; const cAdd = [];
  S.cracks.forEach(function(c,i) {
    const p = Math.max(PRICE.crackMin, (c.lm||0)*PRICE.crackRate) * (c.qty||1);
    cSub += p;
    cAdd.push({ label:'Crack — ' + c.lm + 'lm × ' + c.qty, price:p });
  });
  if (cSub > 0) sections.push({ key:'cracks', category:'🔧 Concrete Crack Repair', zoneName:'', desc:'', addons:cAdd, subtotal:cSub });
  // Spalling: epoxy mortar and cementitious. Quoted as alternatives, only the chosen one is in the total.
  const spOpt = spallingOptionsActive();
  const spEp = spallingEpoxySection(spOpt), spCm = spallingCemSection(spOpt);
  if (spEp && (!spOpt || S.spallingOpt.include !== 'cem')) sections.push(spEp);
  if (spCm && (!spOpt || S.spallingOpt.include === 'cem')) sections.push(spCm);
  const skA = (S.skim && parseFloat(S.skim.area)) || 0;
  if (skA > 0) {
    const skBy = skA * PRICE.skim, skTot = Math.max(skBy, PRICE.skimMin);
    const skAdd = [{ label:'Skim coat ' + skA + 'm² @ $' + PRICE.skim + '/m²', price:skBy }];
    if (skTot > skBy) skAdd.push({ label:'Minimum callout top-up ($' + PRICE.skimMin + ' min)', price:skTot - skBy });
    sections.push({ key:'skim', category:'🔧 Skim Coat', zoneName:'', desc:'Thin cementitious skim to restore a smooth, even surface' + (S.skim.note ? ' (' + S.skim.note + ')' : ''), addons:skAdd, subtotal:skTot });
  }
  let jSub = 0; const jAdd = [];
  S.joints.forEach(function(j,i) {
    if (!j.lm) return;
    const p = j.lm * (PRICE.joint + (j.routed ? PRICE.routing : 0));
    jSub += p;
    jAdd.push({ label:(j.name||'Joint '+(i+1)) + ' — ' + j.lm + 'lm' + (j.routed?' (incl. routing)':''), price:p });
  });
  if (jSub > 0) sections.push({ key:'joints', category:'📐 Control Joints', zoneName:'', desc:'', addons:jAdd, subtotal:jSub });
  let scSub = 0; const scAdd = [];
  S.softCuts.forEach(function(s,i) {
    if (!s.lm) return;
    const p = s.lm*PRICE.softcut;
    scSub += p;
    scAdd.push({ label:(s.name||'Soft Cut '+(i+1)) + ' — ' + s.lm + 'lm @ $12/lm', price:p });
  });
  if (scSub > 0) sections.push({ key:'softcuts', category:'🔪 Soft Cuts', zoneName:'', desc:'', addons:scAdd, subtotal:scSub });
  let silSub = 0; const silAdd = [];
  S.siliconeJoints.forEach(function(j,i) {
    if (!j.lm) return;
    const p = j.lm * PRICE.silJoint;
    silSub += p;
    silAdd.push({ label:(j.name||'Silicone Joint '+(i+1)) + ' — ' + j.lm + 'lm @ $8/lm', price:p });
  });
  if (silSub > 0) sections.push({ key:'silJoints', category:'📐 Silicone Joint Filling', zoneName:'', desc:'', addons:silAdd, subtotal:silSub });
  let polySub = 0; const polyAdd = [];
  S.polyJoints.forEach(function(j,i) {
    if (!j.lm) return;
    const p = j.lm * PRICE.polyJoint;
    polySub += p;
    polyAdd.push({ label:(j.name||'Polyurethane Joint '+(i+1)) + ' — ' + j.lm + 'lm @ $18/lm', price:p });
  });
  if (polySub > 0) sections.push({ key:'polyJoints', category:'📐 Polyurethane Joint Filling', zoneName:'', desc:'', addons:polyAdd, subtotal:polySub });
  let coreSub = 0; const coreAdd = [];
  S.coreHoles.forEach(function(h,i) {
    if (!(h.qty > 0)) return;
    const p = coreHolePrice(h);
    coreSub += p;
    let lbl = (h.name||'Core Hole '+(i+1)) + ' — ' + h.size + ' × ' + h.qty;
    const extras = [];
    if (h.pvc) extras.push('PVC pipe fitted');
    if (h.silicone) extras.push('silicone sealed');
    if (extras.length) lbl += ' (' + extras.join(', ') + ')';
    coreAdd.push({ label:lbl, price:p });
  });
  if (coreSub > 0) sections.push({ key:'coreDrill', category:'🕳 Core Drilling', zoneName:'', desc:'', addons:coreAdd, subtotal:coreSub });
  let rampSub = 0; const rampAdd = [];
  S.ramps.forEach(function(r,i) {
    if (!r.rise || !r.width) return;
    const c = calcRamp(r);
    rampSub += c.cost;
    const matLabel = c.material === 'rapidset' ? (c.buckets + ' × 10kg Rapidset bucket' + (c.buckets===1?'':'s')) : ('Epoxy + Sand Build-Up, ' + c.batches + ' batch' + (c.batches===1?'':'es'));
    rampAdd.push({ label:(r.name||'Ramp '+(i+1)) + ' — ' + r.rise + 'mm rise × ' + r.width + 'm wide (' + matLabel + ')', price:c.cost });
  });
  const cancerSec = cancerSection(); if (cancerSec) sections.push(cancerSec);
  if (rampSub > 0) sections.push({ key:'ramping', category:'🛠 Ramping / Build-Up Repair', zoneName:'', desc:'', addons:rampAdd, subtotal:rampSub });
  const d = S.demo; const dAdd = []; let dSub = 0;
  if (d.carpet > 0) { const p = d.carpet*PRICE.demo.carpet; dSub += p; dAdd.push({label:'Carpet & Underlay — ' + d.carpet + 'm²', price:p}); }
  if (d.laminate > 0) { const p = d.laminate*PRICE.demo.laminate; dSub += p; dAdd.push({label:'Laminate/Floating Floor — ' + d.laminate + 'm²', price:p}); }
  if (d.vinyl > 0) { const p = d.vinyl*PRICE.demo.vinyl; dSub += p; dAdd.push({label:'Glued Vinyl Removal — ' + d.vinyl + 'm²', price:p}); }
  if (d.tile > 0) { const p = d.tile*PRICE.demo.tile; dSub += p; dAdd.push({label:'Tile Removal, Standard/Large (Glued) — ' + d.tile + 'm²', price:p}); }
  if (d.tileMosaic > 0) { const p = d.tileMosaic*PRICE.demo.tileMosaic; dSub += p; dAdd.push({label:'Tile Removal, Mosaic/Small (Glued) — ' + d.tileMosaic + 'm²', price:p}); }
  if (d.kitchenArea > 0) {
    const bracket = PRICE.kitchenStrip.find(function(b){ return d.kitchenArea <= b.max; });
    const p = bracket ? bracket.price : 0;
    dSub += p;
    dAdd.push({label:'Kitchen Strip-Out — ' + d.kitchenArea + 'm²', price:p});
  }
  if (d.cabinetryLm > 0) { const p = d.cabinetryLm*PRICE.demo.cabinetry; dSub += p; dAdd.push({label:'Overhead/Upper Cabinetry — ' + d.cabinetryLm + 'lm', price:p}); }
  if (dSub > 0) sections.push({ key:'demo', category:'🔨 Demolition & Strip-Out', zoneName:'', desc:'', addons:dAdd, subtotal:dSub });
  wasteSections().forEach(function(s){ sections.push(s); });
  const pwSec = pwSection(); if (pwSec) sections.push(pwSec);
  const lmSec = lmSection(); if (lmSec) sections.push(lmSec);
  const gaList = generalAddonsList();
  if (gaList.length > 0) {
    const gaSub = gaList.reduce(function(s,x){ return s + x.price; }, 0);
    sections.push({ key:'generalAddons', category:'➕ Add-Ons', zoneName:'', desc:'', addons:gaList, subtotal:gaSub });
  }
  if (S.pwUpsell.enabled) {
    const p = S.pwUpsell;
    const pwTierKey = p.doubleStorey ? 'double' : 'single';
    const pwTierLabel = p.doubleStorey ? 'Double Storey' : 'Single Storey';
    let pwSub = PRICE.pwUpsell[pwTierKey][p.beds] || 0;
    const pwAdd = [{ label:pwTierLabel + ' ' + (p.beds==='5'?'5+':p.beds) + ' Bedroom Wash', price:pwSub }];
    if (p.diffAccess) { pwSub += PRICE.pwUpsellMods.diffAccess; pwAdd.push({label:'Difficult Access', price:PRICE.pwUpsellMods.diffAccess}); }
    if (pwSub > 0) sections.push({ key:'pwUpsell', category:'🧼 Pressure Cleaning Upsell', zoneName:'', desc:'Full external house wash — offered post-site-clean', addons:pwAdd, subtotal:pwSub });
  }
  if (S.roofWash.enabled) {
    const r = S.roofWash;
    const roofTierKey = r.doubleStorey ? 'double' : 'single';
    const roofTierLabel = r.doubleStorey ? 'Double Storey' : 'Single Storey';
    let roofSub = PRICE.roofWash[roofTierKey][r.beds] || 0;
    const roofAdd = [{ label:roofTierLabel + ' ' + (r.beds==='5'?'5+':r.beds) + ' Bedroom Roof Wash', price:roofSub }];
    if (roofSub > 0) sections.push({ key:'roofWash', category:'🏠 Roof Cleaning Upsell', zoneName:'', desc:'Soft wash roof clean — offered alongside house wash', addons:roofAdd, subtotal:roofSub });
  }
  commSections().forEach(function(sec){ sections.push(sec); });
  if (S.custom.travelKm > 0) {
    const tDays = Math.max(1, parseInt(S.custom.travelDays) || 1);
    const tKm = S.custom.travelKm * 2 * tDays;
    const tCost = tKm * PRICE.travelRate;
    const tr = S.travel || {};
    const where = tr.mode === 'custom' ? ((tr.place || 'Custom location') + ' — ' + (parseFloat(tr.km) || 0) + 'km one way, ') : (S.client.suburb ? S.client.suburb + ' — ' : '');
    sections.push({ key:'travel', category:'🚗 Travel', zoneName:'', desc:where + S.custom.travelKm + 'km each way beyond ' + PRICE.travelFreeKm + 'km free zone, return trip x ' + tDays + ' day' + (tDays>1?'s':'') + ' = ' + tKm.toFixed(1) + 'km @ $' + PRICE.travelRate + '/km', addons:[], subtotal:tCost });
  }

  (function(){
    if (!S.coatingMinOn) return;
    var prefixes = ['epoxy-','tinted-','gs-','polished-'];
    var area = 0, sub = 0;
    S.epoxyZones.forEach(function(z){ area += (z.area||0); });
    S.tintedZones.forEach(function(z){ area += (z.area||0); });
    S.gsZones.forEach(function(z){ area += (z.area||0); });
    S.polishedZones.forEach(function(z){ area += (z.area||0); });
    if (area <= 0 || area >= PRICE.coatingMinArea) return;
    sections.forEach(function(sec){
      prefixes.forEach(function(pfx){ if (sec.key.indexOf(pfx) === 0) sub += sec.subtotal; });
    });
    if (sub <= 0 || sub >= PRICE.coatingMinJob) return;
    sections.push({ key:'coatingMin', category:'📏 Small Job Minimum', zoneName:'',
      desc:'Coating work under ' + PRICE.coatingMinArea + 'm² (' + area + 'm²) — minimum charge $' + PRICE.coatingMinJob,
      addons:[], subtotal: PRICE.coatingMinJob - sub });
  })();
  return sections;
}
const CEM_WARRANTY_NOTE = "Cementitious repairs: Poxit Flooring's workmanship warranty does not cover the repaired areas, or any coating failure caused by them. Statutory warranties under Queensland law still apply.";
function spallingEpoxySection(asOption) {
  const sp = S.spalling || {};
  const sub = (sp.small||0)*PRICE.spall.small + (sp.med||0)*PRICE.spall.med + (sp.large||0)*PRICE.spall.large + (sp.area||0)*PRICE.spall.area;
  if (!(sub > 0)) return null;
  const sa = [];
  if (sp.small>0) sa.push({label:'Small × ' + sp.small, price:sp.small*PRICE.spall.small});
  if (sp.med>0) sa.push({label:'Medium × ' + sp.med, price:sp.med*PRICE.spall.med});
  if (sp.large>0) sa.push({label:'Large × ' + sp.large, price:sp.large*PRICE.spall.large});
  if (sp.area>0) sa.push({label:'Patched Area ' + sp.area + 'm²', price:sp.area*PRICE.spall.area});
  return { key:'spalling', category:'🔧 Spalling Repair (Epoxy Mortar)' + (asOption ? ': Option 1' : ''), zoneName:'', desc:'', addons:sa, subtotal:sub };
}
function spallingCemSection(asOption) {
  const sp = S.spallingCem || {};
  const sub = (sp.small||0)*PRICE.spallCem.small + (sp.med||0)*PRICE.spallCem.med + (sp.large||0)*PRICE.spallCem.large;
  if (!(sub > 0)) return null;
  const sa = [];
  if (sp.small>0) sa.push({label:'Small × ' + sp.small, price:sp.small*PRICE.spallCem.small});
  if (sp.med>0) sa.push({label:'Medium × ' + sp.med, price:sp.med*PRICE.spallCem.med});
  if (sp.large>0) sa.push({label:'Large × ' + sp.large, price:sp.large*PRICE.spallCem.large});
  return { key:'spallCem', category:'🔧 Spalling Repair (Cementitious)' + (asOption ? ': Option 2' : ''), zoneName:'', desc:'', addons:sa, subtotal:sub };
}
function spallingOptionsActive() {
  return !!(S.spallingOpt && S.spallingOpt.alternatives && spallingEpoxySection() && spallingCemSection());
}
function totalsFor(sections) {
  let base = 0; sections.forEach(function(s){ base += effSub(s); });
  let customItems = 0; S.custom.items.forEach(function(ci){ customItems += (ci.price||0); });
  const adjustment = getAdjustment(base + customItems);
  const exGst = base + customItems + adjustment;
  return { exGst: exGst, gst: exGst * 0.1, incGst: exGst * 1.1 };
}
function spallingOptions() {
  if (!spallingOptionsActive()) return null;
  const others = buildSections().filter(function(s){ return s.key !== 'spalling' && s.key !== 'spallCem'; });
  const ep = spallingEpoxySection(true), cm = spallingCemSection(true);
  const include = S.spallingOpt.include === 'cem' ? 2 : 1;
  return { include: include, options: [
    { n:1, key:'epoxy', name:'Spalling Repair (Epoxy Mortar)', section:ep, price:effSub(ep), totals:totalsFor(others.concat([ep])) },
    { n:2, key:'cem', name:'Spalling Repair (Cementitious)', section:cm, price:effSub(cm), totals:totalsFor(others.concat([cm])) }
  ]};
}
function cementitiousOnQuote() { return !!spallingCemSection(); }
function cemWarrantyHTML() {
  return '<p style="font-size:11.5px;line-height:1.7;color:#333;margin-top:8px;"><strong>Cementitious repairs:</strong>' + CEM_WARRANTY_NOTE.replace(/^Cementitious repairs:/, '') + '</p>';
}
function spallingOptionsDocHTML() {
  const o = spallingOptions();
  if (!o) return '';
  const other = o.options[2 - o.include];
  let h = '<div class="payment-box" style="margin-top:16px;"><div class="payment-title">Spalling Repair Options</div>';
  o.options.forEach(function(x) {
    const inc = x.n === o.include;
    h += '<div class="payment-row"><div><strong>Option ' + x.n + ': ' + x.name + '</strong>' + (inc ? ' (included in the Contract Price)' : '') +
      '<br><span style="font-size:10.5px;color:#777;">' + x.section.addons.map(function(a){ return a.label; }).join(' · ') + '</span></div>' +
      '<div class="p-amount">' + fmt(x.price) + ' ex GST</div></div>' +
      '<div class="payment-row"><div>Quote total with Option ' + x.n + ' (inc GST)</div><div class="p-amount">' + fmt(x.totals.incGst) + '</div></div>';
  });
  h += '<p style="font-size:11px;line-height:1.6;color:#555;margin:8px 0 0;">The Contract Price above includes Option ' + o.include + '. Choose Option ' + other.n + ' instead and the total becomes ' + fmt(other.totals.incGst) + ' inc GST.</p></div>';
  return h;
}
const COMM_SYSTEMS = ['Hychem Premium', 'Sika Standard'];
const HYCHEM_SPEC = '4 coat floor system, approx 2 mm build with sand broadcast. Walls 3 coats plus filler. Coved junctions. Hyflex NS sealed joints. 15 to 20 year design life.';
function commNum(v) { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }
function commQty(a) { return Math.max(1, Math.floor(commNum(a.qty) || 1)); }
function commUnit(a, system) {
  const P = PRICE.comm[system] || PRICE.comm['Hychem Premium'];
  const floor = commNum(a.floor) * P.floor, wall = commNum(a.wall) * P.wall, coving = commNum(a.coving) * P.coving;
  const jRate = (PRICE.commJoint[a.jointType] || PRICE.commJoint['Hyflex NS']) + (a.routing ? PRICE.commRouting : 0);
  const joints = commNum(a.joints) * jRate;
  return { floor: floor, wall: wall, coving: coving, joints: joints, jRate: jRate, total: floor + wall + coving + joints };
}
function commDiscountFor(areaTotals, unitTotals) {
  const d = S.commDiscount || {}, sub = areaTotals.reduce(function(t, x){ return t + x; }, 0);
  if (!sub) return 0;
  if (d.type === 'lastfree') return unitTotals.length ? unitTotals[unitTotals.length - 1] : 0; // one unit of the last area
  if (d.type === 'flat') return Math.min(commNum(d.amount), sub);
  if (d.type === 'pct') return sub * Math.min(commNum(d.amount), 100) / 100;
  return 0;
}
function commDiscountLabel() {
  const d = S.commDiscount || {};
  if (d.label && d.label.trim()) return d.label.trim();
  if (d.type === 'lastfree') return 'Discount: last area free';
  if (d.type === 'pct') return 'Discount (' + commNum(d.amount) + '%)';
  return 'Discount';
}
function commAreaDesc(a) {
  const parts = [];
  if (commNum(a.floor)) parts.push('Floor ' + commNum(a.floor) + 'm²');
  if (commNum(a.wall)) parts.push('Walls ' + commNum(a.wall) + 'm²');
  if (commNum(a.coving)) parts.push('Coving ' + commNum(a.coving) + 'lm');
  if (commNum(a.joints)) parts.push('Joints ' + commNum(a.joints) + 'lm ' + (a.jointType || 'Hyflex NS') + (a.routing ? ' (routed)' : ''));
  return parts.join(' · ');
}
function commSections(forceSystem) {
  const areas = (S.commAreas || []).filter(function(a){ return commUnit(a, a.system).total > 0; });
  if (!areas.length) return [];
  const secs = [], totals = [], units = [];
  areas.forEach(function(a) {
    const sys = forceSystem || (COMM_SYSTEMS.indexOf(a.system) > -1 ? a.system : 'Hychem Premium');
    const P = PRICE.comm[sys], u = commUnit(a, sys), q = commQty(a);
    const add = [];
    if (u.floor) add.push({ label:'Floor ' + commNum(a.floor) + 'm² @ $' + P.floor + '/m²', price: u.floor * q });
    if (u.wall) add.push({ label:'Walls ' + commNum(a.wall) + 'm² @ $' + P.wall + '/m²', price: u.wall * q });
    if (u.coving) add.push({ label:'Coving ' + commNum(a.coving) + 'lm @ $' + P.coving + '/lm', price: u.coving * q });
    if (u.joints) add.push({ label:'Joints ' + (a.jointType || 'Hyflex NS') + ' ' + commNum(a.joints) + 'lm @ $' + u.jRate + '/lm' + (a.routing ? ' incl. routing' : ''), price: u.joints * q });
    if (q > 1) add.push({ label:q + ' identical areas at ' + fmt(u.total) + ' each', price: u.total * q });
    const i = S.commAreas.indexOf(a);
    secs.push({ key:'comm-' + i, category:'🏭 ' + sys + ' System', zoneName:(a.name || 'Area ' + (i + 1)) + (q > 1 ? ' × ' + q : ''),
                desc: commAreaDesc(a), addons: add, subtotal: u.total * q, commSystem: sys });
    totals.push(u.total * q); units.push(u.total);
  });
  const disc = commDiscountFor(totals, units);
  if (disc > 0) secs.push({ key:'comm-discount', category: commDiscountLabel(), zoneName:'', desc:'', addons:[], subtotal: -disc });
  return secs;
}
function commComparison() {
  if (!commSections().length) return null;
  const others = buildSections().filter(function(s){ return s.key.indexOf('comm-') !== 0; });
  const chosen = {}; (S.commAreas || []).forEach(function(a){ if (commUnit(a, a.system).total > 0) chosen[a.system] = 1; });
  const picked = Object.keys(chosen).length === 1 ? Object.keys(chosen)[0] : '';
  return { picked: picked, systems: COMM_SYSTEMS.map(function(sys) {
    // the picked system uses the quote's own (possibly edited) lines so it matches the Quote Total
    const secs = sys === picked ? buildSections().filter(function(s){ return s.key.indexOf('comm-') === 0; }) : commSections(sys);
    const sub = secs.reduce(function(t, x){ return t + effSub(x); }, 0);
    return { system: sys, sections: secs, subtotal: sub, totals: totalsFor(others.concat(secs)) };
  })};
}
function commComparisonDocHTML() {
  const cmp = commComparison();
  if (!cmp) return '';
  const H = cmp.systems[0], K = cmp.systems[1];
  const areaRows = H.sections.filter(function(x){ return x.key !== 'comm-discount'; }).map(function(h) {
    const k = K.sections.filter(function(x){ return x.key === h.key; })[0];
    return '<tr><td>' + (h.zoneName || h.category) + '</td><td class="price-col">' + fmt(effSub(h)) + '</td><td class="price-col">' + (k ? fmt(effSub(k)) : '') + '</td></tr>';
  }).join('');
  const hd = H.sections.filter(function(x){ return x.key === 'comm-discount'; })[0], kd = K.sections.filter(function(x){ return x.key === 'comm-discount'; })[0];
  const discRow = (hd || kd) ? '<tr><td>' + (hd || kd).category + '</td><td class="price-col">' + (hd ? fmt(effSub(hd)) : '') + '</td><td class="price-col">' + (kd ? fmt(effSub(kd)) : '') + '</td></tr>' : '';
  const note = cmp.picked ? 'The Quote Total above is based on ' + cmp.picked + '.' : 'The Quote Total above is based on the system shown for each area.';
  return '<div class="payment-box" style="margin-top:16px;"><div class="payment-title">Choose Your System</div>' +
    '<table class="totals-table" style="width:100%;"><tr><td><strong>Area</strong></td><td class="price-col"><strong>Hychem Premium</strong></td><td class="price-col"><strong>Sika Standard</strong></td></tr>' +
    areaRows + discRow +
    '<tr class="total-ex"><td>System subtotal (ex GST)</td><td class="price-col">' + fmt(H.subtotal) + '</td><td class="price-col">' + fmt(K.subtotal) + '</td></tr>' +
    '<tr class="total-inc"><td>Quote Total (inc GST)</td><td class="price-col">' + fmt(H.totals.incGst) + '</td><td class="price-col">' + fmt(K.totals.incGst) + '</td></tr></table>' +
    '<p style="font-size:11px;line-height:1.6;color:#555;margin:8px 0 0;">' + note + '</p></div>';
}
function commSpecDocHTML() {
  if (!commSections().length) return '';
  const esc = function(t){ return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  return '<div class="section-heading"><span class="section-title">System Specifications</span></div>' +
    '<div class="notes-box"><strong>Hychem Premium</strong><br>' + esc(HYCHEM_SPEC) + '</div>' +
    '<div class="notes-box" style="margin-top:8px;"><strong>Sika Standard</strong><br>' + esc(S.commSikaSpec || 'Sika commercial epoxy floor and wall system').replace(/\n/g, '<br>') + '</div>';
}
function leNum(v) { if (v === '' || v === null || v === undefined) return null; const n = parseFloat(v); return isFinite(n) ? n : null; }
function lineQtyText(qty, unit, rate) {
  if (qty === null || qty === undefined) return '';
  return qty + (unit ? ' ' + unit : '') + (rate !== null && rate !== undefined ? ' @ ' + fmt(rate) + (unit ? '/' + unit : '') : '');
}
function applyLineEdits(sections) {
  const E = S.lineEdits || {};
  const out = [];
  sections.forEach(function(sec) {
    const e = E[sec.key];
    if (!e) { out.push(sec); return; }
    if (e.deleted) return;
    const x = Object.assign({}, sec, { addons: sec.addons.slice(), edited: true, originalSubtotal: sec.subtotal });
    if (e.name !== undefined) { x.category = e.name; x.zoneName = ''; }
    if (e.desc !== undefined) x.desc = e.desc;
    const q = leNum(e.qty), r = leNum(e.rate), a = leNum(e.amount);
    // a typed amount wins and the rate is worked back from it; otherwise qty × rate
    if (q !== null) { x.qty = q; x.unit = e.unit || ''; x.rate = (a !== null && q) ? a / q : r; }
    if (a !== null) x.subtotal = a; else if (q !== null && r !== null) x.subtotal = q * r;
    x.qtyText = lineQtyText(x.qty, x.unit, x.rate);
    out.push(x);
  });
  return out;
}
function customRowsHTML() {
  return S.custom.items.map(function(ci) {
    if (!ci.price) return '';
    const qt = lineQtyText(leNum(ci.qty), ci.unit, leNum(ci.rate));
    return '<tr class="zone-row"><td><span class="zone-cat">' + (ci.desc || 'Custom Item') + '</span>' +
      (ci.note ? '<br><span class="zone-desc">' + String(ci.note).replace(/\n/g, '<br>') + '</span>' : '') +
      (qt ? '<br><span class="zone-desc">' + qt + '</span>' : '') +
      '</td><td class="price-col zone-price">' + fmt(ci.price) + '</td></tr>';
  }).join('');
}
function effSub(sec) {
  const ov = S.overrides[sec.key];
  return (ov !== undefined && ov !== null && ov !== '') ? parseFloat(ov) : sec.subtotal;
}
function getAdjustment(base) {
  const t = S.custom.adjustType, a = S.custom.adjustAmount || 0;
  if (t === 'none' || a === 0) return 0;
  if (t === 'discount_pct') return -(base*a/100);
  if (t === 'discount_flat') return -a;
  if (t === 'markup_pct') return base*a/100;
  if (t === 'markup_flat') return a;
  return 0;
}
function fmt(n) { return (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function docCSS() {
  return "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Open+Sans:wght@400;600;700&display=swap');" +
  "*{margin:0;padding:0;box-sizing:border-box;}" +
  "body{font-family:'Open Sans',sans-serif;font-size:12px;color:#1a1a1a;background:#fff;max-width:800px;margin:0 auto;}" +
  ".doc-header{background:#0a0a0a;padding:32px 40px 24px;text-align:center;}" +
  ".logo-main{font-family:'Montserrat',sans-serif;font-size:38px;font-weight:800;color:#fff;letter-spacing:4px;line-height:1;}" +
  ".logo-sub{font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;color:#fff;letter-spacing:5px;margin-top:2px;}" +
  ".doc-type-gold{font-family:'Montserrat',sans-serif;font-size:10px;font-weight:700;color:#0ABAB5;letter-spacing:3px;text-transform:uppercase;margin-top:10px;}" +
  ".doc-type-white{font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;margin-top:4px;}" +
  ".doc-company{font-family:'Open Sans',sans-serif;font-size:10px;color:#bbb;letter-spacing:0.5px;margin-top:10px;}" +
  ".gold-rule{height:4px;background:#0ABAB5;}" +
  ".doc-body{padding:28px 40px;}" +
  ".inv-badge{display:inline-block;background:#0ABAB5;color:white;font-family:'Montserrat',sans-serif;font-weight:700;font-size:11px;letter-spacing:2px;padding:4px 12px;border-radius:4px;margin-bottom:16px;}" +
  ".client-box{border:1px solid #ccc;border-radius:3px;margin-bottom:24px;overflow:hidden;}" +
  ".client-row{display:flex;border-bottom:1px solid #e8e8e8;align-items:baseline;padding:7px 14px;}" +
  ".client-row:last-child{border-bottom:none;}" +
  ".client-label{font-family:'Montserrat',sans-serif;font-weight:700;font-size:11px;min-width:140px;flex-shrink:0;}" +
  ".client-value{font-size:12px;color:#333;border-bottom:1px solid #999;flex:1;padding-bottom:1px;min-height:16px;}" +
  ".section-heading{display:flex;align-items:center;gap:8px;margin:22px 0 8px;padding-bottom:5px;border-bottom:1.5px solid #0ABAB5;}" +
  ".section-num{font-family:'Montserrat',sans-serif;font-weight:800;font-size:13px;color:#0ABAB5;}" +
  ".section-title{font-family:'Montserrat',sans-serif;font-weight:800;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;}" +
  ".scope-table{width:100%;border-collapse:collapse;margin-bottom:8px;}" +
  ".scope-table td{padding:5px 4px;vertical-align:top;}" +
  ".price-col{text-align:right;white-space:nowrap;min-width:80px;}" +
  ".zone-row td{padding-top:8px;}" +
  ".zone-cat{font-family:'Montserrat',sans-serif;font-weight:700;font-size:11.5px;}" +
  ".zone-name{font-family:'Montserrat',sans-serif;font-weight:600;font-size:11.5px;color:#555;}" +
  ".zone-desc{font-size:10.5px;color:#777;font-style:italic;}" +
  ".zone-price{font-family:'Montserrat',sans-serif;font-weight:600;font-size:12px;}" +
  ".addon-row td{padding:2px 4px 2px 16px;}" +
  ".addon-label{font-size:11px;color:#555;}" +
  ".addon-price{font-size:11px;color:#555;}" +
  ".spacer-row td{height:6px;}" +
  ".totals-table{width:100%;border-collapse:collapse;margin-top:8px;}" +
  ".totals-table td{padding:5px 4px;}" +
  ".totals-table .price-col{font-family:'Montserrat',sans-serif;font-weight:700;}" +
  ".total-ex{font-size:12px;color:#555;border-top:1px solid #e0e0e0;}" +
  ".total-gst{font-size:11px;color:#888;}" +
  ".total-inc{font-size:15px;font-family:'Montserrat',sans-serif;font-weight:800;border-top:2px solid #0ABAB5;padding-top:8px;}" +
  ".total-inc .price-col{color:#0ABAB5;font-size:16px;}" +
  ".payment-box{border:1.5px solid #0ABAB5;border-radius:6px;padding:14px 16px;margin-top:8px;}" +
  ".payment-title{font-family:'Montserrat',sans-serif;font-weight:700;font-size:12px;color:#0ABAB5;margin-bottom:8px;text-transform:uppercase;}" +
  ".payment-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0f0;font-size:12px;}" +
  ".payment-row:last-child{border-bottom:none;font-weight:700;}" +
  ".payment-row .p-amount{font-family:'Montserrat',sans-serif;font-weight:700;}" +
  ".payment-row.due .p-amount{color:#0ABAB5;font-size:14px;}" +
  ".bank-box{background:#f9f8f6;border:1px solid #e0ddd8;border-radius:4px;padding:10px 14px;margin-top:10px;font-size:11.5px;line-height:1.8;}" +
  ".terms-select{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;}" +
  ".terms-btn{padding:6px 14px;border:1.5px solid #0ABAB5;border-radius:20px;font-family:'Montserrat',sans-serif;font-size:11px;font-weight:600;cursor:pointer;background:white;color:#0ABAB5;}" +
  ".terms-btn.active{background:#0ABAB5;color:white;}" +
  ".disclaimer{font-size:10px;color:#999;font-style:italic;margin-top:6px;line-height:1.5;}" +
  ".notes-box{background:#f9f8f6;border:1px solid #e0ddd8;border-radius:3px;padding:10px 14px;margin-top:8px;font-size:11.5px;line-height:1.6;color:#333;}" +
  ".doc-footer{margin-top:28px;padding:12px 40px;border-top:1px solid #e0e0e0;text-align:center;font-size:10px;color:#aaa;line-height:1.8;}" +
  "@media print{.terms-select{display:none !important;}body{max-width:100%;}.doc-body{padding:20px 30px;}}";
}
const COMPANY = {
  legalName:   'Poxit Flooring Pty Ltd',
  tradingName: 'Poxit Flooring',
  abn:         '23 702 727 535',
  acn:         '702 727 535',
  gstRegistered: true,
  office:      '1/12 Dorretti Circuit, Upper Coomera QLD 4209',
  director:    'Dominic Amsteins',
  directorTitle: 'Director',
  phone:       '0478 495 995',
  email:       'poxitflooring@gmail.com',
  web:         'www.poxitflooring.com.au',
  bankAccountName: 'Poxit Flooring Pty Ltd',
  bankBSB:     '067 873',
  bankAccount: '26553862'
};
const SOLE_TRADER = {
  legalName:   'Poxit Flooring',
  tradingName: 'Poxit Flooring',
  abn:         '11 743 009 073',
  acn:         '',
  gstRegistered: true,
  office:      'Gold Coast, QLD',
  director:    'Dominic Amsteins',
  directorTitle: 'Sole Trader',
  phone:       '0478 495 995',
  email:       'poxitflooring@gmail.com',
  web:         'www.poxitflooring.com.au',
  bankAccountName: 'Poxit Flooring',
  bankBSB:     '067 873',
  bankAccount: '17789072'
};
const ENTITIES = { 'Company': COMPANY, 'Sole Trader': SOLE_TRADER };
const ENTITY_CHANGEOVER_MS = Date.UTC(2026, 9, 14, 14, 0, 0);
function entityForKey(key) {
  const m = String(key || '').match(/^PXT-(\d{12,})$/);
  if (!m) return 'Company';
  return parseInt(m[1], 10) < ENTITY_CHANGEOVER_MS ? 'Sole Trader' : 'Company';
}
function docEntity() { return ENTITIES[S.client && S.client.entity] || COMPANY; }
function companyIdLine() {
  const E = docEntity();
  return E.legalName + '&nbsp;&nbsp;|&nbsp;&nbsp;ABN ' + E.abn + (E.acn ? '&nbsp;&nbsp;|&nbsp;&nbsp;ACN ' + E.acn : '');
}
function docHeader(docType) {
  return '<div class="doc-header"><div class="logo-main">POXIT</div><div class="logo-sub">FLOORING</div>' +
    '<div class="doc-type-gold">CONCRETE REPAIR &amp; COATING SPECIALISTS</div><div class="doc-type-white">' + docType + '</div>' +
    '<div class="doc-company">' + companyIdLine() + '</div></div><div class="gold-rule"></div>';
}
function docFooter() {
  const E = docEntity();
  return '<div class="doc-footer"><span>' + E.legalName + '</span> · <span>ABN ' + E.abn + '</span>' + (E.acn ? ' · <span>ACN ' + E.acn + '</span>' : '') + ' · <span>' + E.office + '</span> · <span>' + E.phone + '</span> · <span>' + E.email + '</span> · <span>' + E.web + '</span></div>';
}
function scopeRowsHTML(sections, withPrices) {
  return sections.map(function(sec) {
    const addonRows = sec.addons.map(function(a) {
      return withPrices
        ? '<tr class="addon-row"><td class="addon-label">↳ ' + a.label + '</td><td class="addon-price price-col">' + fmt(a.price) + '</td></tr>'
        : '<tr class="addon-row"><td class="addon-label" colspan="2">↳ ' + a.label + '</td></tr>';
    }).join('');
    return '<tr class="zone-row"><td><span class="zone-cat">' + sec.category + '</span>' +
      (sec.zoneName ? '<span class="zone-name"> — ' + sec.zoneName + '</span>' : '') +
      (sec.desc ? '<br><span class="zone-desc">' + String(sec.desc).replace(/\n/g, '<br>') + '</span>' : '') +
      (sec.qtyText ? '<br><span class="zone-desc">' + sec.qtyText + '</span>' : '') + '</td>' +
      '<td class="price-col zone-price">' + fmt(effSub(sec)) + '</td></tr>' + addonRows;
  }).join('<tr class="spacer-row"><td colspan="2"></td></tr>');
}
function quoteDocHtml() {
  const c = S.client;
  const client = (c.first + ' ' + c.last).trim() || '—';
  const sections = buildSections();
  let base = 0; sections.forEach(function(s){ base += effSub(s); });
  let customItems = 0; S.custom.items.forEach(function(ci){ customItems += (ci.price||0); });
  const adjustment = getAdjustment(base + customItems);
  const total = base + customItems + adjustment;
  const gst = total*0.1, incGst = total+gst;
  let rows = scopeRowsHTML(sections, showPricingBreakdown);
  rows += customRowsHTML();
  if (adjustment !== 0) rows += '<tr class="zone-row"><td><span class="zone-cat">' + (adjustment<0?'Discount':'Markup') + '</span></td><td class="price-col zone-price">' + (adjustment<0?'-':'+') + fmt(Math.abs(adjustment)) + '</td></tr>';
  const html = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<title>' + docFileName('Quote', c.ref) + '</title><style>' + docCSS() + '</style></head><body>' +
    docHeader('QUOTE / SCOPE OF WORKS') +
    '<div class="doc-body"><div class="client-box">' +
    '<div class="client-row"><div class="client-label">Client Full Name:</div><div class="client-value">' + client + '</div></div>' +
    '<div class="client-row"><div class="client-label">Phone:</div><div class="client-value">' + (c.phone||'—') + '</div></div>' +
    '<div class="client-row"><div class="client-label">Email:</div><div class="client-value">' + (c.email||'—') + '</div></div>' +
    '<div class="client-row"><div class="client-label">Site Address:</div><div class="client-value">' + ((c.address||'') + (c.suburb ? (c.address ? ', ' : '') + c.suburb : '') || '—') + '</div></div>' +
    '<div class="client-row"><div class="client-label">Quote Reference #:</div><div class="client-value">' + (c.ref||'—') + '</div></div>' +
    '<div class="client-row"><div class="client-label">Date:</div><div class="client-value">' + (c.date||'—') + '</div></div>' +
    '<div class="client-row"><div class="client-label">Quote Valid Until:</div><div class="client-value">' + (c.valid||'—') + '</div></div></div>' +
    '<div class="section-heading"><span class="section-num">1.</span><span class="section-title">Scope of Work</span></div>' +
    '<table class="scope-table">' + rows + '</table>' +
    '<div class="section-heading"><span class="section-num">2.</span><span class="section-title">Contract Price</span></div>' +
    '<table class="totals-table">' +
    '<tr class="total-ex"><td>Total (Ex-GST)</td><td class="price-col">' + fmt(total) + '</td></tr>' +
    '<tr class="total-gst"><td>GST (10%)</td><td class="price-col">' + fmt(gst) + '</td></tr>' +
    '<tr class="total-inc"><td>Quote Total (Inc GST)</td><td class="price-col">' + fmt(incGst) + '</td></tr></table>' +
    '<div class="disclaimer">This price is based on visible and reasonably assessable conditions at the time of quoting only. Price does not account for hidden subsurface conditions, scope changes, or variations.</div>' +
    commComparisonDocHTML() +
    spallingOptionsDocHTML() +
    '<div class="section-heading"><span class="section-num">3.</span><span class="section-title">Payment Terms</span></div>' +
    '<p style="font-size:11.5px;line-height:1.7;color:#333;">All quotes are valid for <strong>30 days</strong> from the date of issue. A <strong>50% non-refundable deposit</strong> is required to confirm booking and reserve the job date. Remaining 50% is due on <strong>completion of work before Poxit leaves the site</strong>.</p>' +
    (cementitiousOnQuote() ? cemWarrantyHTML() : '') +
    pwPlanDocHTML(S.pwPlan && S.pwPlan.showQuote) +
    (c.clientNotes ? '<div class="section-heading"><span class="section-num">4.</span><span class="section-title">Notes</span></div><div class="notes-box">' + c.clientNotes.replace(/\n/g,'<br>') + '</div>' : '') +
    (S.custom.carePromo ? '<div class="payment-box" style="margin-top:16px;"><div class="payment-title">Protect Your New Floor — Poxit Care Plan</div><p style="font-size:11.5px;line-height:1.7;color:#333;">Keep your floor protected and looking brand new with a Poxit Care Plan — scheduled professional maintenance visits, priority booking, and member-only rates. Ask your Poxit specialist for details or reply to this quote to find out more.</p></div>' : '') +
    commSpecDocHTML() +
    '</div>' + docFooter() +
    '<scr' + 'ipt>window.onload = function(){ window.print(); };</scr' + 'ipt></body></html>';
  return html;
}
function quoteServiceNames(payload) {
  try {
    const st = (typeof payload === 'string' ? JSON.parse(payload) : payload);
    const sv = (st && st.state && st.state.services) || {};
    const names = SERVICES.filter(function(x){ return sv[x.key]; })
      .map(function(x){ return x.name.replace(/&amp;/g,'&'); });
    if (st && st.state) {
      const ex = st.state;
      if (ex.pwJob && ex.pwZones && ex.pwZones.length) names.push('Pressure Washing');
      if (ex.pwPlan && ex.pwPlan.enabled && ex.pwPlan.area > 0) names.push('Pressure Clean Plan');
      if (ex.lmLines && ex.lmLines.length) names.push('Line Marking');
      if (ex.commAreas && ex.commAreas.length) names.push('Commercial & Chemical Resistant Systems');
      if (ex.skim && ex.skim.area > 0) names.push('Skim Coat');
      if (ex.cancerPatches && ex.cancerPatches.length) names.push('Concrete Cancer');
      if (ex.demo && Object.keys(ex.demo).some(function(k){ return ex.demo[k] > 0; })) names.push('Demolition');
    }
    return names;
  } catch(e) { return []; }
}
const DOC_SHORT = { 'Commercial & Chemical Resistant Systems':'Commercial System', 'Epoxy Flooring':'Epoxy', 'Cleaning & Sealing':'Clean and Seal', 'Grind & Seal':'Grind and Seal', 'Concrete Grinding':'Grinding', 'Polished Concrete':'Polished Concrete', 'Care Plan Refresh':'Care Plan', 'Clean Grip & Shine':'Grip and Shine', 'Pressure Clean Plan':'Clean Plan', 'Concrete Cancer':'Concrete Repair' };
function docJobLabel() {
  const names = quoteServiceNames({ state:S });
  if (!names.length) return '';
  const pick = names.indexOf(S.docService) > -1 ? S.docService : names[0];
  return DOC_SHORT[pick] || pick;
}
function docAreaLabel() {
  const a = (S.client.area || '').trim();
  if (a) return a;
  const arrs = ['epoxyZones','tintedZones','sealZones','gsZones','grindZones','polishedZones','careZones','shineZones','aquaZones'];
  for (let i = 0; i < arrs.length; i++) {
    const z = (S[arrs[i]] || []).find(function(x){ return x && x.name && x.name.trim(); });
    if (z) return z.name.trim();
  }
  return '';
}
function docFileName(kind, ref) {
  const c = S.client;
  const job = docJobLabel();
  const parts = [ (c.first + ' ' + c.last).trim(), docAreaLabel(), (job ? job + ' ' : '') + kind, ref || '' ]
    .map(function(x){ return String(x).replace(/[\/\\:*?"<>|]/g,'').replace(/\s+/g,' ').trim(); })
    .filter(Boolean);
  return parts.join(' - ');
}
function driveQuoteName() {
  const c = S.client;
  const addr = [c.address, c.suburb].map(function(x){ return String(x || '').trim(); }).filter(Boolean).join(', ');
  return [c.ref, (c.first + ' ' + c.last).trim(), addr]
    .map(function(x){ return String(x || '').replace(/[\/\\:*?"<>|]/g,'').replace(/\s+/g,' ').trim(); })
    .filter(Boolean).join(' - ') + '.pdf';
}
const LOCATIONS = ['Internal','External','Both'];
function cleanSnapText(v) {
  return String(v || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/^[^A-Za-z0-9$(]+/, '').replace(/\s+/g, ' ').trim();
}
function quoteSnapshot() {
  const c = S.client;
  const sections = buildSections();
  let base = 0; sections.forEach(function(sec){ base += effSub(sec); });
  let customItems = 0; S.custom.items.forEach(function(ci){ customItems += (ci.price||0); });
  const adjustment = getAdjustment(base + customItems);
  const total = base + customItems + adjustment;
  const lines = sections.map(function(sec) {
    return { category: cleanSnapText(sec.category), zoneName: cleanSnapText(sec.zoneName), desc: cleanSnapText(sec.desc),
             amount: r2(effSub(sec)), addons: sec.addons.map(function(a){ return cleanSnapText(a.label); }) };
  });
  S.custom.items.forEach(function(ci) {
    if (ci.price) lines.push({ category: cleanSnapText(ci.desc) || 'Custom Item', zoneName:'', desc: cleanSnapText([ci.note, lineQtyText(leNum(ci.qty), ci.unit, leNum(ci.rate))].filter(Boolean).join(' · ')), amount: r2(ci.price), addons: [] });
  });
  const so = spallingOptions();
  const options = so ? so.options.map(function(x){ return { option: x.n, name: x.name, exGst: r2(x.price), quoteIncGst: r2(x.totals.incGst), inTotal: x.n === so.include }; }) : [];
  const notes = sections.some(function(x){ return x.key === 'spallCem'; }) ? [CEM_WARRANTY_NOTE] : [];
  return { exGst: r2(total), gst: r2(total * 0.1), incGst: r2(total * 1.1), adjustment: r2(adjustment), lines: lines, options: options, notes: notes,
           ref: c.ref, service: docJobLabel(),
           client: { name: (c.first + ' ' + c.last).replace(/\s+/g, ' ').trim(), phone: c.phone, email: c.email,
                     address: c.address, suburb: c.suburb, area: c.area } };
}
function applyRestoredPayload(payload) {
  if (payload.state) {
    S = Object.assign(freshState(), payload.state);
    if (!S.overrides) S.overrides = {};
    if (!S.custom) S.custom = { adjustType:'none', adjustAmount:0, items: [], travelKm:0, travelDays:1, carePromo:false };
    if (S.custom.travelKm === undefined) S.custom.travelKm = 0;
    if (!S.custom.travelDays || S.custom.travelDays < 1) S.custom.travelDays = 1;
    if (S.coatingMinOn === undefined) S.coatingMinOn = true;
    if (S.client && S.client.suburb === undefined) S.client.suburb = '';
    if (S.client && S.client.area === undefined) S.client.area = '';
    if (S.client && LOCATIONS.indexOf(S.client.location) < 0) S.client.location = '';
    if (S.client && !ENTITIES[S.client.entity]) S.client.entity = entityForKey(S.saveKey);
    if (S.docService === undefined) S.docService = '';
    if (S.saveKey === undefined) S.saveKey = '';
    if (S.custom.carePromo === undefined) S.custom.carePromo = false;
    if (!S.coreHoles) S.coreHoles = [];
    if (!payload.state.auto) S.auto = { days:false, travel:false, waste:false };
    if (!S.travel || typeof S.travel !== 'object') S.travel = { mode:'suburb', place:'', km:0 };
    if (!S.generalAddons) S.generalAddons = freshState().generalAddons;
    if (!S.roofWash) S.roofWash = freshState().roofWash;
    if (!S.cancerPatches) S.cancerPatches = [];
    if (S.cancerRebarLm === undefined) S.cancerRebarLm = 0;
    if (!S.pwZones) S.pwZones = [];
    if (!S.pwJob) S.pwJob = freshState().pwJob;
    if (!S.pwPlan) S.pwPlan = freshState().pwPlan;
    if (S.pwPlan.reward === undefined) S.pwPlan.reward = true;
    if (PRICE.pwPlanPay.indexOf(S.pwPlan.pay) < 0) S.pwPlan.pay = 'Client Chooses';
    if (!PRICE.pwPlan[S.pwPlan.freq]) S.pwPlan.freq = 'Six Monthly';
    if (!S.skim) S.skim = freshState().skim;
    if (!S.lmLines) S.lmLines = [];
    if (!S.lmJob) S.lmJob = freshState().lmJob;
    if (!S.waste) S.waste = freshState().waste;
    S.sealZones.forEach(function(z){ if (z.regrout === undefined) { z.regrout=false; z.regroutSurface='porcelain'; z.regroutOption='overtop'; z.regroutM2=0; } });
    measureShapes = payload.measureShapes || [];
  } else if (payload.client) {
    const old = payload;
    S = freshState();
    S.client.first = old.client.clientFirst || '';
    S.client.last = old.client.clientLast || '';
    S.client.phone = old.client.clientPhone || '';
    S.client.email = old.client.clientEmail || '';
    S.client.address = old.client.clientAddress || '';
    S.client.date = old.client.quoteDate || '';
    S.client.valid = old.client.quoteValid || '';
    S.client.ref = old.client.quoteRef || '';
    S.client.internalNotes = old.client.internalNotes || '';
    S.client.clientNotes = old.client.clientNotes || '';
    return true;
  }
  return false;
}
function stampQuoteDates() {
  // Quote date is always the day it was last saved or updated; validity runs 30 days from then
  const today = new Date();
  function f(d) { return d.toLocaleDateString('en-AU'); }
  const valid = new Date(today); valid.setDate(valid.getDate() + 30);
  S.client.date = f(today);
  S.client.valid = f(valid);
}
  // ---- server entry point: one quote in, lines, totals, snapshot and document out
  function run(input) {
    input = input || {};
    applyPriceOverrides(input.prices || {});
    applyRestoredPayload({ state: JSON.parse(JSON.stringify(input.state || {})), measureShapes: input.measureShapes || [] });
    if (input.saveKey) S.saveKey = input.saveKey;
    showPricingBreakdown = !!input.showPrices;
    var sections = buildSections();
    var base = 0; sections.forEach(function (x) { base += effSub(x); });
    var custom = 0; S.custom.items.forEach(function (ci) { custom += (ci.price || 0); });
    var adj = getAdjustment(base + custom);
    var ex = base + custom + adj;
    return {
      state: JSON.parse(JSON.stringify(S)), measureShapes: measureShapes,
      lines: sections.map(function (x) { return { key: x.key, category: cleanSnapText(x.category), zoneName: cleanSnapText(x.zoneName), desc: cleanSnapText(x.desc), amount: r2(effSub(x)), addons: x.addons.map(function (a) { return { label: cleanSnapText(a.label), price: r2(a.price) }; }) }; }),
      totals: { exGst: r2(ex), gst: r2(ex * 0.1), incGst: r2(ex * 1.1), adjustment: r2(adj) },
      snapshot: quoteSnapshot(),
      html: input.withHtml === false ? '' : quoteDocHtml(),
      driveName: driveQuoteName(),
      days: S.custom.travelDays
    };
  }
  function priceTable() {
    applyPriceOverrides({});
    return priceTableSpec().map(function (g) { return { title: g.title, rows: g.rows.map(function (r) { return { key: priceKey(r.path), label: r.label, unit: r.unit, original: priceGet(PRICE_DEFAULTS, r.path) }; }) }; });
  }
  return { version: 'ce7b072e064b', run: run, priceTable: priceTable, zoneDefaults: zoneDefaults, zoneLists: ZONE_LISTS, freshState: freshState,
           setPath: setPath, getPath: getPath, locations: LOCATIONS, services: SERVICES.map(function (x) { return x.key; }) };
})();
