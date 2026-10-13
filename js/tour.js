/* Guided demo: a 7-step walkthrough with a spotlight and captions.
   Start with the header button or by pressing D. Next / Back / Esc. */
(function () {
  'use strict';
  const U = (window.UPKEEP = window.UPKEEP || {});
  const A = () => U.app;

  let idx = -1, active = false, runId = 0, els = null, target = null;
  const ctx = { serial: null };

  async function waitFor(sel, ms) {
    const end = Date.now() + (ms || 8000);
    while (Date.now() < end) {
      const all = document.querySelectorAll(sel);
      if (all.length) return all[all.length - 1];
      await A().sleep(80);
    }
    return null;
  }
  async function goAndWait(hash) {
    if (location.hash !== hash) {
      const done = new Promise((r) => document.addEventListener('upkeep:rendered', r, { once: true }));
      location.hash = hash;
      await done;
    }
  }

  const STEPS = [
    {
      title: 'The problem and the promise',
      text: 'Purifier owners rarely know which part fits, and buying one usually means booking a visit first. UPKEEP sells model-matched parts made by Sarjan. Fits right, or we make it right.',
      route: '#/',
      target: '[data-tour="hero"]'
    },
    {
      title: 'Snap the purifier',
      text: 'UPKEEP Assist reads the model label from a photo: AquaNova Neo 10 Plus, code AQN-N10P. If a model isn\'t mapped, it hands off to a human expert instead of guessing.',
      route: '#/assist',
      target: '[data-tour="detect"]',
      async prepare() {
        U.assist.speed = 0.6;
        await U.assist.idle(); // the fresh chat greets first
        await U.assist.samplePhoto('AQN-N10P');
      }
    },
    {
      title: '"Water is slow" → the exact-fit kit',
      text: 'Assist maps the symptom to the likely stage and shows only the kit that fits this model (the wide-housing variant), with its price upfront.',
      route: '#/assist',
      target: '[data-tour="rec"]',
      async prepare() { await U.assist.symptom('slow'); }
    },
    {
      title: '~15 minute delivery, or add a pro',
      text: 'Buy it for delivery in ~15 minutes through a quick-commerce partner, or add a Sarjan-trained technician for ₹349. Here we booked tomorrow morning and the nearest partner was assigned.',
      route: '#/assist',
      target: '[data-tour="tech"]',
      async prepare() { await U.assist.book(true); }
    },
    {
      title: 'Checkout → order with a QR code',
      text: 'One demo checkout later, the order is confirmed. Every box carries a QR code with its own serial number.',
      route: '#/order',
      rerender: true,
      target: '[data-tour="order-qr"]',
      async prepare() {
        const st = A().state;
        if (!st.cart.length) A().addToCart('KIT3-AQN-N10P', { pro: true, silent: true });
        const o = A().placeOrder();
        const line = o && o.lines.find((l) => l.serials.length);
        ctx.serial = line ? line.serials[0] : null;
      }
    },
    {
      title: 'Scan the QR to verify',
      text: 'Scanning the box shows it is a genuine, wet-tested UPKEEP part: serial, batch, test result, plant and warranty.',
      route: () => '#/verify/' + (ctx.serial || ((A().latestOrder() || { lines: [{ serials: [] }] }).lines.find((l) => l.serials.length) || { serials: [''] }).serials[0]),
      target: '[data-tour="verify"]'
    },
    {
      title: 'A reminder before the next change',
      text: 'Six months later, a WhatsApp nudge with the exact kit one tap away. Reply STOP to opt out. That\'s the loop: snap, fit, verify, remind.',
      route: '#/reminders',
      target: '[data-tour="phone"]'
    }
  ];

  function build() {
    const shield = document.createElement('div');
    shield.className = 'tour-shield';
    const spot = document.createElement('div');
    spot.className = 'tour-spot';
    spot.setAttribute('aria-hidden', 'true');
    const card = document.createElement('div');
    card.className = 'tour-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'tour-title');
    document.body.appendChild(shield);
    document.body.appendChild(spot);
    document.body.appendChild(card);
    card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tour-btn]');
      if (!b) return;
      e.preventDefault();
      e.stopPropagation();
      const k = b.dataset.tourBtn;
      if (k === 'next') next();
      else if (k === 'back') back();
      else stop();
    });
    shield.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
    return { shield, spot, card };
  }

  function cardHtml(busy) {
    const s = STEPS[idx], last = idx === STEPS.length - 1;
    return `<div class="t-step">Step ${idx + 1} of ${STEPS.length}</div>
      <div class="tour-progress" aria-hidden="true"><span style="width:${((idx + 1) / STEPS.length) * 100}%"></span></div>
      <h2 id="tour-title">${s.title}</h2>
      <p>${s.text}</p>
      <div class="tour-nav">
        <button class="btn btn-ghost btn-sm" type="button" data-tour-btn="exit">Exit <span class="sr-only">guided demo</span>(Esc)</button>
        <span class="spacer"></span>
        ${busy ? '<span class="tour-busy"><span class="spinner" aria-hidden="true"></span>Setting up…</span>' : ''}
        <button class="btn btn-secondary btn-sm" type="button" data-tour-btn="back" ${idx === 0 || busy ? 'disabled' : ''}>Back</button>
        <button class="btn btn-cta btn-sm" type="button" data-tour-btn="next" ${busy ? 'disabled' : ''}>${last ? 'Finish' : 'Next'}</button>
      </div>`;
  }

  function place() {
    if (!active || !els) return;
    const pad = 8;
    if (target && document.contains(target)) {
      const r = target.getBoundingClientRect();
      const top = Math.max(4, r.top - pad), left = Math.max(4, r.left - pad);
      const w = Math.min(window.innerWidth - left - 4, r.width + pad * 2);
      const h = Math.min(window.innerHeight - top - 4, r.height + pad * 2);
      Object.assign(els.spot.style, { top: top + 'px', left: left + 'px', width: w + 'px', height: h + 'px', opacity: 1 });
      const cw = els.card.offsetWidth, ch = els.card.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
      let ct, cl;
      if (vw <= 640) { ct = vh - ch - 16; cl = 16; }
      else if (r.right + 24 + cw < vw) { cl = r.right + 24; ct = Math.min(Math.max(16, r.top), vh - ch - 16); }
      else if (r.left - 24 - cw > 0) { cl = r.left - 24 - cw; ct = Math.min(Math.max(16, r.top), vh - ch - 16); }
      else if (top + h + 16 + ch < vh) { ct = top + h + 16; cl = Math.min(Math.max(16, r.left), vw - cw - 16); }
      else { ct = vh - ch - 16; cl = vw - cw - 16; }
      Object.assign(els.card.style, { top: ct + 'px', left: cl + 'px' });
    } else {
      Object.assign(els.spot.style, { top: '50%', left: '50%', width: '0px', height: '0px' });
      Object.assign(els.card.style, { top: (window.innerHeight - els.card.offsetHeight) / 2 + 'px', left: (window.innerWidth - els.card.offsetWidth) / 2 + 'px' });
    }
  }

  async function show(i, runPrepare) {
    idx = i;
    const my = ++runId;
    const s = STEPS[i];
    target = null;
    els.card.innerHTML = cardHtml(true);
    place();
    const hash = typeof s.route === 'function' ? s.route() : s.route;
    await goAndWait(hash);
    if (my !== runId) return;
    if (runPrepare && s.prepare && !s.done) {
      try { await s.prepare(); } catch (e) { /* keep the tour going */ }
      s.done = true;
      if (my !== runId) return;
      if (typeof s.route === 'string' && location.hash !== s.route) await goAndWait(s.route);
      else if (s.rerender) A().refresh();
    }
    target = await waitFor(s.target, 6000);
    if (my !== runId) return;
    if (target) {
      target.scrollIntoView({ block: 'center', behavior: 'auto' });
      await A().sleep(120);
    }
    if (my !== runId) return;
    els.card.innerHTML = cardHtml(false);
    place();
    const nb = els.card.querySelector('[data-tour-btn="next"]');
    if (nb) nb.focus({ preventScroll: true });
  }

  function next() {
    if (idx >= STEPS.length - 1) { stop(); A().go('#/'); return; }
    show(idx + 1, true);
  }
  function back() { if (idx > 0) show(idx - 1, false); }

  function onKey(e) {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(); }
    else if (e.key === 'ArrowRight') { const b = els.card.querySelector('[data-tour-btn="next"]'); if (b && !b.disabled) { e.preventDefault(); next(); } }
    else if (e.key === 'ArrowLeft') { const b = els.card.querySelector('[data-tour-btn="back"]'); if (b && !b.disabled) { e.preventDefault(); back(); } }
    else if (e.key === 'Tab') {
      // keep focus inside the tour card
      const f = Array.prototype.slice.call(els.card.querySelectorAll('button:not([disabled])'));
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }
  const onMove = () => place();

  function start() {
    if (active) return;
    active = true;
    A().closeModal();
    // Start from a clean slate so every run tells the same story.
    A().resetState();
    U.assist.reset();
    STEPS.forEach((s) => { s.done = false; });
    ctx.serial = null;
    els = build();
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    document.body.dataset.tour = 'on';
    show(0, true);
  }
  function stop() {
    if (!active) return;
    active = false;
    runId++;
    U.assist.speed = 1;
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', onMove);
    window.removeEventListener('scroll', onMove, true);
    if (els) { els.shield.remove(); els.spot.remove(); els.card.remove(); }
    els = null;
    delete document.body.dataset.tour;
    const b = document.querySelector('[data-action="tour-start"]');
    if (b) b.focus({ preventScroll: true });
  }

  U.tour = { start, stop, active: () => active, step: () => idx, steps: STEPS.length };
})();
