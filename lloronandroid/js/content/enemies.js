/* ==========================================================================
   Enemigos normales (registro L.Enemies).

   Para añadir un enemigo nuevo basta con registrarlo aquí o en un archivo
   nuevo listado en js/manifest.js:

     L.Enemies.register({
       id, weight, minFloor, group?:n,       // sorteo por sala (group = cuántos salen juntos)
       r, fly, hp:(floor)=>n, speed:(floor)=>n,
       contact: 2,                           // daño por contacto (medios corazones)
       init(e, floor, api),                  // estado propio (e.t, e.ph...)
       update(e, api, dt),                   // movimiento/ataques (api.player(), api.enemyTear...)
       draw(c, e, g)                         // g = { time, player }
     });
   El motor aplica colisión con terreno (según `fly`), daño, veneno, botín y
   conteo de bajas; el enemigo solo describe su comportamiento.
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { rand } = L.util;
  const D = L.draw;
  const dir = (e, p) => Math.atan2(p.y - e.y, p.x - e.x);

  function wings(c, e, g, color) {
    const flap = 0.5 + 0.5 * Math.abs(Math.sin(g.time * 38 + e.x));
    c.fillStyle = color;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.ellipse(e.x + s * e.r * 0.9, e.y - e.r * 0.5, e.r * 0.8, e.r * 0.5 * flap + 1, s * 0.5, 0, Math.PI * 2);
      c.fill();
    }
  }
  L.draw.wings = wings;

  L.Enemies.registerAll([
    { // mosca errática
      id: 'fly', weight: 3, minFloor: 1, group: 2, r: 7, fly: true,
      hp: (f) => 2 + Math.floor((f - 1) * 0.5), speed: () => 78,
      init(e) { e.ph = rand(0, 6); e.seed = rand(0, 6); },
      update(e, api, dt) {
        const a = dir(e, api.player()) + Math.sin((e.ph += dt * 6) + e.seed);
        e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt;
      },
      draw(c, e, g) {
        const a = dir(e, g.player), dx = Math.cos(a), dy = Math.sin(a);
        wings(c, e, g, 'rgba(230,230,255,0.75)');
        c.fillStyle = e.flash > 0 ? '#fff' : '#26262c';
        c.beginPath(); c.arc(e.x, e.y, e.r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#d33';
        c.beginPath(); c.arc(e.x + dx * 2 - dy * 2.5, e.y + dy * 2 + dx * 2.5, 1.6, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(e.x + dx * 2 + dy * 2.5, e.y + dy * 2 - dx * 2.5, 1.6, 0, Math.PI * 2); c.fill();
      },
    },
    { // perseguidor
      id: 'gaper', weight: 3, minFloor: 1, r: 12,
      hp: (f) => 4 + Math.floor((f - 1) * 0.7), speed: (f) => Math.min(58 + (f - 1) * 5, 95),
      update(e, api, dt) {
        const a = dir(e, api.player());
        e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt;
      },
      draw(c, e, g) {
        const a = dir(e, g.player);
        c.fillStyle = e.flash > 0 ? '#fff' : '#c4362f';
        c.beginPath(); c.arc(e.x, e.y, e.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#5c120e'; c.lineWidth = 2; c.stroke();
        D.eyes(c, e.x, e.y, Math.cos(a), Math.sin(a), e.r, '#ffe');
      },
    },
    { // araña saltarina
      id: 'spider', weight: 2.5, minFloor: 1, r: 9,
      hp: (f) => 3 + Math.floor((f - 1) * 0.6), speed: () => 30,
      init(e) { e.st = 'wait'; e.t = rand(0.3, 0.9); e.dx = 0; e.dy = 0; },
      update(e, api, dt) {
        const a = dir(e, api.player());
        e.t -= dt;
        if (e.st === 'wait') {
          e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt;
          if (e.t <= 0) { e.st = 'leap'; e.t = 0.35; e.dx = Math.cos(a); e.dy = Math.sin(a); }
        } else {
          e.x += e.dx * 240 * dt; e.y += e.dy * 240 * dt;
          if (e.t <= 0) { e.st = 'wait'; e.t = rand(0.5, 1.0); }
        }
      },
      draw(c, e, g) {
        const a = dir(e, g.player), dx = Math.cos(a), dy = Math.sin(a), leap = e.st === 'leap';
        c.strokeStyle = e.flash > 0 ? '#fff' : '#1a1a1a'; c.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const ang = i * Math.PI / 4 + Math.PI / 8 + (leap ? 0 : Math.sin(g.time * 14 + i) * 0.12);
          const l1 = e.r * (leap ? 1.9 : 1.5);
          c.beginPath(); c.moveTo(e.x, e.y);
          c.lineTo(e.x + Math.cos(ang) * l1, e.y + Math.sin(ang) * l1 - 3);
          c.lineTo(e.x + Math.cos(ang) * l1 * 1.3, e.y + Math.sin(ang) * l1 * 1.3 + 2);
          c.stroke();
        }
        c.fillStyle = e.flash > 0 ? '#fff' : '#2b2b2b';
        c.beginPath(); c.arc(e.x, e.y, e.r, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#e33';
        c.beginPath(); c.arc(e.x + dx * 3 - dy * 3, e.y + dy * 3 + dx * 3, 1.8, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.arc(e.x + dx * 3 + dy * 3, e.y + dy * 3 - dx * 3, 1.8, 0, Math.PI * 2); c.fill();
      },
    },
    { // se acerca hasta su rango y dispara
      id: 'host', weight: 2, minFloor: 1, r: 12,
      hp: (f) => 5 + Math.floor((f - 1) * 0.8), speed: () => 46,
      init(e) { e.range = 175; e.t = rand(0.8, 1.4); },
      update(e, api, dt) {
        const p = api.player(), a = dir(e, p), d = Math.hypot(p.x - e.x, p.y - e.y), f = api.floor();
        if (d > e.range) { e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; return; }
        if (d < 110) { e.x -= Math.cos(a) * e.speed * 0.6 * dt; e.y -= Math.sin(a) * e.speed * 0.6 * dt; }
        if ((e.t -= dt) <= 0) {
          const sp = 150 + f * 5;
          if (f >= 3) for (let i = -1; i <= 1; i++) api.enemyTear(e.x, e.y, a + i * 0.25, sp);
          else api.enemyTear(e.x, e.y, a + rand(-0.1, 0.1), sp);
          e.t = rand(1.5, 2.3);
        }
      },
      draw(c, e, g) {
        const a = dir(e, g.player);
        c.fillStyle = e.flash > 0 ? '#fff' : '#7d3fb8';
        c.fillRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
        c.strokeStyle = '#341857'; c.lineWidth = 2; c.strokeRect(e.x - e.r, e.y - e.r, e.r * 2, e.r * 2);
        D.eyes(c, e.x, e.y, Math.cos(a), Math.sin(a), e.r, '#fe9');
        if (Math.hypot(g.player.x - e.x, g.player.y - e.y) <= e.range && e.t < 0.4) {
          c.fillStyle = '#1a0a26'; c.fillRect(e.x - 6, e.y + 3, 12, 6);
        }
      },
    },
    { // mosca que flota alrededor disparando
      id: 'pooter', weight: 2, minFloor: 1, r: 9, fly: true,
      hp: (f) => 3 + Math.floor((f - 1) * 0.6), speed: () => 52,
      init(e) { e.range = 195; e.t = rand(0.8, 1.6); e.ph = rand(0, 6); e.orbit = Math.random() < 0.5 ? 1 : -1; },
      update(e, api, dt) {
        const p = api.player(), a0 = dir(e, p), d = Math.hypot(p.x - e.x, p.y - e.y);
        e.ph += dt * 5;
        if (d > e.range) {
          const a = a0 + Math.sin(e.ph) * 0.5;
          e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt;
          return;
        }
        const a = a0 + Math.PI / 2 * e.orbit;
        e.x += Math.cos(a) * e.speed * 0.5 * dt; e.y += Math.sin(a) * e.speed * 0.5 * dt;
        if ((e.t -= dt) <= 0) { api.enemyTear(e.x, e.y, a0 + rand(-0.12, 0.12), 140 + api.floor() * 5); e.t = rand(1.7, 2.6); }
      },
      draw(c, e, g) {
        const a = dir(e, g.player), dx = Math.cos(a), dy = Math.sin(a);
        wings(c, e, g, 'rgba(200,255,200,0.7)');
        c.fillStyle = e.flash > 0 ? '#fff' : '#8fb04a';
        c.beginPath(); c.arc(e.x, e.y, e.r, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#3d5018'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#3d5018';
        c.beginPath(); c.arc(e.x + dx * e.r * 0.8, e.y + dy * e.r * 0.8, 3, 0, Math.PI * 2); c.fill();
        D.eyes(c, e.x, e.y, dx, dy, e.r * 0.9, '#efe');
      },
    },
  ]);
})();
