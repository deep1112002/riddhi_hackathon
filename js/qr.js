/* QR + verification helpers.
   - A small, dependency-free QR encoder (byte mode, error-correction level M,
     versions 1–10), so the code on the order page is a real, scannable QR.
   - Self-checking serial numbers: the verify page can validate a serial with
     no saved state, so scanning the box with any phone works. */
(function () {
  'use strict';
  var U = (window.UPKEEP = window.UPKEEP || {});

  // ---------------- QR encoder ----------------
  // [ecCodewordsPerBlock, blocksG1, dataPerBlockG1, blocksG2, dataPerBlockG2] for level M
  var EC_M = [null,
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
  var ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

  function gfMul(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xFF;
  }
  function rsDivisor(degree) {
    var r = [];
    for (var i = 0; i < degree - 1; i++) r.push(0);
    r.push(1);
    var root = 1;
    for (i = 0; i < degree; i++) {
      for (var j = 0; j < r.length; j++) {
        r[j] = gfMul(r[j], root);
        if (j + 1 < r.length) r[j] ^= r[j + 1];
      }
      root = gfMul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      div.forEach(function (c, i) { r[i] ^= gfMul(c, f); });
    });
    return r;
  }
  function utf8(str) {
    var out = [], s = unescape(encodeURIComponent(str));
    for (var i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
    return out;
  }

  function encode(text) {
    var bytes = utf8(text), ver, spec, dataCap;
    for (ver = 1; ver <= 10; ver++) {
      spec = EC_M[ver];
      dataCap = spec[1] * spec[2] + spec[3] * spec[4];
      var cntBits = ver < 10 ? 8 : 16;
      if (4 + cntBits + bytes.length * 8 <= dataCap * 8) break;
    }
    if (ver > 10) throw new Error('QR: text too long');

    // --- data bits ---
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4);
    put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, dataCap * 8 - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < dataCap * 8; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) {
      var v = 0;
      for (var k = 0; k < 8; k++) v = (v << 1) | bits[i + k];
      data.push(v);
    }

    // --- blocks + error correction, then interleave ---
    var blocks = [], ecc = [], div = rsDivisor(spec[0]), off = 0;
    for (var b = 0; b < spec[1] + spec[3]; b++) {
      var len = b < spec[1] ? spec[2] : spec[4];
      var blk = data.slice(off, off + len);
      off += len;
      blocks.push(blk);
      ecc.push(rsRemainder(blk, div));
    }
    var codewords = [], maxLen = Math.max(spec[2], spec[4]);
    for (i = 0; i < maxLen; i++) blocks.forEach(function (bl) { if (i < bl.length) codewords.push(bl[i]); });
    for (i = 0; i < spec[0]; i++) ecc.forEach(function (e) { codewords.push(e[i]); });

    // --- module matrix ---
    var size = ver * 4 + 17, mods = [], fn = [];
    for (i = 0; i < size; i++) { mods.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function set(x, y, dark) { mods[y][x] = dark; fn[y][x] = true; }

    for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) {
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var x = c[0] + dx, y = c[1] + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    });
    var al = ALIGN[ver], n = al.length;
    for (i = 0; i < n; i++) for (var j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) {
        set(al[i] + dx2, al[j] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
      }
    }
    function drawFormat(mask) {
      var d = (0 << 3) | mask; // level M = 00
      var rem = d;
      for (var q = 0; q < 10; q++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var f = ((d << 10) | rem) ^ 0x5412;
      function bit(q) { return ((f >>> q) & 1) !== 0; }
      for (q = 0; q <= 5; q++) set(8, q, bit(q));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (q = 9; q < 15; q++) set(14 - q, 8, bit(q));
      for (q = 0; q < 8; q++) set(size - 1 - q, 8, bit(q));
      for (q = 8; q < 15; q++) set(8, size - 15 + q, bit(q));
      set(8, size - 8, true);
    }
    drawFormat(0);
    if (ver >= 7) {
      var rem2 = ver;
      for (i = 0; i < 12; i++) rem2 = (rem2 << 1) ^ ((rem2 >>> 11) * 0x1F25);
      var vbits = (ver << 12) | rem2;
      for (i = 0; i < 18; i++) {
        var on = ((vbits >>> i) & 1) !== 0, a = size - 11 + i % 3, bb = Math.floor(i / 3);
        set(a, bb, on); set(bb, a, on);
      }
    }
    // zig-zag codeword placement
    var idx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        for (var jj = 0; jj < 2; jj++) {
          var x = right - jj, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
          if (!fn[y][x] && idx < codewords.length * 8) {
            mods[y][x] = ((codewords[idx >>> 3] >>> (7 - (idx & 7))) & 1) !== 0;
            idx++;
          }
        }
      }
    }
    // Mask 0: (x + y) % 2 === 0. Any valid mask decodes; we keep it fixed for determinism.
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (!fn[y][x] && (x + y) % 2 === 0) mods[y][x] = !mods[y][x];
    drawFormat(0);
    return { size: size, modules: mods, version: ver };
  }

  function toSvg(text, opts) {
    opts = opts || {};
    var q = encode(text), quiet = 4, dim = q.size + quiet * 2, path = '';
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) {
      if (q.modules[y][x]) path += 'M' + (x + quiet) + ' ' + (y + quiet) + 'h1v1h-1z';
    }
    return '<svg viewBox="0 0 ' + dim + ' ' + dim + '" shape-rendering="crispEdges" role="img" aria-label="' + (opts.label || 'QR code') + '">' +
      '<rect width="' + dim + '" height="' + dim + '" fill="#fff"/><path d="' + path + '" fill="#0B2545"/></svg>';
  }

  // ---------------- Serials ----------------
  // Format: UPK-YYMMDD-NNNN-SKUID-C
  //   YYMMDD = wet-test date, NNNN = unit number, SKUID = SKU without hyphens,
  //   C = check letter. Example: UPK-260901-0001-KIT3AQNN10P-?
  var ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  function checkChar(body) {
    var h = 7;
    for (var i = 0; i < body.length; i++) h = (h * 33 + body.charCodeAt(i)) % 1000003;
    return ALPHA[h % ALPHA.length];
  }
  function skuId(sku) { return sku.replace(/-/g, ''); }
  function pad(n, l) { n = String(n); while (n.length < l) n = '0' + n; return n; }
  function makeSerial(sku, date, unit) {
    var d = date || new Date();
    var ymd = pad(d.getFullYear() % 100, 2) + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2);
    var body = 'UPK-' + ymd + '-' + pad(unit % 10000, 4) + '-' + skuId(sku);
    return body + '-' + checkChar(body);
  }
  function parseSerial(serial) {
    var s = String(serial || '').trim().toUpperCase();
    var m = /^UPK-(\d{2})(\d{2})(\d{2})-(\d{4})-([A-Z0-9]+)-([A-Z])$/.exec(s);
    if (!m) return null;
    var body = s.slice(0, s.length - 2);
    if (checkChar(body) !== m[6]) return null;
    var product = null;
    U.data.products.forEach(function (p) { if (skuId(p.sku) === m[5]) product = p; });
    if (!product) return null;
    var year = 2000 + parseInt(m[1], 10), month = parseInt(m[2], 10), day = parseInt(m[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    var unit = parseInt(m[4], 10);
    var tested = new Date(year, month - 1, day);
    return {
      serial: s,
      product: product,
      unit: unit,
      testedOn: tested,
      batch: 'B' + m[1] + m[2] + '-' + String.fromCharCode(65 + (unit % 6)) + pad((day * 7 + unit) % 97, 2),
      pressure: (6 + (unit % 4) * 0.5).toFixed(1)
    };
  }
  // The URL a QR code points to. Uses the page's own address so it works on
  // GitHub Pages (https://<user>.github.io/<repo>/#/verify/<serial>).
  function verifyUrl(serial) {
    var base = location.href.split('#')[0].split('?')[0];
    return base + '#/verify/' + serial;
  }

  U.qr = { encode: encode, toSvg: toSvg, makeSerial: makeSerial, parseSerial: parseSerial, verifyUrl: verifyUrl, checkChar: checkChar };
})();
