/**
 * Arranque de desenvolvimento: lança o face-service (cálculo de descritores
 * faciais, porta 5101) em segundo plano e depois o `expo start` com o
 * terminal interactivo normal (teclas r/a/j continuam a funcionar).
 * Ao fechar o Expo (Ctrl+C ou 'q'), o face-service é terminado também.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const faceDir = path.join(__dirname, '..', 'face-service');

if (!fs.existsSync(path.join(faceDir, 'node_modules'))) {
  console.error('[dev-start] face-service sem dependências instaladas.');
  console.error(`[dev-start] Corra primeiro: cd ${faceDir} && npm install`);
  process.exit(1);
}

const face = spawn(process.execPath, [path.join(faceDir, 'server.js')], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
face.stdout.on('data', (d) => process.stdout.write(String(d)));
face.stderr.on('data', (d) => process.stderr.write(String(d)));
face.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`[dev-start] face-service terminou com código ${code}`);
  }
});

const expo = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
});

expo.on('exit', (code) => {
  face.kill();
  process.exit(code ?? 0);
});
