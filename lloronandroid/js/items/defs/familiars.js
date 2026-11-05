/* Familiares: cada copia poseída crea uno. El comportamiento (L.FamiliarBehaviors)
   se elige con familiar.behavior; el resto de campos son sus parámetros.
   Los parámetros se leen de `def.familiar`, así que se ajustan con ItemConfig
   usando una función familiar:(cfg)=>... si hiciera falta; aquí van directos. */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const F = (id, name, desc, familiar, extra) => Object.assign({ id, name, desc, type: 'familiar', tags: ['familiar'], familiar }, extra);

  L.defineItems([
    F('brother_bobby', 'Hermano Bobby', 'Te sigue y dispara contigo', { behavior: 'shooter', damage: 1.6, delay: 0.55, size: 4 }),
    F('sister_maggy', 'Hermana Maggy', 'Dispara rápido, daño bajo', { behavior: 'shooter', damage: 0.9, delay: 0.32, size: 3.5 }),
    F('little_chubby', 'Pequeño Gordito', 'Embiste a los enemigos', { behavior: 'dasher', damage: 3, speed: 260, time: 0.5, delay: 1.6 }),
    F('daddy_longlegs', 'Papá Patas Largas', 'Pisotea a los enemigos', { behavior: 'stomper', damage: 6, radius: 44, delay: 4 }),
    { id: 'bffs', name: '¡MAMIGOS!', desc: 'Tus familiares son más grandes y fuertes', type: 'passive', tags: ['familiar'],
      config: { dmgMult: 2, sizeMult: 1.25 },
      stats: (c) => ({ familiarDamage: { mult: c.dmgMult }, familiarSize: { mult: c.sizeMult } }) },
    F('forever_alone', 'Siempre Solo', 'Una mosca que orbita y bloquea disparos', { behavior: 'orbit', damage: 2, radius: 42, size: 8, speed: 2.4, block: true, rate: 0.35 }),
    F('holy_water', 'Agua Bendita', 'Lanza charcos que dañan', { behavior: 'thrower', dps: 2, radius: 40, duration: 4, delay: 5 }),
    F('cube_of_meat', 'Cubo de Carne', 'Orbita y crece al golpear', { behavior: 'orbit', damage: 2.5, radius: 44, size: 10, speed: 2.2, grow: 0.1, growMax: 0.8, rate: 0.35 }),
    F('ball_of_bandages', 'Bola de Vendas', 'Orbita, bloquea y crece', { behavior: 'orbit', damage: 2, radius: 50, size: 10, speed: 2.0, grow: 0.12, growMax: 1.0, block: true, rate: 0.35 }),
    F('rotten_baby', 'Bebé Podrido', 'Genera moscas azules', { behavior: 'summoner', delay: 4 }),
  ]);
})();
