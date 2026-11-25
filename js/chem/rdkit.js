// Envoltorio de RDKit.js: carga, SMILES canónico y coordenadas 2D.
import { fromRDKitJSON, toSmiles } from './mol.js';

let RD = null;
let loading = null;

/** Para los tests en Node: inyecta un módulo RDKit ya inicializado. */
export function setRDKit(instance) {
  RD = instance;
}

export function rdkit() {
  if (!RD) throw new Error('RDKit no está cargado todavía');
  return RD;
}

export function isReady() {
  return !!RD;
}

/** Carga RDKit en el navegador (el script vendor/rdkit/RDKit_minimal.js define initRDKitModule). */
export function loadRDKit(base = './vendor/rdkit/') {
  if (RD) return Promise.resolve(RD);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const start = () =>
      window
        .initRDKitModule({ locateFile: (f) => base + f })
        .then((instance) => { RD = instance; resolve(RD); })
        .catch(reject);
    if (window.initRDKitModule) return start();
    const s = document.createElement('script');
    s.src = base + 'RDKit_minimal.js';
    s.onload = start;
    s.onerror = () => reject(new Error('No se pudo cargar RDKit'));
    document.head.appendChild(s);
  });
  return loading;
}

function withMol(smiles, fn, details = null) {
  const m = details ? RD.get_mol(smiles, JSON.stringify(details)) : RD.get_mol(smiles);
  if (!m) return null;
  try {
    if (!m.is_valid()) return null;
    return fn(m);
  } finally {
    m.delete();
  }
}

/** SMILES canónico de RDKit o null si no es una estructura válida. */
export function canonical(smiles, { stereo = true } = {}) {
  if (!smiles) return null;
  const s = stereo ? smiles : smiles.replace(/[@/\\]/g, '');
  return withMol(s, (m) => m.get_smiles());
}

/** Canónico de nuestro grafo. */
export function canonicalOf(mol, opts) {
  return canonical(toSmiles(mol), opts);
}

/** Molécula (nuestro grafo) con coordenadas 2D calculadas por RDKit, a partir de un SMILES. */
export function molFromSmiles(smiles, { bondLength = 40, keepH = false } = {}) {
  return withMol(smiles, (m) => {
    m.set_new_coords(true);
    const mol = fromRDKitJSON(m.get_json());
    const lines = m.get_molblock().split('\n');
    const n = parseInt(lines[3].slice(0, 3), 10);
    const scale = bondLength / 1.5;
    for (let i = 0; i < n && i < mol.atoms.length; i++) {
      const l = lines[4 + i];
      mol.atoms[i].x = parseFloat(l.slice(0, 10)) * scale;
      mol.atoms[i].y = -parseFloat(l.slice(10, 20)) * scale;
    }
    // cuñas (1) y rayas (6): el primer átomo de la línea es el extremo estrecho (el estereocentro)
    const nb = parseInt(lines[3].slice(3, 6), 10);
    for (let k = 0; k < nb; k++) {
      const l = lines[4 + n + k];
      const a = parseInt(l.slice(0, 3), 10) - 1, b = parseInt(l.slice(3, 6), 10) - 1;
      const st = parseInt(l.slice(9, 12), 10);
      if (st === 1 || st === 6) {
        const bd = mol.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
        if (bd) { bd.w = st === 1 ? 'cuña' : 'raya'; bd.desde = a; }
      }
    }
    // centros estereogénicos (también los que no tienen configuración asignada)
    try {
      const tags = JSON.parse(m.get_stereo_tags());
      mol.centros = (tags.CIP_atoms || []).map(([i]) => i);
    } catch { mol.centros = []; }
    return mol;
  }, keepH ? { removeHs: false } : null);
}
