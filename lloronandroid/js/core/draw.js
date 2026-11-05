/* ==========================================================================
   Ayudas de dibujo compartidas (iconos de pickups, corazones, pedestales).
   Las usan el contenido (pickups, tiendas) y la interfaz.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;

  const D = {
    heartPath(c, x, y, s) {
      c.beginPath();
      c.moveTo(x, y + s * 0.38);
      c.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.5, y - s * 0.6, x, y - s * 0.2);
      c.bezierCurveTo(x + s * 0.5, y - s * 0.6, x + s * 0.75, y - s * 0.05, x, y + s * 0.38);
      c.closePath();
    },
    /** Corazón entero o medio (half=true) en rojo/azul/vacío. */
    heart(c, x, y, s, kind, half) {
      const col = { red: '#e8384f', soul: '#5aa8f0', empty: 'rgba(0,0,0,0.45)' }[kind] || '#e8384f';
      D.heartPath(c, x, y, s);
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fill();
      if (kind !== 'empty') {
        c.save();
        D.heartPath(c, x, y, s); c.clip();
        c.fillStyle = col;
        c.fillRect(x - s, y - s, half ? s : s * 2, s * 2);
        c.restore();
      }
      D.heartPath(c, x, y, s);
      c.strokeStyle = '#1a0608'; c.lineWidth = Math.max(1, s * 0.08); c.stroke();
    },
    coin(c, x, y, r) {
      c.fillStyle = '#f0c030';
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#8a6410'; c.lineWidth = Math.max(1, r * 0.25); c.stroke();
      c.strokeStyle = '#b8880f'; c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, r * 0.55, 0, Math.PI * 2); c.stroke();
    },
    bomb(c, x, y, r, fuseLit) {
      c.fillStyle = '#2b2b30';
      c.beginPath(); c.arc(x, y + r * 0.15, r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#555'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#777';
      c.beginPath(); c.arc(x - r * 0.35, y - r * 0.15, r * 0.25, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#b09060'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x + r * 0.4, y - r * 0.7); c.lineTo(x + r * 0.9, y - r * 1.2); c.stroke();
      c.fillStyle = fuseLit ? '#ff5030' : '#ffb030';
      c.beginPath(); c.arc(x + r * 0.95, y - r * 1.25, Math.max(1.5, r * 0.28), 0, Math.PI * 2); c.fill();
    },
    key(c, x, y, r, color) {
      c.strokeStyle = c.fillStyle = color || '#f0c030'; c.lineWidth = Math.max(2, r * 0.3);
      c.lineCap = 'round';
      c.beginPath(); c.arc(x - r * 0.45, y - r * 0.3, r * 0.5, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.moveTo(x - r * 0.1, y - r * 0.05); c.lineTo(x + r * 0.9, y + r * 0.75); c.stroke();
      c.beginPath(); c.moveTo(x + r * 0.5, y + r * 0.4); c.lineTo(x + r * 0.2, y + r * 0.7); c.stroke();
      c.beginPath(); c.moveTo(x + r * 0.8, y + r * 0.65); c.lineTo(x + r * 0.5, y + r * 0.95); c.stroke();
    },
    pedestal(c, x, y) {
      c.fillStyle = '#4a4a52'; c.fillRect(x - 20, y + 8, 40, 12);
      c.fillStyle = '#6a6a74'; c.fillRect(x - 20, y + 8, 40, 4);
    },
    /** Objeto sobre pedestal usando su sprite original. */
    item(c, item, x, y, time) {
      D.pedestal(c, x, y);
      const bob = Math.sin((time || 0) * 4 + x) * 2;
      L.Sprites.draw(c, item.id, x, y - 6 + bob, 34);
    },
    eyes(c, x, y, dx, dy, r, white) {
      const ex = -dy, ey = dx;
      for (const s of [-1, 1]) {
        const cx = x + dx * r * 0.35 + ex * s * r * 0.4, cy = y + dy * r * 0.35 + ey * s * r * 0.4;
        c.fillStyle = white || '#fff';
        c.beginPath(); c.arc(cx, cy, r * 0.3, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#111';
        c.beginPath(); c.arc(cx + dx * r * 0.1, cy + dy * r * 0.1, r * 0.14, 0, Math.PI * 2); c.fill();
      }
    },
  };
  L.draw = D;
})();
