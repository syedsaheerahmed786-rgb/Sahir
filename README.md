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
