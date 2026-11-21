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
  const r3 = env.post({ action: 'createQuote', key: KEY, client: { name: 'Seal Test', address: '1 A St', suburb: 'Upper Coomera', location: 'External' }, areas: [{ type: 'seal', system: 'Same-Day Sealer', area: 50 }] });
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

  // ===================== 19 NOV: numbering, one template, renumber, email =====================
  const env4_9 = boot();
  const YR_9 = new Date().getFullYear();
  const th_9 = (subject, names, to) => ({ getMessages: () => [{ getSubject: () => subject, getAttachments: () => names.map(n => ({ getName: () => n })), getDate: () => new Date(), getTo: () => to }] });
  env4_9.mail.sentThreads = [th_9('Epoxy Invoice - Garage and Outdoor', ['Mario Fairlie - Epoxy Invoice - INV-' + YR_9 + '-034.pdf'], 'mario@fairlie.com.au'),
                           th_9('Spalling repairs invoice', ['Danny Wehbe - Spalling Invoice - INV-' + YR_9 + '-017.pdf'], 'danny@x.com'),
                           th_9('Deposit invoice', ['Megan Madsen - Epoxy Deposit Invoice - INV-' + YR_9 + '-007.pdf'], 'megan@x.com')];
  env4_9.run('PXI_setup(); PXA_setup(); PXE_setup();');
  const K4_9 = env4_9.props.PXA_API_KEY;
  env4_9.run("DriveApp.getFolderById(PXI.INVOICES_FOLDER_ID).createFile(Utilities.newBlob('x','application/pdf','Old Client - Final Invoice - INV-" + YR_9 + "-021.pdf'))");
  const shown_9 = env4_9.run('PXI_showInvoiceNumbers()');
  ok(shown_9.max === 34 && /sent Gmail/.test(shown_9.where) && shown_9.next === 'INV-' + YR_9 + '-035', 'NUMBERS highest used is INV-' + YR_9 + '-034 in sent Gmail, next 035 (' + shown_9.message + ')');
  ok(shown_9.used.indexOf(21) > -1 && shown_9.used.indexOf(17) > -1 && shown_9.used.indexOf(7) > -1, 'NUMBERS Drive folder and every sent invoice are counted');
  const n1_9 = env4_9.post({ action: 'nextInvoice', localLast: 3 });
  ok(n1_9.ref === 'INV-' + YR_9 + '-035', 'NUMBERS the tool gets 035 from the shared counter, not 004');
  ok(env4_9.post({ action: 'nextInvoice', localLast: 0 }).ref === 'INV-' + YR_9 + '-036', 'NUMBERS one counter: next call 036, never reissued');
  ok(/already used/.test((() => { try { env4_9.run('PXI_setNextInvoiceNo(34)'); return ''; } catch (e) { return e.message; } })()), 'NUMBERS setNextInvoiceNo refuses a number already used');
  env4_9.run('PXI_setNextInvoiceNo(40)');
  ok(env4_9.post({ action: 'nextInvoice' }).ref === 'INV-' + YR_9 + '-040', 'NUMBERS setNextInvoiceNo(40) sets the next number');
  ok(env4_9.post({ action: 'nextInvoice' }).ref === 'INV-' + YR_9 + '-041', 'NUMBERS and carries on from there');
  // the Megan case: an invoice issued as 001 by mistake, unsent
  const q4_9 = env4_9.post({ action: 'createQuote', key: K4_9, client: { name: 'Megan Madsen', address: '2/20 Thomas Drive', suburb: 'Surfers Paradise', location: 'Internal', email: 'mmadsen@professionals.com.au' }, areas: [{ type: 'epoxy', name: 'Hallway', area: 12 }] });
  const ir_9 = env4_9.sheets['Invoice Requests'];
  ir_9.getRange(2, 1, 1, 3).setValues([[q4_9.ref, 'Megan', 'Final']]);
  env4_9.run('PXI_processInvoiceRequests()');
  const it4_9 = env4_9.sheets.Invoices;
  const madeNo_9 = ir_9.rows[1][6];
  ok(madeNo_9 === 'INV-' + YR_9 + '-042', 'NUMBERS sheet invoice requests use the same counter (042)');
  const rIdx_9 = it4_9.rows.findIndex(x => x[0] === madeNo_9);
  const fileId4_9 = it4_9.rows[rIdx_9][13];
  // pretend it went out as INV-YYYY-001 (what the old version did)
  it4_9.rows[rIdx_9][0] = 'INV-' + YR_9 + '-001';
  const fx_9 = env4_9.sheets['Drive Files'].rows.findIndex(x => x[2] === madeNo_9); env4_9.sheets['Drive Files'].rows[fx_9][2] = 'INV-' + YR_9 + '-001';
  env4_9.files[fileId4_9].name = 'Megan Madsen - Final Invoice - INV-' + YR_9 + '-001.pdf';
  const v0_9 = env4_9.files[fileId4_9].versions;
  const rn_9 = env4_9.post({ action: 'renumberInvoice', key: K4_9, invoiceNo: 'INV-' + YR_9 + '-001' });
  ok(rn_9.status === 'ok' && rn_9.invNo === 'INV-' + YR_9 + '-043' && rn_9.fileId === fileId4_9, 'RENUMBER 001 becomes the next number (043) on the same Drive file ' + (rn_9.message || ''));
  ok(env4_9.files[fileId4_9].versions === v0_9 + 1 && env4_9.files[fileId4_9].name === 'Megan Madsen - Final Invoice - INV-' + YR_9 + '-043.pdf', 'RENUMBER PDF rebuilt and renamed');
  const pdf4_9 = env4_9.files[fileId4_9].data;
  ok(pdf4_9.indexOf('INV-' + YR_9 + '-043') > -1 && pdf4_9.indexOf('INV-' + YR_9 + '-001') < 0 && pdf4_9.indexOf('undefined') < 0, 'RENUMBER new number on the invoice and the payment reference');
  ok(pdf4_9.indexOf('Quote Reference:</td><td class="client-cell"><div class="client-value">' + q4_9.ref) > -1, 'RENUMBER correct quote ref for the client (' + q4_9.ref + ')');
  ok(it4_9.rows[rIdx_9][0] === 'INV-' + YR_9 + '-043' && env4_9.sheets['Drive Files'].rows[fx_9][2] === 'INV-' + YR_9 + '-043', 'RENUMBER Invoices tab and Drive index updated');
  ok(env4_9.sheets.Sheet1.rows.find(x => x[0] === q4_9.key)[14] === 'INV-' + YR_9 + '-043', 'RENUMBER quote row shows the new number');
  it4_9.rows[rIdx_9][9] = true;
  ok(/Paid/.test(env4_9.post({ action: 'renumberInvoice', key: K4_9, invoiceNo: 'INV-' + YR_9 + '-043' }).message), 'RENUMBER refuses an invoice ticked Paid');
  it4_9.rows[rIdx_9][9] = false;
  // one template: the sheet's invoice is the tool's invoice
  ok(pdf4_9.indexOf('<table class="doc-header-t"') > -1 && /bgcolor="#0a0a0a"/.test(pdf4_9) && /bgcolor="#0ABAB5"/.test(pdf4_9) && pdf4_9.indexOf('>POXIT<') > -1, 'TEMPLATE black header bar and teal rule kept as table cells for Google\'s converter');
  ok(pdf4_9.indexOf('signed work contract') < 0 && pdf4_9.indexOf('Payment History') > -1 && pdf4_9.indexOf('Bank Transfer') > -1 && pdf4_9.indexOf('doc-footer') > -1, 'TEMPLATE same sections, bank details and footer as the tool, no "signed work contract"');
  ok(!/PXI_invoiceHtml_/.test(fs.readFileSync(path.join(ROOT, 'apps-script', 'PoxitInvoicing.gs'), 'utf8')), 'TEMPLATE the old separate invoice layout is gone');
  const st4_9 = JSON.parse(env4_9.sheets.Sheet1.rows.find(x => x[0] === q4_9.key)[6]).state;
  tw.eval('confirmReset(false); restoreQuote(' + JSON.stringify({ state: st4_9, measureShapes: [] }) + '); S.saveKey=' + JSON.stringify(q4_9.key) + ';');
  const fixedDate_9 = Date.UTC(2026, 10, 19, 1);
  const toolInv_9 = tw.eval('invoiceDocHtml("final","INV-' + YR_9 + '-099",{ledger:[],date:new Date(' + fixedDate_9 + ')}).html');
  const srvInv_9 = env4_9.run('PXP.invoice({state:' + JSON.stringify(st4_9) + ',saveKey:' + JSON.stringify(q4_9.key) + ',stage:"final",ledger:[],invNo:"INV-' + YR_9 + '-099",date:' + fixedDate_9 + '}).html');
  ok(toolInv_9 === srvInv_9, 'TEMPLATE the sheet builds exactly the same invoice HTML as the tool (one source)');

  // ---- email: draft, then send that draft only
  const dr_9 = env4_9.post({ action: 'draftEmail', key: K4_9, ref: q4_9.ref, doc: 'invoice', invoiceNo: 'INV-' + YR_9 + '-043', to: ['mmadsen@professionals.com.au'], cc: 'mike@example.com', subject: 'Final invoice, 2/20 Thomas Drive', body: 'Hi Megan,\n\nPlease find the final invoice attached.\n\nKind regards,\nDominic' });
  ok(dr_9.status === 'ok' && dr_9.draftId && dr_9.attachment === 'Megan Madsen - Final Invoice - INV-' + YR_9 + '-043.pdf', 'EMAIL draft made with the invoice PDF attached ' + (dr_9.message || ''));
  const d4_9 = env4_9.mail.drafts[dr_9.draftId];
  ok(d4_9 && d4_9.body.indexOf('Kind regards,\nDominic\n\nDominic Amsteins\nDirector') > -1 && d4_9.opts.cc === 'mike@example.com' && d4_9.opts.name === 'Dominic Amsteins' && !d4_9.opts.htmlBody, 'EMAIL plain text body, sign off, then signature; cc kept');
  ok(dr_9.from.toLowerCase() === 'dominic@poxitflooring.com.au' && /mail\.google\.com/.test(dr_9.gmailLink) && dr_9.to[0] === 'mmadsen@professionals.com.au', 'EMAIL from Dominic@poxitflooring.com.au, returns the Gmail link');
  ok(env4_9.mail.sent.length === 0, 'EMAIL nothing sent by draftEmail');
  const dq_9 = env4_9.post({ action: 'draftEmail', key: K4_9, ref: q4_9.ref, doc: 'quote', to: 'mmadsen@professionals.com.au', subject: 'Your quote', body: 'Hi Megan,\n\nQuote attached.\n\nDominic' });
  ok(dq_9.status === 'ok' && /^PXT-\d{4}-\d+ - Megan Madsen/.test(dq_9.attachment), 'EMAIL quote drafts attach the latest quote PDF (' + dq_9.attachment + ')');
  ok(/valid email/.test(env4_9.post({ action: 'draftEmail', key: K4_9, ref: q4_9.ref, doc: 'quote', to: 'not-an-email', subject: 'x', body: 'y' }).message), 'EMAIL bad address refused');
  ok(/key/i.test(env4_9.post({ action: 'sendDraft', draftId: dr_9.draftId }).message), 'EMAIL sendDraft needs the key');
  const sd_9 = env4_9.post({ action: 'sendDraft', key: K4_9, draftId: dr_9.draftId });
  ok(sd_9.status === 'ok' && env4_9.mail.sent.length === 1 && env4_9.mail.sent[0].id === dr_9.draftId && sd_9.messageId === 'sent-' + dr_9.draftId, 'EMAIL sendDraft sends exactly that draft');
  const lg_9 = env4_9.sheets['Email Log'].rows[1];
  ok(lg_9 && lg_9[1] === q4_9.ref && lg_9[2] === 'invoice' && lg_9[3] === 'mmadsen@professionals.com.au' && lg_9[6] === dr_9.draftId && lg_9[7] === 'INV-' + YR_9 + '-043' && lg_9[8] === sd_9.messageId, 'EMAIL logged in the Email Log tab');
  ok(/\d/.test(String(env4_9.sheets.Sheet1.rows.find(x => x[0] === q4_9.key)[18])), 'EMAIL sent date written to the quote row (Emailed, column S)');
  ok(/No draft/.test(env4_9.post({ action: 'sendDraft', key: K4_9, draftId: dr_9.draftId }).message) && env4_9.mail.sent.length === 1, 'EMAIL a draft can only be sent once');
  ok(/Paid|emailed/.test(env4_9.post({ action: 'renumberInvoice', key: K4_9, invoiceNo: 'INV-' + YR_9 + '-043' }).message), 'RENUMBER refuses an invoice that has been emailed');
  env4_9.mail.me = 'someone@gmail.com';
  const before4_9 = Object.keys(env4_9.mail.drafts).length;
  ok(/not one of its send-as addresses/.test(env4_9.post({ action: 'draftEmail', key: K4_9, ref: q4_9.ref, doc: 'quote', to: 'a@b.com', subject: 'x', body: 'y' }).message) && Object.keys(env4_9.mail.drafts).length === before4_9, 'EMAIL wrong account and no alias: error, nothing drafted');
  env4_9.mail.aliases = ['Dominic@poxitflooring.com.au'];
  const da_9 = env4_9.post({ action: 'draftEmail', key: K4_9, ref: q4_9.ref, doc: 'quote', to: 'a@b.com', subject: 'x', body: 'y' });
  ok(da_9.status === 'ok' && env4_9.mail.drafts[da_9.draftId].opts.from === 'Dominic@poxitflooring.com.au', 'EMAIL other account with the alias: drafts from the alias');
  env4_9.mail.me = 'Dominic@poxitflooring.com.au'; env4_9.mail.aliases = [];
  const ar_9 = env4_9.sheets['API Requests'];
  ar_9.getRange(2, 1, 1, 2).setValues([['draftEmail', JSON.stringify({ ref: q4_9.ref, doc: 'quote', to: ['a@b.com'], subject: 'Quote', body: 'Hi,\n\nAttached.\n\nDominic' })]]);
  env4_9.run('PXA_processApiRequests()');
  const qres_9 = JSON.parse(ar_9.rows[1][9] || '{}');
  ok(ar_9.rows[1][2] === 'Done' && qres_9.draftId && env4_9.mail.drafts[qres_9.draftId], 'EMAIL draftEmail works through the API Requests tab');
  ar_9.getRange(3, 1, 1, 2).setValues([['sendDraft', JSON.stringify({ draftId: qres_9.draftId })]]);
  env4_9.run('PXA_processApiRequests()');
  ok(ar_9.rows[2][2] === 'Done' && env4_9.mail.sent.length === 2, 'EMAIL sendDraft works through the API Requests tab');

  // ===================== 20 NOV: finish tiers through the sheet API =====================
  const env5 = boot(); env5.run('PXI_setup(); PXA_setup();'); const K5 = env5.props.PXA_API_KEY;
  const t5 = env5.post({ action: 'createQuote', key: K5, client: { name: 'Tier Api', address: '1 B St', suburb: 'Upper Coomera', location: 'Internal' },
    areas: [{ type: 'epoxy', name: 'Garage', area: 40, system: 'Flake Internal', finishTier: 'Black Label', addons: { nonslip: true } },
            { type: 'epoxy', name: 'Hall', area: 20, system: 'Flake Internal', tier: 'platinum', platinumCoats: 2 }] });
  const l5 = k => t5.lines.find(x => x.key === k);
  ok(t5.status === 'ok' && close(l5('epoxy-0').amount, 40 * 140) && close(l5('epoxy-1').amount, 20 * 130), 'API finishTier: Black Label $140/m² (no non slip), Platinum 2 coats $130/m² ' + (t5.message || ''));
  const st5 = JSON.parse(env5.sheets.Sheet1.rows[0][6]).state;
  ok(st5.epoxyZones[0].sys === 'Flake Internal' && st5.epoxyZones[0].tier === 'blackLabel' && st5.epoxyZones[1].tier === 'platinum', 'API "tier" with a finish name sets the finish, not the system');
  ok(env5.files[t5.fileId].data.indexOf('<strong>Black Label finish:</strong> our flagship.') > -1, 'API quote PDF shows the finish line');
  ok(env5.post({ action: 'savePrices', key: K5, prices: { 'finishName|blackLabel': 'Black Label Reserve', 'finish|blackLabel': 55 } }).status === 'ok', 'savePrices takes a finish name');
  const pt5 = env5.sheets['Price Table'].rows.find(r => r[5] === 'finishName|blackLabel');
  ok(pt5 && pt5[2] === 'text' && pt5[3] === 'Black Label Reserve', 'Price Table tab keeps the name as text');
  const gp5 = env5.post({ action: 'getPrices' }).prices;
  ok(gp5['finishName|blackLabel'] === 'Black Label Reserve' && gp5['finish|blackLabel'] === 55, 'getPrices returns the name and the rate');
  const rg5 = env5.post({ action: 'regeneratePdf', key: K5, ref: t5.ref });
  ok(env5.files[rg5.fileId].data.indexOf('<strong>Black Label Reserve finish:</strong>') > -1 && close(rg5.lines.find(x => x.key === 'epoxy-0').amount, 40 * 145), 'regenerated PDF uses the sheet name and rate');

  const t6 = env5.post({ action: 'createQuote', key: K5, client: { name: 'Sand Api', address: '2 C St', suburb: 'Upper Coomera', location: 'Internal' },
    areas: [{ type: 'sandtop', name: 'Garage', area: 40, system: 'polyaspartic', second: true }] });
  ok(t6.status === 'ok' && close(t6.lines.find(x => x.key === 'sandtop-0').amount, 40 * 65), 'API sandtop: polyaspartic $45 + second coat $20 per m² ' + (t6.message || ''));

  // ---- no email anywhere except sendDraft
  const allGs = ['PoxitPricing.gs', 'PoxitInvoicing.gs', 'PoxitApi.gs'].map(x => fs.readFileSync(path.join(ROOT, 'apps-script', x), 'utf8')).join('\n');
  ok(!/MailApp\s*\.|sendEmail\s*\(/.test(allGs), 'no MailApp or sendEmail anywhere');
  ok((allGs.match(/\.send\(\)/g) || []).length === 1 && /var sent = draft\.send\(\);/.test(allGs), 'the only send in the project is sendDraft sending its one draft');
  console.log('\n' + passes + ' passed, ' + fails + ' failed');
})().catch(e => { console.log('HARNESS ERROR ' + (e && e.stack || e)); process.exitCode = 1; });
