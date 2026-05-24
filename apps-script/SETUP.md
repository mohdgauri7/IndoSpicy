# IndoSpicy — Order Tracking Setup (Google Sheets + Apps Script)

This guide wires the **Bulk Order → Place Order** button on the site to a
Google Sheet using **Google Apps Script** as a free serverless REST API.
No backend server, no paid services. Works on GitHub Pages.

---

## 0. What gets built

```
Browser (GitHub Pages)
    │  fetch POST  (JSON body as text/plain → no CORS preflight)
    ▼
Google Apps Script Web App   ← apps-script/Code.gs
    │  appendRow()
    ▼
Google Sheet "Orders"        ← your spreadsheet
```

---

## 1. Final folder structure

```
IndoSpicy/
├── index.html
├── menu.html
├── about.html
├── book-a-table.html
├── bulk-order.html           ← updated (order-id + WhatsApp link)
├── css/
│   └── style.css             ← updated (loading + popup styles)
├── js/
│   ├── main.js
│   ├── dishes.js
│   ├── menu.js
│   ├── booktable.js
│   └── bulkorder.js          ← updated (fetch + loading + error UI)
├── images/  videos/
└── apps-script/              ← NEW (not deployed to GitHub Pages, just for reference)
    ├── Code.gs               ← paste this into script.google.com
    └── SETUP.md              ← this file
```

The `apps-script/` folder lives in the repo for version control only.
GitHub Pages just serves static files; it ignores `.gs` files.

---

## 2. Step-by-step deployment

### Step A — Create the Google Sheet

1. Go to https://sheets.google.com → **Blank spreadsheet**.
2. Rename it to **"IndoSpicy Orders"**.
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/  1AbCdEf...XYZ  /edit
                                            └─── this ────┘
   ```
4. Leave the tab named `Sheet1` — the script will auto-create an `Orders` tab
   with a header row on the first submission.

### Step B — Create the Apps Script project

1. Go to https://script.google.com → **New project**.
2. Delete the default `function myFunction() { ... }` placeholder.
3. Open [`apps-script/Code.gs`](Code.gs) in this repo and **copy its entire contents**
   into the Apps Script editor.
4. At the top of the file, replace the placeholder:
   ```javascript
   const SPREADSHEET_ID = 'PASTE_YOUR_GOOGLE_SHEET_ID_HERE';
   ```
   with your real ID from Step A.
5. Click the **Save** disk icon (or `Ctrl/Cmd + S`). Name the project
   "IndoSpicy Orders API".

### Step C — Deploy as a Web App

1. Top-right → **Deploy → New deployment**.
2. Click the **gear ⚙️** next to "Select type" → choose **Web app**.
3. Fill in:
   - **Description:** `IndoSpicy orders v1`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone`  ← required, otherwise the public site can't POST
4. Click **Deploy**.
5. Google will ask for permissions → **Authorize access** → pick your account
   → "Advanced" → "Go to IndoSpicy Orders API (unsafe)" → **Allow**.
   (It says "unsafe" because it's your own unverified script — this is normal.)
6. Copy the **Web app URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycbz...long-id.../exec
   ```

> **Updating the script later?** Open **Deploy → Manage deployments**,
> click the ✏️ pencil, choose **New version** under "Version", and click Deploy.
> The URL stays the same. If you create a *new* deployment instead, you get a
> new URL and have to update the frontend again.

### Step D — Wire it into the frontend

Open [`js/bulkorder.js`](../js/bulkorder.js) and replace the placeholder at the top:

```javascript
const APPS_SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
```

with the URL you copied in Step C.

### Step E — Test locally

```bash
# from the project root
python3 -m http.server 8000
```

Open http://localhost:8000/bulk-order.html → add items → fill the form →
**Place Order**. You should see:

1. Button shows `PLACING ORDER…` with a spinner.
2. Success popup with the order ID (e.g. `IS-20260524-143055-872`).
3. A new row in your Google Sheet (headers auto-created on first submit).

If something fails, open browser DevTools → Console / Network tab to see the
error message.

### Step F — Deploy to GitHub Pages

If GitHub Pages is already on:

```bash
git add .
git commit -m "Add bulk-order integration with Google Sheets via Apps Script"
git push
```

If GitHub Pages isn't on yet:

1. Repo → **Settings → Pages**.
2. **Source:** `Deploy from a branch`.
3. **Branch:** `main` / `/ (root)` → **Save**.
4. Wait ~1 minute. Site goes live at:
   `https://mohdgauri7.github.io/IndoSpicy/`

Test the live URL the same way as Step E.

---

## 3. How the integration works (under the hood)

- **CORS gotcha:** Apps Script doesn't respond to the `OPTIONS` preflight
  request that browsers normally fire before a JSON POST. We side-step it
  by sending the body as `text/plain` — that makes the request a CORS
  "simple request" with no preflight. The body is still a JSON string,
  and Apps Script parses it from `e.postData.contents`.
- **Validation lives in two places:**
  - **Client** (`bulkorder.js`): native HTML5 form validity + at-least-one-dish check.
  - **Server** (`Code.gs → validate()`): re-checks customer fields, delivery
    date/time, and non-empty `items` array. Never trust the client alone.
- **Order ID** is generated server-side: `IS-YYYYMMDD-HHMMSS-NNN`.
  Random suffix protects against collisions if two orders land in the same second.
- **Loading state** is driven by `placeBtn.classList.toggle('is-loading', …)` —
  see `.book-btn.is-loading` in `css/style.css`.

---

## 4. Optional add-ons

### 4a. WhatsApp quick-message link

Already wired. Set the restaurant's WhatsApp number in `js/bulkorder.js`:

```javascript
const WHATSAPP_NUMBER = '919876543210';  // country code + number, NO '+' or spaces
```

After a successful order, the success popup will show a green
**"Notify Us on WhatsApp"** button. Clicking it opens WhatsApp with a
pre-filled message containing the order ID, customer name, items, total,
and delivery time. Leave the constant as `''` to hide the button.

### 4b. EmailJS confirmation email

Free tier: 200 emails/month, no backend.

1. Sign up at https://www.emailjs.com → create a **Service** (e.g. Gmail)
   and a **Template** with variables like `{{customer_name}}`, `{{order_id}}`,
   `{{items}}`, `{{total}}`, `{{to_email}}`.
2. Add the SDK before `js/bulkorder.js` in `bulk-order.html`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
   <script>emailjs.init({ publicKey: 'YOUR_PUBLIC_KEY' });</script>
   ```
3. In `js/bulkorder.js`, after the successful `submitOrder()` call, add:
   ```javascript
   await emailjs.send('SERVICE_ID', 'TEMPLATE_ID', {
     to_email: payload.customer.email,
     customer_name: payload.customer.name,
     order_id: result.orderId,
     items: payload.items.map(i => `${i.name} x${i.qty}`).join(', '),
     total: payload.estimatedTotal,
   });
   ```
   Wrap in `try/catch` so an email failure doesn't break the order flow
   (the order is already saved in Sheets at that point).

### 4c. Admin dashboard ideas

Pick whichever fits your comfort level:

- **Google Sheets itself** — already a free dashboard. Add filter views,
  conditional formatting (e.g. highlight today's deliveries), and pivot
  tables for totals per day/dish.
- **Google Looker Studio** (free) — connect the sheet as a data source,
  drag in charts for "orders per day", "revenue per category", etc.
  Shareable URL, auto-refreshes from Sheets.
- **Lightweight HTML admin page** — add `doGet()` to `Code.gs` that returns
  `sheet.getDataRange().getValues()` as JSON. Build `admin.html` in this
  repo that fetches it and renders a table. **Protect it** by requiring a
  secret token query param (`?key=...`) that `doGet` checks against a
  `PropertiesService.getScriptProperties()` value.
- **Google Sheets mobile app** — owner can review orders on the go,
  no extra build needed.

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Orders endpoint is not configured yet.` | `APPS_SCRIPT_URL` still has placeholder | Paste the real Web App URL into `js/bulkorder.js`. |
| `Server returned 401` / login page HTML | Web app deployed with "Only myself" access | Re-deploy with **Who has access: Anyone**. |
| `Failed to fetch` in console | URL typo, or you deployed a new version under a new URL | Use **Manage deployments** to verify the URL; redeploy as a new version (same URL) rather than new deployment. |
| Rows appear with wrong values / shifted | Header row got manually reordered in Sheets | Delete the header row; next submission will re-create it from `HEADERS` in `Code.gs`. |
| `Missing customer details` error | A required form field is empty | Form has `required` attributes — should be caught client-side; double-check no fields were edited in HTML. |
| Sheet shows nothing after successful popup | Wrong `SPREADSHEET_ID` in `Code.gs` | Re-check the ID and re-deploy (new version). |

---

## 6. Security notes

- The Apps Script URL is **public by design**. Anyone with it can POST. The
  validator in `Code.gs` blocks empty/malformed payloads but won't block a
  determined spammer. For low-volume restaurant orders this is usually fine.
- If you start getting spam: add a honeypot field (hidden input — bots fill
  it, humans don't), a hCaptcha invisible check, or rate-limit by IP using
  `PropertiesService` in Apps Script.
- The Spreadsheet ID in `Code.gs` is **not a secret** — the script runs as
  *you*, so the script alone has access. Knowing the ID does nothing without
  your Google account.
- Never put API keys for paid services (EmailJS private key, etc.) in the
  frontend. Use the public/anon key only.
