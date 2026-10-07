/**
 * Guwahati Run & Rave – registration backend.
 * Saves each booking from index.html into the Google Sheet this script is attached to.
 * Setup steps are in README.md.
 */

// Total slots. Set to 0 for no limit. Keep it the same as CONFIG.capacity in index.html.
const CAPACITY = 0;
const SHEET_NAME = 'Registrations';
const HEADERS = ['Registration ID', 'Name', 'Mobile', 'Email', 'Age', 'Gender', 'Emergency contact', 'Submitted at'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    // Use the first tab, so a Sheet that already has the header row keeps working.
    sh = ss.getSheets()[0];
    sh.setName(SHEET_NAME);
    if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange('C:C').setNumberFormat('@'); // keep phone numbers as text
    sh.getRange('G:G').setNumberFormat('@');
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function count_(sh) {
  return Math.max(0, sh.getLastRow() - 1);
}

function doGet(e) {
  return json_({ status: 'ok', count: count_(sheet_()), capacity: CAPACITY });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    const name = String(d.name || '').trim().slice(0, 80);
    const phone = String(d.phone || '').replace(/\D/g, '').slice(-10);
    if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone)) return json_({ status: 'invalid' });

    const sh = sheet_();
    const n = count_(sh);

    // Same mobile number already registered: return the existing ID instead of a second row.
    if (n > 0) {
      const rows = sh.getRange(2, 1, n, 3).getValues();
      for (const r of rows) {
        if (String(r[2]) === phone) return json_({ status: 'duplicate', id: r[0], count: n });
      }
    }
    if (CAPACITY && n >= CAPACITY) return json_({ status: 'full', count: n });

    const id = /^GRR-[A-Z0-9]{5}$/.test(d.id) ? d.id : 'GRR-' + Utilities.getUuid().slice(0, 5).toUpperCase();
    sh.appendRow([
      id,
      name,
      phone,
      String(d.email || '').slice(0, 120),
      Number(d.age) || '',
      String(d.gender || '').slice(0, 30),
      String(d.emergency || '').replace(/\D/g, '').slice(-10),
      new Date()
    ]);
    return json_({ status: 'ok', id: id, count: n + 1 });
  } catch (err) {
    return json_({ status: 'error' });
  } finally {
    lock.releaseLock();
  }
}
