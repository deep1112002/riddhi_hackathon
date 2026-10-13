# Build the UPKEEP demo website (static, no backend)

> **How to use this file:** it lives in the repo at `docs/BUILD_BRIEF.md`. Start a Claude Code cloud session on this repo and say: *"Read docs/BUILD_BRIEF.md and build the site it describes. Follow the Repository & workflow section."*

## Context

I'm presenting a college hackathon business proposal to Mr. Sarjan Trivedi (Director, Sarjan Watertech India Pvt. Ltd., an Ahmedabad water-purifier manufacturer) and a judging panel. The proposal is **UPKEEP**: a new consumer brand that sells water-purifier replacement parts made and wet-tested by Sarjan. Customers can find the exact part for their purifier through an AI chatbot called **UPKEEP Assist**. They can buy it with fast delivery and add a vetted technician only if they want one.

I need a **static demo website** that I can click through live on stage in 3–4 minutes. It must look like a real, polished product and work with **no backend, no API keys and no internet dependency** during the demo. Everything "smart" (AI, photo recognition, payments, bookings) is **simulated** with scripted, deterministic logic.

## Tech constraints

- Plain **HTML + CSS + vanilla JavaScript**. No framework, no build step, no runtime npm dependencies (dev-only test tooling is fine; see the workflow section).
- Must work by **double-clicking `index.html`** (file://) AND on **GitHub Pages**. Therefore:
  - Use **classic `<script defer>` tags, not ES modules**. Browsers block `type="module"` over file://. Share code through one global namespace, e.g. `window.UPKEEP = { data, state, … }`.
  - Do **not** `fetch()` local files. Put all data in `js/data.js`, assigned to the namespace.
  - Use **relative paths only** (`assets/logo_light.png`, never `/assets/...`). GitHub Pages serves the site from `https://<user>.github.io/<repo>/`, so root-absolute paths break.
- Single-page app with **hash routing** (`#/`, `#/assist`, `#/find`, `#/product/:sku`, `#/cart`, `#/book`, `#/order`, `#/verify/:serial`, `#/reminders`, `#/pro`, `#/about`).
- Fully **responsive**: it should look great at 1440px (projector) and 375px (phone). Test both.
- No console errors. Persist the cart and demo state in `localStorage` (wrapped in try/catch), plus a visible **"Reset demo"** button.
- Fonts: Google Fonts **Inter** (body) and **Manrope** or **Plus Jakarta Sans** (headings), with system-font fallback if offline.
- Accessible: semantic HTML, alt text, visible focus states, contrast ≥ 4.5:1, works with the keyboard.

## Assets (already committed in `assets/`; don't rename or recompress them)

- `logo_light.png` (for light backgrounds), `logo_dark.png` (for dark backgrounds). The mark is a water drop with a tick inside.
- `hero.png`: illustration of three purifier cartridges with water drops and a green tick (transparent background).
- `ad1_diwali.png` … `ad5_reminder.png`: five campaign creatives, used on the About page gallery.
- Draw any other illustrations (purifier units, cartridges, phone frames, QR codes) as **inline SVG**. Don't use stock photos.

## Brand

- Name: **UPKEEP**. Tagline: **"Fits right. Flows right."** Brand promise: **"Fits right, or we make it right."**
- Personality: a calm, expert neighbour. Clear, practical and reassuring. **Never fear-based**: no "other filters are dangerous" or health-scare claims.
- Colours (CSS variables):
  - navy `#0B2545` (trust, dark sections)
  - teal `#0E7C7B` (primary brand)
  - aqua `#5BC0BE` (water accents)
  - mist `#E8F4F4` (soft backgrounds)
  - coral `#F28C38` (calls to action only)
  - text `#102A43`, muted `#627D98`, success green `#2E8B57`
- Style: clean, premium, lots of white space, rounded cards (12–16px radius), subtle shadows, small icons in teal circles. Avoid generic template look: no purple gradients, no emoji as icons.
- A thin banner at the top of every page: **"Hackathon demo · fictional products and prices · no real orders"**.

## Demo data (`data.js`)

Use **fictional purifier brands and models**, so the demo never implies compatibility with real brands:

| Brand | Models | Type | Notes |
|---|---|---|---|
| AquaNova | Neo 8, Neo 10 Plus | RO+UV | Neo 10 Plus has a 7 cm "wide" sediment housing |
| HydraPure | Classic RO, Smart RO+UF | RO / RO+UF | |
| ClearSip | Mini 6 | RO | |
| PuraHome | Elite RO+UV+UF | RO+UV+UF | |

Each model has a stage list (sediment, pre-carbon, RO membrane, post-carbon, UF where relevant), a **model-label code** (e.g. `AQN-N10P`), an SVG front illustration and recommended intervals (sediment 6 months, carbon 12 months, membrane 24 months).

**Products** (customer prices including GST), each with an SVG product image, a "Fits:" list of model codes and a "Made & wet-tested by Sarjan Watertech" line:

| SKU family | Price |
|---|---|
| Sediment pre-filter (add-on only; can't be bought alone — show "add to any kit") | ₹294 |
| 3-stage filter kit (sediment + pre-carbon + post-carbon) | ₹999 |
| RO membrane 80 GPD | ₹1,649 |
| Complete annual kit (membrane + all filters) | ₹2,479 |

Create model-specific variants (e.g. "Filter kit — AquaNova Neo 10 Plus (wide housing)") so the fit logic is visible.

**Services:**

| Service | Price |
|---|---|
| Installation by a vetted partner technician ("Part + Pro") | ₹349 |
| Diagnosis visit | ₹349 |
| Annual care plan (2 visits + 1 filter kit) | ₹2,359 |

**Technicians:** 4 fictional UPKEEP partner technicians in Ahmedabad areas (Satellite, Bopal, Maninagar, Chandkheda). Each has a name, rating 4.6–4.9, jobs completed and a "Sarjan-trained" badge.

**Delivery options shown at checkout:**
- UPKEEP next-day (Ahmedabad, free above ₹999)
- "Delivered in ~15 min via quick-commerce partner": show **Blinkit, Zepto, Instamart** as text-styled partner buttons. They open a demo modal saying "In the live product this opens the partner app with the exact SKU". Do NOT use their real logos.
- Amazon / Flipkart: "Compare on marketplaces" link buttons, same demo modal.

## Pages and features

### 1. Home (`#/`)

- Hero: logo, headline "Snap your purifier. Get the part that fits.", subline about model-matched parts made by the manufacturer, primary CTA **"Chat with UPKEEP Assist"** (coral), secondary CTA "Find my part manually". Use `hero.png`.
- "How it works" in 4 steps with icons: Describe or snap → AI matches exact part → Fast delivery or add a pro → Reminders before the next change.
- Value cards: Exact fit or free return · Made & wet-tested by the manufacturer · Part-only, or add a pro for ₹349 · Delivery in minutes or next-day.
- Comparison strip "Why UPKEEP": columns for UPKEEP vs "Book a visit first" vs "Generic 'universal' kits". Rows: part-only purchase, fit assurance, price shown upfront, optional install. Keep the competitor columns generic; don't name real companies on the site.
- Footer: tagline, "A proposal by [team name] for Sarjan Watertech · Hackathon 2026", links to all pages.

### 2. UPKEEP Assist chatbot (`#/assist`): the star of the demo

A full-page chat UI (desktop: chat in the centre with a "Your purifier" side panel that fills in as the bot learns; mobile: chat only). It is also reachable from a floating chat button on every page.

- Greeting with quick-reply chips: "Water is slow", "Tastes or smells odd", "Leaking", "Time for a filter change", "Upload a photo".
- **Photo flow (simulated vision AI):**
  - The user can upload any image file, or pick one of 4 built-in "sample photos" (SVG purifier fronts / model stickers).
  - Show the image in the chat, then a 2–3 second "Reading the model label…" scanning animation (a moving scan line over the image).
  - Sample photos map deterministically to their model. An arbitrary uploaded image maps to AquaNova Neo 10 Plus with "92% confident".
  - Show a "Detected: AquaNova Neo 10 Plus · RO+UV · code AQN-N10P" card and fill the side panel.
- **Text flow:** keyword matching for model names/codes (case-insensitive, partial) and symptoms. Map symptoms to the likely failed stage:
  - slow flow → sediment/carbon clogged
  - bad taste/odour → carbon
  - high TDS/salty → membrane
  - leaking → housing/fittings → suggest diagnosis visit
  - not working/no power → suggest diagnosis visit
- **Diagnosis + recommendation card:** likely cause, the exact-fit product (variant for that model) with a green **"Exact fit"** badge, price, "Last changed?" quick chips that adjust the advice, and buttons: "Add to cart", "Buy · delivered in ~15 min", "Book a technician (₹349)", "Compare on marketplaces".
- **Confidence check (key honesty moment):**
  - If the user types an unknown model (e.g. "Zeta 5"), the bot replies: "That model isn't mapped yet, so I won't guess."
  - Show a simulated hand-off: "Connecting you to an UPKEEP expert on WhatsApp…", then an expert message (badge "Human expert") asking for a photo of the label.
- **Booking inside chat:** pick a date (next 3 days) and a slot (Morning / Afternoon / Evening). Assign the nearest partner technician card. Show a fallback line: "If no UPKEEP partner is free, we can request an overflow booking with a partner service network (demo)".
- **Reminder opt-in** at the end: "Want a WhatsApp reminder before your next change?" Yes saves to the Reminders page.
- Typing indicator, timestamps, message animations, auto-scroll, and a "Start over" button. Keep the bot copy short, friendly and specific.
- Architect the bot as a small state machine in `assist.js`, with a clear comment that a real LLM + vision model would replace `matchModel()` / `diagnose()`.

### 3. Find your part manually (`#/find`)

Brand → Model → "What needs changing?" selectors, with an SVG diagram of the purifier's stages that highlights the selected stage. Results show only exact-fit products. Include a "Not sure? Ask UPKEEP Assist" link.

### 4. Product page (`#/product/:sku`)

Gallery (SVG), price, "Exact fit for: …" list, a fit-guarantee box, a "Part only / Part + Pro (+₹349)" toggle, delivery options, a "What's in the box" list, an install video placeholder (SVG play card), and a "How we verify" section explaining the QR code on every box.

### 5. Cart and checkout (`#/cart`)

Line items, the Part + Pro toggle per item, delivery choice (as above), a fake address prefilled "Satellite, Ahmedabad 380015", and payment method radio buttons (UPI / card / COD; no real payment). "Place demo order" goes to the confirmation page.

### 6. Order confirmation (`#/order`)

Order number, timeline (Packed → Out for delivery → Delivered → Technician visit if booked), the booked technician card, and a **generated QR code** (draw it with a small inline QR library in plain JS, or a deterministic SVG pattern) that links to `#/verify/<serial>`. Add an "Add reminder" button.

### 7. Verify a part (`#/verify/:serial`)

Simulates scanning the QR on the box: "Genuine UPKEEP part ✓", serial, batch number, wet-test date and result, manufacturing plant "Changodar, Ahmedabad", fit list, an install video card, and a warranty status of "12 months from delivery". An unknown serial shows "We couldn't verify this serial. Contact us."

### 8. Reminders (`#/reminders`)

A WhatsApp-style phone mock-up showing the scheduled reminder message: "Hi Riya, your filter kit went in 6 months ago. Time for a fresh pre-filter? [Reorder kit · ₹999] [Book a visit] [Remind me later]". Show a list of upcoming changes per stage with dates computed from today, plus an opt-out note ("Reply STOP to opt out").

### 9. For technicians (`#/pro`)

A short page for partner technicians: trade price 25% below list, loyalty points per order, a "Join the network" form (front-end only, success toast), and a sample trade price table.

### 10. About the proposal (`#/about`)

For the judges, compact:
- The problem in 3 bullets.
- The 5 ad creatives as a gallery.
- Key pilot numbers as stat tiles: ₹13.1 lakh pilot, break-even ~477 orders/month, base-case profitable from month 4, Ahmedabad first. Label them "illustrative projections".
- A note that UPKEEP sells only Sarjan's own designs, never OEM clients' parts.

## Guided demo mode (important for the live pitch)

Add a **"Start guided demo"** button (top-right, and press `D`) that runs a 7-step on-screen walkthrough with a highlighted spotlight and a short caption per step. Next/Back/Esc controls; each step navigates and pre-fills as needed:

1. Home: the problem and the promise.
2. Assist: upload the sample photo → detection.
3. Diagnosis "Water is slow" → exact-fit filter kit.
4. Choose "Delivered in ~15 min" or add a pro → technician slot.
5. Checkout → order with QR.
6. Verify page (scan the QR).
7. Reminder on WhatsApp → back to Home.

Also add a hidden **presenter shortcut**: `?demo=1` in the URL auto-loads the cart and sample state so I can jump to any page instantly.

## File structure (site at the repository root, so GitHub Pages can serve it directly)

```
<repo root>/
  index.html
  .nojekyll        (empty file; tells GitHub Pages to serve files as-is)
  docs/BUILD_BRIEF.md   (this file, already present)
  css/styles.css
  js/app.js        (router, state, cart, toasts, modal)
  js/data.js       (brands, models, products, technicians)
  js/assist.js     (chatbot state machine)
  js/tour.js       (guided demo)
  js/qr.js         (QR / verify helpers)
  js/svg.js        (inline SVG illustrations)
  assets/          (provided images)
  tests/smoke.spec.js   (Playwright smoke test, dev-only)
  package.json     (dev-only: Playwright; the site itself must not need it)
  README.md        (how to run, live-demo script, GitHub Pages deploy steps, the live URL pattern)
```

## Quality bar and acceptance checklist

- [ ] Opens from `index.html` with no server and from a static host; no console errors.
- [ ] All 11 routes work; browser back/forward works; the Reset demo button clears state.
- [ ] Chatbot handles: the photo flow, all 5 symptom chips, a known model typed as text, an unknown model (human hand-off), booking, and reminder opt-in.
- [ ] Every product shown by the bot or the finder is an exact fit for the selected model; the sediment add-on can't be bought alone.
- [ ] Prices match the tables above everywhere (product page, cart, chat, reminders).
- [ ] QR on the order page opens the matching verify page.
- [ ] Guided demo runs start to finish in under 3 minutes and can be exited at any step.
- [ ] Looks polished at 1440px and 375px; tap targets ≥ 44px; keyboard accessible.
- [ ] The "Hackathon demo · fictional products" banner is visible on every page; there are no real third-party logos, and no health-scare claims.

## Repository & workflow (Claude Code cloud session connected to GitHub)

You're running in a cloud session that cloned this GitHub repo. Work like this:

1. **Branch:** create `feature/upkeep-demo` from the default branch. Don't commit directly to `main`.
2. **Plan first:** post a short build plan (files, order of work) and then proceed without waiting. I may not be watching live.
3. **Commit in logical steps** with clear messages, for example:
   - "Scaffold layout, router and brand styles"
   - "Add parts data and product pages"
   - "Add UPKEEP Assist chatbot"
   - "Add checkout, order QR and verify page"
   - "Add reminders, technician and about pages"
   - "Add guided demo"
   - "Add smoke tests and README"
4. **Test before the PR:**
   - Serve the site locally in the VM: `python3 -m http.server 8080`.
   - Install Playwright as a dev dependency and its Chromium (`npm i -D @playwright/test && npx playwright install --with-deps chromium`). Write `tests/smoke.spec.js` that:
     - visits every route, fails on any console error or failed request, and checks key elements;
     - runs the chatbot photo flow with a sample photo;
     - adds to cart and places an order;
     - follows the QR link to the verify page;
     - runs the guided demo to the end;
     - takes screenshots at 1440×900 and 375×812.
   - Run the tests and **look at the screenshots** to fix layout problems. If the browser download is blocked by the network allowlist, say so and fall back to a Node-based check (e.g. jsdom for console errors and routes) rather than skipping testing silently.
   - Also confirm `index.html` contains no `type="module"` and no root-absolute `/assets` paths (grep for them).
5. **Don't commit** `node_modules/`, Playwright reports or screenshots. Add a `.gitignore`.
6. **Push the branch and open a pull request** into `main`. The PR description should include:
   - a summary;
   - a checklist mirroring the acceptance list above, ticked;
   - how to run it locally;
   - the GitHub Pages steps below;
   - anything you couldn't verify.
7. **GitHub Pages:** don't add a deploy workflow. After I merge, I'll enable Pages with *Settings → Pages → Build and deployment → Deploy from a branch → `main` / (root)*. Make sure that works out of the box: `index.html` at the root, `.nojekyll` present, relative paths. Put the expected URL pattern `https://<user>.github.io/<repo>/` in the README.

Finish with a short summary in the session: what you built, test results, the PR link, and anything I should check by hand before the live demo.
