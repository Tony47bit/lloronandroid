/* ==========================================================================
   Terreno / obstáculos de sala (registro L.Obstacles).

   Para añadir un obstáculo nuevo (lava, pinchos, espejo...): registrar
   { id, weight, minFloor, size:[w,h], blocksGround, blocksTears, hp, bombable,
     draw(c, ob), onDestroy(api, ob) }  y listo; el generador de salas lo
   sortea por peso y el motor aplica las reglas de colisión declaradas aquí.
     - blocksGround: bloquea a quien camina (no a voladores ni al salto)
     - blocksFlying: bloquea también a los voladores
     - blocksTears : detiene las lágrimas (los espectrales lo ignoran)
     - hp          : Infinity = indestructible por lágrimas
     - bombable    : lo destruye una explosión
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;

  L.Obstacles.registerAll([
    {
      id: 'rock', weight: 4, minFloor: 1, size: [36, 36],
      blocksGround: true, blocksFlying: false, blocksTears: true, hp: Infinity, bombable: true,
      draw(c, ob) {
        c.fillStyle = '#7a7a82'; c.fillRect(ob.x, ob.y, ob.w, ob.h);
        c.fillStyle = '#9a9aa4'; c.fillRect(ob.x, ob.y, ob.w, 6); c.fillRect(ob.x, ob.y, 6, ob.h);
        c.strokeStyle = '#3d3d44'; c.lineWidth = 2; c.strokeRect(ob.x, ob.y, ob.w, ob.h);
      },
    },
    { // foso: se puede disparar sobre él y lo sobrevuelan los voladores
      id: 'pit', weight: 1.6, minFloor: 2, size: [36, 36],
      blocksGround: true, blocksFlying: false, blocksTears: false, hp: Infinity, bombable: false,
      draw(c, ob) {
        c.fillStyle = '#0c0707'; c.fillRect(ob.x, ob.y, ob.w, ob.h);
        c.fillStyle = '#1d1210'; c.fillRect(ob.x + 3, ob.y + 3, ob.w - 6, ob.h - 6);
        c.strokeStyle = '#3a2a24'; c.lineWidth = 3; c.strokeRect(ob.x + 1.5, ob.y + 1.5, ob.w - 3, ob.h - 3);
        c.fillStyle = '#050303'; c.fillRect(ob.x + 8, ob.y + 8, ob.w - 16, ob.h - 16);
      },
    },
    { // caca: destructible a lágrimas
      id: 'poop', weight: 1.5, minFloor: 1, size: [34, 34],
      blocksGround: true, blocksFlying: false, blocksTears: true, hp: 4, bombable: true,
      draw(c, ob) {
        const cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2;
        const k = Math.max(0.55, ob.hp / (ob.maxHp || 4));
        c.fillStyle = '#6b4423';
        c.beginPath(); c.ellipse(cx, cy + 8, 15 * k, 8 * k, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(cx, cy, 11 * k, 7 * k, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.ellipse(cx, cy - 8, 6.5 * k, 5 * k, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#3d2410'; c.lineWidth = 1.6;
        c.beginPath(); c.ellipse(cx, cy + 8, 15 * k, 8 * k, 0, 0, Math.PI * 2); c.stroke();
        c.fillStyle = '#8b5e34'; c.fillRect(cx - 6 * k, cy - 3, 4, 2);
      },
      onDestroy(api, ob) { if (Math.random() < 0.15) api.spawnPickup('coin', ob.x + ob.w / 2, ob.y + ob.h / 2); },
    },
  ]);
})();
