// Genera precache-manifest.js: lista de archivos de la app y una versión (hash del contenido).
// Uso: npm run precache      (con --check solo comprueba que está al día)
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INCLUDE_DIRS = ['css', 'js', 'content', 'icons', 'vendor/rdkit'];
const INCLUDE_FILES = ['index.html', 'manifest.webmanifest'];
const EXT = /\.(html|css|js|mjs|json|wasm|svg|png|webmanifest)$/;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(path.join(root, dir)).sort()) {
    const rel = path.posix.join(dir, name);
    const st = statSync(path.join(root, rel));
    if (st.isDirectory()) out.push(...walk(rel));
    else if (EXT.test(name) && name !== 'package.json') out.push(rel);
  }
  return out;
}

export function listFiles() {
  const files = [...INCLUDE_FILES];
  for (const d of INCLUDE_DIRS) if (existsSync(path.join(root, d))) files.push(...walk(d));
  return files;
}

export function buildManifest() {
  const files = listFiles();
  const hash = createHash('sha256');
  for (const f of files) { hash.update(f); hash.update(readFileSync(path.join(root, f))); }
  hash.update(readFileSync(path.join(root, 'sw.js')));
  const version = hash.digest('hex').slice(0, 12);
  const list = ['./', ...files.map((f) => './' + f)];
  return `// Generado por tools/build-precache.mjs. No editar a mano: ejecuta \`npm run precache\`.\nself.__PRECACHE = ${JSON.stringify({ version, files: list }, null, 2)};\n`;
}

const target = path.join(root, 'precache-manifest.js');
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const content = buildManifest();
  if (process.argv.includes('--check')) {
    const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
    if (current !== content) {
      console.error('precache-manifest.js no está al día. Ejecuta: npm run precache');
      process.exit(1);
    }
    console.log('precache-manifest.js al día');
  } else {
    writeFileSync(target, content);
    console.log('precache-manifest.js generado');
  }
}
