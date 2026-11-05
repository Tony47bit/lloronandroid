/* ==========================================================================
   Personajes jugables (registro L.Characters).

   Para añadir uno nuevo:
     L.Characters.register({
       id, name, desc, color, skin?, tear?,
       stats:{ ...cualquier estadística base de StatSheet... },   // p.ej. { speed:170, maxHp:4 }
       soul: 0,                 // corazones de alma iniciales (medios corazones)
       coins:0, bombs:1, keys:0,
       items:['sad_onion'],     // objetos pasivos/familiares iniciales (ids)
       active:'the_d6',         // objeto activo inicial (opcional)
       unlock?: (save)=>bool    // condición de desbloqueo (opcional)
     });
   Aparece solo en el selector del menú.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;

  L.Characters.registerAll([
    {
      id: 'lloron', name: 'Llorón', desc: 'Equilibrado. 3 corazones, 1 bomba.',
      color: '#f3d6b8', stats: {}, soul: 0, coins: 0, bombs: 1, keys: 0, items: [],
    },
    {
      id: 'explorador', name: 'Explorador', desc: 'Veloz y frágil. 2 corazones, 1 llave.',
      color: '#cfe8c0', stats: { speed: 175, maxHp: 4, fireDelay: 0.34 }, soul: 0, coins: 3, bombs: 1, keys: 1, items: [],
    },
    {
      id: 'mistico', name: 'Místico', desc: 'Empieza con 3 corazones de alma y 2 bombas.',
      color: '#c9c3f5', stats: { maxHp: 2, damage: 1.1, speed: 140 }, soul: 6, coins: 0, bombs: 2, keys: 0, items: [],
    },
  ]);
})();
