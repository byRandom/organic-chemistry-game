// Representación de una molécula según lo que pida el nivel: cuñas, Fischer, Newman, caballete.
import { molFromSmiles } from '../chem/rdkit.js';
import { fischer, newman } from '../chem/stereo.js';
import { molSVG } from './svg.js';
import { fischerSVG, newmanSVG, caballeteSVG } from './proyecciones.js';

/**
 * spec: { smiles, repr?: 'cuña'|'fischer'|'newman'|'caballete', invertir?, giro?, inicio?, numerar?: bool }
 * Devuelve { svg, centros: [atom], datos } donde centros está en el orden en que se numeran.
 */
export function representar(spec, opts = {}) {
  const repr = spec.repr || 'cuña';
  if (repr === 'fischer') {
    const f = fischer(spec.smiles, { invertir: spec.invertir });
    return { svg: fischerSVG(f, opts), centros: f.filas.map((r) => r.centro), datos: f };
  }
  if (repr === 'newman' || repr === 'caballete') {
    const n = newman(spec.smiles, { giro: spec.giro, inicio: spec.inicio, enlace: spec.enlace });
    return { svg: (repr === 'newman' ? newmanSVG : caballeteSVG)(n, opts), centros: [n.c1, n.c2], datos: n };
  }
  const m = molFromSmiles(spec.smiles);
  const centros = Object.keys(m.cip || {}).map(Number);
  const numeros = spec.numerar && centros.length > 1 ? Object.fromEntries(centros.map((c, k) => [c, k + 1])) : null;
  return {
    svg: molSVG(m, { scale: 2, highlight: spec.resaltar || [], numeros, ...opts }),
    centros,
    datos: m,
  };
}

export const NOMBRE_REPR = { 'cuña': 'cuñas y rayas', fischer: 'proyección de Fischer', newman: 'proyección de Newman', caballete: 'proyección en caballete' };
