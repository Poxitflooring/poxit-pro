// =====================================================================
//  POXIT QUOTE API  (file: PoxitApi.gs)
//
//  Lets Claude (or anything holding the secret key) build and change quotes
//  without opening the tool. Prices come from PoxitPricing.gs, which is the
//  tool's own pricing code, so a quote made here matches one made in the tool.
//
//  Two ways in, same actions:
//   1. Web app POST with {"action": ..., "key": "<secret>", ...}
//   2. The "API Requests" tab: put the action in column A and the request as
//      JSON in column B. A 1-minute timer runs it and fills in the results.
//      (Anyone who can edit the sheet can already change quotes, so this tab
//      does not need the key.)
//
//  Actions
//   createQuote    client + areas (+ any extra state) -> new quote, ref, totals, PDF
//   getQuoteByRef  ref (or key), optional client -> the quote, totals, PDF link
//   listQuotes     optional client, status, from, to (d/m/yyyy), limit
//   updateQuote    ref or key + changes -> recalculated, saved, new PDF version
//   regeneratePdf  ref or key -> PDF rebuilt on the server, same Drive file
//
//  PDFs: real text (Google's HTML to PDF converter), named
//  "PXT-ref - Client - Address.pdf", Quotes folder, one file per quote updated
//  in place. The Drive link, totals ex and inc GST and the date go back on the
//  quote's row.
//
//  This script NEVER sends email.
//
//  First time: run PXA_setup once from the editor. It makes the key (see the
//  log, or run PXA_showKey), the "Price Table" and "API Requests" tabs and the
//  timer.
// =====================================================================

var PXA = {
  KEY_PROP: 'PXA_API_KEY',
  LAST_QUOTE_PROP: 'PXA_LAST_QUOTE',
  PRICE_TAB: 'Price Table',
  API_TAB: 'API Requests',
  PRICE_HEADERS: ['Group', 'Item', 'Unit', 'Price', 'Original', 'Key'],
  API_HEADERS: ['Action', 'Request (JSON)', 'Status', 'Quote Ref', 'Quote Key', 'Total ex GST', 'Total inc GST',
                'File ID', 'Link', 'Result (JSON)', 'Message', 'Processed At'],
  STATUS_COL: 18,          // Sheet1 column R: Quoted / Accepted / Declined / Invoiced / Paid (free text)
  ACTIONS: { createQuote: 1, getQuoteByRef: 1, listQuotes: 1, updateQuote: 1, regeneratePdf: 1,
             draftEmail: 1, sendDraft: 1, renumberInvoice: 1, showInvoiceNumbers: 1, setNextInvoiceNo: 1 },
  FLOOR_TYPES: { epoxy: 1, tinted: 1, seal: 1, gs: 1, aqua: 1, grind: 1, polished: 1, care: 1, shine: 1, sandtop: 1 }
};

function PXA_handles_(a) { return a === 'nextQuoteRef' || a === 'getPrices' || a === 'savePrices' || !!PXA.ACTIONS[a]; }
// Called from doPost in PoxitInvoicing.gs. Returns null for actions this file does not handle.
function PXA_route_(body) {
  var a = body && body.action;
  if (a === 'nextQuoteRef') return PXA_nextQuoteRefLocked_(body);
  if (a === 'getPrices') return { status: 'ok', prices: PXA_prices_() };
  if (a === 'savePrices') return PXA_checkKey_(body) || PXA_savePrices_(body.prices || {});
  if (PXA.ACTIONS[a]) return PXA_checkKey_(body) || PXA_api_(a, body);
  return null;
}

function PXA_api_(action, b) {
  if (action === 'createQuote') return PXA_createQuote_(b);
  if (action === 'getQuoteByRef') return PXA_getQuote_(b);
  if (action === 'listQuotes') return PXA_listQuotes_(b);
  if (action === 'updateQuote') return PXA_updateQuote_(b);
  if (action === 'regeneratePdf') return PXA_regeneratePdf_(b);
  if (action === 'draftEmail') return PXE_draftEmail_(b);
  if (action === 'sendDraft') return PXE_sendDraft_(b);
  if (action === 'renumberInvoice') return PXI_renumberInvoice_(String(b.invoiceNo || b.invNo || ''), b.newNo);
  if (action === 'showInvoiceNumbers') return PXI_showInvoiceNumbers();
  if (action === 'setNextInvoiceNo') return { status: 'ok', next: PXI_setNextInvoiceNo(b.number || b.n) };
  return { status: 'error', message: 'Unknown action ' + action };
}

function PXA_checkKey_(b) {
  var key = PropertiesService.getScriptProperties().getProperty(PXA.KEY_PROP);
  if (!key) return { status: 'error', message: 'No API key set yet. Run PXA_setup in the Apps Script editor.' };
  var got = String((b && b.key) || '');
  if (got.length !== key.length) return { status: 'error', message: 'Wrong or missing key' };
  var diff = 0;
  for (var i = 0; i < key.length; i++) diff |= key.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0 ? null : { status: 'error', message: 'Wrong or missing key' };
}

// ---------------------------------------------------------------------
//  Actions
// ---------------------------------------------------------------------
function PXA_createQuote_(b) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var st = PXP.freshState();
    PXA_deepMerge_(st, b.state || {});
    var c = b.client || {};
    ['first', 'last', 'phone', 'email', 'address', 'suburb', 'location', 'entity', 'area', 'clientNotes', 'internalNotes'].forEach(function (k) {
      if (c[k] !== undefined && c[k] !== null) st.client[k] = String(c[k]);
    });
    if (c.name && !c.first && !c.last) { var parts = String(c.name).trim().split(/\s+/); st.client.first = parts.shift() || ''; st.client.last = parts.join(' '); }
    if (PXP.locations.indexOf(st.client.location) < 0) throw new Error('client.location must be Internal, External or Both.');
    if (!st.client.entity || !PXI.ENTITIES[st.client.entity]) st.client.entity = 'Company';
    PXA_addAreas_(st, b.areas || []);
    PXA_applyExtras_(st, b);
    if (!(st.client.first + st.client.last).trim()) throw new Error('client.first / client.last (or client.name) is required.');

    var key = 'PXT-' + Date.now();
    st.client.ref = PXA_nextQuoteRef_(0).ref;
    st.saveKey = key;
    PXA_stampDates_(st);
    var res = PXA_price_(st, [], key, b.showPrices);

    var sh = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
    var row = sh.getLastRow() + 1;
    PXA_writeRow_(sh, row, key, res, b.status || 'Quoted');
    var pdf = b.pdf === false ? null : PXA_savePdf_(res, key, row);
    return PXA_result_(res, key, pdf, row);
  } finally { lock.releaseLock(); }
}

function PXA_getQuote_(b) {
  var q = PXA_load_(b);
  var vals = q.sheet.getRange(q.row, 1, 1, PXA.STATUS_COL).getValues()[0];
  var out = {
    status: 'ok', key: q.key, ref: vals[PXI.Q.REF - 1], client: vals[PXI.Q.NAME - 1], address: vals[PXI.Q.ADDRESS - 1],
    date: PXA_cellText_(vals[PXI.Q.DATE - 1]), quoteStatus: PXA_status_(vals),
    totals: { exGst: PXI_num_(vals[PXI.Q.TOTAL_EX - 1]) || PXI_round_(PXI_num_(vals[PXI.Q.TOTAL - 1])), incGst: PXI_num_(vals[PXI.Q.TOTAL_INC - 1]) },
    link: vals[PXI.Q.QUOTE_LINK - 1] || '', fileId: PXA_fileIdFromLink_(vals[PXI.Q.QUOTE_LINK - 1]),
    lastInvoice: vals[PXI.Q.INV_NO - 1] || '', lastInvoiceLink: vals[PXI.Q.INV_LINK - 1] || ''
  };
  if (b.withLines !== false) {
    var res = PXA_price_(q.state, q.measureShapes, q.key, false, true);
    out.lines = res.lines; out.recalculated = res.totals; out.days = res.days;
  }
  if (b.withState) out.state = q.state;
  return out;
}

function PXA_listQuotes_(b) {
  var sh = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var last = sh.getLastRow();
  if (last < 1) return { status: 'ok', quotes: [] };
  var rows = sh.getRange(1, 1, last, PXA.STATUS_COL).getValues();
  var wantClient = String(b.client || '').toLowerCase().trim();
  var wantStatus = String(b.status || '').toLowerCase().trim();
  var from = PXA_parseDate_(b.from), to = PXA_parseDate_(b.to);
  if (to) to = new Date(to.getTime() + 86400000 - 1);
  var seen = {}, out = [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var r = rows[i], key = String(r[0]).trim();
    if (!/^PXT-\d{10,}$/.test(key) || seen[key]) continue;
    seen[key] = 1;
    var name = String(r[PXI.Q.NAME - 1]);
    if (wantClient && name.toLowerCase().indexOf(wantClient) < 0) continue;
    var st = PXA_status_(r);
    if (wantStatus && st.toLowerCase() !== wantStatus) continue;
    var d = PXA_parseDate_(r[PXI.Q.DATE - 1]);
    if ((from || to) && !d) continue;
    if (from && d < from) continue;
    if (to && d > to) continue;
    out.push({ key: key, ref: String(r[PXI.Q.REF - 1]), client: name, address: String(r[PXI.Q.ADDRESS - 1]),
      date: PXA_cellText_(r[PXI.Q.DATE - 1]), status: st, location: String(r[PXI.Q.LOCATION - 1] || ''),
      exGst: PXI_num_(r[PXI.Q.TOTAL_EX - 1]) || PXI_round_(PXI_num_(r[PXI.Q.TOTAL - 1])), incGst: PXI_num_(r[PXI.Q.TOTAL_INC - 1]),
      link: String(r[PXI.Q.QUOTE_LINK - 1] || '') });
    if (out.length >= (parseInt(b.limit, 10) || 50)) break;
  }
  return { status: 'ok', count: out.length, quotes: out };
}

// Changes, all optional, applied in this order:
//   merge: {partial state}            deep merge (arrays replaced)
//   set: {"epoxyZones.0.area": 50}    set any value by path
//   addAreas: [{type:'seal', ...}]    new areas, same format as createQuote
//   removeAreas: [{type:'seal', index:0}]
//   lineEdits: {"epoxy-0": {amount: 4000}}   same as ✎ Edit on the Review step
//                                            (name, desc, qty, unit, rate, amount, deleted)
//   customItems: [{desc, note, qty, unit, rate, price}]   replaces the custom lines
//   client: {...}, travel: {...}, days, status, showPrices, pdf
function PXA_updateQuote_(b) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var q = PXA_load_(b);
    var st = q.state;
    if (b.merge) PXA_deepMerge_(st, b.merge);
    if (b.set) Object.keys(b.set).forEach(function (p) { PXA_setPath_(st, p, b.set[p]); });
    if (b.client) Object.keys(b.client).forEach(function (k) { st.client[k] = b.client[k] === null ? '' : String(b.client[k]); });
    if (b.addAreas) PXA_addAreas_(st, b.addAreas);
    if (b.removeAreas) {
      b.removeAreas.slice().sort(function (x, y) { return (y.index || 0) - (x.index || 0); }).forEach(function (r) {
        var list = PXP.zoneLists[r.type];
        if (!list || !st[list] || !st[list][r.index]) throw new Error('No ' + r.type + ' area at index ' + r.index);
        st[list].splice(r.index, 1);
      });
    }
    if (b.lineEdits) {
      st.lineEdits = st.lineEdits || {};
      Object.keys(b.lineEdits).forEach(function (k) {
        var e = b.lineEdits[k];
        if (e === null) delete st.lineEdits[k];
        else st.lineEdits[k] = PXA_assign_(st.lineEdits[k] || {}, e);
      });
    }
    if (b.customItems) st.custom.items = b.customItems.map(function (x) {
      return { desc: String(x.desc || x.name || ''), note: String(x.note || ''), qty: x.qty === undefined ? '' : x.qty,
               unit: String(x.unit || ''), rate: x.rate === undefined ? '' : x.rate, price: PXI_num_(x.price) };
    });
    PXA_applyExtras_(st, b);
    if (PXP.locations.indexOf(st.client.location) < 0) throw new Error('client.location must be Internal, External or Both.');
    PXA_stampDates_(st);
    var res = PXA_price_(st, q.measureShapes, q.key, b.showPrices);
    PXA_writeRow_(q.sheet, q.row, q.key, res, b.status);
    var pdf = b.pdf === false ? null : PXA_savePdf_(res, q.key, q.row);
    return PXA_result_(res, q.key, pdf, q.row);
  } finally { lock.releaseLock(); }
}

function PXA_regeneratePdf_(b) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var q = PXA_load_(b);
    var res = PXA_price_(q.state, q.measureShapes, q.key, b.showPrices);
    // totals follow the current price table, so the row is refreshed too (dates stay as saved)
    PXA_writeRow_(q.sheet, q.row, q.key, res, null, true);
    var pdf = PXA_savePdf_(res, q.key, q.row);
    return PXA_result_(res, q.key, pdf, q.row);
  } finally { lock.releaseLock(); }
}

// ---------------------------------------------------------------------
//  Pieces
// ---------------------------------------------------------------------
function PXA_price_(state, shapes, key, showPrices, noHtml) {
  return PXP.run({ state: state, measureShapes: shapes || [], prices: PXA_prices_(), saveKey: key,
                   showPrices: !!showPrices, withHtml: !noHtml });
}

function PXA_addAreas_(st, areas) {
  areas.forEach(function (a) {
    var type = String(a.type || a.service || '').trim();
    var list = PXP.zoneLists[type];
    if (!list) throw new Error('Unknown area type "' + type + '". Use one of: ' + Object.keys(PXP.zoneLists).join(', '));
    var z = PXP.zoneDefaults(type);
    Object.keys(a).forEach(function (k) {
      if (k === 'type' || k === 'service' || k === 'system' || k === 'tier' || k === 'kind') return;
      if (k === 'addons' && z.addons) PXA_assign_(z.addons, a.addons);
      else z[k] = a[k];
    });
    // "system" / "tier" / "kind" name the product: sys for epoxy and commercial system, type for the rest
    var ft = type === 'epoxy' ? PXA_finishTier_(a.finishTier !== undefined ? a.finishTier : a.tier) : '';
    if (ft) z.tier = ft;
    if (type === 'epoxy' && a.platinumCoats !== undefined) z.platCoats = String(a.platinumCoats) === '2' ? '2' : '1';
    var sys = a.system !== undefined ? a.system : (a.tier !== undefined && !ft ? a.tier : a.kind);
    if (sys !== undefined) {
      if (type === 'epoxy') z.sys = String(sys);
      else if (type === 'comm') z.system = String(sys);
      else if (type === 'shine') z.tier = String(sys);
      else if (type === 'sandtop') z.top = /poly/i.test(String(sys)) ? 'Polyaspartic Topcoat' : 'UV Topcoat';
      else if ('type' in z) z.type = String(sys);
    }
    st[list].push(z);
    if (PXA.FLOOR_TYPES[type]) st.services[type] = true;
  });
}

// Epoxy finish tier from a key or name: classic, gold, platinum, blackLabel ("Black Label")
function PXA_finishTier_(v) {
  if (v === undefined || v === null) return '';
  var k = String(v).toLowerCase().replace(/[^a-z]/g, '');
  return { classic: 'classic', gold: 'gold', platinum: 'platinum', blacklabel: 'blackLabel' }[k] || '';
}

// Site and money bits shared by create and update
function PXA_applyExtras_(st, b) {
  st.auto = st.auto || { days: false, travel: false, waste: false };
  if (b.travel) {
    var t = b.travel;
    if (t.mode === 'custom' || t.km !== undefined || t.place) {
      st.travel = { mode: 'custom', place: String(t.place || ''), km: PXI_num_(t.km) };
    } else if (t.suburb) {
      st.travel = { mode: 'suburb', place: '', km: 0 };
      st.client.suburb = String(t.suburb);
    }
    if (t.billableKm !== undefined) { st.auto.travel = false; st.custom.travelKm = PXI_num_(t.billableKm); }
    else st.auto.travel = true;
  }
  if (b.days !== undefined && b.days !== null && b.days !== 'auto') { st.auto.days = false; st.custom.travelDays = Math.max(1, Math.round(PXI_num_(b.days))); }
  if (b.days === 'auto') st.auto.days = true;
  if (b.waste) { st.auto.waste = false; PXA_assign_(st.waste, b.waste); }
  if (b.adjust) { st.custom.adjustType = String(b.adjust.type || 'none'); st.custom.adjustAmount = PXI_num_(b.adjust.amount); }
}

function PXA_writeRow_(sh, row, key, res, status, keepDates) {
  var s = res.state, c = s.client;
  var name = (c.first + ' ' + c.last).replace(/\s+/g, ' ').trim() || 'Unnamed Quote';
  var date = keepDates ? sh.getRange(row, PXI.Q.DATE).getValue() : PXA_stamp_();
  if (status) s.quoteStatus = String(status); // also kept inside the quote, so a tool Update keeps it
  var payload = JSON.stringify({ state: s, measureShapes: res.measureShapes || [] });
  sh.getRange(row, 1, 1, 7).setValues([[key, name, c.address || '', res.totals.exGst, date, c.ref, payload]]);
  PXI_writeQuoteTotals_(sh, row, key, c.entity, c.location, res.snapshot);
  if (status) sh.getRange(row, PXA.STATUS_COL).setValue(String(status));
}

function PXA_savePdf_(res, key, row) {
  var c = res.state.client;
  var name = PXI_cleanName_(res.driveName);
  var html = PXA_serverHtml_(res.html);
  var blob = Utilities.newBlob(html, 'text/html', name.replace(/\.pdf$/i, '.html')).getAs('application/pdf').setName(name);
  var client = (c.first + ' ' + c.last).replace(/\s+/g, ' ').trim();
  var saved = PXI_storePdf_({ kind: 'Quote', key: key, number: c.ref, client: client, name: name, blob: blob });
  var qs = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  PXI_mirrorFiles_(qs, row, key);
  return { fileId: saved.file.getId(), link: saved.file.getUrl(), name: name, updated: saved.updated };
}

function PXA_result_(res, key, pdf, row) {
  return { status: 'ok', ref: res.state.client.ref, key: key, row: row, client: (res.state.client.first + ' ' + res.state.client.last).trim(),
           date: res.state.client.date, valid: res.state.client.valid, totals: res.totals, days: res.days,
           lines: res.lines, fileId: pdf ? pdf.fileId : '', link: pdf ? pdf.link : '', fileName: pdf ? pdf.name : '',
           pdfUpdated: pdf ? pdf.updated : false, pricing: PXP.version };
}

// Ref (PXT-2026-112) or key (PXT-1790584732999); client narrows a reused ref
function PXA_load_(b) {
  var id = String(b.key && /^PXT-\d{10,}$/.test(b.key) ? b.key : (b.ref || b.quoteKey || '')).trim();
  if (!id) throw new Error('Give the quote ref (PXT-2026-112) or its key.');
  var found = PXI_findQuoteForRequest_(id, String(b.client || '').trim());
  var sh = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var raw = sh.getRange(found.row, PXI.Q.PAYLOAD).getValue();
  var payload;
  try { payload = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { throw new Error('The saved quote data for ' + id + ' could not be read.'); }
  if (!payload || !payload.state) throw new Error('Quote ' + id + ' was saved in the old format. Open it in the tool and hit Update once.');
  payload.state.saveKey = found.key;
  return { sheet: sh, row: found.row, key: found.key, state: payload.state, measureShapes: payload.measureShapes || [] };
}

// Google's HTML to PDF converter does not do flexbox, web fonts or emoji: give it tables and plain text.
function PXA_serverHtml_(html) {
  var h = String(html || '');
  h = h.replace(/<script[\s\S]*?<\/script>/gi, '');
  h = h.replace(/@import url\([^)]*\);/g, '');
  h = h.replace(/<div class="doc-header">([\s\S]*?)<\/div><div class="gold-rule"><\/div>/,
    '<table class="doc-header-t" width="100%" cellpadding="0" cellspacing="0"><tr><td class="doc-header" bgcolor="#0a0a0a" align="center">$1</td></tr>' +
    '<tr><td class="gold-rule" bgcolor="#0ABAB5" height="4"></td></tr></table>');
  h = h.replace(/<div class="inv-badge">([\s\S]*?)<\/div>/, '<table cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr><td class="inv-badge" bgcolor="#0ABAB5">$1</td></tr></table>');
  h = h.replace(/<div class="client-row"><div class="client-label">([\s\S]*?)<\/div><div class="client-value">([\s\S]*?)<\/div><\/div>/g,
    '<tr><td class="client-label">$1</td><td class="client-cell"><div class="client-value">$2</div></td></tr>');
  h = h.replace(/<div class="client-box">((?:<tr>[\s\S]*?<\/tr>)+)<\/div>/g, '<table class="client-box">$1</table>');
  h = h.replace(/<div class="payment-row( due)?"><div>([\s\S]*?)<\/div><div class="p-amount"([^>]*)>([\s\S]*?)<\/div><\/div>/g,
    '<table class="payment-row$1"><tr><td>$2</td><td class="p-amount"$3>$4</td></tr></table>');
  h = h.replace(/↳/g, '&ndash;');
  h = h.replace(/[☀-➿️‍]|[\uD83C-\uD83E][\uDC00-\uDFFF]/g, '');
  var css = 'body{font-family:Arial,Helvetica,sans-serif;max-width:none;}' +
    '.logo-main,.logo-sub,.doc-type-gold,.doc-type-white,.section-num,.section-title,.zone-cat,.zone-name,.zone-price,.payment-title,.inv-badge,.client-label,.totals-table .price-col{font-family:Arial,Helvetica,sans-serif;}' +
    '.client-box{width:100%;border-collapse:collapse;border:1px solid #ccc;margin-bottom:24px;}' +
    '.client-box td{padding:7px 14px;border-bottom:1px solid #e8e8e8;vertical-align:bottom;}' +
    '.client-label{font-weight:bold;font-size:11px;width:140px;}.client-value{display:block;font-size:12px;color:#333;border-bottom:1px solid #999;padding-bottom:1px;min-height:16px;}' +
    '.section-heading{display:block;}.section-num{padding-right:6px;}.section-title{text-transform:uppercase;}' +
    'table.payment-row{display:table;width:100%;border-collapse:collapse;border-bottom:1px solid #f0f0f0;}.payment-row td{padding:5px 0;font-size:12px;}' +
    '.payment-row .p-amount{text-align:right;font-weight:bold;}.terms-select{display:none;}' +
    '.doc-header-t{border-collapse:collapse;width:100%;}.doc-header-t td.doc-header{background:#0a0a0a;padding:32px 40px 24px;text-align:center;}' +
    '.doc-header-t td.gold-rule{background:#0ABAB5;height:4px;line-height:4px;font-size:1px;padding:0;}' +
    'td.inv-badge{display:table-cell;background:#0ABAB5;color:#fff;padding:4px 12px;}';
  return h.replace('</style>', css + '</style>');
}

function PXA_stampDates_(st) {
  var now = new Date();
  st.client.date = Utilities.formatDate(now, PXI.TZ, 'dd/MM/yyyy');
  st.client.valid = Utilities.formatDate(new Date(now.getTime() + 30 * 86400000), PXI.TZ, 'dd/MM/yyyy');
}
// Same style as the tool's save stamp, e.g. "17/11/2026 6:32 am"
function PXA_stamp_() {
  return Utilities.formatDate(new Date(), PXI.TZ, 'dd/MM/yyyy h:mm a').replace(/AM$/, 'am').replace(/PM$/, 'pm');
}

// ---------------------------------------------------------------------
//  Quote numbers: one counter for the tool and the API
// ---------------------------------------------------------------------
function PXA_nextQuoteRefLocked_(b) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { var r = PXA_nextQuoteRef_(PXI_num_(b && b.localLast)); r.status = 'ok'; return r; }
  finally { lock.releaseLock(); }
}
function PXA_nextQuoteRef_(localLast) {
  var props = PropertiesService.getScriptProperties();
  var year = Utilities.formatDate(new Date(), PXI.TZ, 'yyyy');
  var last = PXI_num_(props.getProperty(PXA.LAST_QUOTE_PROP));
  var sh = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  if (sh && sh.getLastRow() > 0) {
    var re = new RegExp('^PXT-' + year + '-(\\d+)$');
    sh.getRange(1, PXI.Q.REF, sh.getLastRow(), 1).getValues().forEach(function (r) {
      var m = String(r[0]).trim().match(re);
      if (m) last = Math.max(last, parseInt(m[1], 10));
    });
  }
  var n = Math.max(last, Math.floor(localLast || 0)) + 1;
  props.setProperty(PXA.LAST_QUOTE_PROP, String(n));
  return { number: n, ref: 'PXT-' + year + '-' + ('00' + n).slice(-3) };
}

// ---------------------------------------------------------------------
//  Price table: the "Price Table" tab is the shared copy (tool + API)
// ---------------------------------------------------------------------
function PXA_prices_() {
  var sh = PXI_ss_().getSheetByName(PXA.PRICE_TAB);
  var map = {};
  if (!sh || sh.getLastRow() < 2) return map;
  sh.getRange(2, 1, sh.getLastRow() - 1, PXA.PRICE_HEADERS.length).getValues().forEach(function (r) {
    var k = String(r[5]).trim(), v = r[3];
    if (!k || v === '' || v === null) return;
    if (String(r[2]).trim() === 'text') {  // names and descriptions (e.g. epoxy finish names)
      var t = String(v).replace(/\s+/g, ' ').trim();
      if (t && t !== String(r[4]).trim()) map[k] = t;
      return;
    }
    var n = parseFloat(String(v).replace(/[$,\s]/g, ''));
    if (isFinite(n) && n >= 0 && n !== PXI_num_(r[4])) map[k] = n;
  });
  return map;
}
function PXA_savePrices_(prices) {
  var sh = PXI_ss_().getSheetByName(PXA.PRICE_TAB) || PXI_ss_().insertSheet(PXA.PRICE_TAB);
  var rows = [];
  PXP.priceTable().forEach(function (g) {
    g.rows.forEach(function (r) {
      if (r.text) {
        var t = prices && prices[r.key] !== undefined && prices[r.key] !== null ? String(prices[r.key]).trim() : '';
        rows.push([g.title, r.label, 'text', t || r.original, r.original, r.key]);
        return;
      }
      var v = prices && prices[r.key] !== undefined ? parseFloat(prices[r.key]) : NaN;
      rows.push([g.title, r.label, r.unit, isFinite(v) && v >= 0 ? v : r.original, r.original, r.key]);
    });
  });
  sh.clear();
  sh.getRange(1, 1, 1, PXA.PRICE_HEADERS.length).setValues([PXA.PRICE_HEADERS]).setFontWeight('bold').setBackground('#0ABAB5').setFontColor('#ffffff');
  sh.getRange(2, 1, rows.length, PXA.PRICE_HEADERS.length).setValues(rows);
  sh.setFrozenRows(1);
  return { status: 'ok', saved: Object.keys(PXA_prices_()).length };
}

// ---------------------------------------------------------------------
//  "API Requests" tab, run by the 1-minute timer
// ---------------------------------------------------------------------
function PXA_processApiRequests() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  var sh, data;
  try {
    sh = PXI_ss_().getSheetByName(PXA.API_TAB);
    if (!sh || sh.getLastRow() < 2) return;
    data = sh.getRange(2, 1, sh.getLastRow() - 1, PXA.API_HEADERS.length).getValues();
  } finally { lock.releaseLock(); }
  for (var i = 0; i < data.length; i++) {
    var r = data[i], rowNo = i + 2;
    var action = String(r[0]).trim(), status = String(r[2]).trim().toLowerCase();
    if (!action || (status && status !== 'retry')) continue;
    sh.getRange(rowNo, 3).setValue('Processing');
    try {
      if (!PXA.ACTIONS[action]) throw new Error('Unknown action "' + action + '". Use ' + Object.keys(PXA.ACTIONS).join(', '));
      var req = String(r[1]).trim() ? JSON.parse(String(r[1])) : {};
      var res = PXA_api_(action, req);
      if (res.status !== 'ok') throw new Error(res.message || 'failed');
      var t = res.totals || {};
      var json = JSON.stringify(res);
      if (json.length > 45000) json = json.slice(0, 45000) + '…';
      sh.getRange(rowNo, 3, 1, 10).setValues([['Done', res.ref || '', res.key || '', t.exGst === undefined ? '' : t.exGst,
        t.incGst === undefined ? '' : t.incGst, res.fileId || '', res.link || '', json, res.count !== undefined ? res.count + ' quotes' : '', PXI_now_()]]);
    } catch (err) {
      sh.getRange(rowNo, 3).setValue('Error');
      sh.getRange(rowNo, 11, 1, 2).setValues([[String(err && err.message || err), PXI_now_()]]);
    }
  }
}

// ---------------------------------------------------------------------
//  Setup and key
// ---------------------------------------------------------------------
function PXA_setup() {
  var ss = PXI_ss_();
  var api = ss.getSheetByName(PXA.API_TAB) || ss.insertSheet(PXA.API_TAB);
  api.getRange(1, 1, 1, PXA.API_HEADERS.length).setValues([PXA.API_HEADERS]).setFontWeight('bold').setBackground('#0ABAB5').setFontColor('#ffffff');
  api.setFrozenRows(1);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(PXA.ACTIONS), true).setAllowInvalid(false).build();
  api.getRange(2, 1, 999, 1).setDataValidation(rule);
  if (!ss.getSheetByName(PXA.PRICE_TAB)) PXA_savePrices_({});
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(PXA.KEY_PROP)) props.setProperty(PXA.KEY_PROP, PXA_newKey_());
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'PXA_processApiRequests') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('PXA_processApiRequests').timeBased().everyMinutes(1).create();
  Logger.log('Quote API ready. Your key: ' + props.getProperty(PXA.KEY_PROP));
  return 'Setup done';
}
function PXA_showKey() { Logger.log('Your key: ' + PropertiesService.getScriptProperties().getProperty(PXA.KEY_PROP)); }
function PXA_rotateKey() {
  var k = PXA_newKey_();
  PropertiesService.getScriptProperties().setProperty(PXA.KEY_PROP, k);
  Logger.log('New key (the old one no longer works): ' + k);
}
function PXA_newKey_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }

// After the tool saves (its Update re-adds the row), put the status back from the quote data
function PXA_restoreStatus_(sh, row) {
  try {
    var st = JSON.parse(sh.getRange(row, PXI.Q.PAYLOAD).getValue()).state;
    if (st && st.quoteStatus) sh.getRange(row, PXA.STATUS_COL).setValue(String(st.quoteStatus));
  } catch (e) {}
}

// ---------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------
function PXA_status_(r) {
  var s = String(r[PXA.STATUS_COL - 1] || '').trim();
  if (s) return s;
  return String(r[PXI.Q.INV_NO - 1] || '').trim() ? 'Invoiced' : 'Quoted';
}
function PXA_parseDate_(v) {
  if (!v) return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return v;
  var m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10)) : null;
}
function PXA_cellText_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, PXI.TZ, 'dd/MM/yyyy h:mm a');
  return String(v === undefined || v === null ? '' : v);
}
function PXA_fileIdFromLink_(link) {
  var m = String(link || '').match(/\/d\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : '';
}
function PXA_assign_(t, src) { Object.keys(src || {}).forEach(function (k) { t[k] = src[k]; }); return t; }
function PXA_deepMerge_(t, src) {
  Object.keys(src || {}).forEach(function (k) {
    var v = src[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) PXA_deepMerge_(t[k], v);
    else t[k] = v;
  });
  return t;
}
function PXA_setPath_(obj, path, value) {
  var parts = String(path).split('.');
  var o = obj;
  for (var i = 0; i < parts.length - 1; i++) {
    if (o[parts[i]] === undefined || o[parts[i]] === null) throw new Error('Nothing at "' + parts.slice(0, i + 1).join('.') + '" to change.');
    o = o[parts[i]];
  }
  o[parts[parts.length - 1]] = value;
}

// =====================================================================
//  EMAIL (draftEmail, sendDraft). The ONLY place this project sends mail:
//  sendDraft sends one draft that draftEmail made, after Dom approves it.
// =====================================================================
var PXE = {
  FROM: 'dominic@poxitflooring.com.au',
  NAME: 'Dominic Amsteins',
  SIG_PROP: 'PXE_SIGNATURE',
  LOG_TAB: 'Email Log',
  LOG_HEADERS: ['Date', 'Quote Ref', 'Doc', 'To', 'Cc', 'Subject', 'Draft ID', 'Invoice No', 'Message ID', 'Attachment'],
  EMAILED_COL: 19,   // Sheet1 column S: date the quote or invoice was last emailed
  DEFAULT_SIGNATURE: 'Dominic Amsteins\nDirector\nPoxit Flooring Pty Ltd\n0478 495 995\nDominic@poxitflooring.com.au\npoxitflooring.com.au\nGold Coast, Australia'
};

// Run once from the editor: makes the Email Log tab and stores the signature (edit PXE.DEFAULT_SIGNATURE or the property later)
function PXE_setup() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty(PXE.SIG_PROP)) props.setProperty(PXE.SIG_PROP, PXE.DEFAULT_SIGNATURE);
  var ss = PXI_ss_();
  var log = ss.getSheetByName(PXE.LOG_TAB) || ss.insertSheet(PXE.LOG_TAB);
  log.getRange(1, 1, 1, PXE.LOG_HEADERS.length).setValues([PXE.LOG_HEADERS]).setFontWeight('bold').setBackground('#0ABAB5').setFontColor('#ffffff');
  log.setFrozenRows(1);
  var from = PXE_fromAddress_();
  Logger.log('Email ready. Sending as ' + from.address + (from.alias ? ' (alias)' : '') + '. Signature:\n' + props.getProperty(PXE.SIG_PROP));
  return 'Email setup done';
}
function PXE_setSignature(text) {
  if (!text) throw new Error('Give the signature text');
  PropertiesService.getScriptProperties().setProperty(PXE.SIG_PROP, String(text));
  return 'Signature saved';
}

// The account must be Dominic@poxitflooring.com.au, or have it as a send-as alias. Never anything else.
function PXE_fromAddress_() {
  var me = '';
  try { me = String(Session.getEffectiveUser().getEmail() || ''); } catch (e) {}
  if (me.toLowerCase() === PXE.FROM) return { address: me, alias: false };
  var aliases = [];
  try { aliases = GmailApp.getAliases() || []; } catch (e) {}
  for (var i = 0; i < aliases.length; i++) if (String(aliases[i]).toLowerCase() === PXE.FROM) return { address: aliases[i], alias: true };
  throw new Error('This script runs as ' + (me || 'an unknown account') + ', and ' + PXE.FROM + ' is not one of its send-as addresses. Nothing was drafted.');
}

function PXE_list_(v) {
  if (!v) return [];
  var a = Array.isArray(v) ? v : String(v).split(/[,;]/);
  return a.map(function (x) { return String(x).trim(); }).filter(Boolean);
}
var PXE_EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[A-Za-z]{2,}$/;

// The latest PDF for the quote or one of its invoices, from Drive
function PXE_findPdf_(b) {
  var quote = PXI_findQuoteForRequest_(String(b.ref || b.key || '').trim(), String(b.client || '').trim());
  var doc = String(b.doc || '').toLowerCase();
  var fileId = '', invNo = '';
  if (doc === 'quote') {
    var link = PXI_ss_().getSheetByName(PXI.QUOTES_TAB).getRange(quote.row, PXI.Q.QUOTE_LINK).getValue();
    fileId = PXA_fileIdFromLink_(link);
    if (!fileId) {
      var hit = PXI_findFileEntry_(PXI_ss_().getSheetByName(PXI.FILES_TAB), 'Quote', quote.key);
      fileId = hit ? hit.fileId : '';
    }
    if (!fileId) throw new Error('No quote PDF in Drive for ' + quote.ref + ' yet. Run regeneratePdf first.');
  } else if (doc === 'invoice') {
    var list = PXI_invoicesForKey_(quote.key);
    var inv = PXI_ss_().getSheetByName(PXI.INV_TAB);
    var want = String(b.invoiceNo || '').trim();
    if (want) {
      var r = PXI_findInvoiceRow_(inv, want);
      if (!r) throw new Error('No invoice ' + want + ' in the Invoices tab.');
      var row = inv.getRange(r, 1, 1, PXI.INV_HEADERS.length).getValues()[0];
      if (String(row[2]) !== String(quote.key)) throw new Error(want + ' belongs to ' + row[1] + ', not ' + quote.ref + '.');
      fileId = String(row[13]); invNo = want;
    } else {
      if (!list.length) throw new Error('No invoices for ' + quote.ref + ' yet.');
      var lastInv = list[list.length - 1];
      var rr = PXI_findInvoiceRow_(inv, lastInv.invNo);
      fileId = String(inv.getRange(rr, 14).getValue()); invNo = lastInv.invNo;
    }
    if (!fileId) throw new Error('No PDF in Drive for ' + invNo + '.');
  } else {
    throw new Error('doc must be "quote" or "invoice".');
  }
  var file = DriveApp.getFileById(fileId);
  if (file.isTrashed()) throw new Error('The PDF for ' + (invNo || quote.ref) + ' is in the Drive bin.');
  if (file.getMimeType() !== 'application/pdf') throw new Error('The file for ' + (invNo || quote.ref) + ' is not a PDF.');
  return { quote: quote, file: file, invNo: invNo, doc: doc };
}

function PXE_draftEmail_(b) {
  var to = PXE_list_(b.to), cc = PXE_list_(b.cc);
  if (!to.length) throw new Error('"to" needs at least one email address.');
  to.concat(cc).forEach(function (a) { if (!PXE_EMAIL_RE.test(a)) throw new Error('"' + a + '" is not a valid email address.'); });
  var subject = String(b.subject || '').trim();
  if (!subject) throw new Error('"subject" is required.');
  var body = String(b.body || '').replace(/\r\n/g, '\n').trim();
  if (!body) throw new Error('"body" is required (include the sign off).');
  var from = PXE_fromAddress_();
  var pdf = PXE_findPdf_(b);
  var sig = PropertiesService.getScriptProperties().getProperty(PXE.SIG_PROP) || PXE.DEFAULT_SIGNATURE;
  var full = body + '\n\n' + sig;
  var opts = { attachments: [pdf.file.getBlob().setName(pdf.file.getName())], name: PXE.NAME };
  if (cc.length) opts.cc = cc.join(',');
  if (from.alias) opts.from = from.address;
  var draft = GmailApp.createDraft(to.join(','), subject, full, opts);
  var msg = draft.getMessage();
  return { status: 'ok', draftId: draft.getId(), messageId: msg.getId(), from: from.address, to: to, cc: cc, subject: subject, body: full,
           attachment: pdf.file.getName(), fileId: pdf.file.getId(), ref: pdf.quote.ref, doc: pdf.doc, invoiceNo: pdf.invNo,
           gmailLink: 'https://mail.google.com/mail/u/0/#drafts?compose=' + msg.getId() };
}

// Sends exactly the draft named, nothing else
function PXE_sendDraft_(b) {
  var id = String(b.draftId || '').trim();
  if (!id) throw new Error('"draftId" is required.');
  var draft;
  try { draft = GmailApp.getDraft(id); } catch (e) { draft = null; }
  if (!draft) throw new Error('No draft ' + id + ' (it may already have been sent or deleted).');
  PXE_fromAddress_();
  var before = draft.getMessage();
  var subject = before.getSubject(), to = before.getTo(), cc = before.getCc();
  var att = (before.getAttachments() || []).map(function (a) { return a.getName(); }).join(', ');
  var sent = draft.send();
  var when = sent.getDate ? sent.getDate() : new Date();
  // which quote / invoice this was: from the attachment name
  var ref = '', invNo = '', doc = '';
  var m = att.match(/INV-\d{4}-\d+/); if (m) { invNo = m[0]; doc = 'invoice'; }
  var qm = att.match(/PXT-\d{4}-\d+/); if (qm) { ref = qm[0]; if (!doc) doc = 'quote'; }
  var qs = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var key = '';
  if (invNo) {
    var inv = PXI_ss_().getSheetByName(PXI.INV_TAB);
    var r = PXI_findInvoiceRow_(inv, invNo);
    if (r) { var row = inv.getRange(r, 1, 1, 3).getValues()[0]; ref = String(row[1]); key = String(row[2]); }
  }
  var stamp = PXI_now_();
  try {
    var found = key ? { key: key } : (ref ? PXI_findQuoteForRequest_(ref, '') : null);
    var qrow = found ? PXI_findQuoteRowByKey_(qs, found.key) : 0;
    if (qrow) qs.getRange(qrow, PXE.EMAILED_COL).setValue(stamp);
  } catch (e) { /* logged below either way */ }
  var log = PXI_ss_().getSheetByName(PXE.LOG_TAB);
  if (!log) { PXE_setup(); log = PXI_ss_().getSheetByName(PXE.LOG_TAB); }
  log.getRange(log.getLastRow() + 1, 1, 1, PXE.LOG_HEADERS.length).setValues([[stamp, ref, doc, to, cc, subject, id, invNo, sent.getId(), att]]);
  return { status: 'ok', messageId: sent.getId(), sentAt: Utilities.formatDate(when, PXI.TZ, 'dd/MM/yyyy h:mm a'), to: to, cc: cc, subject: subject, ref: ref, invoiceNo: invNo };
}
