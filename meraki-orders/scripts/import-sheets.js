#!/usr/bin/env node
'use strict';

/**
 * One-time import of the two live booking sheets into the orders collection.
 *
 *   Meraki Wedding Bookings(cards)   ->  product_line 'card'
 *   Meraki Entry Signages            ->  product_line 'entry_board'
 *
 * Runs as a dry run by default and prints a review list. Nothing is written until you
 * pass --write, and every write is keyed on the sheet's own order id, so running it
 * twice does not create duplicates.
 *
 * It refuses to invent data. A row whose phone number or event date cannot be read is
 * quarantined into the report instead of being guessed at, because a wrong number on a
 * wedding order costs more than a missing one.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   node scripts/import-sheets.js --project meraki-orders
 *   node scripts/import-sheets.js --project meraki-orders --write
 */

const fs = require('fs');
const path = require('path');
const { google } = require(path.join(__dirname, '..', 'functions', 'node_modules', 'googleapis'));
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));

const n = require('../functions/lib/normalize');
const { buildOrder } = require('../functions/lib/order');

const CARDS_SHEET_ID = '1MCNCnPgRyjigbpYoagGeVD4YNXewcOO5F2CqKUqW_Qk';
const BOARDS_SHEET_ID = '1eE3GAv_x-1nvE-uf8GGq1j8gVBxUxMQ6kaBAVVoKm5k';

const argv = process.argv.slice(2);
const WRITE = argv.includes('--write');
const PROJECT = (argv[argv.indexOf('--project') + 1] || process.env.GCLOUD_PROJECT || '').trim();
const REPORT = path.join(__dirname, 'import-report.json');

function arg(name, fallback) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
}

async function sheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

async function readTab(sheets, spreadsheetId, range) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values || [];
}

/* ---------- row -> payload ---------- */

// Meraki Wedding Bookings(cards): timestamp | Order ID | Product ID | Product Name |
// Customer Name | WhatsApp | Quantity | Wedding Date | Pincode | Cover Image URL | Inside Card URL
function cardPayload(row) {
  return {
    product_line: 'card',
    source: 'import',
    booked_at: row[0],
    order_id: String(row[1] || '').trim(),
    product_id: row[2],
    product_name: row[3],
    customer_name: row[4],
    phone: row[5],
    quantity: row[6],
    event_date: row[7],
    pincode: row[8],
    cover_image_url: row[9],
    inside_card_url: row[10]
  };
}

// Meraki Entry Signages, tab 'Bookings': Order ID | Timestamp | Couple Name | WhatsApp |
// Package | Event Date | Edition | Event name | Uploaded Files | Configuration & Notes | Address
function boardPayload(row) {
  const cfg = n.boardConfig(row[9]);
  const uploads = n.urlList(row[8]);
  return {
    product_line: 'entry_board',
    source: 'import',
    order_id: String(row[0] || '').trim(),
    booked_at: row[1],
    customer_name: row[2],
    phone: row[3],
    package: row[4] ? 'B' + String(row[4]).trim() : cfg.package,
    event_date: row[5] || cfg.date,
    // The Edition column and the config string agree in the data; prefer the column and
    // fall back to the string, so a blank column does not lose the edition.
    edition: n.edition(row[6]) || cfg.edition,
    event_name: n.name(row[7]) || cfg.event_name,
    design_kind: cfg.design_kind,
    design_url: cfg.design_url,
    display_text: cfg.display_text,
    address: row[10],
    notes: cfg.rest || '',
    photos: uploads.map((url) => ({ url, kind: 'board_upload' }))
  };
}

/* ---------- import ---------- */

async function collect(sheets, spreadsheetId, range, toPayload, label, now) {
  const rows = await readTab(sheets, spreadsheetId, range);
  const header = rows.shift();
  const out = { label, header, kept: [], skipped: [], flagged: [] };

  rows.forEach((row, i) => {
    const rowNo = i + 2;
    const payload = toPayload(row);

    // Blank spacer rows and the stray ':::' row in the boards sheet.
    if (!payload.order_id || !/^(ORD|ME|MD)-\d{6}$/.test(payload.order_id)) {
      if (row.some((c) => String(c || '').trim())) {
        out.skipped.push({ row: rowNo, reason: 'no usable order id', raw: payload.order_id || '' });
      }
      return;
    }

    // Import is lenient on the phone number: a flagged row is still worth having on the
    // board, where somebody can see it and fix it. The form is not lenient.
    const { order, errors, warnings } = buildOrder(payload, { now, lenientPhone: true });
    if (errors.length) {
      out.skipped.push({ row: rowNo, order_id: payload.order_id, reason: errors.join('; ') });
      return;
    }
    out.kept.push({ row: rowNo, order, warnings });
    if (warnings.length) out.flagged.push({ row: rowNo, order_id: order.order_id, warnings });
  });

  return out;
}

/** Same person, same date, same product: an accidental double-submit rather than two orders. */
function findDuplicates(kept) {
  const seen = new Map();
  const dupes = [];
  for (const item of kept) {
    const o = item.order;
    const key = [
      o.phone_e164 || o.phone_raw,
      o.event_date,
      o.product_line,
      o.card ? o.card.product_name : o.board ? o.board.edition + '|' + o.board.event_name : ''
    ].join('::');
    if (seen.has(key)) {
      dupes.push({ order_id: o.order_id, duplicate_of: seen.get(key), key });
    } else {
      seen.set(key, o.order_id);
    }
  }
  return dupes;
}

async function main() {
  if (!PROJECT) {
    console.error('Pass --project <firebase-project-id> (or set GCLOUD_PROJECT).');
    process.exit(2);
  }

  const now = new Date();
  const sheets = await sheetsClient();

  const cards = await collect(sheets, arg('--cards-sheet', CARDS_SHEET_ID), 'A1:K', cardPayload, 'cards', now);
  const boards = await collect(sheets, arg('--boards-sheet', BOARDS_SHEET_ID), "'Bookings'!A1:K", boardPayload, 'entry boards', now);

  const all = cards.kept.concat(boards.kept);
  const duplicates = findDuplicates(all);

  for (const part of [cards, boards]) {
    console.log('\n=== ' + part.label + ' ===');
    console.log('  importable : ' + part.kept.length);
    console.log('  skipped    : ' + part.skipped.length);
    console.log('  needs review: ' + part.flagged.length);
    for (const s of part.skipped.slice(0, 20)) {
      console.log('    row ' + s.row + ': ' + s.reason + (s.order_id ? ' [' + s.order_id + ']' : ''));
    }
  }

  console.log('\n=== likely double-submits (same phone, date and product) ===');
  if (!duplicates.length) console.log('  none');
  for (const d of duplicates) console.log('  ' + d.order_id + ' looks like a repeat of ' + d.duplicate_of);

  const report = {
    generated_at: now.toISOString(),
    written: WRITE,
    totals: {
      importable: all.length,
      skipped: cards.skipped.length + boards.skipped.length,
      needs_review: cards.flagged.length + boards.flagged.length,
      likely_duplicates: duplicates.length
    },
    cards: { skipped: cards.skipped, flagged: cards.flagged },
    entry_boards: { skipped: boards.skipped, flagged: boards.flagged },
    duplicates
  };
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log('\nFull report: ' + REPORT);

  if (!WRITE) {
    console.log('\nDry run. Nothing written. Re-run with --write once the lists above look right.');
    return;
  }

  admin.initializeApp({ projectId: PROJECT });
  const db = admin.firestore();
  const dupIds = new Set(duplicates.map((d) => d.order_id));

  let written = 0;
  for (let i = 0; i < all.length; i += 400) {
    const batch = db.batch();
    for (const item of all.slice(i, i + 400)) {
      const o = item.order;
      const bookedAt = o.booked_at || now;
      batch.set(db.collection('orders').doc(o.order_id), Object.assign({}, o, {
        // Historical orders keep their real booking time. stage_since is that same time,
        // so "time in this stage" is honest on day one rather than resetting everything
        // to the migration date and showing a board with no stuck orders on it.
        booked_at: admin.firestore.Timestamp.fromDate(bookedAt),
        stage_since: admin.firestore.Timestamp.fromDate(bookedAt),
        created_at: admin.firestore.Timestamp.fromDate(bookedAt),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        stage_history: [{ stage: o.stage, at: admin.firestore.Timestamp.fromDate(bookedAt), by: 'import' }],
        import_warnings: item.warnings,
        import_row: item.row,
        needs_review: item.warnings.length > 0 || dupIds.has(o.order_id),
        possible_duplicate: dupIds.has(o.order_id)
      }), { merge: true });
      written++;
    }
    await batch.commit();
    console.log('  committed ' + Math.min(i + 400, all.length) + '/' + all.length);
  }
  console.log('\nWrote ' + written + ' orders into ' + PROJECT + '.');
  console.log('Orders marked needs_review: ' + all.filter((x) => x.warnings.length).length + ' plus ' + dupIds.size + ' possible duplicates.');
}

// Exported so the row mapping and duplicate detection can be tested without
// touching the Sheets API or Firestore.
module.exports = { cardPayload, boardPayload, findDuplicates };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
