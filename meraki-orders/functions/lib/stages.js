'use strict';

/**
 * The one stage vocabulary for the whole system.
 *
 * Three vocabularies existed before this: the approval portal's
 * (new/review/corrections/approved), the growth dashboard's
 * (Enquiry/Confirmed/Designing/Printing/Delivered/Lost), and whatever each editor
 * typed into a sheet. `portalStatus` below maps the approval portal's statuses onto
 * these stages so the correction portal can drive the board in Stage 2 without a
 * second source of truth.
 *
 * `stuckAfterDays` is the only tuning knob for the "time in this stage" indicator.
 * An order is stuck when now - stage_since exceeds it. Terminal stages never go stuck.
 */

const STAGES = [
  { id: 'new',           label: 'New',           stuckAfterDays: 1,    terminal: false },
  { id: 'drafting',      label: 'Drafting',      stuckAfterDays: 2,    terminal: false },
  { id: 'with_customer', label: 'With Customer', stuckAfterDays: 3,    terminal: false },
  { id: 'approved',      label: 'Approved',      stuckAfterDays: 1,    terminal: false },
  { id: 'printing',      label: 'Printing',      stuckAfterDays: 3,    terminal: false },
  { id: 'delivered',     label: 'Delivered',     stuckAfterDays: null, terminal: true },
  { id: 'cancelled',     label: 'Cancelled',     stuckAfterDays: null, terminal: true }
];

const STAGE_IDS = STAGES.map((s) => s.id);

// The columns the board shows. Delivered and cancelled orders leave the board.
const BOARD_STAGE_IDS = STAGES.filter((s) => !s.terminal).map((s) => s.id);

// Approval portal status -> board stage. Used in Stage 2, declared here so both
// halves of the system agree on the mapping from the start.
const PORTAL_STATUS_TO_STAGE = {
  new: 'drafting',
  review: 'with_customer',
  corrections: 'drafting',
  approved: 'approved'
};

function isStage(id) {
  return STAGE_IDS.indexOf(id) >= 0;
}

function stage(id) {
  return STAGES.find((s) => s.id === id) || null;
}

/**
 * Days an order has sat in its current stage, and whether that is too long.
 * `stageSince` is a Date; callers convert a Firestore Timestamp first.
 */
function stageAge(stageId, stageSince, now) {
  const s = stage(stageId);
  if (!s || !stageSince) return { days: null, stuck: false };
  const days = (now.getTime() - stageSince.getTime()) / 86400000;
  return {
    days: days,
    stuck: s.stuckAfterDays != null && days > s.stuckAfterDays
  };
}

module.exports = {
  STAGES,
  STAGE_IDS,
  BOARD_STAGE_IDS,
  PORTAL_STATUS_TO_STAGE,
  isStage,
  stage,
  stageAge
};
