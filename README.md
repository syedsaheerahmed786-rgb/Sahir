# Guwahati Run & Rave: registration page

A booking page for **Run for All**: Sunday 11 October 2026, 6:00 AM, Jyoti Bishnu Prekhyagriha Auditorium. Entry is free and slots are limited.

| File | What it is |
|---|---|
| `index.html` | The booking page. It's a single file with no build step. |
| `apps-script/Code.gs` | The Google Sheet backend. It saves each registration as a row. |
| `register-qr.png` / `.svg` | A QR code for `https://syedsaheerahmed786-rgb.github.io/Sahir/`, for the poster. |
| `invoice/index.html` | The invoice portal. Also a single file with no build step. |

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

## 3. The invoice portal

`invoice/index.html` is an internal tool for billing sponsors, stall holders and vendors.
Open it at `https://syedsaheerahmed786-rgb.github.io/Sahir/invoice/`, or just open the file
from disk — it works either way.

It is themed to match the Run for All poster: near-black and deep forest green with a warm
amber accent, and `assets/grr-logo-light.png` (a white version of the logo, generated from
`grr-logo.png`) for use on dark backgrounds. The printed invoice keeps a **white body** under
a green header band — a full-black A4 page wastes toner and reads wrong as a business
document, so the brand comes through in the band, the table header and the totals block.

**First run.** Go to **Settings** and fill in the organisation name, address, GSTIN, bank
account and UPI ID. These print on every invoice. Set the number prefix and the next serial
while you are there; numbers come out as `GRR/2026-27/004`, where the middle part is the
Indian financial year of the invoice date.

**Making an invoice.** The **Make an invoice** tab is a form, and the preview underneath is
exactly what prints. Add a row per item with a quantity, rate and GST rate; the presets fill
in a sponsorship package or a stall with its SAC code. GST follows the place of supply: inside
Assam it splits into equal CGST and SGST halves, outside Assam it is charged as IGST. Pick
**Invoice (no GST)** as the document type, or set every row to 0%, and the tax columns drop
out altogether. Mixed rates on one invoice are summarised per rate, the way GST expects.

**Getting it out.** **Print / Save as PDF** prints the sheet alone on A4 — in the print dialog
choose "Save as PDF" for a file to email. **Share on WhatsApp** opens a chat with the invoice
as text, to the client's number when one is filled in. **Copy as text** puts the same on the
clipboard.

**Saved invoices.** Every save lands in the **Saved** tab with running totals for billed,
received and outstanding. From there you can reopen an invoice, duplicate it as a new draft,
mark it paid, or export the register as CSV for your accountant.

### Where the data lives

Invoices are stored in the browser on the device you make them on, in `localStorage`. Nothing
is uploaded anywhere, which also means:

- they do not sync between your phone and your laptop,
- clearing site data or browsing history for the site wipes them,
- a different browser on the same machine sees a different set.

So use **Settings → Export backup** after a billing session; it writes a `.json` file holding
every invoice and all the settings, and **Import backup** reads it back on any device. If
several people need the same list, put the exported file in shared storage and re-import it,
or move the whole thing onto a Google Sheet the way the registration page does.
