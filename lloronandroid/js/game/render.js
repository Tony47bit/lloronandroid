/* ==========================================================================
   Dibujo (mundo, HUD, menú, fin de partida, controles) e interfaz táctil
   de menús (L.UI). El mundo se dibuja delegando en las definiciones del
   contenido (obstacle.draw, pickup.draw, enemy.draw...).
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { W, H, WALL, DOOR, DIRS } = L.C;
  const { clamp, rand } = L.util;
  const D = L.draw;
  const S = L.S;
  const View = L.View;
  const FONT = 'system-ui, sans-serif';
  let ctx = null;

  const BTN_PLAY = { x: W / 2 - 110, y: 318, w: 220, h: 54, label: 'JUGAR' };
  const BTN_RESTART = { x: W / 2 - 190, y: 300, w: 180, h: 50, label: 'Reintentar' };
  const BTN_MENU = { x: W / 2 + 10, y: 300, w: 180, h: 50, label: 'Menú' };
  const PREV = { x: W / 2 - 190, y: 226, w: 50, h: 70 }, NEXT = { x: W / 2 + 140, y: 226, w: 50, h: 70 };
  const inRect = (q, r) => q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h;

  // ------------------------------------------------------------ UI de menús
  function cycleChar(d) {
    const list = L.Characters.all(), i = list.findIndex((c) => c.id === S.charId);
    S.charId = list[(i + d + list.length) % list.length].id; L.Save.write();
  }
  L.UI = {
    tap(x, y) {
      if (S.state === 'menu') {
        if (inRect({ x, y }, PREV)) cycleChar(-1);
        else if (inRect({ x, y }, NEXT)) cycleChar(1);
        else if (inRect({ x, y }, BTN_PLAY)) L.Engine.newGame(S.charId);
      } else if (S.state === 'gameover' && S.goT > 0.4) {
        if (inRect({ x, y }, BTN_RESTART)) L.Engine.newGame(S.charId);
        else if (inRect({ x, y }, BTN_MENU)) { S.state = 'menu'; }
      }
    },
    key(code) {
      if (S.state === 'menu') {
        if (code === 'ArrowLeft') cycleChar(-1);
        else if (code === 'ArrowRight') cycleChar(1);
        else if (code === 'Enter' || code === 'Space') L.Engine.newGame(S.charId);
      } else if (S.state === 'gameover' && S.goT > 0.4 && (code === 'Enter' || code === 'Space')) L.Engine.newGame(S.charId);
    },
  };

  // --------------------------------------------------------------------- Sala
  function drawDoors(room) {
    const rects = {
      N: [W / 2 - DOOR / 2, 0, DOOR, WALL], S: [W / 2 - DOOR / 2, H - WALL, DOOR, WALL],
      W: [0, H / 2 - DOOR / 2, WALL, DOOR], E: [W - WALL, H / 2 - DOOR / 2, WALL, DOOR],
    };
    for (const k of ['N', 'S', 'W', 'E']) {
      const [x, y, w, h] = rects[k], horiz = k === 'N' || k === 'S';
      if (room.secret[k]) {
        ctx.strokeStyle = 'rgba(15,8,8,0.55)'; ctx.lineWidth = 2; ctx.beginPath();
        const cx = x + w / 2, cy = y + h / 2;
        if (horiz) { ctx.moveTo(cx - 12, y + 6); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx - 10, y + h - 6); ctx.moveTo(cx + 8, y + 8); ctx.lineTo(cx + 14, cy + 2); }
        else { ctx.moveTo(x + 6, cy - 12); ctx.lineTo(cx, cy - 4); ctx.lineTo(x + w - 6, cy - 10); ctx.moveTo(x + 8, cy + 8); ctx.lineTo(cx + 2, cy + 14); }
        ctx.stroke(); continue;
      }
      if (!room.doors[k]) continue;
      const locked = room.locks[k], open = room.cleared && !locked;
      ctx.fillStyle = locked ? '#b8902f' : open ? '#120c0a' : '#7b3a2c'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = locked ? '#6b5010' : open ? '#6b5348' : '#3d1a12'; ctx.lineWidth = 3; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      if (locked) {
        ctx.fillStyle = '#2a1c05'; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2 - 2, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + w / 2 - 2, y + h / 2, 4, 9);
      } else if (!open) {
        ctx.strokeStyle = '#2a110b'; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 1; i < 4; i++) { if (horiz) { ctx.moveTo(x + w * i / 4, y); ctx.lineTo(x + w * i / 4, y + h); } else { ctx.moveTo(x, y + h * i / 4); ctx.lineTo(x + w, y + h * i / 4); } }
        ctx.stroke();
      }
    }
  }

  function drawRoom(room) {
    const pal = (room.def && room.def.palette) || (room.boss && ['#60363a', '#562f33']) || ['#5b4439', '#523d33'];
    ctx.fillStyle = '#3a2a2a'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = pal[0]; ctx.fillRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
    ctx.fillStyle = pal[1];
    for (let x = WALL; x < W - WALL; x += 44) for (let y = WALL; y < H - WALL; y += 44) {
      if (((x - WALL) / 44 + (y - WALL) / 44) % 2 === 0) ctx.fillRect(x, y, Math.min(44, W - WALL - x), Math.min(44, H - WALL - y));
    }
    ctx.strokeStyle = '#241818'; ctx.lineWidth = 4; ctx.strokeRect(WALL, WALL, W - WALL * 2, H - WALL * 2);
    drawDoors(room);
    for (const ob of room.obstacles) { const d = L.Obstacles.get(ob.id); if (d && d.draw) d.draw(ctx, ob); }
  }

  function drawPlayer(p, G) {
    ctx.save();
    if (p.iframes > 0 && Math.floor(p.iframes * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    const fly = L.Inventory.hasFlag(p, 'flying');
    if (fly) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + p.r + 4, p.r * 0.8, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    const yo = fly ? -5 : 0;
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y + yo, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a4f'; ctx.lineWidth = 2; ctx.stroke();
    D.eyes(ctx, p.x, p.y + yo, p.fx, p.fy, p.r, '#fff');
    ctx.fillStyle = 'rgba(80,160,255,0.9)';
    ctx.beginPath(); ctx.arc(p.x - p.fy * p.r * 0.55 + p.fx * p.r * 0.1, p.y + yo + p.fx * p.r * 0.55 + p.fy * p.r * 0.1 + 4, 2, 0, Math.PI * 2); ctx.fill();
    L.Inventory.emit(p, 'onDrawPlayer', ctx);
    ctx.restore();
    if (p.soul > 0 && false) void G;
    const wd = L.Weapons.active(p);
    if (wd.drawCharge && p.w.charge > 0) wd.drawCharge(ctx, p, p.w);
  }

  function drawWorld() {
    const G = S.game, room = G.room, p = G.player, g = { time: G.time, player: p };
    drawRoom(room);
    for (const pk of room.pickups) L.Pickups.get(pk.type).draw(ctx, pk, G.time);
    for (const b of G.bombList) D.bomb(ctx, b.x, b.y, 9, b.t < 0.5 && Math.floor(b.t * 14) % 2 === 0);
    for (const e of room.enemies) {
      const d = L.Enemies.get(e.type) || L.Bosses.get(e.type);
      ctx.save();
      if (e.spawnT > 0) ctx.globalAlpha = 0.35 + 0.25 * Math.sin(e.spawnT * 30);
      if (d && d.draw) d.draw(ctx, e, g);
      if (e.poison) { ctx.globalAlpha = 0.4; ctx.fillStyle = '#6fe04a'; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    drawPlayer(p, G);
    L.Familiars.draw(ctx, p);
    L.drawProjectiles(ctx);
    for (const t of G.eTears) {
      ctx.fillStyle = '#e04a6a'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#5a1020'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (const f of G.fx) {
      const k = 1 - f.t / f.max;
      ctx.globalAlpha = 0.75 * (1 - k); ctx.fillStyle = '#ffb040';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + 0.6 * k), 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff0a0'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.5 * (1 - k), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    drawHud();
  }

  // ---------------------------------------------------------------------- HUD
  function drawHud() {
    const G = S.game, p = G.player;
    const containers = Math.ceil(p.stats.get('maxHp') / 2), perRow = 8, sz = 19, step = 21;
    let slot = 0;
    const pos = (i) => ({ x: 16 + (i % perRow) * step, y: 14 + Math.floor(i / perRow) * 19 });
    for (let i = 0; i < containers; i++, slot++) {
      const q = pos(slot), left = p.hp - i * 2;
      D.heart(ctx, q.x, q.y, sz, left >= 1 ? 'red' : 'empty', left === 1);
    }
    const souls = Math.ceil(p.soul / 2);
    for (let i = 0; i < souls; i++, slot++) { const q = pos(slot); D.heart(ctx, q.x, q.y, sz, 'soul', p.soul - i * 2 === 1); }
    const rows = Math.max(1, Math.ceil(slot / perRow)), cy = 14 + rows * 19 + 4;
    ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    D.coin(ctx, 14, cy, 5.5); ctx.fillStyle = '#f2e6d8'; ctx.fillText(String(p.coins), 24, cy + 1);
    D.bomb(ctx, 62, cy, 5.5); ctx.fillStyle = '#f2e6d8'; ctx.fillText(String(p.bombs), 72, cy + 1);
    D.key(ctx, 106, cy, 6); ctx.fillStyle = '#f2e6d8'; ctx.fillText(String(p.keys), 118, cy + 1);
    const lives = L.api.lives(p);
    if (lives > 0) { D.heart(ctx, 150, cy, 13, 'soul'); ctx.fillStyle = '#f2e6d8'; ctx.fillText('x' + lives, 160, cy + 1); }

    // objeto activo con barra de carga
    const ai = L.Inventory.activeInfo(p), ay = cy + 20;
    if (ai) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(10, ay, 40, 40);
      L.Sprites.draw(ctx, ai.def.id, 30, ay + 20, 32, { alpha: ai.charge >= ai.max ? 1 : 0.55 });
      ctx.strokeStyle = ai.charge >= ai.max ? '#ffe070' : '#8a7a6a'; ctx.lineWidth = 2; ctx.strokeRect(10, ay, 40, 40);
      for (let i = 0; i < ai.max; i++) {
        const w = 40 / ai.max; ctx.fillStyle = i < ai.charge ? '#7fe0ff' : 'rgba(255,255,255,0.18)';
        ctx.fillRect(54, ay + 36 - (i + 1) * (36 / ai.max) + 1, 5, 36 / ai.max - 2); void w;
      }
    }
    // objetos pasivos y familiares
    const ids = Array.from(p.inv.items.values());
    const iy = ay + (ai ? 48 : 0);
    ids.forEach((inst, i) => {
      const x = 18 + (i % 9) * 17, y = iy + 8 + Math.floor(i / 9) * 17;
      L.Sprites.draw(ctx, inst.def.id, x, y, 16);
      if (inst.stacks > 1) { ctx.fillStyle = '#fff'; ctx.font = 'bold 9px ' + FONT; ctx.textAlign = 'right'; ctx.fillText(String(inst.stacks), x + 8, y + 7); ctx.textAlign = 'left'; }
    });

    // piso / bajas
    ctx.fillStyle = '#f2e6d8'; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'right';
    ctx.fillText('Piso ' + G.floor, W - 76, 16);
    ctx.font = '12px ' + FONT; ctx.fillStyle = '#d9c8b4'; ctx.fillText('Derrotados: ' + G.runKills, W - 76, 32);

    // minimapa
    const cw = 10, ch = 7, gap = 1, x0 = W - 66, y0 = 3, grid = G.map.grid, key = G.map.key;
    for (const r of G.map.rooms) {
      if (r.hiddenRoom || (r.def && r.def.hidden && !r.revealed)) continue;
      let known = r.visited;
      if (!known) for (const d of DIRS) { const nb = r.doors[d.k] && grid[key(r.gx + d.dx, r.gy + d.dy)]; if (nb && nb.visited) known = true; }
      if (!known) continue;
      const x = x0 + r.gx * (cw + gap), y = y0 + r.gy * (ch + gap);
      ctx.fillStyle = r === G.room ? '#ffffff' : r.visited ? '#b9a89a' : '#6a5a50'; ctx.fillRect(x, y, cw, ch);
      if (r.def && r.def.map) { ctx.fillStyle = r.def.map; ctx.fillRect(x + 3, y + 2, 4, 3); }
    }

    // barra del jefe
    const boss = G.room.enemies.find((e) => e.boss);
    if (boss) {
      const bw = 300, bx = W / 2 - bw / 2, by = H - WALL + 14;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 14);
      ctx.fillStyle = '#c4362f'; ctx.fillRect(bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 10);
    }

    // aviso central
    if (G.banner.t > 0) {
      ctx.globalAlpha = clamp(G.banner.t / 0.6, 0, 1); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 28px ' + FONT; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.strokeText(G.banner.text, W / 2, 110); ctx.fillStyle = '#fff3d6'; ctx.fillText(G.banner.text, W / 2, 110);
      if (G.banner.sub) { ctx.font = '16px ' + FONT; ctx.lineWidth = 4; ctx.strokeText(G.banner.sub, W / 2, 138); ctx.fillText(G.banner.sub, W / 2, 138); }
      ctx.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------ Menú / final
  function button(b, color) {
    ctx.fillStyle = color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 20px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }

  function drawMenu() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1b1014'); grad.addColorStop(1, '#3a2024'); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 58px ' + FONT; ctx.lineWidth = 8; ctx.strokeStyle = '#000';
    ctx.strokeText('LÁGRIMAS', W / 2, 62); ctx.fillStyle = '#7fc4ff'; ctx.fillText('LÁGRIMAS', W / 2, 62);
    const list = L.Characters.all(), ch = list.find((c) => c.id === S.charId) || list[0];
    const bob = Math.sin(S.menuT * 3) * 3;
    ctx.fillStyle = ch.color; ctx.beginPath(); ctx.arc(W / 2, 150 + bob, 24, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6a4f'; ctx.lineWidth = 3; ctx.stroke(); D.eyes(ctx, W / 2, 150 + bob, 0, 1, 24, '#fff');
    ctx.fillStyle = '#fff3d6'; ctx.font = 'bold 26px ' + FONT; ctx.fillText(ch.name, W / 2, 205);
    ctx.fillStyle = '#d9c8b4'; ctx.font = '15px ' + FONT; ctx.fillText(ch.desc, W / 2, 238);
    ctx.fillStyle = '#9d8c7c'; ctx.font = '13px ' + FONT; ctx.fillText((list.indexOf(ch) + 1) + ' / ' + list.length, W / 2, 262);
    for (const [r, s] of [[PREV, '‹'], [NEXT, '›']]) {
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#fff3d6'; ctx.font = 'bold 40px ' + FONT; ctx.fillText(s, r.x + r.w / 2, r.y + r.h / 2);
    }
    button(BTN_PLAY, '#a02a36');
    ctx.fillStyle = '#d9c8b4'; ctx.font = '14px ' + FONT;
    ctx.fillText('Récord de piso: ' + S.save.bestFloor + '   ·   Enemigos derrotados: ' + S.save.totalKills, W / 2, 396);
    ctx.fillStyle = '#9d8c7c'; ctx.font = '12px ' + FONT;
    ctx.fillText('Izq: moverse · Der: disparar · Bomba · Objeto activo (Q / botón)', W / 2, 422);
  }

  function drawGameOver() {
    const G = S.game;
    ctx.fillStyle = 'rgba(10,0,0,0.78)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 54px ' + FONT; ctx.fillStyle = '#e8384f'; ctx.fillText('GAME OVER', W / 2, 90);
    ctx.fillStyle = '#f2e6d8'; ctx.font = '18px ' + FONT;
    ctx.fillText('Llegaste al piso ' + G.floor + '  ·  Derrotados: ' + G.runKills, W / 2, 150);
    ctx.fillText('Récord de piso: ' + S.save.bestFloor + '  ·  Total derrotados: ' + S.save.totalKills, W / 2, 182);
    const items = Array.from(G.player.inv.items.values());
    items.slice(0, 28).forEach((inst, i) => L.Sprites.draw(ctx, inst.def.id, W / 2 - 14 * Math.min(items.length, 14) + (i % 14) * 28 + 14, 222 + Math.floor(i / 14) * 28, 24));
    button(BTN_RESTART, '#a02a36'); button(BTN_MENU, '#3a4a6a');
  }

  function drawSticks() {
    const R = L.Input.stickR(), sticks = L.Input.sticks;
    ctx.save(); ctx.globalAlpha = 0.5;
    for (const which of ['move', 'aim']) {
      const s = sticks[which], h = L.Input.home(which), act = s.id !== null;
      const bx = act ? s.ox : h.x, by = act ? s.oy : h.y;
      let kx = bx, ky = by;
      if (act) { const dx = s.x - s.ox, dy = s.y - s.oy, l = Math.hypot(dx, dy), k = l > R ? R / l : 1; kx = bx + dx * k; ky = by + dy * k; }
      ctx.fillStyle = 'rgba(' + (which === 'move' ? '120,170,255' : '255,140,140') + ',0.35)';
      ctx.beginPath(); ctx.arc(bx, by, R, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(kx, ky, R * 0.42, 0, Math.PI * 2); ctx.fill();
    }
    const b = L.Input.bombButton(), a = L.Input.activeButton(), p = S.game.player, ai = L.Inventory.activeInfo(p);
    for (const [btn, tint] of [[b, '255,200,120'], [a, ai && ai.charge >= ai.max ? '120,230,255' : '160,160,160']]) {
      ctx.fillStyle = 'rgba(' + tint + ',0.3)'; ctx.beginPath(); ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.8; ctx.translate(b.x, b.y - b.r * 0.08); ctx.scale(b.r / 14, b.r / 14); D.bomb(ctx, 0, 0, 9); ctx.restore();
    if (ai) L.Sprites.draw(ctx, ai.def.id, a.x, a.y, a.r * 1.3, { alpha: ai.charge >= ai.max ? 0.95 : 0.5 });
    ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(b.r * 0.55) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('x' + p.bombs, b.x, b.y + b.r * 0.62); ctx.restore();
  }

  L.Render = {
    draw() {
      ctx = View.ctx;
      ctx.setTransform(View.dpr, 0, 0, View.dpr, 0, 0); ctx.globalAlpha = 1;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, View.sw, View.sh);
      ctx.save();
      let sx = 0, sy = 0;
      if (S.game && S.game.shake > 0 && S.state === 'playing') { sx = rand(-3, 3) * S.game.shake * 4; sy = rand(-3, 3) * S.game.shake * 4; }
      ctx.translate(View.offX + sx * View.scale, View.offY + sy * View.scale); ctx.scale(View.scale, View.scale);
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      if (S.state === 'menu') drawMenu(); else { drawWorld(); if (S.state === 'gameover') drawGameOver(); }
      ctx.restore();
      if (S.state === 'playing') drawSticks();
    },
  };
})();
