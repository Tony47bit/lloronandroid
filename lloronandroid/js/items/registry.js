/* ==========================================================================
   Sistema de objetos: definiciones, inventario, hooks, activos y sinergias.

   Un objeto es DATOS + (opcionalmente) hooks. El jugador no sabe nada de los
   objetos concretos: solo habla con L.Inventory.

   Definición (L.defineItem):
   {
     id:'sad_onion',            // único y estable (a-z, 0-9, _)
     name, desc,
     type:'passive'|'active'|'familiar',
     tags:['stats', ...],       // para pools y transformaciones
     pools:['treasure','shop','boss','secret'],  weight:1,
     config:{ ... },            // valores ajustables (L.ItemConfig.override)
     stats:(cfg,stacks)=>({ damage:{add,mult,set}, ... })  // o un objeto; por pila
     flags:['flying', ...] | (cfg)=>[...],        // banderas booleanas derivadas
     tear:[{b:'homing', turn:4, when:{weapon:'normal'}}], // comportamientos de lágrima
     weapon:{ id:'brimstone', priority:50 },      // modo de disparo que solicita
     active:{ use(ctx){...} }, // type 'active'  → cfg.charges = salas para recargar
     familiar:{ behavior:'orbit' },               // type 'familiar'
     hooks:{ onAdd, onRemove, onUpdate, onFire, onPlayerDamaged, onPlayerDeath,
             onRevive, onRoomEnter, onRoomClear, onEnemyKilled, onBombExplode,
             onFloorStart, onPickup, onDrawPlayer },
     excludes:['otro_id']       // opcional: no aparece si ya se posee ese objeto
   }
   Cada hook recibe (ctx, ...args) con ctx = { p, inst, def, cfg, stacks, state, api }.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { shuffle } = L.util;

  L.HOOKS = ['onAdd', 'onRemove', 'onUpdate', 'onFire', 'onPlayerDamaged', 'onPlayerDeath',
    'onRevive', 'onRoomEnter', 'onRoomClear', 'onEnemyKilled', 'onBombExplode',
    'onFloorStart', 'onPickup', 'onDrawPlayer'];

  // ---- Configuración ajustable por objeto (balance sin tocar la definición)
  const overrides = {};
  L.ItemConfig = {
    override(id, values) { overrides[id] = Object.assign(overrides[id] || {}, values); },
    get(def) { return Object.assign({}, def.config || {}, overrides[def.id] || {}); },
    reset() { for (const k of Object.keys(overrides)) delete overrides[k]; },
  };

  const TYPES = ['passive', 'active', 'familiar'];
  function normalize(def, kind) {
    def.tags = def.tags || [];
    def.config = def.config || {};
    def.hooks = def.hooks || {};
    def.priority = def.priority || 0;
    if (kind === 'item') {
      def.type = def.type || 'passive';
      if (!TYPES.includes(def.type)) throw new Error('Tipo inválido en ' + def.id);
      def.pools = def.pools || ['treasure', 'shop', 'boss', 'secret'];
      def.weight = def.weight == null ? 1 : def.weight;
      if (def.type === 'active' && !def.active) throw new Error(def.id + ': falta .active');
      if (def.type === 'familiar' && !def.familiar) throw new Error(def.id + ': falta .familiar');
    }
    return def;
  }
  L.defineItem = (def) => L.Items.register(normalize(def, 'item'));
  L.defineItems = (list) => list.forEach(L.defineItem);
  L.defineSynergy = (def) => L.Synergies.register(normalize(def, 'synergy'));

  const cfgOf = (def) => L.ItemConfig.get(def);
  const srcKey = (inst) => (inst.synergy ? 'syn:' : 'item:') + inst.def.id;
  const makeInst = (def, synergy) => ({ id: def.id, def, stacks: 0, order: 0, s: {}, synergy: !!synergy });
  function ctxOf(p, inst, extra) {
    const c = { p, inst, def: inst.def, cfg: cfgOf(inst.def), stacks: inst.stacks, state: inst.s, api: L.api };
    return extra ? Object.assign(c, extra) : c;
  }

  function applyStats(p, inst) {
    const key = srcKey(inst);
    p.stats.removeSource(key);
    if (inst.stacks <= 0 || !inst.def.stats) return;
    const d = inst.def;
    if (typeof d.stats === 'function') {
      const spec = d.stats(cfgOf(d), inst.stacks);
      for (const stat of Object.keys(spec)) p.stats.addModifier(key, stat, spec[stat]);
    } else {
      for (const stat of Object.keys(d.stats)) {
        const s = d.stats[stat];
        p.stats.addModifier(key, stat, {
          add: (s.add || 0) * inst.stacks,
          mult: Math.pow(s.mult == null ? 1 : s.mult, inst.stacks),
          set: s.set,
        });
      }
    }
  }

  function instances(p) {
    const inv = p.inv;
    if (!inv._inst) {
      inv._inst = Array.from(inv.items.values()).concat(Array.from(inv.syn.values()));
      inv._inst.sort((a, b) => (a.def.priority - b.def.priority) || (a.order - b.order));
    }
    return inv._inst;
  }

  function recomputeFlags(p) {
    const flags = new Map();
    for (const inst of instances(p)) {
      let f = inst.def.flags;
      if (!f) continue;
      if (typeof f === 'function') f = f(cfgOf(inst.def));
      for (const name of f) flags.set(name, (flags.get(name) || 0) + inst.stacks);
    }
    p.inv.flags = flags;
  }

  function count(p, id) {
    const inst = p.inv.items.get(id);
    if (inst) return inst.stacks;
    return p.inv.active && p.inv.active.id === id ? 1 : 0;
  }
  function tagCount(p, tag) {
    let n = 0;
    for (const inst of p.inv.items.values()) if (inst.def.tags.includes(tag)) n++;
    if (p.inv.active && p.inv.active.def.tags.includes(tag)) n++;
    return n;
  }

  /** Recalcula sinergias, banderas y derivados. Se llama tras cualquier cambio. */
  function refresh(p) {
    const inv = p.inv;
    recomputeFlags(p);
    for (const sd of L.Synergies.all()) {
      let on = false;
      if (sd.requires) on = sd.requires.every((id) => count(p, id) > 0);
      else if (sd.tag) on = tagCount(p, sd.tag) >= (sd.min || 2);
      else if (sd.when) on = !!sd.when(p);
      const has = inv.syn.has(sd.id);
      if (on && !has) {
        const inst = makeInst(sd, true);
        inst.stacks = 1; inst.order = ++inv.seq;
        inv.syn.set(sd.id, inst); inv._inst = null;
        applyStats(p, inst); recomputeFlags(p);
        if (sd.hooks.onAdd) sd.hooks.onAdd(ctxOf(p, inst, { first: true }));
      } else if (!on && has) {
        const inst = inv.syn.get(sd.id);
        inst.stacks = 0;
        if (sd.hooks.onRemove) sd.hooks.onRemove(ctxOf(p, inst, { last: true }));
        applyStats(p, inst);
        inv.syn.delete(sd.id); inv._inst = null; recomputeFlags(p);
      }
    }
    inv._inst = null;
    if (L.Familiars) L.Familiars.sync(p);
    if (L.api && L.api.onStatsChanged) L.api.onStatsChanged(p);
  }

  const Inventory = {
    init(p, baseStats) {
      p.stats = new L.StatSheet(baseStats);
      p.inv = { items: new Map(), syn: new Map(), active: null, seq: 0, flags: new Map(), _inst: null };
      p.status = {};          // temporizadores: flying, invulnerable, jump...
      p.familiars = [];
    },
    add(p, id) {
      const def = L.Items.get(id);
      if (!def) throw new Error('Objeto desconocido: ' + id);
      if (def.type === 'active') return Inventory.setActive(p, id);
      const inv = p.inv;
      let inst = inv.items.get(id);
      const first = !inst;
      if (first) { inst = makeInst(def); inst.order = ++inv.seq; inv.items.set(id, inst); }
      inst.stacks++; inv._inst = null;
      applyStats(p, inst); recomputeFlags(p);
      if (def.hooks.onAdd) def.hooks.onAdd(ctxOf(p, inst, { first }));
      refresh(p);
      return inst;
    },
    remove(p, id) {
      const inv = p.inv;
      if (inv.active && inv.active.id === id) { Inventory.clearActive(p); return true; }
      const inst = inv.items.get(id);
      if (!inst) return false;
      inst.stacks--;
      const last = inst.stacks <= 0;
      applyStats(p, inst);
      if (inst.def.hooks.onRemove) inst.def.hooks.onRemove(ctxOf(p, inst, { last }));
      if (last) inv.items.delete(id);
      inv._inst = null;
      refresh(p);
      return true;
    },
    has: (p, id) => count(p, id) > 0,
    count,
    tagCount,
    hasFlag: (p, f) => (p.inv.flags.get(f) || 0) > 0 || (p.status[f] || 0) > 0,
    refresh,
    instances,
    ids(p) { return Array.from(p.inv.items.keys()).concat(p.inv.active ? [p.inv.active.id] : []); },

    /** Invoca el hook `name` en todos los objetos/sinergias, por prioridad. */
    emit(p, name, ...args) {
      for (const inst of instances(p)) {
        const h = inst.def.hooks[name];
        if (h) h(ctxOf(p, inst), ...args);
      }
    },

    /** Comportamientos de lágrima declarados por los objetos, fusionados por id. */
    tearBehaviors(p, weaponId) {
      const merged = new Map();
      for (const inst of instances(p)) {
        let list = inst.def.tear;
        if (!list) continue;
        if (typeof list === 'function') list = list(cfgOf(inst.def), inst.stacks);
        for (const spec of list) {
          if (spec.when && spec.when.weapon && spec.when.weapon !== weaponId) continue;
          const cur = merged.get(spec.b);
          if (!cur) { const params = Object.assign({}, spec); delete params.b; delete params.when; merged.set(spec.b, params); }
          else for (const k of Object.keys(spec)) {   // compatibilidad: gana el mayor valor numérico
            if (k === 'b' || k === 'when') continue;
            if (typeof spec[k] === 'number' && typeof cur[k] === 'number') cur[k] = Math.max(cur[k], spec[k]);
            else if (cur[k] == null) cur[k] = spec[k];
          }
        }
      }
      return Array.from(merged, ([id, params]) => ({ id, params }));
    },
    weaponRequests(p) {
      const out = [];
      for (const inst of instances(p)) if (inst.def.weapon) out.push(Object.assign({ order: inst.order }, inst.def.weapon));
      return out;
    },

    // ---- Objetos activos (un hueco, con carga por sala limpia)
    setActive(p, id) {
      const def = L.Items.get(id);
      const inv = p.inv, prev = inv.active;
      if (prev && prev.def.hooks.onRemove) prev.def.hooks.onRemove(ctxOf(p, prev, { last: true }));
      const a = { id, def, stacks: 1, charge: 0, s: {}, order: ++inv.seq };
      a.charge = cfgOf(def).charges || 1;     // empieza cargado
      inv.active = a;
      if (def.hooks.onAdd) def.hooks.onAdd(ctxOf(p, a, { first: true }));
      refresh(p);
      return prev ? prev.def : null;           // el llamador puede soltar el anterior
    },
    clearActive(p) {
      const a = p.inv.active;
      if (!a) return;
      if (a.def.hooks.onRemove) a.def.hooks.onRemove(ctxOf(p, a, { last: true }));
      p.inv.active = null;
      refresh(p);
    },
    activeInfo(p) {
      const a = p.inv.active;
      return a ? { def: a.def, charge: a.charge, max: cfgOf(a.def).charges || 1 } : null;
    },
    chargeActive(p, n) {
      const a = p.inv.active;
      if (!a) return false;
      const max = cfgOf(a.def).charges || 1;
      a.charge = Math.min(max, a.charge + (n == null ? 1 : n));
      return a.charge >= max;
    },
    useActive(p) {
      const a = p.inv.active;
      if (!a) return false;
      const max = cfgOf(a.def).charges || 1;
      if (a.charge < max) return false;
      const r = a.def.active.use(ctxOf(p, a));
      if (r === false) return false;
      a.charge = 0;
      return true;
    },
  };
  L.Inventory = Inventory;

  /** Sorteo ponderado de un objeto de un pool, sin repetir (taken) en la partida. */
  L.Items.roll = function (pool, taken, owner) {
    const ok = (d) => d.pools.includes(pool) && !taken.has(d.id) &&
      !(owner && d.excludes && d.excludes.some((x) => Inventory.has(owner, x)));
    let cands = L.Items.filter(ok);
    if (!cands.length) { taken.clear(); cands = L.Items.filter(ok); }
    if (!cands.length) cands = L.Items.all();
    const total = cands.reduce((a, d) => a + d.weight, 0);
    let r = Math.random() * total;
    for (const d of shuffle(cands.slice())) { if ((r -= d.weight) <= 0) { taken.add(d.id); return d; } }
    const d = cands[0]; taken.add(d.id); return d;
  };
})();
