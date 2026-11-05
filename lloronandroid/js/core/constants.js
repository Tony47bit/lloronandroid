/* ==========================================================================
   Constantes del juego y pequeñas utilidades compartidas.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;

  L.C = {
    W: 800, H: 450,          // resolución lógica
    WALL: 44, DOOR: 64,
    SAVE_KEY: 'lagrimas_save_v1',
    DIRS: [
      { k: 'N', dx: 0, dy: -1, opp: 'S' },
      { k: 'S', dx: 0, dy: 1, opp: 'N' },
      { k: 'E', dx: 1, dy: 0, opp: 'W' },
      { k: 'W', dx: -1, dy: 0, opp: 'E' },
    ],
  };
  L.C.doorCenter = (k) => ({
    N: { x: L.C.W / 2, y: 0 }, S: { x: L.C.W / 2, y: L.C.H },
    W: { x: 0, y: L.C.H / 2 }, E: { x: L.C.W, y: L.C.H / 2 },
  }[k]);

  /** Sorteo ponderado: weight(item) devuelve el peso. */
  L.util.weighted = function (list, weight) {
    let total = 0;
    const ws = list.map((x) => { const w = Math.max(0, weight ? weight(x) : (x.weight == null ? 1 : x.weight)); total += w; return w; });
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) { if ((r -= ws[i]) <= 0) return list[i]; }
    return list[list.length - 1];
  };
})();
