// A small in-memory stand-in for the Apps Script services the Poxit scripts use, so they can be tested in Node.
'use strict';
const crypto = require('crypto');

function makeEnv(opts) {
  opts = opts || {};
  let idSeq = 0;
  const files = {};
  const folders = {};
  const props = {};
  const triggers = [];
  const logs = [];
  const TZ_OFFSET_H = 10; // Brisbane, no daylight saving

  function Blob(data, mime, name) {
    this.data = data; this.mime = mime; this.name = name;
  }
  Blob.prototype.getAs = function (type) { return new Blob(this.data, type, this.name); };
  Blob.prototype.setName = function (n) { this.name = n; return this; };
  Blob.prototype.getName = function () { return this.name; };
  Blob.prototype.getContentType = function () { return this.mime; };
  Blob.prototype.getDataAsString = function () { return typeof this.data === 'string' ? this.data : Buffer.from(this.data).toString(); };

  function File(blob, folderId) {
    this.id = 'f' + (++idSeq); this.name = blob.name; this.mime = blob.mime; this.data = blob.data;
    this.trashed = false; this.updated = new Date(); this.versions = 1; this.folderId = folderId;
    files[this.id] = this;
  }
  File.prototype.getId = function () { return this.id; };
  File.prototype.getUrl = function () { return 'https://drive.google.com/file/d/' + this.id + '/view?usp=drivesdk'; };
  File.prototype.getName = function () { return this.name; };
  File.prototype.setName = function (n) { this.name = n; return this; };
  File.prototype.isTrashed = function () { return this.trashed; };
  File.prototype.setTrashed = function (t) { this.trashed = t; return this; };
  File.prototype.getMimeType = function () { return this.mime; };
  File.prototype.getLastUpdated = function () { return this.updated; };

  function folder(id) {
    if (!folders[id]) folders[id] = { id: id, name: 'Folder ' + id };
    const f = folders[id];
    return {
      getName: function () { return f.name; },
      createFile: function (blob) { return new File(blob, id); },
      getFiles: function () {
        const list = Object.keys(files).map(function (k) { return files[k]; }).filter(function (x) { return x.folderId === id; });
        let i = 0;
        return { hasNext: function () { return i < list.length; }, next: function () { return list[i++]; } };
      }
    };
  }

  // ---- Sheets
  function Sheet(name) { this.name = name; this.rows = []; this.frozen = 0; }
  Sheet.prototype.getName = function () { return this.name; };
  Sheet.prototype.getLastRow = function () {
    for (let r = this.rows.length - 1; r >= 0; r--) {
      if ((this.rows[r] || []).some(function (v) { return v !== '' && v !== null && v !== undefined; })) return r + 1;
    }
    return 0;
  };
  Sheet.prototype.cell = function (r, c) { const row = this.rows[r - 1] || []; const v = row[c - 1]; return v === undefined ? '' : v; };
  Sheet.prototype.put = function (r, c, v) { while (this.rows.length < r) this.rows.push([]); this.rows[r - 1][c - 1] = v; };
  Sheet.prototype.getRange = function (r, c, nr, nc) {
    const sh = this; nr = nr || 1; nc = nc || 1;
    if (r < 1 || c < 1) throw new Error('bad range');
    const rng = {
      getValues: function () { const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push(sh.cell(r + i, c + j)); out.push(row); } return out; },
      setValues: function (v) {
        if (v.length !== nr || v.some(function (x) { return x.length !== nc; })) throw new Error('setValues size mismatch ' + v.length + 'x' + (v[0] || []).length + ' vs ' + nr + 'x' + nc);
        for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) {
          const x = v[i][j];
          if (typeof x === 'string' && x.length > 50000) throw new Error('cell over 50000 characters');
          sh.put(r + i, c + j, x);
        }
        return rng;
      },
      getValue: function () { return sh.cell(r, c); },
      setValue: function (v) { sh.put(r, c, v); return rng; },
      insertCheckboxes: function () { for (let i = 0; i < nr; i++) if (sh.cell(r + i, c) === '') sh.put(r + i, c, false); return rng; },
      setDataValidation: function () { return rng; }, setFontWeight: function () { return rng; },
      setBackground: function () { return rng; }, setFontColor: function () { return rng; }
    };
    return rng;
  };
  Sheet.prototype.clear = function () { this.rows = []; return this; };
  Sheet.prototype.setFrozenRows = function (n) { this.frozen = n; };
  Sheet.prototype.appendRow = function (row) { this.rows[this.getLastRow()] = row.slice(); };

  const sheets = {};
  const ss = {
    getSheetByName: function (n) { return sheets[n] || null; },
    insertSheet: function (n) { sheets[n] = new Sheet(n); return sheets[n]; }
  };
  ss.insertSheet('Sheet1');

  const dvChain = { requireValueInList: function () { return dvChain; }, setAllowInvalid: function () { return dvChain; }, build: function () { return {}; } };

  function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
  function formatDate(d, tz, fmt) {
    const t = new Date(d.getTime() + TZ_OFFSET_H * 3600000);
    const Y = t.getUTCFullYear(), M = t.getUTCMonth() + 1, D = t.getUTCDate(), H = t.getUTCHours(), m = t.getUTCMinutes();
    const h12 = H % 12 === 0 ? 12 : H % 12;
    return fmt.replace(/yyyy|MM|M|dd|d|HH|h|mm|a/g, function (tok) {
      return { yyyy: Y, MM: pad(M), M: M, dd: pad(D), d: D, HH: pad(H), h: h12, mm: pad(m), a: H < 12 ? 'AM' : 'PM' }[tok];
    });
  }

  const g = {
    console: console, JSON: JSON, Math: Math, Date: Date,
    SpreadsheetApp: { openById: function () { return ss; }, newDataValidation: function () { return dvChain; } },
    DriveApp: {
      getFolderById: function (id) { return folder(id); },
      getFileById: function (id) { if (!files[id]) throw new Error('No file ' + id); return files[id]; }
    },
    Drive: opts.noDrive ? undefined : { Files: { update: function (meta, id, blob) { const f = files[id]; f.data = blob.data; f.mime = blob.mime; f.versions++; f.updated = new Date(Date.now() + f.versions); return {}; } } },
    Utilities: {
      newBlob: function (data, mime, name) { return new Blob(data, mime, name); },
      base64Decode: function (s) { return Array.from(Buffer.from(s, 'base64')); },
      formatDate: formatDate,
      getUuid: function () { return crypto.randomUUID(); }
    },
    PropertiesService: { getScriptProperties: function () { return { getProperty: function (k) { return props[k] === undefined ? null : props[k]; }, setProperty: function (k, v) { props[k] = String(v); } }; } },
    LockService: { getScriptLock: function () { return { waitLock: function () {}, tryLock: function () { return true; }, releaseLock: function () {} }; } },
    ContentService: { createTextOutput: function (s) { return { s: s, setMimeType: function () { return this; }, getContent: function () { return s; } }; }, MimeType: { JSON: 'json' } },
    ScriptApp: {
      getProjectTriggers: function () { return triggers.slice(); },
      deleteTrigger: function (t) { const i = triggers.indexOf(t); if (i > -1) triggers.splice(i, 1); },
      newTrigger: function (fn) { const t = { fn: fn, getHandlerFunction: function () { return fn; } };
        const ch = { timeBased: function () { return ch; }, everyMinutes: function () { return ch; }, create: function () { triggers.push(t); return t; } }; return ch; }
    },
    Logger: { log: function (m) { logs.push(String(m)); } }
  };
  return { globals: g, files: files, folders: folders, props: props, sheets: sheets, triggers: triggers, logs: logs, Sheet: Sheet };
}
module.exports = { makeEnv: makeEnv };
