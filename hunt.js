/* Linkwell "talent hunt" band.
   Scenes are drawn as smooth vector shapes into a tiny offscreen canvas (1 px per cell), then
   re-rendered as a halftone: one dot per cell, dot size from coverage, colour snapped to the
   Linkwell palette. The camera glides continuously through one looping world:
   fisherman -> chameleon -> prospector -> spider -> whale -> back to the fisherman.
*/
(function () {
  var canvas = document.getElementById('hunt');
  if (!canvas || !canvas.getContext) return;
  var out = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;

  // ---------- palette ----------
  var P = {
    ink: '#101114', ink2: '#5c6370', grey: '#9aa1ad', acc: '#5352e8', acc2: '#8f8af2',
    light: '#c9c8f7', pale: '#e6e5fb', white: '#ffffff'
  };
  var NAMES = Object.keys(P);
  var RGB = NAMES.map(function (k) { var h = P[k]; return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; });
  var nearestCache = new Int8Array(32768).fill(-1);
  function nearest(r, g, b) {
    var key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    var c = nearestCache[key];
    if (c >= 0) return c;
    var best = 0, bd = 1e9;
    for (var i = 0; i < RGB.length; i++) {
      var dr = r - RGB[i][0], dg = g - RGB[i][1], db = b - RGB[i][2];
      var d = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (d < bd) { bd = d; best = i; }
    }
    nearestCache[key] = best;
    return best;
  }

  // ---------- layout ----------
  var ROWS = 80, GY = 60, SURF = 61.5, S = 1.35, SURFG = GY + 1.5 * S;
  var cols = 260, cell = 5.5, dpr = 1, NL = 8;
  var off = document.createElement('canvas');
  var g = off.getContext('2d', { willReadFrequently: true });
  var sprites = [], bg = null;

  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    cols = Math.max(150, Math.min(340, Math.round(w / 5.5)));
    cell = w / cols;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(ROWS * cell * dpr);
    canvas.style.height = (ROWS * cell) + 'px';
    canvas.parentNode && (canvas.parentNode.style.minHeight = (ROWS * cell) + 'px');
    off.width = cols; off.height = ROWS;
    g.lineCap = 'round'; g.lineJoin = 'round';
    var cs = cell * dpr, s = Math.ceil(cs);
    sprites = RGB.map(function (rgb, ci) {
      var lv = [];
      for (var l = 0; l < NL; l++) {
        var c = document.createElement('canvas'); c.width = c.height = s;
        var x = c.getContext('2d');
        x.fillStyle = P[NAMES[ci]];
        x.beginPath(); x.arc(s / 2, s / 2, cs * (0.13 + 0.35 * l / (NL - 1)), 0, TAU); x.fill();
        lv.push(c);
      }
      return lv;
    });
    bg = document.createElement('canvas'); bg.width = canvas.width; bg.height = canvas.height;
    var b = bg.getContext('2d'); b.fillStyle = '#e8eaee';
    for (var vy = 0; vy < ROWS; vy++) for (var vx = 0; vx < cols; vx++) {
      var f = edgeFade(vx, vy);
      if (f < 0.05) continue;
      b.globalAlpha = f;
      b.beginPath(); b.arc((vx + 0.5) * cs, (vy + 0.5) * cs, cs * 0.1, 0, TAU); b.fill();
    }
  }
  function edgeFade(x, y) {
    var e = cols * 0.08;
    var fx = Math.min(1, (x + 0.5) / e, (cols - 0.5 - x) / e);
    var fy = Math.min(1, (ROWS - 0.5 - y) / 12);
    fx = Math.max(0, fx); fy = Math.max(0, fy);
    return fx * fx * (3 - 2 * fx) * fy * fy * (3 - 2 * fy);
  }

  // ---------- drawing helpers (units = cells) ----------
  function C(name, a) { g.globalAlpha = a == null ? 1 : a; g.fillStyle = g.strokeStyle = P[name] || name; }
  function circ(x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fill(); }
  function ring(x, y, r, w) { g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
  function ell(x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); g.fill(); }
  function seg(x0, y0, x1, y1, w) { g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  function quad(x0, y0, cx, cy, x1, y1, w) { g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke(); }
  function poly(pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t) * (1 - t); }
  function easeIn(t) { t = clamp(t, 0, 1); return t * t * t; }
  function prog(tau, a, b) { return clamp((tau - a) / (b - a), 0, 1); }
  function hash(x, y) { var h = (x * 374761393 + (y || 0) * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function sparkle(x, y, s, name) { C(name || 'acc', 1); seg(x - s, y, x + s, y, 0.35); seg(x, y - s, x, y + s, 0.35); }
  function mixHex(a, b, t) {
    var A = P[a] || a, B = P[b] || b;
    var c = [0, 1, 2].map(function (i) {
      var x = parseInt(A.substr(1 + i * 2, 2), 16), y = parseInt(B.substr(1 + i * 2, 2), 16);
      return Math.round(lerp(x, y, t));
    });
    return '#' + c.map(function (v) { return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }

  // ---------- world ----------
  var SPACING = 290, L = SPACING * 5;
  var X = { fisher: 145, cham: 435, eagle: 725, spider: 1015, shark: 1305 };
  function isWater(wx) {
    wx = ((wx % L) + L) % L;
    return (wx >= X.fisher - 1 && wx < X.fisher + 98) || (wx >= X.shark - 120 && wx < X.shark + 140);
  }
  var cam = 0, camRaw = 0, speed = 14;

  function drawBackdrop(t) {
    var hx0 = camRaw * 0.35, ridge = [];
    for (var sx = -2; sx <= cols + 2; sx += 1) {
      var x = hx0 + sx;
      ridge.push(sx, GY - 9 - 5 * Math.sin(x * 0.019) - 2.5 * Math.sin(x * 0.051 + 1.3) - 1.2 * Math.sin(x * 0.13));
    }
    C('pale', 0.45); poly([-2, GY + 1].concat(ridge).concat([cols + 2, GY + 1]));
    C('light', 0.8); g.lineWidth = 0.6; g.beginPath(); g.moveTo(ridge[0], ridge[1]); for (var r = 2; r < ridge.length; r += 2) g.lineTo(ridge[r], ridge[r + 1]); g.stroke();
    var cx0 = camRaw * 0.12;
    for (var i = 0; i < 6; i++) {
      var base = i * 140 + 40;
      var cxp = ((base - cx0) % 840 + 840) % 840 - 80;
      if (cxp < -40 || cxp > cols + 40) continue;
      var cy = 7 + (i % 3) * 6;
      C('pale', 1);
      ell(cxp, cy, 9, 2.2); ell(cxp - 4, cy + 0.6, 5, 1.8); ell(cxp + 5, cy - 0.6, 5.5, 2.2); ell(cxp + 1, cy - 1.6, 4, 1.8);
    }
    // a few birds, drifting a little faster than the clouds
    var bx0 = camRaw * 0.6 - t * 6;
    for (i = 0; i < 4; i++) {
      var bxp = ((i * 230 + 60 - bx0) % 920 + 920) % 920 - 40;
      if (bxp < -10 || bxp > cols + 10) continue;
      var byp = 14 + (i % 2) * 7 + Math.sin(t * 0.8 + i) * 2;
      for (var f = 0; f < 3; f++) {
        var fx = bxp + f * 4.5 - (f === 1 ? 1.5 : 0), fy = byp + (f === 1 ? -2 : 0) + (f === 2 ? 1.2 : 0);
        var flap = Math.sin(t * 7 + i * 2 + f) * 1.1;
        C('ink2', 0.9); g.lineWidth = 0.45; g.beginPath(); g.moveTo(fx - 1.6, fy - flap); g.quadraticCurveTo(fx - 0.6, fy - 0.5, fx, fy + 0.2); g.quadraticCurveTo(fx + 0.6, fy - 0.5, fx + 1.6, fy - flap); g.stroke();
      }
    }
  }

  function drawGround(t) {
    var frac = cam - Math.floor(cam);
    var x0 = Math.floor(cam);
    for (var i = -2; i <= cols + 2; i++) {
      var wx = x0 + i, sx = i - frac;
      if (isWater(wx)) {
        C('light', 0.38); g.fillRect(sx, SURFG, 1.04, ROWS - SURFG);
        var wy = SURFG + 0.45 * Math.sin(wx * 0.35 + t * 2.2) + 0.25 * Math.sin(wx * 0.9 - t * 3.1);
        C('acc2', 0.9); g.fillRect(sx, wy - 0.5, 1.04, 0.9);
        if (hash(wx, Math.floor(t * 2)) > 0.97) { C('white', 1); g.fillRect(sx, wy - 0.5, 1, 1); }
      } else {
        C('grey', 0.16); g.fillRect(sx, GY + 1, 1.04, ROWS - GY);
        C('ink2', 0.95); g.fillRect(sx, GY - 0.4, 1.04, 0.9);
        for (var y = GY + 3; y < ROWS; y++) if (hash(wx, y) > 0.965) { C('grey', 0.6); g.fillRect(sx + 0.1, y, 0.8, 0.8); }
        if (hash(wx, 99) > 0.78) {
          var len = 1.6 + hash(wx, 7) * 3.2, sway = Math.sin(t * 1.6 + wx * 0.7) * 0.7;
          C('acc2', 0.85); quad(sx + 0.5, GY - 0.3, sx + 0.5 + sway * 0.3, GY - len * 0.6, sx + 0.5 + sway, GY - len, 0.5);
        }
      }
    }
  }

  var BUSHES = [X.fisher - 120, X.fisher + 150, X.cham + 125, X.eagle - 115, X.eagle + 140, X.spider - 120, X.spider + 120];
  function drawBushes(t) {
    for (var b = 0; b < BUSHES.length; b++) {
      var dx = ((BUSHES[b] - cam) % L + L) % L; if (dx > L - 40) dx -= L;
      if (dx < -20 || dx > cols + 20) continue;
      for (var k = 0; k < 14; k++) {
        var a = hash(b * 31 + k, 61) * Math.PI, d = hash(b * 31 + k, 62);
        var x = dx + Math.cos(a) * (2 + d * 5), y = GY - 1 - Math.sin(a) * (1 + d * 3.5);
        C(['acc', 'acc2', 'light'][k % 3], 1); ell(x, y + Math.sin(t * 1.2 + k) * 0.15, 1.6, 1.2);
      }
      if (b % 2 === 0) { C('ink2', 1); ell(dx + 8, GY - 0.8, 1.8, 1.1); C('grey', 1); ell(dx + 7.6, GY - 1.3, 0.8, 0.4); }
    }
  }

  // ---------- scene: fisherman ----------
  function sceneFisher(tau, t) {
    var fx = -9, r, sw = 0, rx = 0;
    for (r = 0; r < 4; r++) {
      rx = 1.5 + r * 1.3; sw = Math.sin(t * 1.4 + r) * 0.6;
      C(r % 2 ? 'acc' : 'acc2', 0.9); quad(rx, SURF + 1, rx + sw * 0.4, SURF - 4, rx + sw, SURF - 6.5 - r % 2 * 1.5, 0.45);
    }
    C('ink2', 0.9); ell(rx + sw, SURF - 7.5, 0.4, 1.1);
    var hipY = GY - 7.5;
    C('ink'); seg(fx - 0.9, hipY, fx - 1.3, GY - 0.6, 1.5); seg(fx + 0.9, hipY, fx + 1.5, GY - 0.6, 1.5);
    C('ink2'); ell(fx - 1.3, GY - 0.5, 1.3, 0.6); ell(fx + 1.7, GY - 0.5, 1.3, 0.6);
    C('acc');
    g.beginPath(); g.moveTo(fx - 2.4, hipY + 0.6); g.lineTo(fx - 2.1, GY - 14.8);
    g.quadraticCurveTo(fx, GY - 16.4, fx + 2.1, GY - 14.8); g.lineTo(fx + 2.5, hipY + 0.6); g.closePath(); g.fill();
    C('acc2'); g.fillRect(fx - 1.5, GY - 12, 1.3, 1.3); g.fillRect(fx + 0.5, GY - 12, 1.3, 1.3);
    C('light'); circ(fx + 0.4, GY - 17.5, 2);
    C('ink2'); ell(fx + 1.2, GY - 16.3, 1.2, 0.7);
    C('ink2'); ell(fx + 0.3, GY - 19.1, 3.5, 0.75); ell(fx + 0.3, GY - 20.4, 2, 1.5);
    var H = { x: fx + 3.8, y: GY - 11.4 };
    C('acc'); seg(fx + 1.2, GY - 14.4, fx + 2.6, GY - 12.1, 1.3); seg(fx + 2.6, GY - 12.1, H.x, H.y, 1.2);

    var th;
    if (tau < -0.8) th = 78 + Math.sin(t * 1.2) * 2;
    else if (tau < 0) th = lerp(78, 122, ease(prog(tau, -0.8, 0)));
    else if (tau < 0.35) th = lerp(122, 24, easeOut(prog(tau, 0, 0.35)));
    else if (tau < 4.3) th = lerp(24, 32, ease(prog(tau, 0.35, 1.6)));
    else th = lerp(32, 74, easeOut(prog(tau, 4.3, 4.9)));
    var bend = 0;
    if (tau > 3.5 && tau < 5.2) bend = Math.sin(prog(tau, 3.5, 5.2) * Math.PI) * (2.4 + Math.sin(t * 24) * 0.4);
    if (tau >= 5.2) bend = 1.1 + Math.sin(t * 5) * 0.25;
    var rad = th * Math.PI / 180, dx = Math.cos(rad), dy = -Math.sin(rad), Lr = 16;
    var butt = { x: H.x - dx * 2.5, y: H.y - dy * 2.5 };
    var mid = { x: H.x + dx * Lr * 0.5 + bend * 0.6, y: H.y + dy * Lr * 0.5 + bend };
    var tip = { x: H.x + dx * Lr + bend * 0.4, y: H.y + dy * Lr + bend * 2.2 };
    C('ink'); quad(butt.x, butt.y, mid.x, mid.y, tip.x, tip.y, 0.55);
    C('ink2'); circ(H.x - dx * 0.8, H.y - dy * 0.8, 0.8);
    C('light'); circ(H.x, H.y, 0.7);

    var B = { x: 38, y: SURF - 0.3 }, bob = null, sag = 2.5;
    if (tau < 0.25) bob = { x: tip.x, y: tip.y + 3 };
    else if (tau < 1.25) {
      var f = prog(tau, 0.25, 1.25);
      bob = { x: lerp(tip.x, B.x, f), y: lerp(tip.y, B.y, f) - Math.sin(f * Math.PI) * 13 }; sag = 0.5;
    } else if (tau < 4.5) {
      var dip = tau > 3.5 ? 2.2 * Math.sin(prog(tau, 3.5, 4.5) * Math.PI) : (tau > 3.0 ? Math.sin(t * 18) * 0.4 : 0);
      bob = { x: B.x, y: B.y + Math.sin(t * 2.6) * 0.3 + dip };
    }
    if (bob) {
      C('grey', 0.9); quad(tip.x, tip.y, (tip.x + bob.x) / 2, Math.max(tip.y, bob.y) + sag, bob.x, bob.y, 0.3);
      C('acc'); circ(bob.x, bob.y, 0.75); C('white'); circ(bob.x, bob.y - 0.4, 0.35);
    }
    [1.25, 1.7, 3.6].forEach(function (s) {
      var p = prog(tau, s, s + 1.4);
      if (p > 0 && p < 1) { C('acc', (1 - p) * 0.9); g.lineWidth = 0.35; g.beginPath(); g.ellipse(B.x, SURF + 0.2, 1 + p * 9, 0.4 + p * 1.6, 0, 0, TAU); g.stroke(); }
    });
    var fish = null, fang = 0;
    if (tau < 3.5) {
      var s = ease(prog(tau, 0.8, 3.3));
      fish = { x: lerp(66, 40.5, s) + Math.sin(t * 1.2) * (1 - s) * 2, y: lerp(SURF + 6.5, SURF + 3.2, s) + Math.sin(t * 2) * 0.4 };
    } else if (tau < 4.6) {
      fish = { x: 40.5 + Math.sin(t * 30) * 0.4, y: SURF + 2.6 - prog(tau, 3.5, 4.6) * 1.2 };
    } else if (tau < 5.4) {
      var h = easeOut(prog(tau, 4.6, 5.4));
      fish = { x: lerp(40, tip.x + 0.3, h), y: lerp(SURF, tip.y + 5.5, h) - Math.sin(h * Math.PI) * 9 };
      fang = lerp(0, Math.PI / 2, h);
      C('grey', 0.9); seg(tip.x, tip.y, fish.x, fish.y - 2, 0.3);
    } else {
      fish = { x: tip.x + Math.sin(t * 3) * 0.8, y: tip.y + 5.5 };
      fang = Math.PI / 2 + Math.sin(t * 3) * 0.12 + Math.sin(t * 9) * 0.12;
      C('grey', 0.9); seg(tip.x, tip.y, fish.x, fish.y - 2.6, 0.3);
    }
    if (fish) {
      g.save(); g.translate(fish.x, fish.y); g.rotate(fang);
      var wag = Math.sin(t * 10) * 0.6;
      C('acc'); ell(0, 0, 3.4, 1.35);
      poly([2.6, 0, 5 + wag * 0.3, -1.6 + wag, 5 - wag * 0.3, 1.6 + wag]);
      C('acc2'); ell(0.4, -0.9, 1.2, 0.5, -0.2); ell(-0.2, 0.5, 2.2, 0.4);
      C('white'); circ(-2.1, -0.35, 0.38); C('ink'); circ(-2.2, -0.35, 0.18);
      g.restore();
    }
    if (tau > 4.6 && tau < 5.8) {
      var q = tau - 4.6;
      for (var i = 0; i < 16; i++) {
        var vx = (hash(i, 3) - 0.5) * 14, vy = -8 - hash(i, 4) * 10;
        var x = 40 + vx * q, y = SURF + vy * q + 16 * q * q;
        if (y < SURF + 0.5) { C(i % 3 ? 'acc2' : 'acc', 1 - q / 1.2); circ(x, y, 0.45); }
      }
    }
    if (tau > 5.6 && tau < 8) {
      for (var k = 0; k < 4; k++) {
        var a = t * 2 + k * TAU / 4, rr = 6 + Math.sin(t * 3 + k) * 0.8;
        if (Math.sin(t * 6 + k * 2) > -0.2) sparkle(tip.x + Math.cos(a) * rr, tip.y + 5 + Math.sin(a) * rr * 0.6, 0.8, 'acc');
      }
    }
  }

  // ---------- scene: chameleon ----------
  function sceneCham(tau, t) {
    var tx = -32, i, b, c, s;
    C('ink2'); g.beginPath(); g.moveTo(tx - 2.6, GY); g.quadraticCurveTo(tx - 1.6, GY - 15, tx - 2.2, GY - 31);
    g.lineTo(tx + 2.2, GY - 31); g.quadraticCurveTo(tx + 1.6, GY - 18, tx + 3, GY); g.closePath(); g.fill();
    C('ink', 0.6); for (b = 0; b < 5; b++) seg(tx - 0.6 + (b % 2), GY - 4 - b * 5, tx - 0.4 + (b % 2), GY - 6.5 - b * 5, 0.3);
    C('ink2'); g.lineWidth = 1.7; g.beginPath(); g.moveTo(tx + 1, GY - 20); g.bezierCurveTo(tx + 18, GY - 21, tx + 34, GY - 19, tx + 58, GY - 18.5); g.stroke();
    g.lineWidth = 0.8; g.beginPath(); g.moveTo(tx + 44, GY - 19); g.quadraticCurveTo(tx + 50, GY - 24, tx + 55, GY - 25.5); g.stroke();
    for (i = 0; i < 90; i++) {
      var a = hash(i, 11) * TAU, d = Math.sqrt(hash(i, 12)) * 11;
      var x = tx + Math.cos(a) * d * 1.35 + Math.sin(t * 0.9 + i * 0.3) * 0.35, y = GY - 33 + Math.sin(a) * d * 0.62;
      var sh = (y - (GY - 33)) / 8 + hash(i, 15) * 0.6;
      C(sh > 0.7 ? 'acc' : sh > 0.1 ? 'acc2' : 'light', 1); ell(x, y, 1.5 + hash(i, 13) * 1.1, 1.1 + hash(i, 14) * 0.6, hash(i, 16) * 3);
    }
    for (i = 0; i < 6; i++) { C(i % 2 ? 'light' : 'acc2', 0.9); ell(tx + 53 + i * 1.2, GY - 26 + Math.sin(t + i) * 0.3 - (i % 3), 1.4, 0.7, -0.5); }

    var cx = tx + 24, cy = GY - 20.1;
    var step = tau < 0 ? Math.sin(t * 2.2) * 0.35 : 0;
    var shift = (Math.sin(t * 0.7) + 1) / 2;
    var flush = tau > 3.3 && tau < 5 ? Math.sin(prog(tau, 3.3, 5) * Math.PI) : 0;
    var body = mixHex(mixHex('acc', 'acc2', shift * 0.7), 'light', flush * 0.6);
    var dark = mixHex(body, 'ink', 0.35);
    var fly = flyPos(tau, t, tx);
    g.save(); g.translate(cx, cy + step * 0.2);
    g.globalAlpha = 1; g.fillStyle = g.strokeStyle = body; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(-9, -2.4); g.quadraticCurveTo(-12.5, -1, -12.8, 1.6);
    for (s = 0; s <= 1.0001; s += 0.05) { var an = Math.PI * 0.15 + s * TAU * 1.15, rr = 2.4 * (1 - s * 0.75); g.lineTo(-10.9 + Math.cos(an) * rr, 2.4 + Math.sin(an) * rr); }
    g.stroke();
    g.lineWidth = 0.9; g.strokeStyle = dark;
    g.beginPath(); g.moveTo(3, -1.6); g.lineTo(4.4 + step, -0.3); g.lineTo(3.6 + step, 0.4); g.stroke();
    g.beginPath(); g.moveTo(-5.5, -1.6); g.lineTo(-6.6 - step, -0.3); g.lineTo(-5.6 - step, 0.4); g.stroke();
    g.fillStyle = body;
    g.beginPath(); g.moveTo(-9.5, -2.4);
    g.bezierCurveTo(-8.6, -8.4, 0.5, -9.4, 4, -6.6);
    g.lineTo(5.6, -10.2); g.lineTo(8.8, -5.4);
    g.quadraticCurveTo(10.9, -4, 10.3, -2.5);
    g.quadraticCurveTo(7.2, -0.9, 3, -1.3);
    g.bezierCurveTo(-1, -0.1, -6.2, -0.1, -9.5, -2.4); g.closePath(); g.fill();
    g.save(); g.clip(); g.fillStyle = dark; g.globalAlpha = 0.55; ell(-1, 0.6, 11, 2.4); g.restore();
    g.globalAlpha = 1; g.strokeStyle = mixHex(body, 'white', 0.45); g.lineWidth = 0.5;
    g.beginPath(); g.moveTo(-7.5, -3); g.quadraticCurveTo(-1, -5.6, 3.5, -3.2); g.stroke();
    g.fillStyle = dark; for (c = 0; c < 7; c++) circ(-6.8 + c * 1.6, -6.9 - Math.sin(c / 6 * Math.PI) * 1.6, 0.32);
    var eye = { x: 6.4, y: -5.2 };
    var lx = fly.x - (cx + eye.x), ly = fly.y - (cy + eye.y), ld = Math.sqrt(lx * lx + ly * ly) || 1;
    var blink = (tau > 3.4 && tau < 3.6) || (Math.sin(t * 0.9) > 0.995);
    g.fillStyle = mixHex(body, 'white', 0.3); circ(eye.x, eye.y, 1.6);
    if (!blink) { C('white'); circ(eye.x + lx / ld * 0.55, eye.y + ly / ld * 0.55, 0.7); C('ink'); circ(eye.x + lx / ld * 0.75, eye.y + ly / ld * 0.75, 0.42); }
    else { g.globalAlpha = 1; g.strokeStyle = dark; seg(eye.x - 1.2, eye.y, eye.x + 1.2, eye.y, 0.4); }
    if (tau > 3.15 && tau < 3.6) { g.globalAlpha = 1; g.fillStyle = mixHex(body, 'white', 0.25); ell(6, -1.2, 1.6 * Math.sin(prog(tau, 3.15, 3.6) * Math.PI), 0.9); }
    g.restore();

    var mouth = { x: cx + 10.2, y: cy - 2.8 };
    var ext = 0;
    if (tau > 2.6 && tau < 2.78) ext = easeOut(prog(tau, 2.6, 2.78));
    else if (tau >= 2.78 && tau < 3.15) ext = 1 - easeIn(prog(tau, 2.78, 3.15));
    var caught = tau >= 2.78;
    if (ext > 0) {
      var target = flyPos(2.78, t, tx);
      var ex = lerp(mouth.x, target.x, ext), ey = lerp(mouth.y, target.y, ext);
      C('light'); quad(mouth.x, mouth.y, (mouth.x + ex) / 2, (mouth.y + ey) / 2 + 1.2 * ext, ex, ey, 0.75);
      C('acc'); circ(ex, ey, 1);
      if (caught) drawFly(ex + 0.3, ey - 0.6, t);
    }
    if (!caught) drawFly(fly.x, fly.y, t);
    if (tau > 1.6 && tau < 2.5) { C('acc'); g.fillRect(cx + 5.9, cy - 15, 0.9, 3); circ(cx + 6.35, cy - 10.8, 0.5); }
  }
  function flyPos(tau, t, tx) {
    var k = ease(prog(tau, -4, 2.2));
    var bx = lerp(tx + 66, tx + 46, k), by = lerp(GY - 30, GY - 24, k);
    var amp = lerp(5, 1.8, k);
    return { x: bx + Math.sin(t * 2.3) * amp + Math.sin(t * 5.1) * 0.6, y: by + Math.sin(t * 3.7) * amp * 0.6 + Math.cos(t * 6.3) * 0.5 };
  }
  function drawFly(x, y, t) {
    var f = Math.sin(t * 60) > 0;
    C('light', 0.95); ell(x - 0.5, y - 0.9 - (f ? 0.3 : 0), 1, f ? 0.45 : 0.7, -0.5); ell(x + 0.5, y - 0.9 - (f ? 0 : 0.3), 1, f ? 0.7 : 0.45, 0.5);
    C('ink'); ell(x, y, 0.85, 0.6); C('acc'); circ(x + 0.7, y - 0.1, 0.3);
  }

  // ---------- scene: eagle ----------
  function drawRodent(x, y, t, running, look, nib) {
    var bob = running ? Math.abs(Math.sin(t * 16)) * 0.35 : 0, hy = look ? -0.7 : (nib ? Math.max(0, Math.sin(t * 9)) * 0.3 : 0);
    C('ink2'); quad(x + 1.5, y - 0.8, x + 3.2, y - 1.8 + Math.sin(t * 5) * 0.4, x + 4.6, y - 1.1, 0.3);
    if (running) { seg(x - 0.9, y - 0.5, x - 0.9 + Math.sin(t * 16) * 0.6, y - 0.05, 0.35); seg(x + 0.9, y - 0.5, x + 0.9 - Math.sin(t * 16) * 0.6, y - 0.05, 0.35); }
    else { seg(x - 0.9, y - 0.5, x - 1, y - 0.05, 0.35); seg(x + 0.9, y - 0.5, x + 1, y - 0.05, 0.35); }
    ell(x, y - 1.15 - bob, 1.85, 1.1);
    C('grey'); ell(x + 0.2, y - 0.7 - bob, 1.2, 0.45);
    C('ink2'); ell(x - 1.7, y - 1.5 - bob + hy, 1, 0.78, look ? -0.6 : 0.1);
    C('light'); circ(x - 1.1, y - 2.35 - bob + hy, 0.5);
    C('ink'); circ(x - 2.05, y - 1.75 - bob + hy * 1.2, 0.22);
    C('acc'); circ(x - 2.65, y - 1.4 - bob + hy * 1.4, 0.2);
  }
  // Eagle in its own frame faces +x. k: wing raise, 1 = fully up, negative = downstroke.
  var WING = [1.6, -0.8, 2.0, -4.4, 0.4, -7.8, -2.4, -10.8, -5.0, -12.8, -6.0, -11.2, -5.6, -9.4, -5.0, -7.6, -4.6, -6.6, -4.2, -5.0, -3.6, -4.2, -3.2, -2.6, -2.6, -0.6];
  function eagleWing(k, col, fold) {
    C(col, 1);
    if (fold) { poly([1.8, -1, -1.6, -2.9, -8.2, -2.4, -7.6, -0.8, -2.2, -0.2]); C('ink2', 0.8); seg(-2, -2, -7.2, -1.6, 0.3); return; }
    var pts = [];
    for (var i = 0; i < WING.length; i += 2) pts.push(WING[i] - (1 - Math.abs(k)) * WING[i + 1] * -0.15, WING[i + 1] * k - 0.2);
    poly(pts);
    // leading edge and feather rows for texture
    C('ink', 1); g.lineWidth = 0.75; g.beginPath(); g.moveTo(pts[0], pts[1]); for (var e = 2; e <= 8; e += 2) g.lineTo(pts[e], pts[e + 1]); g.stroke();
    C(col === 'ink2' ? 'grey' : 'ink2', 0.9);
    for (var r = 0; r < 3; r++) { g.lineWidth = 0.28; g.beginPath(); g.moveTo(-0.2 - r * 0.9, (-1.2 - r * 0.2) * k); g.quadraticCurveTo(-1.6 - r * 1.2, (-5.5 - r * 1.2) * k, -3.1 - r * 0.8, (-9.4 - r * 0.9) * k); g.stroke(); }
    C(col, 1);
    // primary feathers fanned at the wing tip
    for (var f = 0; f < 5; f++) {
      var bx = lerp(-5.4, -6.6, f / 4), by = lerp(-12.4, -9.4, f / 4) * k;
      var ang = Math.atan2(-12 * k, -6) + (f - 2) * 0.24 + (k < 0 ? 0.2 : -0.2);
      seg(bx, by, bx + Math.cos(ang) * 2.3, by + Math.sin(ang) * 2.3, 0.5);
    }
    // covert feathers line
    C(col === 'ink' ? 'ink2' : 'grey', 0.9); g.lineWidth = 0.3; g.beginPath(); g.moveTo(1.2, -2.2 * k); g.quadraticCurveTo(-2, -6 * k, -4.6, -8.8 * k); g.stroke();
  }
  function drawEagle(x, y, vx, vy, mode, k, t) {
    g.save(); g.translate(x, y);
    var flip = vx < 0; if (flip) g.scale(-1, 1);
    g.rotate(Math.atan2(vy, Math.abs(vx)));
    g.scale(1.55, 1.55);
    if (mode !== 'dive') { g.save(); g.translate(1.4, 0.3); g.rotate(0.12); eagleWing(clamp(k * 0.85 + 0.05, -1, 1.2), 'ink', false); g.restore(); }
    C('light'); poly([-3.6, -0.7, -7.6, -2, -8.2, 0.1, -7.6, 2, -3.6, 0.8]);
    C('grey', 0.8); seg(-4.4, -0.4, -7.6, -1, 0.22); seg(-4.4, 0.4, -7.6, 1, 0.22);
    C('ink'); g.beginPath(); g.moveTo(4.6, -0.9); g.bezierCurveTo(3, -2.2, -2, -2, -4.2, -0.6); g.lineTo(-4.2, 0.9); g.bezierCurveTo(-1.5, 2.1, 2.5, 1.9, 4.4, 0.7); g.closePath(); g.fill();
    C('ink2', 0.9); ell(-0.6, 0.9, 3, 0.6);
    if (mode === 'grab' || mode === 'carry') {
      C('acc2'); seg(0.8, 1, 2.4, 3.7, 0.65); seg(-0.6, 1, 0.6, 3.9, 0.65);
      C('acc'); g.lineWidth = 0.38; g.beginPath(); g.arc(2.7, 4, 0.65, -0.5, 2.4); g.stroke(); g.beginPath(); g.arc(0.9, 4.2, 0.65, -0.5, 2.4); g.stroke();
    } else { C('acc2'); seg(-0.6, 1.2, -2.6, 1.5, 0.6); }
    C('light'); ell(4.7, -0.9, 1.6, 1.35); ell(3.4, -0.4, 1.2, 1.25);
    C('acc'); poly([5.9, -1.4, 7.6, -0.9, 7.4, 0.2, 6.8, -0.2, 6, 0]);
    C('ink'); circ(5.3, -1.25, 0.3);
    C('grey', 0.9); seg(4.9, -1.5, 5.8, -1.6, 0.2);
    eagleWing(k, 'ink2', mode === 'dive');
    g.restore();
  }
  function eagleState(tau, t) {
    var orbit = function (tt) { return { x: -10 + 18 * Math.cos(tt * 0.5), y: GY - 31 + 3.5 * Math.sin(tt * 0.5), vx: -Math.sin(tt * 0.5), vy: 0.15 * Math.cos(tt * 0.5) }; };
    var G = { x: 5.5, y: GY - 7.4 };
    var t0 = t - tau, P0 = orbit(t0);
    if (tau < 0) { var o = orbit(t); return { x: o.x, y: o.y, vx: o.vx, vy: o.vy, mode: 'soar', k: 0.62 + 0.1 * Math.sin(t * 1.7) + (Math.sin(t * 0.7) > 0.55 ? Math.sin(t * 8) * 0.55 : 0) }; }
    if (tau < 0.5) { var p = ease(tau / 0.5); return { x: P0.x, y: P0.y - p * 1.2, vx: lerp(P0.vx, G.x - P0.x, p), vy: lerp(P0.vy, (G.y - P0.y) * 0.5, p), mode: p > 0.6 ? 'dive' : 'soar', k: lerp(0.3, 1, p) }; }
    if (tau < 1.5) { var q = easeIn(prog(tau, 0.5, 1.5)); return { x: lerp(P0.x, G.x - 1.5, q), y: lerp(P0.y - 1.2, G.y - 1.5, q), vx: G.x - P0.x, vy: G.y - P0.y, mode: 'dive', k: 0 }; }
    if (tau < 2.0) { var r = easeOut(prog(tau, 1.5, 2.0)); return { x: lerp(G.x - 1.5, G.x, r), y: lerp(G.y - 1.5, G.y, r), vx: 1, vy: lerp(0.6, -0.2, r), mode: 'grab', k: 1.15 }; }
    var s = ease(prog(tau, 2.0, 5.5));
    return { x: lerp(G.x, 75, s), y: lerp(G.y, GY - 44, s) - Math.sin(s * Math.PI) * 4, vx: 1, vy: -0.45 + s * 0.3, mode: 'carry', k: 0.25 + Math.sin(t * 7.5) * 0.8 };
  }
  function sceneEagle(tau, t) {
    var k;
    // scenery: a knoll, rocks, a seed head the mouse is after
    C('pale', 1); poly([-40, GY + 0.2, -32, GY - 5, -22, GY - 7.5, -12, GY - 5.5, -4, GY + 0.2]);
    C('light', 1); g.lineWidth = 0.5; g.beginPath(); g.moveTo(-40, GY); g.quadraticCurveTo(-24, GY - 9.5, -4, GY); g.stroke();
    C('ink2', 1); ell(20, GY - 1, 3, 1.6); C('grey', 1); ell(19.2, GY - 1.8, 1.4, 0.5); C('ink2', 1); ell(25, GY - 0.7, 1.6, 0.9);
    var sway = Math.sin(t * 1.3) * 0.4;
    C('acc2', 1); quad(2.6, GY, 2.8, GY - 4, 2.2 + sway, GY - 7.5, 0.4); quad(3.6, GY, 4, GY - 3, 4.6 + sway, GY - 5.5, 0.35);
    for (k = 0; k < 5; k++) { C(k % 2 ? 'acc' : 'light', 1); ell(2.2 + sway + Math.sin(k) * 0.2, GY - 7.8 - k * 0.7, 0.55, 0.4, 0.5); }
    // rodent
    var e = eagleState(tau, t);
    if (tau < 1.75) {
      var run = tau < -0.6, rx = run ? lerp(44, 6.5, ease(prog(tau, -7, -0.6))) : 6.5;
      g.save(); g.translate(rx, GY); g.scale(1.35, 1.35); drawRodent(0, 0, t, run, tau > 0.9, !run && tau < 0.9); g.restore();
      if (tau > 0.9 && tau < 1.6) { C('acc'); g.fillRect(rx - 2.4, GY - 7.2, 0.6, 2.2); circ(rx - 2.1, GY - 4.4, 0.35); }
    }
    // shadow during the dive
    if (tau > 0.5 && tau < 2.0) { var sh = prog(tau, 0.5, 1.7); C('ink2', 0.15 + sh * 0.35); ell(e.x, GY - 0.2, 2 + sh * 4, 0.45); }
    // dust puff on the grab
    if (tau > 1.7 && tau < 2.6) {
      var d = prog(tau, 1.7, 2.6);
      for (k = 0; k < 12; k++) { var a = Math.PI + k / 11 * Math.PI; C(k % 2 ? 'grey' : 'light', 1 - d); circ(6 + Math.cos(a) * (2 + d * 7), GY - 0.5 + Math.sin(a) * (1 + d * 3), 0.5 + (1 - d) * 0.4); }
    }
    drawEagle(e.x, e.y, e.vx, e.vy, e.mode, e.k, t);
    if (tau >= 1.75) {
      // the catch hangs from the talons
      var ang = Math.atan2(e.vy, Math.abs(e.vx)), ca = Math.cos(ang), sa = Math.sin(ang);
      var tx = e.x + (1.8 * ca - 4.4 * sa) * 1.55, ty = e.y + (1.8 * sa + 4.4 * ca) * 1.55;
      g.save(); g.translate(tx, ty); g.rotate(-1.35 + Math.sin(t * 6) * 0.15); g.scale(1.35, 1.35); drawRodent(-1.2, 2.6, t, true, false, false); g.restore();
      if (tau < 3.2) for (k = 0; k < 4; k++) if (Math.sin(t * 7 + k * 1.9) > 0) sparkle(e.x - 6 + k * 4, e.y - 9 - (k % 2) * 2, 0.8, k % 2 ? 'acc2' : 'acc');
    }
  }

  // ---------- scene: spider ----------
  var HUB = { x: 0, y: GY - 22 }, WRX = 19, WRY = 13, SPOKES = 16;
  function sceneSpider(tau, t) {
    var i;
    C('acc2', 0.95); quad(-26, GY, -28, GY - 20, -24, GY - 38, 0.8); quad(27, GY, 29, GY - 18, 25, GY - 36, 0.8);
    C('acc', 0.9);
    [[-26.6, GY - 12, -1], [-25.6, GY - 26, 1], [27.8, GY - 15, 1], [26.6, GY - 28, -1]].forEach(function (l) {
      g.save(); g.translate(l[0], l[1]); g.rotate(l[2] * 0.6 + Math.sin(t + l[1]) * 0.08); ell(l[2] * 2.2, 0, 2.6, 0.7); g.restore();
    });
    C('light', 1); ell(-24, GY - 39, 1.4, 2); ell(25, GY - 37, 1.2, 1.8);
    var webA = 'acc2';
    var drop = easeOut(prog(tau, -3, -1));
    var sp = { x: HUB.x, y: lerp(-2, HUB.y, drop) }, moving = tau < 10.5;
    if (tau < 0.5) { C(webA, 0.9); seg(HUB.x, -2, HUB.x, sp.y, 0.3); }
    var spokeP = prog(tau, -1, 3.2);
    if (spokeP > 0) {
      C(webA, 0.95);
      seg(-WRX - 1, HUB.y - 7, -25.6, GY - 32, 0.3); seg(WRX + 1, HUB.y - 6, 26.4, GY - 30, 0.3);
      seg(-WRX + 2, HUB.y + 9, -27, GY - 9, 0.3); seg(WRX - 2, HUB.y + 9, 28, GY - 11, 0.3);
    }
    for (i = 0; i < SPOKES; i++) {
      var a = i / SPOKES * TAU + 0.15;
      var p = clamp(spokeP * SPOKES - i, 0, 1);
      if (p <= 0) continue;
      var ex = HUB.x + Math.cos(a) * WRX * 1.08, ey = HUB.y + Math.sin(a) * WRY * 1.08;
      C(webA, 0.9); seg(HUB.x, HUB.y, lerp(HUB.x, ex, p), lerp(HUB.y, ey, p), 0.32);
      if (p < 1) sp = { x: lerp(HUB.x, ex, p), y: lerp(HUB.y, ey, p) };
    }
    var spiral = prog(tau, 3.2, 10.5), N = 380, n = Math.floor(Math.sqrt(spiral) * N), prev = null;
    for (i = 0; i <= n; i++) {
      var s = i / N, th = s * 5.5 * TAU, r = 0.14 + 0.86 * s;
      var q = { x: HUB.x + Math.cos(th) * WRX * r, y: HUB.y + Math.sin(th) * WRY * r };
      if (prev) { C(webA, 0.9); seg(prev.x, prev.y, q.x, q.y, 0.32); }
      prev = q;
    }
    if (spiral > 0 && spiral < 1) sp = prev;
    if (spiral >= 1) sp = { x: HUB.x, y: HUB.y + 0.6 };
    if (spiral >= 1) {
      for (i = 0; i < 6; i++) {
        var s2 = ((t * 0.05 + i / 6) % 1), th2 = s2 * 5.5 * TAU, r2 = 0.14 + 0.86 * s2;
        C('white', 1); circ(HUB.x + Math.cos(th2) * WRX * r2, HUB.y + Math.sin(th2) * WRY * r2, 0.5);
      }
      var gp = prog(tau, 11, 13.5), gx = lerp(40, 11, easeOut(gp)), gy = HUB.y - 4 + Math.sin(t * 6) * (1 - gp) * 1.5;
      if (tau > 11) { drawFly(gx, gy, t); if (gp >= 1 && Math.sin(t * 20) > 0) { C('acc'); ring(gx, gy, 1.6, 0.2); } }
    }
    drawSpider(sp.x, sp.y, t, moving);
  }
  function drawSpider(x, y, t, moving) {
    g.save(); g.translate(x, y); g.scale(1.3, 1.3); g.translate(-x, -y);
    C('ink', 1);
    for (var side = -1; side <= 1; side += 2) for (var l = 0; l < 4; l++) {
      var ph = moving ? Math.sin(t * 14 + l * 1.6 + (side > 0 ? 1.5 : 0)) * 0.5 : Math.sin(t + l) * 0.05;
      var a0 = (-0.9 + l * 0.6) + ph * 0.3;
      var kx = x + side * Math.cos(a0) * 2.2, ky = y + Math.sin(a0) * 2.2 - 1.1;
      var fx = x + side * Math.cos(a0 + 0.3) * 3.6, fy = y + Math.sin(a0 + 0.3) * 3.6 + 0.9;
      seg(x, y, kx, ky, 0.32); seg(kx, ky, fx, fy, 0.28);
    }
    ell(x, y + 1.6, 1.6, 2); circ(x, y - 0.6, 1.1);
    C('acc'); ell(x, y + 1.6, 0.6, 1); C('white'); circ(x - 0.4, y - 1, 0.25); circ(x + 0.4, y - 1, 0.25);
    g.restore();
  }

  // ---------- scene: shark ----------
  var school = [];
  for (var si = 0; si < 44; si++) school.push({ a: hash(si, 71) * TAU, r: 1.5 + hash(si, 72) * 6, dy: (hash(si, 73) - 0.5) * 4, sp: 0.7 + hash(si, 74) * 0.6 });
  var BALL = { x: 12, y: SURF + 4.5 };
  function sharkPose(tau) {
    var x, y, a, open = 0, p;
    if (tau < -1) { p = prog(tau, -8, -1); x = lerp(-70, -12, p); y = SURF + 4.4 + Math.sin(tau * 1.4) * 0.3; a = Math.sin(tau * 1.4) * 0.03; }
    else if (tau < 0.3) { p = ease(prog(tau, -1, 0.3)); x = lerp(-12, -3, p); y = lerp(SURF + 4.4, SURF + 13, p); a = lerp(0, -1.15, p); }
    else if (tau < 1.25) { p = easeOut(prog(tau, 0.3, 1.25)); x = lerp(-3, 7, p); y = lerp(SURF + 13, SURF - 16, p); a = lerp(-1.15, -1.0, p); open = tau < 1.12 ? ease(prog(tau, 0.55, 1.0)) * 0.6 : 0.6 * (1 - prog(tau, 1.12, 1.2)); }
    else if (tau < 1.9) { p = prog(tau, 1.25, 1.9); x = lerp(7, 15, p); y = SURF - 16 - Math.sin(p * Math.PI) * 2.5 + p * 4; a = lerp(-1.0, 0.65, ease(p)); }
    else if (tau < 2.6) { p = easeIn(prog(tau, 1.9, 2.6)); x = lerp(15, 23, p); y = lerp(SURF - 12, SURF + 9, p); a = lerp(0.65, 1.0, p); }
    else { p = prog(tau, 2.6, 9); x = lerp(23, 85, p); y = lerp(SURF + 9, SURF + 4.4, ease(p * 2.5)); a = lerp(1.0, 0, ease(p * 4)); }
    return { x: x, y: y, a: a, open: open };
  }
  function sharkMouth(w) { var c = Math.cos(w.a), s = Math.sin(w.a); return { x: w.x + (12 * c - 0.6 * s) * 1.3, y: w.y + (12 * s + 0.6 * c) * 1.3 }; }
  function drawShark(w, t) {
    g.save(); g.translate(w.x, w.y); g.rotate(w.a); g.scale(1.3, 1.3);
    var sw = Math.sin(t * 6) * 0.7;
    C('acc'); poly([-11, -0.6, -16.2, -6.4 + sw, -14.6, -0.3, -15.8, 3.6 + sw * 0.5, -11, 0.8]);
    poly([0.6, -2.7, -3.4, -8.4, -4.6, -2.5]);
    poly([-8.7, -1.4, -9.9, -3, -10.3, -1.1]);
    var H = { x: 6.6, y: 1.3 };
    g.beginPath(); g.moveTo(12.6, 0.3); g.bezierCurveTo(11.4, -2.6, 4.6, -3.7, -2, -3.2);
    g.bezierCurveTo(-7, -2.6, -10, -1.2, -11.6, -0.5); g.lineTo(-11.6, 0.7);
    g.bezierCurveTo(-8, 1.9, -2, 3.1, 3, 2.9); g.lineTo(H.x, H.y); g.lineTo(12.4, 0.8); g.closePath(); g.fill();
    g.save(); g.clip(); C('pale', 1); ell(0, 3, 12, 1.9); C('ink', 0.22); ell(-1, -3.4, 12, 1.5); g.restore();
    C('acc'); poly([3.6, 1.9, -1.2, 6.8, 0.6, 2.3]);
    C('ink2', 0.9); for (var i = 0; i < 3; i++) seg(4.2 + i * 0.75, -0.7, 4.0 + i * 0.75, 1.1, 0.25);
    C('ink'); circ(9.3, -0.9, 0.42); C('white'); circ(9.45, -1.05, 0.15);
    // lower jaw, rotated open about the hinge
    var o = w.open, co = Math.cos(o), so = Math.sin(o);
    function J(x, y) { var dx = x - H.x, dy = y - H.y; return [H.x + dx * co - dy * so, H.y + dx * so + dy * co]; }
    var j1 = J(11.6, 1.2), j2 = J(10.4, 2.6), j3 = J(6, 3);
    if (o > 0.05) {
      C('ink2'); poly([H.x, H.y, 12.4, 0.8, j1[0], j1[1]]);
      C('white'); for (i = 0; i < 5; i++) { var ux = lerp(7.4, 12, i / 4), uy = lerp(1.15, 0.85, i / 4); poly([ux - 0.35, uy, ux + 0.35, uy, ux, uy + 0.75]); }
    }
    C('acc'); poly([H.x, H.y, j1[0], j1[1], j2[0], j2[1], j3[0], j3[1]]);
    C('pale'); poly([j2[0], j2[1], j3[0], j3[1], J(6.4, 2.4)[0], J(6.4, 2.4)[1], J(10, 1.9)[0], J(10, 1.9)[1]]);
    if (o > 0.05) {
      C('white'); for (i = 0; i < 4; i++) { var b = J(lerp(7.6, 11.2, i / 3), 1.25); var tip = J(lerp(7.6, 11.2, i / 3), 0.55); poly([b[0] - 0.3, b[1], b[0] + 0.3, b[1], tip[0], tip[1]]); }
    }
    g.restore();
  }
  function drawMiniFish(x, y, ang, col) {
    g.save(); g.translate(x, y); g.rotate(ang);
    C(col, 1); ell(0, 0, 1.1, 0.45); poly([-0.8, 0, -1.7, -0.6, -1.7, 0.6]);
    g.restore();
  }
  function sceneShark(tau, t) {
    var w = sharkPose(tau), i;
    drawShark(w, t);
    C('light', 0.5); g.fillRect(-120, SURF + 0.2, 260, ROWS);
    // bait ball: circles, then scatters when the shark comes up through it
    var scatter = tau > 0.35 ? easeOut(prog(tau, 0.35, 2.2)) * 22 : 0;
    var regroup = tau > 6 ? ease(prog(tau, 6, 10)) : 0;
    scatter *= 1 - regroup;
    school.forEach(function (f, n) {
      var a = f.a + t * f.sp * (n % 2 ? 1 : -1);
      var x = BALL.x + Math.cos(f.a) * scatter * 1.3 + Math.cos(a) * f.r, y = BALL.y + f.dy + Math.sin(a) * f.r * 0.45 + Math.sin(f.a) * scatter * 0.25;
      if (y < SURF + 0.8) y = SURF + 0.8;
      var dir = (n % 2 ? 1 : -1);
      drawMiniFish(x, y, dir > 0 ? a + Math.PI / 2 : a - Math.PI / 2 + Math.PI, n % 3 ? 'acc2' : 'acc');
    });
    // the one that jumps, and gets caught
    var M = sharkMouth(sharkPose(1.18));
    if (tau > 0.5 && tau < 1.18) {
      var p = prog(tau, 0.5, 1.18);
      var fx = lerp(BALL.x - 2, M.x, p), fy = lerp(SURF, M.y, p) - Math.sin(p * Math.PI) * 5;
      drawMiniFish(fx, fy, -0.8 + p * 0.6, 'acc');
    }
    [[0.5, 1, 40], [2.3, 22, 64]].forEach(function (sp) {
      var dt = tau - sp[0];
      if (dt < 0 || dt > 1.8) return;
      for (var i = 0; i < sp[2]; i++) {
        var vx = (hash(i, 41) - 0.5) * 22, vy = -10 - hash(i, 42) * 18;
        var x = sp[1] + (hash(i, 43) - 0.5) * 8 + vx * dt, y = SURF + vy * dt + 20 * dt * dt;
        if (y < SURF + 0.6) { C(i % 4 ? 'acc2' : 'acc', clamp(1.4 - dt, 0, 1)); circ(x, y, 0.35 + hash(i, 44) * 0.35); }
      }
    });
    if (tau > 1.18 && tau < 2.0) for (var k = 0; k < 5; k++) if (Math.sin(t * 8 + k * 2) > 0.2) sparkle(M.x - 4 + k * 2.4, M.y - 6 - (k % 2) * 2.5, 0.8, k % 2 ? 'acc2' : 'acc');
  }

  // ---------- frame ----------
  var SCENES = [
    { x: X.fisher, draw: sceneFisher },
    { x: X.cham, draw: sceneCham },
    { x: X.eagle, draw: sceneEagle },
    { x: X.spider, draw: sceneSpider },
    { x: X.shark, draw: sceneShark }
  ];
  var ANCHOR = 0.6;
  function speedFor() { return Math.max(9, cols / 19); }

  function frame(t) {
    speed = speedFor();
    camRaw = t * speed + X.fisher - cols * ANCHOR - speed * 1.5;
    cam = ((camRaw % L) + L) % L;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.clearRect(0, 0, cols, ROWS);
    drawBackdrop(t);
    drawGround(t);
    drawBushes(t);
    for (var i = 0; i < SCENES.length; i++) {
      var dx = ((SCENES[i].x - cam) % L + L) % L;
      if (dx > L - 220) dx -= L;
      if (dx < -170 || dx > cols + 170) continue;
      var tau = (cols * ANCHOR - dx) / speed;
      g.setTransform(S, 0, 0, S, dx, GY * (1 - S));
      SCENES[i].draw(tau, t);
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;

    var data = g.getImageData(0, 0, cols, ROWS).data;
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.clearRect(0, 0, canvas.width, canvas.height);
    out.drawImage(bg, 0, 0);
    var cs = cell * dpr;
    for (var y = 0; y < ROWS; y++) for (var x = 0; x < cols; x++) {
      var j = (y * cols + x) * 4, a = data[j + 3] / 255;
      if (a < 0.04) continue;
      a *= edgeFade(x, y);
      if (a < 0.04) continue;
      var ci = nearest(data[j], data[j + 1], data[j + 2]);
      var lv = Math.min(NL - 1, Math.round(Math.sqrt(a) * (NL - 1)));
      out.drawImage(sprites[ci][lv], x * cs, y * cs);
    }
  }

  // ---------- run ----------
  var paused = false, running = true, start = null, lastT = 6;
  function render(t) { lastT = t; frame(t); }
  function loop(ts) {
    if (start === null) start = ts;
    if (!paused && running && !document.hidden) render((ts - start) / 1000);
    requestAnimationFrame(loop);
  }
  // For screenshots and tests: __hunt.seek(t), __hunt.at(sceneIndex, tau)
  window.__hunt = {
    seek: function (t) { paused = true; render(t); },
    at: function (i, tau) { paused = true; render(i * SPACING / speedFor() + 1.5 + tau); },
    loop: function () { return L / speedFor(); }
  };
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { running = es[0].isIntersecting; }, { threshold: 0.02 }).observe(canvas);
  resize();
  window.addEventListener('resize', function () { resize(); if (paused || reduced) render(lastT); });
  if (reduced) render(6); else requestAnimationFrame(loop);
})();
