// Loads dashboard/index.html in Chromium with the Firebase CDN modules replaced by
// stubs, feeds it orders shaped like the real ones, and checks what the board renders.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const DASH = path.join(__dirname, '..', 'dashboard', 'index.html');
const DAY = 86400000;
const now = Date.now();

const ts = (ms) => ({ __ts: ms });

const ORDERS = [
  // 6 days in 'with_customer' (threshold 3) -> stuck
  { id: 'ORD-102536', order_id: 'ORD-102536', product_line: 'card', stage: 'with_customer',
    stage_since: ts(now - 6 * DAY), owner: 'mohsin', customer_name: 'Ranendra Baishya',
    phone_e164: '+919864630439', phone_valid: true, pincode: '781103', event_date: '2026-12-11',
    quantity: 1200, payment_status: 'advance_paid', whatsapp_group_id: 'g1',
    card: { product_name: 'Sacred Assamese Horai', inside_card_pending: true }, board: null, photos: [] },
  // 2 hours in 'new' (threshold 1 day) -> not stuck, and unassigned
  { id: 'ORD-711576', order_id: 'ORD-711576', product_line: 'card', stage: 'new',
    stage_since: ts(now - 2 * 3600000), owner: '', customer_name: 'Bondita Gogoi',
    phone_e164: '+916001744676', phone_valid: true, pincode: '785001', event_date: '2026-11-02',
    quantity: 100, payment_status: 'unpaid', whatsapp_group_id: null,
    card: { product_name: 'Sacred Assamese Horai', inside_card_pending: false }, board: null, photos: [] },
  // entry board, caricature with no photos, bad phone, flagged by the import
  { id: 'ME-411947', order_id: 'ME-411947', product_line: 'entry_board', stage: 'drafting',
    stage_since: ts(now - 5 * DAY), owner: 'ipshita', customer_name: 'Nishigandha and Jugabrata',
    phone_e164: null, phone_raw: '70021623319', phone_valid: false, pincode: '781016',
    event_date: '2026-11-20', payment_status: 'paid_full', whatsapp_group_id: 'g2',
    needs_review: true, card: null, photos: [], photos_received: false,
    board: { edition: 'caricature', event_name: 'Wedding and Reception' } },
  // a possible double-submit, and an owner who is not on the staff list
  { id: 'ME-717402', order_id: 'ME-717402', product_line: 'entry_board', stage: 'printing',
    stage_since: ts(now - 1 * DAY), owner: 'someone_who_left', customer_name: 'Jitu nd Lucky',
    phone_e164: '+917002657920', phone_valid: true, pincode: '786184', event_date: '2026-11-27',
    payment_status: 'paid_full', whatsapp_group_id: 'g3', possible_duplicate: true,
    card: null, photos: [{ url: 'https://x/1.jpg', kind: 'board_upload' }], photos_received: true,
    board: { edition: 'photo', event_name: 'Jitu nd lucky' } },
  // delivered: must NOT appear on the board
  { id: 'ORD-892049', order_id: 'ORD-892049', product_line: 'card', stage: 'delivered',
    stage_since: ts(now - 30 * DAY), owner: 'rihan', customer_name: 'Prastuti Adhyapak',
    phone_e164: '+918486963622', phone_valid: true, event_date: '2026-04-12',
    payment_status: 'paid_full', whatsapp_group_id: 'g4', card: { product_name: 'Classic Assamese' }, board: null, photos: [] }
];

const STAFF = [
  { id: 'u1', handle: 'mohsin', name: 'Mohsin', role: 'editor', active: true },
  { id: 'u2', handle: 'ipshita', name: 'Ipshita', role: 'editor', active: true },
  { id: 'u3', handle: 'rihan', name: 'Rihan', role: 'editor', active: true },
  { id: 'u4', handle: 'sahir', name: 'Sahir', role: 'admin', active: true }
];

const STUB = `
const revive = (o) => {
  const out = Array.isArray(o) ? [] : {};
  for (const k in o) {
    const v = o[k];
    if (v && typeof v === 'object' && '__ts' in v) out[k] = { toDate: () => new Date(v.__ts) };
    else if (v && typeof v === 'object') out[k] = revive(v);
    else out[k] = v;
  }
  return out;
};
const ORDERS = revive(${JSON.stringify(ORDERS)});
const STAFF = ${JSON.stringify(STAFF)};
window.__writes = [];

export const initializeApp = () => ({});
export const getAuth = () => ({});
export const signInWithEmailAndPassword = async () => {};
export const signOut = async () => {};
export const onAuthStateChanged = (a, cb) => { cb({ email: 'sahir@themerakievent.in', uid: 'u4' }); return () => {}; };
export const getFirestore = () => ({});
export const collection = (db, name) => ({ name });
export const doc = (db, name, id) => ({ name, id });
export const query = (c) => c;
export const orderBy = () => ({});
export const serverTimestamp = () => 'SERVER_TS';
export const arrayUnion = (x) => ({ arrayUnion: x });
export const Timestamp = { now: () => ({ toDate: () => new Date() }) };
export const onSnapshot = (ref, next) => {
  const rows = ref.name === 'orders' ? ORDERS : ref.name === 'staff' ? STAFF : [];
  next({ docs: rows.map((r) => ({ id: r.id, data: () => r })) });
  return () => {};
};
export const updateDoc = async (ref, patch) => { window.__writes.push({ id: ref.id, patch }); };
`;

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.route('https://www.gstatic.com/firebasejs/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/javascript', body: STUB }));
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' }));

  let html = fs.readFileSync(DASH, 'utf8');
  // Stand in for the config the user pastes in from the Firebase console.
  html = html.replace('projectId: ""', 'projectId: "test-project"').replace('apiKey: ""', 'apiKey: "test"');

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';

  await page.goto(url, { waitUntil: 'networkidle' });
  try {
    await page.waitForSelector('#board .col', { timeout: 10000 });
  } catch (err) {
    console.log('Board never rendered. Page errors:');
    errors.forEach((e) => console.log('  ' + e));
    console.log('body:', (await page.content()).slice(0, 1200));
    await browser.close(); server.close(); process.exit(1);
  }

  const results = [];
  const check = (name, actual, expected) => {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    results.push({ name, pass, actual, expected });
  };

  check('gate hidden once signed in', await page.locator('#gate').isHidden(), true);
  check('app visible', await page.locator('#app').isVisible(), true);
  check('five board columns', await page.locator('#board .col').count(), 5);
  check('column headings',
    await page.locator('#board .col-head h2').allInnerTexts(),
    ['New', 'Drafting', 'With Customer', 'Approved', 'Printing']);
  check('cards per column',
    await page.locator('#board .col').evaluateAll((cols) =>
      cols.map((c) => c.querySelectorAll('.card').length)),
    [1, 1, 1, 0, 1]);
  check('delivered order kept off the board',
    await page.locator('#board').innerHTML().then((h) => h.includes('ORD-892049')), false);
  check('live vs total count', await page.locator('#total').innerText(), '4 live · 5 total');
  check('stuck chip', await page.locator('#stuck').innerText(), '2 stuck');
  check('stuck orders get the red border',
    await page.locator('#board .card.stuck').evaluateAll((els) =>
      els.map((e) => e.querySelector('.oid').textContent).sort()),
    ['ME-411947', 'ORD-102536']);
  check('hours shown for a young order',
    await page.locator('.card:has-text("ORD-711576") .age').innerText(), '2h in stage');
  check('days shown for an old one',
    await page.locator('.card:has-text("ORD-102536") .age').innerText(), '6 days in stage');
  check('flags on the bad-phone board order',
    await page.locator('.card:has-text("ME-411947") .flag').allInnerTexts().then((f) => f.sort()),
    ['bad phone', 'check import', 'photos missing']);
  check('unassigned order flagged',
    await page.locator('.card:has-text("ORD-711576") .flag').allInnerTexts().then((f) => f.sort()),
    ['no WhatsApp group', 'no owner', 'unpaid']);
  check('departed owner still shown, not silently blank',
    await page.locator('.card:has-text("ME-717402") select[aria-label^="Owner"]').inputValue(),
    'someone_who_left');
  check('owner dropdown lists active staff',
    await page.locator('.card:has-text("ORD-711576") select[aria-label^="Owner"] option').allInnerTexts(),
    ['Unassigned', 'Mohsin', 'Ipshita', 'Rihan', 'Sahir']);
  check('stage dropdown offers the terminal stages too',
    await page.locator('.card:has-text("ORD-711576") select[aria-label^="Stage"] option').count(), 7);

  // Filters
  await page.locator('#f-line').selectOption('entry_board');
  check('product filter', await page.locator('#board .card').count(), 2);
  await page.locator('#f-line').selectOption('');
  await page.locator('#f-flag').selectOption('stuck');
  check('stuck filter', await page.locator('#board .card').count(), 2);
  await page.locator('#f-flag').selectOption('');
  await page.locator('#q').fill('jitu');
  check('search by name', await page.locator('#board .card').count(), 1);
  await page.locator('#q').fill('9864630439');
  check('search by phone', await page.locator('#board .card').count(), 1);
  await page.locator('#q').fill('');
  await page.locator('#f-owner').selectOption('__none');
  check('unassigned filter', await page.locator('#board .card').count(), 1);
  await page.locator('#f-owner').selectOption('');

  // Writes
  await page.locator('.card:has-text("ORD-711576") select[aria-label^="Stage"]').selectOption('drafting');
  await page.locator('.card:has-text("ORD-711576") select[aria-label^="Owner"]').selectOption('mohsin');
  const writes = await page.evaluate(() => window.__writes);
  check('stage move writes stage, stage_since, history and updated_at',
    Object.keys(writes[0].patch).sort(), ['stage', 'stage_history', 'stage_since', 'updated_at']);
  check('stage move targets the right order', writes[0].id, 'ORD-711576');
  check('stage move sets the chosen stage', writes[0].patch.stage, 'drafting');
  check('owner write touches only owner and updated_at',
    Object.keys(writes[1].patch).sort(), ['owner', 'updated_at']);
  check('owner write sets the chosen owner', writes[1].patch.owner, 'mohsin');

  if (process.env.SCREENSHOT) {
    await page.setViewportSize({ width: 1500, height: 900 });
    await page.screenshot({ path: process.env.SCREENSHOT, fullPage: true });
    console.log('  screenshot -> ' + process.env.SCREENSHOT);
  }

  await browser.close();
  server.close();

  let failed = 0;
  for (const r of results) {
    if (r.pass) { console.log('  PASS  ' + r.name); }
    else {
      failed++;
      console.log('  FAIL  ' + r.name + '\n          expected ' + JSON.stringify(r.expected) +
                  '\n          actual   ' + JSON.stringify(r.actual));
    }
  }
  if (errors.length) { console.log('\nPage errors:'); errors.forEach((e) => console.log('  ' + e)); }
  console.log('\n' + (results.length - failed) + '/' + results.length + ' checks passed' +
              (errors.length ? ', ' + errors.length + ' page errors' : ', no page errors'));
  process.exit(failed || errors.length ? 1 : 0);
})();
