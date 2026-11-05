/* Objetos activos. `config.charges` = salas que hay que limpiar para recargar.
   `active.use(ctx)` devuelve false para cancelar el uso (no gasta la carga). */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const A = (def) => Object.assign({ type: 'active', tags: ['active'] }, def);
  const liveEnemies = (api) => api.enemies().filter((e) => e.hp > 0);

  L.defineItems([
    A({ id: 'the_d6', name: 'El D6', desc: 'Re-sortea los objetos de la sala', config: { charges: 6 },
      active: { use: ({ api }) => {
        if (!api.room().pickups.some((k) => k.type === 'item' || (k.type === 'shop' && k.sell.type === 'item'))) return false;
        api.rerollPedestals(); api.say('¡REROLL!', '', 1.2);
      } } }),

    A({ id: 'book_of_belial', name: 'Libro de Belial', desc: 'Daño + en esta sala', tags: ['active', 'book'], config: { charges: 6, dmg: 2 },
      active: { use: ({ p, cfg, api }) => { api.addTemp(p, 'book_of_belial', 'damage', { add: cfg.dmg }); } } }),

    A({ id: 'necronomicon', name: 'Necronomicón', desc: 'Daña a todos los enemigos', tags: ['active', 'book'], config: { charges: 6, damage: 30 },
      active: { use: ({ cfg, api }) => {
        const es = liveEnemies(api); if (!es.length) return false;
        for (const e of es) api.hurtEnemy(e, cfg.damage, { src: 'book' });
        api.game().shake = 0.4; L.Engine.reapDead(api.room());
      } } }),

    A({ id: 'the_bible', name: 'La Biblia', desc: 'Vuelas en la sala y dañas mucho al jefe', tags: ['active', 'book'], config: { charges: 3, bossFraction: 0.5 },
      active: { use: ({ p, cfg, api }) => {
        api.addStatus(p, 'flying', 9999, { room: true });
        for (const e of liveEnemies(api)) if (e.boss) api.hurtEnemy(e, e.maxHp * cfg.bossFraction, { src: 'book' });
        api.game().shake = 0.35; L.Engine.reapDead(api.room());
      } } }),

    A({ id: 'teleport', name: '¡Teletransporte!', desc: 'Te mueve a otro punto de la sala', config: { charges: 2 },
      active: { use: ({ p, api }) => { api.teleportRandom(p); } } }),

    A({ id: 'tammys_head', name: 'Cabeza de Tammy', desc: 'Dispara un anillo de lágrimas', config: { charges: 3, count: 12, dmgMul: 2 },
      active: { use: ({ p, cfg, api }) => {
        for (let i = 0; i < cfg.count; i++) api.fireTear(p, i * Math.PI * 2 / cfg.count, { dmg: p.stats.get('damage') * cfg.dmgMul, r: 6 });
      } } }),

    A({ id: 'anarchist_cookbook', name: 'Libro del Anarquista', desc: 'Coloca bombas por la sala', config: { charges: 3, bombs: 6 },
      active: { use: ({ cfg, api }) => {
        for (let i = 0; i < cfg.bombs; i++) { const q = api.freePos(api.room(), 60); api.game().bombList.push({ x: q.x, y: q.y, t: 1.2 + i * 0.25 }); }
      } } }),

    A({ id: 'book_of_shadows', name: 'Libro de Sombras', desc: 'Invulnerable unos segundos', tags: ['active', 'book'], config: { charges: 3, time: 10 },
      active: { use: ({ p, cfg, api }) => { api.addStatus(p, 'invulnerable', cfg.time); } } }),

    A({ id: 'how_to_jump', name: 'Cómo Saltar', desc: 'Saltas sobre rocas y fosos', config: { charges: 1, time: 0.65 },
      active: { use: ({ p, cfg, api }) => { api.addStatus(p, 'jump', cfg.time); } } }),

    A({ id: 'flush', name: '¡Descarga!', desc: 'Crea cacas a tu alrededor', config: { charges: 2, count: 4 },
      active: { use: ({ p, cfg, api }) => {
        let n = 0;
        for (let i = 0; i < cfg.count * 3 && n < cfg.count; i++) {
          const a = (i / (cfg.count * 3)) * Math.PI * 2 + Math.random() * 0.4, d = 58 + Math.random() * 30;
          if (api.spawnObstacle('poop', p.x + Math.cos(a) * d, p.y + Math.sin(a) * d)) n++;
        }
        return n > 0;
      } } }),
  ]);
})();
