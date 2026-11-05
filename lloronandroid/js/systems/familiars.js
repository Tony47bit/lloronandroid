/* ==========================================================================
   Familiares: sincronización con el inventario + comportamientos reutilizables.

   Un objeto de tipo 'familiar' declara  familiar:{ behavior:'orbit', ...params }.
   Cada copia poseída (stacks) crea un familiar. Para un comportamiento nuevo:
   L.FamiliarBehaviors.register({ id, follows?, init(f,p), update(f,p,dt), draw(f,c,p) }).
   Las estadísticas familiarDamage / familiarSize (p. ej. BFFS!) escalan a todos.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { rand, clamp, lerp } = L.util;
  const geo = L.geo;
  const game = () => L.S.game;
  const api = () => L.api;
  const FB = L.FamiliarBehaviors;

  const fdmg = (p) => p.stats.get('familiarDamage');
  const fsize = (p) => p.stats.get('familiarSize');
  const MAX_FLIES = 12;

  function make(p, def, i) {
    const prm = def.familiar;
    const beh = FB.get(prm.behavior);
    if (!beh) throw new Error('Comportamiento de familiar desconocido: ' + prm.behavior);
    const f = { itemId: def.id, sprite: prm.sprite || def.id, prm, behavior: beh, i, x: p.x, y: p.y, a: i * 2.1 + (def.id.length % 5), cd: 1, s: {}, r: 8, ephemeral: false };
    if (beh.init) beh.init(f, p);
    return f;
  }

  L.Familiars = {
    /** Alinea los familiares del jugador con los objetos que posee. */
    sync(p) {
      const want = new Map();
      for (const inst of L.Inventory.instances(p)) {
        if (!inst.synergy && inst.def.type === 'familiar') want.set(inst.id, inst.stacks);
      }
      const keep = [];
      const seen = new Map();
      for (const f of p.familiars) {
        if (f.ephemeral) { keep.push(f); continue; }
        const n = (seen.get(f.itemId) || 0) + 1;
        if (n <= (want.get(f.itemId) || 0)) { keep.push(f); seen.set(f.itemId, n); }
      }
      p.familiars = keep;
      for (const [id, n] of want) {
        for (let k = seen.get(id) || 0; k < n; k++) p.familiars.push(make(p, L.Items.get(id), k));
      }
    },

    update(p, dt) {
      let fi = 0;
      for (const f of p.familiars.slice()) {
        if (f.behavior.follows) f.followIdx = fi++;
        f.behavior.update(f, p, dt);
      }
      p.familiars = p.familiars.filter((f) => !f.dead);
    },

    draw(c, p) {
      for (const f of p.familiars) {
        if (f.behavior.draw) f.behavior.draw(f, c, p);
        else L.Sprites.draw(c, f.sprite, f.x, f.y, 26 * fsize(p) * (f.scale || 1));
      }
    },

    flyCount(p) { return p.familiars.filter((f) => f.ephemeral).length; },

    /** Moscas azules temporales que atacan a los enemigos. */
    spawnFlies(p, n) {
      for (let k = 0; k < n && L.Familiars.flyCount(p) < MAX_FLIES; k++) {
        p.familiars.push({
          itemId: null, ephemeral: true, behavior: FB.get('blue_fly'), prm: {}, sprite: null,
          x: p.x + rand(-20, 20), y: p.y + rand(-20, 20), a: rand(0, 6.28), cd: 0, s: { hp: 3 }, r: 6, i: k, tcd: new Map(),
        });
      }
    },
  };

  // ---- ayudas compartidas por los comportamientos
  function followTrail(f, p, dt) {
    const idx = Math.min(p.trail.length - 1, (f.followIdx + 1) * 9);
    const t = p.trail[Math.max(0, idx)] || p;
    const k = Math.min(1, dt * 9);
    f.x += (t.x - f.x) * k; f.y += (t.y - f.y) * k;
  }
  /** Daño por contacto con enfriamiento por enemigo. */
  function touch(f, p, dmg, every) {
    if (!f.tcd) f.tcd = new Map();
    const now = game().time;
    let hits = 0;
    for (const e of game().room.enemies) {
      if (e.spawnT > 0 || e.hp <= 0) continue;
      if (Math.hypot(e.x - f.x, e.y - f.y) < e.r + f.r) {
        if ((f.tcd.get(e) || 0) <= now) { api().hurtEnemy(e, dmg * fdmg(p), { src: 'familiar' }); f.tcd.set(e, now + every); hits++; }
      }
    }
    return hits;
  }
  function blockShots(f) {
    const G = game();
    G.eTears = G.eTears.filter((t) => Math.hypot(t.x - f.x, t.y - f.y) > f.r + t.r);
  }
  L.Familiars.helpers = { followTrail, touch, blockShots };

  // ------------------------------------------------------------------ comportamientos
  FB.register({ // sigue al jugador y dispara hacia donde apunta
    id: 'shooter', follows: true,
    update(f, p, dt) {
      followTrail(f, p, dt);
      f.cd -= dt;
      const aim = p.aimNow;
      if (aim && f.cd <= 0) {
        L.spawnTear(p, {
          x: f.x, y: f.y, angle: Math.atan2(aim.y, aim.x), speed: p.stats.get('shotSpeed') * 0.9,
          dmg: f.prm.damage * fdmg(p), r: (f.prm.size || 4) * fsize(p), range: p.stats.get('range') * 0.9,
          behaviors: [], familiar: true,
        });
        f.cd = f.prm.delay || 0.5;
      }
    },
  });

  FB.register({ // se lanza hacia donde apuntas y vuelve
    id: 'dasher', follows: true,
    update(f, p, dt) {
      const st = f.s;
      f.r = 10 * fsize(p);
      if (st.mode === 'dash') {
        f.x += st.dx * f.prm.speed * dt; f.y += st.dy * f.prm.speed * dt;
        st.t -= dt;
        f.x = clamp(f.x, L.C.WALL + f.r, L.C.W - L.C.WALL - f.r); f.y = clamp(f.y, L.C.WALL + f.r, L.C.H - L.C.WALL - f.r);
        touch(f, p, f.prm.damage, 0.3);
        if (st.t <= 0) st.mode = 'back';
        return;
      }
      if (st.mode === 'back') {
        const a = Math.atan2(p.y - f.y, p.x - f.x);
        f.x += Math.cos(a) * 260 * dt; f.y += Math.sin(a) * 260 * dt;
        touch(f, p, f.prm.damage * 0.5, 0.4);
        if (Math.hypot(p.x - f.x, p.y - f.y) < 40) st.mode = null;
        return;
      }
      followTrail(f, p, dt);
      f.cd -= dt;
      if (p.aimNow && f.cd <= 0) { st.mode = 'dash'; st.dx = p.aimNow.x; st.dy = p.aimNow.y; st.t = f.prm.time || 0.5; f.cd = f.prm.delay || 1.6; }
    },
  });

  FB.register({ // sombra con patas largas que pisa a los enemigos
    id: 'stomper', follows: true,
    update(f, p, dt) {
      const st = f.s;
      if (st.target) {
        st.t -= dt;
        if (st.t <= 0) {
          api().damageArea(st.target.x, st.target.y, (f.prm.radius || 44) * fsize(p), f.prm.damage * fdmg(p), { src: 'stomp' });
          st.target = null;
        }
      } else {
        followTrail(f, p, dt);
        f.cd -= dt;
        if (f.cd <= 0) {
          const e = api().nearestEnemy(p.x, p.y, 9999);
          if (e) { st.target = { x: e.x, y: e.y }; st.t = 0.55; f.cd = f.prm.delay || 4; }
        }
      }
    },
    draw(f, c, p) {
      const st = f.s;
      L.Sprites.draw(c, f.sprite, f.x, f.y, 26 * fsize(p));
      if (st.target) {
        const k = 1 - st.t / 0.55;
        c.fillStyle = 'rgba(0,0,0,' + (0.15 + 0.35 * k) + ')';
        c.beginPath(); c.ellipse(st.target.x, st.target.y, (f.prm.radius || 44) * k, (f.prm.radius || 44) * k * 0.6, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(30,20,20,' + k + ')'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(st.target.x - 8, st.target.y - 150 * (1 - k)); c.lineTo(st.target.x, st.target.y); c.lineTo(st.target.x + 8, st.target.y - 150 * (1 - k)); c.stroke();
      }
    },
  });

  FB.register({ // orbita alrededor del jugador dañando por contacto
    id: 'orbit',
    update(f, p, dt) {
      const prm = f.prm;
      f.a += (prm.speed || 2.2) * dt;
      const grow = f.s.grow || 0;
      f.r = (prm.size || 10) * fsize(p) * (1 + grow);
      f.scale = f.r / 10;
      const R = (prm.radius || 42) * (0.9 + 0.1 * fsize(p));
      f.x = p.x + Math.cos(f.a) * R; f.y = p.y + Math.sin(f.a) * R;
      const hits = touch(f, p, prm.damage || 2, prm.rate || 0.35);
      if (hits && prm.grow) f.s.grow = Math.min(prm.growMax || 0.8, grow + prm.grow * hits);
      if (prm.block) blockShots(f);
    },
    draw(f, c, p) { L.Sprites.draw(c, f.sprite, f.x, f.y, 24 * (f.r / 10)); },
  });

  FB.register({ // lanza botellas que dejan un charco dañino
    id: 'thrower', follows: true,
    update(f, p, dt) {
      followTrail(f, p, dt);
      f.cd -= dt;
      const G = game();
      if (f.cd <= 0 && G.room.enemies.length) {
        const live = G.room.enemies.filter((e) => e.spawnT <= 0 && e.hp > 0);
        if (!live.length) return;
        const e = live[Math.floor(Math.random() * live.length)];
        const prm = f.prm, size = fsize(p), dps = prm.dps * fdmg(p);
        G.proj.push({
          kind: 'lob', sx: f.x, sy: f.y, tx: e.x, ty: e.y, x: f.x, y: f.y, t: 0, T: 0.7, sprite: 'holy_water',
          onLand(l) { G.proj.push({ kind: 'puddle', x: l.tx, y: l.ty, r: prm.radius * size, life: prm.duration, dps, tick: 0 }); },
        });
        f.cd = prm.delay || 5;
      }
    },
  });

  FB.register({ // genera moscas azules
    id: 'summoner', follows: true,
    update(f, p, dt) {
      followTrail(f, p, dt);
      f.cd -= dt;
      if (f.cd <= 0) { L.Familiars.spawnFlies(p, 1); f.cd = f.prm.delay || 4; }
    },
  });

  FB.register({ // mosca azul temporal
    id: 'blue_fly',
    update(f, p, dt) {
      const G = game();
      f.a += 2.4 * dt;
      const tgt = api().nearestEnemy(f.x, f.y, 180);
      let tx, ty;
      if (tgt) { tx = tgt.x; ty = tgt.y; }
      else { const R = 34 + Math.sin(f.a * 1.7 + f.i) * 12; tx = p.x + Math.cos(f.a + f.i) * R; ty = p.y + Math.sin(f.a + f.i) * R; }
      const ang = Math.atan2(ty - f.y, tx - f.x) + Math.sin(game().time * 9 + f.i) * 0.6;
      const sp = tgt ? 150 : 120;
      f.x += Math.cos(ang) * sp * dt; f.y += Math.sin(ang) * sp * dt;
      touch(f, p, 1.2, 0.5);
      // las lágrimas enemigas las dañan
      for (let i = G.eTears.length - 1; i >= 0; i--) {
        const t = G.eTears[i];
        if (Math.hypot(t.x - f.x, t.y - f.y) < f.r + t.r) { G.eTears.splice(i, 1); f.s.hp--; }
      }
      if (f.s.hp <= 0) f.dead = true;
    },
    draw(f, c) {
      const flap = 0.5 + 0.5 * Math.abs(Math.sin(game().time * 40 + f.i));
      c.fillStyle = 'rgba(210,235,255,0.8)';
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(f.x + s * 6, f.y - 3, 5, 3 * flap + 1, s * 0.5, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#3a78d8'; c.beginPath(); c.arc(f.x, f.y, 5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#173a78'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(f.x - 1.8, f.y - 1, 1.3, 0, Math.PI * 2); c.arc(f.x + 1.8, f.y - 1, 1.3, 0, Math.PI * 2); c.fill();
    },
  });
})();
