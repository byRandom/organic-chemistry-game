// Dibujo de moléculas en SVG (estilo esqueleto: carbonos implícitos).
import { implicitH, neighbors, valenceErrors } from '../chem/mol.js';

export const SVG_NS = 'http://www.w3.org/2000/svg';
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => String(n).replace(/\d/g, (d) => SUB[+d]);

export function el(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

/** ¿El enlace forma parte de un anillo? (existe otro camino entre sus extremos) */
export function ringBonds(m) {
  const res = new Set();
  m.bonds.forEach((bd, idx) => {
    const seen = new Set([bd.a]);
    const stack = [bd.a];
    while (stack.length) {
      const u = stack.pop();
      for (let j = 0; j < m.bonds.length; j++) {
        if (j === idx) continue;
        const b = m.bonds[j];
        const v = b.a === u ? b.b : b.b === u ? b.a : -1;
        if (v >= 0 && !seen.has(v)) { seen.add(v); stack.push(v); }
      }
    }
    if (seen.has(bd.b)) res.add(idx);
  });
  return res;
}

function showLabel(m, i, opts) {
  const a = m.atoms[i];
  if (a.el !== 'C') return true;
  if (a.chg) return true;
  if (opts.showCarbons) return true;
  return neighbors(m, i).length === 0;
}

function labelParts(m, i, opts) {
  const a = m.atoms[i];
  const h = a.el === 'H' ? 0 : implicitH(m, i);
  const hs = h ? 'H' + (h > 1 ? sub(h) : '') : '';
  const nb = neighbors(m, i);
  let left = false;
  if (nb.length) {
    const mx = nb.reduce((s, n) => s + m.atoms[n.atom].x, 0) / nb.length;
    left = mx > a.x + 1;
  }
  const charge = a.chg ? (Math.abs(a.chg) > 1 ? Math.abs(a.chg) : '') + (a.chg > 0 ? '+' : '−') : '';
  // El elemento siempre queda centrado sobre la posición del átomo.
  return { main: a.el, hs, left: left && hs, charge };
}

/**
 * Dibuja la molécula dentro de `g` (un <g> SVG). Devuelve nada; marca cada átomo y enlace
 * con data-atom / data-bond para que el editor pueda detectar toques.
 */
export function drawMol(g, m, opts = {}) {
  while (g.firstChild) g.removeChild(g.firstChild);
  const labelled = m.atoms.map((_, i) => showLabel(m, i, opts));
  const bad = new Set(opts.showErrors === false ? [] : valenceErrors(m));
  const rings = ringBonds(m);
  const hl = new Set(opts.highlight || []);

  const gb = el('g', { class: 'bonds' }, g);
  const ga = el('g', { class: 'atoms' }, g);

  m.bonds.forEach((b, idx) => {
    const A = m.atoms[b.a], B = m.atoms[b.b];
    let dx = B.x - A.x, dy = B.y - A.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const sa = labelled[b.a] ? 10 : 0;
    const sb = labelled[b.b] ? 10 : 0;
    const x1 = A.x + dx * sa, y1 = A.y + dy * sa;
    const x2 = B.x - dx * sb, y2 = B.y - dy * sb;
    const nx = -dy, ny = dx;
    const grp = el('g', { class: 'bond', 'data-bond': idx }, gb);
    // zona de toque más ancha e invisible
    el('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: 'hit' }, grp);
    const line = (ox, oy, shrink = 0) =>
      el('line', {
        x1: x1 + ox + dx * shrink, y1: y1 + oy + dy * shrink,
        x2: x2 + ox - dx * shrink, y2: y2 + oy - dy * shrink,
      }, grp);
    if (b.o === 1 && b.w) {
      // cuña (hacia el observador) o raya (hacia atrás), estrecha en el estereocentro
      const fromA = b.desde === b.a;
      const [sx, sy, ex, ey] = fromA ? [x1, y1, x2, y2] : [x2, y2, x1, y1];
      const W = 4.2;
      if (b.w === 'cuña') {
        el('polygon', { class: 'wedge', points: `${sx},${sy} ${ex + nx * W},${ey + ny * W} ${ex - nx * W},${ey - ny * W}` }, grp);
      } else {
        const n = 6;
        for (let k = 1; k <= n; k++) {
          const t = k / n, w = W * t;
          const px = sx + (ex - sx) * t, py = sy + (ey - sy) * t;
          el('line', { class: 'hash', x1: px + nx * w, y1: py + ny * w, x2: px - nx * w, y2: py - ny * w }, grp);
        }
      }
    } else if (b.o === 1) line(0, 0);
    else if (b.o === 2) {
      const deg = (k) => neighbors(m, k).length;
      const offset = !labelled[b.a] && !labelled[b.b] && (rings.has(idx) || ((deg(b.a) === 1) !== (deg(b.b) === 1)));
      if (offset) {
        // segunda línea hacia el interior del anillo
        const side = ringSide(m, b, nx, ny);
        line(0, 0);
        line(nx * 6 * side, ny * 6 * side, 5);
      } else {
        line(nx * 3, ny * 3);
        line(-nx * 3, -ny * 3);
      }
    } else if (b.o === 3) {
      line(0, 0);
      line(nx * 4.5, ny * 4.5, 2);
      line(-nx * 4.5, -ny * 4.5, 2);
    }
  });

  m.atoms.forEach((a, i) => {
    const grp = el('g', {
      class: 'atom' + (bad.has(i) ? ' bad' : '') + (hl.has(i) ? ' hl' : '') + (labelled[i] ? ' labelled' : ''),
      'data-atom': i,
      'data-el': a.el,
      transform: `translate(${a.x},${a.y})`,
    }, ga);
    el('circle', { r: 14, class: 'hit' }, grp);
    if (bad.has(i) || hl.has(i)) el('circle', { r: 13, class: 'ring' }, grp);
    if (opts.numeros?.[i] != null) {
      const t = el('text', { class: 'lbl num-atom', x: 12, y: -12, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grp);
      t.textContent = opts.numeros[i];
    }
    if (opts.marcados?.includes(i)) el('circle', { r: 11, class: 'mark' }, grp);
    if (labelled[i]) {
      const p = labelParts(m, i, opts);
      el('circle', { r: 9.5, class: 'bg' }, grp);
      const t = el('text', { class: 'lbl el-' + a.el, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grp);
      t.textContent = p.main;
      if (p.hs) {
        const th = el('text', {
          class: 'lbl lbl-h',
          'text-anchor': p.left ? 'end' : 'start',
          'dominant-baseline': 'central',
          x: p.left ? -7 - (p.main.length - 1) * 4 : 7 + (p.main.length - 1) * 4,
        }, grp);
        th.textContent = p.hs;
      }
      if (p.charge) {
        const tc = el('text', { class: 'lbl chg', x: 8, y: -9, 'text-anchor': 'middle' }, grp);
        tc.textContent = p.charge;
      }
    } else if (opts.showDots) {
      el('circle', { r: 2.2, class: 'dot' }, grp);
    }
  });
}

function ringSide(m, b, nx, ny) {
  // Elige el lado del enlace donde hay más átomos vecinos (el interior del anillo).
  const A = m.atoms[b.a], B = m.atoms[b.b];
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  let s = 0;
  for (const idx of [b.a, b.b]) {
    for (const { atom } of neighbors(m, idx)) {
      if (atom === b.a || atom === b.b) continue;
      const P = m.atoms[atom];
      s += (P.x - mx) * nx + (P.y - my) * ny;
    }
  }
  return s >= 0 ? 1 : -1;
}

/** Caja que contiene la molécula. */
export function bbox(m, pad = 24) {
  if (!m.atoms.length) return { x: -100, y: -100, w: 200, h: 200 };
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const a of m.atoms) {
    x0 = Math.min(x0, a.x); y0 = Math.min(y0, a.y);
    x1 = Math.max(x1, a.x); y1 = Math.max(y1, a.y);
  }
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
}

/** SVG estático (no interactivo) de una molécula, ajustado a su tamaño. */
export function molSVG(m, opts = {}) {
  const svg = el('svg', { class: 'mol-view', role: 'img' });
  const b = bbox(m, opts.pad ?? 22);
  const minW = opts.minSize ?? 80;
  const w = Math.max(b.w, minW), h = Math.max(b.h, minW * 0.6);
  svg.setAttribute('viewBox', `${b.x - (w - b.w) / 2} ${b.y - (h - b.h) / 2} ${w} ${h}`);
  // tamaño natural proporcional a la molécula (las pequeñas no se agrandan de más)
  const k = opts.scale ?? 1.25;
  svg.setAttribute('width', Math.round(w * k));
  svg.setAttribute('height', Math.round(h * k));
  if (opts.label) svg.setAttribute('aria-label', opts.label);
  const g = el('g', {}, svg);
  drawMol(g, m, { showErrors: false, ...opts });
  return svg;
}
