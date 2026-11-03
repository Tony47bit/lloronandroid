// Copia los archivos web del juego a ./www (carpeta que Capacitor empaqueta).
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
const files = ['index.html', 'style.css', 'main.js'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const f of files) {
  fs.copyFileSync(path.join(root, f), path.join(out, f));
  console.log('copiado ->', path.join('www', f));
}
