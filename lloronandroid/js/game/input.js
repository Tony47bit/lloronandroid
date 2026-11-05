/* ==========================================================================
   Entrada (sticks táctiles flotantes, teclado, botones de bomba y activo) y
   escalado de pantalla (L.View).
   ========================================================================== */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const { W, H } = L.C;
  const { clamp } = L.util;

  const View = L.View = {
    canvas: null, ctx: null, dpr: 1, sw: 0, sh: 0, scale: 1, offX: 0, offY: 0,
    init(canvas) { View.canvas = canvas; View.ctx = canvas.getContext('2d'); View.resize(); },
    resize() {
      const c = View.canvas;
      View.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      View.sw = window.innerWidth; View.sh = window.innerHeight;
      c.width = Math.floor(View.sw * View.dpr); c.height = Math.floor(View.sh * View.dpr);
      c.style.width = View.sw + 'px'; c.style.height = View.sh + 'px';
      View.scale = Math.min(View.sw / W, View.sh / H);
      View.offX = (View.sw - W * View.scale) / 2; View.offY = (View.sh - H * View.scale) / 2;
    },
    toLogical: (px, py) => ({ x: (px - View.offX) / View.scale, y: (py - View.offY) / View.scale }),
  };

  const mk = () => ({ id: null, ox: 0, oy: 0, x: 0, y: 0, vx: 0, vy: 0 });
  const sticks = { move: mk(), aim: mk() };
  const keys = {};
  let bombQ = false, activeQ = false;

  const stickR = () => clamp(Math.min(View.sw, View.sh) * 0.16, 48, 95);
  const home = (which) => { const R = stickR(); return which === 'move' ? { x: R * 1.7, y: View.sh - R * 1.7 } : { x: View.sw - R * 1.7, y: View.sh - R * 1.7 }; };
  const bombButton = () => { const R = stickR(); return { x: View.sw - R * 1.15, y: View.sh - R * 4.0, r: R * 0.5 }; };
  const activeButton = () => { const R = stickR(); return { x: View.sw - R * 2.75, y: View.sh - R * 3.7, r: R * 0.5 }; };

  function upd(s) {
    const R = stickR(), dx = s.x - s.ox, dy = s.y - s.oy, len = Math.hypot(dx, dy);
    if (len < 1e-6) { s.vx = 0; s.vy = 0; return; }
    const m = Math.min(len, R) / R; s.vx = dx / len * m; s.vy = dy / len * m;
  }
  const rel = (s) => { s.id = null; s.vx = 0; s.vy = 0; };

  const Input = L.Input = {
    sticks, bombButton, activeButton, stickR, home,
    release() { rel(sticks.move); rel(sticks.aim); bombQ = activeQ = false; },
    takeBomb() { const v = bombQ; bombQ = false; return v; },
    takeActive() { const v = activeQ; activeQ = false; return v; },
    /** Movimiento en 8 direcciones. */
    move() {
      const s = sticks.move;
      if (Math.hypot(s.vx, s.vy) > 0.25) { const a = Math.round(Math.atan2(s.vy, s.vx) / (Math.PI / 4)) * (Math.PI / 4); return { x: Math.cos(a), y: Math.sin(a) }; }
      let x = 0, y = 0;
      if (keys.KeyA) x--; if (keys.KeyD) x++; if (keys.KeyW) y--; if (keys.KeyS) y++;
      const l = Math.hypot(x, y); return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
    },
    /** Dirección exacta de apuntado o null si no se apunta. */
    aim() {
      const s = sticks.aim, m = Math.hypot(s.vx, s.vy);
      if (m > 0.25) return { x: s.vx / m, y: s.vy / m };
      let x = 0, y = 0;
      if (keys.ArrowLeft) x--; if (keys.ArrowRight) x++; if (keys.ArrowUp) y--; if (keys.ArrowDown) y++;
      const l = Math.hypot(x, y); return l ? { x: x / l, y: y / l } : null;
    },
    bind(canvas) {
      const S = L.S;
      canvas.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignorar */ }
        if (S.state !== 'playing') { const q = View.toLogical(e.clientX, e.clientY); L.UI.tap(q.x, q.y); return; }
        for (const [b, fn] of [[bombButton(), () => { bombQ = true; }], [activeButton(), () => { activeQ = true; }]]) {
          if (Math.hypot(e.clientX - b.x, e.clientY - b.y) <= b.r * 1.15) { fn(); return; }
        }
        const s = e.clientX < View.sw / 2 ? sticks.move : sticks.aim;
        if (s.id !== null) return;
        s.id = e.pointerId; s.ox = s.x = e.clientX; s.oy = s.y = e.clientY; upd(s);
      });
      canvas.addEventListener('pointermove', (e) => {
        e.preventDefault();
        for (const s of [sticks.move, sticks.aim]) if (s.id === e.pointerId) { s.x = e.clientX; s.y = e.clientY; upd(s); }
      });
      const end = (e) => { for (const s of [sticks.move, sticks.aim]) if (s.id === e.pointerId) rel(s); };
      canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('blur', () => { Input.release(); for (const k in keys) keys[k] = false; });
      document.addEventListener('visibilitychange', () => { if (document.hidden) L.Save.write(); });
      window.addEventListener('resize', View.resize);
      window.addEventListener('orientationchange', () => setTimeout(View.resize, 150));
      window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
        if (S.state !== 'playing') { L.UI.key(e.code); return; }
        if ((e.code === 'KeyE' || e.code === 'KeyB') && !e.repeat) bombQ = true;
        if ((e.code === 'KeyQ' || e.code === 'Space') && !e.repeat) activeQ = true;
      });
      window.addEventListener('keyup', (e) => { keys[e.code] = false; });
    },
  };
})();
