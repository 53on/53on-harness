'use strict';
const { session, dialog, ipcMain, screen, BrowserWindow } = require('electron');
const PART = 'persist:body', BAR = 32, FOOT = 24, tabs = new Map(), logs = { console: [], net: [] }, said = new Map();
const ring = (a, x) => { a.push(x); if (a.length > 200) a.shift(); };
const own = (u) => { try { return new URL(u).origin === 'https://53on.com'; } catch (_) { return false; } };
let ses = null, peer = null, gone = null, M = null, arnesOk = false;   // M: the Arnés's view, its gate, the body (main.js)
function sess() {
  if (ses) return ses;
  ses = session.fromPartition(PART);
  ses.setUserAgent(ses.getUserAgent().replace(/ (53on|Electron)\/\S+/gi, ''));
  ses.webRequest.onCompleted((d) => ring(logs.net, { url: d.url, method: d.method, status: d.statusCode, type: d.resourceType, ts: Date.now() }));
  require('./shell-window').applyCorsHeaders(ses, (d) => own(d.frame && d.frame.url));   // 53on.com here reaches its AI providers as in the owner's view
  ses.setPermissionCheckHandler((wc, p, o) => own(o) || said.get(o + ' ' + p) === true);
  ses.setPermissionRequestHandler((wc, p, cb, d) => {
    let o = ''; try { o = new URL(d.requestingUrl).origin; } catch (_) {}
    const k = o + ' ' + p, t = [...tabs.values()].find((x) => x.wc === wc), __ = require('./i18n').__;
    if (own(o)) return cb(true);
    if (said.has(k)) return cb(said.get(k));
    dialog.showMessageBox(t && t.win, { type: 'question', buttons: [__('web.allow'), __('web.block')], defaultId: 1, cancelId: 1, message: __('web.ask', { site: o, what: p }) })
      .then((r) => { said.set(k, r.response === 0); cb(r.response === 0); }, () => cb(false));
  });
  return ses;
}
const settle = (wc, ms) => new Promise((r) => { if (!wc.isLoading()) return setTimeout(r, 150); const t = setTimeout(r, ms || 15000); wc.once('did-stop-loading', () => { clearTimeout(t); r(); }); });
function tell(t) {
  const h = t.wc.navigationHistory;
  if (t.bar && !t.bar.isDestroyed()) t.bar.send('web:at', { url: t.wc.getURL(), back: h.canGoBack(), fwd: h.canGoForward(), loading: t.wc.isLoading(), name: t.win.getTitle() });
}
const address = (u) => /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : /^[^\s]+\.[^\s]{2,}$/.test(u) || /^localhost(:\d+)?(\/|$)/.test(u) ? 'https://' + u : 'https://www.google.com/search?q=' + encodeURIComponent(u);
function make(name, show, o) {
  const was = tabs.get(name);
  if (was && !was.wc.isDestroyed()) return was;
  if (name === 'arnes') { const a = { name: name, win: M.win(), wc: M.view().webContents, arnes: 1 }; tabs.set(name, a); return a; }
  sess();
  o = o || {};
  const wp = { partition: PART, backgroundThrottling: false }, t = { name: name };
  if ((name === 'main' || o.win) && show !== false) {   // a section's window keeps its own place and says its name
    const title = o.title ? String(o.title).slice(0, 60) : '';
    const v = require('./shell-window.js').apartView(name === 'main' ? 'web' : 'web:' + name, wp, { width: 1280, height: 860 + BAR, show: true },
      o.world ? { file: 'world-bar.html', preload: 'web-bar-preload.js', title, game: 1 }
        : { file: 'web-bar.html', preload: 'web-bar-preload.js', title, foot: { file: 'web-foot.html', h: FOOT, on: () => !!(M && M.foot()) } });
    if (!v) throw new Error('web_open');
    Object.assign(t, { win: v.win, wc: v.webContents, bar: v.bar, v: v });
    ['did-navigate', 'did-navigate-in-page', 'did-start-loading', 'did-stop-loading'].forEach((ev) => t.wc.on(ev, () => tell(t)));
    t.bar.on('did-finish-load', () => tell(t));
  } else {   // one nobody sees (hidden, dev, the messenger's) is painted offscreen: a hidden window stops painting and its
    const w = new BrowserWindow({ show: false, width: 1280, height: 860, webPreferences: Object.assign({ sandbox: true, contextIsolation: true, offscreen: true }, wp) });
    w.webContents.setFrameRate(30);
    Object.assign(t, { win: w, wc: w.webContents });
  }
  const wc = t.wc;
  wc.setWindowOpenHandler(() => ({ action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, webPreferences: { partition: PART, sandbox: true, contextIsolation: true } } }));
  wc.on('console-message', (e) => {
    ring(logs.console, { type: e.level === 'info' ? 'log' : e.level, text: String(e.message), ts: Date.now(), tab: name });
    require('./audit').log({ debug: 0, info: 1, warning: 2, error: 3 }[e.level] || 0, e.message, name + ' · ' + e.sourceId + ':' + e.lineNumber);
  });
  wc.on('render-process-gone', () => { if (!wc.isDestroyed()) wc.reload(); });
  wc.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    const h = wc.navigationHistory, k = i.key;
    if (k === 'F5' || (i.control && k.toLowerCase() === 'r')) wc.reload();
    else if (k === 'F12') wc.toggleDevTools();
    else if (i.alt && k === 'ArrowLeft' && h.canGoBack()) h.goBack();
    else if (i.alt && k === 'ArrowRight' && h.canGoForward()) h.goForward();
    else return;
    e.preventDefault();
  });
  t.win.on('closed', () => { if (tabs.get(name) === t) tabs.delete(name); });
  tabs.set(name, t);
  if (o.home && name !== 'main') t.born = wc.loadURL(address(String(o.home))).catch(() => {});   // born at home, as main (the body takes main there)
  return t;
}
function cdp(wc, method, params) {
  if (!wc.debugger.isAttached()) { wc.debugger.attach('1.3'); wc.debugger.sendCommand('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {}); }
  return wc.debugger.sendCommand(method, params || {});
}
function letGo(k, t) {
  let n = 0;
  try { if (t.wc.debugger.isAttached()) { t.wc.debugger.detach(); n = 1; } } catch (_) {}
  if (t.arnes) tabs.delete(k);
  return n;
}
function close(name) {
  for (const [k, t] of [...tabs]) if (!name || k === name) { if (t.arnes) { letGo(k, t); continue; } tabs.delete(k); try { t.win.destroy(); } catch (_) {} }
}
function foot() { for (const t of tabs.values()) if (t.v && !t.win.isDestroyed()) t.v.fit(); }
async function ask(m, p) {
  const op = String(m.op || ''), name = /^[a-z][a-z0-9]{0,11}$/.test(m.tab || '') ? m.tab : 'main';   // ☠️ test(undefined) reads «undefined»: a name
  if (op === 'close') return close(m.tab), { ok: true };
  if (op === 'logs') { const a = logs[m.kind] || logs.console, l = a.slice(-(+m.n || 200)); if (m.clear) a.length = 0; return { ok: true, list: l }; }
  if (op === 'list') return { ok: true, tabs: [...tabs].map(([n, t]) => ({ tab: n, url: t.wc.getURL(), title: t.wc.getTitle() })) };
  if (op === 'free') { let n = 0; for (const [k, t] of [...tabs]) if (!m.tab || k === m.tab) n += letGo(k, t); return { ok: true, freed: n }; }
  if (op === 'arnes') return (await M.ask()) ? (arnesOk = true, { ok: true }) : { ok: false, error: 'denied' };
  if (!/^(open|cdp|go|nav|url|shot|bounds|front|wake)$/.test(op)) return { ok: false, error: 'op_bad' };
  if (name === 'arnes' && !arnesOk) return { ok: false, error: 'arnes_not_allowed' };
  if (p && p !== peer) { peer = p; p.on('close', () => { if (peer !== p) return; peer = null; clearTimeout(gone); gone = setTimeout(close, 10000); }); }
  clearTimeout(gone);
  const t = make(name, m.show, op === 'go' ? Object.assign({}, m, { home: '' }) : m), wc = t.wc;   // one born to go somewhere goes there
  if (t.born) { await t.born; t.born = null; }   // the rest see it at home
  if (op === 'cdp') return { ok: true, r: await cdp(wc, String(m.method), m.params) };
  if (op === 'shot') {
    const r = m.w ? { x: +m.x || 0, y: +m.y || 0, width: +m.w, height: +m.h } : undefined;
    if (!wc.isOffscreen() && (t.win.isMinimized() || !t.win.isVisible())) await wc.capturePage(r, { stayHidden: true }).catch(() => {});
    let i = await wc.capturePage(r, { stayHidden: true });
    const f = screen.getDisplayMatching(t.win.getBounds()).scaleFactor * wc.getZoomFactor();
    if (f !== 1 && !i.isEmpty()) i = i.resize({ width: Math.max(1, Math.round(i.getSize().width / f)), quality: 'best' });
    const z = i.getSize();
    return { ok: !i.isEmpty(), b64: i.toPNG().toString('base64'), w: z.width, h: z.height };
  }
  if (op === 'go') {
    let e = '';
    await Promise.race([wc.loadURL(address(String(m.url || '').trim())).catch((x) => { e = String(x.code || x.message); }), new Promise((r) => setTimeout(r, +m.ms || 30000))]);
    return Object.assign({ ok: !e || e === 'ERR_ABORTED', url: wc.getURL() }, e ? { error: e } : {});
  }
  if (op === 'nav') {
    const h = wc.navigationHistory, to = String(m.to);
    if (to === 'reload') wc.reload();
    else if (to === 'back' ? !h.canGoBack() : to !== 'forward' || !h.canGoForward()) return { ok: false, error: 'no_' + to, url: wc.getURL() };
    else to === 'back' ? h.goBack() : h.goForward();
    await settle(wc, +m.ms);
    return { ok: true, url: wc.getURL() };
  }
  if (op === 'bounds') {   // the page's own rect on the screen (under the bar); given a size or a place, the window takes it
    if (t.arnes) { const c = t.win.getContentBounds(), r = M.view().getBounds(); return { ok: true, x: c.x + r.x, y: c.y + r.y, w: r.width, h: r.height, shown: t.win.isVisible() }; }   // its owner's window: never resized
    const w = t.win, top = t.bar ? BAR : 0, low = t.v && M && M.foot() ? FOOT : 0;   // the strip under it, while shown
    if (m.w || m.h || m.x != null || m.y != null) {
      if (w.isMaximized()) w.unmaximize();
      const b = w.getContentBounds();
      w.setContentBounds({ x: m.x != null ? +m.x : b.x, y: m.y != null ? +m.y : b.y, width: +m.w || b.width, height: m.h ? +m.h + top + low : b.height });
    }
    const c = w.getContentBounds();
    return { ok: true, x: c.x, y: c.y + top, w: c.width, h: c.height - top - low, shown: w.isVisible() };
  }
  if (op === 'front') { if (t.win.isMinimized()) t.win.restore(); t.win.show(); t.win.focus(); }
  if (op === 'wake' && !t.arnes && t.win.isMinimized()) t.win.showInactive();
  return { ok: true, url: wc.getURL(), title: wc.getTitle() };
}
const of = (wc) => [...tabs.values()].find((t) => t.bar === wc || (t.v && t.v.foot === wc));   // a tab by its bar or its strip
function wire(m) {
  M = m;
  require('./door').handle('web', ask);
  ipcMain.on('web:words', (e) => { e.returnValue = of(e.sender) ? require('./i18n').bag('web') : null; });
  ipcMain.handle('web:ai', async (e, on) => {
    const t = of(e.sender);
    if (!t || t.bar === e.sender) return { ok: false, error: 'origin' };   // its strip's only (the gate's law)
    const r = await (on != null ? M.body('/ai', { tab: t.name, on: !!on }) : M.body('/ai?tab=' + t.name));
    return r && r.ok ? { ai: r.ai, master: r.master } : null;
  });
  ipcMain.on('web:bar', (e, op, u) => {
    const t = of(e.sender);
    if (!t || e.sender !== t.bar) return void (e.returnValue = null);   // its bar's only (the gate's law: refused is null)
    const h = t.wc.navigationHistory;
    if (op === 'go' && u) t.wc.loadURL(address(String(u).trim())).catch(() => {});
    else if (op === 'reload') t.wc.isLoading() ? t.wc.stop() : t.wc.reload();
    else if (op === 'back' && h.canGoBack()) h.goBack();
    else if (op === 'forward' && h.canGoForward()) h.goForward();
    else if (op === 'immersive' && t.v.immersive) t.v.immersive(true);
  });
}
module.exports = { wire: wire, close: close, ask: ask, foot: foot };
