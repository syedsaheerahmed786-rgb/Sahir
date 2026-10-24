# Guwahati Run & Rave: registration page

A booking page for **Run for All**: Sunday 11 October 2026, 6:00 AM, Jyoti Bishnu Prekhyagriha Auditorium. Entry is free and slots are limited.

| File | What it is |
|---|---|
| `index.html` | The booking page. It's a single file with no build step. |
| `apps-script/Code.gs` | The Google Sheet backend. It saves each registration as a row. |
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

---

# Meraki design approval portal

Editors upload card drafts, customers mark corrections on the design, and once approved the editor downloads a print-ready PDF.

| File | What it is |
|---|---|
| `approval/index.html` | The portal. One page for editors (sign in) and customers (private link). No build step. |
| `apps-script/ApprovalPortal.gs` | The backend. Customer files, drafts and messages go in a Google Sheet, design pages in a Google Drive folder. |

Address: `https://syedsaheerahmed786-rgb.github.io/Sahir/approval/`. Until the backend is connected, the portal runs in **demo mode**: everything is saved only in that browser, which is fine for trying it out.

## How it works

1. **Editor creates a customer file:** name, WhatsApp number and card format. The default is the **A4 folded card**.
2. **Editor uploads the drafts.** Drop single pages, a multi-page PDF exported from Canva, or A4 spreads. The portal places the pages itself:
   - It finds the QR code and puts that page on the back. If an A4 spread has the QR, that spread becomes the outside of the card and the QR half becomes the back.
   - It warns about a missing QR on the back, a page that isn't A5 shape, or low resolution.
3. **Share:** press *Share draft*, then *Send on WhatsApp*. The customer gets a private link.
4. **Customer checks the design** in card form (front, opened, back, or all pages) and taps on the design to pin each correction, or adds a general note. Then they send all corrections together. Corrections and replies stay on the site.
5. **3 drafts:** the customer gets 3 drafts in total (you can change this per customer). When all are used, the editor can *Give an extra draft*.
6. **Approve:** the customer presses *Approve*. The editor then downloads the PDF.

## Formats

| Format | Designs | Customer sees | Print PDFs |
|---|---|---|---|
| A4 folded card (default) | Front cover (names or caricatures), inside left (English), inside right (Assamese), back (QR) | Front · Opened · Back | **A4 sheets:** outside (back + front) and inside (English + Assamese). Print double-sided, flip on the short edge, fold. Also **A5 pages**. |
| A5 card, front & back | Front, back | Front · Back | **A5** front and back, or **2 per A4 sheet** |
| Two A5 cards, shared back | Card 1 front, card 2 front, common back | Card 1 · Card 2 · Back | **A5** (card 1 front, back, card 2 front, back), or **both cards on one A4 sheet** |
| Custom | 1 to 12 designs, A5 or A4, folded or separate, your own page names, optional QR on the last page | As chosen | Pages at the chosen size, plus 2 per A4 sheet for A5 |

To add another standard format, copy a block in `FORMATS` near the top of the script in `approval/index.html`.

## Connect the backend (about 5 minutes)

1. Create a Google Sheet, for example "Meraki Approvals".
2. Click **Extensions → Apps Script**, paste in `apps-script/ApprovalPortal.gs`, and change `EDITOR_KEY` to your team passcode. To get an email when a customer sends corrections or approves, set `NOTIFY_EMAIL`.
3. Click **Deploy → New deployment → Web app**. Set *Execute as* to **Me** and *Who has access* to **Anyone**, then approve the permissions (Sheets, Drive and email).
4. Copy the **Web app URL** (it ends in `/exec`) into `endpoint` in the `CONFIG` block of `approval/index.html`.
5. Editors open the portal and sign in with their name and the team passcode.

The script makes three tabs, **Projects**, **Drafts** and **Messages**, plus a Drive folder called **Meraki Design Approvals** with one folder per customer. Customers can see only their own shared drafts, through the private link. After editing the script, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.
