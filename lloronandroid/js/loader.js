/* Carga secuencial de los módulos listados en js/manifest.js y arranque. */
(function () {
  'use strict';
  const list = window.LagrimasManifest || [];
  const fail = (msg) => {
    const d = document.createElement('pre');
    d.style.cssText = 'position:fixed;inset:0;margin:0;padding:12px;background:#200;color:#fcc;font:12px monospace;white-space:pre-wrap;z-index:9';
    d.textContent = msg; document.body.appendChild(d);
  };
  window.addEventListener('error', (e) => { if (!window.__lagrimasStarted) fail('Error: ' + e.message + '\n' + (e.filename || '') + ':' + e.lineno); });
  let i = 0;
  (function next() {
    if (i >= list.length) { window.__lagrimasStarted = true; window.Lagrimas.start(); return; }
    const s = document.createElement('script');
    s.src = list[i++]; s.async = false;
    s.onload = next;
    s.onerror = () => fail('No se pudo cargar: ' + s.src);
    document.head.appendChild(s);
  })();
})();
