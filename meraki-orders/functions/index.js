'use strict';

/**
 * The Stage 1 write path.
 *
 *   website form  ->  createOrder  ->  Firestore (orders/{orderId})   [the source of truth]
 *                                        |
 *                                        +-> mirrorOrderToSheet  -> Google Sheet copy (one-way)
 *                                        +-> queueWhatsAppGroup  -> whatsapp_queue/{orderId}
 *
 * Two deliberate properties:
 *
 *  - The Sheet is downstream of the database, never upstream. No function here reads a
 *    value out of the Sheet. `resyncSheet` rewrites the mirror nightly, so a dropped
 *    write heals itself rather than leaving a gap nobody spots.
 *
 *  - WhatsApp group creation is the most fragile step in the business (it drives a
 *    browser session), so it is decoupled: this code only writes a job row. If the
 *    automation is down for a day, bookings still arrive, the board still works, and
 *    the jobs are simply still pending.
 */

const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest } = require('firebase-functions/v2/https');
const { onDocumentWritten, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

const { buildOrder } = require('./lib/order');
const sheet = require('./lib/sheet');
const { mirrorableChange } = require('./lib/workflow');

admin.initializeApp();
const db = admin.firestore();

// Mumbai: closest region to Guwahati, so the form POST and the board both feel local.
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

// Shared secret the website form sends in X-Meraki-Form-Key. Without it anyone could
// POST orders into the business. Set with:
//   firebase functions:secrets:set MERAKI_FORM_KEY
const FORM_KEY = defineSecret('MERAKI_FORM_KEY');

// The spreadsheet that holds the 'Orders (mirror)' tab.
const MIRROR_SHEET_ID = defineString('MIRROR_SHEET_ID', { default: '' });

const ALLOWED_ORIGINS = ['https://themerakievent.in', 'https://www.themerakievent.in'];

/* ------------------------------------------------------------------ *
 * createOrder - the only way an order enters the system
 * ------------------------------------------------------------------ */

exports.createOrder = onRequest(
  { secrets: [FORM_KEY], cors: ALLOWED_ORIGINS, invoker: 'public' },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ status: 'method_not_allowed' });
      return;
    }
    if (req.get('X-Meraki-Form-Key') !== FORM_KEY.value()) {
      logger.warn('createOrder rejected: bad or missing form key');
      res.status(401).json({ status: 'unauthorized' });
      return;
    }

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const now = new Date();
    const { order, errors, warnings } = buildOrder(payload, { now });

    if (errors.length) {
      res.status(400).json({ status: 'invalid', errors, warnings });
      return;
    }

    // An id collision would silently overwrite a live order, so claim the id with a
    // create() and retry on a fresh one rather than set()ting over whatever is there.
    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    const record = Object.assign({}, order, {
      stage_since: serverNow,
      created_at: serverNow,
      updated_at: serverNow,
      stage_history: [{ stage: order.stage, at: admin.firestore.Timestamp.fromDate(now), by: 'system' }],
      import_warnings: warnings
    });

    let orderId = order.order_id;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await db.collection('orders').doc(orderId).create(Object.assign({}, record, { order_id: orderId }));
        logger.info('order created', { orderId, productLine: order.product_line, warnings });
        res.status(201).json({ status: 'ok', order_id: orderId, warnings });
        return;
      } catch (err) {
        if (err && err.code === 6) { // ALREADY_EXISTS
          orderId = buildOrder(Object.assign({}, payload, { order_id: null }), { now }).order.order_id;
          continue;
        }
        logger.error('createOrder failed', err);
        res.status(500).json({ status: 'error' });
        return;
      }
    }
    logger.error('createOrder could not find a free order id after 5 attempts');
    res.status(503).json({ status: 'retry' });
  }
);

/* ------------------------------------------------------------------ *
 * mirrorOrderToSheet - the one-way backup copy
 * ------------------------------------------------------------------ */

exports.mirrorOrderToSheet = onDocumentWritten('orders/{orderId}', async (event) => {
  const spreadsheetId = MIRROR_SHEET_ID.value();
  if (!spreadsheetId) {
    logger.warn('MIRROR_SHEET_ID is not set; skipping the Sheet mirror');
    return;
  }

  const before = event.data.before.exists ? event.data.before.data() : null;
  const after = event.data.after.exists ? event.data.after.data() : null;
  if (!mirrorableChange(before, after)) return;

  try {
    await sheet.upsertOrder(spreadsheetId, after);
    // The only field this touches is synced_to_sheet_at, which mirrorableChange ignores,
    // so this write does not retrigger the mirror.
    await event.data.after.ref.update({ synced_to_sheet_at: admin.firestore.FieldValue.serverTimestamp() });
  } catch (err) {
    // A failed mirror must never fail the order. The nightly resync picks it up.
    logger.error('Sheet mirror failed; nightly resync will repair it', {
      orderId: event.params.orderId, message: err && err.message
    });
  }
});

/* ------------------------------------------------------------------ *
 * resyncSheet - nightly full rewrite, so the backup cannot quietly drift
 * ------------------------------------------------------------------ */

exports.resyncSheet = onSchedule(
  { schedule: '17 2 * * *', timeZone: 'Asia/Kolkata' },
  async () => {
    const spreadsheetId = MIRROR_SHEET_ID.value();
    if (!spreadsheetId) {
      logger.warn('MIRROR_SHEET_ID is not set; skipping the nightly resync');
      return;
    }
    const snap = await db.collection('orders').orderBy('created_at', 'asc').get();
    const orders = snap.docs.map((d) => d.data());
    const written = await sheet.replaceAll(spreadsheetId, orders);
    logger.info('nightly resync complete', { orders: written });
  }
);

/* ------------------------------------------------------------------ *
 * queueWhatsAppGroup - decoupled, allowed to fail without consequence
 * ------------------------------------------------------------------ */

exports.queueWhatsAppGroup = onDocumentCreated('orders/{orderId}', async (event) => {
  const order = event.data.data();
  if (!order.phone_e164) {
    logger.info('no usable phone number; not queueing a WhatsApp group', { orderId: event.params.orderId });
    return;
  }
  // One job per order. The WhatsApp Web automation claims a job, creates the group,
  // then writes whatsapp_group_id back onto the order and marks the job done. Nothing
  // waits on it.
  await db.collection('whatsapp_queue').doc(event.params.orderId).set({
    order_id: event.params.orderId,
    phone_e164: order.phone_e164,
    customer_name: order.customer_name,
    product_line: order.product_line,
    event_date: order.event_date,
    status: 'pending',
    attempts: 0,
    last_error: null,
    created_at: admin.firestore.FieldValue.serverTimestamp()
  });
});
