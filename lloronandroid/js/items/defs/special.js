/* Objetos especiales y de transformación (grupo Guppy: ver synergies.js). */
(function () {
  'use strict';
  const L = window.Lagrimas;

  L.defineItems([
    { id: 'guppys_head', name: 'Cabeza de Guppy', desc: 'Invoca moscas azules', type: 'active', tags: ['active', 'guppy'], config: { charges: 2, flies: 3 },
      active: { use: ({ p, cfg, api }) => { api.spawnBlueFly(p, cfg.flies); } } },

    { id: 'guppys_collar', name: 'Collar de Guppy', desc: 'Una vida extra: revives con moscas', tags: ['guppy', 'life'], config: { lives: 1, reviveHp: 2, flies: 4 },
      hooks: {
        onAdd: ({ state, cfg }) => { state.lives = (state.lives || 0) + cfg.lives; },
        onPlayerDeath: ({ state, cfg }, info) => { if (info.revive || !(state.lives > 0)) return; state.lives--; state.used = true; info.revive = true; info.hp = cfg.reviveHp; },
        onRevive: ({ state, p, cfg, api, def }) => { if (!state.used) return; state.used = false; api.spawnBlueFly(p, cfg.flies); if (!(state.lives > 0)) api.removeItem(p, def.id); },
      } },

    { id: 'guppys_hairball', name: 'Bola de Pelos de Guppy', desc: 'Orbita, bloquea disparos y crece', type: 'familiar', tags: ['guppy', 'familiar'],
      familiar: { behavior: 'orbit', damage: 2, radius: 46, size: 10, speed: 2.0, grow: 0.1, growMax: 1.0, block: true, rate: 0.35 } },

    { id: 'transcendence', name: 'Trascendencia', desc: 'Vuelas sobre rocas y fosos', tags: ['special'], config: { speed: 10 },
      flags: ['flying'], stats: (c) => ({ speed: { add: c.speed } }) },

    { id: 'polyphemus', name: 'Polifemo', desc: 'Lágrimas enormes y lentas', tags: ['special'], config: { add: 1.5, mult: 1.4, delay: 1.6, size: 1.4 },
      stats: (c) => ({ damage: { add: c.add, mult: c.mult }, fireDelay: { mult: c.delay }, tearSize: { mult: c.size } }) },

    { id: 'sacred_heart', name: 'Sagrado Corazón', desc: 'Más daño, lágrimas teledirigidas, +1 corazón', tags: ['special'], config: { dmg: 1.9, delay: 1.25, hp: 2, turn: 4 },
      stats: (c) => ({ damage: { mult: c.dmg }, fireDelay: { mult: c.delay }, maxHp: { add: c.hp } }),
      tear: (c) => [{ b: 'homing', turn: c.turn }],
      hooks: { onAdd: ({ p, cfg, api }) => api.heal(p, cfg.hp) } },

    { id: 'mutant_spider', name: 'Araña Mutante', desc: 'Cuádruple disparo', tags: ['special'], config: { shots: 3, delay: 1.6 },
      stats: (c) => ({ shots: { add: c.shots }, fireDelay: { mult: c.delay } }) },

    { id: 'proptosis', name: 'Proptosis', desc: 'Mucho daño de cerca, poco de lejos', tags: ['special'], config: { near: 2.6, far: 0.45, range: 0.75 },
      stats: (c) => ({ range: { mult: c.range } }),
      tear: (c) => [{ b: 'falloff', near: c.near, far: c.far }] },

    { id: 'holy_grail', name: 'Santo Grial', desc: 'Vuelo y +1 corazón', tags: ['special'], config: { hp: 2 },
      flags: ['flying'], stats: (c) => ({ maxHp: { add: c.hp } }),
      hooks: { onAdd: ({ p, cfg, api }) => api.heal(p, cfg.hp) } },

    { id: 'the_parasite', name: 'El Parásito', desc: 'Las lágrimas se dividen al impactar', tags: ['special'], config: { dmgMul: 0.5 },
      tear: (c) => [{ b: 'split', dmgMul: c.dmgMul }] },
  ]);
})();
