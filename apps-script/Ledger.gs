/**
 * Guwahati Run & Rave – team ledger backend.
 * Paste into the Apps Script of a NEW Google Sheet (not the registrations Sheet).
 * Serves ledger/index.html: member logins, the money statement, and payment proofs.
 * Setup steps are in README.md.
 */

// Most accounts (admin included) that can be active at once.
const MAX_MEMBERS = 7;
// The first admin account, created the first time the page talks to this script.
// Change the password here BEFORE deploying. You are asked to change it again on first login.
const FIRST_ADMIN = { username: 'admin', name: 'GRR Admin', password: 'change-me-now' };

const SESSION_SECONDS = 6 * 60 * 60; // the longest CacheService allows
const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
const RECEIPT_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

const MEMBERS = 'Members';
const MEMBER_HEADERS = ['Username', 'Name', 'Phone', 'Role', 'Active', 'Salt', 'Password hash', 'Must change password', 'Created at'];
const TXNS = 'Transactions';
const TXN_HEADERS = ['ID', 'Date', 'Type', 'Amount', 'Description', 'Category', 'Member', 'Mode', 'Reference',
  'Receipt file ID', 'Receipt name', 'Recorded by', 'Recorded at', 'Status', 'Void reason', 'Voided by', 'Voided at'];

/* ---------- sheets ---------- */

function tab_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange('A:Z').setNumberFormat('@'); // store everything as text so nothing gets reformatted
  }
  return sh;
}

function rows_(sh) {
  const n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, sh.getLastColumn()).getValues() : [];
}

function members_() {
  const sh = tab_(MEMBERS, MEMBER_HEADERS);
  if (sh.getLastRow() < 2) {
    const salt = Utilities.getUuid();
    sh.appendRow([FIRST_ADMIN.username, FIRST_ADMIN.name, '', 'admin', 'TRUE', salt,
      hash_(salt, FIRST_ADMIN.password), 'TRUE', new Date().toISOString()]);
  }
  return sh;
}

function memberObj_(r, i) {
  return {
    row: i + 2, username: String(r[0]), name: String(r[1]), phone: String(r[2]), role: String(r[3]),
    active: String(r[4]) === 'TRUE', salt: String(r[5]), hash: String(r[6]), mustChange: String(r[7]) === 'TRUE'
  };
}

function findMember_(username) {
  const list = rows_(members_()).map(memberObj_);
  return list.find(m => m.username === username) || null;
}

function publicMember_(m, withPhone) {
  const o = { username: m.username, name: m.name, role: m.role, active: m.active };
  if (withPhone) o.phone = m.phone;
  return o;
}

function txnObj_(r) {
  return {
    id: String(r[0]), date: String(r[1]), type: String(r[2]), amount: Number(r[3]), description: String(r[4]),
    category: String(r[5]), member: String(r[6]), mode: String(r[7]), reference: String(r[8]),
    receiptName: String(r[10]), hasReceipt: !!String(r[9]), recordedBy: String(r[11]), recordedAt: String(r[12]),
    status: String(r[13]) || 'ok', voidReason: String(r[14]), voidedBy: String(r[15]), voidedAt: String(r[16])
  };
}

/* ---------- auth ---------- */

function hash_(salt, password) {
  let h = salt + '|' + password;
  for (let i = 0; i < 300; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}

function session_(token) {
  if (!/^[a-f0-9-]{36}$/.test(String(token || ''))) return null;
  const username = CacheService.getScriptCache().get('s_' + token);
  if (!username) return null;
  const m = findMember_(username);
  return m && m.active ? m : null;
}

function checkPassword_(pw) {
  pw = String(pw || '');
  return pw.length >= 8 && pw.length <= 100 ? '' : 'Use 8 to 100 characters.';
}

/* ---------- web app ---------- */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ status: 'ok', app: 'grr-ledger' });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ status: 'error', message: 'Bad request.' }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return json_(route_(d));
  } catch (err) {
    return json_({ status: 'error', message: 'Something went wrong. Try again.' });
  } finally {
    lock.releaseLock();
  }
}

function route_(d) {
  if (d.action === 'login') return login_(d);
  const me = session_(d.token);
  if (!me) return { status: 'auth', message: 'Please log in again.' };
  const isAdmin = me.role === 'admin';
  switch (d.action) {
    case 'me': return { status: 'ok', user: userOut_(me) };
    case 'logout': CacheService.getScriptCache().remove('s_' + d.token); return { status: 'ok' };
    case 'changePassword': return changePassword_(me, d);
    case 'list': return list_(isAdmin);
    case 'addTxn': return addTxn_(me, d);
    case 'receipt': return receipt_(d);
    case 'voidTxn': return isAdmin ? voidTxn_(me, d) : denied_();
    case 'saveMember': return isAdmin ? saveMember_(me, d) : denied_();
  }
  return { status: 'error', message: 'Unknown action.' };
}

function denied_() { return { status: 'denied', message: 'Only the admin can do that.' }; }

function userOut_(m) {
  return { username: m.username, name: m.name, role: m.role, mustChange: m.mustChange };
}

function login_(d) {
  const username = String(d.username || '').trim().toLowerCase();
  const cache = CacheService.getScriptCache();
  const failKey = 'f_' + username;
  const fails = Number(cache.get(failKey) || 0);
  if (fails >= 5) return { status: 'locked', message: 'Too many wrong tries. Wait 10 minutes.' };
  const m = findMember_(username);
  if (!m || !m.active || hash_(m.salt, String(d.password || '')) !== m.hash) {
    cache.put(failKey, String(fails + 1), 600);
    return { status: 'invalid', message: 'Wrong username or password.' };
  }
  cache.remove(failKey);
  const token = Utilities.getUuid();
  cache.put('s_' + token, m.username, SESSION_SECONDS);
  return { status: 'ok', token: token, user: userOut_(m) };
}

function changePassword_(me, d) {
  if (hash_(me.salt, String(d.oldPassword || '')) !== me.hash) return { status: 'invalid', message: 'Current password is wrong.' };
  const bad = checkPassword_(d.newPassword);
  if (bad) return { status: 'invalid', message: bad };
  const salt = Utilities.getUuid();
  members_().getRange(me.row, 6, 1, 3).setValues([[salt, hash_(salt, String(d.newPassword)), 'FALSE']]);
  return { status: 'ok' };
}

function list_(isAdmin) {
  const members = rows_(members_()).map(memberObj_).map(m => publicMember_(m, isAdmin));
  const txns = rows_(tab_(TXNS, TXN_HEADERS)).map(txnObj_);
  return { status: 'ok', members: members, transactions: txns, maxMembers: MAX_MEMBERS };
}

function clean_(v, max) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max); }

function addTxn_(me, d) {
  const type = d.type === 'credit' || d.type === 'debit' ? d.type : '';
  const amount = Math.round(Number(d.amount) * 100) / 100;
  const date = String(d.date || '');
  const description = clean_(d.description, 200);
  const tomorrow = Utilities.formatDate(new Date(Date.now() + 86400000), 'Asia/Kolkata', 'yyyy-MM-dd');
  if (!type) return { status: 'invalid', message: 'Choose credit or debit.' };
  if (!(amount > 0 && amount <= 100000000)) return { status: 'invalid', message: 'Enter an amount above zero.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > tomorrow) return { status: 'invalid', message: 'Enter a valid date, not in the future.' };
  if (description.length < 3) return { status: 'invalid', message: 'Describe what the money was for.' };

  const r = d.receipt || {};
  const ext = RECEIPT_TYPES[r.mime];
  if (!ext || !r.data) return { status: 'invalid', message: 'Attach a bill or payment screenshot (JPG, PNG, WEBP or PDF).' };
  let bytes;
  try { bytes = Utilities.base64Decode(String(r.data)); } catch (err) { return { status: 'invalid', message: 'The attachment could not be read.' }; }
  if (bytes.length > MAX_RECEIPT_BYTES) return { status: 'invalid', message: 'The attachment is over 8 MB.' };

  const sh = tab_(TXNS, TXN_HEADERS);
  const id = 'TXN-' + ('0000' + sh.getLastRow()).slice(-4); // sequential, so a missing number would show
  const file = receiptsFolder_().createFile(Utilities.newBlob(bytes, r.mime, id + '.' + ext));
  const row = [id, date, type, amount.toFixed(2), description, clean_(d.category, 40), clean_(d.member, 80),
    clean_(d.mode, 30), clean_(d.reference, 80), file.getId(), clean_(r.name, 120) || file.getName(),
    me.username, new Date().toISOString(), 'ok', '', '', ''];
  sh.appendRow(row);
  return { status: 'ok', txn: txnObj_(row) };
}

function receiptsFolder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('RECEIPTS_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (err) { /* deleted: make a new one */ } }
  const folder = DriveApp.createFolder('GRR Ledger receipts');
  props.setProperty('RECEIPTS_FOLDER', folder.getId());
  return folder;
}

function findTxnRow_(id) {
  const list = rows_(tab_(TXNS, TXN_HEADERS));
  const i = list.findIndex(r => String(r[0]) === String(id));
  return i < 0 ? null : { row: i + 2, values: list[i] };
}

function receipt_(d) {
  const t = findTxnRow_(d.id);
  if (!t || !t.values[9]) return { status: 'invalid', message: 'No attachment for this entry.' };
  const blob = DriveApp.getFileById(String(t.values[9])).getBlob();
  return { status: 'ok', mime: blob.getContentType(), name: String(t.values[10]), data: Utilities.base64Encode(blob.getBytes()) };
}

function voidTxn_(me, d) {
  const reason = clean_(d.reason, 200);
  if (reason.length < 3) return { status: 'invalid', message: 'Give a reason for voiding.' };
  const t = findTxnRow_(d.id);
  if (!t) return { status: 'invalid', message: 'Entry not found.' };
  if (String(t.values[13]) === 'void') return { status: 'invalid', message: 'Already voided.' };
  tab_(TXNS, TXN_HEADERS).getRange(t.row, 14, 1, 4).setValues([['void', reason, me.username, new Date().toISOString()]]);
  return { status: 'ok' };
}

function saveMember_(me, d) {
  const sh = members_();
  const all = rows_(sh).map(memberObj_);
  const username = String(d.username || '').trim().toLowerCase();
  const name = clean_(d.name, 80);
  const phone = String(d.phone || '').replace(/\D/g, '').slice(-10);
  const role = d.role === 'admin' ? 'admin' : 'member';
  const active = d.active !== false;
  if (!/^[a-z0-9._]{3,20}$/.test(username)) return { status: 'invalid', message: 'Username: 3 to 20 letters, numbers, dots or underscores.' };
  if (name.length < 2) return { status: 'invalid', message: 'Enter the member\'s name.' };
  const existing = all.find(m => m.username === username);
  const activeCount = all.filter(m => m.active && m.username !== username).length;
  if (active && activeCount >= MAX_MEMBERS) return { status: 'invalid', message: 'Already ' + MAX_MEMBERS + ' active members. Disable one first.' };

  if (existing) {
    const otherAdmins = all.filter(m => m.active && m.role === 'admin' && m.username !== username).length;
    if ((!active || role !== 'admin') && existing.role === 'admin' && otherAdmins === 0) {
      return { status: 'invalid', message: 'Keep at least one active admin.' };
    }
    sh.getRange(existing.row, 2, 1, 4).setValues([[name, phone, role, active ? 'TRUE' : 'FALSE']]);
    if (d.password) {
      const bad = checkPassword_(d.password);
      if (bad) return { status: 'invalid', message: 'Password: ' + bad };
      const salt = Utilities.getUuid();
      // An admin-set password is temporary: the member picks their own on next login.
      sh.getRange(existing.row, 6, 1, 3).setValues([[salt, hash_(salt, String(d.password)), username === me.username ? 'FALSE' : 'TRUE']]);
    }
  } else {
    const bad = checkPassword_(d.password);
    if (bad) return { status: 'invalid', message: 'Password: ' + bad };
    const salt = Utilities.getUuid();
    sh.appendRow([username, name, phone, role, active ? 'TRUE' : 'FALSE', salt, hash_(salt, String(d.password)), 'TRUE', new Date().toISOString()]);
  }
  return { status: 'ok' };
}
