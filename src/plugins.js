'use strict';
const fs = require('fs'), path = require('path'), { MODES } = require('./mode');
const CAP = { name: 40, version: 16, comment: 200, cmd: 100, help: 80, dir: 260 };
const EXAMPLE = { _: 'Copy an entry into plugins.json. cmd: the command line it uses (up to 100) · help: its line in the helper (up to 80) · active · helper: listed in the helper · cable: served to Claude Code and Codex · perm: bypass, auto, manual or plan · conf: its options menu, whatever is in its folder (.exe, .bat, .cmd, .html…) or a web address · main: code for the Body (routes), as Dev\'s',
  plugins: [{ name: 'mail', version: '0.1', dir: 'D:/Plugins/mail', on: true, conf: 'options.html', comment: 'My Gmail', commands: [
    { cmd: 'node D:/Plugins/mail/mail.js open', help: 'opens the inbox', active: true, helper: true, cable: true, perm: 'bypass' },
    { cmd: 'node D:/Plugins/mail/mail.js send', help: 'sends an email: <to> <subject> <text>', active: true, helper: true, cable: false, perm: 'manual' }] }] };
let dir = '', at = -1, list = [];

function file() {
  if (!dir) { try { dir = require('electron').app.getPath('userData'); } catch (_) { return ''; } }
  return path.join(dir, 'plugins.json');
}
function init(d) {
  dir = d; at = -1;
  try { fs.writeFileSync(path.join(d, 'plugins.example.json'), JSON.stringify(EXAMPLE, null, 1)); } catch (_) {}
}
const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n), yes = (v) => v !== false;
const inside = (f, d) => !!d && f.toLowerCase().startsWith(path.resolve(d).toLowerCase() + path.sep);
function conf(v, d) {
  v = str(v, CAP.dir); if (!v) return '';
  if (/^https?:\/\//i.test(v) || /^[\w.-]+:\d+(\/|$)/.test(v)) { try { const x = new URL(/^https?:/i.test(v) ? v : 'http://' + v); return x.hostname ? x.href : ''; } catch (_) { return ''; } }
  if (/^[a-z][\w+.-]*:/i.test(v) && !/^[a-z]:[\\/]/i.test(v)) return '';   // javascript:, file:, data:…
  return inside(path.resolve(d || '', v), d) ? v : '';
}
function clean(p) {
  p = p && typeof p === 'object' ? p : {};
  const o = { name: str(p.name, CAP.name), version: str(p.version, CAP.version), dir: str(p.dir, CAP.dir), on: yes(p.on),
    commands: (Array.isArray(p.commands) ? p.commands : []).slice(0, 50).map((c) => { c = c || {};
      return { cmd: str(c.cmd, CAP.cmd), help: str(c.help, CAP.help), active: yes(c.active), helper: yes(c.helper), cable: yes(c.cable), perm: MODES.includes(c.perm) ? c.perm : 'bypass' }; }),
    comment: str(p.comment, CAP.comment), conf: conf(p.conf, str(p.dir, CAP.dir)) };
  if (p.main) o.main = str(p.main, CAP.dir);   // routes for the Body (§2.5), as Dev's
  return o;
}
function all() {
  const f = file(); let t;
  try { t = fs.statSync(f).mtimeMs; } catch (_) { at = -1; return (list = []); }
  if (t !== at) { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); list = (Array.isArray(j.plugins) ? j.plugins : []).map(clean); } catch (_) { list = []; } at = t; }
  return list;
}
function save(l) {
  const f = file();
  try { list = l.map(clean); fs.writeFileSync(f + '.tmp', JSON.stringify({ plugins: list }, null, 1)); fs.renameSync(f + '.tmp', f); at = fs.statSync(f).mtimeMs; }
  catch (_) { at = -1; return { ok: false, error: 'write_failed' }; }
  return { ok: true };
}
const key = (d) => path.resolve(String(d || '')).toLowerCase(), find = (d) => all().findIndex((p) => key(p.dir) === key(d));
function add(d) { return find(d) >= 0 ? { ok: false, error: 'exists' } : save(all().concat([{ name: path.basename(d), dir: d }])); }
function set(d, x) {
  const i = find(d), l = all().slice();
  if (i < 0) return { ok: false, error: 'not_installed' };
  if (x.dir && key(x.dir) !== key(d) && find(x.dir) >= 0) return { ok: false, error: 'exists' };
  l[i] = Object.assign({}, l[i], x); return save(l);
}
function del(d) { const i = find(d); return i < 0 ? { ok: false, error: 'not_installed' } : save(all().filter((_, j) => j !== i)); }
const META = /[;&|`$<>\r\n]/;
function perm(line) {
  line = String(line || '').trim();
  for (const p of all()) if (p.on) for (const c of p.commands) if (c.active && c.cmd && (line === c.cmd || (line.startsWith(c.cmd + ' ') && !META.test(line.slice(c.cmd.length))))) return c.perm;
  return '';
}
// the code an extension brings for the Body (as Dev's organs), on: it rides COMPLEMENT_PLUGS as a catalog plug does (§2.5)
const mains = () => all().filter((p) => p.on && p.main).map((p) => path.resolve(p.dir, p.main));
// ✎ opens a folder, never a file: the list may have been written from outside
function folder(d) { const p = all().find((x) => key(x.dir) === key(d)); try { return p && fs.statSync(p.dir).isDirectory() ? p.dir : ''; } catch (_) { return ''; } }
// what its options open: the address, or its folder's page or script when it is there
function target(d) { const p = all().find((x) => key(x.dir) === key(d)); if (!p || !p.conf) return ''; if (/^https?:/.test(p.conf)) return p.conf; const f = path.resolve(p.dir, p.conf); return fs.existsSync(f) ? f : ''; }
module.exports = { init, all, add, set, del, perm, folder, mains, target, CAP };
