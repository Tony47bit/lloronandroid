/* ==========================================================================
   Proyectiles y comportamientos de lágrima.

   - L.Projectiles: tipos de proyectil registrables (tear, beam, fbomb, missile,
     knife, pillar, puddle, lob). Añadir uno nuevo = registrar {id, update, draw}.
   - L.TearBehaviors: efectos componibles sobre las lágrimas normales
     (homing, bounce, pierce...). Los objetos los piden con
     `tear:[{ b:'homing', turn:4 }]`; este módulo los ejecuta.

   Contrato de un comportamiento (todo opcional):
     ignoreObstacles: true
     spawn(t, params)                 al crearse la lágrima
     update(t, params, dt)            cada frame
     onHit(t, params, enemy)          devuelve false para atravesar al enemigo
     onWall(t, params, side)          devuelve true si lo gestiona (p. ej. rebote)
     onObstacle(t, params, obstacle)  idem
     onEnd(t, params, reason)         'wall' | 'obstacle' | 'hit' | 'land'
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { rand, clamp, lerp, angleDiff } = L.util;
  const { W, H, WALL } = L.C;
  const geo = L.geo;
  const api = () => L.api;
  const game = () => L.S.game;

  L.Projectiles = new L.Registry('Projectiles');

  const behaviorDef = (bh) => bh.def || (bh.def = L.TearBehaviors.get(bh.id));
  const eachBehavior = (t, fn) => { for (const bh of t.b) { const d = behaviorDef(bh); if (d) fn(d, bh.params || {}); } };

  /** Crea una lágrima y la añade al juego. */
  L.spawnTear = function (p, o) {
    const G = game();
    const sp = o.speed;
    const t = {
      kind: 'tear', x: o.x, y: o.y,
      vx: Math.cos(o.angle) * sp + (o.inheritVx || 0), vy: Math.sin(o.angle) * sp + (o.inheritVy || 0),
      dmg: o.dmg, dmgMul: 1, r: o.r, life: o.range, maxLife: o.range, age: 0,
      hit: new Set(), b: o.behaviors || [], src: p, familiar: !!o.familiar,
      ignoreObs: false, dt: 0.016, lob: false, color: o.color || null,
    };
    eachBehavior(t, (d, prm) => {
      if (d.ignoreObstacles) t.ignoreObs = true;
      if (d.spawn) d.spawn(t, prm);
    });
    G.proj.push(t);
    return t;
  };

  function endTear(t, reason) {
    eachBehavior(t, (d, prm) => { if (d.onEnd) d.onEnd(t, prm, reason); });
    return true;
  }

  // ---------------------------------------------------------------- tear
  L.Projectiles.register({
    id: 'tear',
    update(t, dt) {
      const G = game(), room = G.room;
      t.age += dt; t.life -= dt; t.dt = dt;
      eachBehavior(t, (d, prm) => { if (d.update) d.update(t, prm, dt); });
      t.x += t.vx * dt; t.y += t.vy * dt;

      if (t.lob) { // lanzada en arco: sin colisiones hasta aterrizar
        t.x = clamp(t.x, WALL + 4, W - WALL - 4);
        t.y = clamp(t.y, WALL + 4, H - WALL - 4);
        return t.life <= 0 ? endTear(t, 'land') : false;
      }
      // paredes
      if (t.x < WALL || t.x > W - WALL || t.y < WALL || t.y > H - WALL) {
        const side = t.x < WALL ? 'W' : t.x > W - WALL ? 'E' : t.y < WALL ? 'N' : 'S';
        let handled = false;
        eachBehavior(t, (d, prm) => { if (d.onWall && d.onWall(t, prm, side)) handled = true; });
        if (!handled) return endTear(t, 'wall');
      }
      // obstáculos
      if (!t.ignoreObs) {
        for (const ob of room.obstacles) {
          const od = L.Obstacles.get(ob.id);
          if (!od || !od.blocksTears || !geo.circleHitsRect(t.x, t.y, t.r, ob)) continue;
          let handled = false;
          eachBehavior(t, (d, prm) => { if (d.onObstacle && d.onObstacle(t, prm, ob)) handled = true; });
          if (handled) break;
          api().damageObstacle(ob, t.dmg * t.dmgMul, 'tear');
          return endTear(t, 'obstacle');
        }
      }
      // enemigos
      for (const e of room.enemies) {
        if (e.spawnT > 0 || e.hp <= 0 || t.hit.has(e)) continue;
        if (!geo.circlesHit(t, e)) continue;
        api().hurtEnemy(e, t.dmg * t.dmgMul, { src: 'tear' });
        t.hit.add(e);
        let die = true;
        eachBehavior(t, (d, prm) => { if (d.onHit && d.onHit(t, prm, e) === false) die = false; });
        if (die) return endTear(t, 'hit');
      }
      return t.life <= 0 ? endTear(t, 'land') : false;
    },
    draw(t, c) {
      if (t.lob) {
        const k = 1 - t.life / t.maxLife, z = Math.sin(k * Math.PI) * 34;
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.beginPath(); c.ellipse(t.x, t.y + 2, t.r, t.r * 0.45, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#a8b83a';
        c.beginPath(); c.arc(t.x, t.y - z, t.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#4a5a10'; c.lineWidth = 2; c.stroke();
        return;
      }
      const has = (id) => t.b.some((b) => b.id === id);
      c.save();
      if (has('spectral')) c.globalAlpha = 0.65;
      if (t.holy) { c.shadowColor = '#bfe8ff'; c.shadowBlur = 10; }
      c.fillStyle = t.color || (has('poison') ? '#9be07a' : t.holy ? '#eaf6ff' : '#7fc4ff');
      c.beginPath(); c.arc(t.x, t.y, t.r, 0, Math.PI * 2); c.fill();
      c.strokeStyle = has('homing') ? '#ff6ad0' : has('pierce') ? '#fff' : has('poison') ? '#2f6a1a' : '#1d4f80';
      c.lineWidth = 1.5; c.stroke();
      c.restore();
    },
  });

  // ------------------------------------------------- comportamientos de lágrima
  const B = L.TearBehaviors;

  B.register({ // persigue a los enemigos cercanos
    id: 'homing',
    update(t, prm, dt) {
      const tgt = api().nearestEnemy(t.x, t.y, prm.radius || 280);
      if (!tgt) return;
      const sp = Math.hypot(t.vx, t.vy), cur = Math.atan2(t.vy, t.vx);
      const diff = angleDiff(cur, Math.atan2(tgt.y - t.y, tgt.x - t.x));
      const na = cur + clamp(diff, -(prm.turn || 4) * dt, (prm.turn || 4) * dt);
      t.vx = Math.cos(na) * sp; t.vy = Math.sin(na) * sp;
    },
  });

  B.register({ id: 'pierce', onHit() { return false; } });      // atraviesa enemigos
  B.register({ id: 'spectral', ignoreObstacles: true });         // atraviesa obstáculos

  B.register({ // envenena
    id: 'poison',
    onHit(t, prm, e) { api().poisonEnemy(e, prm.time || 3, Math.max(1, t.dmg * (prm.dps || 0.6))); },
  });

  B.register({ // rebota en paredes y obstáculos
    id: 'bounce',
    spawn(t, prm) { t.bounces = 0; t.life = t.maxLife = t.life * (prm.rangeMul || 1.5); },
    onWall(t, prm, side) {
      if ((t.bounces || 0) >= (prm.max || 4)) return false;
      t.bounces++;
      if (side === 'W') { t.x = WALL + 1; t.vx = Math.abs(t.vx); }
      if (side === 'E') { t.x = W - WALL - 1; t.vx = -Math.abs(t.vx); }
      if (side === 'N') { t.y = WALL + 1; t.vy = Math.abs(t.vy); }
      if (side === 'S') { t.y = H - WALL - 1; t.vy = -Math.abs(t.vy); }
      return true;
    },
    onObstacle(t, prm, ob) {
      if ((t.bounces || 0) >= (prm.max || 4)) return false;
      t.bounces++;
      const dx = t.x - (ob.x + ob.w / 2), dy = t.y - (ob.y + ob.h / 2);
      if (Math.abs(dx) / ob.w > Math.abs(dy) / ob.h) t.vx = (dx > 0 ? 1 : -1) * Math.abs(t.vx);
      else t.vy = (dy > 0 ? 1 : -1) * Math.abs(t.vy);
      t.x += t.vx * t.dt * 2; t.y += t.vy * t.dt * 2;
      return true;
    },
  });

  B.register({ // ipecac: lanzada en arco, explota al aterrizar
    id: 'explosive',
    spawn(t, prm) {
      t.lob = true;
      t.vx *= prm.speedMul || 0.62; t.vy *= prm.speedMul || 0.62;
      t.life = t.maxLife = t.life * 0.9;
      t.r = Math.max(t.r, 7);
    },
    onEnd(t, prm, reason) {
      if (reason !== 'land') return;
      const bomb = t.src.stats.get('bombRadius') / 75;
      api().explode(t.x, t.y, {
        r: (prm.radius || 58) * (0.85 + 0.15 * bomb), eDmg: t.dmg * (prm.dmgMul || 2.2) + (prm.base || 5),
        hurt: true, poison: true, src: 'ipecac',
      });
    },
  });

  B.register({ // parásito: se divide en dos al impactar
    id: 'split',
    split(t, prm) {
      if (t.noSplit) return;
      const ang = Math.atan2(t.vy, t.vx), sp = Math.hypot(t.vx, t.vy);
      for (const s of [-1, 1]) {
        const child = L.spawnTear(t.src, {
          x: t.x, y: t.y, angle: ang + s * Math.PI / 2, speed: sp * 0.8, dmg: t.dmg * (prm.dmgMul || 0.5),
          r: Math.max(3, t.r * 0.7), range: 0.45,
          behaviors: t.b.filter((b) => b.id !== 'split' && b.id !== 'explosive' && b.id !== 'bounce'),
          familiar: t.familiar,
        });
        child.noSplit = true;
        child.hit.add(t.lastHit);
      }
    },
    onHit(t, prm, e) { t.lastHit = e; this.split(t, prm); },
    onObstacle(t, prm, ob) { t.lastHit = null; this.split(t, prm); return false; },
  });

  B.register({ // luz sagrada: algunas lágrimas invocan un rayo al impactar
    id: 'holy',
    spawn(t, prm) { t.holy = Math.random() < (prm.chance || 0.15) + t.src.stats.get('luck') * 0.02; },
    onEnd(t, prm, reason) {
      if (!t.holy || t.holyDone || reason === 'wall') return;
      t.holyDone = true;
      game().proj.push({ kind: 'pillar', x: t.x, y: t.y, r: prm.radius || 34, life: 0.35, maxLife: 0.35,
        dmg: t.dmg * (prm.dmgMul || 3.5), done: false });
    },
  });

  B.register({ // proptosis: más daño cerca, pierde fuerza con la distancia
    id: 'falloff',
    update(t, prm) { t.dmgMul = lerp(prm.near || 2.6, prm.far || 0.45, clamp(t.age / t.maxLife, 0, 1)); },
  });

  // --------------------------------------------------------------- rayos
  L.Projectiles.register({
    id: 'beam',
    update(b, dt) {
      const G = game();
      b.life -= dt;
      if (b.follow) { b.x = b.follow.x; b.y = b.follow.y; }
      const end = geo.rayToWalls(b.x, b.y, b.angle);
      b.ex = end.x; b.ey = end.y;
      b.tick -= dt;
      if (b.tick <= 0) {
        b.tick = b.interval;
        for (const e of G.room.enemies) {
          if (e.spawnT > 0 || e.hp <= 0) continue;
          if (geo.segDist(e.x, e.y, b.x, b.y, b.ex, b.ey) < e.r + b.width / 2) {
            api().hurtEnemy(e, b.dmg, { src: 'beam' });
            if (b.poison) api().poisonEnemy(e, 3, Math.max(1, b.dmg * 0.6));
          }
        }
        if (b.breakObstacles) {
          for (const ob of G.room.obstacles.slice()) {
            const cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2;
            if (geo.segDist(cx, cy, b.x, b.y, b.ex, b.ey) < ob.w / 2 + b.width / 2) api().damageObstacle(ob, b.dmg, 'beam');
          }
        }
      }
      return b.life <= 0;
    },
    draw(b, c) {
      const a = Math.max(0, b.life / b.maxLife);
      c.save();
      c.lineCap = 'round';
      c.globalAlpha = 0.45 + 0.55 * a;
      c.strokeStyle = b.color; c.lineWidth = b.width;
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.ex, b.ey); c.stroke();
      c.strokeStyle = b.core; c.lineWidth = Math.max(1.5, b.width * 0.4);
      c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.ex, b.ey); c.stroke();
      c.restore();
    },
  });

  // ------------------------------------------------- bomba del Dr. Fetus
  L.Projectiles.register({
    id: 'fbomb',
    update(b, dt) {
      const G = game();
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vx *= Math.pow(0.45, dt); b.vy *= Math.pow(0.45, dt);
      b.x = clamp(b.x, WALL + 6, W - WALL - 6); b.y = clamp(b.y, WALL + 6, H - WALL - 6);
      let boom = b.life <= 0;
      if (!boom) for (const e of G.room.enemies) { if (e.spawnT <= 0 && e.hp > 0 && geo.circlesHit(b, e)) { boom = true; break; } }
      if (!boom) for (const ob of G.room.obstacles) {
        const od = L.Obstacles.get(ob.id);
        if (od && od.blocksTears && geo.circleHitsRect(b.x, b.y, b.r, ob)) { boom = true; break; }
      }
      if (boom) {
        api().explode(b.x, b.y, { r: b.radius, eDmg: b.dmg, hurt: false, obstacles: true, secrets: true, src: 'fetus' });
        return true;
      }
      return false;
    },
    draw(b, c) { L.draw.bomb(c, b.x, b.y, 8, b.life < 0.4 && Math.floor(b.life * 16) % 2 === 0); },
  });

  // ------------------------------------------------ misil del Epic Fetus
  L.Projectiles.register({
    id: 'missile',
    update(m, dt) {
      const G = game();
      m.age += dt;
      const ang = Math.atan2(m.ty - m.y, m.tx - m.x);
      m.speed = Math.min(m.speed + 600 * dt, 420);
      m.x += Math.cos(ang) * m.speed * dt; m.y += Math.sin(ang) * m.speed * dt;
      m.angle = ang;
      let boom = Math.hypot(m.tx - m.x, m.ty - m.y) < 10 || m.age > 2.5;
      if (!boom) for (const e of G.room.enemies) { if (e.spawnT <= 0 && e.hp > 0 && geo.circlesHit({ x: m.x, y: m.y, r: 6 }, e)) { boom = true; break; } }
      if (boom) {
        api().explode(m.x, m.y, { r: m.radius, eDmg: m.dmg, hurt: m.hurt, obstacles: true, secrets: true, src: 'epic' });
        return true;
      }
      return false;
    },
    draw(m, c) {
      c.save(); c.translate(m.x, m.y); c.rotate(m.angle);
      c.fillStyle = '#9a9aa4'; c.fillRect(-9, -3.5, 14, 7);
      c.fillStyle = '#d04a3a'; c.beginPath(); c.moveTo(5, -3.5); c.lineTo(11, 0); c.lineTo(5, 3.5); c.closePath(); c.fill();
      c.fillStyle = '#ffb030'; c.beginPath(); c.moveTo(-9, -2.5); c.lineTo(-15 - Math.random() * 3, 0); c.lineTo(-9, 2.5); c.closePath(); c.fill();
      c.restore();
      // marca de objetivo
      c.strokeStyle = 'rgba(255,80,60,0.8)'; c.lineWidth = 2;
      c.beginPath(); c.arc(m.tx, m.ty, 11, 0, Math.PI * 2); c.moveTo(m.tx - 15, m.ty); c.lineTo(m.tx + 15, m.ty);
      c.moveTo(m.tx, m.ty - 15); c.lineTo(m.tx, m.ty + 15); c.stroke();
    },
  });

  // ------------------------------------------------------ cuchillo de Mamá
  L.Projectiles.register({
    id: 'knife',
    update(k, dt) {
      const G = game(), p = k.src;
      if (k.phase === 'out') {
        k.x += Math.cos(k.angle) * k.speed * dt; k.y += Math.sin(k.angle) * k.speed * dt;
        k.dist += k.speed * dt;
        if (k.dist >= k.maxDist || k.x < WALL || k.x > W - WALL || k.y < WALL || k.y > H - WALL) {
          k.x = clamp(k.x, WALL, W - WALL); k.y = clamp(k.y, WALL, H - WALL);
          k.phase = 'back'; k.hit.clear();
        }
      } else {
        const a = Math.atan2(p.y - k.y, p.x - k.x);
        k.x += Math.cos(a) * k.speed * 1.2 * dt; k.y += Math.sin(a) * k.speed * 1.2 * dt;
        if (Math.hypot(p.x - k.x, p.y - k.y) < 16) { p.w.knife = null; return true; }
      }
      for (const e of G.room.enemies) {
        if (e.spawnT > 0 || e.hp <= 0 || k.hit.has(e)) continue;
        if (geo.circlesHit({ x: k.x, y: k.y, r: 9 }, e)) {
          api().hurtEnemy(e, k.dmg, { src: 'knife' });
          if (k.poison) api().poisonEnemy(e, 3, Math.max(1, k.dmg * 0.6));
          k.hit.add(e);
        }
      }
      for (const ob of G.room.obstacles.slice()) {
        if (geo.circleHitsRect(k.x, k.y, 9, ob) && !k.hitOb.has(ob)) { k.hitOb.add(ob); api().damageObstacle(ob, k.dmg, 'knife'); }
      }
      return false;
    },
    draw(k, c) {
      L.Sprites.draw(c, 'moms_knife', k.x, k.y, 30, { rot: k.angle + (k.phase === 'back' ? Math.PI : 0) + Math.PI / 4 });
    },
  });

  // ------------------------------------- columna de luz sagrada (área breve)
  L.Projectiles.register({
    id: 'pillar',
    update(p, dt) {
      const G = game();
      if (!p.done) {
        p.done = true;
        for (const e of G.room.enemies) {
          if (e.spawnT <= 0 && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.r) api().hurtEnemy(e, p.dmg, { src: 'holy' });
        }
      }
      p.life -= dt;
      return p.life <= 0;
    },
    draw(p, c) {
      const a = Math.max(0, p.life / p.maxLife);
      c.save();
      c.globalAlpha = a;
      const g = c.createLinearGradient(p.x - p.r, 0, p.x + p.r, 0);
      g.addColorStop(0, 'rgba(180,220,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(180,220,255,0)');
      c.fillStyle = g; c.fillRect(p.x - p.r, p.y - 150, p.r * 2, 150);
      c.beginPath(); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); c.fillStyle = 'rgba(210,235,255,0.6)'; c.fill();
      c.restore();
    },
  });

  // ------------------------------------------------ charco dañino (agua bendita)
  L.Projectiles.register({
    id: 'puddle',
    update(p, dt) {
      const G = game();
      p.life -= dt; p.tick -= dt;
      if (p.tick <= 0) {
        p.tick = 0.4;
        for (const e of G.room.enemies) {
          if (e.spawnT <= 0 && e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < p.r + e.r * 0.5) api().hurtEnemy(e, p.dps * 0.4, { src: 'puddle' });
        }
      }
      return p.life <= 0;
    },
    draw(p, c) {
      c.save();
      c.globalAlpha = Math.min(0.55, p.life * 0.4);
      c.fillStyle = '#4aa0f0';
      c.beginPath(); c.ellipse(p.x, p.y, p.r, p.r * 0.7, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#bfe0ff'; c.lineWidth = 2; c.stroke();
      c.restore();
    },
  });

  // --------------------------------------- objeto lanzado en arco (genérico)
  L.Projectiles.register({
    id: 'lob',
    update(l, dt) {
      l.t += dt;
      const k = Math.min(1, l.t / l.T);
      l.x = lerp(l.sx, l.tx, k); l.y = lerp(l.sy, l.ty, k);
      if (k >= 1) { if (l.onLand) l.onLand(l); return true; }
      return false;
    },
    draw(l, c) {
      const k = Math.min(1, l.t / l.T), z = Math.sin(k * Math.PI) * 40;
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.beginPath(); c.ellipse(l.x, l.y + 3, 7, 3.5, 0, 0, Math.PI * 2); c.fill();
      L.Sprites.draw(c, l.sprite, l.x, l.y - z, 20, { rot: k * 6 });
    },
  });

  L.updateProjectiles = function (dt) {
    const list = game().proj;
    for (let i = list.length - 1; i >= 0; i--) {
      const pr = list[i], d = L.Projectiles.get(pr.kind);
      if (!d || d.update(pr, dt)) list.splice(i, 1);
    }
  };
  L.drawProjectiles = function (c) {
    for (const pr of game().proj) { const d = L.Projectiles.get(pr.kind); if (d && d.draw) d.draw(pr, c); }
  };
})();
