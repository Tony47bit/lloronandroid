/* ==========================================================================
   Tipos de sala (registro L.RoomTypes) y estrategias de colocación
   (L.Placement).

   L.RoomTypes.register({
     id, name, order,                 // order = prioridad de colocación (menor = antes)
     place: 'leaf_far' | 'leaf' | 'leaf_or_any' | 'hidden' | <estrategia propia>,
     required: true,                  // si no se puede colocar, se regenera el piso
     chance: 0..1,                    // probabilidad de aparecer (def. 1)
     minFloor, maxFloor,
     locked: true,                    // puerta cerrada con llave
     hidden: true,                    // sala secreta: se abre con bomba
     cleared: true,                   // empieza ya limpia (sin enemigos)
     boss: true,                      // la sala sortea un jefe
     palette:[a,b], map:'#hex',       // colores de sala y minimapa
     banner:{ text, sub },            // aviso al entrar la primera vez
     populate(api, room, floor)       // contenido (pickups, obstáculos...)
   });
   Para añadir "sala de sacrificio", "arcade", etc. basta registrar el tipo.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { W, H } = L.C;
  const { shuffle } = L.util;

  L.RoomTypes = new L.Registry('RoomTypes');
  L.Placement = {
    // cada estrategia: (ctx) -> room | null ; ctx = { rooms, start, grid, free(room), leaves, ... }
    leaf_far: (c) => { const l = c.leaves.filter((r) => !r.type_taken); return l.length ? l.reduce((a, b) => (b.dist > a.dist ? b : a), l[0]) : null; },
    leaf: (c) => shuffle(c.leaves.filter((r) => !r.type_taken))[0] || null,
    leaf_or_any: (c) => shuffle(c.leaves.filter((r) => !r.type_taken))[0] || shuffle(c.rooms.filter((r) => r !== c.start && !r.type_taken))[0] || null,
    hidden: (c) => c.placeHidden(),
  };

  L.RoomTypes.registerAll([
    {
      id: 'boss', name: 'Jefe', order: 10, place: 'leaf_far', required: true, boss: true,
      palette: ['#60363a', '#562f33'], map: '#e03a3a',
      banner: { text: 'JEFE', sub: '' },
    },
    {
      id: 'treasure', name: 'Tesoro', order: 20, place: 'leaf', required: true, locked: true, cleared: true,
      palette: ['#6d5a2e', '#634f27'], map: '#f0c030',
      banner: { text: 'SALA DEL TESORO', sub: 'Elige sabiamente' },
      populate(api, room) {
        api.addPickup(room, 'item', W / 2, H / 2, { item: api.takeItem('treasure') });
      },
    },
    {
      id: 'shop', name: 'Tienda', order: 30, place: 'leaf_or_any', required: true, cleared: true,
      palette: ['#3f5d47', '#385441'], map: '#4ad06a',
      banner: { text: 'TIENDA', sub: 'Toca un artículo para comprarlo' },
      populate(api, room) {
        const slots = [
          { type: 'heart', price: 3 }, { type: 'bomb', price: 4 },
          { type: 'key', price: 4 }, { type: 'item', price: 7, item: api.takeItem('shop') },
        ];
        slots.forEach((s, i) => api.addPickup(room, 'shop', W / 2 + (i - 1.5) * 100, H / 2,
          { price: s.price, sell: { type: s.type, item: s.item } }));
      },
    },
    {
      id: 'secret', name: 'Secreta', order: 90, place: 'hidden', required: true, hidden: true, cleared: true,
      palette: ['#4f4068', '#473a5f'], map: '#c080ff',
      banner: { text: 'SALA SECRETA', sub: '' },
      populate(api, room) {
        api.addPickup(room, 'coin', W / 2 - 60, H / 2); api.addPickup(room, 'coin', W / 2 - 30, H / 2 + 30);
        api.addPickup(room, 'coin', W / 2 + 30, H / 2 + 30); api.addPickup(room, 'bomb', W / 2 + 60, H / 2);
        if (Math.random() < 0.5) api.addPickup(room, 'item', W / 2, H / 2 - 20, { item: api.takeItem('secret') });
        else api.addPickup(room, 'soul_heart', W / 2, H / 2 - 20);
      },
    },
    { // sala del cofre dorado (opcional, ejemplo de tipo extra)
      id: 'vault', name: 'Cámara', order: 40, place: 'leaf_or_any', chance: 0.35, minFloor: 2, cleared: true,
      palette: ['#4c4a3a', '#46443a'], map: '#d8c070',
      banner: { text: 'CÁMARA', sub: 'Un cofre dorado' },
      populate(api, room) {
        api.addPickup(room, 'chest_gold', W / 2 - 50, H / 2); api.addPickup(room, 'chest_gold', W / 2 + 50, H / 2);
      },
    },
  ]);
})();
