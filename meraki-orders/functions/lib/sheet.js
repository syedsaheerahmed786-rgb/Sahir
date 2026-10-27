'use strict';

/**
 * The one-way Google Sheet mirror.
 *
 * The Sheet is a backup copy and nothing else. Nothing in this file ever reads a value
 * out of the Sheet and puts it back into Firestore, and nothing downstream is allowed
 * to depend on it. If the mirror breaks, orders keep flowing; only the backup goes
 * stale, and the nightly resync repairs it.
 *
 * Deliberately a full-row rewrite keyed on the order id rather than an append-only log:
 * an editor looking at the backup should see the order as it stands, and a dropped
 * incremental write self-heals on the next nightly pass instead of leaving a permanent
 * gap nobody notices.
 */

const { google } = require('googleapis');

const TAB = 'Orders (mirror)';

// Column order for the mirror tab. Add to the end, never insert in the middle: the
// nightly resync rewrites by position.
const COLUMNS = [
  ['order_id', (o) => o.order_id],
  ['product_line', (o) => o.product_line],
  ['stage', (o) => o.stage],
  ['owner', (o) => o.owner || ''],
  ['stage_since', (o) => iso(o.stage_since)],
  ['customer_name', (o) => o.customer_name],
  ['phone', (o) => o.phone_e164 || o.phone_raw || ''],
  ['pincode', (o) => o.pincode || ''],
  ['event_date', (o) => o.event_date || ''],
  ['quantity', (o) => (o.quantity == null ? '' : o.quantity)],
  ['product_or_edition', (o) => (o.card ? o.card.product_name : o.board ? o.board.edition : '')],
  ['event_name', (o) => (o.board ? o.board.event_name : '')],
  ['couple', (o) => (o.card ? [o.card.groom_name, o.card.bride_name].filter(Boolean).join(' & ') : '')],
  ['venue', (o) => (o.card ? o.card.venue_name : '')],
  ['payment_status', (o) => o.payment_status],
  ['amount_total', (o) => (o.amount_total == null ? '' : o.amount_total)],
  ['amount_paid', (o) => (o.amount_paid == null ? '' : o.amount_paid)],
  ['photos', (o) => (o.photos || []).map((p) => p.url).join('\n')],
  ['whatsapp_group', (o) => (o.whatsapp_group_id ? 'created' : '')],
  ['booked_at', (o) => iso(o.booked_at)],
  ['created_at', (o) => iso(o.created_at)],
  ['updated_at', (o) => iso(o.updated_at)],
  ['address', (o) => o.address || ''],
  ['notes', (o) => o.notes || '']
];

const HEADER = COLUMNS.map((c) => c[0]);

// Row 1 of the tab, so that anyone who opens the Sheet knows not to type in it.
const BANNER = [
  'DO NOT EDIT - this tab is a one-way copy of the orders database. ' +
  'Edits here are overwritten by the nightly resync and are never read back. ' +
  'Change an order in the dashboard.'
];

function iso(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toDate === 'function') return value.toDate().toISOString();  // Firestore Timestamp
  return String(value);
}

function rowFor(order) {
  return COLUMNS.map((c) => {
    const v = c[1](order);
    return v == null ? '' : v;
  });
}

async function client() {
  // On Cloud Functions this picks up the function's own service account. That account
  // must be an Editor on the mirror spreadsheet - see the README.
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

/** Create the tab with its banner and header if it is not there yet. */
async function ensureTab(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' });
  const exists = (meta.data.sheets || []).some((s) => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB, gridProperties: { frozenRowCount: 2 } } } }] }
    });
  }
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'" + TAB + "'!A1",
    valueInputOption: 'RAW',
    requestBody: { values: [BANNER, HEADER] }
  });
}

/** Order ids already in the mirror, mapped to their 1-based row number. */
async function rowIndex(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'" + TAB + "'!A3:A"
  });
  const index = {};
  (res.data.values || []).forEach((row, i) => {
    const id = row && row[0];
    if (id) index[id] = i + 3;
  });
  return index;
}

/**
 * Write one order into the mirror: update its row if it is there, append if it is not.
 * Returns the row number written.
 */
async function upsertOrder(spreadsheetId, order) {
  const sheets = await client();
  await ensureTab(sheets, spreadsheetId);
  const index = await rowIndex(sheets, spreadsheetId);
  const values = [rowFor(order)];

  if (index[order.order_id]) {
    const row = index[order.order_id];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "'" + TAB + "'!A" + row,
      valueInputOption: 'RAW',
      requestBody: { values }
    });
    return row;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'" + TAB + "'!A3",
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values }
  });
  return null;
}

/**
 * Rewrite the whole mirror from the given orders. This is the self-healing pass: it
 * does not care what state the tab was left in.
 */
async function replaceAll(spreadsheetId, orders) {
  const sheets = await client();
  await ensureTab(sheets, spreadsheetId);
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: "'" + TAB + "'!A3:ZZ" });
  if (!orders.length) return 0;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "'" + TAB + "'!A3",
    valueInputOption: 'RAW',
    requestBody: { values: orders.map(rowFor) }
  });
  return orders.length;
}

module.exports = { TAB, HEADER, COLUMNS, rowFor, upsertOrder, replaceAll };
