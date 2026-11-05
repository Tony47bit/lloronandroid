/* Objetos de vida y protección. Vidas extra: `inst.s.lives` + onPlayerDeath
   (info.revive = true). Los medios corazones son la unidad (2 = 1 corazón). */
(function () {
  'use strict';
  const L = window.Lagrimas;

  const food = (id, name, desc, extra) => Object.assign({
    id, name, desc, tags: ['life', 'food'], config: { hp: 2 },
    stats: (c) => ({ maxHp: { add: c.hp } }),
    hooks: { onAdd: ({ p, cfg, api }) => api.heal(p, cfg.hp) },
  }, extra);

  /** Hook de resurrección común a los objetos con vidas. */
  const reviveHooks = (extraRevive) => ({
    onPlayerDeath: ({ state, cfg }, info) => {
      if (info.revive || !(state.lives > 0)) return;
      state.lives--; state.used = true; info.revive = true; info.hp = cfg.reviveHp || 2;
    },
    onRevive: (ctx) => { if (ctx.state.used) { ctx.state.used = false; if (extraRevive) extraRevive(ctx); } },
  });

  L.defineItems([
    food('breakfast', 'Desayuno', '+1 corazón'),
    food('lunch', 'Almuerzo', '+1 corazón'),
    food('dinner', 'Cena', '+1 corazón'),
    food('dessert', 'Postre', '+1 corazón'),
    food('supper', 'Merienda', '+1 corazón'),

    { id: 'the_wafer', name: 'La Oblea', desc: 'Todo daño se reduce a medio corazón', tags: ['life'], priority: 5,
      hooks: { onPlayerDamaged: (c, info) => { info.amount = Math.min(info.amount, 1); } } },

    { id: 'holy_mantle', name: 'Manto Sagrado', desc: 'Bloquea el primer golpe de cada sala', tags: ['life'], priority: 10,
      hooks: {
        onAdd: ({ state }) => { state.ready = true; },
        onRoomEnter: ({ state }) => { state.ready = true; },
        onFloorStart: ({ state }) => { state.ready = true; },
        onPlayerDamaged: ({ state }, info) => { if (state.ready) { state.ready = false; info.cancel = true; } },
        onDrawPlayer: ({ state, p }, c) => {
          if (!state.ready) return;
          c.strokeStyle = 'rgba(255,240,170,0.85)'; c.lineWidth = 2.5;
          c.beginPath(); c.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2); c.stroke();
        },
      } },

    { id: 'dead_cat', name: 'Gato Muerto', desc: 'Nueve vidas, pero solo un corazón', tags: ['life'], config: { lives: 9, hp: 2, reviveHp: 2 },
      excludes: ['guppys_paw'],
      stats: (c) => ({ maxHp: { set: c.hp } }),
      hooks: Object.assign({ onAdd: ({ state, cfg, first }) => { if (first) state.lives = cfg.lives; } }, reviveHooks()) },

    { id: 'one_up', name: '1up!', desc: 'Una vida extra', tags: ['life'], config: { lives: 1, reviveHp: 2 },
      hooks: Object.assign({ onAdd: ({ state, cfg }) => { state.lives = (state.lives || 0) + cfg.lives; } },
        reviveHooks(({ p, def, api, state }) => { if (!(state.lives > 0)) api.removeItem(p, def.id); })) },

    { id: 'guppys_paw', name: 'Pata de Guppy', desc: 'Sacrifica un contenedor rojo por 3 corazones de alma', type: 'active', tags: ['life', 'guppy'],
      config: { charges: 3, hearts: 6 },
      active: { use: ({ p, cfg, api }) => {
        const max = p.stats.get('maxHp');
        if (max <= 2) { api.hint('Sin contenedores que sacrificar'); return false; }
        p.stats.setBase('maxHp', p.stats.base.maxHp - 2);
        api.onStatsChanged(p); api.addSoul(p, cfg.hearts); api.say('¡3 corazones de alma!', '', 1.4);
      } } },
  ]);
})();
