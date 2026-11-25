// Carga RDKit (copia en vendor/) para los tests de Node.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { setRDKit } from '../js/chem/rdkit.js';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let ready = null;
export function loadRDKitNode() {
  if (!ready) {
    const init = require(path.join(root, 'vendor/rdkit/RDKit_minimal.js'));
    ready = init({ locateFile: (f) => path.join(root, 'vendor/rdkit', f) }).then((R) => {
      setRDKit(R);
      return R;
    });
  }
  return ready;
}

export { root };
