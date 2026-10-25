/**
 * Meraki design approval portal – backend.
 * Keeps customer files, drafts and correction messages in the Google Sheet this script is attached to,
 * and the uploaded design pages in a Google Drive folder. The page is approval/index.html.
 * Setup steps are in README.md.
 */

// Team passcode editors type to sign in. Change it before you deploy, and share it only with Meraki editors.
const EDITOR_KEY = 'change-this-passcode';
// Drafts a customer gets for corrections. An editor can grant an extra draft for one customer from the portal.
const DEFAULT_DRAFTS = 3;
// Optional: an email address that gets a short note when a customer sends corrections or approves. '' = no email.
const NOTIFY_EMAIL = '';
// Drive folder for the uploaded designs. It's created in the owner's Drive on first use.
const FOLDER_NAME = 'Meraki Design Approvals';

const TABS = {
  Projects: ['ID', 'Token', 'Customer', 'Phone', 'Format', 'Config', 'Drafts allowed', 'Status', 'Editor', 'Notes',
    'Created', 'Updated', 'Approved draft', 'Approved at', 'Approved by', 'Folder ID'],
  Drafts: ['Project ID', 'Draft', 'Editor', 'Created', 'Shared at', 'Pages'],
  Messages: ['ID', 'Project ID', 'Draft', 'From', 'Name', 'Page', 'X', 'Y', 'Text', 'Time', 'Done']
};

/* ---------- sheet helpers ---------- */

function tab_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(TABS[name]);
    sh.setFrozenRows(1);
    if (name === 'Projects') sh.getRange('D:D').setNumberFormat('@'); // keep phone numbers as text
  }
  return sh;
}

function rows_(name) {
  const values = tab_(name).getDataRange().getValues();
  values.shift();
  return values.map(function (r, i) {
    const o = { _row: i + 2 };
    TABS[name].forEach(function (h, j) { o[h] = r[j]; });
    return o;
  });
}

function append_(name, o) {
  tab_(name).appendRow(TABS[name].map(function (h) { return o[h] === undefined ? '' : o[h]; }));
}

function save_(name, o) {
  tab_(name).getRange(o._row, 1, 1, TABS[name].length)
    .setValues([TABS[name].map(function (h) { return o[h] === undefined ? '' : o[h]; })]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function iso_(v) {
  return v instanceof Date ? v.toISOString() : String(v || '');
}

function parse_(s, fallback) {
  try { return JSON.parse(s); } catch (e) { return fallback; }
}

function uid_(n) {
  return Utilities.getUuid().replace(/-/g, '').slice(0, n).toUpperCase();
}

function clean_(s, max) {
  return String(s == null ? '' : s).trim().slice(0, max);
}

/* ---------- project lookups ---------- */

function findProject_(id, token) {
  const all = rows_('Projects');
  for (let i = 0; i < all.length; i++) {
    const p = all[i];
    if (id && String(p.ID) === String(id)) return p;
    if (token && String(p.Token) === String(token)) return p;
  }
  return null;
}

function draftsOf_(id) {
  return rows_('Drafts').filter(function (d) { return String(d['Project ID']) === String(id); })
    .sort(function (a, b) { return a.Draft - b.Draft; });
}

function messagesOf_(id) {
  return rows_('Messages').filter(function (m) { return String(m['Project ID']) === String(id); });
}

function sharedCount_(drafts) {
  return drafts.filter(function (d) { return d['Shared at']; }).length;
}

// What the page gets. Customers see only shared drafts and no print files.
function out_(p, editor) {
  const drafts = draftsOf_(p.ID).filter(function (d) { return editor || d['Shared at']; }).map(function (d) {
    const pages = parse_(d.Pages, {});
    if (!editor) Object.keys(pages).forEach(function (k) { delete pages[k].print; });
    return { n: Number(d.Draft), editor: d.Editor, created: iso_(d.Created), shared: iso_(d['Shared at']), pages: pages };
  });
  const messages = messagesOf_(p.ID).map(function (m) {
    return {
      id: m.ID, draft: Number(m.Draft), from: m.From, name: m.Name, page: m.Page,
      x: m.X === '' ? null : Number(m.X), y: m.Y === '' ? null : Number(m.Y),
      text: m.Text, time: iso_(m.Time), done: m.Done === true || m.Done === 'TRUE'
    };
  });
  const o = {
    id: p.ID, customer: p.Customer, phone: String(p.Phone), format: p.Format, config: parse_(p.Config, {}),
    draftsAllowed: Number(p['Drafts allowed']) || DEFAULT_DRAFTS, status: p.Status, editor: p.Editor,
    created: iso_(p.Created), updated: iso_(p.Updated),
    approvedDraft: p['Approved draft'] === '' ? null : Number(p['Approved draft']),
    approvedAt: iso_(p['Approved at']), approvedBy: p['Approved by'],
    drafts: drafts, messages: messages
  };
  if (editor) { o.token = p.Token; o.notes = p.Notes; }
  return o;
}

function touch_(p, fields) {
  Object.keys(fields).forEach(function (k) { p[k] = fields[k]; });
  p.Updated = new Date();
  save_('Projects', p);
}

function folder_(p) {
  if (p['Folder ID']) {
    try { return DriveApp.getFolderById(p['Folder ID']); } catch (e) { /* folder was removed: make a new one */ }
  }
  const roots = DriveApp.getFoldersByName(FOLDER_NAME);
  const root = roots.hasNext() ? roots.next() : DriveApp.createFolder(FOLDER_NAME);
  const f = root.createFolder(p.Customer + ' (' + p.ID + ')');
  p['Folder ID'] = f.getId();
  save_('Projects', p);
  return f;
}

function notify_(p, subject, body) {
  if (!NOTIFY_EMAIL) return;
  try { MailApp.sendEmail(NOTIFY_EMAIL, subject, body); } catch (e) { /* email is optional */ }
}

/* ---------- GET: read ---------- */

function doGet(e) {
  const q = (e && e.parameter) || {};
  const editor = q.k === EDITOR_KEY;
  try {
    if (q.action === 'list') {
      if (!editor) return json_({ status: 'denied' });
      const drafts = rows_('Drafts'), msgs = rows_('Messages');
      const list = rows_('Projects').map(function (p) {
        const mine = drafts.filter(function (d) { return String(d['Project ID']) === String(p.ID); });
        const shared = sharedCount_(mine);
        const open = msgs.filter(function (m) {
          return String(m['Project ID']) === String(p.ID) && m.From === 'customer' && Number(m.Draft) === shared &&
            !(m.Done === true || m.Done === 'TRUE');
        }).length;
        return {
          id: p.ID, customer: p.Customer, phone: String(p.Phone), format: p.Format, status: p.Status, editor: p.Editor,
          draftsAllowed: Number(p['Drafts allowed']) || DEFAULT_DRAFTS, shared: shared, drafts: mine.length,
          openCorrections: open, updated: iso_(p.Updated), created: iso_(p.Created)
        };
      });
      return json_({ status: 'ok', projects: list });
    }

    if (q.action === 'project') {
      const p = editor && q.id ? findProject_(q.id) : (q.t ? findProject_(null, q.t) : null);
      if (!p) return json_({ status: editor || q.t ? 'notfound' : 'denied' });
      return json_({ status: 'ok', project: out_(p, editor && !!q.id) });
    }

    if (q.action === 'image') {
      const p = editor ? findProject_(q.p) : findProject_(null, q.t);
      if (!p) return json_({ status: 'denied' });
      // Only hand out files that belong to this customer (and, for customers, only previews of shared drafts).
      const allowed = draftsOf_(p.ID).some(function (d) {
        if (!editor && !d['Shared at']) return false;
        const pages = parse_(d.Pages, {});
        return Object.keys(pages).some(function (k) {
          return pages[k].preview === q.f || (editor && pages[k].print === q.f);
        });
      });
      if (!allowed) return json_({ status: 'denied' });
      const blob = DriveApp.getFileById(q.f).getBlob();
      return json_({ status: 'ok', mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()) });
    }

    return json_({ status: 'ok', app: 'meraki-approval' });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  }
}

/* ---------- POST: write ---------- */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const d = JSON.parse(e.postData.contents);
    const editor = d.k === EDITOR_KEY;

    // Customer actions use the private link token.
    if (!editor) {
      const p = d.t ? findProject_(null, d.t) : null;
      if (!p) return json_({ status: 'denied' });
      if (d.action === 'message') return json_(addMessages_(p, d, 'customer'));
      if (d.action === 'approve') return json_(approve_(p, d));
      return json_({ status: 'denied' });
    }

    if (d.action === 'create') {
      const customer = clean_(d.customer, 80);
      const phone = String(d.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
      if (customer.length < 2) return json_({ status: 'invalid', message: 'Customer name is required.' });
      const p = {
        ID: 'MK-' + uid_(5), Token: uid_(20).toLowerCase(), Customer: customer, Phone: phone,
        Format: clean_(d.format, 30) || 'a4fold', Config: JSON.stringify(d.config || {}),
        'Drafts allowed': Math.max(1, Math.min(10, Number(d.draftsAllowed) || DEFAULT_DRAFTS)),
        Status: 'new', Editor: clean_(d.editor, 60), Notes: clean_(d.notes, 2000),
        Created: new Date(), Updated: new Date()
      };
      append_('Projects', p);
      return json_({ status: 'ok', project: out_(findProject_(p.ID), true) });
    }

    const p = findProject_(d.id);
    if (!p) return json_({ status: 'notfound' });
    let r;
    switch (d.action) {
      case 'update': r = update_(p, d); break;
      case 'page': r = uploadPage_(p, d); break;
      case 'share': r = share_(p, d); break;
      case 'message': r = addMessages_(p, d, 'editor'); break;
      case 'done': r = setDone_(p, d); break;
      case 'grant': touch_(p, { 'Drafts allowed': (Number(p['Drafts allowed']) || DEFAULT_DRAFTS) + 1 }); break;
      case 'reopen':
        touch_(p, { Status: 'corrections', 'Approved draft': '', 'Approved at': '', 'Approved by': '' });
        break;
      default: return json_({ status: 'invalid', message: 'Unknown action.' });
    }
    if (r && r.status !== 'ok') return json_(r);
    return json_({ status: 'ok', project: out_(findProject_(p.ID), true) });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function update_(p, d) {
  const f = {};
  if (d.customer !== undefined) {
    if (clean_(d.customer, 80).length < 2) return { status: 'invalid', message: 'Customer name is required.' };
    f.Customer = clean_(d.customer, 80);
  }
  if (d.phone !== undefined) f.Phone = String(d.phone || '').replace(/[^\d+]/g, '').slice(0, 16);
  if (d.notes !== undefined) f.Notes = clean_(d.notes, 2000);
  if (d.draftsAllowed !== undefined) f['Drafts allowed'] = Math.max(1, Math.min(10, Number(d.draftsAllowed) || DEFAULT_DRAFTS));
  if (d.config !== undefined) {
    if (draftsOf_(p.ID).length) return { status: 'invalid', message: 'The format can only change before the first upload.' };
    f.Format = clean_(d.format, 30);
    f.Config = JSON.stringify(d.config);
  }
  touch_(p, f);
  return { status: 'ok' };
}

// Saves one page of the draft that's being prepared (not yet shared).
function uploadPage_(p, d) {
  const drafts = draftsOf_(p.ID);
  const n = Number(d.draft);
  const shared = sharedCount_(drafts);
  const allowed = Number(p['Drafts allowed']) || DEFAULT_DRAFTS;
  if (p.Status === 'approved') return { status: 'invalid', message: 'This design is already approved.' };
  if (n !== shared + 1) return { status: 'invalid', message: 'Draft ' + n + ' is not open for uploads.' };
  if (n > allowed) return { status: 'invalid', message: 'All ' + allowed + ' drafts are used. Grant an extra draft first.' };
  const slots = (parse_(p.Config, {}).pages || []).map(function (x) { return x.key; });
  const slot = clean_(d.slot, 40);
  if (slots.indexOf(slot) < 0) return { status: 'invalid', message: 'Unknown page.' };

  let draft = drafts.filter(function (x) { return Number(x.Draft) === n; })[0];
  if (!draft) {
    append_('Drafts', { 'Project ID': p.ID, Draft: n, Editor: clean_(d.editor, 60), Created: new Date(), Pages: '{}' });
    draft = draftsOf_(p.ID).filter(function (x) { return Number(x.Draft) === n; })[0];
  }
  const pages = parse_(draft.Pages, {});
  const folder = folder_(p);
  const old = pages[slot];
  if (old) {
    [old.preview, old.print].forEach(function (id) {
      try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* already gone */ }
    });
  }
  const name = 'Draft ' + n + ' - ' + slot;
  const save = function (b64, suffix) {
    const bytes = Utilities.base64Decode(String(b64).replace(/^data:[^,]+,/, ''));
    return folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', name + suffix + '.jpg')).getId();
  };
  pages[slot] = {
    preview: save(d.preview, ' (preview)'), print: save(d.print, ''),
    w: Number(d.w) || 0, h: Number(d.h) || 0, qr: clean_(d.qr, 1000)
  };
  draft.Pages = JSON.stringify(pages);
  draft.Editor = clean_(d.editor, 60) || draft.Editor;
  save_('Drafts', draft);
  touch_(p, {});
  return { status: 'ok' };
}

function share_(p, d) {
  const n = Number(d.draft);
  const draft = draftsOf_(p.ID).filter(function (x) { return Number(x.Draft) === n; })[0];
  if (!draft || draft['Shared at']) return { status: 'invalid', message: 'Nothing to share.' };
  const pages = parse_(draft.Pages, {});
  const missing = (parse_(p.Config, {}).pages || []).filter(function (x) { return !pages[x.key]; });
  if (missing.length) return { status: 'invalid', message: 'Upload every page first: ' + missing.map(function (x) { return x.label; }).join(', ') };
  draft['Shared at'] = new Date();
  draft.Editor = clean_(d.editor, 60) || draft.Editor;
  save_('Drafts', draft);
  touch_(p, { Status: 'review' });
  return { status: 'ok' };
}

function addMessages_(p, d, from) {
  const items = (Array.isArray(d.items) ? d.items : []).slice(0, 60).filter(function (it) { return clean_(it.text, 2000); });
  if (!items.length) return { status: 'invalid', message: 'Write a message first.' };
  const shared = sharedCount_(draftsOf_(p.ID));
  const n = Number(d.draft) || shared;
  if (from === 'customer') {
    if (p.Status === 'approved') return { status: 'invalid', message: 'This design is already approved.' };
    if (!shared || n !== shared) return { status: 'invalid', message: 'Corrections go on the latest draft.' };
  }
  const name = clean_(d.name, 60) || (from === 'customer' ? p.Customer : 'Meraki');
  const now = new Date();
  items.forEach(function (it) {
    const pos = function (v) { return v === null || v === undefined || v === '' ? '' : Math.max(0, Math.min(100, Number(v) || 0)); };
    append_('Messages', {
      ID: 'M' + uid_(8), 'Project ID': p.ID, Draft: n, From: from, Name: name, Page: clean_(it.page, 40),
      X: pos(it.x), Y: pos(it.y), Text: clean_(it.text, 2000), Time: now, Done: false
    });
  });
  if (from === 'customer') {
    touch_(p, { Status: 'corrections' });
    notify_(p, 'Corrections from ' + p.Customer + ' (draft ' + n + ')',
      items.map(function (it, i) { return (i + 1) + '. ' + (it.page ? '[' + it.page + '] ' : '') + it.text; }).join('\n'));
    return { status: 'ok', project: out_(findProject_(p.ID), false) };
  }
  touch_(p, {});
  return { status: 'ok' };
}

function setDone_(p, d) {
  const m = rows_('Messages').filter(function (x) { return x.ID === d.msg && String(x['Project ID']) === String(p.ID); })[0];
  if (!m) return { status: 'notfound' };
  m.Done = !!d.done;
  save_('Messages', m);
  return { status: 'ok' };
}

function approve_(p, d) {
  const shared = sharedCount_(draftsOf_(p.ID));
  if (p.Status === 'approved') return { status: 'ok', project: out_(p, false) };
  if (!shared || Number(d.draft) !== shared) return { status: 'invalid', message: 'Please approve the latest draft.' };
  touch_(p, { Status: 'approved', 'Approved draft': shared, 'Approved at': new Date(), 'Approved by': clean_(d.name, 60) || p.Customer });
  notify_(p, p.Customer + ' approved draft ' + shared, 'The design is approved and ready for print.');
  return { status: 'ok', project: out_(findProject_(p.ID), false) };
}
