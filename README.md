# Guwahati Run & Rave: registration page

A booking page for **Run for All**: Sunday 11 October 2026, 6:00 AM, Jyoti Bishnu Prekhyagriha Auditorium. Entry is free and slots are limited.

| File | What it is |
|---|---|
| `index.html` | The booking page. It's a single file with no build step. |
| `apps-script/Code.gs` | The Google Sheet backend. It saves each registration as a row. |
| `register-qr.png` / `.svg` | A QR code for `https://syedsaheerahmed786-rgb.github.io/Sahir/`, for the poster. |
| `meraki/studio/index.html` | **Art studio** — the editor tool that turns a customer photo into regional-theme vector artwork. |

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

Address: `https://syedsaheerahmed786-rgb.github.io/Sahir/approval/`. It is connected to the "Meraki Design Approvals" Google Sheet. With `endpoint` left empty, the portal runs in **demo mode** instead, where everything is saved only in that browser.

## How it works

1. **Editor creates a customer file.** *+ New customer* has two options:
   - **Find by order ID:** search the website's order sheets by order ID, name or phone: card orders (`ORD-711576`, from "Meraki Wedding Bookings(cards)") and entry board orders (`ME-837285`, from "Meraki Entry Signages"). Just the number works too. Picking an entry board order sets up Entry signage, 2 × 3 ft, with one board per event. Picking the order fills in the name and phone and links the order (product, quantity, wedding date, pincode, design images) to the file. If a file already exists for that order, the portal offers to open it.
   - **Custom create:** type the name and phone yourself.

   The default card format is the **A4 folded card**.
2. **Editor uploads the drafts.** Drop single pages, a multi-page PDF exported from Canva, or A4 spreads. The portal places the pages itself:
   - It finds the QR code and puts that page on the back. If an A4 spread has the QR, that spread becomes the outside of the card and the QR half becomes the back.
   - It warns about a missing QR on the back, a page that isn't A5 shape, or low resolution.
3. **Share:** press *Share draft*, then *Send on WhatsApp*. The customer gets a private link.
4. **Customer checks the design** in card form (front, opened, back, or all pages) and taps on the design to pin each correction, or adds a general note. Then they send all corrections together. Corrections and replies stay on the site.
5. **3 drafts:** the customer gets 3 drafts in total (you can change this per customer). When all are used, the editor can *Give an extra draft*.
6. **Approve and confirm delivery:** the customer presses *Approve* and confirms the delivery address (filled in from the booking). The editor then downloads the PDF.
7. **Tracking:** the customer's link is also their order tracker: Booking confirmed → Draft coming soon → Drafts → Approved for print → Out for delivery → Delivered. Editors add the courier and tracking number or link, mark it dispatched and then delivered, and can send the tracking on WhatsApp.

For entry boards, customers can also **change their board design** at any time before approving: pick another design from the website catalogue (Standard, Caricature or Photo) or upload their own picture. Editors see these under *Design change requests*.

## Formats

| Format | Designs | Customer sees | Print PDFs |
|---|---|---|---|
| A4 folded card (default) | Front cover (names or caricatures), inside left (English), inside right (Assamese), back (QR) | Front · Opened · Back | **A4 sheets:** outside (back + front) and inside (English + Assamese). Print double-sided, flip on the short edge, fold. Also **A5 pages**. |
| A5 card, front & back | Front, back | Front · Back | **A5** front and back, or **2 per A4 sheet** |
| Two A5 cards, shared back | Card 1 front, card 2 front, common back | Card 1 · Card 2 · Back | **A5** (card 1 front, back, card 2 front, back), or **both cards on one A4 sheet** |
| Signage | 1 to 10 boards (welcome board, menu, seating chart…), 18 × 24 in, 24 × 36 in, 36 × 48 in, A3, A2, A1 or a custom size, portrait or landscape, optional QR on the last board | A tab per board | **Actual size** (one page per board, at the board's real dimensions) and an **A4 proof** |
| Entry signage | 1 to 10 entrance pieces: Entry board 2 × 3 ft (sunboard, the default), roll-up standee 33 × 80 in, standee 3 × 6 ft, entry boards 4 × 6 and 6 × 8 ft, gate / arch banners 8 × 10 and 10 × 12 ft, or a custom size in feet | A tab per sign | **Actual size** and an **A4 proof** |
| Custom | 1 to 12 designs, A5 or A4, folded or separate, your own page names, optional QR on the last page | As chosen | Pages at the chosen size, plus 2 per A4 sheet for A5 |

To add another standard format, copy a block in `FORMATS` near the top of the script in `approval/index.html`.

## Connect the backend (about 5 minutes)

1. Create a Google Sheet, for example "Meraki Approvals".
2. Click **Extensions → Apps Script**, paste in `apps-script/ApprovalPortal.gs`, and change `EDITOR_KEY` to your team passcode. To get an email when a customer sends corrections or approves, set `NOTIFY_EMAIL`.
3. Click **Deploy → New deployment → Web app**. Set *Execute as* to **Me** and *Who has access* to **Anyone**, then approve the permissions (Sheets, Drive and email).
4. Copy the **Web app URL** (it ends in `/exec`) into `endpoint` in the `CONFIG` block of `approval/index.html`.
5. Editors open the portal and sign in with their name and the team passcode.

The order sheets are listed in `BOOKING_SHEETS` at the top of the script. The account that deploys the script must be able to open them. After updating the script, choose **authorize** in the toolbar and press **Run** once so Google asks for access to them.

The script makes three tabs, **Projects**, **Drafts** and **Messages**, plus a Drive folder called **Meraki Design Approvals** with one folder per customer. Customers can see only their own shared drafts, through the private link. After editing the script, use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

---

# Meraki Art Studio (editor tool)

`meraki/studio/index.html` — one page where an editor turns a customer photo into finished
couple artwork. Open it at
`https://syedsaheerahmed786-rgb.github.io/Sahir/meraki/studio/`
(there's also a link in the top of the Growth hub).

## What it does

1. **Photo & theme.** The editor drops in the customer photo and picks a theme — Assamese,
   Bengali, Punjabi, Tamil, Malayali, Telugu, Marathi, Gujarati, Rajasthani, Odia, Manipuri,
   Kashmiri, or *Other* to type the attire by hand. Each theme carries a written description of
   what the bride and groom wear, so every editor sends the same brief.
2. **Prompt.** The page builds the attire prompt from the theme, the order notes and the house
   guidelines. The editor can edit it, or press **Let ChatGPT read the photo and rewrite this** —
   that sends the photo to a vision model, which writes a prompt tailored to the actual pose and
   positions.
3. **Attire render.** ChatGPT (`gpt-image-1`) redraws the couple in that attire on a
   transparent background. The editor checks the faces, downloads the PNG, or re-renders.
4. **Vector artwork.** That render goes to Gemini with *"High quality detailed vector
   illustration of this image. No backdrop needed…"*. Download the finished PNG and move on to
   the next customer.

The house guidelines — keep the faces recognisable, both people full-length, no background, no
text or watermark — are added to every prompt automatically, and are editable in one place at
step 2 so a change to the guidelines applies to every editor's work from then on.

## Two ways to run it

The mode switch at the top right decides where the two renders happen.

**Manual — ChatGPT &amp; Gemini apps.** One button copies the prompt and opens the app in a window
docked to the right half of the screen; the editor pastes, attaches, downloads, and drops the
result back into the next step, where the page is already nudging the right drop zone. Works with
ordinary ChatGPT and Gemini subscriptions, costs nothing per image, and needs no keys or signup.

The two apps cannot be embedded *inside* the page — ChatGPT and Gemini both send
`X-Frame-Options` / CSP `frame-ancestors` headers that forbid being put in an iframe, so a
docked window is as close as a browser allows. If the pop-up is blocked, each step also has a
plain "open in a tab" link.

**Automatic — API keys.** The page calls both APIs itself: upload, pick a theme, press two
buttons. Needs developer API keys (which are *not* included in a ChatGPT Plus or Gemini Advanced
subscription — they are separate products, billed per image).

Either way the prompts, the guidelines, the themes and the file naming are identical, so the work
is consistent whichever mode an editor uses. Start in manual mode; switch to automatic later if
the volume justifies the setup.

## Setting up automatic mode (each editor, once)

Switch the mode to **Automatic**, open **Keys & models**, and paste two keys:

| Key | Where it comes from |
|---|---|
| OpenAI | platform.openai.com → API keys |
| Gemini | aistudio.google.com → Get API key |

The keys are saved in that browser's localStorage and are sent straight to OpenAI and Google
from the page. **They are never uploaded to the Meraki site and never committed to this repo.**
Two things follow from that:

- Each editor pastes their own key on their own machine. Don't set this up on a shared or public
  computer — anyone using that browser profile can read the key out of localStorage.
- Usage is billed to whoever's key is in the browser. If you'd rather have one shared key and
  per-editor access, that needs a small server (or a Cloudflare Worker) holding the key, and the
  **Advanced → API endpoints** fields at the bottom of the settings panel point the page at it —
  it calls the same paths, so a plain pass-through proxy works.

Then press **Test both keys**. It lists the OpenAI models the key can see and reads the Gemini
model's details — no renders, so it costs nothing — and says exactly what is wrong: a bad key, a
model name that key can't see, or an OpenAI org that still needs verifying. Do this before the
first real order rather than finding out mid-render.

Also in settings: which models to use, render size (portrait / square / landscape), quality, and
transparent vs. white background. The model names are plain text fields on purpose — when OpenAI
or Google renames a model, change it here instead of editing the HTML.

## Things that will trip you up

- **`gpt-image-1` needs a verified OpenAI organisation.** Until that's done, step 3 returns a 400
  and the page shows the message. Verification is on the OpenAI platform settings page.
- **Faces.** "Keep faces close to the photo" (`input_fidelity: high`) is on by default because
  likeness matters more than anything else here. If OpenAI ever rejects that parameter, turn the
  checkbox off. Even so, neither model copies a face exactly — always eyeball the attire render
  before sending it to Gemini.
- **iPhone photos.** HEIC files won't decode in Chrome. Export as JPEG first; the page says so
  when it happens.
- **"Vector".** Gemini returns a high-resolution PNG drawn in a vector *style*, not an SVG with
  real curves. For print jobs that need true curves, trace the PNG in Illustrator or CorelDRAW.
- **Customer photos leave the building.** The photo is sent to OpenAI and Google to make the
  artwork. Make sure the customer is fine with that before uploading.

Nothing is stored on a server: the photo, both renders and the keys all stay in the editor's
browser, and the run log at the bottom of the page is cleared when the tab closes.
