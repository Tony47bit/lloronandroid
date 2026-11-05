/* ==========================================================================
   Sprites procedurales (vectoriales y originales).
   Cada sprite se registra con L.Sprites.define(id, fn). `fn(c, g)` dibuja en
   un lienzo lógico de 64x64 con el origen en el CENTRO (coordenadas -32..32).
   Se "hornea" una vez a un canvas pequeño y luego se reutiliza (pedestales,
   tienda, HUD, familiares).
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const RES = 128;                      // resolución del sprite horneado
  const fns = new Map();
  const baked = new Map();

  // Ayudas de dibujo compartidas
  const g = {
    OUT: '#1b1210',
    circle(c, x, y, r, fill, stroke, lw) {
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
    },
    ellipse(c, x, y, rx, ry, fill, stroke, lw, rot) {
      c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
    },
    poly(c, pts, fill, stroke, lw) {
      c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
      c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.lineJoin = 'round'; c.stroke(); }
    },
    line(c, x1, y1, x2, y2, color, lw) {
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
      c.strokeStyle = color; c.lineWidth = lw || 2; c.lineCap = 'round'; c.stroke();
    },
    rrect(c, x, y, w, h, r, fill, stroke, lw) {
      c.beginPath();
      c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
    },
    star(c, x, y, rOut, rIn, n, fill, stroke, lw, rot) {
      const pts = [];
      for (let i = 0; i < n * 2; i++) {
        const a = (rot || -Math.PI / 2) + i * Math.PI / n, r = i % 2 ? rIn : rOut;
        pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
      }
      g.poly(c, pts, fill, stroke, lw);
    },
    heart(c, x, y, s, fill, stroke, lw) {
      c.beginPath();
      c.moveTo(x, y + s * 0.38);
      c.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.5, y - s * 0.6, x, y - s * 0.2);
      c.bezierCurveTo(x + s * 0.5, y - s * 0.6, x + s * 0.75, y - s * 0.05, x, y + s * 0.38);
      c.closePath();
      if (fill) { c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 2; c.stroke(); }
    },
    /** Ojo con pupila: (x,y) centro, r radio del globo. */
    eye(c, x, y, r, iris, pupil) {
      g.circle(c, x, y, r, '#fff', g.OUT, 1.5);
      g.circle(c, x, y, r * 0.55, iris || '#333');
      g.circle(c, x, y, r * 0.28, pupil || '#000');
    },
  };

  function fallback(c, id) {
    g.rrect(c, -22, -22, 44, 44, 6, '#6a5a7a', '#fff', 2);
    c.fillStyle = '#fff'; c.font = 'bold 26px system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(id).charAt(0).toUpperCase(), 0, 2);
  }

  function bake(id) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = RES;
    const c = cv.getContext('2d');
    c.translate(RES / 2, RES / 2);
    c.scale(RES / 64, RES / 64);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const fn = fns.get(id);
    try { if (fn) fn(c, g); else fallback(c, id); }
    catch (e) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, RES, RES); c.translate(RES / 2, RES / 2); c.scale(RES / 64, RES / 64); fallback(c, id); }
    baked.set(id, cv);
    return cv;
  }

  L.Sprites = {
    g,
    RES,
    define(id, fn) { fns.set(id, fn); baked.delete(id); },
    has(id) { return fns.has(id); },
    ids() { return Array.from(fns.keys()); },
    /** Dibuja el sprite `id` centrado en (x,y) con lado `size` píxeles. */
    draw(ctx, id, x, y, size, opts) {
      const cv = baked.get(id) || bake(id);
      if (opts && (opts.rot || opts.alpha != null)) {
        ctx.save();
        if (opts.alpha != null) ctx.globalAlpha *= opts.alpha;
        ctx.translate(x, y); if (opts.rot) ctx.rotate(opts.rot);
        ctx.drawImage(cv, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.drawImage(cv, x - size / 2, y - size / 2, size, size);
      }
    },
  };
})();
