# Guwahati Run & Rave: registration page

A booking page for **Run for All**: Sunday 11 October 2026, 6:00 AM, Jyoti Bishnu Prekhyagriha Auditorium. Entry is free and slots are limited.

| File | What it is |
|---|---|
| `index.html` | The booking page. It's a single file with no build step. |
| `apps-script/Code.gs` | The Google Sheet backend. It saves each registration as a row. |
| `ledger/index.html` | The team ledger: member login and a money statement with proof for every entry. |
| `apps-script/Ledger.gs` | The ledger's Google Sheet backend: members, transactions and payment proofs. |
| `register-qr.png` / `.svg` | A QR code for `https://syedsaheerahmed786-rgb.github.io/Sahir/`, for the poster. |

## 1. Connect a Google Sheet (about 5 minutes)

1. Create a new Google Sheet, for example "GRR Registrations".
2. Click **Extensions → Apps Script**. Delete what's there and paste in `apps-script/Code.gs`. To cap the slots, set `CAPACITY` (for example `300`).
3. Click **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Approve the permissions prompt, then copy the **Web app URL** (it ends in `/exec`).
5. In `index.html`, open the `CONFIG` block near the bottom and set:
   ```js
   sheetEndpoint: "https://script.google.com/macros/s/XXXX/exec",
   capacity: 300   // same number as CAPACITY, or 0 to hide the counter
   ```

Each registration becomes a row in the **Registrations** tab: ID, name, mobile, email, age, gender, emergency contact and time. If someone registers again with the same mobile number, they get their existing ID back and no second row is added. When the cap is reached, the page shows "Registration closed".

**No Sheet?** Leave `sheetEndpoint` empty and set `whatsappNumber: "91XXXXXXXXXX"`. Each guest is then sent to WhatsApp with their details pre-filled, and they send that message to you.

## 2. Publish the link

**Option A: GitHub Pages (free).** In the repo, go to **Settings → Pages → Deploy from a branch**, then pick the branch and `/ (root)`. The link is
`https://syedsaheerahmed786-rgb.github.io/Sahir/`. The QR code in this repo already points to that address.

**Option B: the GRR website.** Upload `index.html` as a page, for example `yoursite.com/register`. You can also add a "Register" button that links to the GitHub Pages address. If you use the GRR website, make a new QR code for that address.

## 3. Team ledger (members only)

`https://syedsaheerahmed786-rgb.github.io/Sahir/ledger/` is a login page for the team, up to 7 accounts. After logging in, members see one shared statement like a bank passbook: date, details, debit, credit and running balance, with money in, money out and the balance at the top.

- **Every entry needs proof.** A bill photo, payment screenshot or PDF must be attached before an entry saves. Tap any row to see the proof.
- **Nothing is deleted or edited.** Entries get sequential IDs (TXN-0001, TXN-0002, …), so a gap would show. The admin can *void* a wrong entry with a reason. It stays on the statement, struck out, and stops counting toward the balance.
- **Everyone sees who did what.** Each entry shows who entered it and when, and voids show who voided them and why.
- **Admin** adds members, sets or resets passwords, makes someone admin, and disables accounts. A password set by the admin is temporary; the member picks their own at next login.
- Filter by month, type or member, download the view as CSV, or print it / save as PDF.

Until it's connected, the page runs in **demo mode** with sample data saved only in your browser (log in as `admin` / `admin12345`).

### Connect it (about 5 minutes)

1. Create a **new** Google Sheet, for example "GRR Ledger". Keep it separate from the registrations Sheet, and share it with nobody: it holds password hashes.
2. Click **Extensions → Apps Script**, delete what's there and paste in `apps-script/Ledger.gs`.
3. At the top of the script, change `FIRST_ADMIN.password` to something only you know. `MAX_MEMBERS` is the account limit (7).
4. **Deploy → New deployment → Web app**, Execute as **Me**, Who has access **Anyone**. Approve the permissions (Sheets and Drive), and copy the URL ending in `/exec`.
5. In `ledger/index.html`, set `ledgerEndpoint: "https://script.google.com/macros/s/XXXX/exec"` in the `CONFIG` block.
6. Open the ledger page, log in as `admin` with the password from step 3, and choose a new password. Then add the members from the **Members** tab.

The Sheet gets a **Members** tab and a **Transactions** tab. Proofs are saved in a private Google Drive folder called "GRR Ledger receipts", and the page fetches them only for logged-in members. After changing the script later, use **Deploy → Manage deployments → Edit → New version** so the `/exec` URL stays the same.
