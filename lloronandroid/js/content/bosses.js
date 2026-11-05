/* ==========================================================================
   Jefes (registro L.Bosses).  Cada jefe es una definición independiente:

     L.Bosses.register({
       id, name, weight, minFloor, maxFloor?, r, fly?,
       hp:(floor)=>n, speed:(floor)=>n,
       init(e, floor, api), update(e, api, dt), draw(c, e, g),
       onDeath?(api, e)
     });
   Al generar el piso se sortea un jefe entre los que cumplen minFloor/maxFloor
   (ponderado por `weight`); el motor lo trata como un enemigo más (e.boss=true)
   con barra de vida, botín propio y trampilla al morir.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { rand } = L.util;
  const D = L.draw;
  const dir = (e, p) => Math.atan2(p.y - e.y, p.x - e.x);
  const ring = (api, e, n, rot, sp, r) => { for (let i = 0; i < n; i++) api.enemyTear(e.x, e.y, rot + i * Math.PI * 2 / n, sp, r); };

  L.Bosses.registerAll([
    { // Rey Hinchado: patrones de anillo, abanico e invocación
      id: 'rey_hinchado', name: 'REY HINCHADO', weight: 3, minFloor: 1, r: 34,
      hp: (f) => 40 + 15 * (f - 1), speed: () => 38,
      init(e) { e.t = 1.5; e.pat = -1; e.rot = 0; },
      update(e, api, dt) {
        const p = api.player(), a = dir(e, p);
        e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt;
        if ((e.t -= dt) > 0) return;
        const rage = e.hp < e.maxHp * 0.5;
        e.pat = (e.pat + 1) % 3;
        if (e.pat === 0) { e.rot += 0.3; ring(api, e, rage ? 16 : 12, e.rot, 130, 6); }
        else if (e.pat === 1) {
          const n = rage ? 5 : 3;
          for (let i = 0; i < n; i++) api.enemyTear(e.x, e.y, a + (i - (n - 1) / 2) * 0.28, 190, 6);
        } else if (api.enemies().length < 5) {
          api.spawnEnemy(Math.random() < 0.5 ? 'gaper' : 'fly', e.x + rand(-40, 40), e.y + rand(-40, 40), { spawnT: 0.5 });
        } else ring(api, e, 10, 0, 150, 6);
        e.t = rage ? 1.4 : 2.0;
      },
      draw(c, e, g) {
        const a = dir(e, g.player);
        c.fillStyle = e.flash > 0 ? '#fff' : '#8c1f2a';
        c.beginPath(); c.arc(e.x, e.y, e.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#3a0a10'; c.lineWidth = 4; c.stroke();
        c.fillStyle = '#e8c33a';
        c.beginPath();
        c.moveTo(e.x - 20, e.y - e.r + 2); c.lineTo(e.x - 20, e.y - e.r - 14); c.lineTo(e.x - 10, e.y - e.r - 5);
        c.lineTo(e.x, e.y - e.r - 16); c.lineTo(e.x + 10, e.y - e.r - 5); c.lineTo(e.x + 20, e.y - e.r - 14);
        c.lineTo(e.x + 20, e.y - e.r + 2); c.closePath(); c.fill();
        D.eyes(c, e.x, e.y, Math.cos(a), Math.sin(a), e.r, '#ffd');
      },
    },
    { // Reina Mosca: voladora, embiste y suelta moscas
      id: 'reina_mosca', name: 'REINA MOSCA', weight: 3, minFloor: 1, r: 30, fly: true,
      hp: (f) => 34 + 13 * (f - 1), speed: () => 60,
      init(e) { e.t = 1.6; e.st = 'hover'; e.ph = 0; e.dx = 0; e.dy = 0; e.n = 0; },
      update(e, api, dt) {
        const p = api.player(), a = dir(e, p);
        e.ph += dt * 3;
        const rage = e.hp < e.maxHp * 0.5;
        e.t -= dt;
        if (e.st === 'hover') {
          const o = a + Math.PI / 2 + Math.sin(e.ph) * 0.5;
          e.x += Math.cos(o) * e.speed * dt; e.y += Math.sin(o) * e.speed * dt;
          if (e.t <= 0) {
            e.n++;
            if (e.n % 3 === 0) { e.st = 'wind'; e.t = 0.6; }
            else if (e.n % 3 === 1) {
              if (api.enemies().length < 6) { api.spawnEnemy('fly', e.x, e.y, { spawnT: 0.4 }); api.spawnEnemy('fly', e.x, e.y, { spawnT: 0.4 }); }
              e.t = 1.3;
            } else { ring(api, e, rage ? 12 : 8, a, 150, 5); e.t = rage ? 1.1 : 1.6; }
          }
        } else if (e.st === 'wind') { // se prepara y apunta
          e.dx = Math.cos(a); e.dy = Math.sin(a);
          if (e.t <= 0) { e.st = 'dash'; e.t = rage ? 0.7 : 0.55; }
        } else {
          e.x += e.dx * 300 * dt; e.y += e.dy * 300 * dt;
          if (e.t <= 0) { e.st = 'hover'; e.t = 1.2; }
        }
      },
      draw(c, e, g) {
        const a = dir(e, g.player), flap = Math.abs(Math.sin(g.time * 22));
        c.fillStyle = 'rgba(220,220,255,0.7)';
        for (const s of [-1, 1]) {
          c.beginPath(); c.ellipse(e.x + s * e.r * 0.95, e.y - e.r * 0.3, e.r * 0.85, e.r * 0.45 * (0.4 + flap) + 2, s * 0.5, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = e.flash > 0 ? '#fff' : (e.st === 'wind' ? '#7a2c8c' : '#3b2a4d');
        c.beginPath(); c.arc(e.x, e.y, e.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#15101c'; c.lineWidth = 4; c.stroke();
        c.fillStyle = '#e8c33a';
        c.beginPath(); c.moveTo(e.x - 14, e.y - e.r + 3); c.lineTo(e.x - 14, e.y - e.r - 11);
        c.lineTo(e.x - 5, e.y - e.r - 3); c.lineTo(e.x, e.y - e.r - 12); c.lineTo(e.x + 5, e.y - e.r - 3);
        c.lineTo(e.x + 14, e.y - e.r - 11); c.lineTo(e.x + 14, e.y - e.r + 3); c.closePath(); c.fill();
        D.eyes(c, e.x, e.y, Math.cos(a), Math.sin(a), e.r, '#fdd');
      },
    },
  ]);
})();
