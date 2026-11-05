/* ==========================================================================
   Manifiesto de módulos. Para añadir contenido nuevo (un jefe, un objeto, un
   enemigo...) crea su archivo y añade UNA línea aquí. El orden importa solo
   entre grupos: núcleo → sistemas → sprites → contenido → objetos → juego.
   ========================================================================== */
window.LagrimasManifest = [
  // núcleo
  'js/core/util.js', 'js/core/constants.js', 'js/core/stats.js', 'js/core/geometry.js', 'js/core/draw.js',
  // objetos: registro, sprites
  'js/items/registry.js', 'js/items/sprites/core.js', 'js/items/sprites/sprites_a.js', 'js/items/sprites/sprites_b.js',
  // sistemas
  'js/systems/tears.js', 'js/systems/weapons.js', 'js/systems/familiars.js',
  // contenido (cada archivo registra en su registro)
  'js/content/obstacles.js', 'js/content/pickups.js', 'js/content/enemies.js', 'js/content/bosses.js',
  'js/content/characters.js', 'js/content/rooms.js',
  // definiciones de objetos
  'js/items/defs/stats.js', 'js/items/defs/tears.js', 'js/items/defs/life.js', 'js/items/defs/familiars.js',
  'js/items/defs/actives.js', 'js/items/defs/consumables.js', 'js/items/defs/special.js', 'js/items/defs/synergies.js',
  // juego
  'js/game/floor.js', 'js/game/engine.js', 'js/game/input.js', 'js/game/render.js', 'js/game/main.js',
];
