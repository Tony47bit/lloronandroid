/* Sinergias y transformaciones. Se activan solas al cumplir `requires` (ids),
   `tag`+`min` (n.º de objetos con esa etiqueta) o `when(p)`, y se retiran solas
   cuando dejan de cumplirse. Pueden aportar stats, flags, tear, weapon y hooks. */
(function () {
  'use strict';
  const L = window.Lagrimas;

  L.defineSynergy({
    id: 'guppy', name: 'Transformación: Guppy', desc: 'Vuelas y los enemigos sueltan moscas', tag: 'guppy', min: 3,
    flags: ['flying'],
    hooks: {
      onEnemyKilled: ({ p, api }) => { if (Math.random() < 0.35) api.spawnBlueFly(p, 1); },
      onAdd: ({ api }) => api.say('¡GUPPY!', 'Transformación completa', 2),
    },
  });

  L.defineSynergy({
    id: 'full_meal', name: 'Menú completo', desc: 'Comer bien da daño', tag: 'food', min: 3,
    stats: () => ({ damage: { add: 0.7 }, speed: { add: 10 } }),
  });

  L.defineSynergy({
    id: 'siblings', name: 'Hermanos', desc: 'Bobby y Maggy se refuerzan', requires: ['brother_bobby', 'sister_maggy'],
    stats: () => ({ familiarDamage: { mult: 1.3 } }),
  });

  L.defineSynergy({
    id: 'bookworm', name: 'Ratón de biblioteca', desc: 'Tres libros: sabiduría y suerte', tag: 'book', min: 3,
    stats: () => ({ luck: { add: 2 }, fireDelay: { mult: 0.9 } }),
  });
})();
