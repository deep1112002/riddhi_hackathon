/* UPKEEP demo — router, state, cart, toasts, modal and page views.
   Classic script (no modules) so the site runs from file:// and GitHub Pages. */
(function () {
  'use strict';
  const U = (window.UPKEEP = window.UPKEEP || {});
  const D = U.data, S = U.svg, ic = S.icon, esc = S.esc;

  // ======================================================================
  // State (persisted in localStorage; every access wrapped in try/catch)
  // ======================================================================
  const KEY = 'upkeep-demo-v1';
  const DEFAULT_ADDRESS = 'B-204, Shanti Residency, Satellite, Ahmedabad 380015';
  function defaults() {
    return {
      cart: [],                       // [{ sku, qty, pro }]
      delivery: { type: 'nextday', partner: null },
      payment: 'upi',
      address: DEFAULT_ADDRESS,
      booking: null,                  // { date, slot, techId, kind, model }
      orders: [],
      reminders: [],                  // [{ id, model, sku, since, created }]
      purifier: null,                 // model code learned by Assist / finder
      unit: 1                         // serial counter
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(defaults(), JSON.parse(raw));
    } catch (e) { /* storage blocked or corrupt: start fresh */ }
    return defaults();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    updateCartCount();
  }
  function resetState() {
    state = defaults();
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    save();
  }

  // ======================================================================
  // Helpers
  // ======================================================================
  const rupee = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtShort = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short' });
  const iso = (d) => new Date(d).toISOString();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function next3Days() {
    const t = today();
    return [1, 2, 3].map((n) => {
      const d = addDays(t, n);
      return { iso: iso(d), label: n === 1 ? 'Tomorrow' : fmtDay(d), date: fmtShort(d) };
    });
  }
  function techById(id) { return D.technicians.find((t) => t.id === id) || D.technicians[0]; }
  // Nearest partner technician for an address (demo: match the area name).
  function nearestTech(address) {
    const a = String(address || '').toLowerCase();
    return D.technicians.find((t) => a.indexOf(t.area.toLowerCase()) > -1) || D.technicians[0];
  }
  function slotById(id) { return D.slots.find((s) => s.id === id) || D.slots[0]; }
  function modelName(code) { const m = D.modelByCode(code); return m ? D.modelLabel(m) : code; }

  function techCard(t, extra) {
    return `<div class="tech-card">
      <div class="avatar" aria-hidden="true">${t.initials}</div>
      <div>
        <div style="font-weight:700;color:var(--navy)">${esc(t.name)} <span class="badge" style="margin-left:4px">${ic('award')} Sarjan-trained</span></div>
        <div class="small muted"><span class="stars">${ic('star')} ${t.rating.toFixed(1)}</span> · ${t.jobs} jobs · ${esc(t.area)}, Ahmedabad · ${esc(t.eta)}</div>
        ${extra || ''}
      </div>
    </div>`;
  }

  // ======================================================================
  // Cart
  // ======================================================================
  function isBase(p) { return p && p.kind === 'part' && !p.addOn; }
  function cartHasBase() { return state.cart.some((l) => isBase(D.productBySku(l.sku))); }
  function cartCount() { return state.cart.reduce((n, l) => n + l.qty, 0); }
  function updateCartCount() {
    const n = cartCount();
    $$('[data-cart-count]').forEach((el) => { el.textContent = n; el.dataset.zero = n === 0 ? 'true' : 'false'; });
    const link = $('[data-cart-link]');
    if (link) link.setAttribute('aria-label', 'Cart, ' + n + (n === 1 ? ' item' : ' items'));
  }
  // Returns true if added. The sediment add-on can never be bought alone.
  function addToCart(sku, opts) {
    opts = opts || {};
    const p = D.productBySku(sku);
    if (!p) return false;
    if (p.addOn && !cartHasBase()) {
      const kit = D.productFor(p.fits[0], 'kit3');
      openModal({
        title: 'Add-on only',
        body: `<p>The sediment pre-filter is sold as an add-on to any kit, so it always arrives with the parts it protects.</p>
               <p class="small muted">Exact fit: ${esc(modelName(p.fits[0]))}</p>`,
        actions: `<button class="btn btn-cta" data-action="add-kit-addon" data-sku="${kit.sku}" data-addon="${p.sku}">Add filter kit + pre-filter · ${rupee(kit.price + p.price)}</button>`
      });
      return false;
    }
    const line = state.cart.find((l) => l.sku === sku);
    if (line) {
      if (p.kind === 'part') line.qty += opts.qty || 1;
      if (opts.pro) line.pro = true;
    } else {
      state.cart.push({ sku: sku, qty: opts.qty || 1, pro: !!opts.pro && p.kind === 'part' && !p.addOn });
    }
    if (p.kind === 'part' && !state.purifier && p.fits.length === 1) state.purifier = p.fits[0];
    save();
    if (!opts.silent) toast(`Added to cart: ${p.short}${opts.pro ? ' + Pro install' : ''}`, 'cart', { href: '#/cart', label: 'View cart' });
    return true;
  }
  function totals(cart) {
    cart = cart || state.cart;
    let parts = 0, services = 0, pro = 0, hasGoods = false;
    cart.forEach((l) => {
      const p = D.productBySku(l.sku);
      if (!p) return;
      if (p.kind === 'part') { parts += p.price * l.qty; hasGoods = true; if (l.pro) pro += D.prices.install; }
      else services += p.price * l.qty;
    });
    let delivery = 0;
    const dv = state.delivery;
    if (hasGoods && dv.type === 'nextday') delivery = parts >= D.delivery.nextday.freeAbove ? 0 : D.delivery.nextday.fee;
    return { parts, services, pro, delivery, hasGoods, total: parts + services + pro + delivery };
  }
  function orphanAddOns() {
    return state.cart.some((l) => (D.productBySku(l.sku) || {}).addOn) && !cartHasBase();
  }
  function needsTechnician(cart) {
    return (cart || state.cart).some((l) => l.pro || l.sku === 'SRV-DIAG' || l.sku === 'SRV-CARE');
  }

  function placeOrder() {
    if (!state.cart.length || orphanAddOns()) return null;
    const t = totals();
    const created = new Date();
    const lines = state.cart.map((l) => {
      const p = D.productBySku(l.sku);
      const serials = [];
      if (p.kind === 'part') {
        for (let i = 0; i < l.qty; i++) {
          serials.push(U.qr.makeSerial(p.sku, addDays(today(), -2), state.unit));
          state.unit += 1;
        }
      }
      return { sku: l.sku, qty: l.qty, pro: !!l.pro, serials };
    });
    let booking = state.booking;
    if (needsTechnician() && !booking) {
      const d = next3Days()[0];
      booking = { date: d.iso, slot: 'morning', techId: nearestTech(state.address).id, kind: 'install' };
    }
    const order = {
      id: 'UPK-' + String(created.getFullYear()).slice(2) + String(100000 + ((created.getTime() / 1000) % 900000 | 0)).slice(-6),
      created: iso(created),
      lines,
      totals: t,
      delivery: Object.assign({}, state.delivery),
      payment: state.payment,
      address: state.address,
      booking: needsTechnician() ? booking : null,
      model: state.purifier
    };
    state.orders.push(order);
    state.cart = [];
    state.booking = null;
    save();
    return order;
  }
  function latestOrder() { return state.orders[state.orders.length - 1] || null; }

  function addReminder(model, sku, since) {
    model = model || state.purifier || 'AQN-N10P';
    const exists = state.reminders.find((r) => r.model === model);
    if (exists) { exists.since = since || exists.since; save(); return exists; }
    const r = { id: 'R' + Date.now(), model, sku: sku || (D.productFor(model, 'kit3') || {}).sku, since: since || iso(today()), created: iso(new Date()) };
    state.reminders.push(r);
    save();
    return r;
  }

  // ======================================================================
  // Toasts + modal
  // ======================================================================
  function toast(msg, iconName, link) {
    const host = $('[data-toasts]');
    if (!host) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.innerHTML = ic(iconName || 'check') + `<span style="flex:1">${esc(msg)}</span>` +
      (link ? `<a href="${link.href}" style="color:#9DE0DE;font-weight:700;white-space:nowrap">${esc(link.label)}</a>` : '');
    host.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, 3200);
  }
  let modalReturn = null;
  function openModal(o) {
    closeModal();
    modalReturn = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.setAttribute('data-modal', '');
    wrap.innerHTML = `<div class="modal ${o.cls || ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="icon-btn close" type="button" data-action="modal-close" aria-label="Close">${ic('close')}</button>
      ${o.title ? `<h2 id="modal-title">${esc(o.title)}</h2>` : '<h2 id="modal-title" class="sr-only">Dialog</h2>'}
      <div class="stack">${o.body || ''}</div>
      <div class="row" style="margin-top:18px">${o.actions || ''}<button class="btn btn-secondary" type="button" data-action="modal-close">${o.closeLabel || 'Close'}</button></div>
    </div>`;
    wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(); });
    document.body.appendChild(wrap);
    const first = wrap.querySelector('.modal .btn, .modal a, .modal button:not(.close)') || wrap.querySelector('button');
    if (first) first.focus();
  }
  function closeModal() {
    const m = $('[data-modal]');
    if (m) {
      m.remove();
      if (modalReturn && document.contains(modalReturn)) modalReturn.focus();
    }
  }
  function partnerModal(partner, sku) {
    const p = sku ? D.productBySku(sku) : null;
    const isMarket = D.delivery.marketplaces.indexOf(partner) > -1;
    openModal({
      title: isMarket ? `Compare on ${partner}` : `Delivered in ~15 min via ${partner}`,
      body: `<div class="notice notice-info">${ic('info')}<div><strong>Demo:</strong> In the live product this opens the partner app with the exact SKU${p ? ` <span class="serial">${esc(p.sku)}</span>` : ''}.</div></div>
        <p class="small muted">${isMarket ? 'UPKEEP listings on marketplaces carry the same model-matched SKUs and the same fit promise.' : 'Quick-commerce partners stock the fastest-moving UPKEEP kits for mapped models in Ahmedabad dark stores.'} Partner names are shown as text only.</p>`,
      actions: !isMarket && p ? `<button class="btn btn-primary" data-action="choose-quick" data-partner="${esc(partner)}" data-sku="${p.sku}">Use ${esc(partner)} in demo checkout</button>` : ''
    });
  }

  // ======================================================================
  // Shared view fragments
  // ======================================================================
  function productCard(p, opts) {
    opts = opts || {};
    const fits = p.fits.map((c) => `<strong>${esc(modelName(c))}</strong>`).join(', ');
    return `<article class="card product-card">
      <div class="thumb">${S.product(p)}</div>
      ${opts.exact ? `<div><span class="badge badge-fit">${ic('check')} Exact fit</span>${p.addOn ? ' <span class="badge badge-coral">Add-on</span>' : ''}</div>` : (p.addOn ? '<div><span class="badge badge-coral">Add-on · add to any kit</span></div>' : '')}
      <h3><a href="#/product/${p.sku}">${esc(p.name)}</a></h3>
      <div class="fits">Fits: ${fits}</div>
      <div class="made-by">${ic('factory')} ${esc(D.madeBy)}</div>
      <div class="row">
        <span class="price" style="font-size:1.25rem">${rupee(p.price)}</span>
        <span class="spacer"></span>
        ${p.addOn
          ? `<a class="btn btn-secondary btn-sm" href="#/product/${p.sku}">Add to any kit</a>`
          : `<button class="btn btn-primary btn-sm" type="button" data-action="add" data-sku="${p.sku}">${ic('cart')} Add</button>`}
      </div>
    </article>`;
  }
  function pageHead(title, sub, crumbs) {
    return `<div class="wrap page-head">
      ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}
      ${title ? `<h1 style="font-size:clamp(1.8rem,3.4vw,2.6rem)">${title}</h1>` : ''}
      ${sub ? `<p>${sub}</p>` : ''}
    </div>`;
  }
  function slotPicker(sel, scope) {
    sel = sel || {};
    const days = next3Days();
    return `<div class="stack">
      <div class="label small" style="font-weight:700;color:var(--navy)">Pick a day</div>
      <div class="slot-grid" role="group" aria-label="Day">
        ${days.map((d) => `<button type="button" data-action="${scope}-day" data-iso="${d.iso}" aria-pressed="${sel.date === d.iso}">${d.label}<small>${d.date}</small></button>`).join('')}
      </div>
      <div class="label small" style="font-weight:700;color:var(--navy)">Pick a slot</div>
      <div class="slot-grid" role="group" aria-label="Time slot">
        ${D.slots.map((s) => `<button type="button" data-action="${scope}-slot" data-slot="${s.id}" aria-pressed="${sel.slot === s.id}">${s.name}<small>${s.time}</small></button>`).join('')}
      </div>
    </div>`;
  }

  // ======================================================================
  // Views
  // ======================================================================
  const views = {};

  // ---------- Home ----------
  views.home = {
    title: 'Fits right. Flows right.',
    render() {
      const steps = [
        ['camera', 'Describe or snap', 'Tell UPKEEP Assist what\'s wrong, or snap the model label on your purifier.'],
        ['sparkle', 'AI matches the exact part', 'We map your model to the one kit that fits it. No "universal" guesswork.'],
        ['truck', 'Fast delivery, or add a pro', 'In ~15 minutes via a quick-commerce partner, or next-day. Add a vetted technician for ₹349.'],
        ['bell', 'Reminders before the next change', 'A WhatsApp nudge before each stage is due. Reply STOP any time.']
      ];
      const values = [
        ['shield', 'Exact fit or free return', 'Every SKU is mapped to specific model codes. If it doesn\'t fit, we take it back and make it right.'],
        ['factory', 'Made & wet-tested by the manufacturer', 'Built by Sarjan Watertech in Ahmedabad, pressure- and flow-tested before it is boxed.'],
        ['wrench', 'Part-only, or add a pro for ₹349', 'Fit it yourself with the guide video, or add a Sarjan-trained partner technician.'],
        ['bolt', 'Delivery in minutes or next-day', 'Quick-commerce partners for urgent swaps, UPKEEP next-day across Ahmedabad.']
      ];
      const rows = [
        ['Buy the part without a visit', ['yes', 'Yes, part-only'], ['no', 'Visit first'], ['yes', 'Yes']],
        ['Fit assurance', ['yes', 'Mapped to your model code'], ['meh', 'Depends on the technician'], ['no', '"Fits most" claims']],
        ['Price shown upfront', ['yes', 'Yes, incl. GST'], ['no', 'Quoted at the door'], ['yes', 'Yes']],
        ['Installation', ['yes', 'Optional, ₹349'], ['meh', 'Bundled, not optional'], ['no', 'You\'re on your own']]
      ];
      const cell = (c) => `<span class="${c[0]}">${ic(c[0])} ${esc(c[1])}</span>`;
      return `
      <section class="hero" data-tour="hero">
        <div class="wrap hero-grid">
          <div>
            <img class="hero-logo" src="assets/logo_light.png" alt="UPKEEP" width="150" height="40">
            <h1>Snap your purifier. <span>Get the part that fits.</span></h1>
            <p class="lead">Model-matched replacement filters and membranes, made and wet-tested by the manufacturer, Sarjan Watertech. Delivered fast, with a vetted pro only if you want one.</p>
            <div class="hero-ctas">
              <a class="btn btn-cta btn-lg" href="#/assist">${ic('chat')} Chat with UPKEEP Assist</a>
              <a class="btn btn-secondary btn-lg" href="#/find">Find my part manually</a>
            </div>
            <div class="hero-trust">
              <span>${ic('check')} Exact fit or free return</span>
              <span>${ic('check')} Prices incl. GST</span>
              <span>${ic('check')} Ahmedabad first</span>
            </div>
          </div>
          <div class="hero-art">
            <img src="assets/hero.png" alt="Three UPKEEP filter cartridges with water drops and a green tick" width="480" height="480">
            <div class="hero-chip c1">${ic('camera')}<div>Detected: AquaNova Neo 10 Plus<small>code AQN-N10P</small></div></div>
            <div class="hero-chip c2">${ic('shield')}<div>Exact fit · ₹999<small>Filter kit, wide housing</small></div></div>
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="how-title">
        <div class="wrap">
          <div class="section-head">
            <span class="eyebrow">How it works</span>
            <h2 id="how-title">From "something's off" to the right part, in four steps</h2>
          </div>
          <ol class="steps" style="list-style:none;padding:0;margin:0">
            ${steps.map((s, i) => `<li class="step card"><span class="icon-circle lg">${ic(s[0])}</span><div class="num">STEP ${i + 1}</div><h3>${s[1]}</h3><p>${s[2]}</p></li>`).join('')}
          </ol>
        </div>
      </section>

      <section class="section section-mist" aria-labelledby="value-title">
        <div class="wrap">
          <div class="section-head">
            <span class="eyebrow">The UPKEEP promise</span>
            <h2 id="value-title">Fits right, or we make it right.</h2>
            <p>A calm, expert neighbour for the box under your sink, backed by the people who make the parts.</p>
          </div>
          <div class="grid grid-4">
            ${values.map((v) => `<div class="card value"><span class="icon-circle">${ic(v[0])}</span><h3>${v[1]}</h3><p>${v[2]}</p></div>`).join('')}
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="why-title">
        <div class="wrap">
          <div class="section-head">
            <span class="eyebrow">Why UPKEEP</span>
            <h2 id="why-title">The usual ways vs. UPKEEP</h2>
          </div>
          <div class="compare-wrap">
            <table class="compare">
              <thead><tr><th scope="col"><span class="sr-only">Feature</span></th><th scope="col" class="us">UPKEEP</th><th scope="col">Book a visit first</th><th scope="col">Generic "universal" kits</th></tr></thead>
              <tbody>
                ${rows.map((r) => `<tr><th scope="row">${r[0]}</th><td class="us">${cell(r[1])}</td><td>${cell(r[2])}</td><td>${cell(r[3])}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="section-tight section-navy">
        <div class="wrap promise-band">
          <div>
            <h2>Not sure which model you have?</h2>
            <p style="margin:0">Snap the label. UPKEEP Assist reads it and tells you exactly what fits.</p>
          </div>
          <a class="btn btn-cta btn-lg" href="#/assist">${ic('camera')} Snap my purifier</a>
        </div>
      </section>`;
    }
  };

  // ---------- Find ----------
  const findSel = { brand: '', model: '', stage: '' };
  const STAGE_FAMILIES = {
    sediment: ['kit3', 'sediment'],
    precarbon: ['kit3', 'annual'],
    postcarbon: ['kit3', 'annual'],
    membrane: ['membrane', 'annual'],
    uf: ['annual'],
    all: ['annual', 'kit3']
  };
  views.find = {
    title: 'Find your part',
    render() {
      if (!findSel.model && state.purifier) {
        const m0 = D.modelByCode(state.purifier);
        if (m0) { findSel.brand = m0.brand; findSel.model = m0.code; }
      }
      const models = D.models.filter((m) => m.brand === findSel.brand);
      const m = D.modelByCode(findSel.model);
      let stageOpts = '';
      if (m) {
        stageOpts = m.stages.map((id) => `<label class="option"><input type="radio" name="stage" value="${id}" data-change="find-stage" ${findSel.stage === id ? 'checked' : ''}><span><span class="opt-title">${D.stages[id].name}</span><br><span class="opt-sub">${D.stages[id].blurb} Every ${D.stages[id].months} months.</span></span></label>`).join('') +
          `<label class="option"><input type="radio" name="stage" value="all" data-change="find-stage" ${findSel.stage === 'all' ? 'checked' : ''}><span><span class="opt-title">Not sure / everything</span><br><span class="opt-sub">Yearly refresh of all stages.</span></span></label>`;
      }
      let results = '';
      if (!m) {
        results = `<div class="empty">${ic('filter')}<p style="margin:8px 0 0">Pick your brand and model to see parts that fit it exactly.</p></div>`;
      } else {
        let list;
        if (findSel.stage) {
          const fams = STAGE_FAMILIES[findSel.stage] || [];
          list = fams.map((f) => D.productFor(m.code, f)).filter(Boolean);
        } else list = D.productsForModel(m.code);
        // Only exact fits for the selected model are ever shown.
        list = list.filter((p) => p.fits.indexOf(m.code) > -1);
        results = `<h2 style="font-size:1.25rem;margin-top:8px">Exact fits for ${esc(D.modelLabel(m))} <span class="tiny muted" style="font-weight:600">· ${list.length} ${list.length === 1 ? 'part' : 'parts'}</span></h2>
          ${findSel.stage === 'sediment' ? `<div class="notice notice-info" style="margin-bottom:14px">${ic('info')}<span>The sediment pre-filter is sold as an add-on. The filter kit already includes a fresh one.</span></div>` : ''}
          <div class="product-grid" data-find-results>${list.map((p) => productCard(p, { exact: true })).join('')}</div>`;
      }
      return pageHead('Find your part', 'Choose your purifier and what needs changing. We only show parts that are an exact fit for that model.', '<a href="#/">Home</a> / Find a part') + `
      <div class="wrap section-tight" style="padding-top:16px">
        <div class="find-grid">
          <div class="card find-controls stack">
            <div class="field">
              <label for="f-brand">Brand</label>
              <select id="f-brand" class="select" data-change="find-brand">
                <option value="">Select brand</option>
                ${D.brands.map((b) => `<option value="${b.id}" ${findSel.brand === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="f-model">Model</label>
              <select id="f-model" class="select" data-change="find-model" ${findSel.brand ? '' : 'disabled'}>
                <option value="">${findSel.brand ? 'Select model' : 'Pick a brand first'}</option>
                ${models.map((x) => `<option value="${x.code}" ${findSel.model === x.code ? 'selected' : ''}>${x.name} · ${x.code}</option>`).join('')}
              </select>
            </div>
            ${m ? `<fieldset class="field" style="border:0;padding:0;margin:0"><legend class="label" style="margin-bottom:6px">What needs changing?</legend><div class="stage-picks">${stageOpts}</div></fieldset>` : ''}
            <a class="btn btn-ghost" href="#/assist">${ic('chat')} Not sure? Ask UPKEEP Assist</a>
          </div>
          <div class="stack">
            ${m ? `<div class="card diagram-card">
                <div class="row" style="margin-bottom:8px"><strong style="color:var(--navy)">${esc(D.modelLabel(m))}</strong><span class="badge">${esc(m.type)}</span><span class="serial">${m.code}</span>${m.housingNote ? `<span class="badge badge-coral">${esc(m.housingNote)}</span>` : ''}</div>
                ${S.stageDiagram(m, findSel.stage)}
              </div>` : ''}
            ${results}
          </div>
        </div>
      </div>`;
    }
  };

  // ---------- Product ----------
  const pdp = { sku: '', view: 'main', pro: false };
  views.product = {
    title: 'Product',
    render(params) {
      const p = D.productBySku(params[0]);
      if (!p || p.kind !== 'part') return views.notfound.render();
      if (pdp.sku !== p.sku) { pdp.sku = p.sku; pdp.view = 'main'; pdp.pro = false; }
      this.title = p.name;
      const fitList = p.fits.map((c) => `<li>${esc(modelName(c))} <code>${c}</code></li>`).join('');
      const kit = p.addOn ? D.productFor(p.fits[0], 'kit3') : null;
      const buy = p.addOn ? `
        <div class="notice">${ic('info')}<div><strong>Add-on only.</strong> Add it to any kit for ${esc(modelName(p.fits[0]))}. It can't be bought alone.</div></div>
        <div class="row">
          <button class="btn btn-cta btn-lg" type="button" data-action="add-kit-addon" data-sku="${kit.sku}" data-addon="${p.sku}">${ic('cart')} Add with filter kit · ${rupee(kit.price + p.price)}</button>
          <button class="btn btn-secondary btn-lg" type="button" data-action="add" data-sku="${p.sku}" ${cartHasBase() ? '' : 'aria-disabled="true"'}>Add to kit in my cart</button>
        </div>` : `
        <div class="stack">
          <div class="seg" role="group" aria-label="Purchase option">
            <button type="button" data-action="pdp-pro" data-pro="0" aria-pressed="${!pdp.pro}">Part only</button>
            <button type="button" data-action="pdp-pro" data-pro="1" aria-pressed="${pdp.pro}">Part + Pro (+${rupee(D.prices.install)})</button>
          </div>
          <p class="small muted" style="margin:0">${pdp.pro ? 'A Sarjan-trained partner technician fits it and checks for leaks. You pick the slot at checkout.' : 'Fit it yourself in about 10 minutes with the install video. Fit card included.'}</p>
          <div class="row">
            <button class="btn btn-cta btn-lg" type="button" data-action="add" data-sku="${p.sku}" data-pro="${pdp.pro ? 1 : 0}">${ic('cart')} Add to cart · ${rupee(p.price + (pdp.pro ? D.prices.install : 0))}</button>
          </div>
        </div>`;
      return pageHead('', '', `<a href="#/">Home</a> / <a href="#/find">Find a part</a> / ${esc(p.short)}`) + `
      <div class="wrap pdp">
        <div>
          <div class="gallery-main">${S.product(p, pdp.view)}</div>
          <div class="gallery-thumbs" role="group" aria-label="Product images">
            ${['main', 'box', 'label'].map((v) => `<button type="button" data-action="pdp-view" data-view="${v}" aria-pressed="${pdp.view === v}" aria-label="${v === 'main' ? 'Parts' : v === 'box' ? 'Box with QR label' : 'Fit card'}">${S.product(p, v)}</button>`).join('')}
          </div>
        </div>
        <div class="stack" style="gap:16px">
          <div class="row"><span class="badge badge-fit">${ic('check')} Exact fit</span>${p.addOn ? '<span class="badge badge-coral">Add-on</span>' : ''}<span class="serial">${p.sku}</span></div>
          <h1 style="font-size:clamp(1.6rem,3vw,2.3rem);margin:0">${esc(p.name)}</h1>
          <div><span class="price price-lg">${rupee(p.price)}</span> <span class="incl">incl. GST</span></div>
          <p class="muted" style="margin:0">${esc(p.desc)}</p>
          <div class="made-by">${ic('factory')} ${esc(D.madeBy)}</div>
          <div>
            <div style="font-weight:700;color:var(--navy)">Exact fit for:</div>
            <ul class="fit-list">${fitList}</ul>
          </div>
          <div class="fit-box"><span class="icon-circle">${ic('shield')}</span><div><strong style="color:#1F6B41">Fit guarantee</strong><div class="small">Check the code on the fit card against your model label. If it doesn't fit, we collect it free and send the right part, or refund you. Fits right, or we make it right.</div></div></div>
          ${buy}
          <div class="card-soft stack">
            <strong style="color:var(--navy)">Delivery options</strong>
            <div class="row small">${ic('truck')} <span><strong>UPKEEP next-day</strong> · Ahmedabad · free on ₹999 and above</span></div>
            <div class="small" style="font-weight:600">${ic('bolt').replace('class="ic ', 'style="width:16px;height:16px;vertical-align:-3px" class="ic ')} Delivered in ~15 min via a quick-commerce partner</div>
            <div class="partner-row">${D.delivery.partners.map((n) => `<button class="partner-btn" type="button" data-action="partner" data-partner="${n}" data-sku="${p.sku}">${n}<small>~15 min</small></button>`).join('')}</div>
            <div class="row small"><span class="muted">Compare on marketplaces:</span>${D.delivery.marketplaces.map((n) => `<button class="btn btn-ghost btn-sm" type="button" data-action="partner" data-partner="${n}" data-sku="${p.sku}">${n} ${ic('arrow')}</button>`).join('')}</div>
          </div>
        </div>
      </div>
      <div class="wrap section-tight">
        <div class="grid grid-2">
          <div class="card">
            <h2 style="font-size:1.2rem">What's in the box</h2>
            <ul class="box-list">${p.box.map((b) => `<li>${ic('check')}<span>${esc(b)}</span></li>`).join('')}</ul>
          </div>
          <div>
            <button class="video-card" type="button" data-action="video" aria-label="Play install video (demo)">
              ${S.video('Install video')}
              <span class="vc-caption">How to fit it: ${esc(p.short)} · 3:40</span>
            </button>
          </div>
        </div>
        <div class="section-tight">
          <h2 style="font-size:1.4rem">How we verify</h2>
          <p class="muted">Every UPKEEP box carries a QR code with its own serial number.</p>
          <div class="verify-steps">
            <div class="card"><span class="icon-circle">${ic('factory')}</span><h3 style="margin-top:12px">Wet-tested in Changodar</h3><p class="small muted" style="margin:0">Each unit is pressure- and flow-tested at Sarjan's plant, and the result is logged against its serial.</p></div>
            <div class="card"><span class="icon-circle">${ic('qr')}</span><h3 style="margin-top:12px">Scan the box</h3><p class="small muted" style="margin:0">Scan the QR with your phone camera to see the serial, batch, test date and the models it fits.</p></div>
            <div class="card"><span class="icon-circle">${ic('shield')}</span><h3 style="margin-top:12px">Warranty starts on delivery</h3><p class="small muted" style="margin:0">12 months from delivery, tied to the serial. No paper bills to keep.</p></div>
          </div>
        </div>
        <div class="card upsell">
          <span class="icon-circle lg">${ic('calendar')}</span>
          <div style="flex:1"><strong style="color:var(--navy)">Annual care plan · ${rupee(D.prices.careplan)}</strong><div class="small muted">2 technician visits + 1 model-matched filter kit a year.</div></div>
          <button class="btn btn-secondary btn-sm" type="button" data-action="add" data-sku="SRV-CARE">Add care plan</button>
        </div>
      </div>`;
    }
  };

  // ---------- Cart ----------
  views.cart = {
    title: 'Cart and checkout',
    render() {
      const t = totals();
      if (!state.cart.length) {
        return pageHead('Your cart', '') + `<div class="wrap section-tight"><div class="empty">
          ${ic('cart')}<p style="margin:8px 0 14px">Your cart is empty.</p>
          <div class="row" style="justify-content:center"><a class="btn btn-cta" href="#/assist">Chat with UPKEEP Assist</a><a class="btn btn-secondary" href="#/find">Find my part</a></div>
        </div></div>`;
      }
      const lines = state.cart.map((l, i) => {
        const p = D.productBySku(l.sku);
        const isPart = p.kind === 'part';
        return `<div class="line-item" data-line="${i}">
          <div class="line-thumb">${S.product(p)}</div>
          <div>
            ${isPart ? `<a class="line-title" href="#/product/${p.sku}">${esc(p.name)}</a>` : `<span class="line-title">${esc(p.name)}</span>`}
            <div class="line-meta">${isPart ? `Fits ${p.fits.map((c) => esc(c)).join(', ')} · ${esc(D.madeBy)}` : esc(p.desc || 'Service visit')}</div>
            ${isPart ? `<span class="badge badge-fit" style="margin-top:6px">${ic('check')} Exact fit</span>` : ''}
            <div class="line-actions">
              ${isPart ? `<div class="qty" role="group" aria-label="Quantity"><button type="button" data-action="qty" data-i="${i}" data-d="-1" aria-label="Decrease quantity">−</button><span aria-live="polite">${l.qty}</span><button type="button" data-action="qty" data-i="${i}" data-d="1" aria-label="Increase quantity">+</button></div>` : ''}
              ${isPart && !p.addOn ? `<label class="switch"><input type="checkbox" data-change="line-pro" data-i="${i}" ${l.pro ? 'checked' : ''}><span class="track"></span>Part + Pro (+${rupee(D.prices.install)})</label>` : ''}
              <button class="btn btn-ghost btn-sm" type="button" data-action="remove" data-i="${i}">Remove</button>
            </div>
          </div>
          <div class="line-price price" style="text-align:right">${rupee(p.price * l.qty + (l.pro ? D.prices.install : 0))}</div>
        </div>`;
      }).join('');
      const dv = state.delivery;
      const nextFee = t.parts >= D.delivery.nextday.freeAbove ? 'Free' : rupee(D.delivery.nextday.fee);
      const tech = needsTechnician() ? (state.booking ? techById(state.booking.techId) : nearestTech(state.address)) : null;
      return pageHead('Cart and checkout', 'Demo checkout: nothing is charged and no order is sent.', '<a href="#/">Home</a> / Cart') + `
      <div class="wrap section-tight" style="padding-top:12px">
        <div class="cart-grid">
          <div class="stack" style="gap:20px">
            <div class="card" data-tour="cart-lines">${lines}
              ${orphanAddOns() ? `<div class="notice" style="margin-top:14px">${ic('alert')}<span>The sediment pre-filter is an add-on. Add any kit to check out.</span></div>` : ''}
              ${state.cart.some((l) => l.sku === 'SRV-CARE') ? '' : `<div class="upsell" style="margin-top:16px"><span class="icon-circle">${ic('calendar')}</span><div style="flex:1" class="small"><strong>Annual care plan · ${rupee(D.prices.careplan)}</strong><br><span class="muted">2 visits + 1 filter kit a year</span></div><button class="btn btn-secondary btn-sm" type="button" data-action="add" data-sku="SRV-CARE">Add</button></div>`}
            </div>

            ${t.hasGoods ? `<section class="card stack" aria-labelledby="dlv-h">
              <h2 id="dlv-h" style="font-size:1.15rem;margin:0">Delivery</h2>
              <div class="option-list">
                <label class="option"><input type="radio" name="dlv" value="nextday" data-change="delivery" ${dv.type === 'nextday' ? 'checked' : ''}>
                  <span><span class="opt-title">${ic('truck').replace('class="ic ', 'style="width:18px;height:18px;vertical-align:-3px" class="ic ')} UPKEEP next-day</span><br><span class="opt-sub">Ahmedabad · free on ₹999 and above</span></span><span class="opt-price">${nextFee}</span></label>
                <label class="option"><input type="radio" name="dlv" value="quick" data-change="delivery" ${dv.type === 'quick' ? 'checked' : ''}>
                  <span style="flex:1"><span class="opt-title">${ic('bolt').replace('class="ic ', 'style="width:18px;height:18px;vertical-align:-3px" class="ic ')} Delivered in ~15 min via quick-commerce partner</span><br><span class="opt-sub">${dv.type === 'quick' && dv.partner ? 'Partner: ' + esc(dv.partner) + ' · partner fee shown in their app' : 'Choose a partner below'}</span></span></label>
              </div>
              <div class="partner-row">${D.delivery.partners.map((n) => `<button class="partner-btn" type="button" data-action="partner" data-partner="${n}" data-sku="${state.cart[0].sku}" aria-pressed="${dv.partner === n}">${n}<small>~15 min</small></button>`).join('')}</div>
              <div class="row small"><span class="muted">Or compare on marketplaces:</span>${D.delivery.marketplaces.map((n) => `<button class="btn btn-ghost btn-sm" type="button" data-action="partner" data-partner="${n}" data-sku="${state.cart[0].sku}">${n} ${ic('arrow')}</button>`).join('')}</div>
            </section>` : ''}

            <section class="card stack" aria-labelledby="addr-h">
              <h2 id="addr-h" style="font-size:1.15rem;margin:0">Address</h2>
              <div class="field"><label for="addr">Delivery and visit address</label><input id="addr" class="input" data-change="address" value="${esc(state.address)}" autocomplete="off"></div>
              ${tech ? `<div class="card-soft">${techCard(tech, state.booking ? `<div class="small" style="margin-top:4px">${ic('calendar').replace('class="ic ', 'style="width:14px;height:14px;vertical-align:-2px" class="ic ')} ${fmtShort(state.booking.date)} · ${slotById(state.booking.slot).name} (${slotById(state.booking.slot).time})</div>` : '<div class="small" style="margin-top:4px">Nearest partner · slot: tomorrow morning (change on <a href="#/book">booking</a>)</div>')}</div>` : ''}
            </section>

            <section class="card stack" aria-labelledby="pay-h">
              <h2 id="pay-h" style="font-size:1.15rem;margin:0">Payment <span class="tiny muted" style="font-weight:600">· demo, nothing is charged</span></h2>
              <div class="option-list">
                ${[['upi', 'UPI', 'Pay with any UPI app'], ['card', 'Debit / credit card', 'Visa, Mastercard, RuPay'], ['cod', 'Cash on delivery', 'Pay when it arrives']].map((o) => `<label class="option"><input type="radio" name="pay" value="${o[0]}" data-change="payment" ${state.payment === o[0] ? 'checked' : ''}><span><span class="opt-title">${o[1]}</span><br><span class="opt-sub">${o[2]}</span></span></label>`).join('')}
              </div>
            </section>
          </div>

          <aside class="card summary stack" aria-label="Order summary" data-tour="cart-summary">
            <h2 style="font-size:1.15rem;margin:0">Order summary</h2>
            <div>
              <div class="summary-row"><span>Parts</span><span>${rupee(t.parts)}</span></div>
              ${t.pro ? `<div class="summary-row"><span>Pro installation</span><span>${rupee(t.pro)}</span></div>` : ''}
              ${t.services ? `<div class="summary-row"><span>Services</span><span>${rupee(t.services)}</span></div>` : ''}
              ${t.hasGoods ? `<div class="summary-row"><span>Delivery</span><span>${dv.type === 'quick' ? 'Partner app' : (t.delivery ? rupee(t.delivery) : 'Free')}</span></div>` : ''}
              <div class="summary-row total"><span>Total</span><span data-total>${rupee(t.total)}</span></div>
              <div class="tiny muted">All prices include GST. Fictional prices for the demo.</div>
            </div>
            <button class="btn btn-cta btn-lg btn-block" type="button" data-action="place-order" ${orphanAddOns() ? 'disabled' : ''}>Place demo order</button>
            <div class="small muted center">${ic('shield').replace('class="ic ', 'style="width:16px;height:16px;vertical-align:-3px;color:var(--success)" class="ic ')} Fits right, or we make it right.</div>
          </aside>
        </div>
      </div>`;
    }
  };

  // ---------- Book a technician ----------
  const bookSel = { kind: 'diagnosis', model: '', date: '', slot: '' };
  views.book = {
    title: 'Book a technician',
    render() {
      if (!bookSel.model) bookSel.model = state.purifier || 'AQN-N10P';
      if (state.cart.some((l) => l.pro) && bookSel.kind === 'diagnosis' && !bookSel.touched) bookSel.kind = 'install';
      const tech = nearestTech(state.address);
      const kinds = [
        ['install', 'Installation with your part (Part + Pro)', D.prices.install, 'Fits the UPKEEP part you order and checks for leaks.'],
        ['diagnosis', 'Diagnosis visit', D.prices.diagnosis, 'For leaks, power or "not working". Quote before any work.'],
        ['care', 'Annual care plan', D.prices.careplan, '2 visits + 1 filter kit across the year.']
      ];
      return pageHead('Book a technician', 'Vetted, Sarjan-trained partner technicians across Ahmedabad. Pick a slot; we assign the nearest one.', '<a href="#/">Home</a> / Book') + `
      <div class="wrap section-tight" style="padding-top:12px">
        <div class="cart-grid">
          <div class="stack" style="gap:20px">
            <section class="card stack">
              <h2 style="font-size:1.15rem;margin:0">What do you need?</h2>
              <div class="option-list">${kinds.map((k) => `<label class="option"><input type="radio" name="bk" value="${k[0]}" data-change="book-kind" ${bookSel.kind === k[0] ? 'checked' : ''}><span><span class="opt-title">${k[1]}</span><br><span class="opt-sub">${k[3]}</span></span><span class="opt-price">${rupee(k[2])}</span></label>`).join('')}</div>
              <div class="field"><label for="bk-model">Your purifier</label>
                <select id="bk-model" class="select" data-change="book-model">${D.models.map((m) => `<option value="${m.code}" ${bookSel.model === m.code ? 'selected' : ''}>${esc(D.modelLabel(m))} · ${m.code}</option>`).join('')}</select></div>
            </section>
            <section class="card">${slotPicker(bookSel, 'book')}</section>
          </div>
          <aside class="card summary stack">
            <h2 style="font-size:1.15rem;margin:0">Your technician</h2>
            ${techCard(tech)}
            <p class="small muted" style="margin:0">If no UPKEEP partner is free, we can request an overflow booking with a partner service network (demo).</p>
            <button class="btn btn-cta btn-block" type="button" data-action="book-confirm" ${bookSel.date && bookSel.slot ? '' : 'disabled'}>Confirm booking</button>
          </aside>
        </div>
      </div>`;
    }
  };

  // ---------- Order confirmation ----------
  views.order = {
    title: 'Order confirmed',
    render() {
      const o = latestOrder();
      if (!o) {
        return pageHead('No orders yet', 'Place a demo order and it will show up here with its QR code.') +
          `<div class="wrap section-tight"><a class="btn btn-cta" href="#/assist">Chat with UPKEEP Assist</a></div>`;
      }
      const firstSerial = (o.lines.find((l) => l.serials.length) || { serials: [] }).serials[0];
      const quick = o.delivery.type === 'quick';
      const b = o.booking;
      const tech = b ? techById(b.techId) : null;
      const steps = [
        { cls: 'done', icon: 'box', title: 'Packed', sub: 'Wet-tested and sealed at Changodar, Ahmedabad' },
        { cls: 'now', icon: 'truck', title: 'Out for delivery', sub: quick ? `Arriving in ~15 min via ${esc(o.delivery.partner || 'a quick-commerce partner')}` : 'UPKEEP next-day courier' },
        { cls: '', icon: 'check', title: 'Delivered', sub: quick ? 'Today' : `Expected ${fmtShort(addDays(new Date(o.created), 1))}` }
      ];
      if (b) steps.push({ cls: '', icon: 'wrench', title: 'Technician visit', sub: `${fmtShort(b.date)} · ${slotById(b.slot).name} (${slotById(b.slot).time}) · ${esc(tech.name)}` });
      const items = o.lines.map((l) => {
        const p = D.productBySku(l.sku);
        return `<li style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="row"><strong style="color:var(--navy)">${esc(p.name)}</strong>${l.pro ? '<span class="badge">+ Pro</span>' : ''}<span class="spacer"></span><span class="small muted">× ${l.qty}</span></div>
          ${l.serials.map((s) => `<div class="small" style="margin-top:4px">Serial <a class="serial" href="#/verify/${s}">${s}</a></div>`).join('')}</li>`;
      }).join('');
      return pageHead(`Order confirmed ${ic('check').replace('class="ic ', 'style="width:30px;height:30px;color:var(--success);vertical-align:-4px" class="ic ')}`, `Order <strong>${o.id}</strong> · placed ${fmtDate(o.created)} · ${rupee(o.totals.total)} incl. GST · ${o.payment.toUpperCase()} (demo)`, '<a href="#/">Home</a> / Order') + `
      <div class="wrap section-tight" style="padding-top:12px">
        <div class="order-grid">
          <div class="stack" style="gap:20px">
            <section class="card"><h2 style="font-size:1.15rem">Tracking</h2>
              <ol class="timeline">${steps.map((s) => `<li class="${s.cls}"><span class="dot">${ic(s.icon)}</span><div class="t-title">${s.title}</div><div class="t-sub">${s.sub}</div></li>`).join('')}</ol>
            </section>
            ${tech ? `<section class="card stack"><h2 style="font-size:1.15rem;margin:0">Your technician</h2>${techCard(tech)}<p class="small muted" style="margin:0">They'll WhatsApp you 30 minutes before arriving.</p></section>` : ''}
            <section class="card"><h2 style="font-size:1.15rem">Items</h2><ul style="list-style:none;padding:0;margin:0">${items}</ul></section>
          </div>
          <aside class="stack" style="gap:20px">
            ${firstSerial ? `<section class="card qr-card" data-tour="order-qr">
              <h2 style="font-size:1.15rem">Scan to verify</h2>
              <p class="small muted" style="margin:0">This QR is printed on the box.</p>
              <a class="qr" href="#/verify/${firstSerial}" data-qr-link aria-label="Verify part ${firstSerial}">${U.qr.toSvg(U.qr.verifyUrl(firstSerial), { label: 'QR code for serial ' + firstSerial })}</a>
              <div class="serial">${firstSerial}</div>
              <a class="btn btn-secondary btn-block" style="margin-top:12px" href="#/verify/${firstSerial}">${ic('qr')} Open verify page</a>
            </section>` : ''}
            <section class="card stack">
              <h2 style="font-size:1.15rem;margin:0">Next change reminder</h2>
              <p class="small muted" style="margin:0">Get a WhatsApp nudge before the next stage is due.</p>
              <button class="btn btn-primary" type="button" data-action="order-reminder">${ic('bell')} Add reminder</button>
            </section>
          </aside>
        </div>
      </div>`;
    }
  };

  // ---------- Verify ----------
  views.verify = {
    title: 'Verify a part',
    render(params) {
      const serial = decodeURIComponent(params[0] || '');
      const v = U.qr.parseSerial(serial);
      if (!v) {
        return `<div class="wrap section-tight">
          <div class="verify-hero verify-fail" data-tour="verify"><span class="icon-circle">${ic('alert')}</span><div><h1>We couldn't verify this serial. Contact us.</h1><p style="margin:4px 0 0">Serial <span class="serial">${esc(serial || '(none)')}</span> doesn't match a wet-tested UPKEEP part.</p></div></div>
          <div class="row" style="margin-top:20px"><a class="btn btn-primary" href="#/assist">${ic('chat')} Talk to UPKEEP</a><a class="btn btn-secondary" href="#/">Home</a></div>
          <p class="small muted" style="margin-top:16px">Check the code under the QR on the box. It looks like UPK-YYMMDD-0000-SKU-X.</p>
        </div>`;
      }
      const p = v.product;
      const test = new Date(v.testedOn);
      return `<div class="wrap section-tight">
        <div class="crumbs"><a href="#/">Home</a> / Verify</div>
        <div class="verify-hero" data-tour="verify"><span class="icon-circle">${ic('check')}</span><div><h1>Genuine UPKEEP part ✓</h1><p style="margin:4px 0 0">${esc(p.name)}</p></div></div>
        <div class="order-grid" style="margin-top:24px">
          <div class="card">
            <dl class="facts">
              <div><dt>Serial</dt><dd><span class="serial">${esc(v.serial)}</span></dd></div>
              <div><dt>Batch</dt><dd>${v.batch}</dd></div>
              <div><dt>Wet-test date</dt><dd>${fmtDate(test)}</dd></div>
              <div><dt>Wet-test result</dt><dd style="color:var(--success)">Passed · ${v.pressure} bar, no leaks, flow in spec</dd></div>
              <div><dt>Manufacturing plant</dt><dd>${esc(D.plant)}</dd></div>
              <div><dt>Warranty</dt><dd>12 months from delivery</dd></div>
            </dl>
            <div style="margin-top:16px"><div style="font-weight:700;color:var(--navy)">Exact fit for:</div><ul class="fit-list">${p.fits.map((c) => `<li>${esc(modelName(c))} <code>${c}</code></li>`).join('')}</ul></div>
          </div>
          <div class="stack" style="gap:16px">
            <button class="video-card" type="button" data-action="video" aria-label="Play install video (demo)">${S.video('Install video')}<span class="vc-caption">Install video: ${esc(p.short)} · 3:40</span></button>
            <a class="btn btn-secondary" href="#/product/${p.sku}">View product</a>
          </div>
        </div>
      </div>`;
    }
  };

  // ---------- Reminders ----------
  views.reminders = {
    title: 'Reminders',
    render() {
      const r = state.reminders[0];
      const code = (r && r.model) || state.purifier || 'AQN-N10P';
      const m = D.modelByCode(code);
      const kit = D.productFor(code, 'kit3');
      const since = r ? new Date(r.since) : addMonths(today(), -6);
      // For the WhatsApp mock-up we show the reminder as it would arrive when
      // the pre-filter is due: 6 months after the kit went in.
      const t = today();
      const due = m.stages.map((id) => {
        const st = D.stages[id];
        let d = addMonths(since, st.months);
        while (d < addDays(t, -1)) d = addMonths(d, st.months);
        const days = Math.round((d - t) / 864e5);
        return { st, d, days };
      }).sort((a, b) => a.d - b.d);
      return pageHead('Reminders', 'A friendly WhatsApp nudge before each stage is due, with the exact part one tap away.', '<a href="#/">Home</a> / Reminders') + `
      <div class="wrap section-tight" style="padding-top:12px">
        <div class="rem-grid">
          <div class="phone" data-tour="phone" aria-label="WhatsApp reminder preview">
            <div class="phone-screen">
              <div class="phone-top"><div class="avatar" aria-hidden="true">${S.mark('#0E7C7B', '#fff')}</div><div class="who">UPKEEP<small>Business account · demo</small></div></div>
              <div class="phone-body">
                <span class="wa-day">${fmtShort(addMonths(since, 6))}</span>
                <div class="wa-msg">Hi Riya, your filter kit went in 6 months ago. Time for a fresh pre-filter?
                  <div class="small" style="color:#54656F;margin-top:6px">${esc(D.modelLabel(m))} · <span style="font-family:ui-monospace,Menlo,monospace">${m.code}</span></div>
                  <span class="wa-time">10:02</span>
                  <div class="wa-btns">
                    <button type="button" data-action="wa-reorder" data-sku="${kit.sku}">Reorder kit · ${rupee(kit.price)}</button>
                    <button type="button" data-action="wa-book">Book a visit</button>
                    <button type="button" data-action="wa-later">Remind me later</button>
                  </div>
                </div>
                <div class="wa-note">Reply STOP to opt out</div>
              </div>
            </div>
          </div>
          <div class="stack" style="gap:20px">
            <section class="card">
              <div class="row" style="margin-bottom:12px"><h2 style="font-size:1.2rem;margin:0">Upcoming changes</h2><span class="spacer"></span><span class="badge">${esc(D.modelLabel(m))}</span></div>
              <p class="small muted">Based on a filter kit fitted on ${fmtDate(since)}.</p>
              <ul class="due-list">
                ${due.map((x) => `<li class="due-item"><span class="icon-circle">${ic(x.st.id === 'membrane' ? 'drop' : 'filter')}</span><div><strong style="color:var(--navy)">${x.st.name}</strong><div class="small muted">Every ${x.st.months} months</div></div><div class="due-when"><strong>${fmtDate(x.d)}</strong>${x.days <= 14 ? '<span class="pill pill-due">Due now</span>' : `<span class="pill pill-ok">in ${x.days < 60 ? x.days + ' days' : Math.round(x.days / 30) + ' months'}</span>`}</div></li>`).join('')}
              </ul>
            </section>
            <section class="card stack">
              <h2 style="font-size:1.2rem;margin:0">Your reminders</h2>
              ${state.reminders.length ? state.reminders.map((x) => `<div class="row"><span class="icon-circle">${ic('bell')}</span><div style="flex:1"><strong>${esc(modelName(x.model))}</strong><div class="small muted">WhatsApp · set ${fmtDate(x.created)}</div></div><button class="btn btn-ghost btn-sm" type="button" data-action="rem-remove" data-id="${x.id}">Remove</button></div>`).join('')
                : `<p class="muted" style="margin:0">No reminders yet. Opt in from UPKEEP Assist or after an order.</p><button class="btn btn-primary" type="button" data-action="rem-add" data-model="${code}" style="align-self:flex-start">${ic('bell')} Remind me for ${esc(D.modelLabel(m))}</button>`}
              <p class="tiny muted" style="margin:0">We only message about your purifier. Reply STOP to opt out at any time. Max one reminder per stage.</p>
            </section>
          </div>
        </div>
      </div>`;
    }
  };

  // ---------- For technicians ----------
  views.pro = {
    title: 'For technicians',
    render() {
      const fams = [['Sediment pre-filter (add-on)', D.prices.sediment], ['3-stage filter kit', D.prices.kit3], ['RO membrane 80 GPD', D.prices.membrane], ['Complete annual kit', D.prices.annual]];
      const trade = (n) => Math.round(n * 0.75);
      return pageHead('For partner technicians', 'Fit parts that are right the first time. Fewer repeat visits, happier customers, better margins.', '<a href="#/">Home</a> / For technicians') + `
      <div class="wrap section-tight" style="padding-top:12px">
        <div class="grid grid-3">
          <div class="card value"><span class="icon-circle">${ic('tag')}</span><h3>Trade price 25% below list</h3><p class="small muted" style="margin:0">Buy model-matched parts at trade prices and keep the difference.</p></div>
          <div class="card value"><span class="icon-circle">${ic('award')}</span><h3>Loyalty points per order</h3><p class="small muted" style="margin:0">10 points per order, plus 1 point per ₹100. Redeem for tools and training.</p></div>
          <div class="card value"><span class="icon-circle">${ic('wrench')}</span><h3>Paid UPKEEP jobs</h3><p class="small muted" style="margin:0">Get Part + Pro and diagnosis visits near you, at ₹349 per visit.</p></div>
        </div>
        <div class="grid grid-2" style="margin-top:24px;align-items:start">
          <section class="card">
            <h2 style="font-size:1.2rem">Sample trade prices</h2>
            <div class="table-wrap"><table class="table">
              <thead><tr><th>Part</th><th class="num">List (incl. GST)</th><th class="num">Trade</th></tr></thead>
              <tbody>${fams.map((f) => `<tr><td>${f[0]}</td><td class="num">${rupee(f[1])}</td><td class="num"><strong style="color:var(--teal)">${rupee(trade(f[1]))}</strong></td></tr>`).join('')}</tbody>
            </table></div>
            <p class="tiny muted" style="margin:10px 0 0">Illustrative trade prices for the demo, rounded to the nearest rupee.</p>
          </section>
          <section class="card">
            <h2 style="font-size:1.2rem">Join the network</h2>
            <form class="stack" data-form="join" novalidate>
              <div class="field"><label for="j-name">Full name</label><input id="j-name" class="input" name="name" required autocomplete="name"></div>
              <div class="field"><label for="j-phone">WhatsApp number</label><input id="j-phone" class="input" name="phone" required inputmode="tel" autocomplete="tel" placeholder="98xxx xxxxx"></div>
              <div class="field"><label for="j-area">Area</label><select id="j-area" class="select" name="area">${['Satellite', 'Bopal', 'Maninagar', 'Chandkheda', 'Other'].map((a) => `<option>${a}</option>`).join('')}</select></div>
              <div class="field"><label for="j-exp">Years of RO experience</label><input id="j-exp" class="input" name="exp" type="number" min="0" max="40" value="3"></div>
              <button class="btn btn-cta" type="submit">Request to join</button>
              <p class="tiny muted" style="margin:0">Front-end demo only. Nothing is sent.</p>
            </form>
          </section>
        </div>
      </div>`;
    }
  };

  // ---------- About ----------
  views.about = {
    title: 'About the proposal',
    render() {
      const ads = [
        ['ad1_diwali.png', 'Diwali-ready home. Water-ready purifier.'],
        ['ad2_know_your_part.png', 'Know your part'],
        ['ad3_right_part.png', 'The right part'],
        ['ad4_part_pro.png', 'Part + Pro'],
        ['ad5_reminder.png', 'Reminder before the next change']
      ];
      const stats = [['₹13.1 lakh', 'Pilot budget'], ['~477', 'Orders / month to break even'], ['Month 4', 'Base case turns profitable'], ['Ahmedabad', 'First city, then expand']];
      return pageHead('About the proposal', `UPKEEP is a consumer brand proposal for Sarjan Watertech India Pvt. Ltd. by ${esc(D.teamName)} · Hackathon 2026.`, '<a href="#/">Home</a> / About') + `
      <div class="wrap section-tight" style="padding-top:12px">
        <div class="grid grid-2" style="align-items:start">
          <section class="card">
            <h2 style="font-size:1.3rem">The problem</h2>
            <ul class="problem-list">
              <li><span class="icon-circle">${ic('filter')}</span><div><strong>People don't know which part fits.</strong><div class="small muted">Model names are hard to find and "universal" kits often don't seat properly.</div></div></li>
              <li><span class="icon-circle">${ic('wrench')}</span><div><strong>Buying a part usually means booking a visit.</strong><div class="small muted">Prices are quoted at the door, and a simple swap costs a visit fee.</div></div></li>
              <li><span class="icon-circle">${ic('clock')}</span><div><strong>Changes get missed.</strong><div class="small muted">Nobody reminds you until the water is slow or tastes off.</div></div></li>
            </ul>
          </section>
          <section class="stack">
            <h2 style="font-size:1.3rem;margin:0">Pilot numbers <span class="badge badge-coral" style="vertical-align:middle">Illustrative projections</span></h2>
            <div class="grid grid-2">${stats.map((s) => `<div class="stat"><div class="v">${s[0]}</div><div class="k">${s[1]}</div></div>`).join('')}</div>
            <div class="notice notice-info">${ic('shield')}<span><strong>UPKEEP sells only Sarjan's own designs</strong>, never parts made for Sarjan's OEM clients.</span></div>
          </section>
        </div>
        <section class="section-tight">
          <h2 style="font-size:1.3rem">Campaign creatives</h2>
          <div class="gallery">${ads.map((a) => `<figure><button type="button" data-action="zoom" data-src="assets/${a[0]}" data-alt="${esc(a[1])}"><img src="assets/${a[0]}" alt="UPKEEP ad: ${esc(a[1])}" loading="lazy" width="400" height="400"></button><figcaption>${esc(a[1])}</figcaption></figure>`).join('')}</div>
        </section>
      </div>`;
    }
  };

  views.notfound = {
    title: 'Not found',
    render() {
      return pageHead('Page not found', 'That page isn\'t part of the demo.') + '<div class="wrap section-tight"><a class="btn btn-primary" href="#/">Back home</a></div>';
    }
  };

  // ======================================================================
  // Router
  // ======================================================================
  const ROUTES = [
    [/^\/?$/, 'home'],
    [/^\/assist$/, 'assist'],
    [/^\/find$/, 'find'],
    [/^\/product\/([^/]+)$/, 'product'],
    [/^\/cart$/, 'cart'],
    [/^\/book$/, 'book'],
    [/^\/order$/, 'order'],
    [/^\/verify\/?(.*)$/, 'verify'],
    [/^\/reminders$/, 'reminders'],
    [/^\/pro$/, 'pro'],
    [/^\/about$/, 'about']
  ];
  let current = { name: '', params: [], path: '' };
  function parseHash() {
    const h = (location.hash || '#/').replace(/^#/, '').split('?')[0];
    for (const [re, name] of ROUTES) {
      const m = re.exec(h);
      if (m) return { name, params: m.slice(1), path: h };
    }
    return { name: 'notfound', params: [], path: h };
  }
  function view(name) { return name === 'assist' ? U.assist : views[name]; }
  function render(opts) {
    opts = opts || {};
    const r = parseHash();
    const changed = r.path !== current.path;
    current = r;
    const v = view(r.name) || views.notfound;
    const app = $('#app');
    const y = window.scrollY;
    app.innerHTML = v.render(r.params);
    document.body.dataset.route = r.name;
    document.title = (v.title ? v.title + ' · ' : '') + 'UPKEEP';
    if (r.name === 'home') document.title = 'UPKEEP · Fits right. Flows right.';
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === r.name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const fab = $('[data-fab]');
    if (fab) fab.hidden = r.name === 'assist';
    closeMenu();
    if (v.mount) v.mount(app, r.params);
    if (changed && !opts.keepScroll) {
      window.scrollTo(0, 0);
      if (opts.focus !== false) { const main = $('#main'); if (main) main.focus({ preventScroll: true }); }
    } else window.scrollTo(0, y);
    document.dispatchEvent(new CustomEvent('upkeep:rendered', { detail: r }));
  }
  function refresh() { render({ keepScroll: true }); }
  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function closeMenu() {
    const nav = $('#mobile-nav'), btn = $('[data-action="menu"]');
    if (nav) nav.classList.remove('open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  // ======================================================================
  // Actions (event delegation)
  // ======================================================================
  const actions = {
    'menu'(el) {
      const nav = $('#mobile-nav'), open = !nav.classList.contains('open');
      nav.classList.toggle('open', open);
      el.setAttribute('aria-expanded', String(open));
    },
    'modal-close'() { closeModal(); },
    'reset-demo'() {
      resetState();
      if (U.assist && U.assist.reset) U.assist.reset();
      Object.assign(findSel, { brand: '', model: '', stage: '' });
      Object.assign(bookSel, { kind: 'diagnosis', model: '', date: '', slot: '', touched: false });
      if (U.tour) U.tour.stop();
      toast('Demo reset. Cart, orders and reminders cleared.', 'refresh');
      go('#/');
    },
    'tour-start'() { if (U.tour) U.tour.start(); },
    'add'(el) {
      if (el.getAttribute('aria-disabled') === 'true') {
        toast('Add a kit first. The pre-filter is an add-on.', 'info');
        return;
      }
      if (addToCart(el.dataset.sku, { pro: el.dataset.pro === '1' })) refresh();
    },
    'add-kit-addon'(el) {
      closeModal();
      addToCart(el.dataset.sku, { silent: true });
      addToCart(el.dataset.addon, { silent: true });
      toast('Added filter kit + sediment pre-filter', 'cart', { href: '#/cart', label: 'View cart' });
      refresh();
    },
    'partner'(el) { partnerModal(el.dataset.partner, el.dataset.sku); },
    'choose-quick'(el) {
      closeModal();
      state.delivery = { type: 'quick', partner: el.dataset.partner };
      if (!state.cart.some((l) => l.sku === el.dataset.sku)) addToCart(el.dataset.sku, { silent: true });
      save();
      toast(`Delivery set: ~15 min via ${el.dataset.partner} (demo)`, 'bolt');
      go('#/cart');
    },
    'video'() {
      openModal({ title: 'Install video', body: `<div style="border-radius:12px;overflow:hidden">${S.video('Install video')}</div><p class="small muted">Demo placeholder. In the live product this plays a 3–4 minute model-specific install guide.</p>` });
    },
    'zoom'(el) {
      openModal({ cls: 'modal-img', title: el.dataset.alt, body: `<img src="${el.dataset.src}" alt="UPKEEP ad: ${esc(el.dataset.alt)}">` });
    },
    'pdp-view'(el) { pdp.view = el.dataset.view; refresh(); },
    'pdp-pro'(el) { pdp.pro = el.dataset.pro === '1'; refresh(); },
    'qty'(el) {
      const l = state.cart[+el.dataset.i];
      if (!l) return;
      l.qty = Math.max(1, Math.min(9, l.qty + (+el.dataset.d)));
      save(); refresh();
    },
    'remove'(el) {
      const l = state.cart.splice(+el.dataset.i, 1)[0];
      save(); refresh();
      if (l) toast('Removed ' + D.productBySku(l.sku).short, 'close');
    },
    'place-order'() {
      const o = placeOrder();
      if (!o) { toast('Add a kit to check out.', 'info'); return; }
      toast('Demo order placed: ' + o.id, 'check');
      go('#/order');
    },
    'order-reminder'() {
      const o = latestOrder();
      const line = o && o.lines.find((l) => D.productBySku(l.sku).kind === 'part' && D.productBySku(l.sku).fits.length === 1);
      const model = (o && o.model) || (line && D.productBySku(line.sku).fits[0]);
      addReminder(model, line && line.sku, o ? o.created : null);
      toast('WhatsApp reminder saved', 'bell', { href: '#/reminders', label: 'See reminders' });
    },
    'book-day'(el) { bookSel.date = el.dataset.iso; refresh(); },
    'book-slot'(el) { bookSel.slot = el.dataset.slot; refresh(); },
    'book-confirm'() {
      const tech = nearestTech(state.address);
      state.booking = { date: bookSel.date, slot: bookSel.slot, techId: tech.id, kind: bookSel.kind, model: bookSel.model };
      state.purifier = state.purifier || bookSel.model;
      if (bookSel.kind === 'diagnosis') addToCart('SRV-DIAG', { silent: true });
      else if (bookSel.kind === 'care') addToCart('SRV-CARE', { silent: true });
      else {
        const base = state.cart.find((l) => isBase(D.productBySku(l.sku)));
        if (base) base.pro = true;
        else addToCart(D.productFor(bookSel.model, 'kit3').sku, { pro: true, silent: true });
      }
      save();
      toast(`Booked ${tech.name} · ${fmtShort(bookSel.date)}, ${slotById(bookSel.slot).name}`, 'calendar');
      go('#/cart');
    },
    'wa-reorder'(el) { addToCart(el.dataset.sku); },
    'wa-book'() { go('#/book'); },
    'wa-later'() { toast('OK, we\'ll remind you again in 7 days.', 'clock'); },
    'rem-remove'(el) {
      state.reminders = state.reminders.filter((r) => r.id !== el.dataset.id);
      save(); refresh();
      toast('Reminder removed', 'bell');
    },
    'rem-add'(el) { addReminder(el.dataset.model); refresh(); toast('WhatsApp reminder saved', 'bell'); }
  };
  const changes = {
    'find-brand'(el) { findSel.brand = el.value; findSel.model = ''; findSel.stage = ''; refresh(); focusAfter('#f-model'); },
    'find-model'(el) { findSel.model = el.value; findSel.stage = ''; if (el.value) { state.purifier = el.value; save(); } refresh(); focusAfter('#f-model'); },
    'find-stage'(el) { findSel.stage = el.value; refresh(); focusAfter(`input[name="stage"][value="${el.value}"]`); },
    'line-pro'(el) { const l = state.cart[+el.dataset.i]; if (l) { l.pro = el.checked; save(); refresh(); focusAfter(`[data-change="line-pro"][data-i="${el.dataset.i}"]`); } },
    'delivery'(el) {
      state.delivery = { type: el.value, partner: el.value === 'quick' ? (state.delivery.partner || D.delivery.partners[0]) : null };
      save(); refresh(); focusAfter(`input[name="dlv"][value="${el.value}"]`);
    },
    'payment'(el) { state.payment = el.value; save(); },
    'address'(el) { state.address = el.value; save(); },
    'book-kind'(el) { bookSel.kind = el.value; bookSel.touched = true; refresh(); focusAfter(`input[name="bk"][value="${el.value}"]`); },
    'book-model'(el) { bookSel.model = el.value; }
  };
  function focusAfter(sel) { const el = $(sel); if (el) el.focus({ preventScroll: true }); }

  function onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const fn = actions[el.dataset.action] || (U.assist && U.assist.actions && U.assist.actions[el.dataset.action]);
    if (!fn) return;
    e.preventDefault();
    fn(el, e);
  }
  function onChange(e) {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = changes[el.dataset.change] || (U.assist && U.assist.changes && U.assist.changes[el.dataset.change]);
    if (fn) fn(el, e);
  }
  function onSubmit(e) {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    if (f.dataset.form === 'join') {
      const name = f.elements.name.value.trim(), phone = f.elements.phone.value.trim();
      if (!name || !phone) {
        toast('Please add your name and WhatsApp number.', 'info');
        (name ? f.elements.phone : f.elements.name).focus();
        return;
      }
      f.reset();
      toast(`Thanks ${name.split(' ')[0]}! Our partner team will WhatsApp you (demo).`, 'check');
    }
  }
  function onKey(e) {
    if (e.key === 'Escape' && $('[data-modal]')) { closeModal(); return; }
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'd' || e.key === 'D') && U.tour && !U.tour.active()) {
      e.preventDefault();
      U.tour.start();
    }
  }

  // ======================================================================
  // Presenter shortcut: ?demo=1 loads a ready-made cart, booking and order
  // ======================================================================
  function seedDemo() {
    resetState();
    const code = 'AQN-N10P';
    state.purifier = code;
    state.cart = [{ sku: 'KIT3-' + code, qty: 1, pro: true }, { sku: 'SED-' + code, qty: 1, pro: false }];
    state.booking = { date: next3Days()[0].iso, slot: 'morning', techId: 'T1', kind: 'install', model: code };
    const created = addDays(new Date(), -1);
    const serial = U.qr.makeSerial('KIT3-' + code, addDays(today(), -3), 9001);
    state.orders = [{
      id: 'UPK-26' + '104233', created: iso(created),
      lines: [{ sku: 'KIT3-' + code, qty: 1, pro: true, serials: [serial] }],
      totals: { parts: 999, services: 0, pro: 349, delivery: 0, hasGoods: true, total: 1348 },
      delivery: { type: 'quick', partner: 'Zepto' }, payment: 'upi', address: DEFAULT_ADDRESS,
      booking: { date: next3Days()[0].iso, slot: 'morning', techId: 'T1', kind: 'install' }, model: code
    }];
    state.reminders = [{ id: 'R-demo', model: code, sku: 'KIT3-' + code, since: iso(addMonths(today(), -6)), created: iso(new Date()) }];
    state.unit = 120;
    save();
  }

  // ======================================================================
  // Boot
  // ======================================================================
  function hydrateIcons(root) {
    $$('[data-icon]', root).forEach((el) => { el.outerHTML = ic(el.dataset.icon); });
  }
  function boot() {
    hydrateIcons(document);
    $$('[data-team]').forEach((el) => { el.textContent = D.teamName; });
    const sample = U.qr.makeSerial('KIT3-AQN-N10P', new Date(2026, 8, 1), 1);
    $$('a[href^="#/verify/"]').forEach((a) => { if (!a.closest('#app')) a.setAttribute('href', '#/verify/' + sample); });
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', () => render());
    if (/[?&]demo=1\b/.test(location.search)) {
      seedDemo();
      setTimeout(() => toast('Presenter mode: sample cart, booking and order loaded', 'sparkle'), 300);
    }
    updateCartCount();
    render({ focus: false });
  }

  U.app = {
    get state() { return state; },
    save, rupee, toast, openModal, closeModal, partnerModal, addToCart, cartHasBase, totals, placeOrder, latestOrder,
    addReminder, go, refresh, render, next3Days, nearestTech, techById, techCard, slotById, slotPicker, fmtShort, fmtDate,
    productCard, modelName, sleep, today, addMonths, current: () => current, seedDemo, resetState, $, $$
  };

  // Deferred scripts run before DOMContentLoaded, so assist.js and tour.js
  // have registered by the time boot() renders the first route.
  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot);
})();
