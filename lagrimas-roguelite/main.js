/* ==========================================================================
   LÁGRIMAS — Roguelite twin-stick 2D top-down (Canvas + JS vanilla)
   Resolución lógica 800x450 escalada a cualquier pantalla (landscape).
   ========================================================================== */
(() => {
  'use strict';

  // ---------------------------------------------------------------- Constantes
  const W = 800, H = 450;      // resolución lógica
  const WALL = 44;             // grosor de pared
  const DOOR = 64;             // ancho de puerta
  const TEAR_SPEED = 340;
  const SAVE_KEY = 'lagrimas_save_v1';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ------------------------------------------------------------------- Utils
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ------------------------------------------------------------- Persistencia
  const save = { bestFloor: 0, totalKills: 0 };
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s) {
        save.bestFloor = Number(s.bestFloor) || 0;
        save.totalKills = Number(s.totalKills) || 0;
      }
    } catch (e) { /* sin almacenamiento: se juega igual */ }
  }
  function writeSave() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignorar */ }
  }

  // ------------------------------------------------------------ Escalado/viewport
  let scale = 1, offX = 0, offY = 0, dpr = 1, sw = 0, sh = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    sw = window.innerWidth;
    sh = window.innerHeight;
    canvas.width = Math.floor(sw * dpr);
    canvas.height = Math.floor(sh * dpr);
    canvas.style.width = sw + 'px';
    canvas.style.height = sh + 'px';
    scale = Math.min(sw / W, sh / H);
    offX = (sw - W * scale) / 2;
    offY = (sh - H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  resize();

  const toLogical = (px, py) => ({ x: (px - offX) / scale, y: (py - offY) / scale });

  // ------------------------------------------------------------------- Estado
  let state = 'menu';          // 'menu' | 'playing' | 'gameover'
  let game = null;
  let menuT = 0, goT = 0;

  // ------------------------------------------------------------------- Input
  const makeStick = () => ({ id: null, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0 });
  const sticks = { move: makeStick(), aim: makeStick() };
  const keys = {};

  const stickRadius = () => clamp(Math.min(sw, sh) * 0.16, 48, 95);
  function stickHome(which) {
    const R = stickRadius();
    return which === 'move'
      ? { x: R * 1.7, y: sh - R * 1.7 }
      : { x: sw - R * 1.7, y: sh - R * 1.7 };
  }
  function updateStick(s) {
    const R = stickRadius();
    const dx = s.x - s.ox, dy = s.y - s.oy;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) { s.vx = 0; s.vy = 0; return; }
    const m = Math.min(len, R) / R;
    s.vx = dx / len * m;
    s.vy = dy / len * m;
  }
  function releaseStick(s) { s.id = null; s.vx = 0; s.vy = 0; }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignorar */ }
    if (state !== 'playing') { uiTap(e.clientX, e.clientY); return; }
    const s = e.clientX < sw / 2 ? sticks.move : sticks.aim;
    if (s.id !== null) return;
    s.id = e.pointerId;
    s.ox = s.x = e.clientX;
    s.oy = s.y = e.clientY;
    updateStick(s);
  });
  canvas.addEventListener('pointermove', (e) => {
    e.preventDefault();
    for (const s of [sticks.move, sticks.aim]) {
      if (s.id === e.pointerId) { s.x = e.clientX; s.y = e.clientY; updateStick(s); }
    }
  });
  const pointerEnd = (e) => {
    for (const s of [sticks.move, sticks.aim]) if (s.id === e.pointerId) releaseStick(s);
  };
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('lostpointercapture', pointerEnd);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    releaseStick(sticks.move); releaseStick(sticks.aim);
    for (const k in keys) keys[k] = false;
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) writeSave(); });

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if ((e.code === 'Enter' || e.code === 'Space') && state !== 'playing') {
      if (state === 'menu' || goT > 0.4) startGame();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });

  // Movimiento en 8 direcciones (el joystick se cuantiza a múltiplos de 45°)
  function getMoveVector() {
    const s = sticks.move;
    if (Math.hypot(s.vx, s.vy) > 0.25) {
      const a = Math.round(Math.atan2(s.vy, s.vx) / (Math.PI / 4)) * (Math.PI / 4);
      return { x: Math.cos(a), y: Math.sin(a) };
    }
    let x = 0, y = 0;
    if (keys.KeyA) x -= 1;
    if (keys.KeyD) x += 1;
    if (keys.KeyW) y -= 1;
    if (keys.KeyS) y += 1;
    const l = Math.hypot(x, y);
    return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
  // Disparo en la dirección exacta apuntada
  function getAimVector() {
    const s = sticks.aim;
    const m = Math.hypot(s.vx, s.vy);
    if (m > 0.25) return { x: s.vx / m, y: s.vy / m };
    let x = 0, y = 0;
    if (keys.ArrowLeft) x -= 1;
    if (keys.ArrowRight) x += 1;
    if (keys.ArrowUp) y -= 1;
    if (keys.ArrowDown) y += 1;
    const l = Math.hypot(x, y);
    return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }

  // ------------------------------------------------------------------ Ítems
  const ITEMS = [
    { id: 'dmg',   name: 'Sangre de Mejora',   desc: '+Daño',              color: '#d93a3a', glyph: 'D',
      apply: (p) => { p.dmg += 0.9; } },
    { id: 'speed', name: 'Botas Veloces',      desc: '+Velocidad',         color: '#3aa0d9', glyph: 'V',
      apply: (p) => { p.speed += 30; } },
    { id: 'rate',  name: 'Lágrima Rápida',     desc: '+Cadencia de disparo', color: '#e0c030', glyph: 'R',
      apply: (p) => { p.fireDelay = Math.max(0.12, p.fireDelay * 0.8); } },
    { id: 'heart', name: 'Corazón Contenedor', desc: '+1 corazón máximo',  color: '#d93a8c', glyph: '+',
      apply: (p) => { p.maxHp = Math.min(10, p.maxHp + 1); p.hp = Math.min(p.maxHp, p.hp + 1); } },
  ];
  const randomItem = () => ITEMS[randi(0, ITEMS.length - 1)];

  // ------------------------------------------------------------- Colisiones
  // Círculo vs rectángulo (AABB): empuja al círculo fuera. Devuelve true si chocó.
  function pushOutRect(c, rc) {
    const cx = clamp(c.x, rc.x, rc.x + rc.w);
    const cy = clamp(c.y, rc.y, rc.y + rc.h);
    const dx = c.x - cx, dy = c.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= c.r * c.r) return false;
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2), pen = c.r - d;
      c.x += dx / d * pen;
      c.y += dy / d * pen;
    } else {
      const l = c.x - rc.x, r = rc.x + rc.w - c.x, t = c.y - rc.y, b = rc.y + rc.h - c.y;
      const m = Math.min(l, r, t, b);
      if (m === l) c.x = rc.x - c.r;
      else if (m === r) c.x = rc.x + rc.w + c.r;
      else if (m === t) c.y = rc.y - c.r;
      else c.y = rc.y + rc.h + c.r;
    }
    return true;
  }
  function circleHitsRect(x, y, r, rc) {
    const cx = clamp(x, rc.x, rc.x + rc.w);
    const cy = clamp(y, rc.y, rc.y + rc.h);
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy < r * r;
  }
  const circlesHit = (a, b, extra = 0) =>
    Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + extra;

  // Paredes: el jugador puede cruzar un hueco de puerta solo si está abierta.
  function clampPlayer(p, room) {
    const r = p.r;
    const minX = WALL + r, maxX = W - WALL - r, minY = WALL + r, maxY = H - WALL - r;
    const open = room.cleared;
    const dw = DOOR / 2 - r + 2;
    const inCol = Math.abs(p.x - W / 2) <= dw;
    const inRow = Math.abs(p.y - H / 2) <= dw;
    if (p.y < minY) {
      if (open && room.doors.N && inCol) p.x = clamp(p.x, W / 2 - dw, W / 2 + dw); else p.y = minY;
    }
    if (p.y > maxY) {
      if (open && room.doors.S && inCol) p.x = clamp(p.x, W / 2 - dw, W / 2 + dw); else p.y = maxY;
    }
    if (p.x < minX) {
      if (open && room.doors.W && inRow) p.y = clamp(p.y, H / 2 - dw, H / 2 + dw); else p.x = minX;
    }
    if (p.x > maxX) {
      if (open && room.doors.E && inRow) p.y = clamp(p.y, H / 2 - dw, H / 2 + dw); else p.x = maxX;
    }
  }
  function clampInside(e) {
    e.x = clamp(e.x, WALL + e.r, W - WALL - e.r);
    e.y = clamp(e.y, WALL + e.r, H - WALL - e.r);
  }

  // ----------------------------------------------------------- Generación de piso
  const DIRS = [
    { k: 'N', dx: 0, dy: -1, opp: 'S' },
    { k: 'S', dx: 0, dy: 1, opp: 'N' },
    { k: 'E', dx: 1, dy: 0, opp: 'W' },
    { k: 'W', dx: -1, dy: 0, opp: 'E' },
  ];

  function makeRocks() {
    const rocks = [];
    const n = randi(0, 4);
    let tries = 0;
    while (rocks.length < n && tries++ < 40) {
      const cx = rand(WALL + 36, W - WALL - 36);
      const cy = rand(WALL + 36, H - WALL - 36);
      // Mantener libres los pasillos centrales y las entradas
      if (Math.abs(cx - W / 2) < 110 || Math.abs(cy - H / 2) < 70) continue;
      if (rocks.some(r => Math.hypot(r.x + 18 - cx, r.y + 18 - cy) < 56)) continue;
      rocks.push({ x: cx - 18, y: cy - 18, w: 36, h: 36 });
    }
    return rocks;
  }

  function genFloor(n) {
    const G = 5;
    const key = (x, y) => x + ',' + y;
    let rooms, grid;
    do {
      grid = {};
      rooms = [];
      const add = (x, y) => {
        const r = {
          gx: x, gy: y, type: 'normal', cleared: false, visited: false, spawned: false,
          doors: { N: false, S: false, E: false, W: false },
          rocks: [], enemies: [], pickups: [], dist: 0,
        };
        grid[key(x, y)] = r;
        rooms.push(r);
        return r;
      };
      add(2, 2).type = 'start';
      const target = Math.min(5 + n + randi(0, 2), 11);
      let guard = 0;
      while (rooms.length < target && guard++ < 600) {
        const base = rooms[randi(0, rooms.length - 1)];
        const d = DIRS[randi(0, 3)];
        const nx = base.gx + d.dx, ny = base.gy + d.dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= G || grid[key(nx, ny)]) continue;
        let nb = 0;
        for (const dd of DIRS) if (grid[key(nx + dd.dx, ny + dd.dy)]) nb++;
        if (nb > 1) continue; // estructura de árbol: sin bucles
        const r = add(nx, ny);
        base.doors[d.k] = true;
        r.doors[d.opp] = true;
      }
    } while (rooms.length < 4);

    // Distancias BFS desde el inicio
    const start = rooms[0];
    const queue = [start];
    const seen = new Set([start]);
    while (queue.length) {
      const cur = queue.shift();
      for (const d of DIRS) {
        if (!cur.doors[d.k]) continue;
        const nx = grid[key(cur.gx + d.dx, cur.gy + d.dy)];
        if (nx && !seen.has(nx)) { nx.dist = cur.dist + 1; seen.add(nx); queue.push(nx); }
      }
    }
    const doorCount = (r) => Object.values(r.doors).filter(Boolean).length;
    const leaves = rooms.filter(r => r !== start && doorCount(r) === 1);
    const boss = leaves.reduce((a, b) => (b.dist > a.dist ? b : a), leaves[0]);
    boss.type = 'boss';
    const itemCands = leaves.filter(r => r !== boss);
    const pool = itemCands.length ? itemCands : rooms.filter(r => r !== start && r !== boss);
    const itemRoom = pool[randi(0, pool.length - 1)];
    itemRoom.type = 'item';

    for (const r of rooms) {
      if (r.type === 'normal') r.rocks = makeRocks();
      if (r.type === 'start' || r.type === 'item') r.cleared = true;
    }
    itemRoom.pickups.push({ type: 'item', item: randomItem(), x: W / 2, y: H / 2, r: 14 });

    game.floor = n;
    game.map = { grid, rooms, key };
    game.room = start;
    start.visited = true;
    game.tears.length = 0;
    game.eTears.length = 0;
    game.player.x = W / 2;
    game.player.y = H / 2;
    if (save.bestFloor < n) { save.bestFloor = n; writeSave(); }
    game.banner = { text: 'PISO ' + n, sub: '', t: 2.2 };
  }

  // -------------------------------------------------------------------- Partida
  function newGame() {
    game = {
      floor: 1, runKills: 0, time: 0, shake: 0,
      tears: [], eTears: [], map: null, room: null,
      banner: { text: '', sub: '', t: 0 },
      player: {
        x: W / 2, y: H / 2, r: 12, hp: 3, maxHp: 3, speed: 150,
        fireDelay: 0.38, dmg: 1, cool: 0, inv: 0, fx: 0, fy: 1, vx: 0, vy: 0,
      },
    };
    genFloor(1);
  }

  function startGame() {
    releaseStick(sticks.move); releaseStick(sticks.aim);
    newGame();
    state = 'playing';
  }

  function endGame() {
    state = 'gameover';
    goT = 0;
    releaseStick(sticks.move); releaseStick(sticks.aim);
    writeSave();
  }

  // ------------------------------------------------------------------- Enemigos
  function makeEnemy(type, x, y, floor) {
    const f = floor - 1;
    if (type === 'chaser') {
      const hp = 3 + Math.floor(f * 0.7);
      return { type, x, y, r: 12, hp, maxHp: hp, speed: Math.min(70 + f * 6, 110), t: 0, flash: 0, spawnT: 0.7 };
    }
    if (type === 'shooter') {
      const hp = 3 + Math.floor(f * 0.7);
      return { type, x, y, r: 12, hp, maxHp: hp, speed: 42, t: rand(0.8, 1.8), flash: 0, spawnT: 0.7,
               wx: 0, wy: 0, wt: 0 };
    }
    const hp = 40 + 15 * f;
    return { type: 'boss', x, y, r: 34, hp, maxHp: hp, speed: 38, t: 1.5, flash: 0, spawnT: 1.0, pat: -1, rot: 0 };
  }

  function findSpawn(room, r) {
    for (let i = 0; i < 60; i++) {
      const x = rand(WALL + 40, W - WALL - 40);
      const y = rand(WALL + 40, H - WALL - 40);
      const c = { x, y, r: r + 4 };
      if (Math.hypot(x - game.player.x, y - game.player.y) < 170) continue;
      if (room.rocks.some(rc => circleHitsRect(x, y, r + 8, rc))) continue;
      if (room.enemies.some(e => Math.hypot(e.x - x, e.y - y) < 40)) continue;
      return c;
    }
    return { x: W / 2, y: H / 2 - 100, r };
  }

  function spawnEnemies(room) {
    room.spawned = true;
    const n = game.floor;
    if (room.type === 'boss') {
      room.enemies.push(makeEnemy('boss', W / 2, H / 2 - 60, n));
      return;
    }
    const count = Math.min(2 + randi(0, 2) + Math.floor(n * 0.8), 8);
    for (let i = 0; i < count; i++) {
      const type = Math.random() < 0.5 ? 'chaser' : 'shooter';
      const pos = findSpawn(room, 12);
      room.enemies.push(makeEnemy(type, pos.x, pos.y, n));
    }
  }

  function fireEnemyTear(x, y, ang, speed, r = 5) {
    game.eTears.push({ x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r, life: 4 });
  }

  function hurtPlayer(amount) {
    const p = game.player;
    if (p.inv > 0) return;
    p.hp -= amount;
    p.inv = 1.2;
    game.shake = 0.25;
    if (p.hp <= 0) { p.hp = 0; endGame(); }
  }

  function killEnemy(room, e, countKill) {
    if (countKill) {
      game.runKills++;
      save.totalKills++;
      writeSave();
    }
    if (e.type === 'boss') {
      room.enemies.length = 0;
      game.eTears.length = 0;
      room.cleared = true;
      room.pickups.push({ type: 'trap', x: W / 2, y: H / 2 + 20, r: 26 });
      room.pickups.push({ type: 'item', item: randomItem(), x: W / 2 - 100, y: H / 2 + 20, r: 14 });
      room.pickups.push({ type: 'heart', x: W / 2 + 100, y: H / 2 + 20, r: 10 });
      game.banner = { text: 'JEFE DERROTADO', sub: 'Baja por la trampilla para seguir', t: 3 };
      game.shake = 0.5;
    }
  }

  // ------------------------------------------------------------- Cambio de sala
  function changeRoom(dirKey) {
    const d = DIRS.find(x => x.k === dirKey);
    const next = game.map.grid[game.map.key(game.room.gx + d.dx, game.room.gy + d.dy)];
    if (!next) return;
    const p = game.player;
    game.room = next;
    next.visited = true;
    game.tears.length = 0;
    game.eTears.length = 0;
    const inset = WALL + p.r + 6;
    if (dirKey === 'N') { p.x = W / 2; p.y = H - inset; }
    if (dirKey === 'S') { p.x = W / 2; p.y = inset; }
    if (dirKey === 'E') { p.x = inset; p.y = H / 2; }
    if (dirKey === 'W') { p.x = W - inset; p.y = H / 2; }
    p.inv = Math.max(p.inv, 0.4);
    if (!next.cleared && !next.spawned) spawnEnemies(next);
    if (next.type === 'boss' && !next.cleared) game.banner = { text: 'JEFE', sub: '', t: 1.6 };
  }

  function nextFloor() {
    const p = game.player;
    p.hp = Math.min(p.maxHp, p.hp + 1);
    genFloor(game.floor + 1);
  }

  // -------------------------------------------------------------------- Update
  function updatePlaying(dt) {
    const g = game, p = g.player, room = g.room;
    g.time += dt;
    if (g.banner.t > 0) g.banner.t -= dt;
    if (g.shake > 0) g.shake -= dt;
    if (p.inv > 0) p.inv -= dt;

    // --- Jugador: movimiento
    const mv = getMoveVector();
    p.vx = mv.x * p.speed;
    p.vy = mv.y * p.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    for (const rc of room.rocks) pushOutRect(p, rc);
    clampPlayer(p, room);

    // --- Jugador: disparo
    const aim = getAimVector();
    if (aim.x || aim.y) { p.fx = aim.x; p.fy = aim.y; }
    else if (mv.x || mv.y) { p.fx = mv.x; p.fy = mv.y; }
    p.cool -= dt;
    if ((aim.x || aim.y) && p.cool <= 0) {
      g.tears.push({
        x: p.x + aim.x * p.r, y: p.y + aim.y * p.r,
        vx: aim.x * TEAR_SPEED + p.vx * 0.35, vy: aim.y * TEAR_SPEED + p.vy * 0.35,
        r: 4 + Math.min(p.dmg, 6) * 0.9, life: 0.95, dmg: p.dmg,
      });
      p.cool = p.fireDelay;
    }

    // --- Enemigos
    const enemies = room.enemies;
    for (const e of enemies) {
      if (e.spawnT > 0) { e.spawnT -= dt; continue; }
      if (e.flash > 0) e.flash -= dt;
      const toP = Math.atan2(p.y - e.y, p.x - e.x);

      if (e.type === 'chaser') {
        e.x += Math.cos(toP) * e.speed * dt;
        e.y += Math.sin(toP) * e.speed * dt;
      } else if (e.type === 'shooter') {
        e.wt -= dt;
        if (e.wt <= 0) { const a = rand(0, Math.PI * 2); e.wx = Math.cos(a); e.wy = Math.sin(a); e.wt = rand(0.7, 1.6); }
        const d = dist(e, p);
        let dx = e.wx, dy = e.wy;
        if (d < 150) { dx = -Math.cos(toP); dy = -Math.sin(toP); }
        e.x += dx * e.speed * dt;
        e.y += dy * e.speed * dt;
        e.t -= dt;
        if (e.t <= 0) {
          fireEnemyTear(e.x, e.y, toP + rand(-0.15, 0.15), 150 + game.floor * 5);
          e.t = rand(1.4, 2.4);
        }
      } else { // jefe
        e.x += Math.cos(toP) * e.speed * dt;
        e.y += Math.sin(toP) * e.speed * dt;
        e.t -= dt;
        if (e.t <= 0) {
          const rage = e.hp < e.maxHp * 0.5;
          e.pat = (e.pat + 1) % 3;
          if (e.pat === 0) {
            const n = rage ? 16 : 12;
            e.rot += 0.3;
            for (let i = 0; i < n; i++) fireEnemyTear(e.x, e.y, e.rot + i * Math.PI * 2 / n, 130, 6);
          } else if (e.pat === 1) {
            const n = rage ? 5 : 3;
            for (let i = 0; i < n; i++) fireEnemyTear(e.x, e.y, toP + (i - (n - 1) / 2) * 0.28, 190, 6);
          } else if (enemies.length < 4) {
            const m = makeEnemy('chaser', e.x + rand(-40, 40), e.y + rand(-40, 40), game.floor);
            m.spawnT = 0.5;
            enemies.push(m);
          } else {
            for (let i = 0; i < 10; i++) fireEnemyTear(e.x, e.y, i * Math.PI * 2 / 10, 150, 6);
          }
          e.t = rage ? 1.4 : 2.0;
        }
      }

      // Colisiones del enemigo con rocas, paredes y otros enemigos
      for (const rc of room.rocks) pushOutRect(e, rc);
      clampInside(e);
      for (const o of enemies) {
        if (o === e || o.spawnT > 0) continue;
        const d = dist(e, o), min = e.r + o.r;
        if (d > 0.01 && d < min) {
          const push = (min - d) / 2;
          e.x += (e.x - o.x) / d * push; e.y += (e.y - o.y) / d * push;
          o.x -= (e.x - o.x) / d * push; o.y -= (e.y - o.y) / d * push;
        }
      }

      // Daño por contacto
      if (circlesHit(e, p, -3)) hurtPlayer(1);
    }
    if (state !== 'playing') return;

    // --- Lágrimas del jugador
    const tears = g.tears;
    for (let i = tears.length - 1; i >= 0; i--) {
      const t = tears[i];
      t.x += t.vx * dt; t.y += t.vy * dt; t.life -= dt;
      let dead = t.life <= 0 ||
        t.x < WALL || t.x > W - WALL || t.y < WALL || t.y > H - WALL ||
        room.rocks.some(rc => circleHitsRect(t.x, t.y, t.r, rc));
      if (!dead) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (e.spawnT > 0) continue;
          if (circlesHit(t, e)) {
            e.hp -= t.dmg;
            e.flash = 0.1;
            dead = true;
            if (e.hp <= 0) {
              const wasBoss = e.type === 'boss';
              enemies.splice(j, 1);
              killEnemy(room, e, true);
              if (!wasBoss && enemies.length === 0) onRoomCleared(room, e);
            }
            break;
          }
        }
      }
      if (dead) tears.splice(i, 1);
    }

    // --- Lágrimas enemigas
    const et = g.eTears;
    for (let i = et.length - 1; i >= 0; i--) {
      const t = et[i];
      t.x += t.vx * dt; t.y += t.vy * dt; t.life -= dt;
      let dead = t.life <= 0 ||
        t.x < WALL || t.x > W - WALL || t.y < WALL || t.y > H - WALL ||
        room.rocks.some(rc => circleHitsRect(t.x, t.y, t.r, rc));
      if (!dead && circlesHit(t, p)) {
        hurtPlayer(1);
        dead = true;
        if (state !== 'playing') return;
      }
      if (dead) et.splice(i, 1);
    }

    // --- Pickups
    for (let i = room.pickups.length - 1; i >= 0; i--) {
      const k = room.pickups[i];
      if (!circlesHit(p, k, 2)) continue;
      if (k.type === 'heart') {
        if (p.hp < p.maxHp) { p.hp++; room.pickups.splice(i, 1); }
      } else if (k.type === 'item') {
        k.item.apply(p);
        g.banner = { text: k.item.name, sub: k.item.desc, t: 2.6 };
        room.pickups.splice(i, 1);
      } else if (k.type === 'trap') {
        nextFloor();
        return;
      }
    }

    // --- Cruce de puertas
    if (room.cleared) {
      if (p.y < 8 && room.doors.N) changeRoom('N');
      else if (p.y > H - 8 && room.doors.S) changeRoom('S');
      else if (p.x < 8 && room.doors.W) changeRoom('W');
      else if (p.x > W - 8 && room.doors.E) changeRoom('E');
    }
  }

  function onRoomCleared(room, lastEnemy) {
    room.cleared = true;
    if (Math.random() < 0.3) {
      room.pickups.push({
        type: 'heart',
        x: clamp(lastEnemy.x, WALL + 30, W - WALL - 30),
        y: clamp(lastEnemy.y, WALL + 30, H - WALL - 30),
        r: 10,
      });
    }
  }

  // ---------------------------------------------------------------------- UI taps
  const BTN_RESTART = { x: W / 2 - 160, y: 318, w: 150, h: 46, label: 'Reiniciar' };
  const BTN_MENU = { x: W / 2 + 10, y: 318, w: 150, h: 46, label: 'Menú' };
  const inRect = (pt, r) => pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h;

  function uiTap(px, py) {
    if (state === 'menu') { startGame(); return; }
    if (state === 'gameover' && goT > 0.4) {
      const pt = toLogical(px, py);
      if (inRect(pt, BTN_RESTART)) startGame();
      else if (inRect(pt, BTN_MENU)) { state = 'menu'; menuT = 0; }
    }
  }

  // ------------------------------------------------------------------- Dibujo
  const C = {
    wall: '#3a2a2a', wallEdge: '#241818', floor: '#5b4439', floorDark: '#523d33',
    doorOpen: '#120c0a', doorClosed: '#7b3a2c', rock: '#7a7a82', rockLight: '#9a9aa4',
  };

  function heartPath(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.38);
    ctx.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.5, y - s * 0.6, x, y - s * 0.2);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 0.6, x + s * 0.75, y - s * 0.05, x, y + s * 0.38);
    ctx.closePath();
  }

  function drawRoom(room) {
    ctx.fillStyle = C.wall;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.floor;
    ctx.fillRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
    // patrón de baldosas sutil
    ctx.fillStyle = C.floorDark;
    for (let x = WALL; x < W - WALL; x += 44) {
      for (let y = WALL; y < H - WALL; y += 44) {
        if (((x - WALL) / 44 + (y - WALL) / 44) % 2 === 0) {
          ctx.fillRect(x, y, Math.min(44, W - WALL - x), Math.min(44, H - WALL - y));
        }
      }
    }
    ctx.strokeStyle = C.wallEdge;
    ctx.lineWidth = 4;
    ctx.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);

    // puertas
    const open = room.cleared;
    const doorRect = {
      N: [W / 2 - DOOR / 2, 0, DOOR, WALL],
      S: [W / 2 - DOOR / 2, H - WALL, DOOR, WALL],
      W: [0, H / 2 - DOOR / 2, WALL, DOOR],
      E: [W - WALL, H / 2 - DOOR / 2, WALL, DOOR],
    };
    for (const k of ['N', 'S', 'W', 'E']) {
      if (!room.doors[k]) continue;
      const [x, y, w, h] = doorRect[k];
      ctx.fillStyle = open ? C.doorOpen : C.doorClosed;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = open ? '#6b5348' : '#3d1a12';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      if (!open) {
        ctx.strokeStyle = '#2a110b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const horiz = (k === 'N' || k === 'S');
        for (let i = 1; i < 4; i++) {
          if (horiz) { ctx.moveTo(x + w * i / 4, y); ctx.lineTo(x + w * i / 4, y + h); }
          else { ctx.moveTo(x, y + h * i / 4); ctx.lineTo(x + w, y + h * i / 4); }
        }
        ctx.stroke();
      }
    }

    // rocas
    for (const rc of room.rocks) {
      ctx.fillStyle = C.rock;
      ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
      ctx.fillStyle = C.rockLight;
      ctx.fillRect(rc.x, rc.y, rc.w, 6);
      ctx.fillRect(rc.x, rc.y, 6, rc.h);
      ctx.strokeStyle = '#3d3d44';
      ctx.lineWidth = 2;
      ctx.strokeRect(rc.x, rc.y, rc.w, rc.h);
    }
  }

  function drawPickup(k, time) {
    const bob = Math.sin(time * 4 + k.x) * 2;
    if (k.type === 'heart') {
      ctx.fillStyle = '#e8384f';
      heartPath(k.x, k.y + bob, 24);
      ctx.fill();
      ctx.strokeStyle = '#6e0f1c'; ctx.lineWidth = 2; ctx.stroke();
    } else if (k.type === 'item') {
      ctx.fillStyle = '#4a4a52';
      ctx.fillRect(k.x - 20, k.y + 8, 40, 12);
      ctx.fillStyle = '#6a6a74';
      ctx.fillRect(k.x - 20, k.y + 8, 40, 4);
      ctx.save();
      ctx.translate(k.x, k.y - 4 + bob);
      ctx.fillStyle = k.item.color;
      ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.strokeRect(-14, -14, 28, 28);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(k.item.glyph, 0, 1);
      ctx.restore();
    } else if (k.type === 'trap') {
      ctx.fillStyle = '#050303';
      ctx.beginPath(); ctx.ellipse(k.x, k.y, 28, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8a6a4a'; ctx.lineWidth = 4; ctx.stroke();
      ctx.fillStyle = '#e8d9c0';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('SIGUIENTE PISO', k.x, k.y + 36);
    }
  }

  function drawEyes(x, y, dx, dy, r, white = '#fff') {
    const ex = -dy, ey = dx; // perpendicular
    for (const s of [-1, 1]) {
      const cx = x + dx * r * 0.35 + ex * s * r * 0.4;
      const cy = y + dy * r * 0.35 + ey * s * r * 0.4;
      ctx.fillStyle = white;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(cx + dx * r * 0.1, cy + dy * r * 0.1, r * 0.14, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawEnemy(e) {
    ctx.save();
    if (e.spawnT > 0) ctx.globalAlpha = 0.35 + 0.25 * Math.sin(e.spawnT * 30);
    const flash = e.flash > 0;
    const p = game.player;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    const dx = Math.cos(a), dy = Math.sin(a);
    if (e.type === 'chaser') {
      ctx.fillStyle = flash ? '#fff' : '#c4362f';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5c120e'; ctx.lineWidth = 2; ctx.stroke();
      drawEyes(e.x, e.y, dx, dy, e.r, '#ffe');
    } else if (e.type === 'shooter') {
      ctx.fillStyle = flash ? '#fff' : '#7d3fb8';
      ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
      ctx.strokeStyle = '#341857'; ctx.lineWidth = 2;
      ctx.strokeRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
      drawEyes(e.x, e.y, dx, dy, e.r, '#fe9');
    } else {
      ctx.fillStyle = flash ? '#fff' : '#8c1f2a';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a0a10'; ctx.lineWidth = 4; ctx.stroke();
      // corona
      ctx.fillStyle = '#e8c33a';
      ctx.beginPath();
      ctx.moveTo(e.x - 20, e.y - e.r + 2);
      ctx.lineTo(e.x - 20, e.y - e.r - 14);
      ctx.lineTo(e.x - 10, e.y - e.r - 5);
      ctx.lineTo(e.x, e.y - e.r - 16);
      ctx.lineTo(e.x + 10, e.y - e.r - 5);
      ctx.lineTo(e.x + 20, e.y - e.r - 14);
      ctx.lineTo(e.x + 20, e.y - e.r + 2);
      ctx.closePath(); ctx.fill();
      drawEyes(e.x, e.y, dx, dy, e.r, '#ffd');
    }
    ctx.restore();
  }

  function drawPlayer(p) {
    if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#f3d6b8';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a4f'; ctx.lineWidth = 2; ctx.stroke();
    drawEyes(p.x, p.y, p.fx, p.fy, p.r, '#fff');
    ctx.fillStyle = 'rgba(80,160,255,0.9)'; // lágrimas en las mejillas
    ctx.beginPath(); ctx.arc(p.x - p.fy * p.r * 0.55 + p.fx * p.r * 0.1, p.y + p.fx * p.r * 0.55 + p.fy * p.r * 0.1 + 4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    const g = game, p = g.player;
    // corazones
    for (let i = 0; i < p.maxHp; i++) {
      const x = 22 + i * 26, y = 22;
      heartPath(x, y, 22);
      if (i < p.hp) { ctx.fillStyle = '#e8384f'; ctx.fill(); }
      else { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); }
      ctx.strokeStyle = '#1a0608'; ctx.lineWidth = 2; ctx.stroke();
    }
    // textos
    ctx.fillStyle = '#f2e6d8';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('Piso ' + g.floor, W - 76, 16);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#d9c8b4';
    ctx.fillText('Derrotados: ' + g.runKills, W - 76, 32);

    // minimapa
    const cw = 10, ch = 7, gap = 1, x0 = W - 66, y0 = 3;
    const grid = g.map.grid, key = g.map.key;
    for (const r of g.map.rooms) {
      let known = r.visited;
      if (!known) {
        for (const d of DIRS) {
          const nb = r.doors[d.k] && grid[key(r.gx + d.dx, r.gy + d.dy)];
          if (nb && nb.visited) known = true;
        }
      }
      if (!known) continue;
      const x = x0 + r.gx * (cw + gap), y = y0 + r.gy * (ch + gap);
      ctx.fillStyle = r === g.room ? '#ffffff' : r.visited ? '#b9a89a' : '#6a5a50';
      ctx.fillRect(x, y, cw, ch);
      if (r.type === 'boss') { ctx.fillStyle = '#e03a3a'; ctx.fillRect(x + 3, y + 2, 4, 3); }
      else if (r.type === 'item') { ctx.fillStyle = '#e8c33a'; ctx.fillRect(x + 3, y + 2, 4, 3); }
    }

    // barra del jefe
    const boss = g.room.enemies.find(e => e.type === 'boss');
    if (boss) {
      const bw = 300, bx = W / 2 - bw / 2, by = H - WALL + 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 14);
      ctx.fillStyle = '#c4362f'; ctx.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 10);
    }

    // aviso central
    if (g.banner.t > 0) {
      ctx.globalAlpha = clamp(g.banner.t / 0.6, 0, 1);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(g.banner.text, W / 2, 110);
      ctx.fillStyle = '#fff3d6';
      ctx.fillText(g.banner.text, W / 2, 110);
      if (g.banner.sub) {
        ctx.font = '16px system-ui, sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeText(g.banner.sub, W / 2, 138);
        ctx.fillText(g.banner.sub, W / 2, 138);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawWorld() {
    const g = game, room = g.room;
    drawRoom(room);
    for (const k of room.pickups) drawPickup(k, g.time);
    for (const e of room.enemies) drawEnemy(e);
    drawPlayer(g.player);
    ctx.fillStyle = '#7fc4ff';
    for (const t of g.tears) {
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1d4f80'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (const t of g.eTears) {
      ctx.fillStyle = '#e04a6a';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a1020'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    drawHud();
  }

  function drawButton(b, color) {
    ctx.fillStyle = color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }

  function drawMenu() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1b1014'); grad.addColorStop(1, '#3a2024');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.lineWidth = 8; ctx.strokeStyle = '#000';
    ctx.strokeText('LÁGRIMAS', W / 2, 120);
    ctx.fillStyle = '#7fc4ff';
    ctx.fillText('LÁGRIMAS', W / 2, 120);
    // lágrima decorativa
    ctx.fillStyle = '#7fc4ff';
    ctx.beginPath(); ctx.arc(W / 2, 190 + Math.sin(menuT * 3) * 4, 9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(menuT * 4);
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('Tocar para Jugar', W / 2, 270);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#d9c8b4';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Récord de piso: ' + save.bestFloor + '   ·   Enemigos derrotados: ' + save.totalKills, W / 2, 335);
    ctx.fillStyle = '#9d8c7c';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Izquierda: moverse   ·   Derecha: disparar', W / 2, 375);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(10,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.fillStyle = '#e8384f';
    ctx.fillText('GAME OVER', W / 2, 100);
    ctx.fillStyle = '#f2e6d8';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Llegaste al piso ' + game.floor + '  ·  Derrotados en la partida: ' + game.runKills, W / 2, 170);
    ctx.fillText('Récord de piso: ' + save.bestFloor, W / 2, 205);
    ctx.fillText('Total de enemigos derrotados: ' + save.totalKills, W / 2, 240);
    drawButton(BTN_RESTART, '#a02a36');
    drawButton(BTN_MENU, '#3a4a6a');
  }

  // Joysticks virtuales superpuestos (50% de opacidad), en coordenadas de pantalla
  function drawSticks() {
    const R = stickRadius();
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (const which of ['move', 'aim']) {
      const s = sticks[which];
      const home = stickHome(which);
      const active = s.id !== null;
      const bx = active ? s.ox : home.x, by = active ? s.oy : home.y;
      let kx = bx, ky = by;
      if (active) {
        const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy);
        const k = l > R ? R / l : 1;
        kx = bx + dx * k; ky = by + dy * k;
      }
      const tint = which === 'move' ? '120,170,255' : '255,140,140';
      ctx.fillStyle = 'rgba(' + tint + ',0.35)';
      ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(kx, ky, R * 0.42, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, sw, sh);
    ctx.save();
    let shx = 0, shy = 0;
    if (game && game.shake > 0 && state === 'playing') {
      shx = rand(-3, 3) * (game.shake * 4); shy = rand(-3, 3) * (game.shake * 4);
    }
    ctx.translate(offX + shx * scale, offY + shy * scale);
    ctx.scale(scale, scale);
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    if (state === 'menu') drawMenu();
    else {
      drawWorld();
      if (state === 'gameover') drawGameOver();
    }
    ctx.restore();
    if (state === 'playing') drawSticks();
  }

  // ----------------------------------------------------------------- Bucle
  let last = performance.now();
  function frame(ts) {
    const dt = Math.min((ts - last) / 1000, 0.05);
    last = ts;
    if (state === 'menu') menuT += dt;
    else if (state === 'gameover') goT += dt;
    else updatePlaying(dt);
    render();
    requestAnimationFrame(frame);
  }

  loadSave();
  requestAnimationFrame(frame);

  // Hook de depuración para pruebas automáticas (inofensivo en producción)
  window.__lagrimas = {
    get state() { return state; },
    get game() { return game; },
    get save() { return save; },
    sticks,
  };
})();
