/* Objetos de bombas, monedas y llaves. Los "+N" se dan al recogerlos (first). */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const give = (what, key) => ({ onAdd: ({ p, cfg, api, first }) => { if (first) api.givePickup(p, what, cfg[key]); } });

  L.defineItems([
    { id: 'boom', name: '¡Boom!', desc: '+10 bombas', tags: ['pickups'], config: { n: 10 }, hooks: give('bombs', 'n') },

    { id: 'mr_mega', name: 'Sr. Mega', desc: 'Bombas más grandes y potentes', tags: ['pickups'], config: { radius: 1.3, dmg: 2, n: 5 },
      stats: (c) => ({ bombRadius: { mult: c.radius }, bombDamage: { mult: c.dmg } }), hooks: give('bombs', 'n') },

    { id: 'pyro', name: 'Pirómano', desc: '99 bombas', tags: ['pickups'], config: { n: 99 }, hooks: give('bombs', 'n') },

    { id: 'bomb_bag', name: 'Bolsa de Bombas', desc: 'Al limpiar salas a veces deja bombas', tags: ['pickups'], config: { chance: 0.3 },
      hooks: { onRoomClear: ({ p, cfg, api }) => { if (Math.random() < cfg.chance) api.spawnPickup('bomb', p.x + 30, p.y + 10); } } },

    { id: 'a_dollar', name: 'Un Dólar', desc: '99 monedas', tags: ['pickups'], config: { n: 99 }, hooks: give('coins', 'n') },
    { id: 'a_quarter', name: 'Una Moneda', desc: '+25 monedas', tags: ['pickups'], config: { n: 25 }, hooks: give('coins', 'n') },

    { id: 'steam_sale', name: 'Rebajas', desc: 'Todo en tienda a mitad de precio', tags: ['pickups'], config: { mult: 0.5 },
      stats: (c) => ({ shopPrice: { mult: c.mult } }) },

    { id: 'contract_from_below', name: 'Contrato del Más Allá', desc: 'Más botín al limpiar salas', tags: ['pickups'], config: { rolls: 1 },
      stats: (c) => ({ rewardRolls: { add: c.rolls } }) },

    { id: 'skeleton_key', name: 'Llave Maestra', desc: '99 llaves', tags: ['pickups'], config: { n: 99 }, hooks: give('keys', 'n') },

    { id: 'paper_clip', name: 'Clip', desc: 'Abre cofres dorados sin llave', tags: ['pickups'], config: { keys: 1 },
      flags: ['freeChests'], hooks: give('keys', 'keys') },
  ]);
})();
