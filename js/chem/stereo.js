// Estereoquímica: etiquetas R/S y generación de proyecciones (Fischer, Newman, caballete)
// que respetan la configuración real de la molécula (calculada por RDKit).
import { neighbors, implicitH } from './mol.js';
import { molFromSmiles, canonical } from './rdkit.js';

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Configuración R/S a partir de las posiciones 3D de los cuatro sustituyentes (relativas al centro).
 * subs: [{rank, pos:[x,y,z]}]; rank mayor = más prioridad (H implícito = -1).
 * Convenio: con el de menor prioridad alejándose del observador, a→b→c en sentido horario es R.
 */
export function etiquetaDesdePosiciones(subs) {
  const s = [...subs].sort((p, q) => q.rank - p.rank);
  const [a, b, c, d] = s.map((x) => x.pos);
  // triple producto de (a-d), (b-d), (c-d): negativo ⇔ horario visto desde el lado opuesto a d
  const t = dot(cross(sub(a, d), sub(b, d)), sub(c, d));
  return t < 0 ? 'R' : 'S';
}

/** Sustituyentes de un centro: vecinos explícitos más los H implícitos. */
function sustituyentes(mol, c) {
  const out = neighbors(mol, c).map(({ atom }) => ({ atom, rank: mol.ranks?.[atom] ?? 0 }));
  for (let k = 0; k < implicitH(mol, c); k++) out.push({ atom: null, rank: -1 });
  return out;
}

/**
 * Geometría 3D aproximada de un centro a partir del dibujo 2D con cuñas y rayas:
 * {clave: [x,y,z]}, donde la clave es el índice del átomo vecino o 'H' (hidrógeno implícito).
 */
export function geometriaDesdeDibujo(mol, c) {
  const C = mol.atoms[c];
  const geo = {};
  const pos = [];
  for (const { atom } of neighbors(mol, c)) {
    const A = mol.atoms[atom];
    const bd = mol.bonds.find((b) => (b.a === c && b.b === atom) || (b.b === c && b.a === atom));
    let z = 0;
    if (bd?.w && bd.desde === c) z = bd.w === 'cuña' ? 1 : -1;
    const v = [A.x - C.x, -(A.y - C.y), 0];
    const l = Math.hypot(v[0], v[1]) || 1;
    geo[atom] = [v[0] / l, v[1] / l, z];
    pos.push(geo[atom]);
  }
  if (implicitH(mol, c) === 1) {
    const sum = pos.reduce((p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]], [0, 0, 0]);
    const h = [-sum[0], -sum[1], -sum[2]];
    if (Math.abs(h[2]) < 0.05) h[2] = pos.some((p) => p[2] > 0) ? -1 : 1;
    geo.H = h;
  }
  return geo;
}

/** R/S a partir de una geometría {clave: pos} y las prioridades (rangos) de los vecinos. */
export function etiquetaDesdeGeometria(geo, rango) {
  return etiquetaDesdePosiciones(Object.entries(geo).map(([k, pos]) => ({ rank: k === 'H' ? -1 : rango(+k), pos })));
}

/** R/S de un centro deducida del dibujo 2D con cuñas y rayas (para comprobar el convenio de signos). */
export function etiquetaDesdeDibujo(mol, c) {
  return etiquetaDesdeGeometria(geometriaDesdeDibujo(mol, c), (a) => mol.ranks?.[a] ?? 0);
}

// ---------- etiquetas de grupos (fórmula condensada) ----------
const SUBD = '₀₁₂₃₄₅₆₇₈₉';
const subN = (n) => (n > 1 ? String(n).replace(/\d/g, (d) => SUBD[+d]) : '');

/** Texto condensado del grupo que cuelga de `atom` visto desde `desde` (p. ej. CH₂CH₃, COOH, OH). */
export function etiquetaGrupo(mol, desde, atom, profundidad = 0) {
  if (atom == null) return 'H';
  const a = mol.atoms[atom];
  const h = implicitH(mol, atom);
  const hijos = neighbors(mol, atom).filter((n) => n.atom !== desde);
  if (profundidad > 6 || enAnillo(mol, desde, atom)) return formulaRama(mol, desde, atom);
  const base = (x, hh) => x + (hh ? 'H' + subN(hh) : '');
  if (a.el === 'C') {
    const dobleO = hijos.find((n) => n.order === 2 && mol.atoms[n.atom].el === 'O');
    if (dobleO) {
      const resto = hijos.filter((n) => n !== dobleO);
      if (!resto.length) return h ? 'CHO' : 'CO';
      const r = resto[0];
      const ra = mol.atoms[r.atom];
      if (ra.el === 'O' && implicitH(mol, r.atom) === 1) return 'COOH';
      if (ra.el === 'O') return 'COO' + etiquetaGrupo(mol, r.atom, neighbors(mol, r.atom).find((n) => n.atom !== atom)?.atom, profundidad + 1);
      if (ra.el === 'N') return 'CO' + etiquetaGrupo(mol, atom, r.atom, profundidad + 1);
      return 'CO' + etiquetaGrupo(mol, atom, r.atom, profundidad + 1);
    }
    const triN = hijos.find((n) => n.order === 3 && mol.atoms[n.atom].el === 'N');
    if (triN) return 'CN';
  }
  if (!hijos.length) return a.el === 'C' ? 'CH' + subN(h) : base(a.el, h);
  const textos = hijos.map((n) => (n.order === 2 ? '=' : n.order === 3 ? '≡' : '') + etiquetaGrupo(mol, atom, n.atom, profundidad + 1));
  if (hijos.length === 1) return base(a.el, h) + textos[0];
  // ramificado: agrupa los iguales, p. ej. CH(CH₃)₂, C(CH₃)₃
  const cuenta = {};
  for (const t of textos) cuenta[t] = (cuenta[t] || 0) + 1;
  const partes = Object.entries(cuenta);
  if (partes.length === 1) return base(a.el, h) + `(${partes[0][0]})` + subN(partes[0][1]);
  const ultimo = textos[textos.length - 1];
  return base(a.el, h) + textos.slice(0, -1).map((t) => `(${t})`).join('') + ultimo;
}

function enAnillo(mol, desde, atom) {
  // ¿se puede volver a `atom` sin pasar por `desde`, por otro camino? (rama con anillo)
  const visto = new Set([desde, atom]);
  const pila = neighbors(mol, atom).filter((n) => n.atom !== desde).map((n) => ({ u: n.atom, p: atom }));
  while (pila.length) {
    const { u, p } = pila.pop();
    for (const { atom: v } of neighbors(mol, u)) {
      if (v === p || v === desde) continue;
      if (v === atom) return true;
      if (!visto.has(v)) { visto.add(v); pila.push({ u: v, p: u }); }
    }
    visto.add(u);
  }
  return false;
}

function formulaRama(mol, desde, atom) {
  const vistos = new Set([desde]);
  const pila = [atom];
  const cuenta = {};
  while (pila.length) {
    const u = pila.pop();
    if (vistos.has(u)) continue;
    vistos.add(u);
    const el = mol.atoms[u].el;
    cuenta[el] = (cuenta[el] || 0) + 1;
    cuenta.H = (cuenta.H || 0) + implicitH(mol, u);
    for (const { atom: v } of neighbors(mol, u)) if (!vistos.has(v)) pila.push(v);
  }
  const orden = ['C', 'H', ...Object.keys(cuenta).filter((k) => k !== 'C' && k !== 'H').sort()];
  return orden.filter((k) => cuenta[k]).map((k) => k + subN(cuenta[k])).join('');
}

// ---------- proyección de Fischer ----------
const FISCHER_POS = { arriba: [0, 1, -1], abajo: [0, -1, -1], izq: [-1, 0, 1], der: [1, 0, 1] };

/** Ordena los estereocentros en una cadena de átomos consecutivos. */
function cadenaDeCentros(mol, centros) {
  if (centros.length === 1) return centros;
  const set = new Set(centros);
  const vecinosCentro = (c) => neighbors(mol, c).map((n) => n.atom).filter((a) => set.has(a));
  const inicio = centros.find((c) => vecinosCentro(c).length <= 1) ?? centros[0];
  const orden = [inicio];
  while (orden.length < centros.length) {
    const sig = vecinosCentro(orden[orden.length - 1]).find((a) => !orden.includes(a));
    if (sig == null) throw new Error('Los estereocentros no forman una cadena: indica la cadena a mano');
    orden.push(sig);
  }
  return orden;
}

/**
 * Proyección de Fischer de una molécula con estereocentros consecutivos.
 * Devuelve { arriba, abajo, filas: [{centro, izq, der, etiqueta}] } con textos de grupos.
 * opts.invertir: da la vuelta a la cadena (otra orientación válida).
 */
export function fischer(smiles, opts = {}) {
  const mol = molFromSmiles(smiles);
  if (!mol) throw new Error('SMILES no válido: ' + smiles);
  const centros = Object.keys(mol.cip || {}).map(Number);
  if (!centros.length) throw new Error('La molécula no tiene estereocentros con configuración definida');
  let cadena = cadenaDeCentros(mol, opts.cadena || centros);
  const extremos = (c, excluir) => sustituyentes(mol, c)
    .filter((s) => s.atom == null || !excluir.includes(s.atom));
  const elegirVertical = (c, excluir) => {
    // el grupo vertical exterior: preferimos carbono; entre varios, el de mayor prioridad CIP
    const cands = extremos(c, excluir).filter((s) => s.atom != null);
    cands.sort((p, q) => (mol.atoms[q.atom].el === 'C') - (mol.atoms[p.atom].el === 'C') || q.rank - p.rank);
    return cands[0];
  };
  let topSub, botSub;
  if (cadena.length === 1) {
    const c = cadena[0];
    const cands = extremos(c, []).filter((s) => s.atom != null && mol.atoms[s.atom].el === 'C');
    const todos = extremos(c, []).filter((s) => s.atom != null);
    const lista = (cands.length >= 2 ? cands : todos).sort((p, q) => q.rank - p.rank);
    [topSub, botSub] = lista;
  } else {
    topSub = elegirVertical(cadena[0], [cadena[1]]);
    botSub = elegirVertical(cadena[cadena.length - 1], [cadena[cadena.length - 2]]);
  }
  if (opts.invertir) { cadena = [...cadena].reverse(); [topSub, botSub] = [botSub, topSub]; }

  const filas = cadena.map((c, i) => {
    const arriba = i === 0 ? topSub.atom : cadena[i - 1];
    const abajo = i === cadena.length - 1 ? botSub.atom : cadena[i + 1];
    const subs = sustituyentes(mol, c);
    const horiz = subs.filter((s) => s.atom == null || (s.atom !== arriba && s.atom !== abajo));
    if (horiz.length !== 2) throw new Error('Centro con disposición no representable en Fischer');
    const vert = [
      { ...subs.find((s) => s.atom === arriba), pos: FISCHER_POS.arriba },
      { ...subs.find((s) => s.atom === abajo), pos: FISCHER_POS.abajo },
    ];
    let [izq, der] = horiz;
    const prueba = () => etiquetaDesdePosiciones([...vert, { ...izq, pos: FISCHER_POS.izq }, { ...der, pos: FISCHER_POS.der }]);
    if (prueba() !== mol.cip[c]) [izq, der] = [der, izq];
    return {
      centro: c,
      izq: etiquetaGrupo(mol, c, izq.atom),
      der: etiquetaGrupo(mol, c, der.atom),
      etiqueta: mol.cip[c],
    };
  });
  return {
    arriba: etiquetaGrupo(mol, cadena[0], topSub.atom),
    abajo: etiquetaGrupo(mol, cadena[cadena.length - 1], botSub.atom),
    filas,
  };
}

/** R/S de cada fila de una proyección de Fischer dada (para validar lo que dibuja el jugador). */
export function etiquetasFischer(filas, prioridad) {
  return filas.map((f, i) => etiquetaDesdePosiciones([
    { rank: prioridad(i, 'arriba'), pos: FISCHER_POS.arriba },
    { rank: prioridad(i, 'abajo'), pos: FISCHER_POS.abajo },
    { rank: prioridad(i, 'izq'), pos: FISCHER_POS.izq },
    { rank: prioridad(i, 'der'), pos: FISCHER_POS.der },
  ]));
}

// ---------- Newman y caballete (dos estereocentros contiguos o un enlace C–C cualquiera) ----------
/**
 * Disposición alternada alrededor del enlace delante–detrás que respeta la configuración.
 * Devuelve { delante:[{texto, ang}], detras:[{texto, ang}], c1, c2 } con ángulos en grados (0 = arriba, sentido horario).
 * opts.giro: rotación (múltiplo de 120°) del carbono trasero para elegir la conformación.
 */
export function newman(smiles, opts = {}) {
  const mol = molFromSmiles(smiles);
  if (!mol) throw new Error('SMILES no válido: ' + smiles);
  let [c1, c2] = opts.enlace || cadenaDeCentros(mol, Object.keys(mol.cip || {}).map(Number)).slice(0, 2);
  if (c2 == null) throw new Error('Newman necesita indicar el enlace C–C');
  const rad = (g) => (g * Math.PI) / 180;
  const posDelante = (ang) => [Math.sin(rad(ang)), Math.cos(rad(ang)), 0.35];
  const posDetras = (ang) => [Math.sin(rad(ang)), Math.cos(rad(ang)), -0.35];
  const colocar = (c, otro, angs, posFn, ejeOtro) => {
    const subs = sustituyentes(mol, c).filter((s) => s.atom !== otro);
    const fijo = { ...sustituyentes(mol, c).find((s) => s.atom === otro), pos: ejeOtro };
    const perms = [[0, 1, 2], [0, 2, 1]];
    for (const p of perms) {
      const col = p.map((k, j) => ({ ...subs[k], pos: posFn(angs[j]), ang: angs[j] }));
      if (!mol.cip?.[c] || etiquetaDesdePosiciones([fijo, ...col]) === mol.cip[c]) {
        return col.map((s) => ({ texto: etiquetaGrupo(mol, c, s.atom), ang: s.ang, atom: s.atom }));
      }
    }
    throw new Error('No se pudo colocar el centro ' + c);
  };
  const a0 = opts.inicio ?? 0;
  const g = opts.giro ?? 0;
  const delante = colocar(c1, c2, [a0, a0 + 120, a0 + 240], posDelante, [0, 0, -1]);
  const detras = colocar(c2, c1, [a0 + 60 + g, a0 + 180 + g, a0 + 300 + g], posDetras, [0, 0, 1]);
  return { delante, detras, c1, c2, cip: mol.cip || {} };
}

// ---------- relaciones entre estereoisómeros ----------

const espejo = (s) => s.replace(/@@|@/g, (m) => (m === '@@' ? '@' : '@@'));

/** ¿Es una forma meso (tiene estereocentros y es idéntica a su imagen especular)? */
export function esMeso(smiles) {
  return /@/.test(smiles) && canonical(smiles) === canonical(espejo(smiles));
}

/** Relación entre dos moléculas: idénticos, enantiómeros, diastereoisómeros o «no son estereoisómeros». */
export function relacion(a, b) {
  if (canonical(a, { stereo: false }) !== canonical(b, { stereo: false })) return 'no son estereoisómeros';
  if (canonical(a) === canonical(b)) return 'idénticos';
  if (canonical(espejo(a)) === canonical(b)) return 'enantiómeros';
  return 'diastereoisómeros';
}
