/* ==========================================================================
   LÁGRIMAS — Roguelite twin-stick 2D top-down (Canvas + JS vanilla)
   Resolución lógica 800x450 escalada a cualquier pantalla (landscape).

   v2: moscas, arañas, pooters, hosts que se acercan y disparan a distancia,
   objetos que modifican las lágrimas (Ipecac, triple disparo, ...),
   pickups (monedas, bombas, llaves), sala del tesoro (llave), tienda (monedas)
   y salas secretas (bomba).
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
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randi(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

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
  // Botón táctil de bomba (encima del joystick derecho)
  function bombButton() {
    const R = stickRadius();
    return { x: sw - R * 1.15, y: sh - R * 4.0, r: R * 0.5 };
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
    const b = bombButton();
    if (Math.hypot(e.clientX - b.x, e.clientY - b.y) <= b.r * 1.15) { placeBomb(); return; }
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
    if ((e.code === 'KeyE' || e.code === 'KeyB') && !e.repeat && state === 'playing') placeBomb();
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
    { id: 'onion',   name: 'Cebolla Triste',      desc: 'Lágrimas más rápidas',          color: '#d8d0b0', glyph: 'O',
      apply: (p) => { p.fireDelay = Math.max(0.1, p.fireDelay * 0.78); } },
    { id: 'cricket', name: 'Cabeza de Grillo',    desc: '+Daño',                         color: '#d93a3a', glyph: 'G',
      apply: (p) => { p.dmg += 1; } },
    { id: 'boots',   name: 'Botas Veloces',       desc: '+Velocidad',                    color: '#3aa0d9', glyph: 'V',
      apply: (p) => { p.speed += 30; } },
    { id: 'heart',   name: 'Corazón Contenedor',  desc: '+1 corazón máximo',             color: '#d93a8c', glyph: '+',
      apply: (p) => { p.maxHp = Math.min(10, p.maxHp + 1); p.hp = Math.min(p.maxHp, p.hp + 1); } },
    { id: 'inner',   name: 'Ojo Interior',        desc: 'Triple disparo',                color: '#8a5ad9', glyph: '3',
      apply: (p) => { p.shots += 2; } },
    { id: '2020',    name: '20/20',               desc: 'Disparo doble',                 color: '#d9a03a', glyph: '2',
      apply: (p) => { p.shots += 1; } },
    { id: 'ipecac',  name: 'Ipecacuana',          desc: 'Lágrimas explosivas y venenosas', color: '#8a9a2a', glyph: 'I',
      apply: (p) => { p.ipecac = true; p.dmg += 0.5; } },
    { id: 'spoon',   name: 'Cuchara Torcida',     desc: 'Lágrimas teledirigidas',        color: '#d96ac0', glyph: 'C',
      apply: (p) => { p.homing = true; } },
    { id: 'cupid',   name: 'Flecha de Cupido',    desc: 'Lágrimas perforantes',          color: '#f06a8a', glyph: 'F',
      apply: (p) => { p.pierce = true; } },
    { id: 'rubber',  name: 'Cemento de Goma',     desc: 'Lágrimas rebotantes',           color: '#4ad0d0', glyph: 'R',
      apply: (p) => { p.bounce = true; } },
    { id: 'scorpio', name: 'Escorpio',            desc: 'Lágrimas venenosas',            color: '#5ab04a', glyph: 'E',
      apply: (p) => { p.poison = true; } },
    { id: 'ouija',   name: 'Tabla Ouija',         desc: 'Lágrimas espectrales',          color: '#b8b8e8', glyph: 'T',
      apply: (p) => { p.spectral = true; } },
  ];
  const STAT_ITEM_IDS = ['onion', 'cricket', 'boots', 'heart'];

  function takeItem() {
    if (!game.pool.length) {
      game.pool = shuffle(ITEMS.filter(i => STAT_ITEM_IDS.includes(i.id)));
    }
    return game.pool.pop();
  }

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

  const DIRS = [
    { k: 'N', dx: 0, dy: -1, opp: 'S' },
    { k: 'S', dx: 0, dy: 1, opp: 'N' },
    { k: 'E', dx: 1, dy: 0, opp: 'W' },
    { k: 'W', dx: -1, dy: 0, opp: 'E' },
  ];
  const doorCenter = (k) => ({
    N: { x: W / 2, y: 0 }, S: { x: W / 2, y: H }, W: { x: 0, y: H / 2 }, E: { x: W, y: H / 2 },
  }[k]);

  // Una puerta se puede cruzar si la sala está limpia, existe y no tiene cerradura.
  const doorOpen = (room, k) => room.cleared && room.doors[k] && !room.locks[k];

  // Paredes: el jugador puede cruzar un hueco de puerta solo si está abierta.
  function clampPlayer(p, room) {
    const r = p.r;
    const minX = WALL + r, maxX = W - WALL - r, minY = WALL + r, maxY = H - WALL - r;
    const dw = DOOR / 2 - r + 2;
    const inCol = Math.abs(p.x - W / 2) <= dw;
    const inRow = Math.abs(p.y - H / 2) <= dw;
    if (p.y < minY) {
      if (doorOpen(room, 'N') && inCol) p.x = clamp(p.x, W / 2 - dw, W / 2 + dw); else p.y = minY;
    }
    if (p.y > maxY) {
      if (doorOpen(room, 'S') && inCol) p.x = clamp(p.x, W / 2 - dw, W / 2 + dw); else p.y = maxY;
    }
    if (p.x < minX) {
      if (doorOpen(room, 'W') && inRow) p.y = clamp(p.y, H / 2 - dw, H / 2 + dw); else p.x = minX;
    }
    if (p.x > maxX) {
      if (doorOpen(room, 'E') && inRow) p.y = clamp(p.y, H / 2 - dw, H / 2 + dw); else p.x = maxX;
    }
  }
  function clampInside(e) {
    e.x = clamp(e.x, WALL + e.r, W - WALL - e.r);
    e.y = clamp(e.y, WALL + e.r, H - WALL - e.r);
  }

  // ----------------------------------------------------------- Generación de piso
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

  function randomFreePos(room, margin = 50) {
    for (let i = 0; i < 40; i++) {
      const x = rand(WALL + margin, W - WALL - margin);
      const y = rand(WALL + margin, H - WALL - margin);
      if (room.rocks.some(rc => circleHitsRect(x, y, 16, rc))) continue;
      if (room.pickups.some(k => Math.hypot(k.x - x, k.y - y) < 36)) continue;
      return { x, y };
    }
    return { x: W / 2, y: H / 2 };
  }

  function genFloor(n) {
    const G = 5;
    const key = (x, y) => x + ',' + y;
    let rooms, grid, boss, treasure, shop, secret;

    for (;;) {
      grid = {};
      rooms = [];
      const add = (x, y, type) => {
        const r = {
          gx: x, gy: y, type, cleared: false, visited: false, spawned: false, revealed: true,
          doors: { N: false, S: false, E: false, W: false },
          locks: { N: false, S: false, E: false, W: false },     // puertas con llave
          secret: { N: null, S: null, E: null, W: null },        // paredes con sala secreta
          rocks: [], enemies: [], pickups: [], dist: 0,
        };
        grid[key(x, y)] = r;
        rooms.push(r);
        return r;
      };
      add(2, 2, 'start');
      const target = Math.min(7 + (n - 1) + randi(0, 2), 12);
      let guard = 0;
      while (rooms.length < target && guard++ < 800) {
        const base = rooms[randi(0, rooms.length - 1)];
        const d = DIRS[randi(0, 3)];
        const nx = base.gx + d.dx, ny = base.gy + d.dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= G || grid[key(nx, ny)]) continue;
        let nb = 0;
        for (const dd of DIRS) if (grid[key(nx + dd.dx, ny + dd.dy)]) nb++;
        if (nb > 1) continue; // estructura de árbol: sin bucles
        const r = add(nx, ny, 'normal');
        base.doors[d.k] = true;
        r.doors[d.opp] = true;
      }
      if (rooms.length < 6) continue;

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
      if (leaves.length < 2) continue;

      // Jefe: hoja más lejana. Tesoro: otra hoja (cerrada con llave).
      boss = leaves.reduce((a, b) => (b.dist > a.dist ? b : a), leaves[0]);
      const rest = shuffle(leaves.filter(r => r !== boss));
      treasure = rest.pop();
      // Tienda: otra hoja si hay; si no, cualquier sala normal.
      shop = rest.length ? rest.pop()
        : shuffle(rooms.filter(r => r !== start && r !== boss && r !== treasure))[0];
      if (!shop) continue;
      boss.type = 'boss';
      treasure.type = 'treasure';
      shop.type = 'shop';

      // Sala secreta: celda vacía contigua a las salas normales/inicial con más vecinos.
      // Condición: cuantas más salas la rodean, más probable es que esté ahí (como en Isaac).
      let best = null, bestCount = 0;
      for (let gx = 0; gx < G; gx++) {
        for (let gy = 0; gy < G; gy++) {
          if (grid[key(gx, gy)]) continue;
          const nbs = [];
          for (const d of DIRS) {
            const nb = grid[key(gx + d.dx, gy + d.dy)];
            if (nb && (nb.type === 'normal' || nb.type === 'start')) nbs.push({ room: nb, dir: d });
          }
          if (nbs.length > bestCount || (nbs.length === bestCount && nbs.length > 0 && Math.random() < 0.4)) {
            best = { gx, gy, nbs }; bestCount = nbs.length;
          }
        }
      }
      if (!best) continue;
      secret = add(best.gx, best.gy, 'secret');
      secret.revealed = false;
      for (const { room, dir } of best.nbs) room.secret[dir.opp] = secret;
      break;
    }

    // Cerradura en la puerta de la sala del tesoro (ambos lados)
    for (const d of DIRS) {
      if (!treasure.doors[d.k]) continue;
      treasure.locks[d.k] = true;
      grid[key(treasure.gx + d.dx, treasure.gy + d.dy)].locks[d.opp] = true;
    }

    // Contenido de las salas
    const normals = shuffle(rooms.filter(r => r.type === 'normal'));
    for (const r of rooms) {
      if (r.type === 'normal') r.rocks = makeRocks();
      if (r.type !== 'normal' && r.type !== 'boss') r.cleared = true;
    }
    treasure.pickups.push({ type: 'item', item: takeItem(), x: W / 2, y: H / 2, r: 14 });

    // Tienda: corazón, bomba, llave y un objeto
    const slots = [
      { kind: 'heart', price: 3 }, { kind: 'bomb', price: 4 },
      { kind: 'key', price: 4 }, { kind: 'item', price: 7, item: takeItem() },
    ];
    slots.forEach((s, i) => {
      shop.pickups.push({ type: 'shop', kind: s.kind, price: s.price, item: s.item,
        x: W / 2 + (i - 1.5) * 100, y: H / 2, r: 14 });
    });

    // Sala secreta: botín
    secret.cleared = true;
    const sp = secret.pickups;
    sp.push({ type: 'coin', x: W / 2 - 60, y: H / 2, r: 8 });
    sp.push({ type: 'coin', x: W / 2 - 30, y: H / 2 + 30, r: 8 });
    sp.push({ type: 'coin', x: W / 2 + 30, y: H / 2 + 30, r: 8 });
    sp.push({ type: 'bomb', x: W / 2 + 60, y: H / 2, r: 9 });
    if (Math.random() < 0.5) sp.push({ type: 'item', item: takeItem(), x: W / 2, y: H / 2 - 20, r: 14 });
    else sp.push({ type: 'heart', x: W / 2, y: H / 2 - 20, r: 10 });

    // Pickups garantizados en salas normales: una llave, una bomba y algunas monedas
    const place = (room, type, r) => {
      const pos = randomFreePos(room);
      room.pickups.push({ type, x: pos.x, y: pos.y, r });
    };
    if (normals[0]) place(normals[0], 'key', 9);
    if (normals[1]) place(normals[1], 'bomb', 9);
    for (let i = 2; i < Math.min(normals.length, 5); i++) place(normals[i], 'coin', 8);

    game.floor = n;
    game.map = { grid, rooms, key };
    const start = rooms[0];
    game.room = start;
    start.visited = true;
    game.tears.length = 0;
    game.eTears.length = 0;
    game.bombList.length = 0;
    game.fx.length = 0;
    game.player.x = W / 2;
    game.player.y = H / 2;
    if (save.bestFloor < n) { save.bestFloor = n; writeSave(); }
    game.banner = { text: 'PISO ' + n, sub: '', t: 2.2 };
  }

  // -------------------------------------------------------------------- Partida
  function newGame() {
    game = {
      floor: 1, runKills: 0, time: 0, shake: 0, msgT: 0,
      tears: [], eTears: [], bombList: [], fx: [], map: null, room: null,
      pool: shuffle(ITEMS.slice()),
      banner: { text: '', sub: '', t: 0 },
      player: {
        x: W / 2, y: H / 2, r: 12, hp: 3, maxHp: 3, speed: 150,
        fireDelay: 0.38, dmg: 1, cool: 0, inv: 0, fx: 0, fy: 1, vx: 0, vy: 0,
        coins: 0, bombs: 1, keys: 0,
        shots: 1, pierce: false, homing: false, bounce: false,
        poison: false, spectral: false, ipecac: false,
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

  function say(text, sub, t = 1.4) { game.banner = { text, sub: sub || '', t }; }

  // ------------------------------------------------------------------- Enemigos
  // fly: mosca errática | gaper: perseguidor | spider: araña saltarina
  // host: dispara tras acercarse | pooter: mosca que dispara a distancia
  function makeEnemy(type, x, y, floor) {
    const f = floor - 1;
    const e = { type, x, y, flash: 0, spawnT: 0.7, poison: null, t: 0, fly: false };
    if (type === 'fly') {
      Object.assign(e, { r: 7, hp: 2 + Math.floor(f * 0.5), speed: 78, fly: true, ph: rand(0, 6), seed: rand(0, 6) });
    } else if (type === 'gaper') {
      Object.assign(e, { r: 12, hp: 4 + Math.floor(f * 0.7), speed: Math.min(58 + f * 5, 95) });
    } else if (type === 'spider') {
      Object.assign(e, { r: 9, hp: 3 + Math.floor(f * 0.6), speed: 30, st: 'wait', t: rand(0.3, 0.9), dx: 0, dy: 0 });
    } else if (type === 'host') {
      Object.assign(e, { r: 12, hp: 5 + Math.floor(f * 0.8), speed: 46, range: 175, t: rand(0.8, 1.4) });
    } else if (type === 'pooter') {
      Object.assign(e, { r: 9, hp: 3 + Math.floor(f * 0.6), speed: 52, range: 195, fly: true,
        t: rand(0.8, 1.6), ph: rand(0, 6), orbit: Math.random() < 0.5 ? 1 : -1 });
    } else { // jefe
      Object.assign(e, { type: 'boss', r: 34, hp: 40 + 15 * f, speed: 38, t: 1.5, spawnT: 1.0, pat: -1, rot: 0 });
    }
    e.maxHp = e.hp;
    return e;
  }

  function pickEnemyType(n) {
    const table = [['fly', 3], ['gaper', 3], ['spider', 2 + (n >= 2 ? 1 : 0)], ['host', 2], ['pooter', 2]];
    const total = table.reduce((a, b) => a + b[1], 0);
    let r = Math.random() * total;
    for (const [t, w] of table) { if ((r -= w) <= 0) return t; }
    return 'gaper';
  }

  function findSpawn(room, r) {
    for (let i = 0; i < 60; i++) {
      const x = rand(WALL + 40, W - WALL - 40);
      const y = rand(WALL + 40, H - WALL - 40);
      if (Math.hypot(x - game.player.x, y - game.player.y) < 170) continue;
      if (room.rocks.some(rc => circleHitsRect(x, y, r + 8, rc))) continue;
      if (room.enemies.some(e => Math.hypot(e.x - x, e.y - y) < 30)) continue;
      return { x, y };
    }
    return { x: W / 2, y: H / 2 - 100 };
  }

  function spawnEnemies(room) {
    room.spawned = true;
    const n = game.floor;
    if (room.type === 'boss') {
      room.enemies.push(makeEnemy('boss', W / 2, H / 2 - 60, n));
      return;
    }
    const count = Math.min(3 + randi(0, 2) + Math.floor(n * 0.7), 9);
    for (let i = 0; i < count && room.enemies.length < 12; i++) {
      const type = pickEnemyType(n);
      const pos = findSpawn(room, 12);
      room.enemies.push(makeEnemy(type, pos.x, pos.y, n));
      if (type === 'fly') { // las moscas vienen en pareja
        const p2 = findSpawn(room, 8);
        room.enemies.push(makeEnemy('fly', p2.x, p2.y, n));
      }
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

  // Elimina a los enemigos con vida <= 0, cuenta bajas, suelta botín y abre la sala.
  function reapDead(room) {
    const enemies = room.enemies;
    let last = null, bossDown = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.hp > 0) continue;
      enemies.splice(i, 1);
      last = e;
      game.runKills++;
      save.totalKills++;
      if (e.type === 'boss') bossDown = true;
      else if (Math.random() < 0.1) room.pickups.push({ type: 'coin', x: e.x, y: e.y, r: 8 });
    }
    if (!last) return;
    writeSave();
    if (bossDown) {
      enemies.length = 0;
      game.eTears.length = 0;
      room.cleared = true;
      room.pickups.push({ type: 'trap', x: W / 2, y: H / 2 + 20, r: 26 });
      room.pickups.push({ type: 'item', item: takeItem(), x: W / 2 - 100, y: H / 2 + 20, r: 14 });
      room.pickups.push({ type: 'heart', x: W / 2 + 100, y: H / 2 + 20, r: 10 });
      room.pickups.push({ type: 'coin', x: W / 2 - 40, y: H / 2 + 80, r: 8 });
      room.pickups.push({ type: 'coin', x: W / 2 + 40, y: H / 2 + 80, r: 8 });
      say('JEFE DERROTADO', 'Baja por la trampilla para seguir', 3);
      game.shake = 0.5;
    } else if (room.spawned && !room.cleared && enemies.length === 0) {
      onRoomCleared(room, last);
    }
  }

  function onRoomCleared(room, lastEnemy) {
    room.cleared = true;
    const x = clamp(lastEnemy.x, WALL + 30, W - WALL - 30);
    const y = clamp(lastEnemy.y, WALL + 30, H - WALL - 30);
    const r = Math.random();
    if (r < 0.30) room.pickups.push({ type: 'coin', x, y, r: 8 });
    else if (r < 0.45) room.pickups.push({ type: 'heart', x, y, r: 10 });
    else if (r < 0.55) room.pickups.push({ type: 'bomb', x, y, r: 9 });
    else if (r < 0.62) room.pickups.push({ type: 'key', x, y, r: 9 });
  }

  // ----------------------------------------------------------- Bombas y explosiones
  function placeBomb() {
    if (state !== 'playing') return;
    const p = game.player;
    if (p.bombs <= 0 || game.bombList.length >= 3) return;
    p.bombs--;
    game.bombList.push({ x: p.x, y: p.y, t: 1.5 });
  }

  // Abre las paredes secretas cuya "grieta" queda dentro del radio de la explosión.
  function openSecrets(room, x, y, R) {
    for (const d of DIRS) {
      const s = room.secret[d.k];
      if (!s) continue;
      const c = doorCenter(d.k);
      if (Math.hypot(x - c.x, y - c.y) < R + 30) {
        room.secret[d.k] = null;
        room.doors[d.k] = true;
        s.doors[d.opp] = true;
        s.revealed = true;
        say('¡SALA SECRETA!', 'Una pared se derrumba', 2);
      }
    }
  }

  // o: { r, eDmg, hurt, rocks, secrets, poison }
  function explode(x, y, o) {
    const g = game, room = g.room, p = g.player;
    g.fx.push({ x, y, r: o.r, t: 0.35, max: 0.35 });
    g.shake = Math.max(g.shake, 0.3);
    for (const e of room.enemies) {
      if (e.spawnT > 0) continue;
      if (Math.hypot(e.x - x, e.y - y) < o.r + e.r) {
        e.hp -= o.eDmg;
        e.flash = 0.15;
        if (o.poison) e.poison = { t: 3, dps: Math.max(1, p.dmg * 0.6) };
      }
    }
    if (o.rocks) room.rocks = room.rocks.filter(rc => !circleHitsRect(x, y, o.r, rc));
    if (o.secrets) openSecrets(room, x, y, o.r);
    if (o.hurt && Math.hypot(p.x - x, p.y - y) < o.r + p.r * 0.5) hurtPlayer(1);
    reapDead(room);
  }

  // ------------------------------------------------------------- Lágrimas del jugador
  const effectiveDelay = (p) =>
    p.fireDelay * (1 + 0.3 * (p.shots - 1)) * (p.ipecac ? 1.6 : 1);

  function fireTears(ax, ay) {
    const p = game.player, n = p.shots;
    const base = Math.atan2(ay, ax);
    const step = n <= 2 ? 0.14 : 0.22;
    const dmg = p.dmg * (n > 1 ? 0.8 : 1);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * step;
      const cx = Math.cos(a), cy = Math.sin(a);
      const t = {
        x: p.x + cx * p.r, y: p.y + cy * p.r,
        dmg, hit: new Set(), pierce: p.pierce, homing: p.homing,
        bounce: p.bounce ? 3 : 0, poison: p.poison, spectral: p.spectral, ipecac: p.ipecac,
      };
      if (p.ipecac) {
        const sp = 210;
        t.vx = cx * sp + p.vx * 0.2; t.vy = cy * sp + p.vy * 0.2;
        t.r = 7; t.life = t.maxLife = 0.8;
      } else {
        t.vx = cx * TEAR_SPEED + p.vx * 0.35; t.vy = cy * TEAR_SPEED + p.vy * 0.35;
        t.r = 4 + Math.min(dmg, 6) * 0.9;
        t.life = t.maxLife = p.bounce ? 1.5 : 0.95;
      }
      game.tears.push(t);
    }
  }

  function nearestEnemy(x, y, enemies) {
    let best = null, bd = 1e9;
    for (const e of enemies) {
      if (e.spawnT > 0) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ------------------------------------------------------------- Cambio de sala
  function changeRoom(dirKey) {
    const d = DIRS.find(x => x.k === dirKey);
    const next = game.map.grid[game.map.key(game.room.gx + d.dx, game.room.gy + d.dy)];
    if (!next) return;
    const p = game.player;
    const first = !next.visited;
    game.room = next;
    next.visited = true;
    game.tears.length = 0;
    game.eTears.length = 0;
    game.bombList.length = 0;
    const inset = WALL + p.r + 6;
    if (dirKey === 'N') { p.x = W / 2; p.y = H - inset; }
    if (dirKey === 'S') { p.x = W / 2; p.y = inset; }
    if (dirKey === 'E') { p.x = inset; p.y = H / 2; }
    if (dirKey === 'W') { p.x = W - inset; p.y = H / 2; }
    p.inv = Math.max(p.inv, 0.4);
    if (!next.cleared && !next.spawned) spawnEnemies(next);
    if (next.type === 'boss' && !next.cleared) say('JEFE', '', 1.6);
    else if (first && next.type === 'treasure') say('SALA DEL TESORO', 'Elige sabiamente', 1.8);
    else if (first && next.type === 'shop') say('TIENDA', 'Toca un artículo para comprarlo', 2);
    else if (first && next.type === 'secret') say('SALA SECRETA', '', 1.8);
  }

  function nextFloor() {
    const p = game.player;
    p.hp = Math.min(p.maxHp, p.hp + 1);
    genFloor(game.floor + 1);
  }

  // Tocar una puerta con cerradura consume una llave.
  function tryUnlock(room, p) {
    const r = p.r, dw = DOOR / 2 - r + 2;
    const near = {
      N: p.y <= WALL + r + 1 && Math.abs(p.x - W / 2) <= dw,
      S: p.y >= H - WALL - r - 1 && Math.abs(p.x - W / 2) <= dw,
      W: p.x <= WALL + r + 1 && Math.abs(p.y - H / 2) <= dw,
      E: p.x >= W - WALL - r - 1 && Math.abs(p.y - H / 2) <= dw,
    };
    for (const d of DIRS) {
      if (!near[d.k] || !room.locks[d.k] || !room.cleared) continue;
      if (p.keys > 0) {
        p.keys--;
        room.locks[d.k] = false;
        const nb = game.map.grid[game.map.key(room.gx + d.dx, room.gy + d.dy)];
        if (nb) nb.locks[d.opp] = false;
        say('PUERTA ABIERTA', '', 1.2);
      } else if (game.msgT <= 0) {
        say('Necesitas una llave', '', 1.2);
        game.msgT = 1.4;
      }
    }
  }

  // -------------------------------------------------------------------- Update
  function updateEnemy(e, room, dt) {
    const p = game.player;
    const toP = Math.atan2(p.y - e.y, p.x - e.x);
    const d = dist(e, p);

    if (e.type === 'gaper') {
      e.x += Math.cos(toP) * e.speed * dt;
      e.y += Math.sin(toP) * e.speed * dt;
    } else if (e.type === 'fly') {
      e.ph += dt * 6;
      const a = toP + Math.sin(e.ph + e.seed) * 1.0;
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
    } else if (e.type === 'spider') {
      e.t -= dt;
      if (e.st === 'wait') {
        e.x += Math.cos(toP) * e.speed * dt;   // se arrastra mientras se prepara
        e.y += Math.sin(toP) * e.speed * dt;
        if (e.t <= 0) { e.st = 'leap'; e.t = 0.35; e.dx = Math.cos(toP); e.dy = Math.sin(toP); }
      } else {
        e.x += e.dx * 240 * dt;
        e.y += e.dy * 240 * dt;
        if (e.t <= 0) { e.st = 'wait'; e.t = rand(0.5, 1.0); }
      }
    } else if (e.type === 'host') {
      // Se acerca hasta su rango, y entonces se detiene y dispara.
      if (d > e.range) {
        e.x += Math.cos(toP) * e.speed * dt;
        e.y += Math.sin(toP) * e.speed * dt;
      } else {
        if (d < 110) {
          e.x -= Math.cos(toP) * e.speed * 0.6 * dt;
          e.y -= Math.sin(toP) * e.speed * 0.6 * dt;
        }
        e.t -= dt;
        if (e.t <= 0) {
          const sp = 150 + game.floor * 5;
          if (game.floor >= 3) {
            for (let i = -1; i <= 1; i++) fireEnemyTear(e.x, e.y, toP + i * 0.25, sp);
          } else {
            fireEnemyTear(e.x, e.y, toP + rand(-0.1, 0.1), sp);
          }
          e.t = rand(1.5, 2.3);
        }
      }
    } else if (e.type === 'pooter') {
      e.ph += dt * 5;
      if (d > e.range) {
        const a = toP + Math.sin(e.ph) * 0.5;
        e.x += Math.cos(a) * e.speed * dt;
        e.y += Math.sin(a) * e.speed * dt;
      } else {
        // flota alrededor del jugador mientras dispara
        const a = toP + Math.PI / 2 * e.orbit;
        e.x += Math.cos(a) * e.speed * 0.5 * dt;
        e.y += Math.sin(a) * e.speed * 0.5 * dt;
        e.t -= dt;
        if (e.t <= 0) {
          fireEnemyTear(e.x, e.y, toP + rand(-0.12, 0.12), 140 + game.floor * 5);
          e.t = rand(1.7, 2.6);
        }
      }
    } else { // jefe
      e.x += Math.cos(toP) * e.speed * dt;
      e.y += Math.sin(toP) * e.speed * dt;
      e.t -= dt;
      if (e.t <= 0) {
        const enemies = room.enemies;
        const rage = e.hp < e.maxHp * 0.5;
        e.pat = (e.pat + 1) % 3;
        if (e.pat === 0) {
          const n = rage ? 16 : 12;
          e.rot += 0.3;
          for (let i = 0; i < n; i++) fireEnemyTear(e.x, e.y, e.rot + i * Math.PI * 2 / n, 130, 6);
        } else if (e.pat === 1) {
          const n = rage ? 5 : 3;
          for (let i = 0; i < n; i++) fireEnemyTear(e.x, e.y, toP + (i - (n - 1) / 2) * 0.28, 190, 6);
        } else if (enemies.length < 5) {
          const m = makeEnemy(Math.random() < 0.5 ? 'gaper' : 'fly', e.x + rand(-40, 40), e.y + rand(-40, 40), game.floor);
          m.spawnT = 0.5;
          enemies.push(m);
        } else {
          for (let i = 0; i < 10; i++) fireEnemyTear(e.x, e.y, i * Math.PI * 2 / 10, 150, 6);
        }
        e.t = rage ? 1.4 : 2.0;
      }
    }
  }

  function updatePlaying(dt) {
    const g = game, p = g.player, room = g.room;
    g.time += dt;
    if (g.banner.t > 0) g.banner.t -= dt;
    if (g.shake > 0) g.shake -= dt;
    if (g.msgT > 0) g.msgT -= dt;
    if (p.inv > 0) p.inv -= dt;
    for (let i = g.fx.length - 1; i >= 0; i--) { g.fx[i].t -= dt; if (g.fx[i].t <= 0) g.fx.splice(i, 1); }

    // --- Jugador: movimiento
    const mv = getMoveVector();
    p.vx = mv.x * p.speed;
    p.vy = mv.y * p.speed;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    for (const rc of room.rocks) pushOutRect(p, rc);
    clampPlayer(p, room);
    tryUnlock(room, p);

    // --- Jugador: disparo
    const aim = getAimVector();
    if (aim.x || aim.y) { p.fx = aim.x; p.fy = aim.y; }
    else if (mv.x || mv.y) { p.fx = mv.x; p.fy = mv.y; }
    p.cool -= dt;
    if ((aim.x || aim.y) && p.cool <= 0) {
      fireTears(aim.x, aim.y);
      p.cool = effectiveDelay(p);
    }

    // --- Bombas colocadas
    for (let i = g.bombList.length - 1; i >= 0; i--) {
      const b = g.bombList[i];
      b.t -= dt;
      if (b.t <= 0) {
        g.bombList.splice(i, 1);
        explode(b.x, b.y, { r: 75, eDmg: 25, hurt: true, rocks: true, secrets: true });
        if (state !== 'playing') return;
      }
    }

    // --- Enemigos
    const enemies = room.enemies;
    for (const e of enemies) {
      if (e.spawnT > 0) { e.spawnT -= dt; continue; }
      if (e.flash > 0) e.flash -= dt;
      if (e.poison) {
        e.hp -= e.poison.dps * dt;
        e.poison.t -= dt;
        if (e.poison.t <= 0) e.poison = null;
      }
      updateEnemy(e, room, dt);

      // Colisiones con rocas (los voladores las sobrevuelan), paredes y otros enemigos
      if (!e.fly) for (const rc of room.rocks) pushOutRect(e, rc);
      clampInside(e);
      for (const o of enemies) {
        if (o === e || o.spawnT > 0 || o.fly !== e.fly) continue;
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
    reapDead(room);

    // --- Lágrimas del jugador
    const tears = g.tears;
    for (let i = tears.length - 1; i >= 0; i--) {
      const t = tears[i];
      let dead = false;
      if (t.homing) {
        const tgt = nearestEnemy(t.x, t.y, enemies);
        if (tgt) {
          const sp = Math.hypot(t.vx, t.vy);
          const cur = Math.atan2(t.vy, t.vx);
          let diff = Math.atan2(tgt.y - t.y, tgt.x - t.x) - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const na = cur + clamp(diff, -4 * dt, 4 * dt);
          t.vx = Math.cos(na) * sp; t.vy = Math.sin(na) * sp;
        }
      }
      t.x += t.vx * dt; t.y += t.vy * dt; t.life -= dt;

      if (t.ipecac) {
        // Lanzada en arco: explota al aterrizar
        t.x = clamp(t.x, WALL + 4, W - WALL - 4);
        t.y = clamp(t.y, WALL + 4, H - WALL - 4);
        if (t.life <= 0) {
          dead = true;
          explode(t.x, t.y, { r: 58, eDmg: g.player.dmg * 2.2 + 5, hurt: true, poison: true });
          if (state !== 'playing') return;
        }
      } else {
        if (t.life <= 0) dead = true;
        // paredes (rebotan si tienen Cemento de Goma)
        if (!dead && (t.x < WALL || t.x > W - WALL || t.y < WALL || t.y > H - WALL)) {
          if (t.bounce > 0) {
            if (t.x < WALL) { t.x = WALL + 1; t.vx = Math.abs(t.vx); }
            if (t.x > W - WALL) { t.x = W - WALL - 1; t.vx = -Math.abs(t.vx); }
            if (t.y < WALL) { t.y = WALL + 1; t.vy = Math.abs(t.vy); }
            if (t.y > H - WALL) { t.y = H - WALL - 1; t.vy = -Math.abs(t.vy); }
            t.bounce--;
          } else dead = true;
        }
        if (!dead && !t.spectral && room.rocks.some(rc => circleHitsRect(t.x, t.y, t.r, rc))) dead = true;
        if (!dead) {
          for (const e of enemies) {
            if (e.spawnT > 0 || t.hit.has(e) || e.hp <= 0) continue;
            if (circlesHit(t, e)) {
              e.hp -= t.dmg;
              e.flash = 0.1;
              if (t.poison) e.poison = { t: 3, dps: Math.max(1, t.dmg * 0.6) };
              t.hit.add(e);
              if (!t.pierce) { dead = true; break; }
            }
          }
        }
      }
      if (dead) tears.splice(i, 1);
    }
    reapDead(room);

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

    // --- Pickups, objetos y tienda
    for (let i = room.pickups.length - 1; i >= 0; i--) {
      const k = room.pickups[i];
      if (!circlesHit(p, k, 2)) continue;
      if (k.type === 'heart') {
        if (p.hp < p.maxHp) { p.hp++; room.pickups.splice(i, 1); }
      } else if (k.type === 'coin') {
        p.coins = Math.min(99, p.coins + 1); room.pickups.splice(i, 1);
      } else if (k.type === 'bomb') {
        p.bombs = Math.min(99, p.bombs + 1); room.pickups.splice(i, 1);
      } else if (k.type === 'key') {
        p.keys = Math.min(99, p.keys + 1); room.pickups.splice(i, 1);
      } else if (k.type === 'item') {
        k.item.apply(p);
        say(k.item.name, k.item.desc, 2.6);
        room.pickups.splice(i, 1);
      } else if (k.type === 'shop') {
        if (p.coins < k.price) {
          if (g.msgT <= 0) { say('Monedas insuficientes', 'Cuesta ' + k.price, 1.2); g.msgT = 1.4; }
          continue;
        }
        if (k.kind === 'heart' && p.hp >= p.maxHp) {
          if (g.msgT <= 0) { say('Salud completa', '', 1.2); g.msgT = 1.4; }
          continue;
        }
        p.coins -= k.price;
        if (k.kind === 'heart') p.hp++;
        else if (k.kind === 'bomb') p.bombs = Math.min(99, p.bombs + 1);
        else if (k.kind === 'key') p.keys = Math.min(99, p.keys + 1);
        else { k.item.apply(p); say(k.item.name, k.item.desc, 2.6); }
        room.pickups.splice(i, 1);
      } else if (k.type === 'trap') {
        nextFloor();
        return;
      }
    }

    // --- Cruce de puertas
    if (p.y < 8 && doorOpen(room, 'N')) changeRoom('N');
    else if (p.y > H - 8 && doorOpen(room, 'S')) changeRoom('S');
    else if (p.x < 8 && doorOpen(room, 'W')) changeRoom('W');
    else if (p.x > W - 8 && doorOpen(room, 'E')) changeRoom('E');
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
  const PALETTE = {
    normal:   ['#5b4439', '#523d33'],
    start:    ['#5b4439', '#523d33'],
    treasure: ['#6d5a2e', '#634f27'],
    shop:     ['#3f5d47', '#385441'],
    secret:   ['#4f4068', '#473a5f'],
    boss:     ['#60363a', '#562f33'],
  };
  const C = {
    wall: '#3a2a2a', wallEdge: '#241818', doorOpen: '#120c0a', doorClosed: '#7b3a2c',
    rock: '#7a7a82', rockLight: '#9a9aa4',
  };

  function heartPath(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.38);
    ctx.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.5, y - s * 0.6, x, y - s * 0.2);
    ctx.bezierCurveTo(x + s * 0.5, y - s * 0.6, x + s * 0.75, y - s * 0.05, x, y + s * 0.38);
    ctx.closePath();
  }
  function drawCoin(x, y, r) {
    ctx.fillStyle = '#f0c030';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6410'; ctx.lineWidth = Math.max(1, r * 0.25); ctx.stroke();
    ctx.strokeStyle = '#b8880f'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.stroke();
  }
  function drawBombIcon(x, y, r, fuseLit = false) {
    ctx.fillStyle = '#2b2b30';
    ctx.beginPath(); ctx.arc(x, y + r * 0.15, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#777';
    ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.15, r * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b09060'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + r * 0.4, y - r * 0.7); ctx.lineTo(x + r * 0.9, y - r * 1.2); ctx.stroke();
    ctx.fillStyle = fuseLit ? '#ff5030' : '#ffb030';
    ctx.beginPath(); ctx.arc(x + r * 0.95, y - r * 1.25, Math.max(1.5, r * 0.28), 0, Math.PI * 2); ctx.fill();
  }
  function drawKeyIcon(x, y, r) {
    ctx.strokeStyle = '#f0c030'; ctx.fillStyle = '#f0c030'; ctx.lineWidth = Math.max(2, r * 0.3);
    ctx.beginPath(); ctx.arc(x - r * 0.45, y - r * 0.3, r * 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.1, y - r * 0.05); ctx.lineTo(x + r * 0.9, y + r * 0.75); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.5, y + r * 0.4); ctx.lineTo(x + r * 0.2, y + r * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.8, y + r * 0.65); ctx.lineTo(x + r * 0.5, y + r * 0.95); ctx.stroke();
  }

  function drawDoors(room) {
    const rects = {
      N: [W / 2 - DOOR / 2, 0, DOOR, WALL],
      S: [W / 2 - DOOR / 2, H - WALL, DOOR, WALL],
      W: [0, H / 2 - DOOR / 2, WALL, DOOR],
      E: [W - WALL, H / 2 - DOOR / 2, WALL, DOOR],
    };
    for (const k of ['N', 'S', 'W', 'E']) {
      const [x, y, w, h] = rects[k];
      const horiz = (k === 'N' || k === 'S');
      // Grietas tenues en las paredes que esconden una sala secreta
      if (room.secret[k]) {
        ctx.strokeStyle = 'rgba(15,8,8,0.55)'; ctx.lineWidth = 2;
        ctx.beginPath();
        const cx = x + w / 2, cy = y + h / 2;
        if (horiz) {
          ctx.moveTo(cx - 12, y + 6); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx - 10, y + h - 6);
          ctx.moveTo(cx + 8, y + 8); ctx.lineTo(cx + 14, cy + 2);
        } else {
          ctx.moveTo(x + 6, cy - 12); ctx.lineTo(cx, cy - 4); ctx.lineTo(x + w - 6, cy - 10);
          ctx.moveTo(x + 8, cy + 8); ctx.lineTo(cx + 2, cy + 14);
        }
        ctx.stroke();
        continue;
      }
      if (!room.doors[k]) continue;
      const locked = room.locks[k];
      const open = room.cleared && !locked;
      ctx.fillStyle = locked ? '#b8902f' : open ? C.doorOpen : C.doorClosed;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = locked ? '#6b5010' : open ? '#6b5348' : '#3d1a12';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      if (locked) {
        ctx.fillStyle = '#2a1c05';
        ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2 - 2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(x + w / 2 - 2, y + h / 2, 4, 9);
      } else if (!open) {
        ctx.strokeStyle = '#2a110b'; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 1; i < 4; i++) {
          if (horiz) { ctx.moveTo(x + w * i / 4, y); ctx.lineTo(x + w * i / 4, y + h); }
          else { ctx.moveTo(x, y + h * i / 4); ctx.lineTo(x + w, y + h * i / 4); }
        }
        ctx.stroke();
      }
    }
  }

  function drawRoom(room) {
    const pal = PALETTE[room.type] || PALETTE.normal;
    ctx.fillStyle = C.wall;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pal[0];
    ctx.fillRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
    ctx.fillStyle = pal[1];
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
    drawDoors(room);

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

  function drawItemBox(x, y, item) {
    ctx.fillStyle = item.color;
    ctx.fillRect(x - 14, y - 14, 28, 28);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.strokeRect(x - 14, y - 14, 28, 28);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.glyph, x, y + 1);
  }
  function drawPedestal(x, y) {
    ctx.fillStyle = '#4a4a52';
    ctx.fillRect(x - 20, y + 8, 40, 12);
    ctx.fillStyle = '#6a6a74';
    ctx.fillRect(x - 20, y + 8, 40, 4);
  }

  function drawPickup(k, time) {
    const bob = Math.sin(time * 4 + k.x) * 2;
    if (k.type === 'heart') {
      ctx.fillStyle = '#e8384f';
      heartPath(k.x, k.y + bob, 24);
      ctx.fill();
      ctx.strokeStyle = '#6e0f1c'; ctx.lineWidth = 2; ctx.stroke();
    } else if (k.type === 'coin') {
      drawCoin(k.x, k.y + bob, 7);
    } else if (k.type === 'bomb') {
      drawBombIcon(k.x, k.y + bob, 8);
    } else if (k.type === 'key') {
      drawKeyIcon(k.x, k.y + bob, 9);
    } else if (k.type === 'item') {
      drawPedestal(k.x, k.y);
      drawItemBox(k.x, k.y - 4 + bob, k.item);
    } else if (k.type === 'shop') {
      drawPedestal(k.x, k.y);
      const y = k.y - 4 + bob;
      if (k.kind === 'item') drawItemBox(k.x, y, k.item);
      else if (k.kind === 'heart') { ctx.fillStyle = '#e8384f'; heartPath(k.x, y, 26); ctx.fill(); ctx.strokeStyle = '#6e0f1c'; ctx.lineWidth = 2; ctx.stroke(); }
      else if (k.kind === 'bomb') drawBombIcon(k.x, y, 10);
      else drawKeyIcon(k.x, y, 11);
      // etiqueta de precio
      drawCoin(k.x - 10, k.y + 32, 6);
      ctx.fillStyle = '#fff3d6';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(String(k.price), k.x - 2, k.y + 33);
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
    const ex = -dy, ey = dx;
    for (const s of [-1, 1]) {
      const cx = x + dx * r * 0.35 + ex * s * r * 0.4;
      const cy = y + dy * r * 0.35 + ey * s * r * 0.4;
      ctx.fillStyle = white;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(cx + dx * r * 0.1, cy + dy * r * 0.1, r * 0.14, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawWings(e, color) {
    const flap = 0.5 + 0.5 * Math.abs(Math.sin(game.time * 38 + e.x));
    ctx.fillStyle = color;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(e.x + s * e.r * 0.9, e.y - e.r * 0.5, e.r * 0.8, e.r * 0.5 * flap + 1, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawEnemy(e) {
    ctx.save();
    if (e.spawnT > 0) ctx.globalAlpha = 0.35 + 0.25 * Math.sin(e.spawnT * 30);
    const flash = e.flash > 0;
    const p = game.player;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    const dx = Math.cos(a), dy = Math.sin(a);

    if (e.type === 'gaper') {
      ctx.fillStyle = flash ? '#fff' : '#c4362f';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5c120e'; ctx.lineWidth = 2; ctx.stroke();
      drawEyes(e.x, e.y, dx, dy, e.r, '#ffe');
    } else if (e.type === 'fly') {
      drawWings(e, 'rgba(230,230,255,0.75)');
      ctx.fillStyle = flash ? '#fff' : '#26262c';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d33';
      ctx.beginPath(); ctx.arc(e.x + dx * 2 - dy * 2.5, e.y + dy * 2 + dx * 2.5, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + dx * 2 + dy * 2.5, e.y + dy * 2 - dx * 2.5, 1.6, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'spider') {
      const leap = e.st === 'leap';
      ctx.strokeStyle = flash ? '#fff' : '#1a1a1a'; ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const ang = i * Math.PI / 4 + Math.PI / 8 + (leap ? 0 : Math.sin(game.time * 14 + i) * 0.12);
        const l1 = e.r * (leap ? 1.9 : 1.5);
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(ang) * l1, e.y + Math.sin(ang) * l1 - 3);
        ctx.lineTo(e.x + Math.cos(ang) * l1 * 1.3, e.y + Math.sin(ang) * l1 * 1.3 + 2);
        ctx.stroke();
      }
      ctx.fillStyle = flash ? '#fff' : '#2b2b2b';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e33';
      ctx.beginPath(); ctx.arc(e.x + dx * 3 - dy * 3, e.y + dy * 3 + dx * 3, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + dx * 3 + dy * 3, e.y + dy * 3 - dx * 3, 1.8, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'host') {
      ctx.fillStyle = flash ? '#fff' : '#7d3fb8';
      ctx.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
      ctx.strokeStyle = '#341857'; ctx.lineWidth = 2;
      ctx.strokeRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
      drawEyes(e.x, e.y, dx, dy, e.r, '#fe9');
      if (dist(e, p) <= e.range && e.t < 0.4) { // boca abierta antes de disparar
        ctx.fillStyle = '#1a0a26';
        ctx.fillRect(e.x - 6, e.y + 3, 12, 6);
      }
    } else if (e.type === 'pooter') {
      drawWings(e, 'rgba(200,255,200,0.7)');
      ctx.fillStyle = flash ? '#fff' : '#8fb04a';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3d5018'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#3d5018';
      ctx.beginPath(); ctx.arc(e.x + dx * e.r * 0.8, e.y + dy * e.r * 0.8, 3, 0, Math.PI * 2); ctx.fill();
      drawEyes(e.x, e.y, dx, dy, e.r * 0.9, '#efe');
    } else { // jefe
      ctx.fillStyle = flash ? '#fff' : '#8c1f2a';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3a0a10'; ctx.lineWidth = 4; ctx.stroke();
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
    if (e.poison) { // aura verde por veneno
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#6fe04a';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer(p) {
    if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#f3d6b8';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a4f'; ctx.lineWidth = 2; ctx.stroke();
    drawEyes(p.x, p.y, p.fx, p.fy, p.r, '#fff');
    ctx.fillStyle = 'rgba(80,160,255,0.9)';
    ctx.beginPath(); ctx.arc(p.x - p.fy * p.r * 0.55 + p.fx * p.r * 0.1, p.y + p.fx * p.r * 0.55 + p.fy * p.r * 0.1 + 4, 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawTear(t) {
    if (t.ipecac) {
      const prog = 1 - t.life / t.maxLife;
      const z = Math.sin(prog * Math.PI) * 34;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(t.x, t.y + 2, t.r, t.r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a8b83a';
      ctx.beginPath(); ctx.arc(t.x, t.y - z, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#4a5a10'; ctx.lineWidth = 2; ctx.stroke();
      return;
    }
    ctx.globalAlpha = t.spectral ? 0.65 : 1;
    ctx.fillStyle = t.poison ? '#9be07a' : '#7fc4ff';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = t.homing ? '#ff6ad0' : t.pierce ? '#ffffff' : t.poison ? '#2f6a1a' : '#1d4f80';
    ctx.lineWidth = 1.5; ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    const g = game, p = g.player;
    // corazones
    for (let i = 0; i < p.maxHp; i++) {
      const x = 16 + i * 22, y = 14;
      heartPath(x, y, 19);
      ctx.fillStyle = i < p.hp ? '#e8384f' : 'rgba(0,0,0,0.45)';
      ctx.fill();
      ctx.strokeStyle = '#1a0608'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // contadores: monedas, bombas, llaves
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2e6d8';
    drawCoin(14, 34, 5.5);  ctx.fillStyle = '#f2e6d8'; ctx.fillText(String(p.coins), 24, 35);
    drawBombIcon(62, 34, 5.5); ctx.fillStyle = '#f2e6d8'; ctx.fillText(String(p.bombs), 72, 35);
    drawKeyIcon(106, 34, 6);  ctx.fillStyle = '#f2e6d8'; ctx.fillText(String(p.keys), 118, 35);

    // textos de piso
    ctx.fillStyle = '#f2e6d8';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Piso ' + g.floor, W - 76, 16);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#d9c8b4';
    ctx.fillText('Derrotados: ' + g.runKills, W - 76, 32);

    // minimapa
    const cw = 10, ch = 7, gap = 1, x0 = W - 66, y0 = 3;
    const grid = g.map.grid, key = g.map.key;
    const icon = { boss: '#e03a3a', treasure: '#f0c030', shop: '#4ad06a', secret: '#c080ff' };
    for (const r of g.map.rooms) {
      if (r.type === 'secret' && !r.revealed) continue;
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
      if (icon[r.type]) { ctx.fillStyle = icon[r.type]; ctx.fillRect(x + 3, y + 2, 4, 3); }
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
    for (const b of g.bombList) drawBombIcon(b.x, b.y, 9, b.t < 0.5 && Math.floor(b.t * 14) % 2 === 0);
    for (const e of room.enemies) drawEnemy(e);
    drawPlayer(g.player);
    for (const t of g.tears) drawTear(t);
    for (const t of g.eTears) {
      ctx.fillStyle = '#e04a6a';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a1020'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (const f of g.fx) { // explosiones
      const k = 1 - f.t / f.max;
      ctx.globalAlpha = 0.75 * (1 - k);
      ctx.fillStyle = '#ffb040';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff0a0';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.5 * (1 - k), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
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
    ctx.fillText('Izquierda: moverse  ·  Derecha: disparar  ·  Botón de bomba: poner bomba', W / 2, 375);
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

  // Controles virtuales superpuestos (50% de opacidad), en coordenadas de pantalla
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
    // botón de bomba
    const b = bombButton();
    ctx.fillStyle = 'rgba(255,200,120,0.3)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.translate(b.x, b.y - b.r * 0.08);
    const sc = b.r / 14;
    ctx.scale(sc, sc);
    drawBombIcon(0, 0, 9);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + Math.round(b.r * 0.55) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (game) ctx.fillText('x' + game.player.bombs, b.x, b.y + b.r * 0.62);
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
    api: { genFloor, newGame, explode, placeBomb, makeEnemy, changeRoom, fireTears, ITEMS, spawnEnemies, bombButton },
  };
})();
