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

## Meraki Insiders Android app

`android/` holds an Android app that opens <https://themerakievent.in/meraki-insiders/> full screen. It includes the Meraki icon and splash screen, pull-to-refresh, a back button that steps back through pages, and an offline screen. Links to other sites, WhatsApp, phone numbers and email open in their own apps.

GitHub Actions (`.github/workflows/android.yml`) builds the app whenever `android/` changes. To build it on demand, go to **Actions → Android app → Run workflow**. The newest build is always at:

`https://github.com/syedsaheerahmed786-rgb/Sahir/releases/download/android-latest/meraki-insiders.apk`

Open that link on an Android phone and install the file. Android asks you to allow installs from your browser the first time. The `.aab` file next to it is for uploading to the Google Play Console.

**Signing.** With no key set, builds are signed with a throwaway debug key, so each new build has to be uninstalled before the next one installs. To publish on Play or ship updates, create a keystore once (`keytool -genkeypair -v -keystore meraki.jks -keyalg RSA -keysize 2048 -validity 10000 -alias meraki`). Then add these repository secrets: `ANDROID_KEYSTORE_BASE64` (output of `base64 -w0 meraki.jks`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. Keep the `.jks` file safe. Losing it means you can't update the app on Play.
