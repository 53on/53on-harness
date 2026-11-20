'use strict';
const RESERVED = /^\/(messages|m(\/|$)|admin|api\/|storage\/|static\/|signout|login|register)/,
  CLEAN = /^\/(about|help|contact|country|delete-account|security_privacy|conditions_of_use|privacy)(\/|$)/;
function route(u) {
  let x;
  try { x = new URL(String(u)); } catch (_) { return 'out'; }
  if (x.origin !== 'https://53on.com') return 'out';
  const p = x.pathname;
  return p === '/' || RESERVED.test(p) || CLEAN.test(p) ? 'view' : 'tab';
}
module.exports = { route: route };
