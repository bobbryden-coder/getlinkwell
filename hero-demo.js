/* Linkwell hero demo.
   A scripted walkthrough that plays inside the dark app window: brief -> working steps -> ranked
   list -> shortlist -> outreach on a calendar -> call to action, then loops.
   Nothing here talks to a server. Every person, company, email address and phone number is made
   up: email domains use the reserved .example ending and mobiles use Ofcom's drama range
   (07700 900000 to 900999), so none of them can belong to a real person. */
(function () {
  var root = document.getElementById('heroDemo');
  if (!root) return;
  var me = document.currentScript;
  var IMG = (me && me.getAttribute('data-img')) || '/headshots/';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function face(key) { var i = el('img'); i.src = IMG + key + '.jpg'; i.alt = ''; i.width = 44; i.height = 44; i.decoding = 'async'; return i; }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  // ---------- the script ----------
  var ROLE = 'Senior Backend Engineer, London';
  var BRIEF = 'Senior backend engineer for a Series B payments company in London. Go, Postgres and event streaming, five years or more. Hybrid, three days in Shoreditch.';
  var FILE_NAME = 'Senior_Backend_Engineer.pdf';
  var FILE_ASK = 'Find people for this role.';
  var STEPS = [
    ['Reading the brief', 'Senior Backend Engineer, London, hybrid. Must-haves: Go, Postgres, event streaming, 5+ years.'],
    ['Searching profiles', 'Searched {2140} profiles in and around London'],
    ['Filtering out job hoppers', 'Left out {318} people who rarely stay 18 months'],
    ['Scoring against the must-haves', 'Scored {86} profiles. {24} are a strong match.']
  ];
  var PEOPLE = [
    { key: 'daniel', name: 'Daniel Mensah', role: 'Staff Backend Engineer @ Paylark', score: 94,
      why: 'Moved Paylark from batch jobs to Kafka. Six years of Go, four of them in one team.',
      email: 'daniel.mensah@owlpost.example', phone: '07700 900142',
      mail: "Hi Daniel,\n\nI'm hiring a senior backend engineer for a Series B payments company in Shoreditch. You moved Paylark from batch jobs to Kafka, and that is the work they need done next.\n\nOpen to a short call this week?\n\nSam" },
    { key: 'hannah', name: 'Hannah Liu', role: 'Senior Software Engineer @ Kitebridge', score: 91,
      why: 'Runs the payments ledger on Postgres. Already works hybrid in London.',
      email: 'hannah.liu@fernmail.example', phone: '07700 900318',
      mail: "Hi Hannah,\n\nA Series B payments company in Shoreditch is rebuilding its ledger, and you have run one on Postgres at Kitebridge for four years. They would like to meet you.\n\nWould a short call this week suit?\n\nSam" },
    { key: 'callum', name: 'Callum Reid', role: 'Senior Backend Engineer @ Mossbank', score: 88,
      why: 'Built event pipelines that carry 40,000 messages a second. Five years at Mossbank.',
      email: 'callum.reid@owlpost.example', phone: '07700 900467',
      mail: "Hi Callum,\n\nYour event pipeline work at Mossbank is the closest match I have found for a senior backend role at a London payments company.\n\nDo you have twenty minutes this week?\n\nSam" },
    { key: 'leo', name: 'Leo Santos', role: 'Platform Engineer @ Fennick', score: 85,
      why: 'Strong Go and Postgres. Less streaming work than the brief asks for.',
      email: 'leo.santos@fernmail.example', phone: '07700 900583' },
    { key: 'anjali', name: 'Anjali Menon', role: 'Backend Engineer @ Stackharbour', score: 83,
      why: 'Four years of Go on a trading platform. Based in Reading, so a longer commute.',
      email: 'anjali.menon@owlpost.example', phone: '07700 900726' }
  ];
  var SHORT = [0, 1, 2], PASSED = 3;
  var SUBJECT = 'Senior backend role at a London payments company';
  var SENDS = [ // day index in a two-week Monday-first grid
    { day: 1, time: '09:10', label: 'First email' },
    { day: 4, time: '09:40', label: 'Follow-up' },
    { day: 9, time: '10:15', label: 'Last follow-up' }
  ];

  // ---------- build the parts that repeat ----------
  var scenes = {};
  [].forEach.call(root.querySelectorAll('.hd-scene'), function (s) { scenes[s.getAttribute('data-scene')] = s; });
  var title = $('hdTitle'), ask = $('hdAsk'), file = $('hdFile'), send = $('hdSend'), bubble = $('hdBubble');
  var count = $('hdCount'), go = $('hdGo'), more = $('hdMore'), cta = $('hdCta');
  var mailTo = $('hdTo'), mailSubj = $('hdSubj'), mailBody = $('hdBody'), note = $('hdNote'), ready = $('hdReady');

  var stepEls = STEPS.map(function (s) {
    var li = el('li', 'hd-step'), box = el('div'), sub = el('p', 'hd-sub');
    li.appendChild(el('span', 'hd-dot'));
    box.appendChild(el('b', null, s[0]));
    s[1].split(/(\{\d+\})/).forEach(function (part) {
      var m = /^\{(\d+)\}$/.exec(part);
      if (m) { var n = el('strong', null, '0'); n.setAttribute('data-n', m[1]); sub.appendChild(n); }
      else if (part) sub.appendChild(document.createTextNode(part));
    });
    box.appendChild(sub); li.appendChild(box);
    $('hdSteps').appendChild(li);
    return li;
  });

  var cards = PEOPLE.map(function (p) {
    var li = el('li', 'hd-card');
    var person = el('div', 'hd-person'), who = el('div', 'hd-who');
    var av = face(p.key); av.className = 'hd-av';
    who.appendChild(el('div', 'hd-name', p.name));
    who.appendChild(el('div', 'hd-role', p.role));
    person.appendChild(av); person.appendChild(who);
    var xc = el('div', 'hd-xc'), xe = el('span', 'hd-xc-i'), xp = el('span', 'hd-xc-i');
    xc.appendChild(xe); xc.appendChild(xp);
    var score = el('span', 'hd-score', '0');
    var status = el('div', 'hd-status'), badge = el('span', 'hd-badge', 'To review');
    status.appendChild(badge); status.appendChild(el('span', 'hd-tick'));
    li.appendChild(person); li.appendChild(score); li.appendChild(el('p', 'hd-why', p.why)); li.appendChild(status); li.appendChild(xc);
    $('hdCards').appendChild(li);
    return { li: li, score: score, badge: badge, email: xe, phone: xp };
  });
  ['more1', 'more2', 'more3', 'more4'].forEach(function (k) { more.querySelector('.hd-faces').appendChild(face(k)); });

  // Calendar: the two weeks starting next Monday, so the dates never look stale.
  var chips = [];
  (function () {
    var cal = $('hdCal'), dow = el('div', 'hd-dow');
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) { dow.appendChild(el('span', null, d)); });
    cal.appendChild(dow);
    var d = new Date(); d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var wk;
    for (var i = 0; i < 14; i++) {
      if (i % 7 === 0) { wk = el('div', 'hd-wk'); cal.appendChild(wk); }
      var weekend = i % 7 > 4;
      var cell = el('div', 'hd-day' + (weekend ? ' is-skip' : ''));
      cell.appendChild(el('div', 'hd-day-n', d.getDate() + (i === 0 || d.getDate() === 1 ? ' ' + months[d.getMonth()] : '')));
      SENDS.forEach(function (s, n) {
        if (s.day !== i) return;
        var chip = el('div', 'hd-calchip'), faces = el('span', 'hd-faces');
        chip.appendChild(el('span', 'hd-num', String(n + 1)));
        chip.appendChild(el('span', 'hd-chip-t', s.time));
        chip.appendChild(el('span', 'hd-chip-l', s.label));
        SHORT.forEach(function (k) { faces.appendChild(face(PEOPLE[k].key)); });
        chip.appendChild(faces); cell.appendChild(chip); chips[n] = chip;
      });
      if (weekend) cell.appendChild(el('div', 'hd-skip', 'Skipped'));
      wk.appendChild(cell);
      d.setDate(d.getDate() + 1);
    }
  })();
  var mtabs = SHORT.map(function (k) {
    var p = PEOPLE[k], t = el('span', 'hd-mtab');
    t.appendChild(face(p.key)); t.appendChild(document.createTextNode(p.name.split(' ')[0])); t.appendChild(el('i', null, '✓'));
    $('hdMtabs').appendChild(t);
    return t;
  });

  // ---------- small state setters ----------
  function show(name) {
    for (var k in scenes) scenes[k].classList.toggle('is-on', k === name);
    cta.classList.remove('is-on');
  }
  function typeInto(node, text) { return function (p) { node.textContent = text.slice(0, Math.round(p * text.length)); }; }
  function contact(i, kind, state) {
    var n = cards[i][kind], p = PEOPLE[i];
    n.textContent = ''; n.className = 'hd-xc-i';
    if (state === 'finding') { n.appendChild(el('i', 'hd-spin')); n.appendChild(document.createTextNode(kind === 'email' ? 'Finding personal email' : 'Finding mobile')); }
    else if (state === 'found') { n.classList.add('is-found'); n.textContent = p[kind]; }
  }
  function shortlisted(n) { count.textContent = n + ' shortlisted'; count.classList.toggle('is-in', n > 0); }
  function pickMail(n) {
    mtabs.forEach(function (t, i) { t.classList.toggle('is-sel', i === n); });
    mailTo.textContent = PEOPLE[SHORT[n]].email; mailSubj.textContent = SUBJECT; mailBody.textContent = '';
  }
  function drafted(n) { note.textContent = n ? n * 3 + ' of 9 emails drafted' : 'Writing each email from their own career history'; }

  // ---------- phases: each resets its scene, queues its cues, and returns how long it runs ----------
  var cues = [], tweens = [], loop = 0;
  function at(t, fn) { cues.push({ t: t, fn: fn }); }
  function tween(t0, d, fn) { tweens.push({ t0: t0, t1: t0 + d, fn: fn }); }
  function flush() {
    var all = cues.map(function (c) { return { t: c.t, run: c.fn }; })
      .concat(tweens.map(function (w) { return { t: w.t1, run: function () { w.fn(1); } }; }));
    all.sort(function (a, b) { return a.t - b.t; }).forEach(function (x) { x.run(); });
    cues = []; tweens = [];
  }
  function prime(build) { var c = cues, w = tweens; cues = []; tweens = []; build(); flush(); cues = c; tweens = w; }

  function brief() {
    show('brief'); title.textContent = 'New search';
    ask.textContent = ''; file.classList.remove('is-in'); send.classList.remove('is-pressed');
    if (loop % 2 === 1) { // every other loop a job spec is dropped in instead of typed
      at(500, function () { file.classList.add('is-in'); });
      tween(1300, 900, typeInto(ask, FILE_ASK));
      at(2900, function () { send.classList.add('is-pressed'); });
      return 3400;
    }
    tween(500, 3600, typeInto(ask, BRIEF));
    at(4600, function () { send.classList.add('is-pressed'); });
    return 5100;
  }
  function search() {
    show('work'); title.textContent = ROLE;
    bubble.textContent = loop % 2 === 1 ? FILE_NAME + '. ' + FILE_ASK : BRIEF;
    stepEls.forEach(function (li, i) {
      li.className = 'hd-step';
      var nums = [].slice.call(li.querySelectorAll('[data-n]'));
      nums.forEach(function (n) { n.textContent = '0'; });
      var t = 500 + i * 1500;
      at(t, function () { li.classList.add('is-in', 'is-active'); });
      if (nums.length) tween(t + 200, 900, function (p) { nums.forEach(function (n) { n.textContent = fmt(Math.round(p * n.getAttribute('data-n'))); }); });
      at(t + 1350, function () { li.classList.remove('is-active'); li.classList.add('is-done'); });
    });
    return 7300;
  }
  function list() {
    show('list'); title.textContent = ROLE + ' / Ranked list';
    shortlisted(0); go.className = 'hd-go'; more.classList.remove('is-in');
    cards.forEach(function (c, i) {
      c.li.className = 'hd-card'; c.score.textContent = '0'; c.badge.textContent = 'To review';
      contact(i, 'email'); contact(i, 'phone');
      var t = 350 + i * 420;
      at(t, function () { c.li.classList.add('is-in'); });
      tween(t + 100, 700, function (p) { c.score.textContent = Math.round(p * PEOPLE[i].score); });
      at(t + 500, function () { contact(i, 'email', 'finding'); });
      at(2900 + i * 420, function () { contact(i, 'email', 'found'); });
      at(3050 + i * 420, function () { contact(i, 'phone', 'finding'); });
      at(4300 + i * 420, function () { contact(i, 'phone', 'found'); });
    });
    at(2600, function () { more.classList.add('is-in'); });
    return 7800;
  }
  function shortlist() {
    prime(list);
    SHORT.forEach(function (k, n) {
      at(600 + n * 650, function () { cards[k].li.classList.add('is-short'); cards[k].badge.textContent = 'Shortlist'; shortlisted(n + 1); });
    });
    at(2900, function () { cards[PASSED].li.classList.add('is-out'); cards[PASSED].badge.textContent = 'Passed'; });
    at(3500, function () { go.classList.add('is-in'); });
    at(4500, function () { go.classList.add('is-pressed'); });
    return 5000;
  }
  function outreach() {
    show('seq'); title.textContent = ROLE + ' / Outreach';
    chips.forEach(function (c, n) { c.classList.remove('is-in'); at(500 + n * 450, function () { c.classList.add('is-in'); }); });
    mtabs.forEach(function (t) { t.className = 'hd-mtab'; });
    mailTo.textContent = ''; mailSubj.textContent = ''; mailBody.textContent = '';
    ready.classList.remove('is-on'); ready.textContent = 'Drafting'; drafted(0);
    var t = 700;
    SHORT.forEach(function (k, n) {
      var d = n === 0 ? 3000 : 1300;
      at(t, function () { pickMail(n); });
      tween(t + 150, d, typeInto(mailBody, PEOPLE[k].mail));
      at(t + d + 400, function () { mtabs[n].classList.add('is-done'); drafted(n + 1); });
      t += d + 800;
    });
    at(t, function () { note.textContent = '9 emails drafted. Nothing sends until you say so.'; ready.textContent = 'Ready to send from your Gmail'; ready.classList.add('is-on'); });
    if (reduced) return t + 100; // no overlay when nothing is moving: the hero buttons carry the ask
    at(t + 2200, function () { cta.classList.add('is-on'); });
    return t + 2200 + 7000;
  }
  var PHASES = [brief, search, list, shortlist, outreach];

  // ---------- player ----------
  var tabs = [].slice.call(document.querySelectorAll('.hd-tab'));
  var fills = tabs.map(function (t) { return t.querySelector('b'); });
  var pauseBtn = $('hdPause'), again = $('hdAgain'), modal = $('demo');
  var phase = 0, clock = 0, dur = 1, playing = true, visible = true, holding = false, last = 0;

  function start(i) {
    cues = []; tweens = []; clock = 0; phase = i;
    dur = PHASES[i]();
    cues.sort(function (a, b) { return a.t - b.t; });
    tabs.forEach(function (t, n) {
      t.classList.toggle('is-on', n === i);
      t.setAttribute('aria-pressed', n === i ? 'true' : 'false');
      fills[n].style.width = n < i ? '100%' : '0';
    });
    if (reduced) { flush(); fills[i].style.width = '100%'; }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(64, now - last); last = now;
    if (!playing || !visible || holding || document.hidden || (modal && modal.classList.contains('open'))) return;
    clock += dt;
    while (cues.length && cues[0].t <= clock) cues.shift().fn();
    for (var i = tweens.length - 1; i >= 0; i--) {
      var w = tweens[i];
      if (clock < w.t0) continue;
      var p = Math.min(1, (clock - w.t0) / (w.t1 - w.t0));
      w.fn(p);
      if (p >= 1) tweens.splice(i, 1);
    }
    fills[phase].style.width = Math.min(100, clock / dur * 100) + '%';
    if (clock >= dur) {
      if (phase === PHASES.length - 1) { loop++; start(0); } else start(phase + 1);
    }
  }
  function setPlaying(on) {
    playing = on;
    pauseBtn.classList.toggle('is-paused', !on);
    pauseBtn.setAttribute('aria-label', on ? 'Pause the demo' : 'Play the demo');
  }

  tabs.forEach(function (t, i) { t.addEventListener('click', function () { start(i); if (!reduced) setPlaying(true); }); });
  pauseBtn.addEventListener('click', function () { setPlaying(!playing); });
  again.addEventListener('click', function () { holding = false; loop++; start(0); setPlaying(true); });
  // Hold on the call to action while someone is pointing at it or tabbing through it.
  cta.addEventListener('mouseenter', function () { holding = true; });
  cta.addEventListener('mouseleave', function () { holding = false; });
  cta.addEventListener('focusin', function () { holding = true; });
  cta.addEventListener('focusout', function () { holding = false; });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.12 }).observe(root);
  }

  if (reduced) { start(2); return; } // a still frame of the ranked list; the tabs step through the rest
  start(0);
  requestAnimationFrame(function (now) { last = now; requestAnimationFrame(frame); });
})();
