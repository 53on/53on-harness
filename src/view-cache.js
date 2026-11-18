'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { app } = require('electron');
const TYPES = /^(text\/(html|css|javascript|plain)|application\/(javascript|json)|image\/|font\/)/i, MAX = 8 << 20, OLD = 30 * 864e5;
const DIR = () => path.join(app.getPath('userData'), 'view');

function viewCache(ses) {
  const dir = DIR();
  try { fs.mkdirSync(dir, { recursive: true }); const now = Date.now();
    fs.readdirSync(dir).forEach((f) => { const p = path.join(dir, f); try { if (now - fs.statSync(p).mtimeMs > OLD) fs.unlinkSync(p); } catch (_) {} }); } catch (_) {}
  const at = (u) => path.join(dir, crypto.createHash('sha1').update(u).digest('hex'));
  const pass = (q) => ses.fetch(q, { bypassCustomProtocolHandlers: true });
  const copy = (f) => { try { const b = fs.readFileSync(f), n = b.indexOf(10), t = new Date(); fs.utimes(f, t, t, () => {});
    return new Response(b.subarray(n + 1), { status: 200, headers: { 'content-type': b.toString('latin1', 0, n), 'x-53on-copy': '1' } }); } catch (_) { return null; } };
  const keep = (f, r) => { const t = r.headers.get('content-type') || '', n = +r.headers.get('content-length') || 0;
    if (r.status !== 200 || !TYPES.test(t) || n > MAX) return;
    r.clone().arrayBuffer().then((b) => { if (b.byteLength > MAX) return; const tmp = f + '.' + process.pid + '.tmp';
      fs.mkdir(dir, { recursive: true }, () => fs.writeFile(tmp, Buffer.concat([Buffer.from(t + '\n', 'latin1'), Buffer.from(b)]), (e) => { if (!e) fs.rename(tmp, f, () => {}); })); }, () => {}); };
  ses.protocol.handle('https', async (q) => {
    const u = new URL(q.url);
    if (q.method !== 'GET' || u.hostname !== '53on.com' || u.pathname.startsWith('/__appmedia__/')) return pass(q);
    const f = at(q.url);
    if (/\.(js|css)$/i.test(u.pathname) && u.searchParams.has('v')) { const c = copy(f); if (c) return c; }
    let r; try { r = await pass(q); } catch (e) { const c = copy(f); if (c) return c; throw e; }
    keep(f, r); return r;
  });
}
viewCache.clear = () => fs.promises.rm(DIR(), { recursive: true, force: true });
module.exports = viewCache;
