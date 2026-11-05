/* Objetos que cambian cómo se dispara: modos de arma, y comportamientos de lágrima
   (los ejecutan L.Weapons y L.TearBehaviors). */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const T = ['attack'];

  L.defineItems([
    { id: 'brimstone', name: 'Azufre', desc: 'Rayo demoníaco cargado', tags: T, config: { dmgMult: 1.1 },
      weapon: { id: 'brimstone', priority: 50 }, stats: (c) => ({ damage: { mult: c.dmgMult } }) },

    { id: 'technology', name: 'Tecnología', desc: 'Láser continuo', tags: T,
      weapon: { id: 'technology', priority: 40 } },

    { id: 'ipecac', name: 'Ipecacuana', desc: 'Lágrimas explosivas y venenosas', tags: T,
      config: { radius: 58, dmgMul: 2.2, base: 5, delayMult: 1.5, dmg: 0.4 },
      stats: (c) => ({ fireDelay: { mult: c.delayMult }, damage: { add: c.dmg } }),
      tear: (c) => [{ b: 'explosive', radius: c.radius, dmgMul: c.dmgMul, base: c.base }, { b: 'poison' }] },

    { id: 'dr_fetus', name: 'Dr. Feto', desc: 'Disparas bombas (+5 bombas)', tags: T, config: { bombs: 5 },
      weapon: { id: 'dr_fetus', priority: 60 },
      hooks: { onAdd: ({ p, cfg, api, first }) => { if (first) api.givePickup(p, 'bombs', cfg.bombs); } } },

    { id: 'epic_fetus', name: 'Épico Feto', desc: 'Misiles dirigidos', tags: T,
      weapon: { id: 'epic_fetus', priority: 70 } },

    { id: 'moms_knife', name: 'Cuchillo de Mamá', desc: 'Lanza un cuchillo cargado', tags: T,
      weapon: { id: 'moms_knife', priority: 80 } },

    { id: 'chocolate_milk', name: 'Leche con Chocolate', desc: 'Mantén para cargar: más daño', tags: T,
      config: { min: 0.4, max: 2.4, delayMult: 0.85 },
      flags: ['chargeShots'], stats: (c) => ({ fireDelay: { mult: c.delayMult } }),
      hooks: { onFire: ({ cfg }, shot) => { if (shot.weapon === 'normal') shot.dmgMul *= cfg.min + (cfg.max - cfg.min) * shot.charge; } } },

    { id: 'holy_light', name: 'Luz Sagrada', desc: 'Algunas lágrimas invocan un rayo', tags: T,
      config: { chance: 0.15, radius: 34, dmgMul: 3.5 },
      tear: (c) => [{ b: 'holy', chance: c.chance, radius: c.radius, dmgMul: c.dmgMul }] },

    { id: 'rubber_cement', name: 'Cemento Elástico', desc: 'Las lágrimas rebotan', tags: T,
      config: { max: 4, rangeMul: 1.5 },
      tear: (c) => [{ b: 'bounce', max: c.max, rangeMul: c.rangeMul }] },

    { id: 'lokis_horns', name: 'Cuernos de Loki', desc: 'A veces disparas en cruz', tags: T, config: { chance: 0.25, luck: 0.04 },
      hooks: { onFire: ({ cfg, p }, shot) => { if (Math.random() < cfg.chance + p.stats.get('luck') * cfg.luck) shot.cross = true; } } },

    // --- extras originales que completan el catálogo
    { id: 'cupids_arrow', name: 'Flecha de Cupido', desc: 'Las lágrimas atraviesan enemigos', tags: T,
      tear: [{ b: 'pierce' }] },
    { id: 'scorpio', name: 'Escorpio', desc: 'Lágrimas venenosas', tags: T, config: { time: 3, dps: 0.6 },
      tear: (c) => [{ b: 'poison', time: c.time, dps: c.dps }] },
    { id: 'ouija_board', name: 'Tabla Ouija', desc: 'Las lágrimas atraviesan obstáculos', tags: T,
      tear: [{ b: 'spectral' }] },
    { id: 'twenty_twenty', name: '20/20', desc: 'Disparo doble', tags: ['stats'], config: { shots: 1 },
      stats: (c) => ({ shots: { add: c.shots } }) },
  ]);
})();
