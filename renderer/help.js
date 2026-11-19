'use strict';
window.Help = (function () {
  var box = null;
  function make() {
    if (box) return box;
    box = document.createElement('dialog'); box.className = 'pop';
    var h = document.createElement('h3'), b = document.createElement('div'), f = document.createElement('form'), ok = document.createElement('button');
    f.method = 'dialog'; ok.textContent = 'OK'; f.appendChild(ok);
    box.appendChild(h); box.appendChild(b); box.appendChild(f); document.body.appendChild(box);
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });   // a click outside closes it, as AWS's
    return box;
  }
  function show(title, body) {
    var d = make(), b = d.children[1];
    d.children[0].textContent = title || '';
    b.textContent = '';
    String(body || '').split('\n').forEach(function (l) {
      var p = document.createElement('p');
      if (l.indexOf('› ') === 0) { p.className = 'ex'; l = l.slice(2); }
      p.textContent = l; b.appendChild(p);
    });
    if (!d.open) d.showModal();
  }
  function wire(T) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-help]'), function (e) {
      var k = 'h' + e.dataset.help;
      e.title = T[k] || ''; e.setAttribute('aria-label', T[k] || ''); e.textContent = '?';
      if (!e.dataset.wired) { e.dataset.wired = 1; e.addEventListener('click', function (ev) { ev.preventDefault(); show(e.dataset.t, e.dataset.b); }); }
      e.dataset.t = T[k] || ''; e.dataset.b = T[k + 'b'] || '';
    });
  }
  return { show: show, wire: wire };
})();
