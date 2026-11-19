// Builds apps-script/PoxitPricing.gs from index.html, so the sheet API prices quotes with exactly
// the same code as the tool. Run after any pricing change:  node tools/build-pricing.js
// (needs the "acorn" parser: npm install acorn)
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const acorn = require('acorn');

const ROOT = path.join(__dirname, '..');
// Everything the server needs; anything these use is pulled in automatically
const ENTRY = ['freshState', 'applyRestoredPayload', 'zoneDefaults', 'ZONE_LISTS', 'buildSections', 'effSub', 'getAdjustment',
  'quoteSnapshot', 'quoteDocHtml', 'driveQuoteName', 'docFileName', 'priceTableSpec', 'priceGet', 'priceKey', 'applyPriceOverrides',
  'PRICE_DEFAULTS', 'applyAutoSite', 'estimateDays', 'setPath', 'getPath', 'stampQuoteDates', 'r2', 'ENTITIES', 'entityForKey',
  'LOCATIONS', 'SERVICES', 'quoteServiceNames', 'spallingOptions', 'docJobLabel', 'fmt', 'cleanSnapText', 'CEM_WARRANTY_NOTE',
  'quoteMoney', 'invoiceCalc', 'invoiceDocHtml', 'variationList', 'warrantyText', 'offersState'];

function build() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const src = scripts.sort((a, b) => b.length - a.length)[0];
  const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' });

  const decls = {}; // name -> { node, names:Set of identifiers it uses, order }
  ast.body.forEach((node, order) => {
    const add = (name, n) => { decls[name] = { node: n, order, uses: idents(n) }; };
    if (node.type === 'FunctionDeclaration') add(node.id.name, node);
    else if (node.type === 'VariableDeclaration') node.declarations.forEach(d => { if (d.id.type === 'Identifier') add(d.id.name, node); });
  });
  const keep = new Set();
  const stack = ENTRY.slice();
  ENTRY.forEach(n => { if (!decls[n]) throw new Error('index.html has no top-level ' + n); });
  while (stack.length) {
    const n = stack.pop();
    if (keep.has(n) || !decls[n]) continue;
    keep.add(n);
    decls[n].uses.forEach(u => { if (decls[u] && !keep.has(u)) stack.push(u); });
  }
  // emit in source order, each statement once
  const nodes = [...new Set([...keep].map(n => decls[n].node))].sort((a, b) => a.start - b.start);
  const body = nodes.map(n => src.slice(n.start, n.end)).join('\n');
  const hash = crypto.createHash('sha256').update(body).digest('hex').slice(0, 12);

  return '// =====================================================================\n' +
    '//  POXIT PRICING  (file: PoxitPricing.gs)\n' +
    '//  GENERATED from the quote tool (index.html) by tools/build-pricing.js.\n' +
    '//  Do not edit by hand: paste the new version whenever the tool\'s pricing changes.\n' +
    '//  Pricing version: ' + hash + '\n' +
    '// =====================================================================\n' +
    'var PXP = (function () {\n' +
    '  // No screen on the server: anything that would touch it is never called here\n' +
    '  var window = {}, document = undefined, navigator = {}, alert = function () {};\n' +
    '  var localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };\n' +
    '  var measureShapes = [];\n' +
    '  var showPricingBreakdown = false;\n' +
    body.replace(/^let measureShapes = \[\];$/m, '').replace(/^let showPricingBreakdown = false;$/m, '') + '\n' +
    '  // ---- server entry point: one quote in, lines, totals, snapshot and document out\n' +
    '  function run(input) {\n' +
    '    input = input || {};\n' +
    '    applyPriceOverrides(input.prices || {});\n' +
    '    applyRestoredPayload({ state: JSON.parse(JSON.stringify(input.state || {})), measureShapes: input.measureShapes || [] });\n' +
    '    if (input.saveKey) S.saveKey = input.saveKey;\n' +
    '    showPricingBreakdown = !!input.showPrices;\n' +
    '    var money = quoteMoney();\n' +
    '    var sections = money.sections, adj = money.adjustment, ex = money.totalEx;\n' +
    '    return {\n' +
    '      state: JSON.parse(JSON.stringify(S)), measureShapes: measureShapes,\n' +
    '      lines: sections.map(function (x) { return { key: x.key, category: cleanSnapText(x.category), zoneName: cleanSnapText(x.zoneName), desc: cleanSnapText(x.desc), amount: r2(effSub(x)), addons: x.addons.map(function (a) { return { label: cleanSnapText(a.label), price: r2(a.price) }; }) }; }),\n' +
    '      totals: { exGst: r2(ex), gst: r2(ex * 0.1), incGst: r2(ex * 1.1), adjustment: r2(adj) },\n' +
    '      snapshot: quoteSnapshot(),\n' +
    '      html: input.withHtml === false ? \'\' : quoteDocHtml(),\n' +
    '      driveName: driveQuoteName(),\n' +
    '      days: S.custom.travelDays\n' +
    '    };\n' +
    '  }\n' +
    '  // ---- server invoice: same document and payment history as the tool\n' +
    '  function invoice(input) {\n' +
    '    input = input || {};\n' +
    '    applyPriceOverrides(input.prices || {});\n' +
    '    applyRestoredPayload({ state: JSON.parse(JSON.stringify(input.state || {})), measureShapes: input.measureShapes || [] });\n' +
    '    if (input.saveKey) S.saveKey = input.saveKey;\n' +
    '    var opts = { ledger: input.ledger || [], amount: input.amount, invNo: input.invNo, date: new Date(input.date || Date.now()), completion: input.completion, notes: input.notes };\n' +
    '    var doc = invoiceDocHtml(input.stage || \'deposit\', input.invNo || \'\', opts);\n' +
    '    var k = doc.calc;\n' +
    '    return { html: doc.html, title: doc.title, type: doc.type, amount: k.amount, gst: k.gst, totalInc: k.totalInc, contractInc: k.contractInc,\n' +
    '             paidToDate: k.paidToDate, balanceBefore: k.balanceBefore, balanceAfter: k.balanceAfter, progressNo: k.progressNo,\n' +
    '             earlyDiscount: k.early ? k.early.discount : 0, deposit: k.money.deposit };\n' +
    '  }\n' +
    '  function priceTable() {\n' +
    '    applyPriceOverrides({});\n' +
    '    return priceTableSpec().map(function (g) { return { title: g.title, rows: g.rows.map(function (r) { return { key: priceKey(r.path), label: r.label, unit: r.unit, text: !!r.text, original: priceGet(PRICE_DEFAULTS, r.path) }; }) }; });\n' +
    '  }\n' +
    '  return { version: \'' + hash + '\', run: run, invoice: invoice, priceTable: priceTable, zoneDefaults: zoneDefaults, zoneLists: ZONE_LISTS, freshState: freshState,\n' +
    '           setPath: setPath, getPath: getPath, locations: LOCATIONS, services: SERVICES.map(function (x) { return x.key; }) };\n' +
    '})();\n';
}

// Identifiers a declaration refers to (skips object keys and non-computed member names)
function idents(node) {
  const out = new Set();
  (function walk(n, parent, key) {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'Identifier') {
      const skip = parent && ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed) ||
        (parent.type === 'Property' && key === 'key' && !parent.computed));
      if (!skip) out.add(n.name);
      return;
    }
    for (const k of Object.keys(n)) {
      if (k === 'start' || k === 'end' || k === 'type') continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(c => walk(c, n, k));
      else if (v && typeof v.type === 'string') walk(v, n, k);
    }
  })(node, null, null);
  return out;
}

if (require.main === module) {
  const out = build();
  fs.writeFileSync(path.join(ROOT, 'apps-script', 'PoxitPricing.gs'), out);
  console.log('Wrote apps-script/PoxitPricing.gs (' + out.length + ' bytes)');
}
module.exports = { build };
