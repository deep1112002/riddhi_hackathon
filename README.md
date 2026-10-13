# UPKEEP: hackathon demo site

**Fits right. Flows right.** UPKEEP is a proposed consumer brand that sells water-purifier replacement parts made and wet-tested by Sarjan Watertech. This repo is a static, click-through demo for the pitch.

> Hackathon demo · fictional brands, products and prices · no real orders or payments.
> All the "smart" parts are scripted and deterministic: the AI chat, photo recognition, payments and bookings. There is no backend, no API keys, and no network calls besides Google Fonts. Without fonts the site falls back to system fonts.

The build brief is in [`docs/BUILD_BRIEF.md`](docs/BUILD_BRIEF.md).

## Run it

- **Double-click `index.html`.** It works over `file://` (classic `<script defer>` tags, no modules, no `fetch`).
- Or serve it locally and open http://localhost:8080:

  ```bash
  python3 -m http.server 8080
  ```

Presenter shortcuts:

| Shortcut | What it does |
|---|---|
| `D` key or **Start guided demo** | 7-step spotlight walkthrough. Use Next/Back, or `→`/`←`; `Esc` exits at any step |
| `index.html?demo=1#/order` | Loads a sample cart, booking, order (with QR) and reminder so you can jump to any page |
| **Reset demo** (header and footer) | Clears the cart, orders, bookings and reminders stored in `localStorage` |

## Live demo script (3–4 minutes)

1. **Home (`#/`).** The problem: people don't know which part fits, and buying one means booking a visit. The promise: *Fits right, or we make it right.*
2. **UPKEEP Assist (`#/assist`).** Tap **Upload a photo**, then pick the AquaNova sample. The scan animation runs and shows *Detected: AquaNova Neo 10 Plus · RO+UV · AQN-N10P*. The side panel fills in.
3. Tap **Water is slow**. The exact-fit wide-housing filter kit appears at ₹999. Tap **Over a year** to show the advice switch to the complete annual kit (₹2,479).
4. **Honesty moment.** Tap **Start over** and type `Zeta 5`. You get *"That model isn't mapped yet, so I won't guess"*, then a hand-off to a human expert on WhatsApp.
5. **Book a technician (₹349)** in the chat. Pick a day and slot, and the nearest Sarjan-trained partner is assigned. Opt in to the WhatsApp reminder.
6. **Cart (`#/cart`).** Pick a quick-commerce partner for ~15 min delivery (demo modal), choose the payment method, then **Place demo order**.
7. **Order (`#/order`).** Tracking timeline, technician card and a **real, scannable QR code**. Click it or scan it to open **Verify**: *Genuine UPKEEP part ✓*.
8. **Reminders (`#/reminders`).** WhatsApp mock-up: "Hi Riya, your filter kit went in 6 months ago…".

The **guided demo** runs steps 1–8 for you in under a minute of setup time.

> **Phone scan tip:** the QR encodes the page's own address plus `#/verify/<serial>`. Serials carry a check letter, so the verify page works on a phone with no saved state. That only works when the site is on a public URL, such as GitHub Pages. On `file://` or `localhost`, click the QR instead.

## Pages

`#/` home · `#/assist` chatbot · `#/find` part finder · `#/product/:sku` product · `#/cart` checkout · `#/book` technician booking · `#/order` confirmation + QR · `#/verify/:serial` verification · `#/reminders` WhatsApp reminders · `#/pro` technician programme · `#/about` proposal summary for judges

## Project structure

```
index.html        page shell, header, footer, script tags
.nojekyll         serve files as-is on GitHub Pages
css/styles.css    brand tokens and all styles (responsive 375 → 1440px)
js/data.js        fictional brands, models, products, prices, technicians
js/svg.js         inline SVG illustrations and icons
js/qr.js          QR encoder (byte mode, level M) + self-checking serials
js/app.js         router, state, cart, toasts, modal, page views
js/assist.js      UPKEEP Assist chatbot state machine
js/tour.js        guided demo
assets/           provided logo, hero and campaign images
tests/            Playwright smoke tests (dev-only)
```

Everything is shared through one global, `window.UPKEEP`. The chatbot is a small state machine. In the real product, an LLM and a vision model would replace `matchModel()` and `diagnose()` in `js/assist.js`.

## Tests (dev-only)

The site itself needs no npm packages. To run the smoke tests:

```bash
npm install
npx playwright install chromium   # skip if Chromium is already available
npx playwright test               # starts python3 -m http.server 8080 automatically
```

The tests run at 1440×900 and 375×812. They:

- visit every route and fail on any console error, failed request or horizontal overflow;
- load the site over `file://`;
- run the chatbot's photo flow, all five symptom chips, a typed model, the unknown-model hand-off, an uploaded photo, booking and the reminder opt-in;
- check that the sediment add-on can't be bought alone;
- place an order, **decode the QR with jsQR** and follow it to the verify page;
- run the guided demo to the end and exit it with `Esc`.

Screenshots are written to `screenshots/`, which is git-ignored.

## Deploy on GitHub Pages

There is no workflow to set up. After merging to `main`:

1. Open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Pick the branch **`main`** and the folder **`/ (root)`**, then click **Save**.
4. Wait about a minute. The site goes live at:

   `https://<user>.github.io/<repo>/`. For this repo that is **https://deep1112002.github.io/riddhi_hackathon/**

All paths are relative (`assets/…`, `css/…`, `js/…`), so the site works from the `/<repo>/` sub-path.

## Before the pitch

- Set the team name in `js/data.js` (`teamName`). It appears in the footer and on the About page.
- Pilot numbers on the About page are labelled *illustrative projections*.
