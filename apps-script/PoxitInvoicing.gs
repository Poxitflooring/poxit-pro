// =====================================================================
//  POXIT INVOICING  (file: PoxitInvoicing.gs)
//
//  Lives in the same Apps Script project as the quote sheet's existing
//  code, as its own file. It does NOT touch doGet, so quote save/load and
//  Job Track keep working exactly as before.
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
//   3. "Invoices" tab: one row per invoice, with a Paid tick box. A Final
//      invoice only takes off Deposit and Progress invoices ticked Paid.
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
                'Source', 'Entity', 'File ID', 'Link'],

  ENTITIES: {
    'Company': {
      legalName: 'Poxit Flooring Pty Ltd', abn: '23 702 727 535', acn: '702 727 535',
      bankName: 'Poxit Flooring Pty Ltd', bsb: '067 873', account: '26553862',
      address: '1/12 Dorretti Circuit, Upper Coomera QLD 4209'
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
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'quoteMeta') out = PXI_quoteMeta_(body);
    else if (body.action === 'savePdf') out = PXI_savePdf_(body);
    else if (body.action === 'nextInvoice') out = PXI_nextInvoice_(body);
    else out = { status: 'error', message: 'Unknown action' };
  } catch (err) {
    out = { status: 'error', message: String(err && err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

// Quote tool, after each Save/Update: store entity, location, totals snapshot
function PXI_quoteMeta_(b) {
  var sh = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var row = PXI_findQuoteRowByKey_(sh, b.key);
  if (!row) return { status: 'not_found', message: 'No quote row with key ' + b.key };
  PXI_writeQuoteTotals_(sh, row, b.key, b.entity, b.location, b.snapshot || {});
  PXI_mirrorFiles_(sh, row, b.key); // an Update re-adds the row, so put the PDF links back on it
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
  var kind = b.kind === 'Invoice' ? 'Invoice' : 'Quote';
  if (kind === 'Invoice' && !b.invNo) return { status: 'error', message: 'Invoice number missing' };
  var bytes = Utilities.base64Decode(String(b.base64).replace(/^data:application\/pdf;base64,/, ''));
  var name = PXI_cleanName_(b.fileName) ||
    (kind === 'Quote' ? PXI_fileName_([b.client, 'Quote', b.ref]) : PXI_fileName_([b.client, (b.invType || 'Tax') + ' Invoice', b.invNo]));
  var blob = Utilities.newBlob(bytes, 'application/pdf', name);

  var saved = PXI_storePdf_({ kind: kind, key: PXI_clean_(b.key), number: kind === 'Quote' ? PXI_clean_(b.ref) : PXI_clean_(b.invNo),
                              client: PXI_clean_(b.client), name: name, blob: blob });

  var qs = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var row = PXI_findQuoteRowByKey_(qs, b.key);
  if (row) {
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
      'Quote tool', PXI_cleanEntity_(b.entity) || PXI_entityForKey_(b.key), saved.file.getId(), saved.file.getUrl()];
    var r = found || inv.getLastRow() + 1;
    inv.getRange(r, 1, 1, values.length).setValues([values]);
    inv.getRange(r, 10).insertCheckboxes();
  }
  return { status: 'ok', fileId: saved.file.getId(), link: saved.file.getUrl(), name: name,
           updated: saved.updated, row: row || null,
           message: row ? '' : 'Saved to Drive, but no saved quote row was found for this quote.' };
}

// Put a PDF in its folder. If this quote (by key) or invoice (by number) already has a
// file, that file gets the new PDF as a new version: same file, same link.
function PXI_storePdf_(o) {
  var idx = PXI_ss_().getSheetByName(PXI.FILES_TAB);
  var folderId = o.kind === 'Quote' ? PXI.QUOTES_FOLDER_ID : PXI.INVOICES_FOLDER_ID;
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
    if (c && nl.indexOf(c) !== 0) continue;
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
  var last = PXI_num_(props.getProperty('PXI_LAST_INVOICE'));
  // never go below any number already used, in the log or on a device
  var inv = PXI_ss_().getSheetByName(PXI.INV_TAB);
  if (inv && inv.getLastRow() > 1) {
    inv.getRange(2, 1, inv.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var m = String(r[0]).match(/INV-\d{4}-(\d+)/);
      if (m) last = Math.max(last, parseInt(m[1], 10));
    });
  }
  var n = Math.max(last, Math.floor(localLast || 0)) + 1;
  props.setProperty('PXI_LAST_INVOICE', String(n));
  return n;
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
  var snap = quote.snapshot;
  if (!snap || !(PXI_num_(snap.incGst) > 0)) {
    throw new Error('No saved totals for ' + quote.ref + ' yet. Open the quote in the tool, hit Update once, then clear this Status to retry.');
  }
  var jobTotal = PXI_round_(PXI_num_(snap.incGst));

  // Every paid bill counts toward paid to date. "Paid" receipts from the tool are not bills, so they are skipped.
  var BILLS = { 'Deposit': 1, 'Progress': 1, 'Final': 1, 'Full Payment': 1, 'Full': 1 };
  var prior = PXI_invoicesForKey_(quote.key).filter(function (p) { return BILLS[p.type]; });
  var paidRows = prior.filter(function (p) { return p.paid; });
  var unpaidRows = prior.filter(function (p) { return !p.paid; });
  var paidToDate = PXI_round_(paidRows.reduce(function (s, p) { return s + p.amountDue; }, 0));
  var remaining = PXI_round_(jobTotal - paidToDate);
  var notes = [];

  var amountDue;
  if (type === 'Deposit') {
    amountDue = PXI_round_(jobTotal * PXI.DEPOSIT_RATE);
    var earlierDeposit = prior.filter(function (p) { return p.type === 'Deposit'; });
    if (earlierDeposit.length) notes.push('Heads up: ' + earlierDeposit.map(function (p) { return p.invNo; }).join(', ') + ' is already a Deposit invoice for this quote.');
  } else if (type === 'Progress') {
    amountDue = PXI_round_(PXI_money_(q.amount));
    if (!(amountDue > 0)) throw new Error('Progress invoices need a dollar amount (inc GST) in "Progress Amount".');
    if (amountDue > remaining + 0.005) throw new Error('Progress amount ' + PXI_fmt_(amountDue) + ' is more than what is left on the job (' + PXI_fmt_(remaining) + ').');
  } else {
    amountDue = remaining;
    var earlierFinal = unpaidRows.filter(function (p) { return p.type === 'Final'; });
    if (earlierFinal.length) notes.push('Heads up: ' + earlierFinal.map(function (p) { return p.invNo; }).join(', ') + ' is an earlier Final for this job that is not ticked Paid. Only send one of them.');
    if (!(amountDue > 0.004)) throw new Error('Nothing left to invoice: paid to date ' + PXI_fmt_(paidToDate) + ' already covers the job total ' + PXI_fmt_(jobTotal) + '.');
  }
  if (unpaidRows.length) {
    notes.push('Not taken off because they are not ticked Paid: ' + unpaidRows.map(function (p) { return p.invNo + ' ' + p.type + ' ' + PXI_fmt_(p.amountDue); }).join(', ') + '.');
  }

  var balanceAfter = PXI_round_(jobTotal - paidToDate - amountDue);
  var gst = PXI_round_(amountDue / 11);

  var invNo = PXI_invRef_(PXI_takeInvoiceNumber_(0));

  var entity = quote.entity;
  var html = PXI_invoiceHtml_({
    invNo: invNo, type: type, quote: quote, snap: snap, entity: entity,
    jobTotal: jobTotal, paidRows: paidRows, paidToDate: paidToDate,
    amountDue: amountDue, gst: gst, balanceAfter: balanceAfter
  });
  var name = PXI_fileName_([quote.client, (snap.client && snap.client.area) || '',
    ((snap.service ? snap.service + ' ' : '') + type + ' Invoice').trim(), invNo]);
  var pdf = Utilities.newBlob(html, 'text/html', name.replace(/\.pdf$/, '.html')).getAs('application/pdf').setName(name);
  var file = PXI_storePdf_({ kind: 'Invoice', key: quote.key, number: invNo, client: quote.client, name: name, blob: pdf }).file;

  var inv = PXI_ss_().getSheetByName(PXI.INV_TAB);
  var r = inv.getLastRow() + 1;
  inv.getRange(r, 1, 1, PXI.INV_HEADERS.length).setValues([[invNo, quote.ref, quote.key, quote.client, type, PXI_today_(),
    jobTotal, amountDue, gst, false, '', 'Invoice Request', entity, file.getId(), file.getUrl()]]);
  inv.getRange(r, 10).insertCheckboxes();
  var qs = PXI_ss_().getSheetByName(PXI.QUOTES_TAB);
  var qrow = PXI_findQuoteRowByKey_(qs, quote.key);
  if (qrow) PXI_mirrorFiles_(qs, qrow, quote.key);

  return { invNo: invNo, jobTotal: jobTotal, paidToDate: paidToDate, amountDue: amountDue, gst: gst,
           balanceAfter: balanceAfter, fileId: file.getId(), link: file.getUrl(), message: notes.join(' ') };
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
      return { invNo: String(r[0]), type: String(r[4]), amountDue: PXI_num_(r[7]),
               paid: r[9] === true || String(r[9]).toUpperCase() === 'TRUE' };
    });
}

function PXI_findInvoiceRow_(sh, invNo) {
  if (sh.getLastRow() < 2) return 0;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === String(invNo)) return i + 2;
  return 0;
}

// ---------------------------------------------------------------------
//  Invoice document (table layout so Google's PDF converter keeps it tidy)
// ---------------------------------------------------------------------
function PXI_invoiceHtml_(d) {
  var E = PXI.ENTITIES[d.entity] || PXI.ENTITIES['Company'];
  var s = d.snap || {}, c = s.client || {};
  var esc = PXI_esc_;
  var today = new Date(), due = new Date(today.getTime() + PXI.DUE_DAYS * 86400000);
  var idLine = esc(E.legalName) + ' &nbsp;|&nbsp; ABN ' + esc(E.abn) + (E.acn ? ' &nbsp;|&nbsp; ACN ' + esc(E.acn) : '');
  var titles = { Deposit: 'Deposit Invoice', Progress: 'Progress Claim', Final: 'Final Invoice' };

  var css = 'body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a1a1a;margin:0;}' +
    'table{border-collapse:collapse;width:100%;}td{vertical-align:top;}' +
    '.hdr td{background:#0a0a0a;color:#fff;text-align:center;padding:18pt 10pt 14pt;}' +
    '.rule td{background:#0ABAB5;height:4pt;font-size:1pt;line-height:1pt;}' +
    '.badge{background:#0ABAB5;color:#fff;font-weight:bold;font-size:10pt;letter-spacing:1pt;padding:3pt 8pt;}' +
    '.cb td{border-bottom:1px solid #e8e8e8;padding:5pt 8pt;font-size:10.5pt;}' +
    '.cl{font-weight:bold;width:32%;}' +
    '.sec td{border-bottom:1.5px solid #0ABAB5;padding:14pt 0 3pt;font-weight:bold;font-size:11.5pt;text-transform:uppercase;}' +
    '.num{color:#0ABAB5;}' +
    '.sc td{padding:5pt 3pt;font-size:10.5pt;}.sc .amt{text-align:right;white-space:nowrap;width:22%;font-weight:bold;}' +
    '.desc{font-size:9.5pt;color:#777;font-style:italic;}.add{font-size:9.5pt;color:#555;padding-left:12pt !important;}' +
    '.tot td{padding:4pt 3pt;font-size:10.5pt;}.tot .amt{text-align:right;font-weight:bold;width:30%;}' +
    '.inc td{border-top:2px solid #0ABAB5;font-size:13pt;font-weight:bold;}.inc .amt{color:#0ABAB5;}' +
    '.pay{border:1.5px solid #0ABAB5;}.pay td{padding:5pt 10pt;font-size:10.5pt;border-bottom:1px solid #f0f0f0;}' +
    '.pay .amt{text-align:right;font-weight:bold;width:30%;}.ptitle td{color:#0ABAB5;font-weight:bold;text-transform:uppercase;padding-top:8pt;}' +
    '.due td{font-weight:bold;font-size:12.5pt;}.due .amt{color:#0ABAB5;}' +
    '.bank td{background:#f9f8f6;border:1px solid #e0ddd8;padding:8pt 10pt;font-size:10.5pt;line-height:1.6;}' +
    '.fine{font-size:8.5pt;color:#999;font-style:italic;padding-top:5pt;}' +
    '.foot td{border-top:1px solid #e0e0e0;text-align:center;font-size:8.5pt;color:#999;padding:10pt;}';

  var site = [c.address || d.quote.address, c.suburb].filter(function (x) { return x && String(x).trim(); }).join(', ');
  var clientRows = [
    ['Invoice To', '<b>' + esc(c.name || d.quote.client) + '</b>'],
    ['Phone', esc(c.phone || '—')], ['Email', esc(c.email || '—')],
    ['Site Address', esc(site || '—')], ['Quote Reference', esc(d.quote.ref || '—')],
    ['Invoice Date', PXI_fmtDate_(today)], ['Due Date', PXI_fmtDate_(due)]
  ].map(function (x) { return '<tr><td class="cl">' + x[0] + ':</td><td>' + x[1] + '</td></tr>'; }).join('');

  var lines = (s.lines || []).map(function (l) {
    var adds = (l.addons || []).map(function (a) { return '<tr><td class="add" colspan="2">↳ ' + esc(a) + '</td></tr>'; }).join('');
    return '<tr><td><b>' + esc(l.category) + '</b>' + (l.zoneName ? ' — ' + esc(l.zoneName) : '') +
      (l.desc ? '<br><span class="desc">' + esc(l.desc) + '</span>' : '') + '</td><td class="amt">' + PXI_fmt_(l.amount) + '</td></tr>' + adds;
  }).join('');
  if (PXI_num_(s.adjustment)) lines += '<tr><td><b>' + (s.adjustment < 0 ? 'Discount' : 'Adjustment') + '</b></td><td class="amt">' + (s.adjustment < 0 ? '-' : '') + PXI_fmt_(Math.abs(s.adjustment)) + '</td></tr>';

  var pay = '<tr class="ptitle"><td colspan="2">' + titles[d.type] + '</td></tr>' +
    '<tr><td>Job total (inc GST)</td><td class="amt">' + PXI_fmt_(d.jobTotal) + '</td></tr>';
  if (d.type === 'Deposit') {
    pay += '<tr><td>' + Math.round(PXI.DEPOSIT_RATE * 100) + '% deposit to confirm your booking</td><td class="amt">' + PXI_fmt_(d.amountDue) + '</td></tr>';
  } else {
    d.paidRows.forEach(function (p) {
      pay += '<tr><td>Less ' + esc(p.type.toLowerCase()) + ' paid (' + esc(p.invNo) + ')</td><td class="amt">-' + PXI_fmt_(p.amountDue) + '</td></tr>';
    });
    if (d.type === 'Progress') pay += '<tr><td>This progress claim</td><td class="amt">' + PXI_fmt_(d.amountDue) + '</td></tr>';
  }
  pay += '<tr class="due"><td>' + (d.type === 'Final' ? 'Balance due' : 'Amount due') + '</td><td class="amt">' + PXI_fmt_(d.amountDue) + '</td></tr>' +
    '<tr><td>GST included in amount due</td><td class="amt">' + PXI_fmt_(d.gst) + '</td></tr>';
  if (d.type !== 'Final') pay += '<tr><td>Balance remaining after this invoice</td><td class="amt">' + PXI_fmt_(d.balanceAfter) + '</td></tr>';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + esc(d.invNo) + '</title><style>' + css + '</style></head><body>' +
    '<table class="hdr"><tr><td><div style="font-size:30pt;font-weight:bold;letter-spacing:3pt;">POXIT</div>' +
    '<div style="font-size:9pt;letter-spacing:4pt;font-weight:bold;">FLOORING</div>' +
    '<div style="font-size:8.5pt;color:#0ABAB5;letter-spacing:2pt;font-weight:bold;padding-top:8pt;">CONCRETE REPAIR &amp; COATING SPECIALISTS</div>' +
    '<div style="font-size:11pt;letter-spacing:1.5pt;font-weight:bold;padding-top:3pt;">TAX INVOICE</div>' +
    '<div style="font-size:8.5pt;color:#bbb;padding-top:8pt;">' + idLine + '</div></td></tr></table>' +
    '<table class="rule"><tr><td>&nbsp;</td></tr></table>' +
    '<div style="padding:16pt 26pt;">' +
    '<p style="margin:0 0 10pt;"><span class="badge">TAX INVOICE · ' + esc(d.invNo) + '</span></p>' +
    '<table class="cb" style="border:1px solid #ccc;">' + clientRows + '</table>' +
    '<table><tr class="sec"><td><span class="num">1.</span> Scope of Works</td></tr></table>' +
    '<table class="sc">' + lines + '</table>' +
    '<table><tr class="sec"><td><span class="num">2.</span> Job Total</td></tr></table>' +
    '<table class="tot"><tr><td>Subtotal (ex GST)</td><td class="amt">' + PXI_fmt_(s.exGst) + '</td></tr>' +
    '<tr><td>GST (10%)</td><td class="amt">' + PXI_fmt_(s.gst) + '</td></tr>' +
    '<tr class="inc"><td>TOTAL INC GST</td><td class="amt">' + PXI_fmt_(d.jobTotal) + '</td></tr></table>' +
    '<table><tr class="sec"><td><span class="num">3.</span> Payment</td></tr></table>' +
    '<table class="pay">' + pay + '</table>' +
    '<table class="bank" style="margin-top:8pt;"><tr><td><b>Bank Transfer:</b><br>Account Name: <b>' + esc(E.bankName) + '</b><br>' +
    'BSB: <b>' + esc(E.bsb) + '</b> &nbsp;&nbsp; Account: <b>' + esc(E.account) + '</b><br>Reference: <b>' + esc(d.invNo) + '</b></td></tr></table>' +
    (s.notes || []).map(function (n) { return '<p style="font-size:10pt;line-height:1.6;margin:10pt 0 0;">' + esc(n) + '</p>'; }).join('') +
    '<p class="fine">Payment is due within ' + PXI.DUE_DAYS + ' days. Late payments incur fees as per the signed work contract. ' + esc(E.legalName) + ' ABN ' + esc(E.abn) + '</p>' +
    '</div>' +
    '<table class="foot"><tr><td>' + esc(E.legalName) + ' · ABN ' + esc(E.abn) + (E.acn ? ' · ACN ' + esc(E.acn) : '') + ' · ' + esc(E.address) +
    ' · ' + PXI.CONTACT.phone + ' · ' + PXI.CONTACT.email + ' · ' + PXI.CONTACT.web + '</td></tr></table>' +
    '</body></html>';
}

// ---------------------------------------------------------------------
//  One-time setup: tabs, folders, the 1-minute timer. Safe to run again.
// ---------------------------------------------------------------------
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
