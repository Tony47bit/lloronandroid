/* ==========================================================================
   Armas (modos de disparo) y control de carga.

   Un objeto pide un arma con `weapon:{ id:'brimstone', priority:50 }`; gana la
   de mayor prioridad (a igualdad, la última recogida). Sin petición se usa
   'normal'. Las "lágrimas" modificadas por objetos (homing, bounce...) se
   aplican a las armas que usan lágrimas; los rayos/bombas/cuchillos solo
   heredan lo que declaran (`supports`).

   Contrato de un arma:
     { id, input:'auto'|'charge'|fn(p), charge:{time,min}, rate, canFire(p),
       supports:[...], fire(p, shot), drawCharge(c, p, w) }
   `shot` = { weapon, p, x, y, ax, ay, angle, charge, dmg, dmgMul, shots, speed,
              range, size, cross, behaviors } ; los objetos lo modifican en el
              hook onFire(ctx, shot).
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { clamp, lerp } = L.util;
  const { W, H, WALL } = L.C;
  const game = () => L.S.game;
  const Wp = L.Weapons;

  /** Arma activa del jugador según los objetos poseídos. */
  Wp.active = function (p) {
    const reqs = L.Inventory.weaponRequests(p);
    let best = null;
    for (const r of reqs) if (!best || r.priority > best.priority || (r.priority === best.priority && r.order > best.order)) best = r;
    return (best && Wp.get(best.id)) || Wp.get('normal');
  };

  /** Ángulos de un disparo: abanico, o 4 direcciones (Loki). */
  Wp.pattern = function (shot) {
    const base = shot.angle;
    if (shot.cross) return [0, 1, 2, 3].map((k) => base + k * Math.PI / 2);
    const n = clamp(Math.round(shot.shots), 1, 8);
    const step = n <= 2 ? 0.16 : 0.2;
    const out = [];
    for (let i = 0; i < n; i++) out.push(base + (i - (n - 1) / 2) * step);
    return out;
  };

  Wp.buildShot = function (p, wd, ax, ay, charge) {
    const st = p.stats;
    const behaviors = L.Inventory.tearBehaviors(p, wd.id);
    const sup = wd.supports;
    const shot = {
      weapon: wd.id, p, x: p.x, y: p.y, ax, ay, angle: Math.atan2(ay, ax), charge,
      dmg: st.get('damage'), dmgMul: 1, shots: st.get('shots'), speed: st.get('shotSpeed'),
      range: st.get('range'), size: st.get('tearSize'), cross: false,
      behaviors: sup ? behaviors.filter((b) => sup.includes(b.id)) : behaviors,
    };
    L.Inventory.emit(p, 'onFire', shot);
    return shot;
  };

  /** Crea una lágrima estándar desde un disparo (usada por 'normal' y por objetos). */
  Wp.tear = function (p, shot, ang, extra) {
    const dmg = shot.dmg * shot.dmgMul;
    return L.spawnTear(p, Object.assign({
      x: p.x + Math.cos(ang) * p.r, y: p.y + Math.sin(ang) * p.r, angle: ang, speed: shot.speed,
      dmg, r: (4 + Math.min(dmg, 6) * 0.9) * shot.size, range: shot.range, behaviors: shot.behaviors,
      inheritVx: p.vx * 0.35, inheritVy: p.vy * 0.35,
    }, extra || {}));
  };

  function fire(p, wd, ax, ay, charge) {
    const shot = Wp.buildShot(p, wd, ax, ay, charge);
    wd.fire(p, shot);
  }

  /** Se llama cada frame con el vector de apuntado (o null). */
  Wp.update = function (p, dt, aim) {
    const w = p.w, wd = Wp.active(p);
    w.cool -= dt;
    if (wd.id !== w.id) { w.id = wd.id; w.charge = 0; }
    p.aimNow = aim;
    const input = typeof wd.input === 'function' ? wd.input(p) : (wd.input || 'auto');
    const delay = p.stats.get('fireDelay');
    w.input = input;
    if (wd.canFire && !wd.canFire(p)) { return; }
    if (input === 'auto') {
      w.charge = 0;
      if (aim && w.cool <= 0) { fire(p, wd, aim.x, aim.y, 1); w.cool = delay * (wd.rate || 1); }
      return;
    }
    const ct = (wd.charge.time) * (delay / 0.38);
    if (aim) {
      if (w.cool <= 0) { w.charge = Math.min(1, w.charge + dt / ct); w.aim = aim; }
    } else if (w.charge > 0) {
      if (w.aim && w.charge >= (wd.charge.min || 0)) {
        fire(p, wd, w.aim.x, w.aim.y, w.charge);
        w.cool = 0.1 + delay * (wd.rate || 0.5);
      }
      w.charge = 0;
    }
  };

  // ------------------------------------------------------------------ normal
  Wp.register({
    id: 'normal', priority: 0,
    input: (p) => (L.Inventory.hasFlag(p, 'chargeShots') ? 'charge' : 'auto'),
    charge: { time: 0.5, min: 0 },
    fire(p, shot) { for (const a of Wp.pattern(shot)) Wp.tear(p, shot, a); },
  });

  // -------------------------------------------------- Technology: rayo láser
  Wp.register({
    id: 'technology', priority: 40, rate: 1.15,
    supports: ['poison', 'holy'],
    fire(p, shot) {
      for (const a of Wp.pattern(shot)) {
        game().proj.push({
          kind: 'beam', x: p.x, y: p.y, angle: a, follow: null, life: 0.14, maxLife: 0.14, tick: 0, interval: 99,
          dmg: shot.dmg * shot.dmgMul * 0.8, width: 4, color: '#38c8ff', core: '#ffffff',
          poison: shot.behaviors.some((b) => b.id === 'poison'), ex: p.x, ey: p.y,
        });
      }
    },
  });

  // -------------------------------------------------------- Brimstone: rayo cargado
  Wp.register({
    id: 'brimstone', priority: 50, input: 'charge', charge: { time: 0.65, min: 0.95 }, rate: 1.2,
    supports: ['poison'],
    fire(p, shot) {
      for (const a of Wp.pattern(shot)) {
        game().proj.push({
          kind: 'beam', x: p.x, y: p.y, angle: a, follow: p, life: 0.5, maxLife: 0.5, tick: 0, interval: 0.1,
          dmg: shot.dmg * shot.dmgMul * 1.15, width: 16, color: '#b01818', core: '#ff7a5a',
          poison: shot.behaviors.some((b) => b.id === 'poison'), breakObstacles: true, ex: p.x, ey: p.y,
        });
      }
    },
    drawCharge(c, p, w) { ringCharge(c, p, w, '#ff4a3a'); },
  });

  // ------------------------------------------------------------ Dr. Fetus: bombas
  Wp.register({
    id: 'dr_fetus', priority: 60, rate: 2.0,
    supports: [],
    fire(p, shot) {
      const bomb = p.stats.get('bombRadius') / 75;
      for (const a of Wp.pattern(shot)) {
        game().proj.push({
          kind: 'fbomb', x: p.x + Math.cos(a) * p.r, y: p.y + Math.sin(a) * p.r, r: 8,
          vx: Math.cos(a) * 330 + p.vx * 0.3, vy: Math.sin(a) * 330 + p.vy * 0.3, life: 1.3,
          radius: 52 * bomb, dmg: 6 + shot.dmg * shot.dmgMul * 4,
        });
      }
    },
  });

  // ---------------------------------------------- Epic Fetus: misiles dirigidos
  Wp.register({
    id: 'epic_fetus', priority: 70, input: 'charge', charge: { time: 0.5, min: 0.12 }, rate: 2.2,
    supports: [],
    fire(p, shot) {
      const dist = lerp(80, 270, shot.charge);
      const bomb = p.stats.get('bombRadius') / 75;
      const tx = clamp(p.x + shot.ax * dist, WALL + 8, W - WALL - 8);
      const ty = clamp(p.y + shot.ay * dist, WALL + 8, H - WALL - 8);
      game().proj.push({
        kind: 'missile', x: p.x, y: p.y, tx, ty, speed: 120, angle: shot.angle, age: 0,
        radius: 62 * bomb, dmg: 10 + shot.dmg * shot.dmgMul * 5, hurt: true,
      });
    },
    drawCharge(c, p, w) {
      if (!w.aim) return;
      const d = lerp(80, 270, w.charge);
      const tx = clamp(p.x + w.aim.x * d, WALL + 8, W - WALL - 8), ty = clamp(p.y + w.aim.y * d, WALL + 8, H - WALL - 8);
      c.strokeStyle = 'rgba(255,80,60,0.85)'; c.lineWidth = 2;
      c.beginPath(); c.arc(tx, ty, 12, 0, Math.PI * 2); c.moveTo(tx - 17, ty); c.lineTo(tx + 17, ty);
      c.moveTo(tx, ty - 17); c.lineTo(tx, ty + 17); c.stroke();
    },
  });

  // ------------------------------------------------------- Cuchillo de Mamá
  Wp.register({
    id: 'moms_knife', priority: 80, input: 'charge', charge: { time: 0.55, min: 0 }, rate: 0.4,
    supports: ['poison'],
    canFire: (p) => !p.w.knife,
    fire(p, shot) {
      const k = {
        kind: 'knife', src: p, x: p.x, y: p.y, angle: shot.angle, phase: 'out', dist: 0,
        maxDist: lerp(70, 290, shot.charge), speed: 520, hit: new Set(), hitOb: new Set(),
        dmg: shot.dmg * shot.dmgMul * lerp(1, 2.8, shot.charge) * 1.2,
        poison: shot.behaviors.some((b) => b.id === 'poison'),
      };
      p.w.knife = k;
      game().proj.push(k);
    },
    drawCharge(c, p, w) { ringCharge(c, p, w, '#ffffff'); },
  });

  function ringCharge(c, p, w, color) {
    if (w.charge <= 0.02) return;
    c.save();
    c.strokeStyle = color; c.lineWidth = 3; c.globalAlpha = 0.85;
    c.beginPath(); c.arc(p.x, p.y, p.r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * w.charge); c.stroke();
    c.restore();
  }
  Wp.ringCharge = ringCharge;
})();
