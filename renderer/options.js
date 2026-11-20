'use strict';
(function () {
  var $ = function (id) { return document.getElementById(id); }, T = {};
  var LABELS = ['h', 'gGen', 'lUi', 'lZoom', 'lLook', 'lAcc', 'gAi', 'lMode', 'tAi', 'ai', 'tTheme', 'theme', 'tMsg', 'lOn', 'dMsg', 'lId', 'lTo', 'lTone', 'lSay',
    'tDl', 'pickDir', 'lAsk', 'tPacks', 'lDir', 'pDir', 'gStore', 'lFresh', 'fresh', 'lWipe', 'wipe', 'dStore'];
  function labels() { LABELS.forEach(function (k) { $(k).textContent = T[k] || ''; }); document.title = T.h || 'Options'; Help.wire(T); }
  var fill = function (sel, opts, v) {   // its options, then its value (one it does not list is added, never lost)
    if (!opts.some(function (o) { return o[0] === v; }) && v != null) opts = opts.concat([[v, String(v)]]);
    var key = JSON.stringify(opts);
    if (sel.dataset.k !== key) { sel.textContent = ''; opts.forEach(function (o) { var e = document.createElement('option'); e.value = o[0]; e.textContent = o[1]; if (o[2]) e.disabled = true; sel.appendChild(e); }); sel.dataset.k = key; }
    if (document.activeElement !== sel) sel.value = v;
  };
  function say(r) { $('msg').className = r.ok ? 'ok' : 'err'; $('msg').textContent = r.ok ? (r.opened ? T.opened : r.shown ? T.shown : r.relaunched ? T.relaunched : r.cleaned ? T.cleaned : r.wiped ? T.wiped : r.kept ? '' : T.saved) : (T[r.error] || r.error || 'error'); }
  function paint(s) {
    last = s; if (s.t) { T = s.t; labels(); }
    fill($('ui'), (s.langs || []).map(function (l) { return [l.code, l.name]; }), s.lang);
    fill($('zoom'), [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2].map(function (z) { return [String(z), Math.round(z * 100) + ' %']; }), String(s.zoom));
    fill($('mode'), s.modes.map(function (m) { return [m, T[m] || m]; }), s.mode);
    fill($('look'), [['auto', T.lookAuto], ['light', T.lookLight], ['dark', T.lookDark]], s.look);
    swatches(s.accent);
    var c = s.config;
    $('mon').checked = !!c.msg.on;
    if (document.activeElement !== $('uid')) $('uid').value = c.msg.id;
    fill($('to'), [['arnes', '53ON'], ['vscodex', 'vscodex']], c.msg.to);
    fill($('tone'), [['voice', T.voice], ['t1', T.tone + ' 1'], ['t2', T.tone + ' 2'], ['t3', T.tone + ' 3'], ['custom', T.custom], ['off', T.silent]], c.msg.tone);
    if (document.activeElement !== $('say')) $('say').value = c.msg.say;
    $('dl').textContent = s.dl || ''; $('dl').title = s.dl || ''; $('ask').checked = !!(c.downloads || {}).ask;   // where downloads land, and whether it asks
    $('say').placeholder = T.sayDef || ''; $('sayRow').style.display = c.msg.tone === 'voice' ? '' : 'none';   // what the voice says, its owner's words; empty = the default in its language
    var box = $('packs'); if (box.contains(document.activeElement)) return; box.textContent = '';   // never under its owner's hand
    var plugs = s.plugins || [];
    if (!s.packs.length && !plugs.length) box.appendChild(el('div', 'cell', T.none));
    s.packs.forEach(function (p) { row(p.ttl, p.ver + (p.kind === 'plug' ? '' : ' · ' + (p.running ? T.run : T.stop)), p.on, function (on) { return { pack: { id: p.id, on: on } }; }); });
    plugs.forEach(plugin);
    Help.wire(T);   // the «?» just drawn
  }
  var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  var tap = function (b, f) { b.type = 'button'; b.addEventListener('click', function () { b.blur(); f(); }); return b; };   // blurred: the list repaints
  var open = {}, drafts = {}, last = null;
  function row(ttl, sub, on, pay, dir) {
    var r = el('div', 'cell'), t = el('span', '', ttl), sw = el('label', 'sw'), cb = el('input');
    t.appendChild(el('small', '', sub)); r.appendChild(t);
    if (dir) {
      var ed = tap(el('button', open[dir] ? 'open' : '', '✎'), function () { open[dir] = !open[dir]; delete drafts[dir]; paint(last); }), rm = tap(el('button', '', '×'), function () { save({ plug: { op: 'del', dir: dir } }); });
      ed.title = T.pEdit; ed.disabled = !on; rm.title = T.pDel; r.appendChild(ed); r.appendChild(rm);
    }
    cb.type = 'checkbox'; cb.checked = on; cb.addEventListener('change', function () { cb.disabled = true; save(pay(cb.checked)); });
    sw.appendChild(cb); sw.appendChild(el('span')); r.appendChild(sw); $('packs').appendChild(r);
  }
  var LEVELS = ['bypass', 'auto', 'manual', 'plan'];   // the permission button's, the most trusting first: a command is born with it
  function plugin(p) {
    row(p.name || p.dir, (p.version ? p.version + ' · ' : '') + T.home, p.on, function (on) { return { plug: { op: 'set', dir: p.dir, p: { on: on } } }; }, p.dir);
    if (!p.on || !open[p.dir]) return;
    var d = drafts[p.dir] || (drafts[p.dir] = JSON.parse(JSON.stringify({ name: p.name, version: p.version, dir: p.dir, conf: p.conf, comment: p.comment, commands: p.commands })));
    var cab = !!(last && last.cable), redraw = function () { paint(last); };
    var sub = function (kids) { var c = el('div', 'cell sub'); kids.forEach(function (k) { c.appendChild(k); }); $('packs').appendChild(c); return c; };
    var inp = function (o, k, n) { var i = el('input'); i.type = 'text'; i.value = o[k] || ''; i.maxLength = n; i.addEventListener('input', function () { o[k] = i.value; }); return i; };
    var nv = el('div', 'cmds nv'), at = el('span', 'path', d.dir), g = el('div', 'cmds' + (cab ? '' : ' nocable')), q = el('button', 'help'), cf = inp(d, 'conf', 260);
    [T.pName, T.pVer].forEach(function (x) { nv.appendChild(el('span', 'th', x)); });
    nv.appendChild(inp(d, 'name', 40)); nv.appendChild(inp(d, 'version', 16));
    sub([nv]); at.title = d.dir;
    sub([at, tap(el('button', '', T.pDir), function () { save({ plug: { op: 'pick' } }).then(function (s) { if (s && s.picked) { d.dir = s.picked; redraw(); } }); })]);
    cf.placeholder = T.pConfP; sub([el('span', '', T.pConf), cf]);   // its options menu: whatever its author put in its folder, or the web
    [T.cCmd, T.cHelp, T.cOn, T.cHelper].concat(cab ? [T.cCable] : [], [T.cPerm]).forEach(function (x) { g.appendChild(el('span', 'th', x)); });
    q.type = 'button'; q.dataset.help = 'Cmds'; g.appendChild(q);
    d.commands.forEach(function (c, i) {
      var a = inp(c, 'cmd', 100), h = inp(c, 'help', 80), m = el('select');
      if (c.active === false) a.className = h.className = 'off';
      g.appendChild(a); g.appendChild(h);
      ['active', 'helper'].concat(cab ? ['cable'] : []).forEach(function (k) {   // inactive: gray and still, its marks kept
        var b = el('input', 'ck'); b.type = 'checkbox'; b.checked = c[k] !== false; b.disabled = k !== 'active' && c.active === false;
        b.addEventListener('change', function () { c[k] = b.checked; b.blur(); redraw(); }); g.appendChild(b);
      });
      LEVELS.forEach(function (k) { var o = el('option', '', T[k]); o.value = k; m.appendChild(o); }); m.value = c.perm || 'bypass'; m.disabled = c.active === false;
      m.addEventListener('change', function () { c.perm = m.value; m.blur(); }); g.appendChild(m);
      var x = tap(el('button', '', '×'), function () { d.commands.splice(i, 1); redraw(); }); x.title = T.cDel; g.appendChild(x);
    });
    sub([g]);
    sub([el('span'), tap(el('button', '', T.pAdd), function () { d.commands.push({}); redraw(); })]);
    sub([el('span', '', T.pNote), inp(d, 'comment', 200)]);
    var ok = tap(el('button', 'open', T.pSave), function () { save({ plug: { op: 'set', dir: p.dir, p: d } }).then(function (s) { if (s && s.ok !== false) { delete drafts[p.dir]; open[p.dir] = false; redraw(); } }); });
    sub([el('span'), tap(el('button', '', T.pCancel), function () { delete drafts[p.dir]; open[p.dir] = false; redraw(); }), ok]).className += ' act';
  }
  $('pDir').addEventListener('click', function () { this.blur(); save({ plug: { op: 'add' } }); });   // a folder, picked as Downloads: made at home or a repository
  var COLORS = ['#7c5cff', '#0a84ff', '#30d158', '#ffd60a', '#ff9f0a', '#ff453a', '#ff375f', '#8e8e93'];
  function swatches(v) {
    var box = $('acc');
    if (!box.children.length) {
      COLORS.forEach(function (c) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sw1'; b.dataset.c = c; b.style.background = c; b.title = c; b.addEventListener('click', function () { save({ accent: c }); }); box.appendChild(b); });
      var l = document.createElement('label'), i = document.createElement('input');   // any color of its owner's (the system's picker)
      l.className = 'sw1 pick'; i.type = 'color'; i.id = 'accPick'; i.addEventListener('change', function () { save({ accent: i.value }); i.blur(); }); l.appendChild(i); box.appendChild(l);
    }
    var own = COLORS.indexOf(v) < 0, pk = box.lastChild;
    Array.prototype.forEach.call(box.children, function (b) { b.classList.toggle('on', b === pk ? own : b.dataset.c === v); });
    pk.style.background = own && v ? v : ''; if (v && document.activeElement !== $('accPick')) $('accPick').value = v;   // never under its owner's hand (the 3 s repaint undid a pick)
    if (v) document.documentElement.style.setProperty('--acc', v);
  }
  function load() { Options.get().then(function (s) { if (s && s.ok !== false) paint(s); }); }
  function save(p) { return Options.set(p).then(function (s) { if (s && s.config) paint(s); say(s || {}); return s; }); }
  $('ui').addEventListener('change', function () { save({ lang: this.value }); });
  $('zoom').addEventListener('change', function () { save({ zoom: +this.value }); });
  $('mode').addEventListener('change', function () { save({ mode: this.value }); });
  $('ai').addEventListener('click', function () { save({ ai: 1 }); });
  $('look').addEventListener('change', function () { save({ look: this.value }); });
  $('theme').addEventListener('click', function () { save({ theme: 1 }); });
  var msg = function () { save({ msg: { on: $('mon').checked, id: $('uid').value, to: $('to').value } }); };
  ['mon', 'uid', 'to'].forEach(function (k) { $(k).addEventListener('change', msg); });
  $('tone').addEventListener('change', function () { save(this.value === 'custom' ? { pickTone: true } : { msg: { tone: this.value } }); });
  $('say').addEventListener('change', function () { save({ msg: { say: this.value.trim() } }); });
  $('pickDir').addEventListener('click', function () { save({ pickDir: 1 }); });
  $('fresh').addEventListener('click', function () { save({ fresh: 1 }); });
  $('wipe').addEventListener('click', function () { save({ wipe: 1 }); });
  $('ask').addEventListener('change', function () { save({ downloads: { ask: this.checked } }); });
  load(); setInterval(load, 3000);   // a complement changes on its own (it starts, it fails)
})();
