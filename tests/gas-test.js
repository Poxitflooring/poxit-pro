// Tests for the Apps Script side (PoxitPricing.gs, PoxitInvoicing.gs, PoxitApi.gs) against an in-memory
// Google stand-in, plus price parity with the tool itself.  Run:  NODE_PATH=<node_modules> node tests/gas-test.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { makeEnv } = require('./gas-mock');
const ROOT = path.join(__dirname, '..');
let fails = 0, passes = 0;
function ok(c, m) { console.log((c ? 'PASS ' : 'FAIL ') + m); if (c) passes++; else { fails++; process.exitCode = 1; } }
const close = (a, b) => Math.abs(a - b) < 0.005;

function boot(opts) {
  const env = makeEnv(opts);
  const ctx = vm.createContext(Object.assign({}, env.globals));
  ['PoxitPricing.gs', 'PoxitInvoicing.gs', 'PoxitApi.gs'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'apps-script', f), 'utf8'), ctx, { filename: f });
  });
  env.ctx = ctx;
  env.run = (code) => vm.runInContext(code, ctx);
  env.post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
  return env;
}

(async function main() {
  // ---- the bundle is current
  const { build } = require(path.join(ROOT, 'tools', 'build-pricing.js'));
  ok(build() === fs.readFileSync(path.join(ROOT, 'apps-script', 'PoxitPricing.gs'), 'utf8'), 'PoxitPricing.gs is built from the current index.html');

  const env = boot();
  const QF = '1ws1ujtGAloblVlNBFVnz6wObCFXV1QgV', IF = '1BQudYgl0AAJcsa-CFCoWdztGtWBARjjP';
  env.run('PXI_setup(); PXA_setup();');
  const KEY = env.props.PXA_API_KEY;
  ok(KEY && KEY.length === 64, 'setup makes a 64 character key');
  ok(env.logs.some(l => l.indexOf(KEY) > -1), 'setup logs the key for Dom');
  ok(!!env.sheets['API Requests'] && !!env.sheets['Price Table'], 'setup makes the API Requests and Price Table tabs');
  ok(env.sheets['Price Table'].getLastRow() > 80, 'price table tab lists every rate (' + env.sheets['Price Table'].getLastRow() + ' rows)');
  ok(env.triggers.some(t => t.fn === 'PXA_processApiRequests') && env.triggers.some(t => t.fn === 'PXI_processInvoiceRequests'), 'both 1-minute timers set');

  // ---- key protection
  const job = { action: 'createQuote',
    client: { first: 'Jane', last: 'Citizen', phone: '0400 000 000', email: 'jane@example.com', address: '12 Wave St', suburb: 'Burleigh Heads', location: 'Internal' },
    areas: [{ type: 'epoxy', name: 'Garage', area: 45, system: 'Flake Internal', finish: 'Gloss' },
            { type: 'seal', name: 'Patio', area: 30, system: 'Premium Next-Day Sealer', finish: 'Matte' }] };
  ok(/key/i.test(env.post(job).message), 'createQuote without the key is refused');
  ok(/key/i.test(env.post(Object.assign({}, job, { key: 'nope' })).message), 'createQuote with a wrong key is refused');
  ok(env.sheets.Sheet1.getLastRow() === 0, 'nothing written when refused');

  // ---- createQuote
  const r = env.post(Object.assign({}, job, { key: KEY }));
  ok(r.status === 'ok', 'createQuote works with the key ' + (r.message || ''));
  const yr = new Date().getFullYear();
  ok(r.ref === 'PXT-' + yr + '-001', 'first quote gets ' + r.ref);
  // epoxy 45 x 90 + premium next-day 30 x 35 + travel Burleigh 3.5km x2 x2 days x 1.75 + waste light 45 x 0.39 + tip run 150
  ok(close(r.totals.exGst, 4050 + 1050 + 24.5 + 17.55 + 150), 'createQuote prices like the tool: ex GST ' + r.totals.exGst);
  ok(close(r.totals.incGst, (4050 + 1050 + 24.5 + 17.55 + 150) * 1.1), 'inc GST ' + r.totals.incGst);
  ok(r.days === 2, 'days on site auto = 2');
  ok(r.lines.map(l => l.key).join(',') === 'epoxy-0,seal-0,waste,wasteRun,travel', 'lines: ' + r.lines.map(l => l.key).join(','));
  const row = env.sheets.Sheet1.rows[0];
  ok(row[0] === r.key && row[1] === 'Jane Citizen' && row[2] === '12 Wave St' && row[5] === r.ref, 'sheet row A to F written (key, name, address, ref)');
  ok(/^\d{2}\/\d{2}\/\d{4} \d{1,2}:\d{2} (am|pm)$/.test(row[4]), 'save date in the tool\'s format: ' + row[4]);
  const payload = JSON.parse(row[6]);
  ok(payload.state && payload.state.client.ref === r.ref && payload.state.saveKey === r.key, 'payload in G opens in the tool (state + ref + key)');
  ok(row[7] === 'Company' && row[8] === 'Internal' && close(row[9], r.totals.exGst) && close(row[10], r.totals.incGst), 'H to K: entity, location, totals ex and inc GST');
  ok(row[12] === r.link && /\d/.test(String(row[13])), 'M and N: Drive link and date written back');
  ok(row[17] === 'Quoted', 'R: status Quoted');
  const f = env.files[r.fileId];
  ok(f && f.folderId === QF && f.mime === 'application/pdf', 'PDF saved in the Quotes folder');
  ok(f.name === r.ref + ' - Jane Citizen - 12 Wave St, Burleigh Heads.pdf', 'named "PXT-ref - Client - Address.pdf": ' + f.name);
  ok(r.link === f.getUrl() && r.fileId === f.id, 'returns the Drive file ID and link');
  ok(!/<script/i.test(f.data) && !/@import/.test(f.data) && /<table class="client-box">/.test(f.data), 'server PDF source has no scripts, no web fonts, client box as a table');
  ok(f.data.indexOf('Quote Total (Inc GST)') > -1 && f.data.indexOf('$' + r.totals.incGst.toLocaleString('en-AU', { minimumFractionDigits: 2 })) > -1, 'PDF shows the Quote Total inc GST');
  ok(!/[\u{1F300}-\u{1FAFF}]/u.test(f.data), 'no emoji left for the converter');
  ok(f.data.indexOf('Gloss finish') > -1 && f.data.indexOf('Premium Next-Day Sealer') > -1, 'PDF shows finishes and the seal tier');

  // ---- same quote in the tool gives the same total and the same document
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://poxitflooring.github.io/poxit-pro/',
    beforeParse(w) { w.alert = () => {}; w.confirm = () => true; w.fetch = () => Promise.reject('offline'); w.scrollTo = () => {}; } });
  await new Promise(res => setTimeout(res, 600));
  const tw = dom.window;
  tw.eval('restoreQuote(' + row[6] + '); S.saveKey=' + JSON.stringify(r.key) + ';');
  ok(close(tw.eval('calcAll()'), r.totals.exGst), 'PARITY the tool gives the same total for the saved quote (' + tw.eval('calcAll()') + ')');
  ok(tw.eval('quoteDocHtml()') === env.run('PXP.run({state:' + JSON.stringify(JSON.parse(row[6]).state) + ',saveKey:' + JSON.stringify(r.key) + '}).html'), 'PARITY the server builds the same quote document as the tool');
  ok(tw.eval('driveQuoteName()') === f.name, 'PARITY tool Export and server use the same Drive name');

  // ---- getQuoteByRef / listQuotes
  const g1 = env.post({ action: 'getQuoteByRef', key: KEY, ref: r.ref });
  ok(g1.status === 'ok' && g1.key === r.key && g1.link === r.link && g1.fileId === r.fileId && close(g1.totals.incGst, r.totals.incGst), 'getQuoteByRef returns totals, link and file ID');
  ok(g1.lines && g1.lines.length === 5 && g1.quoteStatus === 'Quoted', 'getQuoteByRef includes the lines and status');
  ok(/No saved quote/.test(env.post({ action: 'getQuoteByRef', key: KEY, ref: 'PXT-1999-999' }).message), 'unknown ref explains itself');
  const r2 = env.post({ action: 'createQuote', key: KEY, client: { name: 'Toowoomba Grain Co', address: '5 Rail St', location: 'External', entity: 'Company' },
    areas: [{ type: 'gs', name: 'Shed', area: 120 }], travel: { place: 'Toowoomba', km: 160 } });
  ok(r2.status === 'ok' && r2.ref === 'PXT-' + yr + '-002', 'second quote ' + r2.ref + ' ' + (r2.message || ''));
  const tr = r2.lines.find(l => l.key === 'travel');
  // 120m² grind & seal = 3 days (2 + 1), billable 135km x 2 x 3 x 1.75
  ok(r2.days === 3 && tr && close(tr.amount, 135 * 2 * 3 * 1.75) && tr.desc.indexOf('Toowoomba') === 0, 'custom location travel: Toowoomba 160km, 3 days = ' + (tr && tr.amount));
  ok(env.files[r2.fileId].name === r2.ref + ' - Toowoomba Grain Co - 5 Rail St, Toowoomba.pdf', 'custom location in the file name');
  let L = env.post({ action: 'listQuotes', key: KEY });
  ok(L.count === 2 && L.quotes[0].ref === r2.ref, 'listQuotes newest first');
  L = env.post({ action: 'listQuotes', key: KEY, client: 'jane' });
  ok(L.count === 1 && L.quotes[0].ref === r.ref && L.quotes[0].status === 'Quoted' && L.quotes[0].link === r.link, 'listQuotes filters by client name');
  const today = env.run("Utilities.formatDate(new Date(), PXI.TZ, 'dd/MM/yyyy')");
  const tomorrow = env.run("Utilities.formatDate(new Date(Date.now()+86400000), PXI.TZ, 'dd/MM/yyyy')");
  ok(env.post({ action: 'listQuotes', key: KEY, from: today, to: today }).count === 2 && env.post({ action: 'listQuotes', key: KEY, from: tomorrow }).count === 0, 'listQuotes filters by date');
  ok(env.post({ action: 'listQuotes', key: KEY, status: 'invoiced' }).count === 0, 'listQuotes filters by status');

  // ---- updateQuote: change a line, recalc, same row, same file as a new version
  const filesBefore = Object.keys(env.files).length;
  const u = env.post({ action: 'updateQuote', key: KEY, ref: r.ref, set: { 'epoxyZones.0.area': 50 }, status: 'Accepted' });
  ok(u.status === 'ok' && close(u.totals.exGst, 50 * 90 + 1050 + 24.5 + 50 * 0.39 + 150), 'updateQuote recalculates (epoxy 50m², waste follows) ' + u.totals.exGst);
  ok(env.sheets.Sheet1.getLastRow() === 2 && env.sheets.Sheet1.rows[0][0] === r.key, 'update stays on the same row (no duplicate)');
  ok(u.fileId === r.fileId && env.files[r.fileId].versions === 2 && Object.keys(env.files).length === filesBefore, 'same Drive file updated as a new version, no duplicate');
  ok(close(env.sheets.Sheet1.rows[0][9], u.totals.exGst) && env.sheets.Sheet1.rows[0][17] === 'Accepted' && JSON.parse(env.sheets.Sheet1.rows[0][6]).state.quoteStatus === 'Accepted', 'new totals and status on the row');
  const u2 = env.post({ action: 'updateQuote', key: KEY, ref: r.ref, lineEdits: { 'seal-0': { amount: 900, name: 'Patio clean and premium seal' } },
    customItems: [{ desc: 'After hours access', price: 120 }] });
  ok(close(u2.totals.exGst, u.totals.exGst - 1050 + 900 + 120), 'updateQuote line edit + custom line: ' + u2.totals.exGst);
  ok(env.files[r.fileId].data.indexOf('Patio clean and premium seal') > -1 && env.files[r.fileId].data.indexOf('After hours access') > -1, 'edited lines on the new PDF');
  const u3 = env.post({ action: 'updateQuote', key: KEY, ref: r.ref, addAreas: [{ type: 'epoxy', name: 'Laundry', area: 8, system: 'Solid Colour — Full System', walls: true, wallM2: 4 }] });
  const ln = u3.lines.find(l => l.key === 'epoxy-1');
  ok(ln && close(ln.amount, 8 * 85 + 4 * 85), 'addAreas with walls (wall rate = floor rate) ' + (ln && ln.amount));
  const u4 = env.post({ action: 'updateQuote', key: KEY, ref: r.ref, removeAreas: [{ type: 'epoxy', index: 1 }], days: 4 });
  ok(!u4.lines.find(l => l.key === 'epoxy-1') && u4.days === 4, 'removeAreas and manual days');
  ok(/Nothing at/.test(env.post({ action: 'updateQuote', key: KEY, ref: r.ref, set: { 'tintedZones.3.area': 5 } }).message), 'bad path explains itself');

  // a tool Update deletes and re-adds the row: status comes back from the quote data
  const sh1 = env.sheets.Sheet1, saved = sh1.rows[0].slice(0, 7);
  sh1.rows.splice(0, 1); sh1.appendRow(saved);
  env.post({ action: 'quoteMeta', key: r.key, ref: r.ref, entity: 'Company', location: 'Internal', snapshot: { exGst: u4.totals.exGst, incGst: u4.totals.incGst } });
  const moved = sh1.rows.findIndex(x => x[0] === r.key);
  ok(sh1.rows[moved][17] === 'Accepted' && sh1.rows[moved][12] === r.link, 'after a tool Update the status and PDF link come back on the row');
  // ---- regeneratePdf
  const v = env.files[r.fileId].versions;
  const rg = env.post({ action: 'regeneratePdf', key: KEY, ref: r.ref });
  ok(rg.status === 'ok' && rg.fileId === r.fileId && env.files[r.fileId].versions === v + 1 && close(rg.totals.exGst, u4.totals.exGst), 'regeneratePdf rebuilds the same file');

  // ---- prices shared through the Price Table tab
  ok(/key/i.test(env.post({ action: 'savePrices', prices: { 'seal|Same-Day Sealer': 22 } }).message), 'savePrices needs the key');
  ok(env.post({ action: 'savePrices', key: KEY, prices: { 'seal|Same-Day Sealer': 22 } }).status === 'ok', 'savePrices with the key');
  const gp = env.post({ action: 'getPrices' });
  ok(gp.status === 'ok' && gp.prices['seal|Same-Day Sealer'] === 22 && Object.keys(gp.prices).length === 1, 'getPrices returns only changed rates');
  const r3 = env.post({ action: 'createQuote', key: KEY, client: { name: 'Seal Test', address: '1 A St', suburb: 'Upper Coomera', location: 'External' }, areas: [{ type: 'seal', area: 50 }] });
  ok(close(r3.lines[0].amount, 50 * 22), 'API uses the Price Table tab ($22 same-day) ' + r3.lines[0].amount);
  const pt = env.sheets['Price Table'];
  const rowIdx = pt.rows.findIndex(x => x[5] === 'seal|Same-Day Sealer');
  pt.rows[rowIdx][3] = 20;
  ok(Object.keys(env.post({ action: 'getPrices' }).prices).length === 0, 'editing the tab back to the original clears the change');

  // ---- quote numbers shared with the tool
  const n1 = env.post({ action: 'nextQuoteRef', localLast: 0 });
  ok(n1.status === 'ok' && n1.ref === 'PXT-' + yr + '-004', 'nextQuoteRef continues after the API quotes: ' + n1.ref);
  const n2 = env.post({ action: 'nextQuoteRef', localLast: 40 });
  ok(n2.ref === 'PXT-' + yr + '-041', 'never below a number a device already used: ' + n2.ref);

  // ---- sheet request queue (for Claude through the Sheets connector)
  const api = env.sheets['API Requests'];
  api.getRange(2, 1, 1, 2).setValues([['createQuote', JSON.stringify({ client: { name: 'Queue Person', address: '9 Q St', location: 'Both' }, areas: [{ type: 'epoxy', area: 30 }] })]]);
  api.getRange(3, 1, 1, 2).setValues([['getQuoteByRef', JSON.stringify({ ref: r.ref })]]);
  api.getRange(4, 1, 1, 2).setValues([['createQuote', '{not json']]);
  api.getRange(5, 1, 1, 2).setValues([['createQuote', JSON.stringify({ client: { name: 'No Location' }, areas: [] })]]);
  env.run('PXA_processApiRequests()');
  const q2 = api.rows[1];
  ok(q2[2] === 'Done' && /^PXT-\d{4}-\d{3}$/.test(q2[3]) && /^PXT-\d+$/.test(q2[4]) && q2[7] && /drive\.google\.com/.test(q2[8]), 'queue createQuote → Done with ref, key, file ID and link');
  ok(close(q2[5], 30 * 90 + 30 * 0.39 + 150) && close(q2[6], q2[5] * 1.1), 'queue totals ex and inc GST ' + q2[5]);
  ok(api.rows[2][2] === 'Done' && api.rows[2][8] === r.link, 'queue getQuoteByRef → link');
  ok(api.rows[3][2] === 'Error' && api.rows[3][10], 'bad JSON → Error with a message');
  ok(api.rows[4][2] === 'Error' && /location/.test(api.rows[4][10]), 'missing location → Error: ' + api.rows[4][10]);
  env.run('PXA_processApiRequests()');
  ok(Object.values(env.files).filter(x => /Queue Person/.test(x.name)).length === 1, 'done rows are not run twice');

  // ---- the tool's own Export still lands on the same file (new naming)
  const tv = env.files[r.fileId].versions;
  const sp = env.post({ action: 'savePdf', kind: 'Quote', key: r.key, ref: r.ref, fileName: r.ref + ' - Jane Citizen - 12 Wave St, Burleigh Heads.pdf', client: 'Jane Citizen', base64: Buffer.from('%PDF-1.4 tool').toString('base64'), exGst: 1, incGst: 1.1 });
  ok(sp.status === 'ok' && sp.fileId === r.fileId && env.files[r.fileId].versions === tv + 1, 'tool Export updates the same Drive file');
  // a PDF saved by hand under the new naming is adopted, not duplicated
  const env2 = boot();
  env2.run('PXI_setup(); PXA_setup();');
  const K2 = env2.props.PXA_API_KEY;
  const made = env2.post(Object.assign({}, job, { key: K2, pdf: false }));
  const hand = env2.run("DriveApp.getFolderById(PXI.QUOTES_FOLDER_ID).createFile(Utilities.newBlob('x','application/pdf'," + JSON.stringify(made.ref + ' - Jane Citizen - 12 Wave St, Burleigh Heads.pdf') + ')).getId()');
  const rg2 = env2.post({ action: 'regeneratePdf', key: K2, ref: made.ref });
  ok(rg2.fileId === hand, 'a PDF already in the folder for the same ref is updated, not duplicated');

  // ---- no stray files
  const all = Object.values(env.files);
  ok(all.every(x => x.mime === 'application/pdf' && /\.pdf$/.test(x.name)), 'every file is a .pdf (no .txt)');
  ok(all.filter(x => x.folderId === QF).length === new Set(all.filter(x => x.folderId === QF).map(x => x.name)).size, 'no two quote PDFs share a name');

  // ---- invoices still work alongside (regression)
  const inv = env.sheets['Invoice Requests'];
  inv.getRange(2, 1, 1, 3).setValues([[r.ref, 'Jane', 'Deposit']]);
  env.run('PXI_processInvoiceRequests()');
  ok(inv.rows[1][5] === 'Done' && env.files[inv.rows[1][12]].folderId === IF, 'deposit invoice from an API quote lands in the Invoices folder');
  const rowInc = inv.rows[1][7]; // job total the invoice used (recalculated from the saved quote)
  ok(close(inv.rows[1][9], Math.round(rowInc * 10) / 100), 'domestic deposit follows QBCC: 10% of ' + rowInc + ' = ' + inv.rows[1][9]);
  const depFile = env.files[inv.rows[1][12]];
  ok(depFile.data.indexOf('Payment History') > -1 && depFile.data.indexOf('Contract total inc GST') > -1 && depFile.data.indexOf('QBCC') > -1, 'sheet invoice uses the tool invoice (payment history, QBCC terms)');
  // tick the deposit paid, then a progress and a final from the sheet
  const invTab = env.sheets.Invoices;
  ok(/key/i.test(env.post({ action: 'setPaid', invNo: inv.rows[1][6], paid: true }).message), 'setPaid needs the key');
  ok(env.post({ action: 'setPaid', key: KEY, invNo: inv.rows[1][6], paid: true }).status === 'ok' && invTab.rows.find(x => x[0] === inv.rows[1][6])[9] === true, 'setPaid ticks the invoice Paid');
  inv.getRange(3, 1, 1, 4).setValues([[r.ref, 'Jane', 'Progress', 1000]]);
  inv.getRange(4, 1, 1, 4).setValues([[r.ref, 'Jane', 'Progress', 500]]);
  env.run('PXI_processInvoiceRequests()');
  ok(inv.rows[2][5] === 'Done' && inv.rows[3][5] === 'Done', 'two progress invoices from the sheet');
  const pRows = invTab.rows.filter(x => x[2] === r.key && x[4] === 'Progress');
  ok(pRows.length === 2 && pRows[0][15] === 1 && pRows[1][15] === 2, 'progress invoices number themselves 1 and 2');
  ok(env.files[pRows[1][13]].data.indexOf('Less progress payment 1') > -1 && env.files[pRows[1][13]].data.indexOf('OUTSTANDING') > -1, 'progress 2 lists progress 1 as outstanding (not paid yet)');
  const led = env.post({ action: 'ledger', quoteKey: r.key });
  ok(led.status === 'ok' && led.invoices.length === 3 && led.invoices[0].paid === true && led.invoices[1].progressNo === 1, 'ledger returns every invoice with paid status');
  inv.getRange(5, 1, 1, 3).setValues([[r.ref, 'Jane', 'Final']]);
  env.run('PXI_processInvoiceRequests()');
  const fRow = invTab.rows.find(x => x[2] === r.key && x[4] === 'Final');
  const depAmt = invTab.rows.find(x => x[0] === inv.rows[1][6])[7];
  ok(fRow && close(fRow[7], fRow[6] - depAmt) && close(fRow[6], rowInc), 'final = contract total minus only the paid deposit ' + (fRow && fRow[7]));
  ok(fRow && fRow[17] > 0 && env.files[fRow[13]].data.indexOf('and save') > -1, 'final from the sheet carries the early payment offer (' + (fRow && fRow[17]) + ')');
  ok(env.post({ action: 'setPaid', key: KEY, invNo: fRow[0], paid: true, onTime: true }).onTime === true && invTab.rows.find(x => x[0] === fRow[0])[16] === true, 'final ticked paid on time');

  // ---- doPost passes anything it does not handle to doGet
  env.ctx.doGet = function (e) { return env.globals.ContentService.createTextOutput(JSON.stringify({ via: 'doGet', q: e && e.parameter })); };
  ok(JSON.parse(env.ctx.doPost({ postData: { contents: 'action=save&x=1' }, parameter: { action: 'save' } }).getContent()).via === 'doGet', 'a body that is not JSON goes to doGet');
  ok(JSON.parse(env.ctx.doPost({ postData: { contents: JSON.stringify({ action: 'saveJob' }) }, parameter: {} }).getContent()).via === 'doGet', 'an action doPost does not handle goes to doGet');
  ok(env.post({ action: 'getPrices' }).status === 'ok', 'own actions still answered by doPost');
  const allSrc = ['PoxitPricing.gs', 'PoxitInvoicing.gs', 'PoxitApi.gs'].map(x => fs.readFileSync(path.join(ROOT, 'apps-script', x), 'utf8')).join('\n');
  ok((allSrc.match(/^function doPost\(/mg) || []).length === 1 && !/^function doGet\(/m.test(allSrc), 'exactly one doPost in these files, and no doGet');
  // a variation PDF goes to the Quotes folder without touching the quote PDF or the invoice log
  const qv = env.files[r.fileId].versions, invCount = env.sheets.Invoices.getLastRow();
  const vr = env.post({ action: 'savePdf', kind: 'Variation', key: r.key, ref: r.ref, vid: 'V1', fileName: 'Jane Citizen - Variation V1 - ' + r.ref + '.pdf', client: 'Jane Citizen', base64: Buffer.from('%PDF var').toString('base64') });
  ok(vr.status === 'ok' && vr.fileId !== r.fileId && env.files[vr.fileId].folderId === QF && env.files[r.fileId].versions === qv && env.sheets.Invoices.getLastRow() === invCount, 'variation PDF saved alongside the quote, quote PDF untouched');
  // the tool's invoice export records the progress number and early payment discount
  const ti = env.post({ action: 'savePdf', kind: 'Invoice', key: r.key, ref: r.ref, invNo: 'INV-2026-777', invType: 'Final', amountDue: 1000, jobTotal: 5000, progressNo: 0, earlyDiscount: 150, fileName: 'x Final Invoice - INV-2026-777.pdf', client: 'Jane Citizen', base64: Buffer.from('%PDF i').toString('base64') });
  ok(ti.status === 'ok' && env.sheets.Invoices.rows.find(x => x[0] === 'INV-2026-777')[17] === 150, 'tool invoice export logs the early payment discount');

  // ---- no Drive service: refuses rather than duplicating
  const env3 = boot({ noDrive: true });
  env3.props.PXA_API_KEY = 'k'.repeat(64);
  try { env3.run('PXI_setup()'); } catch (e) { /* stops at the Drive service check, after making the tabs */ }
  const a1 = env3.post(Object.assign({}, job, { key: 'k'.repeat(64) }));
  const a2 = env3.post({ action: 'regeneratePdf', key: 'k'.repeat(64), ref: a1.ref });
  ok(a1.status === 'ok' && a2.status === 'error' && /Drive service/.test(a2.message), 'without the Drive service an update is refused, not duplicated');

  // ---- no email anywhere
  const allGs = ['PoxitPricing.gs', 'PoxitInvoicing.gs', 'PoxitApi.gs'].map(x => fs.readFileSync(path.join(ROOT, 'apps-script', x), 'utf8')).join('\n');
  ok(!/\b(MailApp|GmailApp)\s*\./.test(allGs), 'no MailApp or GmailApp calls in any script');
  console.log('\n' + passes + ' passed, ' + fails + ' failed');
})().catch(e => { console.log('HARNESS ERROR ' + (e && e.stack || e)); process.exitCode = 1; });
