/* Objetos pasivos de estadísticas. Los valores viven en `config` y se pueden
   reajustar sin tocar la definición: L.ItemConfig.override('sad_onion', { mult: 0.6 }). */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const T = ['stats'];

  L.defineItems([
    { id: 'sad_onion', name: 'Cebolla Triste', desc: 'Lágrimas más rápidas', tags: T, weight: 1.2,
      config: { mult: 0.72 },
      stats: (c) => ({ fireDelay: { mult: Math.pow(c.mult, 1) } }) },

    { id: 'inner_eye', name: 'El Ojo Interior', desc: 'Triple disparo, cadencia más lenta', tags: T,
      config: { extraShots: 2, delayMult: 1.6 },
      stats: (c) => ({ shots: { add: c.extraShots }, fireDelay: { mult: c.delayMult } }) },

    { id: 'spoon_bender', name: 'Doblacucharas', desc: 'Lágrimas teledirigidas', tags: ['tears'],
      config: { turn: 4, radius: 280 },
      tear: (c) => [{ b: 'homing', turn: c.turn, radius: c.radius }] },

    { id: 'magic_mushroom', name: 'Seta Mágica', desc: 'Todo sube un poco, +1 corazón', tags: T,
      config: { dmgAdd: 0.5, dmgMult: 1.25, speed: 15, range: 0.2, hp: 2 },
      stats: (c) => ({ damage: { add: c.dmgAdd, mult: c.dmgMult }, speed: { add: c.speed }, range: { add: c.range }, maxHp: { add: c.hp } }),
      hooks: { onAdd: ({ p, cfg, api }) => api.heal(p, cfg.hp) } },

    { id: 'growth_hormones', name: 'Hormonas de Crecimiento', desc: 'Más velocidad y daño', tags: T,
      config: { speed: 25, dmg: 0.5 },
      stats: (c) => ({ speed: { add: c.speed }, damage: { add: c.dmg } }) },

    { id: 'the_belt', name: 'El Cinturón', desc: 'Velocidad de movimiento', tags: T,
      config: { speed: 35 },
      stats: (c) => ({ speed: { add: c.speed } }) },

    { id: 'moms_underwear', name: 'Ropa Interior de Mamá', desc: 'Más alcance y velocidad de lágrima', tags: T,
      config: { range: 0.35, shotSpeed: 45 },
      stats: (c) => ({ range: { add: c.range }, shotSpeed: { add: c.shotSpeed } }) },

    { id: 'pentagram', name: 'Pentagrama', desc: '+1 de daño', tags: T,
      config: { dmg: 1 },
      stats: (c) => ({ damage: { add: c.dmg } }) },

    { id: 'the_halo', name: 'El Halo', desc: 'Todas las estadísticas suben un poco', tags: T,
      config: { dmg: 0.3, speed: 12, range: 0.2, delayMult: 0.92, luck: 1, hp: 2 },
      stats: (c) => ({ damage: { add: c.dmg }, speed: { add: c.speed }, range: { add: c.range }, fireDelay: { mult: c.delayMult }, luck: { add: c.luck }, maxHp: { add: c.hp } }),
      hooks: { onAdd: ({ p, cfg, api }) => api.heal(p, cfg.hp) } },

    { id: 'crickets_head', name: 'Cabeza de Grillo', desc: 'Daño x1.5 y +0.5', tags: T,
      config: { add: 0.5, mult: 1.5 },
      stats: (c) => ({ damage: { add: c.add, mult: c.mult } }) },
  ]);
})();
