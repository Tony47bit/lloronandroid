/* Sprites originales — grupo B: familiares, activos, bombas/monedas/llaves, especiales. */
(function () {
  'use strict';
  const S = window.Lagrimas.Sprites;
  const O = S.g.OUT;
  const def = S.define;

  // ---- helpers locales de libros (cubierta + lomo + páginas) ----
  function book(c, g, cover, dark, trim) {
    g.rrect(c, -20, -25, 40, 50, 4, '#f1e6c8', O, 2);          // páginas
    g.rrect(c, -22, -27, 38, 50, 4, cover, O, 2.2);            // cubierta
    g.rrect(c, -22, -27, 7, 50, 3, dark, O, 1.5);              // lomo
    g.line(c, -12, -22, 12, -22, trim, 1.5); g.line(c, -12, 18, 12, 18, trim, 1.5);
  }

  // ===================== FAMILIARES =====================
  def('brother_bobby', (c, g) => {
    g.ellipse(c, 0, 17, 13, 10, '#4a78d8', O, 2);              // cuerpo azul
    g.circle(c, 0, -4, 18, '#8fb4f0', O, 2.2);                 // cabeza
    g.line(c, -3, -22, 0, -28, O, 2.5); g.line(c, 3, -22, 4, -28, O, 2.5); // mechón
    g.circle(c, -7, -4, 4, '#111'); g.circle(c, 7, -4, 4, '#111');
    g.circle(c, -8, -5.5, 1.3, '#fff'); g.circle(c, 6, -5.5, 1.3, '#fff');
    g.ellipse(c, 0, 8, 4, 2.5, '#2a3d78');                     // boquita
    g.ellipse(c, -9, 12, 2, 3.5, '#bde0ff');                   // lágrima
  });
  def('sister_maggy', (c, g) => {
    g.ellipse(c, 0, 17, 13, 10, '#e868a8', O, 2);              // vestido
    g.circle(c, 0, -3, 18, '#f6d5bd', O, 2.2);
    g.poly(c, [[-18, -8], [-12, -24], [0, -22], [12, -24], [18, -8], [10, -12], [0, -16], [-10, -12]], '#c8402a', O, 2);
    g.poly(c, [[-4, -22], [-14, -29], [-12, -17]], '#ff9fc8', O, 1.8); g.poly(c, [[-4, -22], [6, -29], [4, -17]], '#ff9fc8', O, 1.8);
    g.circle(c, -7, -3, 3.6, '#111'); g.circle(c, 7, -3, 3.6, '#111');
    g.circle(c, -12, 5, 3, 'rgba(255,110,130,.7)'); g.circle(c, 12, 5, 3, 'rgba(255,110,130,.7)');
    g.ellipse(c, 0, 9, 3, 2, '#b03050');
  });
  def('little_chubby', (c, g) => {
    g.ellipse(c, -9, 25, 6, 4, '#c25a8a', O, 2); g.ellipse(c, 9, 25, 6, 4, '#c25a8a', O, 2);
    g.circle(c, 0, 4, 25, '#f08cb8', O, 2.5);
    g.ellipse(c, -8, -8, 7, 4, 'rgba(255,255,255,.45)', null, 0, -0.5);
    g.circle(c, -9, -2, 4, '#111'); g.circle(c, 9, -2, 4, '#111');
    g.circle(c, -14, 8, 4, 'rgba(255,90,120,.6)'); g.circle(c, 14, 8, 4, 'rgba(255,90,120,.6)');
    g.ellipse(c, 0, 12, 9, 6, '#7a1e48', O, 2); g.ellipse(c, 0, 15, 5, 2.5, '#e8607a');
  });
  def('daddy_longlegs', (c, g) => {
    c.save(); c.strokeStyle = '#2a2236'; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + 0.39, kx = Math.cos(a) * 20, ky = Math.sin(a) * 20;
      c.beginPath(); c.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); c.lineTo(kx, ky - 8);
      c.lineTo(Math.cos(a) * 30, Math.sin(a) * 30 + 4); c.stroke();
    }
    c.restore();
    g.ellipse(c, 0, 0, 12, 10, '#40345a', O, 2);
    g.circle(c, -4, -2, 3, '#ffe27a'); g.circle(c, 4, -2, 3, '#ffe27a'); g.circle(c, -4, -2, 1.2, '#000'); g.circle(c, 4, -2, 1.2, '#000');
  });
  def('bffs', (c, g) => {
    g.heart(c, 0, 0, 62, '#ff6f9c', O, 2.5);
    g.ellipse(c, -10, -12, 6, 3, 'rgba(255,255,255,.55)', null, 0, -0.6);
    g.circle(c, -8, -4, 3.5, '#111'); g.circle(c, 8, -4, 3.5, '#111');
    g.circle(c, -8.8, -5, 1.1, '#fff'); g.circle(c, 7.2, -5, 1.1, '#fff');
    c.beginPath(); c.arc(0, 3, 6, 0.15 * Math.PI, 0.85 * Math.PI); c.strokeStyle = O; c.lineWidth = 2.2; c.stroke();
    g.circle(c, -15, 3, 3.2, 'rgba(255,230,240,.8)'); g.circle(c, 15, 3, 3.2, 'rgba(255,230,240,.8)');
  });
  def('forever_alone', (c, g) => {
    g.ellipse(c, -12, -10, 12, 7, 'rgba(210,235,255,.85)', O, 1.6, -0.5);
    g.ellipse(c, 12, -10, 12, 7, 'rgba(210,235,255,.85)', O, 1.6, 0.5);
    g.circle(c, 0, 4, 14, '#3a6ed8', O, 2.2);
    g.circle(c, -5, 0, 4.5, '#fff', O, 1.2); g.circle(c, 5, 0, 4.5, '#fff', O, 1.2);
    g.circle(c, -5, 1.5, 2, '#111'); g.circle(c, 5, 1.5, 2, '#111');
    g.line(c, -9, -5, -2, -3, O, 1.8); g.line(c, 9, -5, 2, -3, O, 1.8);           // cejas tristes
    g.ellipse(c, 0, 11, 4, 2, '#162a60');
  });
  def('holy_water', (c, g) => {
    g.rrect(c, -6, -26, 12, 8, 2, '#c08a52', O, 2);            // corcho
    g.rrect(c, -5, -19, 10, 8, 2, '#cfe8ff', O, 2);            // cuello
    g.poly(c, [[-5, -12], [5, -12], [18, 4], [18, 20], [12, 26], [-12, 26], [-18, 20], [-18, 4]], '#d6ecff', O, 2.2);
    g.poly(c, [[-16, 4], [16, 4], [16, 20], [11, 24], [-11, 24], [-16, 20]], '#3aa0ff');
    g.ellipse(c, -9, 12, 3, 6, 'rgba(255,255,255,.6)'); g.circle(c, 5, 14, 2.2, '#bfe3ff');
  });
  def('cube_of_meat', (c, g) => {
    g.poly(c, [[-20, -8], [0, -22], [20, -8], [0, 6]], '#d85a5a', O, 2);       // tapa
    g.poly(c, [[-20, -8], [0, 6], [0, 28], [-20, 14]], '#b83a42', O, 2);
    g.poly(c, [[20, -8], [0, 6], [0, 28], [20, 14]], '#9a2a38', O, 2);
    g.line(c, -12, -8, 6, -14, '#f6b0a0', 2.5); g.line(c, -14, 8, -5, 14, '#e89080', 2);
    g.eye(c, -9, 7, 4.5, '#6a2020'); g.eye(c, 9, 7, 4.5, '#6a2020');
  });
  def('ball_of_bandages', (c, g) => {
    g.circle(c, 0, 0, 23, '#efe6cf', O, 2.4);
    c.save(); c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.clip();
    for (let i = -3; i <= 3; i++) g.line(c, -26, i * 9 - 8, 26, i * 9 + 8, '#cfc2a2', 2);
    c.restore();
    g.ellipse(c, 8, -8, 7, 5, 'rgba(190,30,40,.85)'); g.circle(c, -9, 10, 4.5, 'rgba(170,25,35,.8)');
    g.line(c, 18, 14, 28, 24, '#efe6cf', 5); g.line(c, 18, 14, 28, 24, O, 1.2);
  });
  def('rotten_baby', (c, g) => {
    g.ellipse(c, 0, 17, 12, 9, '#6a8a2a', O, 2);
    g.circle(c, 0, -3, 18, '#9fc24a', O, 2.2);
    g.circle(c, -9, -12, 4, '#6a7a2a'); g.circle(c, 10, 4, 3.5, '#5a6a22'); g.circle(c, 6, -13, 2.5, '#566a1e');
    g.circle(c, -7, -3, 4, '#ffe9a0', O, 1.2); g.circle(c, 7, -3, 4, '#ffe9a0', O, 1.2);
    g.circle(c, -7, -3, 1.8, '#111'); g.circle(c, 7, -3, 1.8, '#111');
    g.ellipse(c, 0, 8, 5, 3, '#2a3a10');
    g.circle(c, 22, -18, 3.2, '#2a2a30'); g.ellipse(c, 21, -22, 3, 1.8, 'rgba(220,240,255,.85)');
  });

  // ===================== ACTIVOS =====================
  def('the_d6', (c, g) => {
    c.save(); c.rotate(-0.25);
    g.poly(c, [[-18, -14], [-6, -26], [22, -26], [10, -14]], '#ffffff', O, 2);
    g.poly(c, [[10, -14], [22, -26], [22, 10], [10, 22]], '#cfd2dc', O, 2);
    g.rrect(c, -18, -14, 28, 36, 4, '#f5f5f7', O, 2.4);
    for (const [x, y] of [[-12, -7], [4, -7], [-4, 4], [-12, 15], [4, 15]]) g.circle(c, x, y, 3.2, '#1a1a20');
    c.restore();
  });
  def('book_of_belial', (c, g) => {
    book(c, g, '#2a2230', '#14101a', '#8a2030');
    g.star(c, -3, -2, 11, 5, 5, '#e02830', O, 1.6);
  });
  def('necronomicon', (c, g) => {
    book(c, g, '#8a5a30', '#5a3a1c', '#d8b070');
    g.circle(c, -3, -3, 10, null, '#2a1a0c', 1.8);
    g.poly(c, [[-3, -11], [4, 1], [-10, 1]], null, '#2a1a0c', 1.6);
    g.line(c, -14, 11, -8, 8, '#2a1a0c', 1.6); g.line(c, -8, 8, -2, 12, '#2a1a0c', 1.6); g.line(c, -2, 12, 6, 8, '#2a1a0c', 1.6);
    g.rrect(c, 12, -4, 5, 9, 2, '#d8b070', O, 1.2);                                // cierre
  });
  def('the_bible', (c, g) => {
    book(c, g, '#f4f0e6', '#c9c2ae', '#d8b84a');
    g.rrect(c, -6, -17, 6, 30, 1.5, '#d8b84a', O, 1.5); g.rrect(c, -14, -9, 22, 6, 1.5, '#d8b84a', O, 1.5);
  });
  def('teleport', (c, g) => {
    g.line(c, 10, -14, 16, -28, O, 3); g.circle(c, 16, -29, 3, '#ff5a4a', O, 1.5);
    g.rrect(c, -20, -14, 40, 38, 6, '#8d93a4', O, 2.4);
    g.rrect(c, -15, -9, 30, 18, 3, '#14202c', O, 1.6);
    c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 1.5); c.strokeStyle = '#4af0e0'; c.lineWidth = 2.2; c.stroke();
    c.beginPath(); c.arc(0, 0, 2.5, 0, Math.PI * 1.5); c.stroke();
    g.circle(c, -10, 17, 3, '#e8c040', O, 1); g.circle(c, 0, 17, 3, '#60d070', O, 1); g.circle(c, 10, 17, 3, '#e05050', O, 1);
  });
  def('tammys_head', (c, g) => {
    g.poly(c, [[-22, -4], [-20, -26], [-6, -15]], '#f09a3a', O, 2); g.poly(c, [[22, -4], [20, -26], [6, -15]], '#f09a3a', O, 2);
    g.poly(c, [[-19, -8], [-18, -20], [-10, -14]], '#ffb0b0'); g.poly(c, [[19, -8], [18, -20], [10, -14]], '#ffb0b0');
    g.ellipse(c, 0, 4, 24, 20, '#f6a444', O, 2.4);
    g.line(c, -4, -14, -4, -8, '#b86a1c', 2.5); g.line(c, 4, -14, 4, -8, '#b86a1c', 2.5);
    g.line(c, -22, 2, -15, 4, '#b86a1c', 2.5); g.line(c, 22, 2, 15, 4, '#b86a1c', 2.5);
    g.ellipse(c, -9, 0, 4, 5, '#ffe14a', O, 1.4); g.ellipse(c, 9, 0, 4, 5, '#ffe14a', O, 1.4);
    g.ellipse(c, -9, 0, 1.3, 4, '#000'); g.ellipse(c, 9, 0, 1.3, 4, '#000');
    g.poly(c, [[-3, 8], [3, 8], [0, 12]], '#ff7a8a', O, 1.2);
    g.line(c, -16, 12, -28, 10, O, 1.3); g.line(c, 16, 12, 28, 10, O, 1.3);
  });
  def('anarchist_cookbook', (c, g) => {
    book(c, g, '#c83a30', '#821c1c', '#f2c25a');
    g.circle(c, -4, 4, 9, '#262630', O, 1.8); g.line(c, 0, -3, 5, -10, '#d8c090', 2.2);
    g.star(c, 7, -12, 5, 2, 6, '#ffd84a', O, 1.2); g.circle(c, -7, 1, 2, 'rgba(255,255,255,.5)');
  });
  def('book_of_shadows', (c, g) => {
    book(c, g, '#6a3ea8', '#3c1f6a', '#c8a8f0');
    g.ellipse(c, -3, -2, 11, 7, '#f6ecff', O, 1.6); g.circle(c, -3, -2, 4.5, '#6a2ac0', O, 1.2); g.circle(c, -3, -2, 1.8, '#000');
    g.line(c, -3, -13, -3, -17, '#c8a8f0', 1.5); g.line(c, -12, -11, -14, -15, '#c8a8f0', 1.5); g.line(c, 6, -11, 8, -15, '#c8a8f0', 1.5);
  });
  def('how_to_jump', (c, g) => {
    book(c, g, '#3a86d8', '#1e4f90', '#bfe0ff');
    g.circle(c, -3, -8, 4, '#fff', O, 1.4);
    g.line(c, -3, -4, -3, 5, '#fff', 2.6); g.line(c, -3, -1, -10, -6, '#fff', 2.4); g.line(c, -3, -1, 4, -6, '#fff', 2.4);
    g.line(c, -3, 5, -10, 10, '#fff', 2.4); g.line(c, -3, 5, 4, 11, '#fff', 2.4);
    g.line(c, -12, 15, 8, 15, '#bfe0ff', 2);
  });
  def('flush', (c, g) => {
    c.save(); c.rotate(0.2);
    g.rrect(c, -3, -30, 6, 32, 3, '#c8955a', O, 2);
    g.poly(c, [[-18, 4], [18, 4], [24, 26], [-24, 26]], '#e03a3a', O, 2.4);
    g.ellipse(c, 0, 26, 24, 5, '#b02a2a', O, 2);
    g.ellipse(c, 0, 4, 18, 4.5, '#ff6a5a', O, 1.8);
    g.ellipse(c, -10, 15, 3, 6, 'rgba(255,255,255,.4)');
    c.restore();
  });

  // ===================== BOMBAS / MONEDAS / LLAVES =====================
  function bomb(c, g, r, body) {
    g.circle(c, 0, 4, r, body, O, 2.4);
    g.circle(c, -r * 0.35, 4 - r * 0.35, r * 0.22, 'rgba(255,255,255,.5)');
    g.rrect(c, -5, 4 - r - 4, 10, 7, 2, '#555a66', O, 1.8);
    c.beginPath(); c.moveTo(0, 4 - r - 4); c.quadraticCurveTo(8, 4 - r - 14, 15, 4 - r - 12);
    c.strokeStyle = '#c9a56a'; c.lineWidth = 2.6; c.stroke();
    g.star(c, 16, 4 - r - 13, 6, 2.5, 6, '#ffb030', O, 1.2);
  }
  def('boom', (c, g) => { bomb(c, g, 17, '#6a6e7a'); });
  def('mr_mega', (c, g) => {
    bomb(c, g, 22, '#5a5e6c');
    g.poly(c, [[-12, 18], [-12, -6], [-6, -6], [0, 6], [6, -6], [12, -6], [12, 18], [6, 18], [6, 4], [0, 14], [-6, 4], [-6, 18]], '#f2c230', O, 1.6);
  });
  def('pyro', (c, g) => {
    g.rrect(c, -22, -6, 44, 30, 4, '#d8352c', O, 2.4);
    g.line(c, -22, 4, 22, 4, '#8a1c18', 2);
    for (const x of [-10, 0, 10]) { g.rrect(c, x - 4, -22, 8, 18, 3, '#e8483a', O, 1.8); g.line(c, x, -22, x + 2, -28, '#c9a56a', 2); }
    g.poly(c, [[0, 8], [7, 17], [3, 22], [-3, 22], [-7, 17]], '#ffd23a', O, 1.5);
    g.poly(c, [[0, 13], [3, 18], [0, 21], [-3, 18]], '#ff7a1a');
  });
  def('bomb_bag', (c, g) => {
    g.circle(c, -7, -10, 8, '#32343c', O, 1.8); g.circle(c, 8, -12, 8, '#3a3c46', O, 1.8);
    g.line(c, 8, -20, 14, -26, '#c9a56a', 2.2);
    g.poly(c, [[-12, -6], [12, -6], [24, 12], [18, 26], [-18, 26], [-24, 12]], '#a8723a', O, 2.4);
    g.rrect(c, -14, -8, 28, 7, 3, '#7a4c22', O, 1.8);
    g.line(c, -12, 6, 12, 6, '#7a4c22', 1.8); g.ellipse(c, -8, 14, 3, 6, 'rgba(255,255,255,.25)');
  });
  def('a_dollar', (c, g) => {
    c.save(); c.rotate(-0.15);
    g.rrect(c, -26, -14, 52, 28, 4, '#6ec060', O, 2.4);
    g.rrect(c, -22, -10, 44, 20, 3, null, '#2e7a34', 1.4);
    g.circle(c, 0, 0, 8, '#a8e090', '#2e7a34', 1.6);
    g.line(c, 0, -5, 0, 5, '#2e7a34', 2.4); g.circle(c, -17, 0, 2.5, '#2e7a34'); g.circle(c, 17, 0, 2.5, '#2e7a34');
    c.restore();
  });
  def('a_quarter', (c, g) => {
    g.circle(c, 0, 0, 25, '#f2c230', O, 2.6);
    g.circle(c, 0, 0, 19, '#d89a1c', '#a86e10', 1.8);
    g.star(c, 0, 0, 12, 5, 5, '#ffe27a', '#a86e10', 1.4);
    g.ellipse(c, -10, -12, 7, 3, 'rgba(255,255,255,.55)', null, 0, -0.7);
  });
  def('steam_sale', (c, g) => {
    g.line(c, -14, -28, -14, -18, O, 2.5); g.line(c, 14, -28, 14, -18, O, 2.5);
    g.rrect(c, -26, -20, 52, 40, 6, '#d8352c', O, 2.6);
    g.rrect(c, -22, -16, 44, 32, 4, null, '#fff', 1.6);
    g.circle(c, -9, -6, 4.5, null, '#fff', 3); g.circle(c, 9, 6, 4.5, null, '#fff', 3);
    g.line(c, 10, -10, -10, 10, '#fff', 3.2);
  });
  def('contract_from_below', (c, g) => {
    g.rrect(c, -18, -26, 36, 46, 3, '#cdb48a', O, 2.2);
    g.ellipse(c, 0, -26, 18, 4, '#a08558', O, 2); g.ellipse(c, 0, 20, 18, 4, '#a08558', O, 2);
    for (let i = 0; i < 4; i++) g.line(c, -11, -17 + i * 7, 11 - (i % 2) * 6, -17 + i * 7, '#4a2a1c', 1.8);
    g.circle(c, 6, 14, 8, '#7a1020', O, 1.8); g.star(c, 6, 14, 5, 2, 5, '#c02a3a', null, 0);
    g.poly(c, [[2, 20], [0, 28], [6, 23]], '#7a1020', O, 1.2);
  });
  def('skeleton_key', (c, g) => {
    g.circle(c, 0, -16, 13, '#ece6d4', O, 2.4);
    g.circle(c, -5, -17, 3.5, '#1a1410'); g.circle(c, 5, -17, 3.5, '#1a1410');
    g.poly(c, [[0, -13], [-2, -9], [2, -9]], '#1a1410');
    g.rrect(c, -7, -6, 14, 5, 2, '#ece6d4', O, 1.6);
    g.rrect(c, -3, -2, 6, 28, 2, '#ece6d4', O, 2);
    g.rrect(c, 3, 14, 8, 5, 1.5, '#ece6d4', O, 1.6); g.rrect(c, 3, 22, 6, 4, 1.5, '#ece6d4', O, 1.6);
  });
  def('paper_clip', (c, g) => {
    c.save(); c.rotate(0.4); c.strokeStyle = O; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
    const clip = () => { c.beginPath(); c.moveTo(-6, 14); c.lineTo(-6, -14); c.arc(0, -14, 6, Math.PI, 0); c.lineTo(6, 20);
      c.arc(-1, 20, 7, 0, Math.PI); c.lineTo(-8, -20); c.arc(-1, -20, 7, Math.PI, Math.PI * 1.9); };
    clip(); c.stroke(); c.strokeStyle = '#b8c0d0'; c.lineWidth = 3.4; clip(); c.stroke();
    c.restore();
  });

  // ===================== ESPECIALES =====================
  def('guppys_head', (c, g) => {
    g.poly(c, [[-24, -2], [-21, -24], [-7, -14]], '#a8703a', O, 2); g.poly(c, [[24, -2], [21, -24], [7, -14]], '#a8703a', O, 2);
    g.ellipse(c, 0, 4, 25, 20, '#b8793c', O, 2.4);
    g.ellipse(c, -9, 0, 4.5, 5, '#e8f0a0', O, 1.4); g.ellipse(c, 9, 0, 4.5, 5, '#e8f0a0', O, 1.4);
    g.ellipse(c, -9, 0, 1.4, 4, '#000'); g.ellipse(c, 9, 0, 1.4, 4, '#000');
    g.poly(c, [[-3, 8], [3, 8], [0, 12]], '#e8607a', O, 1.2);
    g.line(c, -17, 10, -29, 8, O, 1.3); g.line(c, 17, 10, 29, 8, O, 1.3);
    g.ellipse(c, 24, -18, 4, 2.4, 'rgba(190,225,255,.9)', O, 1, -0.5); g.circle(c, 24, -14, 3, '#3a6ed8', O, 1.2);
  });
  def('guppys_collar', (c, g) => {
    c.beginPath(); c.ellipse(0, -4, 24, 16, 0, 0, Math.PI * 2);
    c.strokeStyle = O; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#d8352c'; c.lineWidth = 5.5; c.stroke();
    g.circle(c, 0, 14, 8, '#f2c230', O, 2.2); g.line(c, -4, 14, 4, 14, '#a86e10', 1.6);
    g.circle(c, 0, 17, 1.8, '#a86e10'); g.circle(c, -3, 11, 2, 'rgba(255,255,255,.7)');
  });
  def('guppys_hairball', (c, g) => {
    c.save(); c.strokeStyle = '#6a4220'; c.lineWidth = 2.6; c.lineCap = 'round';
    for (let i = 0; i < 18; i++) { const a = i * Math.PI / 9; c.beginPath(); c.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
      c.lineTo(Math.cos(a + 0.2) * 26, Math.sin(a + 0.2) * 26); c.stroke(); }
    c.restore();
    g.circle(c, 0, 0, 20, '#9a6638', O, 2.4);
    g.circle(c, -7, -4, 4.5, '#fff', O, 1.2); g.circle(c, 7, -4, 4.5, '#fff', O, 1.2);
    g.circle(c, -6, -3, 2, '#111'); g.circle(c, 8, -3, 2, '#111');
    g.line(c, -4, 8, 4, 8, '#4a2a10', 2);
  });
  def('transcendence', (c, g) => {
    for (let k = 0; k < 2; k++) {
      c.beginPath();
      for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * Math.PI * 5.5, r = 4 + t * 22;
        const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.8; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.strokeStyle = k ? '#d8b070' : O; c.lineWidth = k ? 5 : 8; c.lineCap = 'round'; c.stroke();
    }
    c.beginPath(); c.moveTo(-4, 1); c.lineTo(-14, 14); c.lineTo(-24, 18);
    c.strokeStyle = O; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#d8b070'; c.lineWidth = 5; c.stroke();
    g.line(c, -8, -2, 6, -6, '#a07a40', 1.4);
  });
  def('polyphemus', (c, g) => {
    g.ellipse(c, 0, 0, 29, 22, '#fff4ee', O, 2.6);
    c.save(); c.beginPath(); c.ellipse(0, 0, 28, 21, 0, 0, Math.PI * 2); c.clip();
    g.line(c, -28, -8, -14, -5, '#d84a4a', 1.4); g.line(c, 28, 8, 14, 6, '#d84a4a', 1.4); g.line(c, 22, -14, 12, -8, '#d84a4a', 1.4);
    c.restore();
    g.circle(c, 0, 0, 14, '#5a3a8a', O, 2.2); g.circle(c, 0, 0, 7.5, '#050308');
    g.circle(c, -4, -4, 3, '#fff');
  });
  def('sacred_heart', (c, g) => {
    g.poly(c, [[-12, -2], [-30, -18], [-26, -4], [-32, 2], [-24, 8], [-18, 12], [-12, 8]], '#f4f8ff', O, 2);
    g.poly(c, [[12, -2], [30, -18], [26, -4], [32, 2], [24, 8], [18, 12], [12, 8]], '#f4f8ff', O, 2);
    g.heart(c, 0, 2, 48, '#fffafc', O, 2.6);
    g.heart(c, 0, 4, 32, null, '#ffd0e0', 1.8);
    g.ellipse(c, -8, -8, 4.5, 2.5, 'rgba(160,200,255,.7)', null, 0, -0.6);
  });
  def('mutant_spider', (c, g) => {
    c.save(); c.strokeStyle = O; c.lineWidth = 3.2; c.lineCap = 'round';
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const y = -10 + i * 8; c.beginPath(); c.moveTo(s * 8, y * 0.5);
      c.lineTo(s * 22, y - 10 + (i % 2) * 4); c.lineTo(s * 30, y + 10); c.stroke();
    }
    c.restore();
    g.circle(c, 0, 4, 16, '#4cb83a', O, 2.4); g.circle(c, 0, -10, 11, '#6cd84a', O, 2.2);
    for (const [x, y] of [[-7, -13], [-2.5, -9], [2.5, -9], [7, -13]]) { g.circle(c, x, y, 3, '#fff', O, 1); g.circle(c, x, y + 0.5, 1.4, '#111'); }
    g.circle(c, 0, 8, 4, '#2a7a22');
  });
  def('proptosis', (c, g) => {
    g.circle(c, 0, 0, 24, '#f6d0c8', O, 2.6);
    g.circle(c, 0, 0, 18, '#ffffff', '#d84a4a', 1.8);
    g.line(c, -24, -4, -12, -2, '#e02a2a', 1.6); g.line(c, 24, 6, 12, 3, '#e02a2a', 1.6); g.line(c, 6, 22, 4, 12, '#e02a2a', 1.6);
    g.circle(c, 3, 2, 10, '#c01818', O, 1.8); g.circle(c, 3, 2, 4.5, '#100000'); g.circle(c, -1, -3, 2.5, '#fff');
  });
  def('holy_grail', (c, g) => {
    g.poly(c, [[-12, -8], [-30, -22], [-26, -6], [-31, 0], [-22, 4], [-12, 4]], '#fff6d8', O, 2);
    g.poly(c, [[12, -8], [30, -22], [26, -6], [31, 0], [22, 4], [12, 4]], '#fff6d8', O, 2);
    g.poly(c, [[-14, -22], [14, -22], [12, -4], [5, 4], [-5, 4], [-12, -4]], '#f2c230', O, 2.4);
    g.rrect(c, -3, 4, 6, 13, 2, '#d89a1c', O, 2); g.ellipse(c, 0, 22, 12, 4.5, '#f2c230', O, 2.2);
    g.ellipse(c, 0, -22, 14, 3.5, '#a86e10', O, 1.8); g.ellipse(c, -7, -12, 2.5, 6, 'rgba(255,255,255,.5)');
    g.circle(c, 0, -10, 2.6, '#d8352c', O, 1);
  });
  def('the_parasite', (c, g) => {
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.moveTo(-22, 16); c.bezierCurveTo(-26, -8, 4, -6, 6, 6); c.bezierCurveTo(8, 18, 22, 10, 18, -6);
    c.strokeStyle = O; c.lineWidth = 16; c.stroke(); c.strokeStyle = '#7ccf3a'; c.lineWidth = 11; c.stroke();
    c.restore();
    for (const [x, y] of [[-22, 6], [-14, -4], [-1, -3], [8, 14], [17, 4]]) g.line(c, x - 3, y - 3, x + 3, y + 3, '#4f9a22', 2);
    g.circle(c, 18, -8, 9, '#9be050', O, 2.2); g.circle(c, 16, -10, 2.6, '#fff', O, 1); g.circle(c, 22, -10, 2.6, '#fff', O, 1);
    g.circle(c, 16, -10, 1.2, '#111'); g.circle(c, 22, -10, 1.2, '#111'); g.ellipse(c, 19, -3, 3.5, 2, '#2a4a12');
    g.line(c, -22, 16, -28, 22, O, 3);
  });
})();
