// Site Tuner bridge: loaded first in every page's <head>. Applies the tuner's CSS overrides,
// survives Astro page swaps, and reports text edits back to the tuner. Talks only to its parent.
(function () {
  if (window.__tunerBridge) return;
  window.__tunerBridge = true;
  try { if (sessionStorage.getItem('tuner-splash') === '0') window.__splashBooted = true; } catch (e) {}

  var css = '';
  var fonts = '';
  var editing = false;
  var originals = new Map();
  var send = function (msg) { try { parent.postMessage(Object.assign({ tuner: true }, msg), '*'); } catch (e) {} };
  var siteRoot = new URL('.', document.currentScript.src).pathname;
  var page = function () { return location.pathname.slice(siteRoot.length) || 'index.html'; };

  function apply() {
    var head = document.head;
    if (!head) return;
    var style = document.getElementById('tuner-css');
    if (!style) { style = document.createElement('style'); style.id = 'tuner-css'; }
    style.textContent = css;
    head.appendChild(style); // last, so it wins over the site's own CSS
    var link = document.getElementById('tuner-fonts');
    if (fonts) {
      if (!link) { link = document.createElement('link'); link.id = 'tuner-fonts'; link.rel = 'stylesheet'; }
      if (link.getAttribute('href') !== fonts) link.href = fonts;
      head.appendChild(link);
    } else if (link) link.remove();
    document.documentElement.classList.toggle('tuner-editing', editing);
  }

  function blockOf(node) {
    var el = node && (node.nodeType === 1 ? node : node.parentElement);
    if (!el) return null;
    return el.closest('h1,h2,h3,h4,h5,h6,p,li,dt,dd,figcaption,blockquote,button,a,label') || el;
  }
  var norm = function (s) { return s.replace(/\s+/g, ' ').trim(); };

  function setEditing(on) {
    editing = on;
    document.designMode = on ? 'on' : 'off';
    apply();
  }

  document.addEventListener('beforeinput', function () {
    if (!editing) return;
    var sel = getSelection();
    var el = blockOf(sel && sel.anchorNode);
    if (el && !originals.has(el)) originals.set(el, norm(el.textContent));
  }, true);
  document.addEventListener('input', function () {
    if (!editing) return;
    var sel = getSelection();
    var el = blockOf(sel && sel.anchorNode);
    if (!el || !originals.has(el)) return;
    send({ type: 'edit', page: page(), lang: document.documentElement.lang, old: originals.get(el), now: norm(el.textContent) });
  }, true);
  // no navigation while editing text
  document.addEventListener('click', function (e) {
    if (editing && e.target.closest && e.target.closest('a')) { e.preventDefault(); e.stopPropagation(); }
  }, true);

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || !d.tuner || e.source !== parent) return;
    if (d.type === 'css') { css = d.css; fonts = d.fonts || ''; apply(); document.dispatchEvent(new CustomEvent('tuner:css')); }
    if (d.type === 'edit') setEditing(d.on);
    if (d.type === 'splash') { try { sessionStorage.setItem('tuner-splash', d.on ? '1' : '0'); } catch (err) {} }
  });

  document.addEventListener('astro:after-swap', function () {
    originals = new Map();
    apply();
    if (editing) document.designMode = 'on';
  });
  document.addEventListener('astro:page-load', function () { send({ type: 'page', page: page(), title: document.title }); });
  document.addEventListener('DOMContentLoaded', function () { apply(); send({ type: 'ready', page: page(), title: document.title }); });
})();
