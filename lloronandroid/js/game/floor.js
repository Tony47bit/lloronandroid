/* ==========================================================================
   Generador de pisos.  Rejilla 5x5 con estructura de árbol; los tipos de sala
   especiales salen de L.RoomTypes (colocación por estrategia), el terreno de
   L.Obstacles y el jefe de L.Bosses. No conoce ningún contenido concreto.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { rand, randi, shuffle } = L.util;
  const { W, H, WALL, DIRS } = L.C;
  const G = 5;
  const key = (x, y) => x + ',' + y;

  function newRoom(x, y, type) {
    return {
      gx: x, gy: y, type, cleared: false, visited: false, spawned: false, revealed: true,
      doors: { N: false, S: false, E: false, W: false },
      locks: { N: false, S: false, E: false, W: false },
      secret: { N: null, S: null, E: null, W: null },
      obstacles: [], enemies: [], pickups: [], dist: 0, boss: null, state: {},
    };
  }

  function makeObstacles(room, floor) {
    const defs = L.Obstacles.filter((d) => (d.minFloor || 1) <= floor);
    if (!defs.length) return;
    const n = randi(0, 4) + (floor >= 3 ? 1 : 0);
    let tries = 0;
    while (room.obstacles.length < n && tries++ < 50) {
      const d = L.util.weighted(defs, (x) => x.weight);
      const [w, h] = d.size;
      const cx = rand(WALL + 36, W - WALL - 36), cy = rand(WALL + 36, H - WALL - 36);
      if (Math.abs(cx - W / 2) < 110 || Math.abs(cy - H / 2) < 70) continue; // pasillos y puertas libres
      if (room.obstacles.some((o) => Math.hypot(o.x + o.w / 2 - cx, o.y + o.h / 2 - cy) < 56)) continue;
      room.obstacles.push({ id: d.id, x: cx - w / 2, y: cy - h / 2, w, h, hp: d.hp, maxHp: d.hp });
    }
  }

  /** api: engine facade (addPickup, takeItem...). Devuelve { grid, rooms, start, key }. */
  function generate(floor, api) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const grid = {}, rooms = [];
      const add = (x, y, type) => { const r = newRoom(x, y, type); grid[key(x, y)] = r; rooms.push(r); return r; };
      const start = add(2, 2, 'start');
      const target = Math.min(7 + (floor - 1) + randi(0, 2), 12);
      let guard = 0;
      while (rooms.length < target && guard++ < 800) {
        const base = rooms[randi(0, rooms.length - 1)], d = DIRS[randi(0, 3)];
        const nx = base.gx + d.dx, ny = base.gy + d.dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= G || grid[key(nx, ny)]) continue;
        let nb = 0;
        for (const dd of DIRS) if (grid[key(nx + dd.dx, ny + dd.dy)]) nb++;
        if (nb > 1) continue;
        const r = add(nx, ny, 'normal');
        base.doors[d.k] = true; r.doors[d.opp] = true;
      }
      if (rooms.length < 7) continue;

      // distancias BFS
      const queue = [start], seen = new Set([start]);
      while (queue.length) {
        const cur = queue.shift();
        for (const d of DIRS) {
          if (!cur.doors[d.k]) continue;
          const nx = grid[key(cur.gx + d.dx, cur.gy + d.dy)];
          if (nx && !seen.has(nx)) { nx.dist = cur.dist + 1; seen.add(nx); queue.push(nx); }
        }
      }
      const doorCount = (r) => DIRS.filter((d) => r.doors[d.k]).length;
      const leaves = rooms.filter((r) => r !== start && doorCount(r) === 1);

      const ctx = {
        rooms, start, grid, leaves,
        placeHidden() {
          let best = null, bestCount = 0;
          for (let gx = 0; gx < G; gx++) for (let gy = 0; gy < G; gy++) {
            if (grid[key(gx, gy)]) continue;
            const nbs = [];
            for (const d of DIRS) {
              const nb = grid[key(gx + d.dx, gy + d.dy)];
              if (nb && (nb.type === 'normal' || nb.type === 'start')) nbs.push({ room: nb, dir: d });
            }
            if (nbs.length > bestCount || (nbs.length === bestCount && nbs.length > 0 && Math.random() < 0.4)) { best = { gx, gy, nbs }; bestCount = nbs.length; }
          }
          return best;
        },
      };

      // colocar tipos especiales por orden
      let ok = true;
      const placed = [];
      for (const rt of L.RoomTypes.all().sort((a, b) => (a.order || 0) - (b.order || 0))) {
        if ((rt.minFloor || 1) > floor || (rt.maxFloor || 99) < floor) continue;
        if (rt.chance != null && Math.random() > rt.chance && !rt.required) continue;
        const strat = typeof rt.place === 'function' ? rt.place : L.Placement[rt.place];
        const spot = strat ? strat(ctx) : null;
        if (!spot) { if (rt.required) { ok = false; break; } continue; }
        if (rt.hidden) {
          const room = add(spot.gx, spot.gy, rt.id);
          room.revealed = false; room.def = rt; room.type_taken = true;
          for (const { room: nb, dir } of spot.nbs) nb.secret[dir.opp] = room;
          placed.push(room);
        } else {
          spot.type = rt.id; spot.def = rt; spot.type_taken = true; placed.push(spot);
        }
      }
      if (!ok) continue;

      // cerraduras, contenido y botín
      for (const room of placed) {
        const rt = room.def;
        if (rt.locked) for (const d of DIRS) {
          if (!room.doors[d.k]) continue;
          room.locks[d.k] = true;
          grid[key(room.gx + d.dx, room.gy + d.dy)].locks[d.opp] = true;
        }
        if (rt.cleared) room.cleared = true;
        if (rt.boss) {
          const cands = L.Bosses.filter((b) => (b.minFloor || 1) <= floor && (b.maxFloor || 99) >= floor);
          room.boss = (L.util.weighted(cands, (b) => b.weight) || L.Bosses.all()[0]).id;
        }
        if (rt.populate) rt.populate(api, room, floor);
      }
      for (const r of rooms) if (r.type === 'normal') makeObstacles(r, floor);

      // pickups garantizados en salas normales
      const normals = shuffle(rooms.filter((r) => r.type === 'normal'));
      const put = (room, type) => { const p = api.freePos(room); api.addPickup(room, type, p.x, p.y); };
      if (normals[0]) put(normals[0], 'key');
      if (normals[1]) put(normals[1], 'bomb');
      for (let i = 2; i < Math.min(normals.length, 5); i++) put(normals[i], 'coin');
      return { grid, rooms, start, key };
    }
    throw new Error('No se pudo generar el piso');
  }

  L.Floor = { generate, key };
})();
