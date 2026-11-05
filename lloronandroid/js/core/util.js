/* ==========================================================================
   Núcleo: espacio de nombres, utilidades y Registry genérico.
   Todo el contenido del juego (objetos, enemigos, jefes, personajes,
   obstáculos, pickups...) se añade registrándose en un Registry:
   no hace falta tocar el núcleo para ampliarlo.
   ========================================================================== */
(function () {
  'use strict';
  const L = (window.Lagrimas = window.Lagrimas || {});

  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randi(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const angleDiff = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };
  const pick = (arr) => arr[randi(0, arr.length - 1)];

  L.util = { rand, randi, clamp, lerp, dist, shuffle, angleDiff, pick };

  /** Registro genérico con ids estables (a-z, 0-9, _). */
  class Registry {
    constructor(name) { this.name = name; this.map = new Map(); }
    register(def) {
      if (!def || typeof def.id !== 'string' || !/^[a-z0-9_]+$/.test(def.id)) {
        throw new Error('[' + this.name + '] id inválido: ' + (def && def.id));
      }
      if (this.map.has(def.id)) throw new Error('[' + this.name + '] id duplicado: ' + def.id);
      this.map.set(def.id, def);
      return def;
    }
    registerAll(list) { list.forEach((d) => this.register(d)); return this; }
    get(id) { return this.map.get(id); }
    has(id) { return this.map.has(id); }
    all() { return Array.from(this.map.values()); }
    ids() { return Array.from(this.map.keys()); }
    filter(fn) { return this.all().filter(fn); }
  }
  L.Registry = Registry;

  // Registros del juego (se rellenan desde js/content, js/items y js/game)
  L.Items = new Registry('Items');
  L.Synergies = new Registry('Synergies');
  L.Enemies = new Registry('Enemies');
  L.Bosses = new Registry('Bosses');
  L.Characters = new Registry('Characters');
  L.Obstacles = new Registry('Obstacles');
  L.Pickups = new Registry('Pickups');
  L.TearBehaviors = new Registry('TearBehaviors');
  L.Weapons = new Registry('Weapons');
  L.FamiliarBehaviors = new Registry('FamiliarBehaviors');
})();
