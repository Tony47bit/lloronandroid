/* ==========================================================================
   StatSheet: estadísticas base + modificadores con "fuente".
   Cada modificador recuerda quién lo puso (id de objeto, sinergia, efecto
   temporal...), así que retirar un objeto = quitar su fuente y recalcular.
   valor = (base + Σadd) * Πmult ; si algún modificador define `set`, gana el último.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;

  // Valores base. Para añadir una estadística nueva basta con añadirla aquí.
  const DEFAULT_STATS = {
    damage: 1,          // daño por lágrima
    fireDelay: 0.38,    // segundos entre disparos (menor = más rápido)
    speed: 150,         // píxeles/s
    range: 0.95,        // segundos de vida de la lágrima
    shotSpeed: 340,     // velocidad de la lágrima
    tearSize: 1,        // multiplicador del tamaño de lágrima
    shots: 1,           // lágrimas por disparo
    maxHp: 6,           // contenedores rojos en MEDIOS corazones (6 = 3 corazones)
    luck: 0,
    size: 1,            // tamaño del personaje
    bombRadius: 75,
    bombDamage: 25,
    shopPrice: 1,       // multiplicador de precios en tienda
    rewardRolls: 1,     // tiradas de botín al limpiar una sala
    coinDrop: 1,        // multiplicador de probabilidad de monedas
    familiarDamage: 1,
    familiarSize: 1,
  };
  const LIMITS = {
    damage: [0.3, 80], fireDelay: [0.08, 4], speed: [70, 330], range: [0.3, 3],
    shotSpeed: [150, 700], tearSize: [0.5, 4], shots: [1, 7], maxHp: [2, 24],
    size: [0.6, 2], bombRadius: [40, 220], bombDamage: [5, 200], shopPrice: [0.25, 3],
    rewardRolls: [1, 4], coinDrop: [0, 3], familiarDamage: [0.3, 8], familiarSize: [0.5, 3],
  };

  class StatSheet {
    constructor(base) {
      this.base = Object.assign({}, DEFAULT_STATS, base || {});
      this.mods = [];
      this._cache = {};
    }
    setBase(stat, value) { this.base[stat] = value; this._cache = {}; }
    /** spec: { add, mult, set }. ttl (s) opcional → modificador temporal. */
    addModifier(source, stat, spec, ttl) {
      this.mods.push({ source, stat, add: spec.add || 0, mult: spec.mult == null ? 1 : spec.mult,
        set: spec.set == null ? null : spec.set, ttl: ttl == null ? null : ttl });
      this._cache = {};
    }
    removeSource(source) {
      const n = this.mods.length;
      this.mods = this.mods.filter((m) => m.source !== source);
      if (this.mods.length !== n) this._cache = {};
    }
    hasSource(source) { return this.mods.some((m) => m.source === source); }
    update(dt) {
      let changed = false;
      for (const m of this.mods) {
        if (m.ttl != null) { m.ttl -= dt; if (m.ttl <= 0) changed = true; }
      }
      if (changed) { this.mods = this.mods.filter((m) => m.ttl == null || m.ttl > 0); this._cache = {}; }
    }
    get(stat) {
      const c = this._cache[stat];
      if (c !== undefined) return c;
      let add = 0, mult = 1, set = null;
      for (const m of this.mods) {
        if (m.stat !== stat) continue;
        add += m.add; mult *= m.mult;
        if (m.set != null) set = m.set;
      }
      let v = set != null ? set : ((this.base[stat] || 0) + add) * mult;
      const lim = LIMITS[stat];
      if (lim) v = Math.max(lim[0], Math.min(lim[1], v));
      this._cache[stat] = v;
      return v;
    }
    snapshot() {
      const out = {};
      for (const k of Object.keys(this.base)) out[k] = this.get(k);
      return out;
    }
  }

  L.StatSheet = StatSheet;
  L.DEFAULT_STATS = DEFAULT_STATS;
})();
