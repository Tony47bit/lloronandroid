// Copia los archivos web del juego a ./www (carpeta que Capacitor empaqueta).
// Copia index.html, style.css y TODA la carpeta js/ (módulos del juego).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of ['index.html', 'style.css']) {
  fs.copyFileSync(path.join(root, f), path.join(out, f));
  console.log('copiado ->', path.join('www', f));
}
fs.cpSync(path.join(root, 'js'), path.join(out, 'js'), { recursive: true });
console.log('copiado -> www/js (recursivo)');
