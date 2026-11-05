/* ==========================================================================
   Pickups (registro L.Pickups): corazones, monedas, bombas, llaves, cofres,
   pedestales de objeto, artículos de tienda y trampilla.

   Contrato:  { id, r, drop:{weight}?, collect(api, p, pk, room) -> true si se consume,
                draw(c, pk, time) }
   Los que tienen `drop` entran en la tabla de botín al limpiar salas.
   `pk.delay` (s) evita recogerlo justo al soltarlo (intercambio de activos).
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const D = L.draw;
  const MAX_HEARTS = 24; // medios corazones totales (rojos + de alma)

  L.Pickups.registerAll([
    {
      id: 'heart', r: 10, drop: { weight: 15 },
      collect(api, p) {
        if (p.hp >= p.stats.get('maxHp')) return false;
        api.heal(p, 2); return true;
      },
      draw(c, pk, t) { D.heart(c, pk.x, pk.y + Math.sin(t * 4 + pk.x) * 2, 24, 'red'); },
    },
    {
      id: 'soul_heart', r: 10, drop: { weight: 4 },
      collect(api, p) {
        if (p.hp + p.soul >= MAX_HEARTS) return false;
        api.addSoul(p, 2); return true;
      },
      draw(c, pk, t) { D.heart(c, pk.x, pk.y + Math.sin(t * 4 + pk.x) * 2, 24, 'soul'); },
    },
    {
      id: 'coin', r: 8, drop: { weight: 30, coin: true },
      collect(api, p) { api.givePickup(p, 'coins', 1); return true; },
      draw(c, pk, t) { D.coin(c, pk.x, pk.y + Math.sin(t * 4 + pk.x) * 2, 7); },
    },
    {
      id: 'bomb', r: 9, drop: { weight: 10 },
      collect(api, p) { api.givePickup(p, 'bombs', 1); return true; },
      draw(c, pk, t) { D.bomb(c, pk.x, pk.y + Math.sin(t * 4 + pk.x) * 2, 8); },
    },
    {
      id: 'key', r: 9, drop: { weight: 7 },
      collect(api, p) { api.givePickup(p, 'keys', 1); return true; },
      draw(c, pk, t) { D.key(c, pk.x, pk.y + Math.sin(t * 4 + pk.x) * 2, 9); },
    },
    { // cofre dorado: pide una llave (o Paper Clip)
      id: 'chest_gold', r: 15,
      collect(api, p, pk, room) {
        const free = L.Inventory.hasFlag(p, 'freeChests');
        if (!free && p.keys <= 0) { api.hint('Necesitas una llave'); return false; }
        if (!free) p.keys--;
        api.say('¡COFRE ABIERTO!', '', 1.2);
        const n = L.util.randi(2, 4);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + 0.6;
          const type = L.util.weighted(L.Pickups.filter((d) => d.drop), (d) => d.drop.weight).id;
          api.spawnPickup(type, pk.x + Math.cos(a) * 34, pk.y + Math.sin(a) * 26, { delay: 0.3 });
        }
        if (Math.random() < 0.15) api.spawnPickup('item', pk.x, pk.y + 40, { item: api.takeItem('treasure'), delay: 0.5 });
        return true;
      },
      draw(c, pk) {
        const x = pk.x, y = pk.y;
        c.fillStyle = '#b8902f'; c.fillRect(x - 15, y - 9, 30, 20);
        c.fillStyle = '#d8b050'; c.fillRect(x - 15, y - 9, 30, 7);
        c.strokeStyle = '#5a3f0a'; c.lineWidth = 2; c.strokeRect(x - 15, y - 9, 30, 20);
        c.fillStyle = '#2a1c05'; c.fillRect(x - 3, y - 2, 6, 8);
      },
    },
    { // objeto sobre pedestal (gratis). Los activos intercambian el actual.
      id: 'item', r: 14,
      collect(api, p, pk) {
        const prev = api.giveItem(p, pk.item.id);
        api.say(pk.item.name, pk.item.desc, 2.6);
        if (prev) api.spawnPickup('item', pk.x, pk.y + 36, { item: prev, delay: 1.5 });
        return true;
      },
      draw(c, pk, t) { D.item(c, pk.item, pk.x, pk.y, t); },
    },
    { // artículo de tienda: vende cualquier otro pickup
      id: 'shop', r: 14,
      collect(api, p, pk, room) {
        const def = L.Pickups.get(pk.sell.type);
        const price = api.shopPrice(pk.price);
        if (p.coins < price) { api.hint('Monedas insuficientes (' + price + ')'); return false; }
        if (!def.collect(api, p, Object.assign({ x: pk.x, y: pk.y }, pk.sell), room)) {
          if (pk.sell.type === 'heart') api.hint('Salud completa');
          return false;
        }
        p.coins -= price;
        return true;
      },
      draw(c, pk, t) {
        const def = L.Pickups.get(pk.sell.type);
        D.pedestal(c, pk.x, pk.y);
        if (pk.sell.type === 'item') L.Sprites.draw(c, pk.sell.item.id, pk.x, pk.y - 6 + Math.sin(t * 4 + pk.x) * 2, 34);
        else def.draw(c, { x: pk.x, y: pk.y - 8, type: pk.sell.type }, t);
        const price = L.api.shopPrice(pk.price);
        D.coin(c, pk.x - 10, pk.y + 32, 6);
        c.fillStyle = '#fff3d6'; c.font = 'bold 14px system-ui, sans-serif';
        c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText(String(price), pk.x - 2, pk.y + 33);
      },
    },
    { // trampilla al siguiente piso
      id: 'trap', r: 26,
      collect(api) { api.nextFloor(); return true; },
      draw(c, pk) {
        c.fillStyle = '#050303';
        c.beginPath(); c.ellipse(pk.x, pk.y, 28, 20, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#8a6a4a'; c.lineWidth = 4; c.stroke();
        c.fillStyle = '#e8d9c0'; c.font = 'bold 11px system-ui, sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('SIGUIENTE PISO', pk.x, pk.y + 36);
      },
    },
  ]);
})();
