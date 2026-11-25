// Estructuras de apoyo: dibuja los compuestos que nombra un enunciado para que
// no haga falta traducir el nombre cuando la nomenclatura no es lo que se evalúa.
//
// En el contenido, «referencias» puede ser una lista o { items, plegada, titulo }.
// Cada elemento de la lista es uno de estos:
//   { smiles, nombre }   molécula dibujada con su nombre debajo
//   { texto, nombre }    fórmula escrita (reactivos que el motor no dibuja, como R₂CuLi)
//   { incognita: true, nombre }  casilla «?» (lo que hay que deducir)
//   { flecha: 'Li, CuI' }        flecha con condiciones
//   '+'                          signo más
// Con «plegada» la ayuda queda oculta tras «Ver estructuras» (útil cuando leer el
// nombre forma parte del ejercicio de examen pero se quiere tener la ayuda a mano).
import { h, rich } from '../app/ui.js';
import { molFromSmiles } from '../chem/rdkit.js';
import { molSVG } from '../render/svg.js';

function tarjeta(it) {
  let cuerpo;
  if (it.smiles) {
    const m = molFromSmiles(it.smiles);
    cuerpo = m ? molSVG(m, { scale: 1.3, minSize: 56 }) : h('code', it.smiles);
  } else if (it.incognita) {
    cuerpo = h('div.ref-q', '?');
  } else {
    cuerpo = h('div.ref-formula', { html: rich(it.texto || '') });
  }
  return h('figure.ref-card' + (it.incognita ? '.unknown' : ''), cuerpo,
    it.nombre ? h('figcaption', { html: rich(it.nombre) }) : null);
}

function pieza(it) {
  if (it === '+') return h('div.ref-plus', '+');
  if (it && typeof it === 'object' && 'flecha' in it) {
    return h('div.arrow', h('div.arrow-label', { html: rich(it.flecha || '') }), h('div.arrow-line', '⟶'));
  }
  return tarjeta(it);
}

export function referencias(spec) {
  if (!spec) return null;
  const cfg = Array.isArray(spec) ? { items: spec } : spec;
  if (!cfg.items?.length) return null;
  const fila = h('div.refs-row', cfg.items.map(pieza));
  if (cfg.plegada) {
    return h('details.refs', h('summary', cfg.titulo || 'Ver estructuras'), fila);
  }
  return h('div.refs', { role: 'group', 'aria-label': cfg.titulo || 'Estructuras' }, fila);
}
