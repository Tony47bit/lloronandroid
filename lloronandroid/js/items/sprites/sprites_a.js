/* Sprites originales — grupo A (estadísticas, lágrimas, vida y extras).
   Lienzo lógico 64x64, origen en el centro. Cada función es independiente. */
(function () {
  'use strict';
  const S = window.Lagrimas.Sprites;
  const O = S.g.OUT;
  const def = (id, fn) => S.define(id, fn);

  // Pequeño brillo blanco translúcido
  const shine = (c, g, x, y, rx, ry, rot) => g.ellipse(c, x, y, rx, ry, 'rgba(255,255,255,0.45)', null, 0, rot || 0);

  /* ------------------------------ 1. Estadísticas ------------------------------ */
  def('sad_onion', (c, g) => {
    g.poly(c, [[-4, -19], [0, -31], [5, -19]], '#5fae3a', O, 2);
    c.beginPath(); c.moveTo(0, -22);
    c.bezierCurveTo(24, -12, 28, 6, 16, 20); c.bezierCurveTo(8, 30, -8, 30, -16, 20);
    c.bezierCurveTo(-28, 6, -24, -12, 0, -22); c.closePath();
    c.fillStyle = '#9b55cc'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
    shine(c, g, -13, -4, 3.2, 7, 0.35);
    g.ellipse(c, -8, 4, 6.5, 8, '#fff', O, 1.6); g.ellipse(c, 8, 4, 6.5, 8, '#fff', O, 1.6);
    g.circle(c, -8, 7, 3.6, '#222'); g.circle(c, 8, 7, 3.6, '#222');
    g.line(c, -15, -2, -4, -8, O, 2.2); g.line(c, 15, -2, 4, -8, O, 2.2);
    c.beginPath(); c.arc(0, 24, 5, Math.PI * 1.15, Math.PI * 1.85); c.strokeStyle = O; c.lineWidth = 2; c.stroke();
    g.poly(c, [[-13, 12], [-16, 18], [-10, 18]], '#58b6f0', null);
    g.circle(c, -13, 18, 3, '#58b6f0');
  });

  def('inner_eye', (c, g) => {
    c.beginPath(); c.moveTo(-29, 0); c.quadraticCurveTo(0, -36, 29, 0); c.quadraticCurveTo(0, 36, -29, 0); c.closePath();
    c.fillStyle = '#fff'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.6; c.stroke();
    g.line(c, -26, 1, -19, 3, '#d9566a', 1.4); g.line(c, 26, 1, 19, 3, '#d9566a', 1.4);
    g.circle(c, 0, 0, 15, '#5a3a86', O, 2); g.circle(c, 0, 0, 10.5, '#1d0f2b'); g.circle(c, 0, 0, 6, '#000');
    g.circle(c, -5, -5, 3.4, '#fff'); g.circle(c, 4, 4, 1.6, 'rgba(255,255,255,0.7)');
  });

  def('spoon_bender', (c, g) => {
    const handle = () => { c.beginPath(); c.moveTo(-24, 26); c.quadraticCurveTo(-8, 24, -3, 8); c.quadraticCurveTo(2, -6, 9, -8); };
    handle(); c.strokeStyle = O; c.lineWidth = 8.5; c.lineCap = 'round'; c.stroke();
    handle(); c.strokeStyle = '#c9d2dc'; c.lineWidth = 5; c.stroke();
    g.ellipse(c, 16, -17, 12.5, 15, '#dfe5ec', O, 2.4, 0.7);
    g.ellipse(c, 17, -18, 7.5, 9.5, '#a9b4c2', null, 0, 0.7);
    shine(c, g, 11, -23, 2.5, 6, 0.7);
  });

  def('magic_mushroom', (c, g) => {
    g.rrect(c, -9, 0, 18, 28, 8, '#f3e3c3', O, 2.2);
    c.beginPath(); c.moveTo(-29, 3); c.bezierCurveTo(-30, -28, 30, -28, 29, 3); c.quadraticCurveTo(0, 10, -29, 3); c.closePath();
    c.fillStyle = '#e03232'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
    g.circle(c, -13, -9, 5.5, '#fff'); g.circle(c, 5, -17, 4.5, '#fff'); g.circle(c, 16, -5, 4, '#fff'); g.circle(c, -2, -3, 3, '#fff');
    shine(c, g, -19, -16, 2.5, 6, 0.6);
  });

  def('growth_hormones', (c, g) => {
    g.rrect(c, -7, -14, 14, 12, 3, '#cfe8f5', O, 2); g.rrect(c, -8, -25, 16, 10, 3, '#b9783c', O, 2);
    g.rrect(c, -15, -6, 30, 34, 8, '#d9f0fb', O, 2.4);
    g.rrect(c, -13, 6, 26, 20, 6, '#4ad07a'); g.rrect(c, -15, -6, 30, 34, 8, null, O, 2.4);
    g.rrect(c, -12, 8, 24, 11, 2, '#fff7e0', O, 1.4);
    g.poly(c, [[0, 9.5], [-4, 14], [-1.5, 14], [-1.5, 17.5], [1.5, 17.5], [1.5, 14], [4, 14]], '#e03a3a');
    g.circle(c, -7, 0, 2, 'rgba(255,255,255,0.8)'); shine(c, g, -10, 2, 1.8, 6, 0);
  });

  def('the_belt', (c, g) => {
    g.rrect(c, -31, -9, 62, 18, 4, '#8a4f22', O, 2.4);
    for (let x = -28; x < 28; x += 6) { g.circle(c, x, -5.5, 0.9, '#d6a56a'); g.circle(c, x, 5.5, 0.9, '#d6a56a'); }
    for (let i = 0; i < 3; i++) g.circle(c, 16 + i * 5, 0, 1.7, '#2a1408');
    g.rrect(c, -11, -15, 22, 30, 5, '#f0c030', O, 2.4);
    g.rrect(c, -5.5, -9, 11, 18, 3, '#8a4f22', O, 1.8);
    g.line(c, -8, 0, 12, 0, '#c9921a', 3); shine(c, g, -7, -11, 1.8, 3, 0);
  });

  def('moms_underwear', (c, g) => {
    g.poly(c, [[-27, -15], [27, -15], [25, 2], [11, 22], [4, 9], [-4, 9], [-11, 22], [-25, 2]], '#efdfc0', O, 2.4);
    g.rrect(c, -27, -18, 54, 9, 3, '#e2cda6', O, 2);
    g.line(c, -14, -2, -7, 8, 'rgba(160,130,90,0.5)', 1.5); g.line(c, 14, -2, 7, 8, 'rgba(160,130,90,0.5)', 1.5);
    g.heart(c, 0, -2, 9, '#f08aa8', O, 1.2);
  });

  def('pentagram', (c, g) => {
    g.circle(c, 0, 0, 28, '#2a0a12', '#8b1424', 3);
    g.circle(c, 0, 0, 22.5, null, 'rgba(224,36,58,0.55)', 1.6);
    const p = []; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; p.push([Math.cos(a) * 22.5, Math.sin(a) * 22.5]); }
    const o = [0, 2, 4, 1, 3, 0];
    c.beginPath(); o.forEach((k, i) => (i ? c.lineTo(p[k][0], p[k][1]) : c.moveTo(p[k][0], p[k][1])));
    c.strokeStyle = '#ee2a42'; c.lineWidth = 3.2; c.lineJoin = 'round'; c.stroke();
    g.circle(c, 0, 0, 3, '#ff7a86');
  });

  def('the_halo', (c, g) => {
    c.save(); c.globalAlpha = 0.28; g.circle(c, 0, 2, 28, '#fff3a0'); c.restore();
    g.ellipse(c, 0, 2, 23, 10, null, '#9a6a0c', 10, -0.15);
    g.ellipse(c, 0, 2, 23, 10, null, '#f6cf3a', 6, -0.15);
    g.ellipse(c, 0, 0.5, 22, 8.6, null, '#fff3b0', 1.6, -0.15);
    g.star(c, -23, -14, 6, 2, 4, '#fffbe0', null, 0); g.star(c, 24, 14, 5, 1.7, 4, '#fffbe0', null, 0);
    g.star(c, 18, -18, 3.5, 1.2, 4, '#fff3b0', null, 0);
  });

  def('crickets_head', (c, g) => {
    c.beginPath(); c.moveTo(-9, -14); c.quadraticCurveTo(-20, -22, -24, -30); c.moveTo(9, -14); c.quadraticCurveTo(20, -22, 24, -30);
    c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
    g.circle(c, -24, -30, 2, O); g.circle(c, 24, -30, 2, O);
    g.ellipse(c, 0, 4, 20, 23, '#4a3322', O, 2.4);
    g.ellipse(c, -10, -3, 8.5, 11, '#e08a1e', O, 1.8, 0.2); g.ellipse(c, 10, -3, 8.5, 11, '#e08a1e', O, 1.8, -0.2);
    g.ellipse(c, -9, -2, 4.5, 6.5, '#3a1a08', null, 0, 0.2); g.ellipse(c, 9, -2, 4.5, 6.5, '#3a1a08', null, 0, -0.2);
    g.circle(c, -11, -6, 2, '#ffe0a0'); g.circle(c, 7, -6, 2, '#ffe0a0');
    g.poly(c, [[-8, 17], [-3, 17], [-6, 28]], '#c9b79a', O, 1.6); g.poly(c, [[8, 17], [3, 17], [6, 28]], '#c9b79a', O, 1.6);
  });

  /* --------------------------- 2. Ataques y lágrimas --------------------------- */
  def('brimstone', (c, g) => {
    g.ellipse(c, 0, 27, 18, 4.5, '#7a0c14');
    c.beginPath(); c.moveTo(-17, 24); c.bezierCurveTo(-26, 0, -6, -18, 19, -29); c.bezierCurveTo(10, -13, 7, 2, 13, 24); c.closePath();
    c.fillStyle = '#b3121e'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
    c.beginPath(); c.moveTo(-9, 18); c.bezierCurveTo(-12, 2, 0, -10, 12, -20);
    c.strokeStyle = '#ee5a5a'; c.lineWidth = 2.2; c.stroke();
    g.poly(c, [[22, 4], [18, 14], [26, 14]], '#d8222e', O, 1.6); g.circle(c, 22, 15, 3.6, '#d8222e', O, 1.6);
    g.poly(c, [[-22, -4], [-25, 3], [-19, 3]], '#d8222e'); g.circle(c, -22, 4, 2.6, '#d8222e');
  });

  def('technology', (c, g) => {
    g.line(c, 0, -17, 0, -28, '#5a606a', 3); g.circle(c, 0, -29, 2.6, '#e03a3a', O, 1.4);
    g.rrect(c, -24, -17, 48, 36, 6, '#8d95a1', O, 2.4);
    g.rrect(c, -24, -17, 48, 8, 4, '#a9b1bd', O, 2);
    g.circle(c, 0, 3, 13, '#2a3340', O, 2.6); g.circle(c, 0, 3, 8.5, '#2fd0e6', '#0e6a78', 1.6); g.circle(c, 0, 3, 3.6, '#0b3a44');
    g.circle(c, -3, 0, 2.2, '#e8ffff');
    for (const [x, y] of [[-19, -4], [19, -4], [-19, 13], [19, 13]]) g.circle(c, x, y, 1.9, '#5a606a');
    g.line(c, -12, 24, 12, 24, O, 2); g.rrect(c, -9, 19, 18, 4, 1.5, '#5a606a', O, 1);
  });

  def('ipecac', (c, g) => {
    g.rrect(c, -7, -14, 14, 12, 3, '#9ac24a', O, 2); g.rrect(c, -8, -26, 16, 11, 3, '#b9783c', O, 2);
    g.rrect(c, -15, -5, 30, 33, 10, '#7fb23a', O, 2.4);
    g.rrect(c, -13, 3, 26, 23, 8, '#b6dd3c');
    g.circle(c, -5, 10, 3.6, '#e2f58a'); g.circle(c, 5, 17, 2.8, '#e2f58a'); g.circle(c, 0, 6, 1.8, '#e2f58a');
    g.rrect(c, -15, -5, 30, 33, 10, null, O, 2.4);
    c.beginPath(); c.moveTo(7, -2); c.quadraticCurveTo(16, 4, 15, 14); c.strokeStyle = '#b6dd3c'; c.lineWidth = 3; c.stroke();
    g.circle(c, 15, 16, 3.2, '#b6dd3c', O, 1.4); shine(c, g, -10, 4, 1.8, 7, 0);
  });

  def('dr_fetus', (c, g) => {
    g.circle(c, -3, 5, 21, '#f6c7a8', O, 2.4);
    c.beginPath(); c.moveTo(-4, -16); c.quadraticCurveTo(0, -27, 6, -17); c.strokeStyle = O; c.lineWidth = 2.6; c.stroke();
    g.circle(c, -11, 2, 6, '#fff', O, 1.5); g.circle(c, 5, 2, 6, '#fff', O, 1.5); g.circle(c, -10, 3, 3, '#222'); g.circle(c, 6, 3, 3, '#222');
    g.circle(c, -15, 11, 3.5, 'rgba(240,110,130,0.6)'); g.circle(c, 9, 11, 3.5, 'rgba(240,110,130,0.6)');
    c.beginPath(); c.arc(-3, 15, 3.5, 0.2, Math.PI - 0.2); c.strokeStyle = O; c.lineWidth = 1.8; c.stroke();
    g.line(c, 18, -9, 23, -17, '#b09060', 2.4); g.star(c, 24, -19, 4.5, 1.8, 5, '#ffb030', null, 0);
    g.circle(c, 17, -3, 10, '#2b2b30', O, 2.2); g.circle(c, 14, -6, 2.6, '#8a8a94');
  });

  def('epic_fetus', (c, g) => {
    g.circle(c, 0, 0, 25, null, '#d83a3a', 2.6);
    g.line(c, 0, -31, 0, -19, '#d83a3a', 2.6); g.line(c, 0, 19, 0, 31, '#d83a3a', 2.6);
    g.line(c, -31, 0, -19, 0, '#d83a3a', 2.6); g.line(c, 19, 0, 31, 0, '#d83a3a', 2.6);
    c.save(); c.rotate(-0.7);
    g.poly(c, [[-14, -5], [-22, -14], [-8, -5]], '#d8222e', O, 1.8); g.poly(c, [[-14, 5], [-22, 14], [-8, 5]], '#d8222e', O, 1.8);
    g.rrect(c, -17, -6.5, 30, 13, 6, '#9aa1ab', O, 2.2);
    g.poly(c, [[12, -6.5], [24, 0], [12, 6.5]], '#d8222e', O, 2.2);
    g.circle(c, -2, 0, 3.2, '#2a3340', O, 1.4); c.restore();
  });

  def('moms_knife', (c, g) => {
    c.save(); c.translate(0, 0); c.rotate(-0.78);
    g.rrect(c, -30, -5.5, 22, 11, 4.5, '#6b3f22', O, 2.2);
    g.circle(c, -25, 0, 1.5, '#e8b92a'); g.circle(c, -15, 0, 1.5, '#e8b92a');
    c.beginPath(); c.moveTo(-8, -6.5); c.lineTo(22, -6.5); c.quadraticCurveTo(32, -1, 24, 8); c.lineTo(-8, 7); c.closePath();
    c.fillStyle = '#c9cfd8'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.2; c.stroke();
    g.line(c, -6, -3.5, 22, -3.5, '#f2f5f8', 1.6);
    g.circle(c, 8, 1, 3.2, '#b3121e'); g.circle(c, 17, 3.2, 2.2, '#b3121e'); g.poly(c, [[4, 4], [8, 4], [6, 10]], '#b3121e');
    c.restore();
  });

  def('chocolate_milk', (c, g) => {
    g.line(c, 5, -4, 13, -29, '#d8222e', 4); g.line(c, 5, -4, 13, -29, '#fff', 1.6);
    g.poly(c, [[-17, -17], [17, -17], [13, 26], [-13, 26]], '#7a4524', O, 2.4);
    g.poly(c, [[-15.5, -17], [15.5, -17], [14.5, -9], [-14.5, -9]], '#f4ead8');
    g.poly(c, [[-17, -17], [17, -17], [13, 26], [-13, 26]], null, O, 2.4);
    g.ellipse(c, 0, -17, 17, 3.6, '#f4ead8', O, 1.8);
    g.rrect(c, -8, 2, 16, 12, 2, '#5a2e14', null, 0); g.line(c, -8, 8, 8, 8, '#7a4524', 1.2); g.line(c, 0, 2, 0, 14, '#7a4524', 1.2);
    g.line(c, -12, -6, -9, 20, 'rgba(255,255,255,0.45)', 2.4);
  });

  def('holy_light', (c, g) => {
    const rg = c.createRadialGradient(0, 0, 2, 0, 0, 30);
    rg.addColorStop(0, 'rgba(255,255,255,0.95)'); rg.addColorStop(0.5, 'rgba(150,205,255,0.5)'); rg.addColorStop(1, 'rgba(120,180,255,0)');
    c.fillStyle = rg; c.beginPath(); c.arc(0, 0, 30, 0, Math.PI * 2); c.fill();
    g.star(c, 0, 0, 30, 5, 4, '#e9f6ff', '#6aa8e8', 2, -Math.PI / 2);
    g.star(c, 0, 0, 18, 5, 4, '#9fd2ff', null, 0, Math.PI / 4);
    g.circle(c, 0, 0, 6, '#fff');
  });

  def('rubber_cement', (c, g) => {
    c.save(); c.translate(-2, 2); c.rotate(-0.6);
    g.rrect(c, -26, -9, 38, 18, 5, '#2f7fd6', O, 2.4);
    g.poly(c, [[-26, -9], [-31, -7], [-31, 7], [-26, 9]], '#1f5ca0', O, 2);
    g.line(c, -29, -5, -29, 5, '#6aa8e8', 1.4);
    g.rrect(c, -14, -9, 16, 18, 2, '#f0c030');
    g.poly(c, [[12, -7], [22, -4.5], [22, 4.5], [12, 7]], '#f4f4f6', O, 2);
    g.rrect(c, 22, -3, 7, 6, 2, '#e8b92a', O, 1.8);
    g.circle(c, 33, 0, 3.4, '#f4f2d8', O, 1.4);
    shine(c, g, -12, -6, 9, 1.6, 0); c.restore();
  });

  def('lokis_horns', (c, g) => {
    const horn = () => {
      c.beginPath(); c.moveTo(3, 22); c.bezierCurveTo(-14, 20, -30, 4, -24, -26);
      c.bezierCurveTo(-13, -8, -6, 4, 14, 14); c.closePath();
      c.fillStyle = '#d92b2b'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
      c.beginPath(); c.moveTo(-5, 14); c.bezierCurveTo(-18, 8, -24, -4, -22, -17); c.strokeStyle = '#ff8a8a'; c.lineWidth = 2; c.stroke();
    };
    c.save(); horn(); c.restore();
    c.save(); c.scale(-1, 1); horn(); c.restore();
    g.ellipse(c, 0, 20, 6, 4, '#7a1010', O, 1.6);
  });

  /* ------------------------------ 3. Vida y supervivencia ------------------------------ */
  def('breakfast', (c, g) => {
    c.beginPath(); c.moveTo(-24, -4);
    c.bezierCurveTo(-30, -20, -8, -28, 4, -22); c.bezierCurveTo(20, -30, 32, -8, 24, 6);
    c.bezierCurveTo(32, 20, 10, 30, -4, 24); c.bezierCurveTo(-18, 32, -34, 10, -24, -4); c.closePath();
    c.fillStyle = '#fdfdf2'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
    c.beginPath(); c.moveTo(-22, 8); c.bezierCurveTo(-18, 20, -6, 25, 0, 23); c.strokeStyle = '#e8b86a'; c.lineWidth = 2; c.stroke();
    g.circle(c, 2, 0, 11.5, '#ffc21a', O, 2.2); g.circle(c, -2, -4, 3.4, '#fff3b0');
  });

  const plate = (c, g, y, r) => { g.circle(c, 0, y, r, '#f4f4f6', O, 2.6); g.circle(c, 0, y, r * 0.72, '#dde3ea', '#b7c0cc', 1.5); };

  def('lunch', (c, g) => {
    plate(c, g, 0, 28);
    g.rrect(c, -17, -9, 34, 17, 8, '#e8b86a', O, 2.2);
    g.rrect(c, -15, -8, 30, 10, 5, '#c4442a', O, 2);
    c.beginPath(); c.moveTo(-12, -3); for (let i = 0; i < 6; i++) c.lineTo(-12 + i * 5 + 2.5, i % 2 ? -3 : -6);
    c.strokeStyle = '#f0c030'; c.lineWidth = 1.8; c.stroke();
    g.circle(c, -10, 15, 3.4, '#5fae3a', O, 1.2); g.circle(c, -2, 17, 3.4, '#5fae3a', O, 1.2); g.circle(c, 7, 15, 3.4, '#5fae3a', O, 1.2);
  });

  def('dinner', (c, g) => {
    plate(c, g, 8, 24);
    g.ellipse(c, -4, 8, 15, 11, '#a8522a', O, 2.2, -0.15);
    g.line(c, -12, 3, -4, 13, '#5a2412', 1.8); g.line(c, -5, 1, 3, 11, '#5a2412', 1.8);
    g.circle(c, 14, 14, 7, '#e8c36a', O, 1.8); g.circle(c, 14, 14, 2, '#f6e29a');
    g.circle(c, 9, -2, 5, '#4a9a3a', O, 1.6);
    for (const x of [-10, 0, 10]) { c.beginPath(); c.moveTo(x, -8); c.bezierCurveTo(x - 5, -14, x + 5, -19, x, -27); c.strokeStyle = 'rgba(120,140,170,0.85)'; c.lineWidth = 2.6; c.stroke(); }
  });

  def('dessert', (c, g) => {
    g.ellipse(c, 0, 24, 27, 6, '#f4f4f6', O, 2);
    g.rrect(c, -20, -4, 40, 28, 4, '#f3cd86', O, 2.4);
    g.rrect(c, -20, 7, 40, 5, 0, '#fff3e4');
    g.rrect(c, -23, -13, 46, 13, 6.5, '#f07fb0', O, 2.4);
    g.circle(c, -14, 2, 3.6, '#f07fb0'); g.circle(c, 8, 2, 3, '#f07fb0');
    g.line(c, 0, -22, 4, -30, '#4a9a3a', 2); g.circle(c, 0, -18, 6.5, '#c4122a', O, 2); g.circle(c, -2, -20, 1.8, '#ff9aa6');
  });

  def('supper', (c, g) => {
    c.beginPath(); c.moveTo(-27, -1); c.quadraticCurveTo(-25, 28, 0, 28); c.quadraticCurveTo(25, 28, 27, -1); c.closePath();
    c.fillStyle = '#d9824a'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
    g.ellipse(c, 0, -1, 27, 8, '#f2d9b0', O, 2.2); g.ellipse(c, 0, -1, 21.5, 5.4, '#e8a23a');
    g.circle(c, -9, -2, 2.6, '#5fae3a'); g.circle(c, 3, 0, 2.6, '#c4442a'); g.circle(c, 11, -2, 2.4, '#f6e29a');
    g.line(c, -12, 14, 12, 14, '#f2d9b0', 2.4);
    g.line(c, 10, -2, 26, -22, '#c9d2dc', 3.4); g.ellipse(c, 27, -25, 4.5, 6.5, '#dfe5ec', O, 1.8, 0.6);
  });

  def('the_wafer', (c, g) => {
    g.circle(c, 0, 0, 27, '#e8b84a', O, 2.6);
    c.save(); c.beginPath(); c.arc(0, 0, 25, 0, Math.PI * 2); c.clip();
    for (let i = -24; i <= 24; i += 9) { g.line(c, i, -26, i, 26, '#b98424', 1.5); g.line(c, -26, i, 26, i, '#b98424', 1.5); }
    c.restore();
    g.circle(c, 0, 0, 20, null, '#c99530', 1.6); shine(c, g, -12, -14, 3, 8, 0.7);
    g.circle(c, 0, 0, 27, null, O, 2.6);
  });

  def('holy_mantle', (c, g) => {
    c.beginPath(); c.moveTo(-10, -24); c.quadraticCurveTo(0, -30, 10, -24); c.lineTo(25, 22);
    c.quadraticCurveTo(26, 29, 16, 26); c.quadraticCurveTo(8, 31, 0, 26); c.quadraticCurveTo(-8, 31, -16, 26); c.quadraticCurveTo(-26, 29, -25, 22); c.closePath();
    c.fillStyle = '#f8f8ff'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
    g.line(c, -3, -22, -9, 24, '#c8d0e8', 2); g.line(c, 3, -22, 9, 24, '#c8d0e8', 2); g.line(c, 0, -20, 0, 25, '#dfe5f6', 2);
    g.line(c, -18, 24, 18, 24, '#f0c030', 2.2);
    g.circle(c, 0, -21, 4.4, '#f0c030', O, 1.6); g.circle(c, -1, -22, 1.4, '#fff3b0');
  });

  def('dead_cat', (c, g) => {
    const rim = '#9a95b0';
    g.poly(c, [[-21, -4], [-19, -27], [-5, -13]], '#2a2830', rim, 2.4); g.poly(c, [[21, -4], [19, -27], [5, -13]], '#2a2830', rim, 2.4);
    g.poly(c, [[-17, -8], [-16, -19], [-9, -12]], '#c07088'); g.poly(c, [[17, -8], [16, -19], [9, -12]], '#c07088');
    g.ellipse(c, 0, 5, 23, 20, '#2a2830', rim, 2.6);
    for (const x of [-9, 9]) { g.line(c, x - 4, -1, x + 4, 7, '#eceaf8', 2.6); g.line(c, x + 4, -1, x - 4, 7, '#eceaf8', 2.6); }
    g.poly(c, [[-3, 10], [3, 10], [0, 14]], '#e88aa0');
    g.ellipse(c, 3, 20, 3.4, 5.2, '#e8728c', rim, 1.4);
    g.line(c, -14, 12, -29, 9, '#c9c5da', 1.4); g.line(c, -14, 15, -29, 17, '#c9c5da', 1.4);
    g.line(c, 14, 12, 29, 9, '#c9c5da', 1.4); g.line(c, 14, 15, 29, 17, '#c9c5da', 1.4);
  });

  def('one_up', (c, g) => {
    g.rrect(c, -10, 0, 20, 28, 9, '#f3e3c3', O, 2.2);
    g.circle(c, -4, 12, 2, '#222'); g.circle(c, 4, 12, 2, '#222');
    c.beginPath(); c.moveTo(-29, 3); c.bezierCurveTo(-30, -28, 30, -28, 29, 3); c.quadraticCurveTo(0, 10, -29, 3); c.closePath();
    c.fillStyle = '#33b845'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
    g.circle(c, -13, -9, 5.5, '#eaffea'); g.circle(c, 6, -16, 4.5, '#eaffea'); g.circle(c, 17, -4, 3.8, '#eaffea');
    shine(c, g, -20, -15, 2.5, 6, 0.6);
    g.star(c, 22, -22, 6, 2, 4, '#fffbe0', null, 0);
  });

  def('guppys_paw', (c, g) => {
    for (const [x, y, r] of [[-16, -12, 0.2], [0, -19, 0], [16, -12, -0.2]]) {
      g.ellipse(c, x, y, 8.4, 11, '#a86a38', O, 2.2, r);
      g.ellipse(c, x, y + 2, 3.8, 4.6, '#e89aa0');
      g.poly(c, [[x - 2.5, y - 9], [x + 2.5, y - 9], [x, y - 15]], '#f3ead6', O, 1.2);
    }
    g.ellipse(c, 0, 11, 23, 19, '#9a5f32', O, 2.4);
    g.ellipse(c, 0, 13, 12, 9.5, '#e89aa0', O, 1.6);
    shine(c, g, -14, 4, 2.5, 7, 0.4);
  });

  /* ------------------------------ Extras ------------------------------ */
  def('twenty_twenty', (c, g) => {
    g.eye(c, -14, 3, 13.5, '#2c7fd6', '#000'); g.eye(c, 14, 3, 13.5, '#2c7fd6', '#000');
    g.circle(c, -17, -1, 3, '#fff'); g.circle(c, 11, -1, 3, '#fff');
    g.line(c, -26, -14, -6, -17, O, 2.6); g.line(c, 26, -14, 6, -17, O, 2.6);
    c.beginPath(); c.arc(-14, 3, 13.5, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = O; c.lineWidth = 2.4; c.stroke();
    c.beginPath(); c.arc(14, 3, 13.5, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  });

  def('cupids_arrow', (c, g) => {
    c.save(); c.rotate(-0.75);
    g.line(c, -27, 0, 20, 0, O, 6.4); g.line(c, -27, 0, 20, 0, '#d2a86a', 3.4);
    g.poly(c, [[-28, 0], [-20, -9], [-12, -9], [-18, 0]], '#f07fb0', O, 1.8);
    g.poly(c, [[-28, 0], [-20, 9], [-12, 9], [-18, 0]], '#f07fb0', O, 1.8);
    c.save(); c.translate(21, 0); c.rotate(-Math.PI / 2); g.heart(c, 0, 0, 24, '#e8284f', O, 2.2); g.circle(c, -3, -3, 2, '#ff9aa6'); c.restore();
    c.restore();
  });

  def('scorpio', (c, g) => {
    c.beginPath(); c.moveTo(0, 14); c.bezierCurveTo(2, 31, 29, 28, 27, 4); c.lineCap = 'round';
    c.strokeStyle = O; c.lineWidth = 10; c.stroke();
    c.strokeStyle = '#c46a24'; c.lineWidth = 6; c.stroke();
    g.poly(c, [[22, 6], [31, 6], [26, -7]], '#7a2410', O, 1.8);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) g.line(c, s * 8, -2 + i * 6, s * 19, -6 + i * 9, O, 2.2);
      g.line(c, s * 6, -10, s * 15, -19, O, 5); g.line(c, s * 6, -10, s * 15, -19, '#c46a24', 2.6);
      g.ellipse(c, s * 17, -24, 6.5, 8, '#d9782c', O, 2, s * 0.3); g.poly(c, [[s * 15, -26], [s * 19, -26], [s * 17, -20]], '#2a1408');
    }
    g.ellipse(c, 0, 8, 9.5, 14, '#c46a24', O, 2.2); g.ellipse(c, 0, -8, 8, 7, '#d9782c', O, 2.2);
    for (const y of [4, 10, 16]) g.line(c, -8, y, 8, y, 'rgba(60,20,5,0.6)', 1.4);
    g.circle(c, -3, -9, 1.8, '#111'); g.circle(c, 3, -9, 1.8, '#111');
  });

  def('ouija_board', (c, g) => {
    g.rrect(c, -29, -23, 58, 46, 5, '#8a5a2c', O, 2.4); g.rrect(c, -26, -20, 52, 40, 3, '#a8743a', '#6a4220', 1.4);
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (1.2 + i * 0.075); g.circle(c, Math.cos(a) * 21, 22 + Math.sin(a) * 18, 1.9, '#2a1a0e'); }
    g.star(c, -17, -12, 4.6, 1.8, 5, '#2a1a0e', null, 0); g.circle(c, 17, -12, 4.3, '#2a1a0e'); g.circle(c, 19, -13, 3.6, '#a8743a');
    c.beginPath(); c.moveTo(0, -11); c.bezierCurveTo(12, 0, 12, 9, 0, 15); c.bezierCurveTo(-12, 9, -12, 0, 0, -11); c.closePath();
    c.fillStyle = '#eadcb4'; c.fill(); c.strokeStyle = O; c.lineWidth = 2.2; c.stroke();
    g.circle(c, 0, 4, 3.8, '#243040', O, 1.4); g.circle(c, -1, 3, 1.1, '#fff');
  });
})();
