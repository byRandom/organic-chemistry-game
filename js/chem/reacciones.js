// Motor de reacciones de halogenuros de alquilo: SN2, SN1, E2 y E1 (temas 5 y 6 del texto base).
//
// La molécula se transforma como un grafo (mol.js) y cada estereocentro lleva su geometría
// aproximada {vecino: [x,y,z]} (stereo.js). Así se puede:
//   - SN2: invertir la configuración (inversión de Walden),
//   - SN1/E1: perder la configuración en el carbocatión plano (racemización) y transponer,
//   - E2: exigir la disposición antiperiplanar (E/Z en cadenas, trans-diaxial en anillos).
// La salida es SMILES isomérico canónico (RDKit).
import { cloneMol, neighbors, implicitH, toSmiles } from './mol.js';
import { molFromSmiles, rdkit, canonical } from './rdkit.js';
import { geometriaDesdeDibujo, etiquetaDesdePosiciones } from './stereo.js';
import { reactivo } from './reactivos.js';

const HALOGENOS = new Set(['Cl', 'Br', 'I']);
const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const escalar = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const signo = (x) => (x > 1e-9 ? 1 : x < -1e-9 ? -1 : 0);

/** Paridad de cuatro posiciones ordenadas (+1 / −1). */
function paridad(p) {
  return signo(escalar(cruz(resta(p[1], p[0]), resta(p[2], p[0])), resta(p[3], p[0])));
}

// ---------- estado: molécula + geometría de estereocentros + estereo de dobles enlaces ----------
export function estadoDesdeSmiles(smiles) {
  const mol = molFromSmiles(smiles);
  if (!mol) throw new Error('SMILES no válido: ' + smiles);
  const geo = {};
  for (const c of Object.keys(mol.cip || {}).map(Number)) geo[c] = geometriaDesdeDibujo(mol, c);
  return { mol, geo, dobles: [] };
}

function clonar(e) {
  return {
    mol: cloneMol(e.mol),
    geo: Object.fromEntries(Object.entries(e.geo).map(([c, g]) => [c, Object.fromEntries(Object.entries(g).map(([k, v]) => [k, [...v]]))])),
    dobles: e.dobles.map((d) => ({ ...d })),
  };
}

const vivo = (m, i) => !m.atoms[i].del;
const vecinos = (m, i) => neighbors(m, i).filter((n) => vivo(m, n.atom));
const vecinosC = (m, i) => vecinos(m, i).filter((n) => m.atoms[n.atom].el === 'C');
const esSp3 = (m, i) => vecinos(m, i).every((n) => n.order === 1) && !m.atoms[i].chg;
const grado = (m, c) => vecinosC(m, c).length;

/** Átomos aromáticos: anillos de 6 carbonos con 3 dobles enlaces alternos (forma de Kekulé). */
function aromaticos(m) {
  const res = new Set();
  const n = m.atoms.length;
  for (let s = 0; s < n; s++) {
    if (m.atoms[s].el !== 'C' || !vivo(m, s)) continue;
    const camino = [s];
    const dfs = (u) => {
      if (camino.length === 6) {
        if (vecinos(m, u).some((x) => x.atom === s)) {
          const dobles = camino.filter((a, k) => {
            const b = camino[(k + 1) % 6];
            return neighbors(m, a).find((x) => x.atom === b)?.order === 2;
          }).length;
          if (dobles === 3) camino.forEach((a) => res.add(a));
        }
        return;
      }
      for (const { atom } of vecinos(m, u)) {
        if (m.atoms[atom].el !== 'C' || camino.includes(atom)) continue;
        camino.push(atom);
        dfs(atom);
        camino.pop();
      }
    };
    dfs(s);
  }
  return res;
}

function esBencilico(m, c) {
  const ar = aromaticos(m);
  return !ar.has(c) && vecinosC(m, c).some((x) => ar.has(x.atom));
}

function esAlilico(m, c) {
  const ar = aromaticos(m);
  return vecinosC(m, c).some((x) => !ar.has(x.atom) && x.order === 1 && vecinos(m, x.atom).some((y) => y.atom !== c && y.order === 2 && m.atoms[y.atom].el === 'C'));
}

/** Enlace dentro de un anillo: existe otro camino entre sus extremos. */
function enlaceEnAnillo(m, a, b) {
  const visto = new Set([a]);
  const pila = [a];
  while (pila.length) {
    const u = pila.pop();
    for (const { atom } of vecinos(m, u)) {
      if ((u === a && atom === b) || visto.has(atom)) continue;
      if (atom === b) return true;
      visto.add(atom);
      pila.push(atom);
    }
  }
  return false;
}

/**
 * Estabilidad relativa de un carbocatión en c (orden del texto base):
 * terciario > bencílico > secundario > alílico > primario > metilo.
 */
function estabilidadCation(m, c) {
  const g = grado(m, c);
  let e = [1, 2, 3, 5, 5][g];
  if (esBencilico(m, c)) e = g >= 3 ? 6 : Math.max(e, 4);
  if (esAlilico(m, c)) e = g >= 3 ? 5.5 : g === 2 ? 3.5 : Math.max(e, 2.5);
  return e;
}

// ---------- operaciones elementales ----------
function quitarAtomo(e, x) {
  e.mol.atoms[x].del = true;
  e.mol.bonds = e.mol.bonds.filter((b) => b.a !== x && b.b !== x);
  for (const g of Object.values(e.geo)) delete g[x];
}

function unirGrupo(e, c, grupoSmiles) {
  const frag = molFromSmiles(grupoSmiles);
  const off = e.mol.atoms.length;
  frag.atoms.forEach((a) => e.mol.atoms.push({ el: a.el, chg: a.chg || 0, x: 0, y: 0 }));
  frag.bonds.forEach((b) => e.mol.bonds.push({ a: b.a + off, b: b.b + off, o: b.o }));
  e.mol.bonds.push({ a: c, b: off, o: 1 });
  return off;
}

/** Grupos salientes: halógenos unidos a un carbono sp³. */
export function gruposSalientes(m) {
  const out = [];
  m.atoms.forEach((a, x) => {
    if (!HALOGENOS.has(a.el) || !vivo(m, x)) return;
    const n = vecinos(m, x);
    if (n.length === 1 && m.atoms[n[0].atom].el === 'C') out.push({ c: n[0].atom, x, sp3: esSp3(m, n[0].atom) });
  });
  return out;
}

export function clasificar(m, c, x) {
  const g = vecinosC(m, c).length;
  const betas = vecinosC(m, c).map((n) => n.atom);
  const ramif = Math.max(0, ...betas.map((b) => grado(m, b) - 1));
  return {
    grado: g,
    tipo: g === 0 ? 'metilo' : g === 1 ? 'primario' : g === 2 ? 'secundario' : 'terciario',
    bencilico: esBencilico(m, c),
    alilico: esAlilico(m, c),
    betaRamificado: g === 1 && ramif >= 2,
    neopentilo: g === 1 && ramif >= 3,
    hayBetaH: betas.some((b) => implicitH(m, b) > 0 && esSp3(m, b)),
    halogeno: m.atoms[x].el,
  };
}

// ---------- mecanismos ----------
function sn2(e0, c, x, grupo, { invertir = true } = {}) {
  const e = clonar(e0);
  const nu = unirGrupo(e, c, grupo);
  const g = e.geo[c];
  if (g && g[x]) {
    g[nu] = g[x];
    delete g[x];
    if (invertir) for (const k of Object.keys(g)) g[k] = [g[k][0], g[k][1], -g[k][2]]; // inversión de Walden
  }
  quitarAtomo(e, x);
  return { e, centro: c };
}

function formarCation(e0, c, x) {
  const e = clonar(e0);
  quitarAtomo(e, x);
  e.mol.atoms[c].chg = 1;
  delete e.geo[c]; // carbocatión plano: se pierde la configuración
  return e;
}

/** Transposición 1,2 de hidruro o de alquilo si da un carbocatión más estable. */
function transponer(e, c) {
  const m = e.mol;
  const s0 = estabilidadCation(m, c);
  let mejor = null;
  for (const { atom: b } of vecinosC(m, c)) {
    if (!esSp3(m, b)) continue;
    if (implicitH(m, b) > 0) {
      const t = clonar(e);
      t.mol.atoms[c].chg = 0;
      t.mol.atoms[b].chg = 1;
      const s = estabilidadCation(t.mol, b);
      if (s > s0 && (!mejor || s > mejor.s)) mejor = { s, t, nuevo: b, tipo: 'hidruro' };
    }
    for (const { atom: g } of vecinosC(m, b)) {
      if (g === c || enlaceEnAnillo(m, b, g)) continue;
      const t = clonar(e);
      t.mol.bonds = t.mol.bonds.filter((bd) => !((bd.a === b && bd.b === g) || (bd.a === g && bd.b === b)));
      t.mol.bonds.push({ a: c, b: g, o: 1 });
      t.mol.atoms[c].chg = 0;
      t.mol.atoms[b].chg = 1;
      const s = estabilidadCation(t.mol, b);
      // a igualdad de estabilidad se prefiere el desplazamiento de hidruro
      if (s > s0 && (!mejor || s > mejor.s)) mejor = { s, t, nuevo: b, tipo: grado(m, g) === 1 ? 'metilo' : 'alquilo' };
    }
  }
  if (!mejor) return { e, c, transposicion: null };
  delete mejor.t.geo[mejor.nuevo];
  delete mejor.t.geo[c];
  return { e: mejor.t, c: mejor.nuevo, transposicion: mejor.tipo };
}

function sn1(e0, c, x, grupo, { transposicion = true } = {}) {
  let e = formarCation(e0, c, x);
  let k = c, tr = null;
  if (transposicion) ({ e, c: k, transposicion: tr } = transponer(e, c));
  e.mol.atoms[k].chg = 0;
  unirGrupo(e, k, grupo);
  return { e, centro: k, transposicion: tr };
}

/** Grado de sustitución del alqueno a=b (con bonificación por conjugación). */
function sustitucionAlqueno(m, a, b) {
  const ar = aromaticos(m);
  let s = grado(m, a) - 1 + grado(m, b) - 1;
  for (const z of [a, b]) {
    for (const { atom, order } of vecinosC(m, z)) {
      if (atom === a || atom === b || order !== 1) continue;
      if (ar.has(atom) || vecinos(m, atom).some((y) => y.order === 2 && y.atom !== z)) s += 2;
    }
  }
  return s;
}

function elegirOrientacion(opciones, orientacion) {
  if (!opciones.length) return [];
  const vals = opciones.map((o) => o.sust);
  const objetivo = orientacion === 'hofmann' ? Math.min(...vals) : Math.max(...vals);
  return opciones.filter((o) => o.sust === objetivo);
}

const POS = (ang, z) => [Math.sin((ang * Math.PI) / 180), Math.cos((ang * Math.PI) / 180), z];

/** Relación sin entre sustituyentes en una E2 antiperiplanar (proyección de Newman virtual). */
function relacionSinE2(geoA, geoB, x, a, b) {
  const otrosA = Object.keys(geoA).filter((k) => k !== String(x) && k !== String(b));
  const otrosB = Object.keys(geoB).filter((k) => k !== 'H' && k !== String(a));
  if (otrosA.length !== 2 || otrosB.length !== 2 || !geoB.H) return null;
  // delante (a): X a 0°, b hacia atrás, los otros dos a 120° y 240°
  let [a1, a2] = otrosA;
  const realA = paridad([geoA[x], geoA[b], geoA[a1], geoA[a2]]);
  const idealA = paridad([POS(0, 0.35), [0, 0, -1], POS(120, 0.35), POS(240, 0.35)]);
  if (realA !== idealA) [a1, a2] = [a2, a1];
  // detrás (b): H a 180° (anti al X), a hacia delante, los otros dos a 60° y 300°
  let [b1, b2] = otrosB;
  const realB = paridad([geoB.H, geoB[a], geoB[b1], geoB[b2]]);
  const idealB = paridad([POS(180, -0.35), [0, 0, 1], POS(60, -0.35), POS(300, -0.35)]);
  if (realB !== idealB) [b1, b2] = [b2, b1];
  return [[a1, b1], [a2, b2]]; // a 120° con b 60°, y a 240° con b 300°: mismo lado del alqueno
}

/**
 * E2: elimina X de c y un H antiperiplanar de un carbono β.
 * Devuelve una lista de productos (estados) con su papel.
 */
function e2(e0, c, x, { orientacion = 'zaitsev', exigirAnti = true } = {}) {
  const m = e0.mol;
  const opciones = [];
  for (const { atom: b } of vecinosC(m, c)) {
    if (!esSp3(m, b) || implicitH(m, b) === 0) continue;
    const enAnillo = enlaceEnAnillo(m, c, b);
    if (enAnillo && exigirAnti) {
      // en anillos de ciclohexano solo hay disposición antiperiplanar si H y X son trans (diaxiales)
      const gA = e0.geo[c], gB = e0.geo[b];
      if (implicitH(m, b) === 1 && gA?.[x] && gB?.H) {
        const caraX = signo(gA[x][2]), caraH = signo(gB.H[2]);
        if (caraX && caraH && caraX === caraH) continue;
      }
    }
    const e = clonar(e0);
    quitarAtomo(e, x);
    e.mol.bonds.find((bd) => (bd.a === c && bd.b === b) || (bd.a === b && bd.b === c)).o = 2;
    const geoA = e0.geo[c], geoB = e0.geo[b];
    delete e.geo[c];
    delete e.geo[b];
    if (!enAnillo) {
      const sin = geoA && geoB && implicitH(m, b) === 1 ? relacionSinE2(geoA, geoB, x, c, b) : null;
      e.dobles.push(sin ? { a: c, b, sin } : { a: c, b, preferirE: true });
    }
    opciones.push({ e, b, sust: sustitucionAlqueno(e.mol, c, b) });
  }
  return elegirOrientacion(opciones, orientacion);
}

function e1(e0, c, x, { transposicion = true } = {}) {
  let e = formarCation(e0, c, x);
  let k = c, tr = null;
  if (transposicion) ({ e, c: k, transposicion: tr } = transponer(e, c));
  const opciones = [];
  for (const { atom: b } of vecinosC(e.mol, k)) {
    if (!esSp3(e.mol, b) || implicitH(e.mol, b) === 0) continue;
    const t = clonar(e);
    t.mol.atoms[k].chg = 0;
    t.mol.bonds.find((bd) => (bd.a === k && bd.b === b) || (bd.a === b && bd.b === k)).o = 2;
    delete t.geo[b];
    if (!enlaceEnAnillo(t.mol, k, b)) t.dobles.push({ a: k, b, preferirE: true });
    opciones.push({ e: t, b, sust: sustitucionAlqueno(t.mol, k, b) });
  }
  return { opciones: elegirOrientacion(opciones, 'zaitsev'), transposicion: tr };
}

// ---------- salida: SMILES isomérico ----------
function compactar(e) {
  const mapa = new Map();
  const mol = { atoms: [], bonds: [] };
  e.mol.atoms.forEach((a, i) => {
    if (a.del) return;
    mapa.set(i, mol.atoms.length);
    mol.atoms.push({ el: a.el, chg: a.chg || 0, x: 0, y: 0 });
  });
  for (const b of e.mol.bonds) if (mapa.has(b.a) && mapa.has(b.b)) mol.bonds.push({ a: mapa.get(b.a), b: mapa.get(b.b), o: b.o });
  const k2 = (k) => (k === 'H' ? 'H' : mapa.get(+k));
  const geo = {};
  for (const [c, g] of Object.entries(e.geo)) {
    if (!mapa.has(+c)) continue;
    const ng = {};
    for (const [k, v] of Object.entries(g)) if (k === 'H' || mapa.has(+k)) ng[k2(k)] = v;
    geo[mapa.get(+c)] = ng;
  }
  const dobles = e.dobles
    .filter((d) => mapa.has(d.a) && mapa.has(d.b))
    .map((d) => ({ a: mapa.get(d.a), b: mapa.get(d.b), preferirE: d.preferirE, z: d.z, sin: d.sin?.map(([p, q]) => [k2(p), k2(q)]) }));
  return { mol, geo, dobles };
}

function leerEtiquetas(smiles, orden) {
  const R = rdkit();
  const m = R.get_mol(smiles);
  try {
    const j = JSON.parse(m.get_json()).molecules[0];
    const ranks = j.extensions?.find((x) => x.name === 'rdkitRepresentation')?.cipRanks || [];
    const tags = JSON.parse(m.get_stereo_tags());
    const deK = (k) => orden[k];
    const rango = {};
    ranks.forEach((r, k) => { rango[deK(k)] = r; });
    const atomos = {};
    for (const [k, l] of tags.CIP_atoms || []) atomos[deK(k)] = l.replace(/[()]/g, '');
    const enlaces = [];
    for (const [k1, k2, l] of tags.CIP_bonds || []) enlaces.push({ a: deK(k1), b: deK(k2), l: l.replace(/[()]/g, '') });
    return { rango, atomos, enlaces };
  } finally {
    m.delete();
  }
}

/**
 * SMILES isomérico canónico de un estado. Devuelve { smiles, sinDefinir } donde sinDefinir
 * cuenta los estereocentros del producto cuya configuración no está fijada (p. ej. tras una SN1).
 */
export function smilesDeEstado(e) {
  const { mol, geo, dobles } = compactar(e);
  const base = toSmiles(mol, { conOrden: true });
  const info0 = leerEtiquetas(base.smiles, base.orden);
  const centros = Object.keys(info0.atomos).map(Number);
  const deseado = {};
  for (const c of centros) {
    const g = geo[c];
    if (!g || Object.keys(g).length !== 4) continue;
    deseado[c] = etiquetaDesdePosiciones(Object.entries(g).map(([k, pos]) => ({ rank: k === 'H' ? -1 : info0.rango[+k] ?? 0, pos })));
  }
  // dobles enlaces con estereo: hace falta que cada extremo tenga dos sustituyentes distintos
  const objetivoEZ = [];
  const dir = {};
  for (const d of dobles) {
    const lado = (p, q) => {
      const s = neighbors(mol, p).filter((n) => n.atom !== q).map((n) => ({ k: n.atom, r: info0.rango[n.atom] ?? 0 }));
      if (implicitH(mol, p) === 1) s.push({ k: 'H', r: -1 });
      return s;
    };
    const la = lado(d.a, d.b), lb = lado(d.b, d.a);
    if (la.length !== 2 || lb.length !== 2 || la[0].r === la[1].r || lb[0].r === lb[1].r) continue;
    const hiA = la[0].r > la[1].r ? la[0].k : la[1].k;
    const hiB = lb[0].r > lb[1].r ? lb[0].k : lb[1].k;
    let ez = d.z ? 'Z' : 'E';
    if (d.sin) ez = d.sin.some(([p, q]) => String(p) === String(hiA) && String(q) === String(hiB)) ? 'Z' : 'E';
    const enlaceDe = (p, q) => mol.bonds.findIndex((b) => b.o === 1 && ((b.a === p && b.b === q) || (b.b === p && b.a === q)));
    const na = la.find((s) => s.k !== 'H').k, nb = lb.find((s) => s.k !== 'H').k;
    const ia = enlaceDe(d.a, na), ib = enlaceDe(d.b, nb);
    if (ia < 0 || ib < 0) continue;
    dir[ia] = '/';
    dir[ib] = '/';
    objetivoEZ.push({ a: d.a, b: d.b, ez, ib });
  }
  const chir = Object.fromEntries(Object.keys(deseado).map((c) => [c, '@']));
  let s = base.smiles;
  for (let vuelta = 0; vuelta < 6; vuelta++) {
    s = toSmiles(mol, { chir, dir });
    const info = leerEtiquetas(s, base.orden);
    let cambios = 0;
    for (const [c, l] of Object.entries(deseado)) {
      if (info.atomos[c] && info.atomos[c] !== l) { chir[c] = chir[c] === '@' ? '@@' : '@'; cambios++; }
    }
    for (const o of objetivoEZ) {
      const got = info.enlaces.find((x) => (x.a === o.a && x.b === o.b) || (x.a === o.b && x.b === o.a));
      if (got && got.l !== o.ez) { dir[o.ib] = dir[o.ib] === '/' ? '\\' : '/'; cambios++; }
    }
    if (!cambios) break;
  }
  const sinDefinir = centros.filter((c) => !(c in deseado)).length;
  return { smiles: canonical(s), sinDefinir };
}

// ---------- decisión (Tabla 6.1) ----------
function decidir(tipo, info) {
  const t = info.tipo;
  const estabilizado = info.bencilico || info.alilico;
  if (tipo === 'nucleofilo') {
    if (info.neopentilo) return { nada: 'Halogenuro **neopentílico**: el carbono está tan impedido que la SN2 es lentísima, y al ser primario no puede dar SN1.' };
    if (t === 'terciario') return { plan: [['SN1', 'mayoritario'], ['E1', 'minoritario']], razon: 'Halogenuro **terciario** con un nucleófilo poco básico en medio polar: la SN2 es imposible (impedimento estérico) y se forma un carbocatión: **SN1** (con algo de E1).' };
    return { plan: [['SN2', 'único']], razon: `Halogenuro **${t}** con un **buen nucleófilo poco básico**: **SN2** prácticamente exclusiva.` };
  }
  if (tipo === 'base') {
    if (t === 'metilo') return { plan: [['SN2', 'único']], razon: 'Halogenuro de **metilo**: no tiene H en β, así que no puede eliminar. **SN2**.' };
    if (t === 'primario') {
      if (info.neopentilo) return { nada: 'Halogenuro **neopentílico**: no hay H en β para la E2 y la SN2 está casi bloqueada por el impedimento estérico.' };
      if (info.betaRamificado) return { plan: [['E2', 'mayoritario'], ['SN2', 'minoritario']], razon: 'Halogenuro **primario ramificado en β**: el carbono está impedido y la base fuerte arranca un H: **E2 mayoritaria**, SN2 minoritaria.' };
      return { plan: [['SN2', 'mayoritario'], ['E2', 'minoritario']], razon: 'Halogenuro **primario no impedido** con base fuerte no impedida: el carbono es muy accesible y domina la **SN2**.' };
    }
    if (t === 'secundario') return { plan: [['E2', 'mayoritario'], ['SN2', 'minoritario']], razon: 'Halogenuro **secundario** con **base fuerte**: compiten E2 y SN2; domina la **E2**.' };
    return { plan: [['E2', 'único']], razon: 'Halogenuro **terciario** con **base fuerte**: la SN2 es imposible y la base arranca un H en β: **E2**.' };
  }
  if (tipo === 'impedida') {
    if (t === 'metilo') return { plan: [['SN2', 'único']], razon: 'Halogenuro de **metilo**: sin H en β; aunque la base sea voluminosa, solo puede dar **SN2**.' };
    if (t === 'primario') return { plan: [['E2', 'mayoritario'], ['SN2', 'minoritario']], razon: 'Base **fuerte e impedida** (terc-butóxido): le cuesta llegar al carbono y arranca un H del borde de la molécula: **E2 mayoritaria**.' };
    return { plan: [['E2', 'único']], razon: `Halogenuro **${t}** con base **fuerte e impedida**: **E2**, y como la base es voluminosa da el alqueno **menos sustituido** (Hofmann).` };
  }
  // solvólisis
  if (t === 'metilo' || (t === 'primario' && !info.betaRamificado && !estabilizado)) {
    return { nada: `Halogenuro **${t}** con un nucleófilo débil: la SN1 no ocurre (carbocatión ${t} demasiado inestable) y la SN2 es lentísima con un nucleófilo tan débil.` };
  }
  if (t === 'primario' && !estabilizado) return { plan: [['SN1', 'mayoritario'], ['E1', 'minoritario']], razon: 'Halogenuro **primario impedido** con nucleófilo débil en medio prótico: la SN2 está muy desfavorecida y la reacción va lentamente por **SN1 con transposición** del carbocatión.' };
  return { plan: [['SN1', 'mayoritario'], ['E1', 'minoritario']], razon: `Halogenuro **${t}${estabilizado ? (info.bencilico ? ' bencílico' : ' alílico') : ''}** con nucleófilo débil en disolvente **polar prótico**: se forma el carbocatión: **SN1** con algo de **E1**.` };
}

/**
 * Reacción de un sustrato con un reactivo del catálogo.
 * Devuelve { ok, mensaje, razon, productos: [{smiles, mecanismo, papel, racemico}], transposicion }.
 */
export function reaccionar(smiles, idReactivo) {
  const r = reactivo(idReactivo);
  const e = estadoDesdeSmiles(smiles);
  const sal = gruposSalientes(e.mol);
  if (!sal.length) return { ok: false, mensaje: `**${r.nombre}** no reacciona: la molécula no tiene ningún halógeno que pueda actuar como grupo saliente.` };
  const s = sal.find((x) => x.sp3);
  if (!s) return { ok: false, mensaje: 'El halógeno está sobre un carbono **sp²** (vinílico o arílico): no da SN1, SN2, E1 ni E2 en estas condiciones.' };
  const info = clasificar(e.mol, s.c, s.x);
  const d = decidir(r.tipo, info);
  if (d.nada) return { ok: false, mensaje: d.nada, info };
  const productos = [];
  let transposicion = null;
  const notas = [];
  const add = (estado, mecanismo, papel, extra = {}) => {
    const { smiles: smi, sinDefinir } = smilesDeEstado(estado);
    if (productos.some((p) => p.smiles === smi)) return;
    productos.push({ smiles: smi, mecanismo, papel, racemico: sinDefinir > 0 && /SN1|E1/.test(mecanismo), ...extra });
    // alqueno sin estereoespecificidad: el E es el mayoritario y el Z, minoritario
    if (estado.dobles?.some((dd) => dd.preferirE)) {
      const z = clonar(estado);
      z.dobles = z.dobles.map((dd) => (dd.preferirE ? { ...dd, preferirE: false, z: true } : dd));
      const smiZ = smilesDeEstado(z).smiles;
      if (!productos.some((p) => p.smiles === smiZ)) productos.push({ smiles: smiZ, mecanismo, papel: 'minoritario', isomeroZ: true });
    }
  };
  for (const [mec, papel] of d.plan) {
    if (mec === 'SN2') add(sn2(e, s.c, s.x, r.grupo).e, 'SN2', papel);
    if (mec === 'SN1') {
      const res = sn1(e, s.c, s.x, r.grupo);
      transposicion = transposicion || res.transposicion;
      add(res.e, 'SN1', papel);
    }
    if (mec === 'E2') {
      const ops = e2(e, s.c, s.x, { orientacion: r.tipo === 'impedida' ? 'hofmann' : 'zaitsev' });
      if (!ops.length) {
        notas.push(info.hayBetaH ? 'No hay ningún H en disposición **antiperiplanar** (trans-diaxial) respecto al halógeno: la E2 no es posible.' : 'No hay H en β: no puede haber eliminación.');
        continue;
      }
      for (const o of ops) add(o.e, 'E2', papel);
    }
    if (mec === 'E1') {
      const res = e1(e, s.c, s.x);
      transposicion = transposicion || res.transposicion;
      for (const o of res.opciones) add(o.e, 'E1', papel);
    }
  }
  if (!productos.length) return { ok: false, mensaje: notas.join(' ') || 'No reacciona.', info };
  // si la eliminación era la vía principal y no es posible, la otra pasa a ser la mayoritaria
  if (!productos.some((p) => p.papel !== 'minoritario')) productos.forEach((p) => { p.papel = 'mayoritario'; });
  const mayor = productos.find((p) => p.papel !== 'minoritario');
  return { ok: true, mecanismo: mayor.mecanismo, razon: d.razon, notas, productos, transposicion, info };
}

/**
 * Productos «plausibles pero incorrectos» para usar como distractores:
 * otro mecanismo, sin inversión, sin transposición, orientación contraria, isómero E/Z equivocado…
 */
export function alternativas(smiles, idReactivo) {
  const r = reactivo(idReactivo);
  const e = estadoDesdeSmiles(smiles);
  const s = gruposSalientes(e.mol).find((x) => x.sp3);
  if (!s) return [];
  const out = new Set();
  const add = (est) => { try { out.add(smilesDeEstado(est).smiles); } catch { /* ignorar */ } };
  add(sn2(e, s.c, s.x, r.grupo).e);
  add(sn2(e, s.c, s.x, r.grupo, { invertir: false }).e);
  add(sn1(e, s.c, s.x, r.grupo).e);
  add(sn1(e, s.c, s.x, r.grupo, { transposicion: false }).e);
  for (const o of ['zaitsev', 'hofmann']) {
    for (const op of e2(e, s.c, s.x, { orientacion: o, exigirAnti: false })) {
      add(op.e);
      // el isómero geométrico contrario
      const inv = clonar(op.e);
      inv.dobles = inv.dobles.map((dd) => (dd.sin ? { ...dd, sin: [[dd.sin[0][0], dd.sin[1][1]], [dd.sin[1][0], dd.sin[0][1]]] } : { ...dd, preferirE: false, sin: null, z: true }));
      add(inv);
    }
  }
  for (const t of [true, false]) for (const op of e1(e, s.c, s.x, { transposicion: t }).opciones) add(op.e);
  return [...out];
}
