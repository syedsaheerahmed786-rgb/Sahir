'use strict';

/**
 * Stage moves, and the guard that keeps the Sheet mirror from retriggering itself.
 *
 * Kept out of index.js so that nothing here looks like a deployable function, and so
 * both halves can be unit-tested without the Functions runtime.
 */

const { isStage } = require('./stages');

// Fields whose change must NOT trigger a mirror write. synced_to_sheet_at is written by
// the mirror itself; without this guard the mirror would retrigger forever, once per
// order, every time it succeeded.
const NOT_MIRRORED = ['synced_to_sheet_at'];

function mirrorableChange(before, after) {
  if (!after) return false;   // deleted - orders are never deleted in Stage 1
  if (!before) return true;   // created
  const keys = new Set(Object.keys(before).concat(Object.keys(after)));
  for (const key of keys) {
    if (NOT_MIRRORED.indexOf(key) >= 0) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) return true;
  }
  return false;
}

/**
 * Move an order to a stage, stamping stage_since and appending to stage_history.
 *
 * The board does this write directly from the browser under the security rules; this is
 * the same move for server-side callers - notably the Stage 2 correction portal, which
 * needs to push an order to 'with_customer' when a draft is shared and to 'approved'
 * when the customer signs off.
 *
 * `admin` is passed in rather than required, so this file has no side effects on load.
 */
async function setStage(admin, orderId, stageId, by) {
  if (!isStage(stageId)) throw new Error('unknown stage: ' + stageId);
  const db = admin.firestore();
  const ref = db.collection('orders').doc(orderId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error('no such order: ' + orderId);
    if (snap.data().stage === stageId) return;   // already there; do not churn stage_since
    tx.update(ref, {
      stage: stageId,
      stage_since: admin.firestore.FieldValue.serverTimestamp(),
      stage_history: admin.firestore.FieldValue.arrayUnion({
        stage: stageId,
        at: admin.firestore.Timestamp.now(),
        by: by || 'system'
      }),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
  });
}

module.exports = { NOT_MIRRORED, mirrorableChange, setStage };
