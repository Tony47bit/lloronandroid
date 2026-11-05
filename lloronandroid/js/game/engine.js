/* ==========================================================================
   Motor de juego: estado (L.S), bucle de actualización y fachada L.api que
   usan los objetos/sistemas. No contiene contenido: enemigos, jefes, pickups,
   terreno, armas, personajes y objetos vienen de sus registros.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { rand, randi, clamp } = L.util;
  const { W, H, WALL, DOOR, DIRS } = L.C;
  const geo = L.geo;
  const Inv = L.Inventory;
  const MAX_HEARTS = 24;

  const S = L.S = { state: 'menu', game: null, save: { bestFloor: 0, totalKills: 0 }, charId: 'lloron', menuT: 0, goT: 0 };
  const game = () => S.game;

  // ------------------------------------------------------------------ Guardado
  L.Save = {
    load() {
      try {
        const s = JSON.parse(localStorage.getItem(L.C.SAVE_KEY));
        if (s) { S.save.bestFloor = Number(s.bestFloor) || 0; S.save.totalKills = Number(s.totalKills) || 0; if (s.charId) S.charId = String(s.charId); }
      } catch (e) { /* sin almacenamiento */ }
    },
    write() { try { localStorage.setItem(L.C.SAVE_KEY, JSON.stringify(Object.assign({ charId: S.charId }, S.save))); } catch (e) { /* ignorar */ } },
  };

  // ------------------------------------------------------------------- Ayudas
  const defOfEnemy = (e) => L.Enemies.get(e.type) || L.Bosses.get(e.type);
  const doorOpen = (room, k) => room.cleared && room.doors[k] && !room.locks[k];
  const canCross = (p) => Inv.hasFlag(p, 'flying') || (p.status.jump || 0) > 0;
  const obDef = (ob) => L.Obstacles.get(ob.id);

  function clampPlayer(p, room) {
    const r = p.r, minX = WALL + r, maxX = W - WALL - r, minY = WALL + r, maxY = H - WALL - r;
    const dw = DOOR / 2 - r + 2;
    const inCol = Math.abs(p.x - W / 2) <= dw, inRow = Math.abs(p.y - H / 2) <= dw;
    if (p.y < minY) { if (doorOpen(room, 'N') && inCol) p.x = clamp(p.x, W / 2 - dw, W / 2 + dw); else p.y = minY; }
    if (p.y > maxY) { if (doorOpen(room, 'S') && inCol) p.x = clamp(p.x, W / 2 - dw, W / 2 + dw); else p.y = maxY; }
    if (p.x < minX) { if (doorOpen(room, 'W') && inRow) p.y = clamp(p.y, H / 2 - dw, H / 2 + dw); else p.x = minX; }
    if (p.x > maxX) { if (doorOpen(room, 'E') && inRow) p.y = clamp(p.y, H / 2 - dw, H / 2 + dw); else p.x = maxX; }
  }

  function freePos(room, margin) {
    margin = margin == null ? 50 : margin;
    for (let i = 0; i < 50; i++) {
      const x = rand(WALL + margin, W - WALL - margin), y = rand(WALL + margin, H - WALL - margin);
      if (room.obstacles.some((o) => geo.circleHitsRect(x, y, 18, o))) continue;
      if (room.pickups.some((k) => Math.hypot(k.x - x, k.y - y) < 36)) continue;
      return { x, y };
    }
    return { x: W / 2, y: H / 2 };
  }

  // ----------------------------------------------------------------- Jugador
  function createPlayer(ch) {
    const p = {
      x: W / 2, y: H / 2, r: 12, vx: 0, vy: 0, fx: 0, fy: 1, hp: 0, soul: ch.soul || 0,
      coins: ch.coins || 0, bombs: ch.bombs == null ? 1 : ch.bombs, keys: ch.keys || 0,
      iframes: 0, w: { cool: 0, charge: 0, id: 'normal', aim: null, knife: null }, trail: [],
      charId: ch.id, color: ch.color || '#f3d6b8', aimNow: null, roomSources: new Set(), roomStatus: new Set(),
    };
    Inv.init(p, ch.stats);
    p.hp = p.stats.get('maxHp');
    for (const id of ch.items || []) Inv.add(p, id);
    if (ch.active) Inv.add(p, ch.active);
    p.hp = Math.min(p.hp, p.stats.get('maxHp'));
    return p;
  }

  function lives(p) { let n = 0; for (const i of Inv.instances(p)) if (i.s && i.s.lives) n += i.s.lives; return n; }

  // -------------------------------------------------------------------- Daño
  /** amount en medios corazones. Devuelve true si el golpe entró. */
  function hurtPlayer(amount, src) {
    const G = game(), p = G.player;
    if (p.iframes > 0 || (p.status.invulnerable || 0) > 0) return false;
    const info = { amount: amount == null ? 2 : amount, src: src || 'enemy', cancel: false };
    Inv.emit(p, 'onPlayerDamaged', info);
    if (info.cancel || info.amount <= 0) { p.iframes = Math.max(p.iframes, 0.6); return false; }
    let dmg = info.amount;
    const fromSoul = Math.min(p.soul, dmg);
    p.soul -= fromSoul; dmg -= fromSoul;
    p.hp -= dmg;
    p.iframes = 1.2; G.shake = 0.25;
    if (p.hp <= 0 && p.soul <= 0) {
      p.hp = 0;
      const d = { revive: false, hp: 2 };
      Inv.emit(p, 'onPlayerDeath', d);
      if (d.revive) {
        p.hp = Math.min(p.stats.get('maxHp'), d.hp || 2); p.iframes = 2.5;
        Inv.emit(p, 'onRevive', d); say('¡REVIVES!', '', 1.4);
      } else endGame();
    } else if (p.hp < 0) p.hp = 0;
    return true;
  }

  function endGame() {
    S.state = 'gameover'; S.goT = 0; L.Input.release(); L.Save.write();
  }

  // ---------------------------------------------------------------- Enemigos
  function makeEnemy(id, x, y, opts) {
    const def = L.Enemies.get(id) || L.Bosses.get(id);
    if (!def) throw new Error('Enemigo desconocido: ' + id);
    const f = game().floor, boss = L.Bosses.has(id);
    const e = {
      type: id, boss, x, y, r: def.r, fly: !!def.fly, hp: def.hp(f), speed: def.speed(f), flash: 0,
      spawnT: boss ? 1.0 : 0.7, poison: null, t: 0, contact: def.contact == null ? 2 : def.contact,
    };
    e.maxHp = e.hp;
    if (def.init) def.init(e, f, L.api);
    if (opts) Object.assign(e, opts);
    return e;
  }

  function findSpawn(room, r) {
    const p = game().player;
    for (let i = 0; i < 60; i++) {
      const x = rand(WALL + 40, W - WALL - 40), y = rand(WALL + 40, H - WALL - 40);
      if (Math.hypot(x - p.x, y - p.y) < 170) continue;
      if (room.obstacles.some((o) => geo.circleHitsRect(x, y, r + 8, o))) continue;
      if (room.enemies.some((e) => Math.hypot(e.x - x, e.y - y) < 30)) continue;
      return { x, y };
    }
    return { x: W / 2, y: H / 2 - 100 };
  }

  function spawnEnemies(room) {
    room.spawned = true;
    const n = game().floor;
    if (room.boss) { room.enemies.push(makeEnemy(room.boss, W / 2, H / 2 - 60)); return; }
    const defs = L.Enemies.filter((d) => (d.minFloor || 1) <= n);
    const count = Math.min(3 + randi(0, 2) + Math.floor(n * 0.7), 9);
    for (let i = 0; i < count && room.enemies.length < 12; i++) {
      const d = L.util.weighted(defs, (x) => x.weight);
      for (let k = 0; k < (d.group || 1); k++) {
        const pos = findSpawn(room, d.r + 2);
        room.enemies.push(makeEnemy(d.id, pos.x, pos.y));
      }
    }
  }

  function enemyTear(x, y, ang, speed, r) {
    game().eTears.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: r || 5, life: 4 });
  }

  function hurtEnemy(e, dmg, opts) {
    if (!e || e.hp <= 0 || e.spawnT > 0 || !(dmg > 0)) return;
    e.hp -= dmg; e.flash = 0.12;
  }
  function poisonEnemy(e, t, dps) { if (e && e.hp > 0) e.poison = { t, dps }; }

  function reapDead(room) {
    const G = game(), p = G.player, list = room.enemies;
    let last = null, bossDown = false;
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (e.hp > 0) continue;
      list.splice(i, 1); last = e;
      G.runKills++; S.save.totalKills++;
      const d = defOfEnemy(e);
      if (d && d.onDeath) d.onDeath(L.api, e);
      Inv.emit(p, 'onEnemyKilled', e);
      if (e.boss) bossDown = true;
      else if (Math.random() < 0.1 * p.stats.get('coinDrop')) addPickup(room, 'coin', e.x, e.y);
    }
    if (!last) return;
    L.Save.write();
    if (bossDown) {
      list.length = 0; G.eTears.length = 0; room.cleared = true;
      addPickup(room, 'trap', W / 2, H / 2 + 20);
      addPickup(room, 'item', W / 2 - 100, H / 2 + 20, { item: takeItem('boss') });
      addPickup(room, 'heart', W / 2 + 100, H / 2 + 20);
      addPickup(room, 'coin', W / 2 - 40, H / 2 + 80); addPickup(room, 'coin', W / 2 + 40, H / 2 + 80);
      say('JEFE DERROTADO', 'Baja por la trampilla para seguir', 3); G.shake = 0.5;
      Inv.chargeActive(p, 1); Inv.emit(p, 'onRoomClear', room);
    } else if (room.spawned && !room.cleared && list.length === 0) onRoomCleared(room, last);
  }

  function onRoomCleared(room, last) {
    const G = game(), p = G.player;
    room.cleared = true;
    const rolls = Math.round(p.stats.get('rewardRolls'));
    for (let i = 0; i < rolls; i++) {
      if (Math.random() > 0.55 + p.stats.get('luck') * 0.03) continue;
      const cands = L.Pickups.filter((d) => d.drop);
      const d = L.util.weighted(cands, (x) => x.drop.weight * (x.drop.coin ? p.stats.get('coinDrop') : 1));
      if (!d) continue;
      const x = clamp(last.x + (i ? rand(-30, 30) : 0), WALL + 30, W - WALL - 30), y = clamp(last.y + (i ? rand(-30, 30) : 0), WALL + 30, H - WALL - 30);
      addPickup(room, d.id, x, y);
    }
    Inv.chargeActive(p, 1);
    Inv.emit(p, 'onRoomClear', room);
  }

  function updateEnemies(dt) {
    const G = game(), p = G.player, room = G.room;
    const g = { time: G.time, player: p };
    for (const e of room.enemies.slice()) {
      if (e.spawnT > 0) { e.spawnT -= dt; continue; }
      if (e.flash > 0) e.flash -= dt;
      if (e.poison) { e.hp -= e.poison.dps * dt; e.poison.t -= dt; if (e.poison.t <= 0) e.poison = null; }
      const d = defOfEnemy(e);
      if (d && d.update) d.update(e, L.api, dt);
      e.x = clamp(e.x, WALL + e.r, W - WALL - e.r); e.y = clamp(e.y, WALL + e.r, H - WALL - e.r);
      for (const ob of room.obstacles) {
        const od = obDef(ob);
        if (od && (e.fly ? od.blocksFlying : od.blocksGround)) geo.pushOutRect(e, ob);
      }
      if (e.hp > 0 && geo.circlesHit(e, p, -2)) hurtPlayer(e.contact, 'contact');
    }
    // lágrimas enemigas
    for (let i = G.eTears.length - 1; i >= 0; i--) {
      const t = G.eTears[i];
      t.x += t.vx * dt; t.y += t.vy * dt; t.life -= dt;
      let dead = t.life <= 0 || t.x < WALL || t.x > W - WALL || t.y < WALL || t.y > H - WALL;
      if (!dead) for (const ob of room.obstacles) { const od = obDef(ob); if (od && od.blocksTears && geo.circleHitsRect(t.x, t.y, t.r, ob)) { dead = true; break; } }
      if (!dead && Math.hypot(t.x - p.x, t.y - p.y) < t.r + p.r * 0.8) { hurtPlayer(2, 'tear'); dead = true; }
      if (dead) G.eTears.splice(i, 1);
    }
    void g;
  }

  // ----------------------------------------------------------------- Pickups
  function addPickup(room, type, x, y, opts) {
    const def = L.Pickups.get(type);
    if (!def) throw new Error('Pickup desconocido: ' + type);
    const pk = Object.assign({ type, x, y, r: def.r, delay: 0 }, opts || {});
    room.pickups.push(pk);
    return pk;
  }
  function takeItem(pool) { return L.Items.roll(pool, game().taken, game().player); }

  function updatePickups(dt) {
    const G = game(), p = G.player, room = G.room;
    for (let i = room.pickups.length - 1; i >= 0; i--) {
      const pk = room.pickups[i];
      if (pk.delay > 0) { pk.delay -= dt; continue; }
      if (Math.hypot(pk.x - p.x, pk.y - p.y) >= pk.r + p.r * 0.9) continue;
      const def = L.Pickups.get(pk.type);
      if (def.collect(L.api, p, pk, room)) {
        const at = room.pickups.indexOf(pk);
        if (at >= 0) room.pickups.splice(at, 1);
        Inv.emit(p, 'onPickup', pk);
      }
    }
  }

  // ------------------------------------------------------- Bombas / explosiones
  function placeBomb() {
    if (S.state !== 'playing') return false;
    const G = game(), p = G.player;
    if (p.bombs <= 0 || G.bombList.length >= 3) return false;
    p.bombs--; G.bombList.push({ x: p.x, y: p.y, t: 1.5 });
    return true;
  }

  function openSecrets(room, x, y, R) {
    for (const d of DIRS) {
      const s = room.secret[d.k];
      if (!s) continue;
      const c = L.C.doorCenter(d.k);
      if (Math.hypot(x - c.x, y - c.y) < R + 30) {
        room.secret[d.k] = null; room.doors[d.k] = true; s.doors[d.opp] = true; s.revealed = true;
        say('¡SALA SECRETA!', 'Una pared se derrumba', 2);
      }
    }
  }

  function destroyObstacle(ob) {
    const room = game().room, i = room.obstacles.indexOf(ob);
    if (i < 0) return;
    room.obstacles.splice(i, 1);
    const d = obDef(ob);
    if (d && d.onDestroy) d.onDestroy(L.api, ob);
  }
  function damageObstacle(ob, dmg) {
    const d = obDef(ob);
    if (!d || d.hp === Infinity) return;
    ob.hp -= dmg;
    if (ob.hp <= 0) destroyObstacle(ob);
  }

  /** o: { r, eDmg, hurt, obstacles, secrets, poison, src } */
  function explode(x, y, o) {
    const G = game(), room = G.room, p = G.player;
    G.fx.push({ x, y, r: o.r, t: 0.35, max: 0.35 });
    G.shake = Math.max(G.shake, 0.3);
    for (const e of room.enemies) {
      if (e.spawnT > 0 || e.hp <= 0) continue;
      if (Math.hypot(e.x - x, e.y - y) < o.r + e.r) {
        hurtEnemy(e, o.eDmg, { src: o.src || 'explosion' });
        if (o.poison) poisonEnemy(e, 3, Math.max(1, p.stats.get('damage') * 0.6));
      }
    }
    if (o.obstacles) for (const ob of room.obstacles.slice()) {
      const d = obDef(ob);
      if (d && d.bombable && geo.circleHitsRect(x, y, o.r, ob)) destroyObstacle(ob);
    }
    if (o.secrets) openSecrets(room, x, y, o.r);
    if (o.hurt && Math.hypot(p.x - x, p.y - y) < o.r + p.r * 0.5) hurtPlayer(2, 'explosion');
    Inv.emit(p, 'onBombExplode', { x, y, r: o.r, src: o.src });
    reapDead(room);
  }

  function updateBombs(dt) {
    const G = game(), p = G.player;
    for (let i = G.bombList.length - 1; i >= 0; i--) {
      const b = G.bombList[i];
      if ((b.t -= dt) > 0) continue;
      G.bombList.splice(i, 1);
      explode(b.x, b.y, { r: p.stats.get('bombRadius'), eDmg: p.stats.get('bombDamage'), hurt: true, obstacles: true, secrets: true, src: 'bomb' });
    }
  }

  // ------------------------------------------------------- Salas / navegación
  function say(text, sub, t) { game().banner = { text, sub: sub || '', t: t || 1.4 }; }
  function hint(text) { const G = game(); if (G.msgT <= 0) { say(text, '', 1.2); G.msgT = 1.4; } }

  function clearRoomBound(p) {
    for (const s of p.roomSources) p.stats.removeSource(s);
    p.roomSources.clear();
    for (const n of p.roomStatus) p.status[n] = 0;
    p.roomStatus.clear();
    Inv.refresh(p);
  }

  function changeRoom(k) {
    const G = game(), p = G.player, d = DIRS.find((x) => x.k === k);
    const next = G.map.grid[G.map.key(G.room.gx + d.dx, G.room.gy + d.dy)];
    if (!next) return;
    const first = !next.visited;
    G.room = next; next.visited = true;
    G.proj.length = 0; G.eTears.length = 0; G.bombList.length = 0;
    p.w.knife = null; p.w.charge = 0; p.trail.length = 0;
    const inset = WALL + p.r + 6;
    if (k === 'N') { p.x = W / 2; p.y = H - inset; }
    if (k === 'S') { p.x = W / 2; p.y = inset; }
    if (k === 'E') { p.x = inset; p.y = H / 2; }
    if (k === 'W') { p.x = W - inset; p.y = H / 2; }
    p.iframes = Math.max(p.iframes, 0.4);
    clearRoomBound(p);
    if (!next.cleared && !next.spawned) spawnEnemies(next);
    const rt = next.def;
    if (next.boss && !next.cleared) say(L.Bosses.get(next.boss).name || 'JEFE', '', 1.6);
    else if (first && rt && rt.banner) say(rt.banner.text, rt.banner.sub, 1.9);
    Inv.emit(p, 'onRoomEnter', next);
  }

  function startFloor(n) {
    const G = game();
    G.floor = n;
    G.proj.length = 0; G.eTears.length = 0; G.bombList.length = 0; G.fx.length = 0;
    G.map = L.Floor.generate(n, L.api);
    G.room = G.map.start; G.room.visited = true; G.room.cleared = true;
    G.player.x = W / 2; G.player.y = H / 2; G.player.trail.length = 0;
    clearRoomBound(G.player);
    if (S.save.bestFloor < n) { S.save.bestFloor = n; L.Save.write(); }
    say('PISO ' + n, '', 2.2);
    Inv.emit(G.player, 'onFloorStart', n);
  }
  function nextFloor() { const p = game().player; api.heal(p, 2); startFloor(game().floor + 1); }

  function tryUnlock(room, p) {
    const r = p.r, dw = DOOR / 2 - r + 2, G = game();
    const near = {
      N: p.y <= WALL + r + 1 && Math.abs(p.x - W / 2) <= dw, S: p.y >= H - WALL - r - 1 && Math.abs(p.x - W / 2) <= dw,
      W: p.x <= WALL + r + 1 && Math.abs(p.y - H / 2) <= dw, E: p.x >= W - WALL - r - 1 && Math.abs(p.y - H / 2) <= dw,
    };
    for (const d of DIRS) {
      if (!near[d.k] || !room.locks[d.k] || !room.cleared) continue;
      if (p.keys > 0) {
        p.keys--; room.locks[d.k] = false;
        const nb = G.map.grid[G.map.key(room.gx + d.dx, room.gy + d.dy)];
        if (nb) nb.locks[d.opp] = false;
        say('PUERTA ABIERTA', '', 1.2);
      } else hint('Necesitas una llave');
    }
  }

  // ------------------------------------------------------------------ Partida
  function newGame(charId) {
    const ch = L.Characters.get(charId) || L.Characters.all()[0];
    S.charId = ch.id;
    S.game = {
      floor: 1, runKills: 0, time: 0, shake: 0, msgT: 0, proj: [], eTears: [], bombList: [], fx: [],
      map: null, room: null, taken: new Set(), banner: { text: '', sub: '', t: 0 }, player: null,
    };
    S.game.player = createPlayer(ch);
    startFloor(1);
    S.state = 'playing';
    L.Input.release(); L.Save.write();
  }

  // ------------------------------------------------------------------- Update
  function update(dt) {
    const G = game(), p = G.player;
    G.time += dt;
    if (G.banner.t > 0) G.banner.t -= dt;
    if (G.shake > 0) G.shake -= dt;
    if (G.msgT > 0) G.msgT -= dt;
    if (p.iframes > 0) p.iframes -= dt;
    for (let i = G.fx.length - 1; i >= 0; i--) { G.fx[i].t -= dt; if (G.fx[i].t <= 0) G.fx.splice(i, 1); }
    for (const k of Object.keys(p.status)) if (p.status[k] > 0) p.status[k] = Math.max(0, p.status[k] - dt);
    if (p.stats.update(dt)) api.onStatsChanged(p);

    const room = G.room;
    const mv = L.Input.move(), aim = L.Input.aim();
    const speed = p.stats.get('speed') * (p.status.slow > 0 ? 0.6 : 1);
    p.vx = mv.x * speed; p.vy = mv.y * speed;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (!canCross(p)) for (const ob of room.obstacles) { const od = obDef(ob); if (od && od.blocksGround) geo.pushOutRect(p, ob); }
    clampPlayer(p, room);
    tryUnlock(room, p);
    if (aim) { p.fx = aim.x; p.fy = aim.y; } else if (mv.x || mv.y) { p.fx = mv.x; p.fy = mv.y; }
    p.trail.unshift({ x: p.x, y: p.y }); if (p.trail.length > 80) p.trail.length = 80;

    if (L.Input.takeBomb()) placeBomb();
    if (L.Input.takeActive()) Inv.useActive(p);

    L.Weapons.update(p, dt, aim);
    Inv.emit(p, 'onUpdate', dt);
    updateEnemies(dt);
    L.updateProjectiles(dt);
    L.Familiars.update(p, dt);
    updateBombs(dt);
    updatePickups(dt);
    reapDead(room);
  }

  // ------------------------------------------------------------------- Fachada
  const api = L.api = {
    game, player: () => game().player, room: () => game().room, floor: () => game().floor,
    enemies: () => game().room.enemies, say, hint, freePos, randomFreePos: freePos,
    hurtPlayer, hurtEnemy, poisonEnemy, explode, damageObstacle, destroyObstacle, damageArea(x, y, r, dmg, o) {
      for (const e of game().room.enemies) if (e.spawnT <= 0 && e.hp > 0 && Math.hypot(e.x - x, e.y - y) < r + e.r) hurtEnemy(e, dmg, o);
      reapDead(game().room);
    },
    nearestEnemy(x, y, maxD) {
      let best = null, bd = maxD == null ? 1e9 : maxD;
      for (const e of game().room.enemies) {
        if (e.spawnT > 0 || e.hp <= 0) continue;
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },
    enemyTear, makeEnemy,
    spawnEnemy(id, x, y, opts) { const e = makeEnemy(id, x, y, opts); game().room.enemies.push(e); return e; },
    addPickup, takeItem,
    spawnPickup(type, x, y, opts) { return addPickup(game().room, type, x, y, Object.assign({ delay: 0.25 }, opts || {})); },
    spawnObstacle(id, x, y) {
      const d = L.Obstacles.get(id), [w, h] = d.size, room = game().room;
      if (room.obstacles.some((o) => geo.circleHitsRect(x, y, 6, o))) return null;
      const ob = { id, x: x - w / 2, y: y - h / 2, w, h, hp: d.hp, maxHp: d.hp };
      room.obstacles.push(ob); return ob;
    },
    givePickup(p, what, n) { p[what] = clamp((p[what] || 0) + n, 0, 99); },
    heal(p, n) { p.hp = Math.min(p.stats.get('maxHp'), p.hp + n); },
    addSoul(p, n) { p.soul = Math.min(MAX_HEARTS - p.stats.get('maxHp'), p.soul + n); },
    shopPrice(base) { return Math.max(1, Math.round(base * game().player.stats.get('shopPrice'))); },
    giveItem(p, id) {
      const def = L.Items.get(id), prev = Inv.add(p, id);
      game().taken.add(id);
      return def.type === 'active' ? prev : null;
    },
    removeItem(p, id) { return Inv.remove(p, id); },
    lives,
    /** Estado temporal (volar, invulnerable...). room:true = se pierde al cambiar de sala. */
    addStatus(p, name, secs, o) { p.status[name] = Math.max(p.status[name] || 0, secs); if (o && o.room) p.roomStatus.add(name); },
    /** Modificador de estadística hasta salir de la sala. */
    addTemp(p, source, stat, spec) { p.stats.addModifier(source, stat, spec); p.roomSources.add(source); api.onStatsChanged(p); },
    teleportRandom(p) { const q = freePos(game().room, 60); p.x = q.x; p.y = q.y; p.iframes = Math.max(p.iframes, 0.5); },
    rerollPedestals() {
      for (const pk of game().room.pickups) {
        if (pk.type === 'item') pk.item = takeItem('treasure');
        else if (pk.type === 'shop' && pk.sell.type === 'item') pk.sell.item = takeItem('shop');
      }
    },
    spawnBlueFly(p, n) { L.Familiars.spawnFlies(p, n || 1); },
    fireTear(p, angle, o) { return L.spawnTear(p, Object.assign({ x: p.x, y: p.y, angle, speed: p.stats.get('shotSpeed'), dmg: p.stats.get('damage'), r: 5, range: p.stats.get('range') }, o || {})); },
    nextFloor,
    onStatsChanged(p) {
      const max = p.stats.get('maxHp');
      if (p.hp > max) p.hp = max;
      if (p.hp + p.soul > MAX_HEARTS) p.soul = Math.max(0, MAX_HEARTS - p.hp);
      p.r = 12 * p.stats.get('size');
    },
  };

  L.Engine = { newGame, update, placeBomb, useActive: () => Inv.useActive(game().player), changeRoom, startFloor, clampPlayer, reapDead, spawnEnemies, hurtPlayer };

  // Cambio de sala al cruzar una puerta abierta (se evalúa tras mover al jugador)
  const baseUpdate = update;
  L.Engine.update = function (dt) {
    baseUpdate(dt);
    const G = game(), p = G.player, room = G.room;
    if (S.state !== 'playing') return;
    if (p.y < 8 && doorOpen(room, 'N')) changeRoom('N');
    else if (p.y > H - 8 && doorOpen(room, 'S')) changeRoom('S');
    else if (p.x < 8 && doorOpen(room, 'W')) changeRoom('W');
    else if (p.x > W - 8 && doorOpen(room, 'E')) changeRoom('E');
  };
})();
