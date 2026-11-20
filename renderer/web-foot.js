'use strict';
const ai = document.getElementById('ai'), W = window.WebBar.words || {};
document.getElementById('t').textContent = W.ai || 'AI control';
ai.title = W.aitip || '';
const read = () => WebBar.ai().then((r) => { if (r) { ai.checked = r.ai; ai.disabled = !r.master; } });
ai.onchange = () => WebBar.ai(ai.checked).then(read);
document.addEventListener('visibilitychange', () => { if (!document.hidden) read(); });
read();
