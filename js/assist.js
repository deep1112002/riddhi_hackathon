/* UPKEEP Assist — the demo chatbot.
 *
 * A small, deterministic state machine. Nothing here calls a network service.
 *
 *   greet ──symptom──▶ askModel ──model/photo──▶ diagnose ──▶ recommend
 *     │                                              │            ├─▶ booking ─▶ reminder
 *     └──model/photo──▶ askSymptom ──symptom─────────┘            └─▶ cart ────▶ reminder
 *   unknown model at any point ──▶ handoff (human expert on WhatsApp)
 *
 * In the live product, a real LLM + vision model would replace matchModel()
 * (reading the model label from text or a photo) and diagnose() (mapping
 * symptoms to the failed stage). Everything else — the exact-fit catalogue,
 * the honesty rule ("if it isn't mapped, don't guess"), booking and
 * reminders — stays as it is.
 */
(function () {
  'use strict';
  const U = (window.UPKEEP = window.UPKEEP || {});
  const D = U.data, S = U.svg, ic = S.icon, esc = S.esc;
  const A = () => U.app;

  const SYMPTOMS = {
    slow: { label: 'Water is slow', icon: 'slow' },
    taste: { label: 'Tastes or smells odd', icon: 'taste' },
    leak: { label: 'Leaking', icon: 'leak' },
    change: { label: 'Time for a filter change', icon: 'filter' },
    tds: { label: 'Salty / high TDS', icon: 'drop' },
    notworking: { label: 'Not working', icon: 'power' }
  };
  const SAMPLE_PHOTOS = ['AQN-N10P', 'HYP-SRU', 'CSP-M6', 'PRH-ELT'];
  const LAST_CHANGED = [['lt6', 'Under 6 months'], ['6to12', '6–12 months'], ['gt12', 'Over a year'], ['unsure', 'Not sure']];

  // ------------------------------------------------------------------
  // Conversation state (kept in memory so it survives page changes)
  // ------------------------------------------------------------------
  let convo, seq = 0, queue = Promise.resolve();
  function fresh() {
    return { token: Math.random(), stage: 'greet', model: null, confidence: null, how: null, symptom: null, product: null, lastChanged: null, booking: { date: '', slot: '' }, booked: null, msgs: [] };
  }
  convo = fresh();

  const api = { speed: 1 };
  const wait = (ms) => A().sleep(ms * api.speed);
  const now = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  // ------------------------------------------------------------------
  // Matching (the parts an LLM + vision model would replace)
  // ------------------------------------------------------------------
  function norm(t) { return ' ' + String(t || '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim() + ' '; }
  function squash(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9+]/g, ''); }

  /** matchModel(text) → { model, brand } — keyword match on names and label codes. */
  function matchModel(text) {
    const n = norm(text), sq = squash(text);
    let best = null, bestLen = 0;
    D.models.forEach((m) => {
      m.aliases.forEach((a) => {
        const an = norm(a).trim(), asq = squash(a);
        const hit = n.indexOf(' ' + an + ' ') > -1 || (/\d/.test(asq) && asq.length >= 3 && sq.indexOf(asq) > -1);
        if (hit && an.length > bestLen) { best = m; bestLen = an.length; }
      });
    });
    const brands = { aquanova: ['aquanova', 'aqua nova'], hydrapure: ['hydrapure', 'hydra pure', 'hydra'], clearsip: ['clearsip', 'clear sip'], purahome: ['purahome', 'pura home', 'pura'] };
    let brand = null;
    Object.keys(brands).forEach((b) => { brands[b].forEach((w) => { if (n.indexOf(' ' + w + ' ') > -1 || sq.indexOf(squash(w)) > -1) brand = b; }); });
    if (best && brand && best.brand !== brand) best = null; // e.g. "HydraPure Neo 8" is not a real pairing
    return { model: best, brand };
  }
  const STOP = ['in', 'it', 'for', 'after', 'about', 'every', 'last', 'since', 'around', 'than', 'ago', 'my', 'the', 'is', 'was', 'of', 'at', 'by', 'to', 'tds', 'ppm', 'over', 'under', 'only', 'just', 'nearly', 'almost', 'its', 'been', 'past', 'within', 'like', 'have', 'has', 'had', 'and', 'or', 'are', 'from', 'on', 'be', 'a', 'an', 'all', 'some', 'gpd'];
  function looksLikeModel(text) {
    if (/\bmodel\b|\bpurifier is\b|\bi have an?\b/i.test(text)) return true;
    const re = /\b([a-z]+)[\s-]?(\d{1,4})\b/gi;
    let m;
    while ((m = re.exec(text))) { if (STOP.indexOf(m[1].toLowerCase()) === -1) return true; }
    return false;
  }
  const SYMPTOM_WORDS = [
    ['leak', ['leak', 'leaks', 'leaking', 'drip', 'drips', 'dripping', 'puddle', 'water on the floor', 'overflow', 'overflowing']],
    ['notworking', ['not working', 'no power', 'dead', 'won t start', 'wont start', 'not starting', 'stopped working', 'not turning on', 'no light', 'beeping', 'no water', 'switched off', 'doesn t work', 'doesnt work']],
    ['tds', ['tds', 'salty', 'salt', 'brackish', 'hard water', 'ppm']],
    ['taste', ['taste', 'tastes', 'smell', 'smells', 'odour', 'odor', 'bitter', 'stale', 'funny', 'chlorine', 'plastic', 'smelly']],
    ['slow', ['slow', 'slowly', 'low flow', 'less water', 'trickle', 'trickles', 'takes long', 'takes ages', 'low pressure', 'weak flow', 'barely']],
    ['change', ['filter change', 'change', 'changing', 'replace', 'replacement', 'due', 'service', 'servicing', 'time for', 'new filter', 'annual', 'refill']]
  ];
  function matchSymptom(text) {
    const n = norm(text);
    for (const [key, words] of SYMPTOM_WORDS) {
      for (const w of words) if (n.indexOf(' ' + w + ' ') > -1) return key;
    }
    return null;
  }

  const DIAG = {
    slow: { cause: 'Slow flow usually means the sediment or carbon stage is clogged.', stage: 'sediment', family: 'kit3' },
    taste: { cause: 'Odd taste or smell comes from the carbon stages. Once saturated, they stop polishing the water.', stage: 'precarbon', family: 'kit3' },
    tds: { cause: 'A salty taste or high TDS usually means the RO membrane is tired.', stage: 'membrane', family: 'membrane' },
    change: { cause: 'Routine change. For most homes that\'s the 3-stage kit every 6–12 months.', stage: 'sediment', family: 'kit3' },
    leak: { cause: 'Leaks usually come from a housing O-ring or a push-fit fitting. That needs a look, not a guessed part.', stage: null, visit: true },
    notworking: { cause: 'No power or no water can be the adapter, the pump or a valve. A diagnosis visit is the safe next step.', stage: null, visit: true }
  };
  /** diagnose(symptom, model, lastChanged) → { cause, stage, product, advice, visit } */
  function diagnose(symptom, code, last) {
    const d = DIAG[symptom] || DIAG.change;
    if (d.visit) return { cause: d.cause, stage: null, visit: true, product: D.productBySku('SRV-DIAG'), advice: 'A Sarjan-trained technician checks it and quotes before doing any work.' };
    let family = d.family, advice;
    if (last === 'gt12') {
      family = 'annual';
      advice = 'Over a year in, the membrane is probably tired too. The complete annual kit covers every stage in one go.';
    } else if (last === 'lt6') {
      advice = symptom === 'tds'
        ? 'A new membrane shouldn\'t drift this soon. Fit the membrane, or book a ₹349 visit to check the pre-filters first.'
        : symptom === 'taste'
          ? 'Changed recently? Run the tap for 2 minutes after a long gap. If the taste stays, the carbon is saturated and the kit is the fix.'
          : 'Changed recently? Check the inlet valve is fully open first. A silty supply can clog the sediment stage early; the kit is still the fix.';
    } else if (last === '6to12') {
      advice = symptom === 'tds' ? 'Membranes last about 24 months, but high-TDS supply wears them sooner. A fresh membrane should bring TDS down.' : 'Right on schedule. A fresh 3-stage kit should bring things back to normal.';
    } else if (last === 'unsure') {
      advice = 'No problem. Start here, and I\'ll set reminders from today so you never have to guess again.';
    } else {
      advice = 'When did you last change it? Tap below and I\'ll fine-tune this.';
    }
    const product = D.productFor(code, family);
    return { cause: d.cause, stage: family === 'annual' ? 'all' : d.stage, product, advice, visit: false };
  }

  // ------------------------------------------------------------------
  // Message rendering
  // ------------------------------------------------------------------
  function botAvatar() { return `<div class="mini-av" aria-hidden="true">${S.mark('#fff', '#0E7C7B')}</div>`; }
  function chipsHtml(m) {
    if (!m.chips || !m.chips.length) return '';
    return `<div class="chips" role="group" aria-label="Quick replies" data-used="${m.used != null}" style="margin-top:8px">
      ${m.chips.map((c) => `<button type="button" class="chip" data-action="as-chip" data-mid="${m.id}" data-act="${c.act}" data-val="${esc(c.val || '')}" aria-pressed="${m.used != null && m.used === c.act + ':' + (c.val || '')}" ${m.used != null && c.act !== 'nav' ? 'disabled' : ''}>${c.icon ? ic(c.icon) : ''}${esc(c.label)}</button>`).join('')}
    </div>`;
  }
  function body(m) {
    const d = m.data || {};
    switch (m.type) {
      case 'text': return `<div class="bubble">${d.html}</div>`;
      case 'photo': return `<div class="user-photo">${d.src ? `<img src="${d.src}" alt="Your uploaded photo">` : S.samplePhoto(D.modelByCode(d.sample))}</div>`;
      case 'scan': return `<div class="scan ${d.done ? 'done' : ''}" aria-live="polite">${d.src ? `<img src="${d.src}" alt="">` : S.samplePhoto(D.modelByCode(d.sample))}<div class="scan-tint"></div><div class="scanline"></div><div class="scan-label">${d.done ? ic('check').replace('class="ic ', 'style="width:12px;height:12px;vertical-align:-2px" class="ic ') + ' Label read' : 'Reading the model label…'}</div></div>`;
      case 'detect': {
        const md = D.modelByCode(d.code);
        return `<div class="chat-card detect" data-tour="detect"><div class="d-art">${S.purifierFront(md)}</div><div>
          <div class="tiny muted" style="font-weight:700;letter-spacing:.06em">DETECTED</div>
          <div class="d-title">${esc(D.modelLabel(md))}</div>
          <div class="small">${esc(md.type)} · code <code>${md.code}</code></div>
          <div class="conf" aria-hidden="true"><span style="width:${d.conf}%"></span></div>
          <div class="tiny muted">${d.conf}% confident${md.housingNote ? ' · ' + esc(md.housingNote) : ''}</div></div></div>`;
      }
      case 'picker': return `<div class="chat-card">
          <h4>Snap or upload the model label</h4>
          <p class="small muted" style="margin:0">It's usually on the side or under the front cover.</p>
          <div class="row" style="margin-top:10px"><label class="btn btn-primary btn-sm upload-btn">${ic('upload')} Upload a photo<input type="file" accept="image/*" data-change="as-file" aria-label="Upload a photo of your purifier"></label></div>
          <div class="small" style="margin-top:12px;font-weight:600;color:var(--navy)">Or try a sample photo</div>
          <div class="photo-pick">${SAMPLE_PHOTOS.map((c) => `<button type="button" data-action="as-sample" data-code="${c}" aria-label="Sample photo: ${esc(D.modelLabel(D.modelByCode(c)))}">${S.samplePhoto(D.modelByCode(c))}<span>${esc(D.brandById(D.modelByCode(c).brand).name)}</span></button>`).join('')}</div>
        </div>`;
      case 'rec': return recCard(m);
      case 'quick': return `<div class="chat-card"><h4>Delivered in ~15 min</h4><p class="small muted">Pick a quick-commerce partner. In the demo this shows what would open.</p>
          <div class="partner-row">${D.delivery.partners.map((n) => `<button class="partner-btn" type="button" data-action="partner" data-partner="${n}" data-sku="${d.sku}">${n}<small>~15 min</small></button>`).join('')}</div></div>`;
      case 'booking': return bookingCard(m);
      case 'tech': {
        const t = A().techById(d.techId), sl = A().slotById(d.slot);
        return `<div class="chat-card stack" data-tour="tech">
          <h4>${ic('check').replace('class="ic ', 'style="width:18px;height:18px;color:var(--success);vertical-align:-3px" class="ic ')} Booked: ${A().fmtShort(d.date)} · ${sl.name} (${sl.time})</h4>
          ${A().techCard(t)}
          <p class="tiny muted" style="margin:0">If no UPKEEP partner is free, we can request an overflow booking with a partner service network (demo).</p>
          <div class="row"><a class="btn btn-cta btn-sm" href="#/cart">${ic('cart')} Go to checkout</a></div>
        </div>`;
      }
      case 'handoff': return `<div class="handoff">${d.done ? ic('whatsapp').replace('class="ic ', 'style="width:20px;height:20px;color:var(--success)" class="ic ') : '<span class="spinner" aria-hidden="true"></span>'}<span>${d.done ? 'Connected to an UPKEEP expert on WhatsApp' : 'Connecting you to an UPKEEP expert on WhatsApp…'}</span></div>`;
      default: return '';
    }
  }
  function recCard(m) {
    const r = diagnose(convo.symptom, convo.model, convo.lastChanged);
    const p = r.product;
    const stageName = r.stage === 'all' ? 'All stages' : r.stage ? D.stages[r.stage].name : 'Housing / fittings';
    if (r.visit) {
      return `<div class="chat-card rec" data-tour="rec">
        <div class="rec-cause"><span class="icon-circle">${ic('wrench')}</span><div><div class="tiny muted" style="font-weight:700;letter-spacing:.06em">LIKELY CAUSE</div><div>${esc(r.cause)}</div></div></div>
        <div class="rec-advice">${esc(r.advice)}</div>
        <div class="rec-actions">
          <button class="btn btn-cta" type="button" data-action="as-book">${ic('calendar')} Book a diagnosis visit (${A().rupee(p.price)})</button>
          <button class="btn btn-secondary" type="button" data-action="as-expert">${ic('whatsapp')} Talk to an expert</button>
        </div></div>`;
    }
    return `<div class="chat-card rec" data-tour="rec">
      <div class="rec-cause"><span class="icon-circle">${ic('sparkle')}</span><div><div class="tiny muted" style="font-weight:700;letter-spacing:.06em">LIKELY CAUSE · ${esc(stageName.toUpperCase())}</div><div>${esc(r.cause)}</div></div></div>
      <div class="rec-prod">
        <div class="thumb">${S.product(p)}</div>
        <div><span class="badge badge-fit">${ic('check')} Exact fit</span>
          <div class="name" style="margin-top:4px"><a href="#/product/${p.sku}" style="color:inherit">${esc(p.name)}</a></div>
          <div><span class="price" style="font-size:1.15rem">${A().rupee(p.price)}</span> <span class="incl">incl. GST</span></div>
          <div class="tiny muted">${esc(D.madeBy)}</div></div>
      </div>
      <div><div class="small" style="font-weight:700;color:var(--navy);margin-bottom:6px">Last changed?</div>
        <div class="chips" role="group" aria-label="Last changed">${LAST_CHANGED.map((l) => `<button type="button" class="chip" data-action="as-last" data-val="${l[0]}" aria-pressed="${convo.lastChanged === l[0]}">${l[1]}</button>`).join('')}</div></div>
      <div class="rec-advice" aria-live="polite">${esc(r.advice)}</div>
      <div class="rec-actions">
        <button class="btn btn-primary" type="button" data-action="as-cart">${ic('cart')} Add to cart</button>
        <button class="btn btn-cta" type="button" data-action="as-quick">${ic('bolt')} Buy · delivered in ~15 min</button>
        <button class="btn btn-secondary" type="button" data-action="as-book">${ic('wrench')} Book a technician (${A().rupee(D.prices.install)})</button>
        <button class="btn btn-ghost" type="button" data-action="as-market">Compare on marketplaces</button>
      </div>
    </div>`;
  }
  function bookingCard(m) {
    const b = convo.booking, done = m.data && m.data.done;
    return `<div class="chat-card stack" data-tour="booking">
      <h4>${convo.symptom && DIAG[convo.symptom] && DIAG[convo.symptom].visit ? 'Book a diagnosis visit · ' + A().rupee(D.prices.diagnosis) : 'Add a pro to fit it · ' + A().rupee(D.prices.install)}</h4>
      ${done ? `<p class="small muted" style="margin:0">Booked for ${A().fmtShort(b.date)} · ${A().slotById(b.slot).name}.</p>` : A().slotPicker(b, 'as')}
      ${done ? '' : `<button class="btn btn-cta" type="button" data-action="as-confirm" ${b.date && b.slot ? '' : 'disabled'}>Confirm and assign nearest technician</button>`}
    </div>`;
  }
  function msgHtml(m) {
    const card = ['detect', 'picker', 'rec', 'booking', 'tech', 'quick', 'handoff'].indexOf(m.type) > -1;
    if (m.from === 'user') {
      return `<div class="msg user" data-mid="${m.id}"><div>${body(m)}<div class="meta">You · ${m.time}</div></div></div>`;
    }
    if (m.from === 'expert') {
      return `<div class="msg expert" data-mid="${m.id}"><div class="mini-av" aria-hidden="true">KV</div><div>${body(m)}${chipsHtml(m)}<div class="meta"><span class="badge badge-human">${ic('user')} Human expert</span> Kavya · UPKEEP fit team · ${m.time}</div></div></div>`;
    }
    return `<div class="msg bot ${card ? 'wide' : ''}" data-mid="${m.id}">${botAvatar()}<div>${body(m)}${chipsHtml(m)}<div class="meta">UPKEEP Assist · ${m.time}</div></div></div>`;
  }

  // ------------------------------------------------------------------
  // DOM helpers
  // ------------------------------------------------------------------
  function log() { return document.querySelector('[data-chat-log]'); }
  function scrollDown() {
    const l = log();
    if (l) requestAnimationFrame(() => { l.scrollTop = l.scrollHeight; });
  }
  function add(from, type, data, chips) {
    seq += 1;
    const m = { id: 'm' + seq, from, type, data: data || {}, chips: chips || null, used: null, time: now() };
    convo.msgs.push(m);
    const l = log();
    if (l) {
      const t = l.querySelector('[data-typing]');
      const tmp = document.createElement('div');
      tmp.innerHTML = msgHtml(m);
      l.insertBefore(tmp.firstElementChild, t || null);
      scrollDown();
    }
    return m;
  }
  function update(m) {
    const el = document.querySelector(`[data-mid="${m.id}"]`);
    if (el) {
      const tmp = document.createElement('div');
      tmp.innerHTML = msgHtml(m);
      tmp.firstElementChild.style.animation = 'none';
      el.replaceWith(tmp.firstElementChild);
    }
  }
  function typing(on) {
    const l = log();
    if (!l) return;
    let t = l.querySelector('[data-typing]');
    if (on && !t) {
      t = document.createElement('div');
      t.className = 'msg bot';
      t.setAttribute('data-typing', '');
      t.innerHTML = botAvatar() + '<div class="typing" aria-label="UPKEEP Assist is typing"><span></span><span></span><span></span></div>';
      l.appendChild(t);
      scrollDown();
    } else if (!on && t) t.remove();
  }
  // Queue bot output so replies arrive in order with a typing indicator.
  function bot(type, data, chips, opts) {
    opts = opts || {};
    const token = convo.token;
    let made = null;
    queue = queue.then(async () => {
      if (token !== convo.token) return;
      typing(true);
      await wait(opts.delay != null ? opts.delay : 650);
      typing(false);
      if (token !== convo.token) return;
      made = add(opts.from || 'bot', type, data, chips);
      if (opts.after) await opts.after(made);
    });
    return queue.then(() => made);
  }
  const say = (html, chips, opts) => bot('text', { html }, chips, opts);
  function side() {
    const el = document.querySelector('[data-side]');
    if (el) { el.innerHTML = sideHtml(); el.querySelectorAll('.card').forEach((c) => c.classList.add('fill-in')); }
  }

  // ------------------------------------------------------------------
  // Flow
  // ------------------------------------------------------------------
  function symptomChips(withPhoto) {
    const c = ['slow', 'taste', 'leak', 'change'].map((k) => ({ act: 'symptom', val: k, label: SYMPTOMS[k].label, icon: SYMPTOMS[k].icon }));
    if (withPhoto) c.push({ act: 'photo', label: 'Upload a photo', icon: 'camera' });
    return c;
  }
  function greet() {
    convo.stage = 'greet';
    return say('Hi, I\'m UPKEEP Assist. Tell me what\'s going on with your purifier, or snap its model label and I\'ll find the exact part.', symptomChips(true), { delay: 350 });
  }
  function askModel() {
    convo.stage = 'askModel';
    const chips = D.models.map((m) => ({ act: 'model', val: m.code, label: D.modelLabel(m) }));
    chips.unshift({ act: 'photo', label: 'Upload a photo', icon: 'camera' });
    chips.push({ act: 'notsure', label: 'Not sure' });
    return say('Got it. Which purifier is it? Snap the model label, or pick yours:', chips);
  }
  function askSymptom() {
    convo.stage = 'askSymptom';
    return say('What\'s going on with it?', symptomChips(false).concat([{ act: 'symptom', val: 'tds', label: 'Salty / high TDS', icon: 'drop' }]));
  }
  function setModel(code, conf, how) {
    convo.model = code;
    convo.confidence = conf || null;
    convo.how = how || 'text';
    const st = A().state;
    st.purifier = code;
    A().save();
    side();
  }
  function afterModel() {
    if (convo.symptom) return recommend();
    return askSymptom();
  }
  function recommend() {
    convo.stage = 'recommend';
    const r = diagnose(convo.symptom, convo.model, convo.lastChanged);
    convo.product = r.product.sku;
    side();
    const md = D.modelByCode(convo.model);
    const intro = r.visit
      ? `Thanks. For a <strong>${esc(SYMPTOMS[convo.symptom].label.toLowerCase())}</strong> issue on your ${esc(D.modelLabel(md))}, I'd rather not guess a part.`
      : `Here's what fits your <strong>${esc(D.modelLabel(md))}</strong> exactly:`;
    return say(intro).then(() => bot('rec', {}, null, { delay: 700 }));
  }
  function handoff() {
    convo.stage = 'handoff';
    return say('That model isn\'t mapped yet, so I won\'t guess.')
      .then(() => bot('handoff', { done: false }, null, {
        delay: 400,
        after: async (m) => { await wait(1800); m.data.done = true; update(m); }
      }))
      .then(() => bot('text', { html: 'Hi, I\'m Kavya from the UPKEEP fit team. Could you send a photo of the label on the side or back of your purifier? I\'ll confirm the exact part, usually within 10 minutes.' },
        [{ act: 'photo', label: 'Send a photo of the label', icon: 'camera' }], { from: 'expert', delay: 900 }));
  }
  function showPicker() {
    convo.stage = 'photo';
    return bot('picker', {}, null, { delay: 450 });
  }
  function runPhoto(src, code, conf) {
    add('user', 'photo', src ? { src } : { sample: code });
    return bot('scan', src ? { src } : { sample: code }, null, {
      delay: 350,
      after: async (m) => { await wait(2400); m.data.done = true; update(m); }
    }).then(() => {
      setModel(code, conf, 'photo');
      return bot('detect', { code, conf }, null, { delay: 300 });
    }).then(afterModel);
  }
  function askReminder() {
    return say('Want a WhatsApp reminder before your next change?', [
      { act: 'remind', val: 'yes', label: 'Yes, remind me', icon: 'bell' },
      { act: 'remind', val: 'no', label: 'No thanks' }
    ]);
  }
  function openBooking() {
    convo.stage = 'booking';
    return bot('booking', {}, null, { delay: 450 });
  }
  function confirmBooking(m) {
    const b = convo.booking;
    if (!b.date || !b.slot) return Promise.resolve();
    const st = A().state;
    const tech = A().nearestTech(st.address);
    const isVisit = DIAG[convo.symptom] && DIAG[convo.symptom].visit;
    st.booking = { date: b.date, slot: b.slot, techId: tech.id, kind: isVisit ? 'diagnosis' : 'install', model: convo.model };
    A().save();
    if (isVisit) A().addToCart('SRV-DIAG', { silent: true });
    else A().addToCart(convo.product, { pro: true, silent: true });
    convo.booked = { date: b.date, slot: b.slot, techId: tech.id };
    if (m) { m.data.done = true; update(m); }
    side();
    add('user', 'text', { html: esc(`${A().fmtShort(b.date)}, ${A().slotById(b.slot).name}`) });
    return say(`Done. I've assigned the nearest UPKEEP partner${isVisit ? '' : ' and added the part with Pro install to your cart'}.`)
      .then(() => bot('tech', { date: b.date, slot: b.slot, techId: tech.id }, null, { delay: 500 }))
      .then(askReminder);
  }

  // Free-text input
  function handleText(text) {
    text = String(text || '').trim();
    if (!text) return Promise.resolve();
    add('user', 'text', { html: esc(text) });
    if (/^(start over|restart|reset)$/i.test(text)) { startOver(); return Promise.resolve(); }
    const mm = matchModel(text);
    const sym = matchSymptom(text);
    if (sym) convo.symptom = sym;
    if (mm.model) {
      setModel(mm.model.code, null, 'text');
      return say(`Thanks, that's the <strong>${esc(D.modelLabel(mm.model))}</strong> · ${esc(mm.model.type)} · code <code>${mm.model.code}</code>.`).then(afterModel);
    }
    if (mm.brand && !mm.model && (looksLikeModel(text) || !sym)) {
      // Known brand, but the model name isn't one we've mapped.
      if (looksLikeModel(text)) return handoff();
      const models = D.models.filter((m) => m.brand === mm.brand);
      return say(`Which ${esc(D.brandById(mm.brand).name)} model is it?`, models.map((m) => ({ act: 'model', val: m.code, label: m.name })).concat([{ act: 'photo', label: 'Upload a photo', icon: 'camera' }]));
    }
    if (!sym && (looksLikeModel(text) || convo.stage === 'askModel')) return handoff();
    if (sym) {
      if (convo.model) return recommend();
      return askModel();
    }
    if (/\b(hi|hello|hey|namaste)\b/i.test(text)) return say('Hello! What\'s happening with your purifier?', symptomChips(true));
    return say('I can help with slow water, odd taste, leaks, filter changes or reading your model label. Which is closest?', symptomChips(true));
  }

  function startOver() {
    convo = fresh();
    queue = Promise.resolve();
    const l = log();
    if (l) l.innerHTML = '';
    side();
    return greet();
  }

  // ------------------------------------------------------------------
  // Side panel ("Your purifier")
  // ------------------------------------------------------------------
  function sideHtml() {
    const md = convo.model && D.modelByCode(convo.model);
    const r = convo.symptom && md ? diagnose(convo.symptom, convo.model, convo.lastChanged) : null;
    const stageHl = r && r.stage;
    let html = `<div class="card"><h2>${ic('drop')} Your purifier</h2>`;
    if (!md) {
      html += `<div class="sp-empty"><span class="icon-circle">${ic('camera')}</span><span>I'll fill this in as we chat. A photo of the model label is quickest.</span></div></div>`;
    } else {
      html += `<div class="sp-unit"><div class="art">${S.purifierFront(md)}</div><div>
          <div style="font-weight:800;color:var(--navy);font-family:var(--font-head)">${esc(D.modelLabel(md))}</div>
          <div class="small muted">${esc(md.type)} · <code style="color:var(--teal-dark);font-weight:600">${md.code}</code></div>
          <div class="tiny muted">${convo.how === 'photo' ? `From photo · ${convo.confidence}% confident` : 'From your message'}</div></div></div>
        <hr class="divider" style="margin:14px 0 8px">
        ${md.stages.map((id) => `<div class="sp-stage ${stageHl === id || stageHl === 'all' ? 'hl' : ''}"><span>${D.stages[id].name}</span><span>every ${D.stages[id].months} mo</span></div>`).join('')}
      </div>`;
    }
    if (convo.symptom) {
      html += `<div class="card"><h2>${ic('info')} Issue</h2><ul class="sp-list">
        <li><span>Symptom</span><span>${esc(SYMPTOMS[convo.symptom].label)}</span></li>
        ${r ? `<li><span>Likely stage</span><span>${r.stage === 'all' ? 'All stages' : r.stage ? esc(D.stages[r.stage].name) : 'Housing / fittings'}</span></li>` : ''}
        ${convo.lastChanged ? `<li><span>Last changed</span><span>${esc(LAST_CHANGED.find((l) => l[0] === convo.lastChanged)[1])}</span></li>` : ''}
      </ul></div>`;
    }
    if (r && r.product) {
      html += `<div class="card"><h2>${ic('shield')} Recommended</h2><ul class="sp-list">
        <li><span>${r.visit ? 'Service' : 'Exact fit'}</span><span>${esc(r.product.short)}</span></li>
        <li><span>Price</span><span>${A().rupee(r.product.price)}</span></li>
        ${r.visit ? '' : `<li><span>Made by</span><span>Sarjan Watertech</span></li>`}
      </ul></div>`;
    }
    if (convo.booked) {
      const t = A().techById(convo.booked.techId);
      html += `<div class="card"><h2>${ic('calendar')} Technician</h2><ul class="sp-list">
        <li><span>When</span><span>${A().fmtShort(convo.booked.date)} · ${A().slotById(convo.booked.slot).name}</span></li>
        <li><span>Who</span><span>${esc(t.name)} · ${t.rating.toFixed(1)}★</span></li></ul></div>`;
    }
    return html;
  }

  // ------------------------------------------------------------------
  // Page
  // ------------------------------------------------------------------
  api.title = 'UPKEEP Assist';
  api.render = function () {
    return `<div class="assist-page"><div class="wrap assist-grid">
      <section class="chat" aria-label="Chat with UPKEEP Assist" data-tour="chat">
        <div class="chat-head">
          <div class="bot-av" aria-hidden="true">${S.mark('#fff', '#0E7C7B')}</div>
          <div style="flex:1;min-width:0"><div class="title">UPKEEP Assist</div><div class="status">Online<span class="long">&nbsp;· replies instantly</span>&nbsp;(demo)</div></div>
          <button class="btn btn-ghost btn-sm" type="button" data-action="as-restart">${ic('refresh')} Start over</button>
        </div>
        <div class="chat-log" data-chat-log role="log" aria-live="polite" aria-relevant="additions"></div>
        <form class="chat-input" data-chat-form autocomplete="off">
          <button class="icon-btn" type="button" data-action="as-photo" aria-label="Send a photo">${ic('camera')}</button>
          <label class="sr-only" for="chat-text">Message</label>
          <input id="chat-text" class="input" name="msg" placeholder="Describe the problem or type your model…" maxlength="200">
          <button class="icon-btn send" type="submit" aria-label="Send">${ic('send')}</button>
        </form>
      </section>
      <aside class="side-panel" data-side aria-label="Your purifier">${sideHtml()}</aside>
    </div></div>`;
  };
  api.mount = function () {
    const l = log();
    l.innerHTML = convo.msgs.map(msgHtml).join('');
    l.querySelectorAll('.msg').forEach((el) => { el.style.animation = 'none'; });
    l.scrollTop = l.scrollHeight;
    const f = document.querySelector('[data-chat-form]');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = f.elements.msg.value;
      f.elements.msg.value = '';
      handleText(v);
    });
    if (!convo.msgs.length) greet();
  };
  api.reset = function () { convo = fresh(); queue = Promise.resolve(); };

  // ------------------------------------------------------------------
  // Actions (dispatched by app.js event delegation)
  // ------------------------------------------------------------------
  function findMsg(id) { return convo.msgs.find((m) => m.id === id); }
  api.actions = {
    'as-chip'(el) {
      const m = findMsg(el.dataset.mid);
      const act = el.dataset.act, val = el.dataset.val;
      if (act === 'nav') { A().go(val); return; }
      if (m) { if (m.used != null) return; m.used = act + ':' + val; update(m); }
      const label = el.textContent.trim();
      if (act === 'symptom') {
        add('user', 'text', { html: esc(label) });
        convo.symptom = val;
        side();
        if (convo.model) recommend(); else askModel();
      } else if (act === 'model') {
        add('user', 'text', { html: esc(label) });
        setModel(val, null, 'text');
        say(`Great, the ${esc(D.modelLabel(D.modelByCode(val)))} · code <code>${val}</code>.`).then(afterModel);
      } else if (act === 'photo') {
        add('user', 'text', { html: esc(label) });
        showPicker();
      } else if (act === 'notsure') {
        add('user', 'text', { html: 'Not sure' });
        say('No problem. A photo of the label is the quickest way, and I\'ll read it for you.').then(showPicker);
      } else if (act === 'remind') {
        add('user', 'text', { html: esc(label) });
        if (val === 'yes') {
          const st = A().state;
          A().addReminder(convo.model || st.purifier, convo.product && D.productBySku(convo.product).kind === 'part' ? convo.product : null);
          const due = A().addMonths(A().today(), 6);
          say(`Done. I'll message you on WhatsApp before ${A().fmtShort(due)}, when the sediment stage is next due. Reply STOP any time.`, [
            { act: 'nav', val: '#/reminders', label: 'See reminders', icon: 'bell' },
            { act: 'nav', val: '#/cart', label: 'View cart', icon: 'cart' }
          ]);
        } else {
          say('No problem. Your cart is ready whenever you are.', [{ act: 'nav', val: '#/cart', label: 'View cart', icon: 'cart' }]);
        }
      }
    },
    'as-sample'(el) {
      if (convo.stage === 'scanning') return;
      convo.stage = 'scanning';
      runPhoto(null, el.dataset.code, 98);
    },
    'as-photo'() { showPicker(); },
    'as-restart'() { startOver(); },
    'as-last'(el) {
      convo.lastChanged = el.dataset.val;
      const r = diagnose(convo.symptom, convo.model, convo.lastChanged);
      convo.product = r.product.sku;
      const rec = [...convo.msgs].reverse().find((m) => m.type === 'rec');
      if (rec) update(rec);
      side();
      const btn = document.querySelector(`[data-action="as-last"][data-val="${el.dataset.val}"]`);
      if (btn) btn.focus({ preventScroll: true });
    },
    'as-cart'() {
      const p = D.productBySku(convo.product);
      A().addToCart(p.sku);
      add('user', 'text', { html: 'Add to cart' });
      say(`Added the ${esc(p.short.toLowerCase())} to your cart.`, [
        { act: 'nav', val: '#/cart', label: 'View cart', icon: 'cart' }
      ]).then(askReminder);
    },
    'as-quick'() {
      add('user', 'text', { html: 'Buy · delivered in ~15 min' });
      bot('quick', { sku: convo.product }, null, { delay: 400 });
    },
    'as-market'() {
      const sku = convo.product;
      A().openModal({
        title: 'Compare on marketplaces',
        body: `<div class="notice notice-info">${ic('info')}<div><strong>Demo:</strong> In the live product this opens the partner app with the exact SKU <span class="serial">${esc(sku)}</span>.</div></div>
          <p class="small muted">UPKEEP listings on marketplaces carry the same model-matched SKUs and fit promise.</p>`,
        actions: D.delivery.marketplaces.map((n) => `<button class="btn btn-secondary" type="button" data-action="partner" data-partner="${n}" data-sku="${sku}">${n}</button>`).join('')
      });
    },
    'as-book'() {
      add('user', 'text', { html: 'Book a technician' });
      openBooking();
    },
    'as-expert'() {
      add('user', 'text', { html: 'Talk to an expert' });
      convo.stage = 'handoff';
      bot('handoff', { done: false }, null, { delay: 300, after: async (m) => { await wait(1500); m.data.done = true; update(m); } })
        .then(() => bot('text', { html: 'Hi, I\'m Kavya from the UPKEEP fit team. A short video or photo of where it\'s leaking helps a lot. Meanwhile, I can hold tomorrow morning\'s diagnosis slot for you.' }, [{ act: 'photo', label: 'Send a photo', icon: 'camera' }], { from: 'expert', delay: 900 }));
    },
    'as-day'(el) { convo.booking.date = el.dataset.iso; refreshBooking(); },
    'as-slot'(el) { convo.booking.slot = el.dataset.slot; refreshBooking(); },
    'as-confirm'() {
      const m = [...convo.msgs].reverse().find((x) => x.type === 'booking');
      confirmBooking(m);
    }
  };
  function refreshBooking() {
    const m = [...convo.msgs].reverse().find((x) => x.type === 'booking');
    if (m) update(m);
  }
  api.changes = {
    'as-file'(el) {
      const file = el.files && el.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { A().toast('Please choose an image file.', 'info'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        convo.stage = 'scanning';
        // Any uploaded photo maps to the AquaNova Neo 10 Plus in the demo.
        runPhoto(reader.result, 'AQN-N10P', 92);
      };
      reader.readAsDataURL(file);
    }
  };

  // ------------------------------------------------------------------
  // Hooks for the guided demo (tour.js) and tests
  // ------------------------------------------------------------------
  api.idle = () => queue;
  api.startOver = startOver;
  api.samplePhoto = (code) => { convo.stage = 'scanning'; return queue.then(() => runPhoto(null, code || 'AQN-N10P', 98)); };
  api.symptom = (key) => queue.then(() => {
    add('user', 'text', { html: esc(SYMPTOMS[key].label) });
    convo.symptom = key;
    side();
    return convo.model ? recommend() : askModel();
  });
  api.book = (autoConfirm) => queue.then(() => {
    add('user', 'text', { html: 'Book a technician' });
    return openBooking();
  }).then((m) => {
    if (!autoConfirm) return m;
    convo.booking.date = A().next3Days()[0].iso;
    convo.booking.slot = 'morning';
    update(m);
    return wait(500).then(() => confirmBooking(m));
  });
  api.text = (t) => queue.then(() => handleText(t));
  api.state = () => convo;
  api.matchModel = matchModel;
  api.matchSymptom = matchSymptom;
  api.diagnose = diagnose;

  U.assist = api;
})();
