# Meraki orders — Stage 1

One order record for The Meraki Event: wedding cards and entry boards in a single
database, with one owner each and a board that shows what is stuck.

```
  website form ──▶ createOrder ──▶ Firestore orders/{orderId}      ◀── the source of truth
                                      │
                                      ├──▶ Google Sheet "Orders (mirror)"   (one-way backup)
                                      ├──▶ whatsapp_queue/{orderId}         (decoupled)
                                      └──▶ dashboard board                  (live)
```

The Sheet is a copy. Nothing in this system ever reads a value back out of it.

| Path | What it is |
|---|---|
| `functions/lib/order.js` | **The data model.** The order record, field by field. |
| `functions/lib/stages.js` | The one stage vocabulary, and the "stuck" thresholds. |
| `functions/lib/normalize.js` | Cleaning for the shapes the live sheets actually contain. |
| `functions/lib/sheet.js` | The one-way Sheet mirror. |
| `functions/lib/workflow.js` | Stage moves, and the guard that stops the mirror retriggering itself. |
| `functions/index.js` | The four deployed functions. |
| `dashboard/index.html` | The board. One file, no build step. |
| `scripts/import-sheets.js` | One-time import of the two existing booking sheets. |
| `test/board.test.js` | Browser tests for the board. |
| `firestore.rules` | Who can read and write what. |

## The order record

One `orders` collection, two product lines. What a card and an entry board share sits at
the top level; what genuinely differs sits under `card` or `board`.

Shared: `order_id`, `product_line`, `source`, `customer_name`, `phone_e164`, `pincode`,
`address`, `event_date`, `quantity`, `photos[]`, `amount_total`, `amount_paid`,
`payment_status`, `owner`, `stage`, `stage_since`, `stage_history[]`,
`whatsapp_group_id`, `approval_project_id`, `booked_at`, `created_at`, `updated_at`.

Cards add `card.{product_id, product_name, cover_image_url, inside_card_url,
inside_card_pending, groom_name, bride_name, groom_parents, bride_parents, venue_name,
venue_address, venue_map_url, events[], language[]}`.

Boards add `board.{package, edition, event_name, design_kind, design_url, display_text}`.

Three notes:

- **`stage_since` is the whole "time in this stage" feature.** It is stamped on every
  stage move. `days_in_stage` is derived at render time and never stored, so it cannot
  go stale.
- **`owner` is a single string, never a list.** That is what gives one owner per order.
- **`card.events[]`** holds `{name, date, time, venue}` per ceremony. One `wedding_date`
  was never enough to set an Assamese card — Juron, Biya and the reception each have
  their own time and place, and that detail currently lives only in WhatsApp.

Stages: `new → drafting → with_customer → approved → printing`, plus the terminal
`delivered` and `cancelled`, which leave the board. Without a terminal stage, finished
orders pile up in Printing and the board stops being readable.

## Setup

### 1. Create the Firebase project

```bash
npm install -g firebase-tools
firebase login
firebase projects:create meraki-orders        # or any id you prefer
```

In the console (console.firebase.google.com), on that project:

- **Firestore Database** → Create database → production mode → region `asia-south1`.
- **Authentication** → Sign-in method → enable **Email/Password**.
- **Project settings → Your apps → Web** → register an app and copy the config.

Paste that config into the `CONFIG` block near the top of the script in
`dashboard/index.html`. Those values are not secrets — access is controlled by
`firestore.rules`.

### 2. Create the staff accounts

In **Authentication → Users**, add one user per person with a real password.
Then, in Firestore, add a `staff` document per person **keyed on that user's UID**:

```
staff/{uid}  =  { name: "Mohsin", handle: "mohsin", role: "editor", active: true }
```

`role: "admin"` lets that person edit the staff list. `active: false` revokes access
without deleting anything. A person with an auth account but no staff document can sign
in and see nothing, which is the intended failure mode.

> This replaces the old insider-dashboard gate, where the five user IDs and passwords
> were readable in the page's JavaScript and the order data was reachable without them.
> Pick new passwords here; the old ones should be treated as public.

### 3. Set the form key and the mirror sheet

```bash
cd meraki-orders
firebase use meraki-orders

# A shared secret the website form sends in the X-Meraki-Form-Key header, so that
# strangers cannot POST orders into the business. Generate something long and random.
firebase functions:secrets:set MERAKI_FORM_KEY
```

Create (or pick) the spreadsheet that will hold the backup copy, and put its id in
`functions/.env`:

```
MIRROR_SHEET_ID=1AbC...the spreadsheet id from its URL...
```

Then share that spreadsheet with the functions' service account
(`<project-id>@appspot.gserviceaccount.com`) as an **Editor**, or the mirror cannot
write. Leave `MIRROR_SHEET_ID` unset and the system still runs — it just logs that it is
skipping the mirror.

### 4. Deploy

```bash
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,firestore:indexes,functions,hosting
```

The board is then at `https://<project-id>.web.app`.

### 5. Point the website form at `createOrder`

The form currently writes straight to a Google Sheet. Change it to POST JSON to the
deployed function instead:

```
POST https://asia-south1-<project-id>.cloudfunctions.net/createOrder
X-Meraki-Form-Key: <the secret from step 3>
Content-Type: application/json

{
  "product_line": "card",
  "source": "website",
  "customer_name": "Ranendra Baishya",
  "phone": "9864630439",
  "event_date": "2026-12-11",
  "pincode": "781103",
  "quantity": 1200,
  "product_id": 22,
  "product_name": "Sacred Assamese Horai",
  "cover_image_url": "https://themerakievent.in/...",
  "inside_card_url": "Decide on WhatsApp"
}
```

For an entry board send `"product_line": "entry_board"` with `edition`
(`standard` / `caricature` / `photo`), `event_name`, `design_kind`, `design_url`,
`display_text`, `address`, and `photos: [{ url, kind: "board_upload" }]`.

Replies are `201 {status, order_id, warnings}` on success, `400 {status, errors}` when
the booking cannot be read, `401` when the key is wrong. The form should show the
`order_id` to the customer — it is the same `ORD-`/`ME-` number they already get.

The Sheet keeps filling up, because the mirror writes to it. Stop writing to the old
tab from the form so there is only one path in.

### 6. Import the orders that already exist

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
node scripts/import-sheets.js --project meraki-orders            # dry run, writes nothing
node scripts/import-sheets.js --project meraki-orders --write
```

The dry run prints what it would import, what it would skip, and what needs a human
look, and writes the full list to `scripts/import-report.json`. Read that before using
`--write`.

It will not guess. A row whose phone number or event date cannot be read is imported
with `needs_review: true` and shows a red flag on the board, rather than being quietly
"corrected". Expect it to flag, from the live sheets:

- phone numbers that are not ten digits (`70021623319`),
- event dates that fall before the booking date,
- rows with no PIN code,
- same phone + same date + same product submitted twice (there are several in the
  entry-boards sheet), marked `possible_duplicate` for you to merge or dismiss.

Historical orders keep their real booking time as `stage_since`, so the board is honest
on day one instead of showing every order as fresh.

Running it twice is safe: documents are keyed on the sheet's own order id.

## Tests

```bash
cd functions && npm install && cd ..
node test/board.test.js
SCREENSHOT=/tmp/board.png node test/board.test.js     # also saves a picture
```

26 checks against the real `dashboard/index.html` in a headless browser, with Firebase
stubbed: the columns, the stuck thresholds, the flags, the filters, and that a stage
move writes exactly the fields `firestore.rules` permits.

## What is deliberately not here

- **The correction portal (Stage 2).** It largely exists already, as an Apps Script
  backend over the `Meraki Design Approvals` sheet: `Projects` / `Drafts` / `Messages`,
  pins stored as `Page, X, Y, Text, Done`, private `Token` links, three draft rounds.
  `orders.approval_project_id` is the field that will link an order to its `MK-` project,
  and `stages.js` already carries the portal-status-to-stage mapping. Connect it; do not
  rebuild it.
- **Caricature automation.**
- **Customer-facing access.** No rule in `firestore.rules` grants an unauthenticated
  reader anything.
- **WhatsApp group creation.** `queueWhatsAppGroup` only writes a job into
  `whatsapp_queue`. The automation claims a job, creates the group, then writes
  `whatsapp_group_id` back onto the order. Nothing waits on it, so when WhatsApp Web
  breaks, bookings and the board keep working.
