/* ==========================================================================
   Geometría 2D: colisiones círculo/rectángulo, segmentos y rayos.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { clamp } = L.util;
  const { W, H, WALL } = L.C;

  const geo = {
    circlesHit: (a, b, extra = 0) => Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + extra,

    circleHitsRect(x, y, r, rc) {
      const cx = clamp(x, rc.x, rc.x + rc.w), cy = clamp(y, rc.y, rc.y + rc.h);
      const dx = x - cx, dy = y - cy;
      return dx * dx + dy * dy < r * r;
    },

    /** Empuja al círculo c fuera del rectángulo rc. Devuelve true si chocaban. */
    pushOutRect(c, rc) {
      const cx = clamp(c.x, rc.x, rc.x + rc.w), cy = clamp(c.y, rc.y, rc.y + rc.h);
      const dx = c.x - cx, dy = c.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= c.r * c.r) return false;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2), pen = c.r - d;
        c.x += dx / d * pen; c.y += dy / d * pen;
      } else {
        const l = c.x - rc.x, r = rc.x + rc.w - c.x, t = c.y - rc.y, b = rc.y + rc.h - c.y;
        const m = Math.min(l, r, t, b);
        if (m === l) c.x = rc.x - c.r; else if (m === r) c.x = rc.x + rc.w + c.r;
        else if (m === t) c.y = rc.y - c.r; else c.y = rc.y + rc.h + c.r;
      }
      return true;
    },

    /** Distancia del punto (px,py) al segmento (x1,y1)-(x2,y2). */
    segDist(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      const t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
      return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
    },

    /** Punto donde un rayo desde (x,y) con ángulo ang sale de la sala. */
    rayToWalls(x, y, ang) {
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const tx = dx > 1e-9 ? (W - WALL - x) / dx : dx < -1e-9 ? (WALL - x) / dx : Infinity;
      const ty = dy > 1e-9 ? (H - WALL - y) / dy : dy < -1e-9 ? (WALL - y) / dy : Infinity;
      const t = Math.max(0, Math.min(tx, ty));
      return { x: x + dx * t, y: y + dy * t };
    },
  };
  L.geo = geo;
})();
