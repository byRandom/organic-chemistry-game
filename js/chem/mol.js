// Grafo molecular básico: átomos, enlaces, valencias, fórmula y SMILES.
// Los hidrógenos son implícitos salvo que se dibujen explícitamente como átomos "H".

export const ELEMENTS = {
  H: { valences: [1], name: 'hidrógeno', z: 1 },
  B: { valences: [3], name: 'boro', z: 5 },
  C: { valences: [4], name: 'carbono', z: 6 },
  N: { valences: [3], name: 'nitrógeno', z: 7 },
  O: { valences: [2], name: 'oxígeno', z: 8 },
  F: { valences: [1], name: 'flúor', z: 9 },
  Na: { valences: [1], name: 'sodio', z: 11 },
  Mg: { valences: [2], name: 'magnesio', z: 12 },
  Si: { valences: [4], name: 'silicio', z: 14 },
  P: { valences: [3, 5], name: 'fósforo', z: 15 },
  S: { valences: [2, 4, 6], name: 'azufre', z: 16 },
  Cl: { valences: [1], name: 'cloro', z: 17 },
  K: { valences: [1], name: 'potasio', z: 19 },
  Br: { valences: [1], name: 'bromo', z: 35 },
  I: { valences: [1], name: 'yodo', z: 53 },
  Li: { valences: [1], name: 'litio', z: 3 },
};

const Z_TO_EL = Object.fromEntries(Object.entries(ELEMENTS).map(([el, d]) => [d.z, el]));

export function createMol() {
  return { atoms: [], bonds: [] };
}

export function cloneMol(m) {
  return {
    atoms: m.atoms.map((a) => ({ ...a })),
    bonds: m.bonds.map((b) => ({ ...b })),
  };
}

export function addAtom(m, el, x = 0, y = 0, chg = 0) {
  m.atoms.push({ el, chg, x, y });
  return m.atoms.length - 1;
}

export function findBond(m, a, b) {
  return m.bonds.findIndex((bd) => (bd.a === a && bd.b === b) || (bd.a === b && bd.b === a));
}

export function addBond(m, a, b, o = 1) {
  if (a === b) return -1;
  const i = findBond(m, a, b);
  if (i >= 0) {
    m.bonds[i].o = o;
    return i;
  }
  m.bonds.push({ a, b, o });
  return m.bonds.length - 1;
}

export function removeBond(m, i) {
  m.bonds.splice(i, 1);
}

export function removeAtom(m, i) {
  m.bonds = m.bonds
    .filter((b) => b.a !== i && b.b !== i)
    .map((b) => ({ ...b, a: b.a > i ? b.a - 1 : b.a, b: b.b > i ? b.b - 1 : b.b }));
  m.atoms.splice(i, 1);
}

export function neighbors(m, i) {
  const out = [];
  for (const b of m.bonds) {
    if (b.a === i) out.push({ atom: b.b, order: b.o });
    else if (b.b === i) out.push({ atom: b.a, order: b.o });
  }
  return out;
}

export function bondOrderSum(m, i) {
  let s = 0;
  for (const b of m.bonds) if (b.a === i || b.b === i) s += b.o;
  return s;
}

/** Valencia efectiva teniendo en cuenta la carga formal (N+ = 4, O- = 1, C+ = 3...). */
export function allowedValences(el, chg = 0) {
  const base = ELEMENTS[el]?.valences ?? [4];
  if (!chg) return base;
  if (el === 'C' || el === 'Si') return [4 - Math.abs(chg)];
  if (el === 'B') return [3 - chg];
  if (['N', 'P', 'O', 'S'].includes(el)) return base.map((v) => v + chg).filter((v) => v >= 0);
  if (['F', 'Cl', 'Br', 'I'].includes(el)) return [Math.max(0, 1 + chg)];
  return base.map((v) => Math.max(0, v - Math.abs(chg)));
}

export function maxValence(el, chg = 0) {
  const v = allowedValences(el, chg);
  return Math.max(...v);
}

/** Número de hidrógenos implícitos (nunca negativo). */
export function implicitH(m, i) {
  const a = m.atoms[i];
  if (a.el === 'H') return 0;
  const used = bondOrderSum(m, i);
  for (const v of allowedValences(a.el, a.chg)) if (v >= used) return v - used;
  return 0;
}

/** Átomos que superan su valencia máxima. */
export function valenceErrors(m) {
  const bad = [];
  m.atoms.forEach((a, i) => {
    if (bondOrderSum(m, i) > maxValence(a.el, a.chg)) bad.push(i);
  });
  return bad;
}

/** ¿Se puede aumentar en `extra` el orden de enlace total del átomo i? */
export function canAddBondOrder(m, i, extra) {
  const a = m.atoms[i];
  return bondOrderSum(m, i) + extra <= maxValence(a.el, a.chg);
}

export function totalH(m) {
  let h = 0;
  m.atoms.forEach((a, i) => {
    if (a.el === 'H') h += 1;
    else h += implicitH(m, i);
  });
  return h;
}

/** Fórmula molecular en sistema de Hill: C, H y después orden alfabético. */
export function formula(m) {
  const counts = {};
  m.atoms.forEach((a, i) => {
    counts[a.el] = (counts[a.el] || 0) + 1;
    if (a.el !== 'H') {
      const h = implicitH(m, i);
      if (h) counts.H = (counts.H || 0) + h;
    }
  });
  const charge = m.atoms.reduce((s, a) => s + (a.chg || 0), 0);
  const keys = Object.keys(counts);
  const order = counts.C
    ? ['C', 'H', ...keys.filter((k) => k !== 'C' && k !== 'H').sort()]
    : keys.sort();
  let f = '';
  for (const k of order) if (counts[k]) f += k + (counts[k] > 1 ? counts[k] : '');
  if (charge) f += (Math.abs(charge) > 1 ? Math.abs(charge) : '') + (charge > 0 ? '+' : '-');
  return f;
}

const SUB = '₀₁₂₃₄₅₆₇₈₉';
export function prettyFormula(f) {
  return f.replace(/\d/g, (d) => SUB[+d]).replace(/\+$/, '⁺').replace(/-$/, '⁻');
}

/** Componentes conexas (listas de índices de átomo). */
export function fragments(m) {
  const seen = new Array(m.atoms.length).fill(false);
  const out = [];
  for (let s = 0; s < m.atoms.length; s++) {
    if (seen[s]) continue;
    const comp = [];
    const stack = [s];
    seen[s] = true;
    while (stack.length) {
      const u = stack.pop();
      comp.push(u);
      for (const { atom } of neighbors(m, u)) if (!seen[atom]) { seen[atom] = true; stack.push(atom); }
    }
    out.push(comp.sort((a, b) => a - b));
  }
  return out;
}

const BOND_SYM = { 1: '', 2: '=', 3: '#' };

function atomToken(m, i, chir) {
  const a = m.atoms[i];
  const h = implicitH(m, i);
  let s = '[' + a.el + (chir?.[i] || '');
  if (h) s += 'H' + (h > 1 ? h : '');
  if (a.chg) s += (a.chg > 0 ? '+' : '-') + (Math.abs(a.chg) > 1 ? Math.abs(a.chg) : '');
  return s + ']';
}

/**
 * SMILES (no canónico) con todos los átomos entre corchetes y su número de H explícito,
 * para que RDKit lo interprete exactamente igual que nuestro grafo.
 */
export function toSmiles(m, opts = {}) {
  const n = m.atoms.length;
  if (!n) return opts.conOrden ? { smiles: '', orden: [] } : '';
  const { chir = null, dir = null } = opts;
  const sym = (idx) => (m.bonds[idx].o === 1 && dir?.[idx]) || BOND_SYM[m.bonds[idx].o];
  const salida = [];
  const adj = Array.from({ length: n }, () => []);
  m.bonds.forEach((b, idx) => {
    adj[b.a].push({ to: b.b, idx });
    adj[b.b].push({ to: b.a, idx });
  });
  const visited = new Array(n).fill(false);
  const order = new Array(n).fill(-1);
  const treeBond = new Set();
  const ringOpen = Array.from({ length: n }, () => []); // cierres que abre el átomo
  const ringClose = Array.from({ length: n }, () => []); // cierres que cierra el átomo
  let counter = 0;

  // Pasada 1: árbol DFS y enlaces de cierre de anillo.
  function dfs1(u, parentBond) {
    visited[u] = true;
    order[u] = counter++;
    for (const { to, idx } of adj[u]) {
      if (idx === parentBond) continue;
      if (!visited[to]) {
        treeBond.add(idx);
        dfs1(to, idx);
      } else if (order[to] < order[u] && !treeBond.has(idx)) {
        ringOpen[to].push(idx);
        ringClose[u].push(idx);
      }
    }
  }

  // Pasada 2: escritura.
  const ringDigit = new Map();
  const freeDigits = [];
  let nextDigit = 1;
  const digitStr = (d) => (d < 10 ? String(d) : '%' + d);
  function takeDigit() {
    if (freeDigits.length) { freeDigits.sort((a, b) => a - b); return freeDigits.shift(); }
    return nextDigit++;
  }

  function dfs2(u, parentBond) {
    salida.push(u);
    let s = atomToken(m, u, chir);
    for (const idx of ringClose[u]) {
      const d = ringDigit.get(idx);
      s += sym(idx) + digitStr(d);
      freeDigits.push(d);
    }
    for (const idx of ringOpen[u]) {
      const d = takeDigit();
      ringDigit.set(idx, d);
      s += digitStr(d);
    }
    const children = adj[u].filter(({ idx }) => treeBond.has(idx) && idx !== parentBond);
    children.forEach(({ to, idx }, k) => {
      const branch = sym(idx) + dfs2(to, idx);
      s += k < children.length - 1 ? '(' + branch + ')' : branch;
    });
    return s;
  }

  const parts = [];
  for (let s = 0; s < n; s++) {
    if (visited[s]) continue;
    dfs1(s, -1);
    parts.push(dfs2(s, -1));
  }
  const smiles = parts.join('.');
  return opts.conOrden ? { smiles, orden: salida } : smiles;
}

/** Construye nuestro grafo a partir del JSON de RDKit (forma de Kekulé). */
export function fromRDKitJSON(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const mol = data.molecules[0];
  const defA = data.defaults.atom;
  const defB = data.defaults.bond;
  const m = createMol();
  for (const a of mol.atoms) {
    const z = a.z ?? defA.z;
    m.atoms.push({ el: Z_TO_EL[z] ?? 'C', chg: a.chg ?? defA.chg, x: 0, y: 0 });
  }
  for (const b of mol.bonds) {
    const bo = b.bo ?? defB.bo;
    m.bonds.push({ a: b.atoms[0], b: b.atoms[1], o: bo === 1.5 ? 1 : bo });
  }
  const ext = (mol.extensions || []).find((e) => e.name === 'rdkitRepresentation');
  if (ext?.cipCodes) m.cip = Object.fromEntries(ext.cipCodes);
  if (ext?.cipRanks) m.ranks = ext.cipRanks;
  return m;
}

/** Centro geométrico. */
export function centroid(m, idxs = null) {
  const list = idxs ?? m.atoms.map((_, i) => i);
  if (!list.length) return { x: 0, y: 0 };
  let x = 0, y = 0;
  for (const i of list) { x += m.atoms[i].x; y += m.atoms[i].y; }
  return { x: x / list.length, y: y / list.length };
}
