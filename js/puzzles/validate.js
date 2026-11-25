// Validación de respuestas (sin interfaz, se usa también en los tests).
import { formula, prettyFormula, valenceErrors, fragments, toSmiles, totalH } from '../chem/mol.js';
import { canonical, molFromSmiles } from '../chem/rdkit.js';

const F = (f) => prettyFormula(f);

function insaturaciones(f) {
  // grados de insaturación a partir de la fórmula: (2C + 2 + N - H - X) / 2
  const n = (el) => {
    const m = f.match(new RegExp(el + '(\\d*)(?![a-z])'));
    return m ? (m[1] ? +m[1] : 1) : 0;
  };
  const C = n('C'), H = n('H'), N = n('N');
  const X = n('F') + n('Cl') + n('Br') + n('I');
  return (2 * C + 2 + N - H - X) / 2;
}

/**
 * Comprueba la molécula dibujada contra un objetivo de construcción.
 * objetivo: { formula?, smiles?: string[], hExplicitos?: number, estereo?: bool, errores?: {canonico: mensaje} }
 * Devuelve { ok, msg, canon }.
 */
export function comprobarConstruccion(mol, objetivo) {
  if (!mol.atoms.length) return { ok: false, msg: 'El lienzo está vacío. Toca para colocar un átomo.' };
  if (valenceErrors(mol).length) {
    return { ok: false, msg: 'Hay átomos con más enlaces de los que admiten (marcados en rojo).' };
  }
  if (fragments(mol).length > 1 && !objetivo.permitirFragmentos) {
    return { ok: false, msg: 'Has dibujado varias piezas sueltas. Une todos los átomos en una sola molécula.' };
  }
  const canon = canonical(toSmiles(mol), { stereo: !!objetivo.estereo });
  if (!canon) return { ok: false, msg: 'Esa estructura no es válida.' };

  if (objetivo.hExplicitos != null) {
    const hx = mol.atoms.filter((a) => a.el === 'H').length;
    if (hx !== objetivo.hExplicitos || totalH(mol) !== objetivo.hExplicitos) {
      return { ok: false, canon, msg: `Dibuja los hidrógenos uno a uno: se esperan ${objetivo.hExplicitos} átomos de H y tienes ${hx}.` };
    }
  }

  const f = formula(mol);
  const errores = canonMap(objetivo.errores, !!objetivo.estereo);
  if (errores[canon]) return { ok: false, canon, msg: errores[canon] };

  if (objetivo.formula && f !== objetivo.formula) {
    let pista = '';
    const di = insaturaciones(objetivo.formula) - insaturaciones(f);
    const sinH = (s) => s.replace(/H\d*/, '');
    if (sinH(f) === sinH(objetivo.formula)) {
      if (di > 0) pista = ' Te faltan enlaces múltiples (o anillos): tienes demasiados hidrógenos.';
      else if (di < 0) pista = ' Te sobran enlaces múltiples (o anillos): faltan hidrógenos.';
    }
    return { ok: false, canon, msg: `Tu molécula es ${F(f)}, pero se pide ${F(objetivo.formula)}.${pista}` };
  }

  if (objetivo.smiles?.length) {
    const targets = objetivo.smiles.map((s) => canonical(s, { stereo: !!objetivo.estereo }));
    if (!targets.includes(canon)) {
      return {
        ok: false, canon,
        msg: objetivo.formula || targets.some((t) => t && formulaDe(t) === f)
          ? 'La fórmula es correcta, pero los átomos no están unidos como se pide. Revisa la estructura.'
          : `No es la molécula que se pide (has dibujado ${F(f)}).`,
      };
    }
  }
  return { ok: true, canon, msg: '' };
}

/** Convierte un mapa {smiles: valor} a {canónico: valor}. */
export function canonMap(map, estereo = false) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    const c = canonical(k, { stereo: estereo });
    if (c) out[c] = v;
  }
  return out;
}

function formulaDe(smiles) {
  const m = molFromSmiles(smiles);
  return m ? formula(m) : null;
}

/** Para la caza de isómeros: comprueba fórmula y si ya se había encontrado. */
export function comprobarIsomero(mol, objetivo, encontrados) {
  const r = comprobarConstruccion(mol, { formula: objetivo.formula, permitirFragmentos: false });
  if (!r.ok) return r;
  if (encontrados.includes(r.canon)) return { ok: false, repetido: true, canon: r.canon, msg: 'Ese isómero ya lo tienes. ¡Busca otro diferente!' };
  if (objetivo.excluir?.includes(r.canon)) return { ok: false, canon: r.canon, msg: objetivo.mensajeExcluir || 'Ese no vale en este reto.' };
  return r;
}

/** Estrellas: 1 por completar, +1 sin fallos, +1 sin pistas. */
export function calcularEstrellas({ fallos = 0, pistas = 0 }) {
  return 1 + (fallos === 0 ? 1 : 0) + (pistas === 0 ? 1 : 0);
}
