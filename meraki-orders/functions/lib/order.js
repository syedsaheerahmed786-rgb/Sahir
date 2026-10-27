'use strict';

/**
 * The order record. This is the source of truth for the whole system.
 *
 * One collection, two product lines. Everything a card and an entry board share lives
 * at the top level; the parts that genuinely differ live under `card` or `board`. The
 * alternative - two collections - would mean two boards, two owners lists and two
 * places to look for "what is late", which is the problem we are getting rid of.
 *
 * Fields the editors actually work are deliberately few: owner, stage, stage_since.
 * Everything else is either captured at booking or filled in later from the
 * conversation that is currently scattered across WhatsApp.
 */

const n = require('./normalize');
const { isStage } = require('./stages');

const PRODUCT_LINES = ['card', 'entry_board', 'digital_invite'];
const SOURCES = ['website', 'whatsapp', 'walk_in', 'referral', 'planner', 'import'];
const PAYMENT_STATUSES = ['unpaid', 'advance_paid', 'paid_full', 'refunded'];
const PHOTO_KINDS = ['couple', 'family', 'reference', 'board_upload'];

// The id prefixes already in circulation: ORD- on card invoices and in WhatsApp
// threads, ME- on entry boards. Keeping them means no customer is ever told their
// order number changed.
const ID_PREFIX = { card: 'ORD', entry_board: 'ME', digital_invite: 'MD' };

function newOrderId(productLine) {
  const prefix = ID_PREFIX[productLine] || 'ORD';
  const digits = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return prefix + '-' + digits;
}

function isOrderId(value) {
  return typeof value === 'string' && /^(ORD|ME|MD)-\d{6}$/.test(value);
}

function num(value, fallback) {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
}

function str(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max == null ? 2000 : max);
}

/**
 * Build a complete order record from a booking payload, collecting problems rather
 * than throwing on the first one. Returns { order, errors, warnings }.
 *
 * `errors` means the record must not be written. `warnings` mean it is written but
 * needs a human to look at it - a bad phone number, a wedding date in the past.
 * Callers decide: createOrder rejects on errors, the importer quarantines and reports.
 */
function buildOrder(input, options) {
  const opts = options || {};
  const errors = [];
  const warnings = [];

  const productLine = PRODUCT_LINES.indexOf(input.product_line) >= 0 ? input.product_line : null;
  if (!productLine) errors.push('product_line must be one of ' + PRODUCT_LINES.join(', '));

  const customerName = n.name(input.customer_name);
  if (customerName.length < 2) errors.push('customer_name is required');

  const ph = n.phone(input.phone);
  if (!ph.valid) {
    // A booking with no reachable phone number cannot be worked at all: the entire
    // process runs over WhatsApp. Reject on the form, quarantine on import.
    (opts.lenientPhone ? warnings : errors).push('phone could not be read (' + ph.reason + ')');
  }

  const eventDate = n.isoDate(input.event_date);
  if (!eventDate) {
    errors.push('event_date is required (the wedding or ceremony date)');
  } else if (opts.now && eventDate < opts.now.toISOString().slice(0, 10)) {
    warnings.push('event_date ' + eventDate + ' is in the past');
  }

  const pincode = n.pincode(input.pincode) || n.pincode(input.address);
  if (!pincode) warnings.push('no PIN code found - delivery route unknown');

  const quantity = num(input.quantity, null);
  if (productLine === 'card' && (quantity == null || quantity <= 0)) {
    warnings.push('quantity missing or not a number');
  }

  const order = {
    // identity and provenance
    order_id: isOrderId(input.order_id) ? input.order_id : newOrderId(productLine || 'card'),
    product_line: productLine,
    source: SOURCES.indexOf(input.source) >= 0 ? input.source : 'website',
    booked_at: n.sheetTimestamp(input.booked_at) || null,

    // customer
    customer_name: customerName,
    phone_e164: ph.e164,
    phone_raw: ph.raw,
    phone_valid: ph.valid,
    pincode: pincode,
    address: n.address(input.address),

    // the WhatsApp group step writes these, and is allowed to fail without
    // blocking anything else. Null here is normal, not an error.
    whatsapp_group_id: null,
    whatsapp_group_created_at: null,

    // the date everything is scheduled backwards from, whichever product line
    event_date: eventDate,
    quantity: quantity,

    // customer-supplied images, for caricature cards and photo/caricature boards alike
    photos: (Array.isArray(input.photos) ? input.photos : []).slice(0, 40).map((p) => ({
      url: str(p && p.url, 500),
      kind: PHOTO_KINDS.indexOf(p && p.kind) >= 0 ? p.kind : 'reference',
      uploaded_at: n.sheetTimestamp(p && p.uploaded_at) || null,
      uploaded_by: str(p && p.uploaded_by, 60)
    })).filter((p) => p.url),

    // money
    amount_total: num(input.amount_total, null),
    amount_paid: num(input.amount_paid, 0),
    payment_status: PAYMENT_STATUSES.indexOf(input.payment_status) >= 0 ? input.payment_status : 'unpaid',
    payments: [],

    // ownership and workflow
    owner: str(input.owner, 60),
    stage: isStage(input.stage) ? input.stage : 'new',
    stage_history: [],
    approval_project_id: null,
    draft_round: 0,

    notes: str(input.notes, 4000),

    // set by the caller with a server timestamp
    stage_since: null,
    created_at: null,
    updated_at: null,
    synced_to_sheet_at: null
  };

  order.photos_received = order.photos.length > 0;

  if (productLine === 'card') {
    const cover = n.optionalUrl(input.cover_image_url);
    const inside = n.optionalUrl(input.inside_card_url);
    order.card = {
      product_id: num(input.product_id, null),
      product_name: str(input.product_name, 120),
      cover_image_url: cover.url,
      inside_card_url: inside.url,
      // 'Decide on WhatsApp' in the sheet means the customer has not picked yet.
      inside_card_pending: inside.pending,
      groom_name: str(input.groom_name, 80),
      bride_name: str(input.bride_name, 80),
      groom_parents: str(input.groom_parents, 200),
      bride_parents: str(input.bride_parents, 200),
      venue_name: str(input.venue_name, 200),
      venue_address: str(input.venue_address, 500),
      venue_map_url: n.optionalUrl(input.venue_map_url).url,
      // Assamese weddings run several ceremonies, each with its own time and place.
      // One wedding_date was never enough to set a card.
      events: (Array.isArray(input.events) ? input.events : []).slice(0, 12).map((e) => ({
        name: str(e && e.name, 80),
        date: n.isoDate(e && e.date),
        time: str(e && e.time, 40),
        venue: str(e && e.venue, 200)
      })).filter((e) => e.name),
      language: (Array.isArray(input.language) ? input.language : [])
        .map((l) => str(l, 20).toLowerCase())
        .filter((l) => ['assamese', 'english', 'bengali', 'hindi'].indexOf(l) >= 0)
    };
    order.board = null;
  } else if (productLine === 'entry_board') {
    order.card = null;
    order.board = {
      package: str(input.package, 20) || 'B1',
      edition: n.edition(input.edition),
      event_name: str(input.event_name, 160),
      design_kind: ['catalogue', 'custom'].indexOf(input.design_kind) >= 0 ? input.design_kind : null,
      design_url: n.optionalUrl(input.design_url).url,
      display_text: str(input.display_text, 500) || null
    };
    if (!order.board.edition) warnings.push('edition missing (Standard, Caricature or Photo)');
  } else {
    order.card = null;
    order.board = null;
  }

  return { order, errors, warnings };
}

module.exports = {
  PRODUCT_LINES, SOURCES, PAYMENT_STATUSES, PHOTO_KINDS, ID_PREFIX,
  newOrderId, isOrderId, buildOrder
};
