/* Inline SVG illustrations and icons. Everything is drawn here so the demo
   needs no stock photos and no network. All functions return SVG strings. */
(function () {
  'use strict';
  var U = (window.UPKEEP = window.UPKEEP || {});
  var uidN = 0;
  function uid(p) { uidN += 1; return (p || 'g') + uidN; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- Icons (24×24, stroke = currentColor) ----------
  var P = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    cart: '<path d="M3 4h2l2.3 10.6a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 1.9-1.4L21 8H6.1"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
    chat: '<path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-5 4v-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" stroke-width="2.6"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    truck: '<path d="M2 6h12v10H2z"/><path d="M14 9h4l3 3.5V16h-7z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    shield: '<path d="M12 3l8 3v6c0 4.6-3.4 8.3-8 9-4.6-.7-8-4.4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    factory: '<path d="M3 21V11l5 3v-3l5 3v-3l5 3V4h3v17z"/><path d="M7 18h2M12 18h2"/>',
    wrench: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.2L3.5 17.4a1.5 1.5 0 0 0 0 2.1l1 1a1.5 1.5 0 0 0 2.1 0l5.7-5.7a4 4 0 0 0 5.2-5.3l-2.6 2.6-2.3-.6-.6-2.3z"/>',
    star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z" fill="currentColor"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    qr: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z"/><path d="M14 14h2v2h-2zM18 14h2M14 18h2M18 18h2v2M17 16v2"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.5L20 16"/><path d="M20 20v-4h-4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    drop: '<path d="M12 3c-3 4-6.5 7.8-6.5 11.4a6.5 6.5 0 0 0 13 0C18.5 10.8 15 7 12 3z"/>',
    no: '<circle cx="12" cy="12" r="9"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7"/>',
    yes: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/>',
    meh: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8"/>',
    alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.2v.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>',
    box: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
    send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>',
    phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.4"/>',
    award: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5"/>',
    leak: '<path d="M7 3v4M7 7h10V3"/><path d="M12 11c-1.6 2.2-3 3.9-3 5.6a3 3 0 0 0 6 0c0-1.7-1.4-3.4-3-5.6z"/>',
    taste: '<path d="M7 3h10l-1.5 17a1 1 0 0 1-1 .9h-5a1 1 0 0 1-1-.9z"/><path d="M7.6 9h8.8"/>',
    slow: '<path d="M4 6h9a3 3 0 0 1 3 3v2"/><path d="M16 15c-.9 1.3-1.6 2.2-1.6 3.1a1.6 1.6 0 0 0 3.2 0c0-.9-.7-1.8-1.6-3.1z"/>',
    power: '<path d="M12 3v8"/><path d="M6.5 6.5a8 8 0 1 0 11 0"/>',
    filter: '<rect x="7" y="3" width="10" height="18" rx="3"/><path d="M7 8h10M7 16h10"/>',
    whatsapp: '<path d="M4 20l1.3-4A8 8 0 1 1 8.2 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-1 .8a4 4 0 0 1-2.1-2.1l.8-1-1-2z" fill="currentColor" stroke-width="1"/>',
    expert: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M15.5 4.5l2-2M17.5 6.5l2.5-.5"/>'
  };
  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || P.info) + '</svg>';
  }

  // Brand mark: water drop with a tick (matches the logo).
  function mark(color, tick) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5c-3.3 4.3-7 8.4-7 12.2a7 7 0 0 0 14 0c0-3.8-3.7-7.9-7-12.2z" fill="' + (color || '#fff') + '"/><path d="M8.9 14.4l2.2 2.2 4.3-4.6" fill="none" stroke="' + (tick || '#0E7C7B') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  // ---------- Purifier fronts (one look per fictional model) ----------
  // Returns the inner drawing for a 120×160 canvas.
  function purifierInner(m) {
    var a = m.accent, body = m.body, dark = m.shape === 'dark';
    var panel = dark ? '#2B3D50' : '#E8F4F4';
    var s = '';
    if (m.shape === 'mini') {
      // under-counter unit with a separate faucet
      s += '<rect x="56" y="8" width="6" height="40" rx="3" fill="#9FB3C1"/>';
      s += '<path d="M59 12h22a6 6 0 0 1 6 6v6" stroke="#9FB3C1" stroke-width="6" fill="none" stroke-linecap="round"/>';
      s += '<rect x="16" y="56" width="88" height="88" rx="12" fill="' + body + '" stroke="#C9D7DD" stroke-width="2"/>';
      s += '<rect x="24" y="64" width="72" height="26" rx="7" fill="' + panel + '"/>';
      s += '<circle cx="38" cy="77" r="5" fill="' + a + '"/><rect x="48" y="73" width="38" height="3.5" rx="1.7" fill="#9FB3C1"/><rect x="48" y="79" width="26" height="3.5" rx="1.7" fill="#C9D7DD"/>';
      s += '<rect x="24" y="98" width="72" height="5" rx="2.5" fill="' + a + '"/>';
      s += labelSticker(m, 30, 112, 60, 22);
      return s;
    }
    var x = 20, w = 80;
    if (m.shape === 'wide') { x = 12; w = 96; }
    s += '<rect x="' + x + '" y="8" width="' + w + '" height="128" rx="16" fill="' + body + '" stroke="' + (dark ? '#0F1A26' : '#C9D7DD') + '" stroke-width="2"/>';
    if (m.shape === 'elite') s += '<rect x="' + (x + 4) + '" y="12" width="' + (w - 8) + '" height="120" rx="13" fill="none" stroke="' + a + '" stroke-width="2.5"/>';
    // display panel
    s += '<rect x="' + (x + 10) + '" y="20" width="' + (w - 20) + '" height="44" rx="10" fill="' + panel + '"/>';
    s += '<path d="M60 28c-4.2 5.3-8.6 10-8.6 14.4a8.6 8.6 0 0 0 17.2 0C68.6 38 64.2 33.3 60 28z" fill="' + a + '"/>';
    // indicator dots
    var cx = 60 - 12;
    for (var i = 0; i < 3; i++) s += '<circle cx="' + (cx + i * 12) + '" cy="76" r="3.6" fill="' + (i === 0 ? a : (dark ? '#4C6074' : '#C9D7DD')) + '"/>';
    s += '<text x="60" y="94" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="7" font-weight="700" fill="' + (dark ? '#9FB3C1' : '#627D98') + '">' + esc(m.type) + '</text>';
    s += labelSticker(m, 34, 102, 52, 22);
    // tap
    s += '<rect x="52" y="136" width="16" height="8" rx="2" fill="#9FB3C1"/><rect x="56" y="143" width="8" height="9" rx="2" fill="#9FB3C1"/>';
    return s;
  }
  function labelSticker(m, x, y, w, h) {
    var b = U.data ? U.data.brandById(m.brand).name : '';
    return '<g><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="3" fill="#FFFFFF" stroke="#0B2545" stroke-width="1"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + 8.5) + '" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="5.6" font-weight="700" fill="#0B2545">' + esc(b.toUpperCase()) + '</text>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + 17) + '" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="6.4" font-weight="700" fill="#0E7C7B">' + esc(m.code) + '</text></g>';
  }
  function purifierFront(m, title) {
    return '<svg viewBox="0 0 120 160" role="img" aria-label="' + esc(title || ('Front of ' + U.data.modelLabel(m))) + '">' + purifierInner(m) + '</svg>';
  }
  // A "photo" of the purifier on a wall, used as built-in sample photos.
  function samplePhoto(m) {
    var g = uid('wall');
    var walls = { 'AQN-N8': ['#F3E9DC', '#E6D6C3'], 'AQN-N10P': ['#E3ECEF', '#CBD9DE'], 'HYP-CRO': ['#EFE7F1', '#DDD0E0'], 'HYP-SRU': ['#E7EDE3', '#D3DDCB'], 'CSP-M6': ['#F1EDE4', '#DCD3C2'], 'PRH-ELT': ['#E9E6F0', '#D3CFDF'] };
    var w = walls[m.code] || ['#EEE', '#DDD'];
    var s = '<svg viewBox="0 0 150 200" role="img" aria-label="Sample photo: ' + esc(U.data.modelLabel(m)) + '">';
    s += '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + w[0] + '"/><stop offset="1" stop-color="' + w[1] + '"/></linearGradient></defs>';
    s += '<rect width="150" height="200" fill="url(#' + g + ')"/>';
    if (m.shape === 'mini') s += '<rect x="0" y="150" width="150" height="50" fill="#8D6E52"/><rect x="0" y="146" width="150" height="6" fill="#6E533C"/>';
    else s += '<rect x="0" y="176" width="150" height="24" fill="#C8B9A6" opacity=".6"/>';
    s += '<ellipse cx="75" cy="178" rx="48" ry="5" fill="#000" opacity=".08"/>';
    s += '<g transform="translate(15 16)">' + purifierInner(m) + '</g>';
    s += '<path d="M10 0L60 0L0 70z" fill="#fff" opacity=".18"/>';
    s += '</svg>';
    return s;
  }

  // ---------- Cartridges and product art ----------
  function cart(x, y, w, h, body, cap, lines, lineColor) {
    var s = '<rect x="' + x + '" y="' + (y + 6) + '" width="' + w + '" height="' + (h - 12) + '" rx="' + Math.min(10, w / 3) + '" fill="' + body + '" stroke="rgba(11,37,69,.12)"/>';
    s += '<rect x="' + (x + w * .12) + '" y="' + y + '" width="' + (w * .76) + '" height="12" rx="4" fill="' + cap + '"/>';
    s += '<rect x="' + (x + w * .12) + '" y="' + (y + h - 12) + '" width="' + (w * .76) + '" height="12" rx="4" fill="' + cap + '"/>';
    for (var i = 1; i <= lines; i++) {
      var ly = y + 12 + (h - 24) * i / (lines + 1);
      s += '<rect x="' + (x + w * .16) + '" y="' + ly + '" width="' + (w * .68) + '" height="2" rx="1" fill="' + lineColor + '"/>';
    }
    return s;
  }
  function fitTag(text, x, y) {
    var w = Math.max(52, text.length * 5.6 + 14);
    return '<g><rect x="' + (x - w / 2) + '" y="' + y + '" width="' + w + '" height="16" rx="8" fill="#0B2545"/><text x="' + x + '" y="' + (y + 11) + '" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="8" font-weight="700" fill="#fff">' + esc(text) + '</text></g>';
  }
  function productMain(p) {
    var wide = p.fits.length === 1 && U.data.modelByCode(p.fits[0]).housing === 'wide';
    var compact = p.fits.length === 1 && U.data.modelByCode(p.fits[0]).housing === 'compact';
    var tag = p.fits.length === 1 ? p.fits[0] : p.fits.length + ' models';
    var s = '<circle cx="80" cy="76" r="62" fill="#DDEFEF"/>';
    if (p.family === 'sediment') {
      var sw = wide ? 50 : 38;
      s += cart(80 - sw / 2, 28, sw, 98, '#FBF8F1', '#5BC0BE', 6, '#E3DCCB');
      if (wide) s += '<path d="M51 134h58" stroke="#0E7C7B" stroke-width="1.5"/><path d="M51 130v8M109 130v8" stroke="#0E7C7B" stroke-width="1.5"/><text x="80" y="128" text-anchor="middle" font-family="Inter,Arial" font-size="7" font-weight="700" fill="#0E7C7B">7 cm</text>';
    } else if (p.family === 'kit3') {
      var w1 = wide ? 36 : 30;
      s += cart(28, 36, w1, 88, '#FBF8F1', '#5BC0BE', 5, '#E3DCCB');
      s += cart(28 + w1 + 8, 30, 30, 96, '#1E4E79', '#5BC0BE', 4, '#2F6694');
      s += cart(28 + w1 + 46, 44, 24, 80, '#0E7C7B', '#0B2545', 3, '#11938F');
    } else if (p.family === 'membrane') {
      s += '<g transform="rotate(-28 80 76)">' + cart(64, 14 + (compact ? 12 : 0), 32, compact ? 100 : 124, '#2F6FA3', '#0B2545', 0, '#fff') +
        '<rect x="64" y="' + (54 + (compact ? 6 : 0)) + '" width="32" height="30" fill="#5BC0BE"/><text x="80" y="' + (73 + (compact ? 6 : 0)) + '" text-anchor="middle" font-family="Inter,Arial" font-size="9" font-weight="800" fill="#0B2545">80</text></g>';
    } else if (p.family === 'annual') {
      s += '<rect x="30" y="40" width="100" height="78" rx="8" fill="#fff" stroke="#0B2545" stroke-width="2"/>';
      s += '<rect x="30" y="40" width="100" height="18" rx="8" fill="#0E7C7B"/><rect x="30" y="50" width="100" height="8" fill="#0E7C7B"/>';
      s += '<g transform="translate(40 66) scale(.9)">' + '<path d="M12 2.5c-3.3 4.3-7 8.4-7 12.2a7 7 0 0 0 14 0c0-3.8-3.7-7.9-7-12.2z" fill="#0E7C7B"/><path d="M8.9 14.4l2.2 2.2 4.3-4.6" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></g>';
      s += '<text x="66" y="80" font-family="Manrope,Inter,Arial" font-size="9" font-weight="800" fill="#0B2545">ANNUAL KIT</text>';
      s += '<text x="66" y="92" font-family="Inter,Arial" font-size="6.5" fill="#627D98">membrane + all filters</text>';
      s += cart(46, 18, 16, 30, '#FBF8F1', '#5BC0BE', 1, '#E3DCCB') + cart(68, 14, 16, 34, '#1E4E79', '#5BC0BE', 1, '#2F6694') + cart(90, 20, 22, 28, '#2F6FA3', '#0B2545', 0, '#fff');
      s += '<rect x="30" y="40" width="100" height="18" rx="8" fill="#0E7C7B"/><text x="80" y="52.5" text-anchor="middle" font-family="Manrope,Inter,Arial" font-size="8" font-weight="800" fill="#fff" letter-spacing="1.5">UPKEEP</text>';
    }
    s += fitTag(tag, 80, 138);
    return s;
  }
  function productBox(p) {
    var s = '<rect x="22" y="22" width="116" height="116" rx="10" fill="#fff" stroke="#0B2545" stroke-width="2"/>';
    s += '<rect x="22" y="22" width="116" height="30" rx="10" fill="#0B2545"/><rect x="22" y="40" width="116" height="12" fill="#0B2545"/>';
    s += '<text x="80" y="42" text-anchor="middle" font-family="Manrope,Inter,Arial" font-size="12" font-weight="800" fill="#fff" letter-spacing="2">UPKEEP</text>';
    s += '<text x="34" y="70" font-family="Inter,Arial" font-size="8" font-weight="700" fill="#0B2545">' + esc(p.short) + '</text>';
    s += '<text x="34" y="82" font-family="ui-monospace,Menlo,monospace" font-size="7" fill="#0E7C7B">' + esc(p.sku) + '</text>';
    s += '<text x="34" y="96" font-family="Inter,Arial" font-size="6" fill="#627D98">Made &amp; wet-tested by</text><text x="34" y="104" font-family="Inter,Arial" font-size="6" font-weight="700" fill="#627D98">Sarjan Watertech</text>';
    s += miniQr(100, 92, 30, p.sku);
    s += '<rect x="34" y="114" width="56" height="12" rx="6" fill="#E3F3EA"/><text x="62" y="122.5" text-anchor="middle" font-family="Inter,Arial" font-size="6.5" font-weight="700" fill="#1F6B41">EXACT FIT</text>';
    return s;
  }
  function productLabel(p) {
    var s = '<rect x="18" y="34" width="124" height="92" rx="10" fill="#fff" stroke="#C9D7DD" stroke-width="2"/>';
    s += '<text x="30" y="54" font-family="Manrope,Inter,Arial" font-size="9" font-weight="800" fill="#0B2545">FIT CARD</text>';
    s += '<text x="30" y="66" font-family="Inter,Arial" font-size="6.5" fill="#627D98">Check this code against your model label</text>';
    p.fits.slice(0, 4).forEach(function (c, i) {
      s += '<rect x="' + (30 + (i % 2) * 52) + '" y="' + (74 + Math.floor(i / 2) * 18) + '" width="48" height="14" rx="4" fill="#E8F4F4"/><text x="' + (54 + (i % 2) * 52) + '" y="' + (83.5 + Math.floor(i / 2) * 18) + '" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="6.5" font-weight="700" fill="#0E7C7B">' + esc(c) + '</text>';
    });
    s += '<path d="M118 80l5 5 9-10" stroke="#2E8B57" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    return s;
  }
  // Decorative QR-like pattern (deterministic). Real QR codes come from qr.js.
  function miniQr(x, y, size, seed) {
    var n = 9, c = size / n, h = 0, s = '<rect x="' + x + '" y="' + y + '" width="' + size + '" height="' + size + '" fill="#fff"/>';
    for (var k = 0; k < seed.length; k++) h = (h * 31 + seed.charCodeAt(k)) >>> 0;
    for (var r = 0; r < n; r++) for (var q = 0; q < n; q++) {
      var finder = (r < 3 && q < 3) || (r < 3 && q > 5) || (r > 5 && q < 3);
      var on;
      if (finder) on = true;
      else { h = (h * 1103515245 + 12345) >>> 0; on = (h >>> 16) & 1; }
      if (on) s += '<rect x="' + (x + q * c) + '" y="' + (y + r * c) + '" width="' + c + '" height="' + c + '" fill="#0B2545"/>';
    }
    return s;
  }
  function serviceArt(p) {
    var name = p.sku === 'SRV-DIAG' ? 'wrench' : p.sku === 'SRV-CARE' ? 'calendar' : 'wrench';
    return '<circle cx="80" cy="80" r="56" fill="#DDEFEF"/><g transform="translate(50 50) scale(2.5)" color="#0E7C7B">' + P[name].replace(/<path /g, '<path fill="none" stroke="#0E7C7B" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ').replace(/<circle /g, '<circle fill="none" stroke="#0E7C7B" stroke-width="1.6" ').replace(/<rect /g, '<rect fill="none" stroke="#0E7C7B" stroke-width="1.6" ') + '</g>';
  }
  function product(p, view) {
    var inner, label = p.name;
    if (p.kind === 'service') inner = serviceArt(p);
    else if (view === 'box') { inner = productBox(p); label += ' — retail box with QR label'; }
    else if (view === 'label') { inner = productLabel(p); label += ' — fit card'; }
    else inner = productMain(p);
    return '<svg viewBox="0 0 160 160" role="img" aria-label="' + esc(label) + '">' + inner + '</svg>';
  }

  // ---------- Stage diagram (Find page + product page) ----------
  function stageDiagram(m, highlight) {
    var stages = m.stages.slice();
    var hasUV = m.type.indexOf('UV') > -1;
    var nodes = stages.map(function (id) { return { id: id, label: U.data.stages[id].short, months: U.data.stages[id].months }; });
    if (hasUV) nodes.splice(nodes.length - (stages.indexOf('uf') > -1 ? 1 : 0), 0, { id: 'uv', label: 'UV lamp', months: 0 });
    var step = 92, pad = 70, W = pad * 2 + step * (nodes.length - 1) + 40, H = 180;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Stages of the ' + esc(U.data.modelLabel(m)) + (highlight ? ', ' + esc((U.data.stages[highlight] || {}).name || '') + ' highlighted' : '') + '">';
    s += '<path d="M14 70H' + (W - 14) + '" stroke="#5BC0BE" stroke-width="4" stroke-dasharray="2 7" stroke-linecap="round"/>';
    s += '<text x="14" y="52" font-family="Inter,Arial" font-size="11" font-weight="600" fill="#627D98">Tap in</text>';
    s += '<text x="' + (W - 14) + '" y="52" text-anchor="end" font-family="Inter,Arial" font-size="11" font-weight="600" fill="#627D98">Clean water</text>';
    nodes.forEach(function (n, i) {
      var cx = pad + 20 + i * step;
      var hl = n.id === highlight || (highlight === 'all' && n.id !== 'uv');
      var fill = n.id === 'uv' ? '#EDE9FB' : n.id === 'membrane' ? '#2F6FA3' : n.id === 'sediment' ? '#FBF8F1' : n.id === 'uf' ? '#DCEFF7' : '#1E4E79';
      var w = n.id === 'sediment' && m.housing === 'wide' ? 40 : n.id === 'membrane' ? 30 : 32;
      if (n.id === 'uv') {
        s += '<rect x="' + (cx - 16) + '" y="40" width="32" height="60" rx="16" fill="' + fill + '" stroke="#8E7CC3" stroke-width="2"/><path d="M' + cx + ' 50v40" stroke="#8E7CC3" stroke-width="4" stroke-linecap="round"/>';
      } else {
        if (hl) s += '<rect x="' + (cx - w / 2 - 7) + '" y="23" width="' + (w + 14) + '" height="94" rx="14" fill="#FDEBDC" stroke="#F28C38" stroke-width="3"/>';
        s += '<g>' + cart(cx - w / 2, 30, w, 80, fill, '#5BC0BE', 3, n.id === 'sediment' ? '#E3DCCB' : 'rgba(255,255,255,.25)') + '</g>';
      }
      s += '<text x="' + cx + '" y="136" text-anchor="middle" font-family="Inter,Arial" font-size="11.5" font-weight="700" fill="' + (hl ? '#B15A12' : '#0B2545') + '">' + esc(n.label) + '</text>';
      s += '<text x="' + cx + '" y="152" text-anchor="middle" font-family="Inter,Arial" font-size="10" fill="#627D98">' + (n.months ? 'every ' + n.months + ' mo' : 'not a filter') + '</text>';
      if (hl && highlight !== 'all') s += '<g><rect x="' + (cx - 34) + '" y="2" width="68" height="18" rx="9" fill="#F28C38"/><text x="' + cx + '" y="14.5" text-anchor="middle" font-family="Inter,Arial" font-size="9.5" font-weight="700" fill="#3A1F05">Change this</text></g>';
    });
    s += '</svg>';
    return s;
  }

  // ---------- Misc illustrations ----------
  function video(title) {
    var s = '<svg viewBox="0 0 320 180" role="img" aria-label="' + esc(title || 'Install video') + '">';
    s += '<rect width="320" height="180" fill="#0B2545"/><circle cx="250" cy="40" r="80" fill="#13315C"/><circle cx="40" cy="170" r="60" fill="#0E3B5C"/>';
    s += cart(60, 40, 30, 90, '#FBF8F1', '#5BC0BE', 4, '#E3DCCB') + cart(100, 34, 30, 96, '#1E4E79', '#5BC0BE', 4, '#2F6694');
    s += '<path d="M150 110c10-20 24-26 40-20" stroke="#5BC0BE" stroke-width="3" fill="none" stroke-dasharray="4 5"/>';
    s += '<circle cx="210" cy="90" r="30" fill="#F28C38"/><path d="M202 76v28l23-14z" fill="#3A1F05"/>';
    s += '<rect x="244" y="14" width="62" height="20" rx="10" fill="rgba(255,255,255,.12)"/><text x="275" y="28" text-anchor="middle" font-family="Inter,Arial" font-size="10" font-weight="600" fill="#fff">3:40</text>';
    s += '</svg>';
    return s;
  }

  U.svg = { icon: icon, mark: mark, purifierFront: purifierFront, samplePhoto: samplePhoto, product: product, stageDiagram: stageDiagram, video: video, esc: esc };
})();
