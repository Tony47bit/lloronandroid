/* Punto de entrada: arranca el bucle cuando todos los módulos están cargados. */
(function () {
  'use strict';
  const L = window.Lagrimas;
  const S = L.S;

  L.start = function () {
    const canvas = document.getElementById('game');
    L.View.init(canvas);
    L.Input.bind(canvas);
    L.Save.load();
    let last = performance.now();
    function frame(ts) {
      const dt = Math.min((ts - last) / 1000, 0.05); last = ts;
      if (S.state === 'menu') S.menuT += dt;
      else if (S.state === 'gameover') S.goT += dt;
      else L.Engine.update(dt);
      L.Render.draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  };
})();
