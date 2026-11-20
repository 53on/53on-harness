'use strict';
const $ = (i) => document.getElementById(i), W = window.WebBar.words || {};
$('i').title = (W.immersive || 'Immersive') + ' (Alt+Enter)';
$('i').onclick = () => WebBar.go('immersive');
WebBar.on((s) => { $('n').textContent = s.name || ''; });
