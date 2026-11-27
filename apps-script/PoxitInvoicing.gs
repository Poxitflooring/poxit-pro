// =====================================================================
//  POXIT INVOICING  (file: PoxitInvoicing.gs)
//
//  Lives in the same Apps Script project as the quote sheet's existing
//  code, as its own file. It does NOT change doGet, so quote save/load and
//  Job Track keep working exactly as before. This is the project's only
//  doPost: anything it does not handle (and any body that is not JSON) is
//  passed straight to doGet(e).
//
//  What it does
//   1. doPost: the quote tool's Export button sends the PDF here. Quotes go to
//      the "Poxit Quotes" folder, invoices to "Poxit Invoices". A quote or
//      invoice that is exported again updates its existing file as a new
//      version (same file, same link), never a duplicate. The link, totals and
//      date go back into the quote's row. The tool also sends quote totals on
//      every Save/Update and asks here for invoice numbers.
//   2. "Invoice Requests" tab: add a row with a quote number and a type
//      (Deposit, Progress or Final). A 1-minute timer builds the invoice PDF,
//      saves it to Drive and fills in the results with Status = Done.
//   3. "Invoices" tab: one row per invoice, with a Paid tick box (and a Paid
//      On Time tick box for Final invoices with an early payment discount).
//      Every invoice lists the payment history; only invoices ticked Paid
//      are taken off.
//
//  This script NEVER sends email. There is no MailApp or GmailApp in it.
//
//  Needs the Drive service: Apps Script editor > Services > Drive API > Add.
//  First time: run PXI_setup once from the editor (see setup steps).
//
//  Quote sheet (Sheet1) columns written here, after the existing A to G:
//   H Entity | I Location | J Total ex GST | K Total inc GST | L Totals data
//   M Quote PDF link | N Quote exported | O Last invoice no | P Last invoice link
//   Q Invoice exported
// =====================================================================

var PXI = {
  SHEET_ID: '1-41Kv6dmOyzEYQe60wELvcYCy8_4lXyisGZ-1ol7p1M',
  QUOTES_TAB: 'Sheet1',
  REQ_TAB: 'Invoice Requests',
  INV_TAB: 'Invoices',
  FILES_TAB: 'Drive Files',
  QUOTES_FOLDER_ID: '1ws1ujtGAloblVlNBFVnz6wObCFXV1QgV',   // Poxit Quotes
  INVOICES_FOLDER_ID: '1BQudYgl0AAJcsa-CFCoWdztGtWBARjjP', // Poxit Invoices
  TZ: 'Australia/Brisbane',
  // Quotes first saved before 15 Oct 2026 (Brisbane time) stay on the sole trader details
  CHANGEOVER_MS: Date.UTC(2026, 9, 14, 14, 0, 0),
  DEPOSIT_RATE: 0.5,
  DUE_DAYS: 7,

  // Quote sheet columns (1-based). A to G are written by the existing save code.
  Q: { KEY: 1, NAME: 2, ADDRESS: 3, TOTAL: 4, DATE: 5, REF: 6, PAYLOAD: 7,
       ENTITY: 8, LOCATION: 9, TOTAL_EX: 10, TOTAL_INC: 11, SNAPSHOT: 12,
       QUOTE_LINK: 13, QUOTE_EXPORTED: 14, INV_NO: 15, INV_LINK: 16, INV_EXPORTED: 17 },
  // One row per Drive file this script manages, so re-exports update the same file
  FILES_HEADERS: ['Kind', 'Quote Key', 'Number', 'Client', 'File ID', 'Link', 'File Name', 'Updated', 'Updated (ms)'],

  REQ_HEADERS: ['Quote Ref', 'Client (optional)', 'Type', 'Progress Amount (inc GST)', 'Notes',
                'Status', 'Invoice No', 'Job Total (inc GST)', 'Paid To Date', 'Amount Due (inc GST)',
                'GST In Amount Due', 'Balance After This Invoice', 'File ID', 'Link', 'Message', 'Processed At'],
  INV_HEADERS: ['Invoice No', 'Quote Ref', 'Quote Key', 'Client', 'Type', 'Invoice Date',
                'Job Total (inc GST)', 'Amount Due (inc GST)', 'GST In Amount Due', 'Paid', 'Paid Date',
                'Source', 'Entity', 'File ID', 'Link', 'Progress No', 'Paid On Time', 'Early Payment Discount'],

  ENTITIES: {
    'Company': {
      legalName: 'Poxit Flooring Pty Ltd', abn: '23 702 727 535', acn: '702 727 535',
      bankName: 'Poxit Flooring Pty Ltd', bsb: '067 873', account: '26553862',
      address: 'Gold Coast, QLD'
    },
    'Sole Trader': {
      legalName: 'Poxit Flooring', abn: '11 743 009 073', acn: '',
      bankName: 'Poxit Flooring', bsb: '067 873', account: '17789072',
      address: 'Gold Coast, QLD'
    }
  },
  CONTACT: { phone: '0478 495 995', email: 'poxitflooring@gmail.com', web: 'www.poxitflooring.com.au' }
};

// ---------------------------------------------------------------------
//  Web entry point for the quote tool (POST only; GET stays with doGet)
// ---------------------------------------------------------------------
function doPost(e) {
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || ''); } catch (err) { body = null; }
  // not JSON, or not one of ours: hand it to the existing doGet
  if (!body || typeof body !== 'object' || !PXI_handles_(body.action)) return doGet(e);
  var out;
  try {
    if (body.action === 'quoteMeta') out = PXI_quoteMeta_(body);
    else if (body.action === 'savePdf') out = PXI_savePdf_(body);
    else if (body.action === 'nextInvoice') out = PXI_nextInvoice_(body);
    else if (body.action === 'ledger') out = PXI_ledger_(body);
    else if (body.action === 'setPaid') out = (typeof PXA_checkKey_ === 'function' && PXA_checkKey_(body)) || PXI_setPaid_(body);
    else out = PXA_route_(body);
  } catch (err) {
    out = { status: 'error', message: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
var PXI_OWN_ACTIONS = { quoteMeta: 1, savePdf: 1, nextInvoice: 1, ledger: 1, setPaid: 1 };
function PXI_handles_(action) {
  if (!action) return false;
  if (PXI_OWN_ACTIONS[action]) return true;
  return typeof PXA_handles_ === 'function' && PXA_handles_(action);
}

// Every invoice for one quote, for the tool's Payments view and invoice history
function PXI_ledger_(b) {
  var key = PXI_clean_(b.quoteKey);
  if (!key) return { status: 'error', message: 'quoteKey missing' };
  return { status: 'ok', invoices: PXI_invoicesForKey_(key) };
}
// Tick an invoice paid (and, for a Final, whether it was paid on time)
function PXI_setPaid_(b) {
  var inv = PXI_ss_().getSheetByName(PXI.INV_TAB);
  var r = PXI_findInvoiceRow_(inv, b.invNo);
  if (!r) return { status: 'error', message: 'No invoice ' + b.invNo };
  var paid = b.paid === true;
  inv.getRange(r, 10).setValue(paid);
  var pd = inv.getRange(r, 11).getValue();
  inv.getRange(r, 11).setValue(paid ? (pd || PXI_today_()) : '');
  inv.getRange(r, 17).setValue(paid && b.onTime === true);
  inv.getRange(r, 17).insertCheckboxes();
  return { status: 'ok', invNo: b.invNo, paid: paid, onTime: paid && b.onTime === true };
}

// Quote tool, after each Save/Update: store entity, location, totals snapshot
function PXI_quoteMeta_(b) {
  var sh = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var row = PXI_findQuoteRowByKey_(sh, b.key);
  if (!row) return { status: 'not_found', message: 'No quote row with key ' + b.key };
  PXI_writeQuoteTotals_(sh, row, b.key, b.entity, b.location, b.snapshot || {});
  PXI_mirrorFiles_(sh, row, b.key); // an Update re-adds the row, so put the PDF links back on it
  if (typeof PXA_restoreStatus_ === 'function') PXA_restoreStatus_(sh, row);
  return { status: 'ok', row: row };
}

function PXI_writeQuoteTotals_(sh, row, key, entity, location, snap) {
  sh.getRange(row, PXI.Q.ENTITY, 1, 5).setValues([[
    PXI_cleanEntity_(entity) || PXI_entityForKey_(key),
    PXI_clean_(location),
    PXI_round_(PXI_num_(snap.exGst)),
    PXI_round_(PXI_num_(snap.incGst)),
    JSON.stringify(snap)
  ]]);
}

// Quote tool Export button: save a quote or invoice PDF, updating it if it already exists
function PXI_savePdf_(b) {
  if (!b.base64) return { status: 'error', message: 'No PDF data' };
  var kind = b.kind === 'Invoice' ? 'Invoice' : b.kind === 'Variation' ? 'Variation' : 'Quote';
  if (kind === 'Invoice' && !b.invNo) return { status: 'error', message: 'Invoice number missing' };
  var bytes = Utilities.base64Decode(String(b.base64).replace(/^data:application\/pdf;base64,/, ''));
  var name = PXI_cleanName_(b.fileName) ||
    (kind === 'Quote' ? PXI_fileName_([b.client, 'Quote', b.ref]) : PXI_fileName_([b.client, (b.invType || 'Tax') + ' Invoice', b.invNo]));
  var blob = Utilities.newBlob(bytes, 'application/pdf', name);

  var saved = PXI_storePdf_({ kind: kind, key: PXI_clean_(b.key), number: kind === 'Quote' ? PXI_clean_(b.ref) : kind === 'Variation' ? PXI_clean_(b.ref) + '-' + PXI_clean_(b.vid) : PXI_clean_(b.invNo),
                              client: PXI_clean_(b.client), name: name, blob: blob });

  var qs = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var row = PXI_findQuoteRowByKey_(qs, b.key);
  if (row && kind !== 'Variation') {
    var snap = b.snapshot || { exGst: b.exGst, incGst: b.incGst };
    if (PXI_num_(snap.incGst) > 0) PXI_writeQuoteTotals_(qs, row, b.key, b.entity, b.location, snap);
    PXI_mirrorFiles_(qs, row, b.key);
  }

  if (kind === 'Invoice') {
    // log it for paid tracking; same invoice number = same row, Paid tick kept
    var inv = PXI_ss_().getSheetByName(PXI.INV_TAB);
    var found = PXI_findInvoiceRow_(inv, b.invNo);
    var due = PXI_round_(PXI_num_(b.amountDue));
    var values = [b.invNo, PXI_clean_(b.ref), PXI_clean_(b.key), PXI_clean_(b.client), PXI_clean_(b.invType) || 'Tax',
      found ? inv.getRange(found, 6).getValue() : PXI_today_(), PXI_round_(PXI_num_(b.jobTotal)), due, PXI_round_(due / 11),
      found ? inv.getRange(found, 10).getValue() === true : false, found ? inv.getRange(found, 11).getValue() : '',
      'Quote tool', PXI_cleanEntity_(b.entity) || PXI_entityForKey_(b.key), saved.file.getId(), saved.file.getUrl(),
      PXI_num_(b.progressNo) || '', found ? inv.getRange(found, 17).getValue() === true : false, PXI_round_(PXI_num_(b.earlyDiscount)) || ''];
    var r = found || inv.getLastRow() + 1;
    inv.getRange(r, 1, 1, values.length).setValues([values]);
    inv.getRange(r, 10).insertCheckboxes();
    inv.getRange(r, 17).insertCheckboxes();
  }
  return { status: 'ok', fileId: saved.file.getId(), link: saved.file.getUrl(), name: name,
           updated: saved.updated, row: row || null,
           message: row ? '' : 'Saved to Drive, but no saved quote row was found for this quote.' };
}

// Put a PDF in its folder. If this quote (by key) or invoice (by number) already has a
// file, that file gets the new PDF as a new version: same file, same link.
function PXI_storePdf_(o) {
  var idx = PXI_ss_().getSheetByName(PXI.FILES_TAB);
  var folderId = o.kind === 'Invoice' ? PXI.INVOICES_FOLDER_ID : PXI.QUOTES_FOLDER_ID;
  var hit = PXI_findFileEntry_(idx, o.kind, o.kind === 'Quote' ? o.key : o.number);
  var existing = null;
  if (hit) { try { existing = DriveApp.getFileById(hit.fileId); if (existing.isTrashed()) existing = null; } catch (e) { existing = null; } }
  if (!existing) existing = PXI_findByName_(folderId, o.number, o.client);

  var file, updated = false;
  if (existing) {
    if (typeof Drive === 'undefined' || !Drive.Files || !Drive.Files.update) {
      throw new Error('The Drive service is not switched on in Apps Script (Services > Drive API), so the existing file could not be updated. Nothing was saved, to avoid a duplicate.');
    }
    Drive.Files.update({}, existing.getId(), o.blob);
    existing.setName(o.name);
    file = existing; updated = true;
  } else {
    file = DriveApp.getFolderById(folderId).createFile(o.blob);
  }
  var now = new Date();
  var rowVals = [o.kind, o.key || '', o.number || '', o.client || '', file.getId(), file.getUrl(), o.name, PXI_now_(), now.getTime()];
  var r = hit ? hit.row : idx.getLastRow() + 1;
  idx.getRange(r, 1, 1, rowVals.length).setValues([rowVals]);
  return { file: file, updated: updated };
}

function PXI_findFileEntry_(idx, kind, id) {
  if (!id || idx.getLastRow() < 2) return null;
  var v = idx.getRange(2, 1, idx.getLastRow() - 1, PXI.FILES_HEADERS.length).getValues();
  var col = kind === 'Quote' ? 1 : 2; // quotes by key, invoices by number
  for (var i = v.length - 1; i >= 0; i--) {
    if (v[i][0] === kind && String(v[i][col]) === String(id)) return { row: i + 2, fileId: String(v[i][4]) };
  }
  return null;
}

// First export after this went in: adopt a PDF already sitting in the folder for the same
// number and client (e.g. one saved by hand), rather than adding a second copy.
function PXI_findByName_(folderId, number, client) {
  if (!number) return null;
  var it = DriveApp.getFolderById(folderId).getFiles(), best = null;
  var c = String(client || '').toLowerCase().replace(/\s+/g, ' ').trim();
  while (it.hasNext()) {
    var f = it.next();
    if (f.isTrashed() || f.getMimeType() !== 'application/pdf') continue;
    var n = f.getName(), nl = n.toLowerCase().replace(/\s+/g, ' ');
    if (n.indexOf(number) < 0) continue;
    if (c && nl.indexOf(c) < 0) continue; // client anywhere in the name (old and new naming)
    if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f;
  }
  return best;
}

// Copy the latest quote and invoice links for this quote onto its sheet row
function PXI_mirrorFiles_(qs, row, key) {
  var idx = PXI_ss_().getSheetByName(PXI.FILES_TAB);
  if (!idx || idx.getLastRow() < 2 || !key) return;
  var v = idx.getRange(2, 1, idx.getLastRow() - 1, PXI.FILES_HEADERS.length).getValues();
  var q = null, inv = null;
  v.forEach(function (r) {
    if (String(r[1]) !== String(key)) return;
    if (r[0] === 'Quote' && (!q || r[8] > q[8])) q = r;
    if (r[0] === 'Invoice' && (!inv || r[8] > inv[8])) inv = r;
  });
  if (!q && !inv) return;
  qs.getRange(row, PXI.Q.QUOTE_LINK, 1, 5).setValues([[
    q ? q[5] : qs.getRange(row, PXI.Q.QUOTE_LINK).getValue(), q ? q[7] : qs.getRange(row, PXI.Q.QUOTE_EXPORTED).getValue(),
    inv ? inv[2] : '', inv ? inv[5] : '', inv ? inv[7] : ''
  ]]);
}

// Quote tool and request processor share one invoice counter so numbers never clash
function PXI_nextInvoice_(b) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var n = PXI_takeInvoiceNumber_(PXI_num_(b && b.localLast));
    return { status: 'ok', number: n, ref: PXI_invRef_(n) };
  } finally { lock.releaseLock(); }
}

function PXI_takeInvoiceNumber_(localLast) {
  var props = PropertiesService.getScriptProperties();
  var used = PXI_usedInvoiceNumbers_(localLast);
  var forced = PXI_num_(props.getProperty('PXI_NEXT_FORCE'));
  var n;
  if (forced > 0) {
    if (used.set[forced]) throw new Error(PXI_invRef_(forced) + ' is already used (' + used.set[forced] + '). Pick another with PXI_setNextInvoiceNo.');
    n = forced;
    props.deleteProperty('PXI_NEXT_FORCE');
  } else {
    n = used.max + 1;
    while (used.set[n]) n++;
  }
  props.setProperty('PXI_LAST_INVOICE', String(Math.max(n, PXI_num_(props.getProperty('PXI_LAST_INVOICE')))));
  return n;
}

// Every invoice number already used this year, and where it was seen: the shared counter, the
// Invoices tab, the quote sheet, the Drive index, the Invoices folder, sent Gmail and the device.
function PXI_usedInvoiceNumbers_(localLast) {
  var year = Utilities.formatDate(new Date(), PXI.TZ, 'yyyy');
  var re = new RegExp('INV-' + year + '-(\\d{1,5})', 'g');
  var set = {}, max = 0, where = '';
  function add(text, source) {
    String(text || '').replace(re, function (m, d) {
      var k = parseInt(d, 10);
      if (!(k > 0)) return m;
      if (!set[k]) set[k] = source;
      if (k > max) { max = k; where = source + ' (' + m + ')'; }
      return m;
    });
  }
  var props = PropertiesService.getScriptProperties();
  var last = PXI_num_(props.getProperty('PXI_LAST_INVOICE'));
  if (last > max) { max = last; where = 'shared counter (' + PXI_invRef_(last) + ')'; }
  var dev = Math.floor(PXI_num_(localLast));
  if (dev > max) { max = dev; where = 'quote tool device counter (' + PXI_invRef_(dev) + ')'; }
  var ss = PXI_ss_();
  var inv = ss.getSheetByName(PXI.INV_TAB);
  if (inv && inv.getLastRow() > 1) inv.getRange(2, 1, inv.getLastRow() - 1, 1).getValues().forEach(function (r) { add(r[0], 'Invoices tab'); });
  var qs = ss.getSheetByName(PXI.QUOTES_TAB);
  if (qs && qs.getLastRow() > 0) qs.getRange(1, PXI.Q.INV_NO, qs.getLastRow(), 1).getValues().forEach(function (r) { add(r[0], 'quote sheet'); });
  var idx = ss.getSheetByName(PXI.FILES_TAB);
  if (idx && idx.getLastRow() > 1) idx.getRange(2, 3, idx.getLastRow() - 1, 5).getValues().forEach(function (r) { add(r[0] + ' ' + r[4], 'Drive Files tab'); });
  try {
    var it = DriveApp.getFolderById(PXI.INVOICES_FOLDER_ID).getFiles();
    while (it.hasNext()) { var f = it.next(); if (!f.isTrashed()) add(f.getName(), 'Drive Invoices folder'); }
  } catch (e) {}
  var g = PXI_gmailInvoiceNumbers_(year);
  Object.keys(g).forEach(function (k) { add('INV-' + year + '-' + k, g[k]); });
  return { set: set, max: max, where: where, year: year };
}
// Invoice numbers on emails Dom has sent (attachment names and subjects). Cached for 6 hours.
function PXI_gmailInvoiceNumbers_(year) {
  var props = PropertiesService.getScriptProperties();
  var cacheKey = 'PXI_GMAIL_NUMS_' + year;
  try {
    var c = JSON.parse(props.getProperty(cacheKey) || 'null');
    if (c && c.at > Date.now() - 6 * 3600000) return c.nums;
  } catch (e) {}
  var nums = {};
  if (typeof GmailApp === 'undefined') return nums;
  try {
    var re = new RegExp('INV-' + year + '-(\\d{1,5})', 'g');
    var threads = GmailApp.search('in:sent ("INV-' + year + '" OR filename:INV-' + year + ')', 0, 300);
    threads.forEach(function (t) {
      t.getMessages().forEach(function (m) {
        var text = m.getSubject() + ' ' + m.getAttachments({ includeInlineImages: false }).map(function (a) { return a.getName(); }).join(' ');
        text.replace(re, function (x, d) { var k = parseInt(d, 10); if (k > 0 && !nums[k]) nums[k] = 'sent Gmail, ' + Utilities.formatDate(m.getDate(), PXI.TZ, 'd MMM yyyy') + ' to ' + m.getTo(); return x; });
      });
    });
    props.setProperty(cacheKey, JSON.stringify({ at: Date.now(), nums: nums }));
  } catch (e) { /* Gmail not authorised yet: the other sources still count */ }
  return nums;
}
// Correct the counter by hand: the next invoice gets this number (it must not be in use)
function PXI_setNextInvoiceNo(n) {
  n = Math.floor(PXI_num_(String(n === undefined ? '' : n).replace(/^INV-\d{4}-/, '')));
  if (!(n > 0)) throw new Error('Give the number the next invoice should get, e.g. PXI_setNextInvoiceNo(36)');
  var used = PXI_usedInvoiceNumbers_(0);
  if (used.set[n]) throw new Error(PXI_invRef_(n) + ' is already used (' + used.set[n] + ').');
  PropertiesService.getScriptProperties().setProperty('PXI_NEXT_FORCE', String(n));
  Logger.log('The next invoice will be ' + PXI_invRef_(n));
  return PXI_invRef_(n);
}
// What the counter sees: run this to check before issuing a number
function PXI_showInvoiceNumbers() {
  var u = PXI_usedInvoiceNumbers_(0);
  var msg = 'Highest invoice number used in ' + u.year + ': ' + (u.max ? PXI_invRef_(u.max) : 'none') + (u.where ? ', found in ' + u.where : '') + '. Next: ' + PXI_invRef_(u.max + 1) + '.';
  Logger.log(msg);
  return { status: 'ok', message: msg, max: u.max, where: u.where, next: PXI_invRef_(u.max + 1), used: Object.keys(u.set).map(Number).sort(function (a, b) { return a - b; }) };
}

// Give an unsent invoice the next correct number: same Drive file (updated in place), rebuilt with the
// tool's template, Invoices tab, Drive index and quote row all updated.
function PXI_renumberInvoice_(invNo, newNo) {
  var inv = PXI_ss_().getSheetByName(PXI.INV_TAB);
  var r = PXI_findInvoiceRow_(inv, invNo);
  if (!r) throw new Error('No invoice ' + invNo + ' in the Invoices tab.');
  var row = inv.getRange(r, 1, 1, PXI.INV_HEADERS.length).getValues()[0];
  if (row[9] === true || String(row[9]).toUpperCase() === 'TRUE') throw new Error(invNo + ' is ticked Paid, so it has been sent. Not renumbered.');
  var log = PXI_ss_().getSheetByName('Email Log');
  if (log && log.getLastRow() > 1 && log.getRange(2, 1, log.getLastRow() - 1, 8).getValues().some(function (x) { return String(x[7]) === String(invNo); })) {
    throw new Error(invNo + ' has been emailed (Email Log). Not renumbered.');
  }
  var key = String(row[2]), type = String(row[4]);
  var quote = PXI_findQuoteForRequest_(key, '');
  var state = PXI_quoteState_(quote.row);
  if (!state) throw new Error('Quote ' + row[1] + ' has no saved quote data to rebuild the invoice from.');
  if (typeof PXP === 'undefined') throw new Error('PoxitPricing.gs is missing from the project.');
  var n;
  if (newNo) {
    n = Math.floor(PXI_num_(String(newNo).replace(/^INV-\d{4}-/, '')));
    var u = PXI_usedInvoiceNumbers_(0);
    if (u.set[n]) throw new Error(PXI_invRef_(n) + ' is already used (' + u.set[n] + ').');
  } else {
    n = PXI_takeInvoiceNumber_(0);
  }
  var newRef = PXI_invRef_(n);
  var stage = { 'Deposit': 'deposit', 'Progress': 'progress', 'Final': 'final', 'Full Payment': 'full', 'Paid': 'paid' }[type] || 'final';
  var ledger = PXI_invoicesForKey_(quote.key).filter(function (x) { return x.invNo !== invNo; });
  var res = PXP.invoice({ state: state.state, measureShapes: state.measureShapes, prices: typeof PXA_prices_ === 'function' ? PXA_prices_() : {},
                          saveKey: quote.key, stage: stage, amount: row[7], ledger: ledger, invNo: newRef, date: Date.now() });
  var html = typeof PXA_serverHtml_ === 'function' ? PXA_serverHtml_(res.html) : res.html;
  var c = state.state.client || {};
  var name = PXI_fileName_([quote.client, c.area || '', (type + ' Invoice' + (res.progressNo ? ' ' + res.progressNo : '')), newRef]);
  var pdf = Utilities.newBlob(html, 'text/html', name.replace(/\.pdf$/, '.html')).getAs('application/pdf').setName(name);
  var file = null;
  try { file = row[13] ? DriveApp.getFileById(String(row[13])) : null; } catch (e) { file = null; }
  if (file) {
    if (typeof Drive === 'undefined' || !Drive.Files || !Drive.Files.update) throw new Error('Switch on the Drive service (Services > Drive API) first.');
    Drive.Files.update({}, file.getId(), pdf);
    file.setName(name);
  } else {
    file = DriveApp.getFolderById(PXI.INVOICES_FOLDER_ID).createFile(pdf);
  }
  inv.getRange(r, 1).setValue(newRef);
  inv.getRange(r, 6, 1, 4).setValues([[PXI_today_(), res.totalInc, res.amount, res.gst]]);
  inv.getRange(r, 14, 1, 2).setValues([[file.getId(), file.getUrl()]]);
  inv.getRange(r, 18).setValue(res.earlyDiscount || '');
  var idx = PXI_ss_().getSheetByName(PXI.FILES_TAB);
  var hit = PXI_findFileEntry_(idx, 'Invoice', invNo);
  var vals = ['Invoice', quote.key, newRef, quote.client, file.getId(), file.getUrl(), name, PXI_now_(), Date.now()];
  idx.getRange(hit ? hit.row : idx.getLastRow() + 1, 1, 1, vals.length).setValues([vals]);
  var qs = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var qrow = PXI_findQuoteRowByKey_(qs, quote.key);
  if (qrow) PXI_mirrorFiles_(qs, qrow, quote.key);
  return { status: 'ok', oldNo: invNo, invNo: newRef, ref: quote.ref, client: quote.client, amountDue: res.amount, fileId: file.getId(), link: file.getUrl(), fileName: name };
}
// Run once from the editor: gives Megan's unsent INV-2026-001 the correct next number
function PXI_fixInvoice001() {
  var r = PXI_renumberInvoice_('INV-2026-001');
  Logger.log('INV-2026-001 is now ' + r.invNo + ' (' + r.fileName + ')');
  return r;
}

// ---------------------------------------------------------------------
//  Invoice Requests: runs every minute from a time-driven trigger
// ---------------------------------------------------------------------
function PXI_processInvoiceRequests() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    var req = PXI_ss_().getSheetByName(PXI.REQ_TAB);
    if (!req || req.getLastRow() < 2) return;
    var data = req.getRange(2, 1, req.getLastRow() - 1, PXI.REQ_HEADERS.length).getValues();
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      var status = String(r[5]).trim().toLowerCase();
      if (!String(r[0]).trim() || !String(r[2]).trim()) continue;
      if (status && status !== 'retry') continue;
      var rowNo = i + 2;
      req.getRange(rowNo, 6).setValue('Processing');
      try {
        var res = PXI_buildInvoiceFromRequest_({
          ref: String(r[0]).trim(), client: String(r[1]).trim(), type: String(r[2]).trim(),
          amount: r[3], notes: String(r[4] || '')
        });
        req.getRange(rowNo, 6, 1, 11).setValues([['Done', res.invNo, res.jobTotal, res.paidToDate, res.amountDue,
          res.gst, res.balanceAfter, res.fileId, res.link, res.message || '', PXI_now_()]]);
      } catch (err) {
        req.getRange(rowNo, 6).setValue('Error');
        req.getRange(rowNo, 15, 1, 2).setValues([[String(err && err.message || err), PXI_now_()]]);
      }
    }
  } finally { lock.releaseLock(); }
}

function PXI_buildInvoiceFromRequest_(q) {
  var type = PXI_normType_(q.type);
  if (!type) throw new Error('Type must be Deposit, Progress or Final (got "' + q.type + '").');

  var quote = PXI_findQuoteForRequest_(q.ref, q.client);
  var state = PXI_quoteState_(quote.row);
  if (!state) throw new Error('Quote ' + quote.ref + ' was saved before the quote data was kept with it. Open it in the tool and hit Update once, then clear this Status to retry.');
  if (typeof PXP === 'undefined') throw new Error('PoxitPricing.gs is missing from the project. Paste it in and try again.');
  return PXI_invoiceFromState_(q, type, quote, state);
}

// The tool's own invoice (payment history, deposit limits, early payment), built from the saved quote
function PXI_invoiceFromState_(q, type, quote, state) {
  var stage = { 'Deposit': 'deposit', 'Progress': 'progress', 'Final': 'final' }[type];
  var ledger = PXI_invoicesForKey_(quote.key);
  var prices = typeof PXA_prices_ === 'function' ? PXA_prices_() : {};
  var notes = [];
  var probe = PXP.invoice({ state: state.state, measureShapes: state.measureShapes, prices: prices, saveKey: quote.key,
                            stage: stage, amount: q.amount, ledger: ledger, invNo: 'INV-0000-000', date: Date.now() });
  if (type === 'Progress') {
    var want = PXI_round_(PXI_money_(q.amount));
    if (!(want > 0)) throw new Error('Progress invoices need a dollar amount (inc GST) in "Progress Amount".');
    if (want > probe.balanceBefore + 0.005) throw new Error('Progress amount ' + PXI_fmt_(want) + ' is more than what is left on the job (' + PXI_fmt_(probe.balanceBefore) + ').');
  }
  if (type === 'Final' && !(probe.amount > 0.004)) throw new Error('Nothing left to invoice: paid to date ' + PXI_fmt_(probe.paidToDate) + ' already covers the job total ' + PXI_fmt_(probe.totalInc) + '.');
  if (type === 'Deposit') {
    var dep = ledger.filter(function (p) { return p.type === 'Deposit'; });
    if (dep.length) notes.push('Heads up: ' + dep.map(function (p) { return p.invNo; }).join(', ') + ' is already a Deposit invoice for this quote.');
  }
  if (type === 'Final') {
    var fin = ledger.filter(function (p) { return p.type === 'Final' && !p.paid; });
    if (fin.length) notes.push('Heads up: ' + fin.map(function (p) { return p.invNo; }).join(', ') + ' is an earlier Final for this job that is not ticked Paid. Only send one of them.');
  }
  var unpaid = ledger.filter(function (p) { return !p.paid && PXI_BILLS_[p.type]; });
  if (unpaid.length) notes.push('Not taken off because they are not ticked Paid: ' + unpaid.map(function (p) { return p.invNo + ' ' + p.type + ' ' + PXI_fmt_(p.amount); }).join(', ') + '. They are listed on the invoice as outstanding.');

  var invNo = PXI_invRef_(PXI_takeInvoiceNumber_(0));
  var res = PXP.invoice({ state: state.state, measureShapes: state.measureShapes, prices: prices, saveKey: quote.key,
                          stage: stage, amount: q.amount, ledger: ledger, invNo: invNo, date: Date.now(), notes: q.notes });
  var html = typeof PXA_serverHtml_ === 'function' ? PXA_serverHtml_(res.html) : res.html;
  var c = state.state.client || {};
  var name = PXI_fileName_([quote.client, c.area || '', (type + ' Invoice' + (res.progressNo ? ' ' + res.progressNo : '')), invNo]);
  var pdf = Utilities.newBlob(html, 'text/html', name.replace(/\.pdf$/, '.html')).getAs('application/pdf').setName(name);
  var file = PXI_storePdf_({ kind: 'Invoice', key: quote.key, number: invNo, client: quote.client, name: name, blob: pdf }).file;
  var inv = PXI_ss_().getSheetByName(PXI.INV_TAB);
  var r = inv.getLastRow() + 1;
  inv.getRange(r, 1, 1, PXI.INV_HEADERS.length).setValues([[invNo, quote.ref, quote.key, quote.client, type, PXI_today_(),
    res.totalInc, res.amount, res.gst, false, '', 'Invoice Request', quote.entity, file.getId(), file.getUrl(),
    res.progressNo || '', false, res.earlyDiscount || '']]);
  inv.getRange(r, 10).insertCheckboxes();
  inv.getRange(r, 17).insertCheckboxes();
  var qs = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var qrow = PXI_findQuoteRowByKey_(qs, quote.key);
  if (qrow) PXI_mirrorFiles_(qs, qrow, quote.key);
  if (res.earlyDiscount) notes.push('Early payment offer on this invoice: pay ' + PXI_fmt_(res.amount - res.earlyDiscount) + ' by 11:59pm today to save ' + PXI_fmt_(res.earlyDiscount) + '.');
  return { invNo: invNo, jobTotal: res.totalInc, paidToDate: res.paidToDate, amountDue: res.amount, gst: res.gst,
           balanceAfter: res.balanceAfter, fileId: file.getId(), link: file.getUrl(), message: notes.join(' ') };
}
var PXI_BILLS_ = { 'Deposit': 1, 'Progress': 1, 'Final': 1, 'Full Payment': 1, 'Full': 1 };
function PXI_quoteState_(row) {
  try {
    var raw = PXI_ss_().getSheetByName(PXI.QUOTES_TAB).getRange(row, PXI.Q.PAYLOAD).getValue();
    var p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return p && p.state ? { state: p.state, measureShapes: p.measureShapes || [] } : null;
  } catch (e) { return null; }
}

// ---------------------------------------------------------------------
//  Lookups
// ---------------------------------------------------------------------
function PXI_findQuoteRowByKey_(sh, key) {
  if (!key || sh.getLastRow() < 1) return 0;
  var keys = sh.getRange(1, PXI.Q.KEY, sh.getLastRow(), 1).getValues();
  for (var i = keys.length - 1; i >= 0; i--) if (String(keys[i][0]) === String(key)) return i + 1;
  return 0;
}

// Ref can be a quote number (PXT-2026-106) or a quote key (PXT-1790584732999).
// Quote numbers have been reused over time, so a ref that points at more than one
// saved quote is refused until the client name (or the key) narrows it down.
function PXI_findQuoteForRequest_(ref, client) {
  var sh = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var last = sh.getLastRow();
  if (last < 1) throw new Error('The quote sheet is empty.');
  var rows = sh.getRange(1, 1, last, PXI.Q.INV_EXPORTED).getValues();
  var want = String(ref).trim().toUpperCase();
  var byKey = /^PXT-\d{10,}$/.test(want);
  var hits = {};
  rows.forEach(function (r, i) {
    var match = byKey ? String(r[0]).toUpperCase() === want : String(r[5]).trim().toUpperCase() === want;
    if (!match) return;
    if (client && String(r[1]).toLowerCase().indexOf(client.toLowerCase()) < 0) return;
    hits[r[0]] = { row: i + 1, r: r }; // later rows overwrite earlier: latest save wins
  });
  var keys = Object.keys(hits);
  if (!keys.length) throw new Error('No saved quote found for ' + ref + (client ? ' and client "' + client + '"' : '') + '.');
  if (keys.length > 1) {
    throw new Error(ref + ' matches ' + keys.length + ' different saved quotes: ' + keys.map(function (k) {
      var r = hits[k].r; return r[1] + ' ' + PXI_fmt_(PXI_num_(r[3])) + ' ex GST, saved ' + r[4] + ' (key ' + k + ')';
    }).join('; ') + '. Put the client name in "Client" or the quote key in "Quote Ref", then clear Status.');
  }
  var h = hits[keys[0]], r = h.r, snap = null;
  try { snap = r[PXI.Q.SNAPSHOT - 1] ? JSON.parse(r[PXI.Q.SNAPSHOT - 1]) : null; } catch (e) { snap = null; }
  return {
    row: h.row, key: String(r[0]), client: String(r[1]).replace(/\s+/g, ' ').trim(), address: String(r[2]).trim(),
    ref: String(r[5]).trim(), snapshot: snap,
    entity: PXI_cleanEntity_(r[PXI.Q.ENTITY - 1]) || PXI_entityForKey_(r[0])
  };
}

function PXI_invoicesForKey_(key) {
  var inv = PXI_ss_().getSheetByName(PXI.INV_TAB);
  if (!inv || inv.getLastRow() < 2) return [];
  return inv.getRange(2, 1, inv.getLastRow() - 1, PXI.INV_HEADERS.length).getValues()
    .filter(function (r) { return String(r[2]) === String(key); })
    .map(function (r) {
      var d = r[5];
      return { invNo: String(r[0]), type: String(r[4]), amountDue: PXI_num_(r[7]), amount: PXI_num_(r[7]),
               date: Object.prototype.toString.call(d) === '[object Date]' ? Utilities.formatDate(d, PXI.TZ, 'dd/MM/yyyy') : String(d || ''),
               paid: r[9] === true || String(r[9]).toUpperCase() === 'TRUE',
               progressNo: PXI_num_(r[15]) || 0, onTime: r[16] === true || String(r[16]).toUpperCase() === 'TRUE',
               earlyDiscount: PXI_num_(r[17]) };
    });
}

function PXI_findInvoiceRow_(sh, invNo) {
  if (sh.getLastRow() < 2) return 0;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === String(invNo)) return i + 2;
  return 0;
}

function PXI_setup() {
  var ss = PXI_ss_();
  [[PXI.REQ_TAB, PXI.REQ_HEADERS], [PXI.INV_TAB, PXI.INV_HEADERS], [PXI.FILES_TAB, PXI.FILES_HEADERS]].forEach(function (t) {
    var sh = ss.getSheetByName(t[0]) || ss.insertSheet(t[0]);
    sh.getRange(1, 1, 1, t[1].length).setValues([t[1]]).setFontWeight('bold').setBackground('#0ABAB5').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });
  var req = ss.getSheetByName(PXI.REQ_TAB);
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(['Deposit', 'Progress', 'Final'], true).setAllowInvalid(false).build();
  req.getRange(2, 3, 999, 1).setDataValidation(rule);
  DriveApp.getFolderById(PXI.QUOTES_FOLDER_ID).getName();   // fails loudly if a folder ID is wrong
  DriveApp.getFolderById(PXI.INVOICES_FOLDER_ID).getName();
  if (typeof Drive === 'undefined') throw new Error('Add the Drive service first: Services > Drive API > Add. Then run PXI_setup again.');
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (tr.getHandlerFunction() === 'PXI_processInvoiceRequests') ScriptApp.deleteTrigger(tr);
  });
  ScriptApp.newTrigger('PXI_processInvoiceRequests').timeBased().everyMinutes(1).create();
  return 'Setup done';
}

// ---------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------
function PXI_ss_() { return SpreadsheetApp.openById(PXI.SHEET_ID); }

function PXI_trashIfExists_(id) {
  if (!id) return;
  try { DriveApp.getFileById(String(id)).setTrashed(true); } catch (e) {}
}
function PXI_entityForKey_(key) {
  var m = String(key || '').match(/^PXT-(\d{12,})$/);
  if (!m) return 'Company';
  return parseInt(m[1], 10) < PXI.CHANGEOVER_MS ? 'Sole Trader' : 'Company';
}
function PXI_cleanEntity_(v) { v = String(v || '').trim(); return PXI.ENTITIES[v] ? v : ''; }
function PXI_normType_(t) {
  t = String(t || '').trim().toLowerCase();
  return t === 'deposit' ? 'Deposit' : t === 'progress' ? 'Progress' : t === 'final' ? 'Final' : '';
}
function PXI_invRef_(n) { return 'INV-' + Utilities.formatDate(new Date(), PXI.TZ, 'yyyy') + '-' + ('00' + n).slice(-3); }
function PXI_cleanName_(n) {
  n = String(n || '').replace(/[\/\\:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
  if (!n) return '';
  return /\.pdf$/i.test(n) ? n : n + '.pdf';
}
function PXI_fileName_(parts) {
  return parts.map(function (p) { return String(p || '').replace(/[\/\\:*?"<>|]/g, '').replace(/\s+/g, ' ').trim(); })
    .filter(String).join(' - ') + '.pdf';
}
function PXI_num_(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }
function PXI_money_(v) { return PXI_num_(String(v === undefined || v === null ? '' : v).replace(/[$,\s]/g, '')); }
function PXI_round_(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function PXI_clean_(v) { return String(v === undefined || v === null ? '' : v).trim(); }
function PXI_fmt_(n) {
  n = PXI_round_(PXI_num_(n));
  var neg = n < 0; n = Math.abs(n);
  var p = n.toFixed(2).split('.');
  return (neg ? '-' : '') + '$' + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + p[1];
}
function PXI_fmtDate_(d) { return Utilities.formatDate(d, PXI.TZ, 'd/M/yyyy'); }
function PXI_today_() { return PXI_fmtDate_(new Date()); }
function PXI_now_() { return Utilities.formatDate(new Date(), PXI.TZ, 'd/M/yyyy HH:mm'); }
function PXI_esc_(v) {
  return String(v === undefined || v === null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
