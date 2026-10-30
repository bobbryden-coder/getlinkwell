/* Linkwell "talent hunt" animation.
   One continuous pixel-dot world, 800 cells wide, that the camera pans across:
   fisherman -> chameleon -> prospector -> spider -> (dive) whale -> back to the start.
   Every cell is a dot in the Linkwell palette. Scenes are drawn procedurally plus a few hand-made sprites.
*/
(function () {
  var canvas = document.getElementById('hunt');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var WORLD_W = 800, ROWS = 62, GROUND = 50, SEA = 52, SEABED = 105;
  var PAL = { k: '#101114', K: '#5c6370', g: '#9aa1ad', a: '#5352e8', A: '#8f8af2', b: '#c9c8f7', c: '#eeeefc', w: '#ffffff' };

  // ---------- canvas / dots ----------
  var cols = 160, cell = 6, dpr = 1, dots = {}, buf = null;
  function makeDots() {
    var s = Math.ceil(cell * dpr);
    Object.keys(PAL).forEach(function (k) {
      var c = document.createElement('canvas'); c.width = c.height = s;
      var g = c.getContext('2d'); g.fillStyle = PAL[k]; g.beginPath(); g.arc(s / 2, s / 2, s * 0.37, 0, Math.PI * 2); g.fill();
      dots[k] = c;
    });
    var c = document.createElement('canvas'); c.width = c.height = s;
    var g = c.getContext('2d'); g.fillStyle = '#e3e5ea'; g.beginPath(); g.arc(s / 2, s / 2, s * 0.15, 0, Math.PI * 2); g.fill();
    dots['.'] = c;
  }
  function resize() {
    var cssW = canvas.clientWidth || 960;
    cols = Math.max(96, Math.min(160, Math.round(cssW / 6.4)));
    cell = cssW / cols;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(ROWS * cell * dpr);
    canvas.style.height = (ROWS * cell) + 'px';
    buf = new Array(cols * ROWS);
    makeDots();
  }

  // ---------- camera and plotting ----------
  var cam = { x: 0, y: 0 };
  function wrap(x) { x = x % WORLD_W; return x < 0 ? x + WORLD_W : x; }
  // Plot a world cell. Handles the world wrapping round at x = 800.
  function px(x, y, col) {
    x = Math.round(x); y = Math.round(y);
    var vx = x - cam.x; vx = ((vx % WORLD_W) + WORLD_W) % WORLD_W;
    var vy = y - cam.y;
    if (vx < 0 || vx >= cols || vy < 0 || vy >= ROWS) return;
    buf[vy * cols + vx] = col;
  }
  function line(x0, y0, x1, y1, col) {
    var dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (var i = 0; i <= n; i++) px(x0 + dx * i / n, y0 + dy * i / n, col);
  }
  function sprite(sp, x, y, map) {
    for (var r = 0; r < sp.length; r++) for (var c = 0; c < sp[r].length; c++) {
      var ch = sp[r][c]; if (ch === '.') continue;
      if (map && map[ch]) ch = map[ch];
      px(x + c, y + r, ch);
    }
  }
  function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; }

  // ---------- sprites ----------
  var FISHER = [
    '...kkkk...',
    '..kkkkkk..',
    '.kkkkkkkk.',
    '...bbbb...',
    '...bbbb...',
    '....kk....',
    '..kkkkkk..',
    '.kkkkkkkk.',
    '.k.kkkk.k.',
    '.k.kkkk.k.',
    '...kkkk...',
    '...kkkk...',
    '...k..k...',
    '...k..k...',
    '...k..k...',
    '..kk..kk..'
  ];
  var FISH = [
    '..aaaa....a',
    '.awaaaaaa.a',
    'aaaaaaaaaaa',
    '.aaaaaaaa.a',
    '..aaaa....a'
  ];
  var CHAM = [
    '...........................aa.....',
    '..........................aaaa....',
    '.........................aaaaaa...',
    '.........aaaaaaaaaa.....aaaaaaa...',
    '......aaaaaaaaaaaaaaaa.aaaaaaaa...',
    '....aaaaaaaaaaaaaaaaaaaaaaAAAaaa..',
    '...aaaaaaaaaaaaaaaaaaaaaaaAwkAaa..',
    '..aaaaaaaaaaaaaaaaaaaaaaaaaAAAaaaa',
    '..aaaaaaaaaaaaaaaaaaaaaaaaaaaaakkk',
    '...aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.',
    '....aaaaaaaaaaaaaaaaaaaaaaaaaaa...',
    '...a..aa.......aa........aa..aa...',
    '..a...aa.......aa........aa..aa...',
    '.aa..aa.......aa..........aa..aa..',
    'a..a..............................',
    'a..a..............................',
    '.aa...............................'
  ];
  var FLY = ['A..A', '.kk.'];
  var MAN = [
    '..kkkkkk..',
    '..kkkkkk..',
    '..kkkkkk..',
    '..kAAAAk..',
    'kkkkkkkkkk',
    '...bbbb...',
    '...bbbb...',
    '....kk....',
    '..kkkkkk..',
    '.kkkkkkkk.',
    '.kkkkkkkk.',
    '.kkkkkkkk.',
    '..kkkkkk..',
    '...kkkk...',
    '...k..k...',
    '...k..k...',
    '...k..k...',
    '..kk..kk..'
  ];
  // Bent over the microscope: head and shoulders moved right and down, back arched.
  var MAN_BENT = [
    '..........',
    '..........',
    '..........',
    '......kkkkkk',
    '......kkkkkk',
    '......kAAAAk',
    '....kkkkkkkkkk',
    '...kkkkbbbb...',
    '..kkkkkbbbb...',
    '.kkkkkkk......',
    '.kkkkkkkk.....',
    '.kkkkkkkk.....',
    '..kkkkkk......',
    '...kkkk.......',
    '...k..k.......',
    '...k..k.......',
    '...k..k.......',
    '..kk..kk......'
  ];
  var SCOPE = [
    '.aa.....',
    'aAAa....',
    '.aa.....',
    '.aa.....',
    '.aaa....',
    '..aaa...',
    '...aa...',
    '...aK...',
    '...aKK..',
    '...KKK..',
    '.KKKKKK.',
    'KKKKKKKK'
  ];
  var SPIDER = [
    'k.k...k.k',
    '.k.kkk.k.',
    '..kkakk..',
    'kkkkkkkkk',
    '..kkkkk..',
    '.k.kkk.k.',
    'k.k...k.k'
  ];

  // ---------- static world ----------
  // Land: x in [0,64) and [170,630). Water: [64,170) and [630,800).
  function isLand(x) { return (x >= 0 && x < 64) || (x >= 170 && x < 630); }
  function rockTop(x) { // prospector's outcrop, x 384..446
    if (x < 384 || x > 446) return GROUND;
    var t = (x - 384) / 62;
    var h = Math.sin(t * Math.PI) * 20 + Math.sin(t * 17) * 1.6 + Math.sin(t * 31) * 0.9;
    if (x < 394) h = Math.min(h, 4 + (x - 384) * 0.4); // low ledge for the microscope
    return Math.round(GROUND - h);
  }
  var VEIN = [];
  (function () { // zig-zag vein inside the rock
    var x = 396, y = 49;
    while (x < 440) { VEIN.push([x, y]); x += 1; y += (Math.floor(x / 4) % 2 === 0) ? -0.55 : -0.2; if (hash(x, 7) > 0.8) y -= 0.6; }
  })();

  function drawStatic(t) {
    var i, vx, vy, x, y;
    for (vy = 0; vy < ROWS; vy++) for (vx = 0; vx < cols; vx++) {
      x = wrap(cam.x + vx); y = cam.y + vy;
      var col = '.';
      if (isLand(x)) {
        if (y === GROUND) col = 'K';
        else if (y > GROUND && y <= GROUND + 5 && (x + y) % 2 === 0) col = 'g';
        else if (y > GROUND + 5 && hash(x, y) > 0.9) col = 'g';
      } else {
        if (y === SEA) col = ((Math.floor(x + t * 6) % 7) < 3) ? 'A' : 'b';
        else if (y > SEA && y < SEABED) {
          col = 'c';
          if (hash(x, y) > 0.94 && Math.sin(t * 2 + x * 0.7 + y) > 0.3) col = 'b'; // shimmer
        } else if (y >= SEABED) col = ((x + y) % 2 === 0) ? 'g' : (y === SEABED ? 'K' : '.');
      }
      // rock outcrop
      if (x >= 384 && x <= 446) {
        var top = rockTop(x);
        if (y >= top && y <= GROUND + 5) col = (y === top || (x + y) % 2 === 0) ? 'K' : 'g';
      }
      buf[vy * cols + vx] = col;
    }
    // vein
    for (i = 0; i < VEIN.length; i++) {
      var sx = VEIN[i][0], sy = Math.round(VEIN[i][1]);
      var glow = Math.sin(t * 3 - i * 0.35);
      px(sx, sy, glow > 0.85 ? 'w' : glow > 0.2 ? 'A' : 'a');
    }
    // tree (chameleon scene)
    for (y = 8; y <= GROUND; y++) for (x = 200; x <= 205; x++) px(x, y, (x === 200 || x === 205) ? 'k' : 'K');
    for (x = 206; x <= 296; x++) { var by = 30 - Math.round((x - 206) / 60); px(x, by, 'K'); px(x, by + 1, 'k'); }
    for (y = -2; y <= 22; y++) for (x = 186; x <= 222; x++) { // canopy
      var dx = (x - 204) / 19, dy = (y - 9) / 11;
      if (dx * dx + dy * dy <= 1 && hash(x, y) > 0.35) px(x, y, hash(x, y) > 0.85 ? 'A' : 'b');
    }
    for (x = 288; x <= 296; x++) for (y = 24; y <= 27; y++) if (hash(x, y) > 0.4) px(x, y, 'b'); // leaves at branch end
    // fence posts (spider scene)
    for (y = 22; y <= GROUND; y++) { px(522, y, 'K'); px(523, y, 'k'); px(596, y, 'k'); px(597, y, 'K'); }
    for (x = 520; x <= 525; x++) px(x, 22, 'k');
    for (x = 594; x <= 599; x++) px(x, 22, 'k');
    // seaweed
    [648, 652, 770, 776, 782].forEach(function (sx, n) {
      for (y = SEABED - 1; y >= SEABED - 10 - n * 2; y--) px(sx + Math.round(Math.sin(t * 1.5 + y * 0.5 + n) * 1.5), y, (y % 2) ? 'A' : 'a');
    });
    // reeds by the fisherman's bank
    for (y = GROUND - 1; y >= GROUND - 6; y--) { px(66 + Math.round(Math.sin(t + y) * 0.6), y, 'A'); px(69, y + 1, 'a'); }
  }

  // ---------- scene 1: fisherman ----------
  function sceneFisher(u, t) {
    var fx = 46, fy = GROUND - 16; // sprite top-left
    sprite(FISHER, fx, fy);
    var hand = { x: 55, y: 42 };
    // rod angle: back swing, snap forward, hold, bend on the bite
    var ang;
    if (u < 0.9) ang = lerp(60, 135, ease(u / 0.9));
    else if (u < 1.15) ang = lerp(135, 35, ease((u - 0.9) / 0.25));
    else ang = 40;
    var bend = (u > 4.3 && u < 5.4) ? Math.sin((u - 4.3) / 1.1 * Math.PI) : 0;
    var rad = ang * Math.PI / 180, L = 15;
    var tip = { x: hand.x + Math.cos(rad) * L, y: hand.y - Math.sin(rad) * L + bend * 7 };
    // rod as a slightly curved line
    for (var i = 0; i <= L; i++) {
      var s = i / L;
      var rx = lerp(hand.x, tip.x, s), ry = lerp(hand.y, tip.y, s) + bend * 5 * s * s;
      px(rx, ry, 'k');
    }
    // bobber flight and landing
    var B = { x: 112, y: SEA };
    var bob = null;
    if (u >= 1.0 && u < 1.9) {
      var f = (u - 1.0) / 0.9;
      bob = { x: lerp(tip.x, B.x, f), y: lerp(tip.y, B.y, f) - Math.sin(f * Math.PI) * 18 };
    } else if (u >= 1.9) {
      var dip = (u > 4.3 && u < 4.8) ? 2 : 0;
      bob = { x: B.x, y: B.y + Math.round(Math.sin(t * 4) * 0.6) + dip };
    }
    if (u >= 5.0) bob = null; // line reeled in with the fish
    if (bob) {
      // line from tip to bobber with a sag
      var n = 30;
      for (i = 0; i <= n; i++) {
        var q = i / n;
        var lx = lerp(tip.x, bob.x, q), ly = lerp(tip.y, bob.y, q) + Math.sin(q * Math.PI) * (u < 1.9 ? 2 : 6);
        px(lx, ly, 'g');
      }
      px(bob.x, bob.y, 'a'); px(bob.x, bob.y - 1, 'A');
    }
    // ripples after landing
    if (u > 1.9 && u < 3.2) {
      var r = (u - 1.9) * 7;
      for (var k = 0; k < 2; k++) { var rr = r - k * 3; if (rr > 0) { px(B.x - rr, SEA, 'A'); px(B.x + rr, SEA, 'A'); } }
    }
    // fish
    var fish = null;
    if (u > 2.4 && u < 4.3) { var g = ease(clamp((u - 2.4) / 1.9, 0, 1)); fish = { x: lerp(142, 114, g), y: lerp(64, 56, g) + Math.sin(t * 3) * 0.6 }; }
    else if (u >= 4.3 && u < 5.0) { fish = { x: 114 + Math.sin(t * 20) * 0.8, y: 55 }; }
    else if (u >= 5.0 && u < 5.9) {
      var h = (u - 5.0) / 0.9;
      fish = { x: lerp(114, 60, h), y: lerp(54, 36, h) - Math.sin(h * Math.PI) * 14 };
      if (h < 0.3) for (i = 0; i < 6; i++) px(114 + Math.cos(i) * 5 * h * 3, SEA - 1 - i * h * 3, 'b'); // splash
      // taut line to the fish
      line(tip.x, tip.y, fish.x + 5, fish.y + 2, 'g');
    } else if (u >= 5.9) {
      fish = { x: 57, y: 38 + Math.round(Math.sin(t * 6) * 0.5) };
      line(tip.x, tip.y, fish.x + 5, fish.y, 'g');
      // little sparkles of success
      for (i = 0; i < 4; i++) if (Math.sin(t * 5 + i * 1.7) > 0.6) px(50 + i * 5, 28 + (i % 2) * 3, 'w');
    }
    if (fish) {
      if (u >= 5.0) { // fish in the air: flipped vertical, head up
        for (var r2 = 0; r2 < FISH.length; r2++) for (var c2 = 0; c2 < FISH[r2].length; c2++) {
          var ch = FISH[r2][c2]; if (ch !== '.') px(fish.x + r2, fish.y + c2, ch);
        }
      } else sprite(FISH, fish.x, fish.y);
    }
  }

  // ---------- scene 2: chameleon ----------
  function sceneCham(u, t) {
    // the chameleon slowly changes colour, as chameleons do
    var phase = (Math.sin(t * 0.8) + 1) / 2;
    var body = phase < 0.33 ? 'a' : phase < 0.66 ? 'A' : 'a';
    if (u > 2.2 && u < 3.0) body = 'b'; // flush after the catch
    var cx = 208, cy = 18;
    var blink = (u > 2.3 && u < 2.55);
    sprite(CHAM, cx, cy, { a: body, w: blink ? body : 'w', k: blink ? body : 'k' });
    // pupil tracks the fly before the strike
    var mouth = { x: cx + 33, y: cy + 8 };
    var fly = { x: 282 + Math.sin(t * 9) * 1.2, y: 24 + Math.sin(t * 13) * 1.1 };
    var caught = u >= 1.85;
    var tongueTip = null;
    if (u >= 1.6 && u < 1.85) tongueTip = lerp(0, 1, ease((u - 1.6) / 0.25));
    else if (u >= 1.85 && u < 2.15) tongueTip = lerp(1, 0, ease((u - 1.85) / 0.3));
    if (tongueTip !== null) {
      var tx = lerp(mouth.x, fly.x, tongueTip), ty = lerp(mouth.y, fly.y, tongueTip);
      line(mouth.x, mouth.y, tx, ty, 'A');
      px(tx, ty, 'a'); px(tx + 1, ty, 'a'); px(tx, ty + 1, 'a'); px(tx + 1, ty + 1, 'a');
      if (u >= 1.85) sprite(FLY, tx, ty - 1); // fly stuck to the tongue
    }
    if (!caught) sprite(FLY, fly.x, fly.y);
    else if (u > 2.15 && u < 2.3) { px(mouth.x - 2, mouth.y - 1, 'w'); } // gulp
    // thought: a small '!' sparkle as it spots the fly
    if (u > 1.0 && u < 1.5) { px(cx + 28, cy - 4, 'a'); px(cx + 28, cy - 3, 'a'); px(cx + 28, cy - 1, 'a'); }
  }

  // ---------- scene 3: prospector ----------
  function sceneProspector(u, t) {
    sprite(SCOPE, 383, 34);
    var bent = u > 1.0 && u < 3.8;
    if (bent) sprite(MAN_BENT, 368, GROUND - 18);
    else {
      var hatLift = (u > 4.0 && u < 4.5) ? 2 : 0;
      // draw body then hat separately so the hat can lift (a classy tip of the hat)
      sprite(MAN.slice(5), 368, GROUND - 13);
      sprite(MAN.slice(0, 5), 368, GROUND - 18 - hatLift);
    }
    // the moment of discovery
    if (u > 2.6 && u < 3.8) {
      var s = (u - 2.6);
      var hx = 379, hy = GROUND - 23;
      px(hx, hy, 'a'); px(hx, hy + 1, 'a'); px(hx, hy + 2, 'a'); px(hx, hy + 4, 'a');
      for (var i = 0; i < 5; i++) if (Math.sin(t * 6 + i) > 0.3) px(hx - 4 + i * 2, hy - 2 - (i % 2) * 2, 'w');
      // vein lights up
      for (i = 0; i < VEIN.length; i++) if ((i + Math.floor(t * 12)) % 5 === 0) { px(VEIN[i][0], Math.round(VEIN[i][1]) - 1, 'w'); }
    }
    // lens glint between prospector and vein
    if (bent) { px(392 + Math.round(Math.sin(t * 7)), 40, 'b'); }
  }

  // ---------- scene 4: spider ----------
  var WEB_C = { x: 560, y: 36 }, WEB_RX = 31, WEB_RY = 12;
  function spiralPt(s) { // s in [0,1] along a 5-turn spiral
    var turns = 5, th = s * turns * Math.PI * 2, r = 0.12 + 0.86 * s;
    return { x: WEB_C.x + Math.cos(th) * WEB_RX * r, y: WEB_C.y + Math.sin(th) * WEB_RY * r };
  }
  function sceneSpider(u, t) {
    var i, n;
    // thread from above and the spider's descent
    var drop = ease(clamp(u / 0.7, 0, 1));
    var sp = { x: WEB_C.x, y: lerp(-4, WEB_C.y, drop) };
    if (u < 1.2) line(WEB_C.x, -4, WEB_C.x, sp.y, 'b');
    // spokes
    var spokes = 10, spokeProg = clamp((u - 0.5) / 1.6, 0, 1);
    for (i = 0; i < spokes; i++) {
      var a = i / spokes * Math.PI * 2 + 0.2;
      var p = clamp(spokeProg * spokes - i, 0, 1);
      if (p <= 0) continue;
      var ex = WEB_C.x + Math.cos(a) * WEB_RX * 1.02, ey = WEB_C.y + Math.sin(a) * WEB_RY * 1.1;
      line(WEB_C.x, WEB_C.y, lerp(WEB_C.x, ex, p), lerp(WEB_C.y, ey, p), 'b');
      if (p < 1) sp = { x: lerp(WEB_C.x, ex, p), y: lerp(WEB_C.y, ey, p) };
    }
    // spiral, drawn outward
    var spiralProg = clamp((u - 2.1) / 2.9, 0, 1);
    n = Math.floor(spiralProg * 420);
    var prev = null;
    for (i = 0; i <= n; i++) {
      var q = spiralPt(i / 420);
      if (prev) line(prev.x, prev.y, q.x, q.y, (i % 9 === 0 && Math.sin(t * 4 + i) > 0.8) ? 'w' : 'b');
      prev = q;
    }
    if (spiralProg > 0 && spiralProg < 1) sp = prev;
    else if (spiralProg >= 1) sp = { x: WEB_C.x, y: WEB_C.y + Math.round(Math.sin(t * 2)) };
    // anchor threads to posts
    if (spokeProg > 0.9) { line(WEB_C.x - WEB_RX, WEB_C.y, 524, 30, 'b'); line(WEB_C.x + WEB_RX, WEB_C.y, 596, 30, 'b'); line(WEB_C.x - WEB_RX, WEB_C.y, 524, 44, 'b'); line(WEB_C.x + WEB_RX, WEB_C.y, 596, 44, 'b'); }
    sprite(SPIDER, sp.x - 4, sp.y - 3);
  }

  // ---------- scene 5: whale ----------
  var plankton = [];
  for (var pi = 0; pi < 140; pi++) plankton.push({ x: 732 + hash(pi, 1) * 60, y: 62 + hash(pi, 2) * 36, ph: hash(pi, 3) * 6.28, eaten: 0 });
  var lastU5 = 0;
  function sceneWhale(u, t) {
    if (u < lastU5) for (var r = 0; r < plankton.length; r++) plankton[r].eaten = 0; // new loop
    lastU5 = u;
    var cx = 700 + ease(clamp((u - 1.0) / 3.5, 0, 1)) * 10, cy = 78, rx = 34, ry = 13;
    var open = u < 1.0 ? 0.04 : u < 2.4 ? lerp(0.04, 0.46, ease((u - 1.0) / 1.4)) : u < 4.4 ? 0.46 : u < 5.4 ? lerp(0.46, 0.04, ease((u - 4.4) / 1.0)) : 0.04;
    var M = { x: cx, y: cy };
    var wag = Math.sin(t * 2.5) * 2;
    // tail flukes
    for (var x = cx - rx - 13; x <= cx - rx + 2; x++) {
      var s = (cx - rx + 2 - x) / 15, half = Math.round(1 + s * s * 8);
      for (var y = -half; y <= half; y++) if (Math.abs(y) > s * 2.2 || s < 0.4) px(x, cy + wag * s + y, 'a');
    }
    // body: upper part and the mouth interior, then the rotated lower jaw
    var cosO = Math.cos(open), sinO = Math.sin(open), i;
    for (x = cx - rx; x <= cx + rx; x++) for (y = cy - ry; y <= cy + ry; y++) {
      var dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      var belly = y > cy + ry * 0.3;
      if (x > M.x && y > M.y) { // lower jaw region
        px(x, y, (y - M.y) <= 5 && (x % 2 === 0) ? 'b' : 'k'); // mouth interior with baleen
      } else px(x, y, belly ? 'A' : 'a');
    }
    // lower jaw, rotated down by `open` about the hinge M (inverse-mapped so it stays solid)
    for (x = M.x - 2; x <= M.x + rx + 4; x++) for (y = M.y; y <= M.y + ry + 22; y++) {
      var jx = x - M.x, jy = y - M.y;
      var ux = jx * cosO + jy * sinO, uy = -jx * sinO + jy * cosO; // back into the whale's own frame
      if (ux <= 0 || uy <= 0) continue;
      var ex = ux / rx, ey = uy / ry;
      if (ex * ex + ey * ey <= 1) px(x, y, (uy > ry * 0.3 || true) ? 'A' : 'a');
    }
    // eye, fin, blowhole bubbles
    px(M.x + 16, M.y - 5, 'w'); px(M.x + 17, M.y - 5, 'k');
    for (i = 0; i < 6; i++) px(cx - 6 - i, cy + ry - 1 + Math.round(i * 0.8 + Math.sin(t * 3) * 0.5), 'a');
    for (i = 0; i < 4; i++) { var bt = (t * 0.6 + i * 0.25) % 1; px(cx + 2 + Math.sin(bt * 9 + i) * 1.5, cy - ry - bt * 26, bt > 0.9 ? 'w' : 'b'); }
    // plankton drifting into the mouth
    for (i = 0; i < plankton.length; i++) {
      var p = plankton[i];
      if (p.eaten) { if (u - p.eaten < 0.25) px(p.ex, p.ey, 'w'); continue; }
      var pxx = p.x - u * 3.2 + Math.sin(t * 1.5 + p.ph) * 1.2, pyy = p.y + Math.sin(t * 0.9 + p.ph * 2) * 1.5;
      // inside the open mouth?
      var ddx = pxx - M.x, ddy = pyy - M.y, ang = Math.atan2(ddy, ddx);
      if (open > 0.25 && ddx > 0 && ddx < rx + 2 && ang > -0.05 && ang < open) { p.eaten = u; p.ex = pxx; p.ey = pyy; continue; }
      px(pxx, pyy, (i % 3 === 0) ? 'A' : 'a');
    }
  }

  // ---------- timeline ----------
  var scenes = [
    { cx: 80, cy: 8, dwell: 7.2, draw: sceneFisher },
    { cx: 240, cy: 8, dwell: 5.0, draw: sceneCham },
    { cx: 400, cy: 8, dwell: 5.0, draw: sceneProspector },
    { cx: 560, cy: 8, dwell: 6.2, draw: sceneSpider },
    { cx: 720, cy: 44, dwell: 7.2, draw: sceneWhale }
  ];
  var GLIDE = 1.7, TOTAL = scenes.reduce(function (a, s) { return a + s.dwell; }, 0) + GLIDE * scenes.length;

  function frame(t) {
    var tt = t % TOTAL, acc = 0, i, local = [];
    cam.x = 0; cam.y = 0;
    for (i = 0; i < scenes.length; i++) {
      var s = scenes[i], nxt = scenes[(i + 1) % scenes.length];
      if (tt < acc + s.dwell) { cam.x = s.cx - cols / 2; cam.y = s.cy; local[i] = tt - acc; break; }
      acc += s.dwell;
      if (tt < acc + GLIDE) {
        var g = ease((tt - acc) / GLIDE);
        var targetX = nxt.cx + (i === scenes.length - 1 ? WORLD_W : 0);
        cam.x = lerp(s.cx, targetX, g) - cols / 2; cam.y = lerp(s.cy, nxt.cy, g);
        local[i] = s.dwell; local[(i + 1) % scenes.length] = 0; break;
      }
      acc += GLIDE;
    }
    cam.x = Math.round(wrap(cam.x)); cam.y = Math.round(cam.y);
    drawStatic(t);
    for (i = 0; i < scenes.length; i++) scenes[i].draw(local[i] === undefined ? (i === 0 && tt >= TOTAL - GLIDE ? 0 : scenes[i].dwell) : local[i], t);
    // blit
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var cs = cell * dpr;
    for (var vy = 0; vy < ROWS; vy++) for (var vx = 0; vx < cols; vx++) {
      ctx.drawImage(dots[buf[vy * cols + vx]], vx * cs, vy * cs);
    }
  }

  // Expose for screenshots/tests: window.__hunt.seek(seconds)
  window.__hunt = { seek: function (s) { paused = true; lastT = s; frame(s); }, total: TOTAL, scenes: scenes, glide: GLIDE };

  var paused = false, start = null, running = true;
  var _frame = frame; frame = function (t) { lastT = t; _frame(t); };
  function loop(ts) {
    if (!start) start = ts;
    if (!paused && running) frame((ts - start) / 1000);
    requestAnimationFrame(loop);
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { running = es[0].isIntersecting; }, { threshold: 0.05 }).observe(canvas);
  }
  resize();
  var lastT = 3.0;
  window.addEventListener('resize', function () { resize(); if (reduced || paused) frame(lastT); });
  if (reduced) frame(3.0); else requestAnimationFrame(loop);
})();
