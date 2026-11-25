// Dibujo de proyecciones: Fischer, Newman, caballete y silla de ciclohexano.
import { el } from './svg.js';

function svgBase(cls, vb, label) {
  const svg = el('svg', { class: 'proj ' + cls, viewBox: vb.join(' '), role: 'img' });
  if (label) svg.setAttribute('aria-label', label);
  svg.setAttribute('width', Math.round(vb[2] * 1.6));
  svg.setAttribute('height', Math.round(vb[3] * 1.6));
  return svg;
}

function texto(g, x, y, t, attrs = {}) {
  const e = el('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'plbl', ...attrs }, g);
  e.textContent = t;
  return e;
}

/** Ancho aproximado de una etiqueta (para separar los textos de las líneas). */
const ancho = (t) => Math.max(12, [...t].length * 8.6);

/**
 * Proyección de Fischer.
 * f: { arriba, abajo, filas:[{izq, der, etiqueta?}] }
 * opts: { marcas: {i: 'R'|'S'|'?'}, onTapFila(i), onTapGrupo(i, lado), resaltar: [i] }
 */
export function fischerSVG(f, opts = {}) {
  const N = f.filas.length;
  const dy = 52, L = 46;
  const maxIzq = Math.max(...f.filas.map((r) => ancho(r.izq)));
  const maxDer = Math.max(...f.filas.map((r) => ancho(r.der)));
  const x0 = -L - maxIzq - 8, ancho2 = L * 2 + maxIzq + maxDer + 16 + 40;
  const svg = svgBase('fischer', [x0, -dy * 0.5 - 24, ancho2, dy * N + 48], 'Proyección de Fischer');
  const g = el('g', {}, svg);
  const top = -dy * 0.5 + 6, bottom = dy * (N - 1) + dy * 0.5 - 6;
  el('line', { x1: 0, y1: top, x2: 0, y2: bottom, class: 'pline' }, g);
  texto(g, 0, top - 12, f.arriba, { class: 'plbl grupo', 'data-grupo': 'arriba' });
  texto(g, 0, bottom + 12, f.abajo, { class: 'plbl grupo', 'data-grupo': 'abajo' });
  f.filas.forEach((fila, i) => {
    const y = i * dy;
    const fg = el('g', { class: 'frow' + (opts.resaltar?.includes(i) ? ' hl' : ''), 'data-fila': i }, g);
    el('line', { x1: -L, y1: y, x2: L, y2: y, class: 'pline' }, fg);
    const ti = texto(fg, -L - 6, y, fila.izq, { 'text-anchor': 'end', class: 'plbl grupo', 'data-lado': 'izq' });
    const td = texto(fg, L + 6, y, fila.der, { 'text-anchor': 'start', class: 'plbl grupo', 'data-lado': 'der' });
    if (opts.resaltar?.includes(i)) el('circle', { cx: 0, cy: y, r: 7, class: 'pcenter' }, fg);
    const marca = opts.marcas?.[i];
    if (marca) texto(fg, L + maxDer + 26, y, '(' + marca + ')', { class: 'plbl marca' });
    if (opts.onTapGrupo) {
      for (const [t, lado] of [[ti, 'izq'], [td, 'der']]) {
        t.classList.add('tappable');
        t.addEventListener('click', () => opts.onTapGrupo(i, lado));
      }
    }
    if (opts.onTapFila) { fg.classList.add('tappable'); fg.addEventListener('click', () => opts.onTapFila(i)); }
  });
  return svg;
}

// ---------- Newman y caballete ----------
const rad = (g) => (g * Math.PI) / 180;

/**
 * Proyección de Newman. n: { delante:[{texto, ang}], detras:[{texto, ang}] }, ángulos en grados (0 = arriba).
 * opts: { energia, etiquetas: {delante: 'C2', detras: 'C3'} }
 */
export function newmanSVG(n, opts = {}) {
  const R = 30, Lb = 60;
  const svg = svgBase('newman', [-110, -100, 220, 200], 'Proyección de Newman');
  const g = el('g', {}, svg);
  // en conformaciones eclipsadas, los grupos traseros se desplazan un poco para que se vean (como en el libro)
  const eclipsado = (ang) => n.delante.some((f) => Math.abs((((f.ang - ang) % 360) + 360) % 360) < 1 || Math.abs((((f.ang - ang) % 360) + 360) % 360 - 360) < 1);
  for (const s of n.detras) {
    const a = rad(s.ang + (eclipsado(s.ang) ? 26 : 0));
    const x1 = Math.sin(a) * R, y1 = -Math.cos(a) * R;
    const x2 = Math.sin(a) * Lb, y2 = -Math.cos(a) * Lb;
    el('line', { x1, y1, x2, y2, class: 'pline' }, g);
    texto(g, Math.sin(a) * (Lb + 6 + ancho(s.texto) / 2.4), -Math.cos(a) * (Lb + 11), s.texto, { class: 'plbl grupo detras' });
  }
  el('circle', { cx: 0, cy: 0, r: R, class: 'pcircle' }, g);
  for (const s of n.delante) {
    const a = rad(s.ang);
    const x2 = Math.sin(a) * R * 0.97, y2 = -Math.cos(a) * R * 0.97;
    el('line', { x1: 0, y1: 0, x2, y2, class: 'pline' }, g);
    texto(g, Math.sin(a) * (R + 4 + ancho(s.texto) / 2.4), -Math.cos(a) * (R + 10), s.texto, { class: 'plbl grupo delante' });
  }
  el('circle', { cx: 0, cy: 0, r: 2.5, class: 'pdot' }, g);
  return svg;
}

/** Proyección en caballete a partir de la misma disposición que Newman. */
export function caballeteSVG(n) {
  const svg = svgBase('caballete', [-95, -100, 210, 190], 'Proyección en caballete');
  const g = el('g', {}, svg);
  // eje del enlace en diagonal: carbono delantero abajo a la izquierda, trasero arriba a la derecha
  const F = { x: -22, y: 22 }, B = { x: 30, y: -30 };
  const L = 40;
  el('line', { x1: F.x, y1: F.y, x2: B.x, y2: B.y, class: 'pline' }, g);
  const dibujar = (C, subs, cls) => {
    for (const s of subs) {
      const a = rad(s.ang);
      // proyección oblicua: los grupos se ven alrededor de cada carbono, algo aplastados en vertical
      const dx = Math.sin(a) * L, dy = -Math.cos(a) * L * 0.8;
      el('line', { x1: C.x, y1: C.y, x2: C.x + dx, y2: C.y + dy, class: 'pline' }, g);
      texto(g, C.x + dx * 1.32 + Math.sign(dx) * ancho(s.texto) / 4, C.y + dy * 1.3, s.texto, { class: 'plbl grupo ' + cls });
    }
  };
  dibujar(B, n.detras, 'detras');
  dibujar(F, n.delante, 'delante');
  return svg;
}

// ---------- silla de ciclohexano ----------
/**
 * Geometría 3D de una silla y su proyección. pliegue = +1 o -1 (las dos sillas que se interconvierten).
 * Devuelve por carbono: posición 2D, dirección axial y ecuatorial (2D) y si su axial apunta hacia arriba.
 */
export function geometriaSilla(pliegue = 1) {
  // Silla 3D (radio 1, altura ±h alternada) vista casi de canto, con las puntas a izquierda y derecha.
  // Pantalla: X = cos θ, Y = −altura + t·sen θ (t: inclinación de la vista).
  const h = 0.25, t = 0.36, S = 62;
  const proj = (x, alt, z) => ({ x: x * S, y: (-alt + t * z) * S });
  const orden = [3, 2, 1, 0, 5, 4]; // C1 = punta izquierda, numerando por el borde delantero
  return orden.map((k) => {
    const th = (Math.PI / 3) * k;
    const sgn = (k % 2 === 0 ? 1 : -1) * pliegue; // +1: carbono «alto» (axial hacia arriba)
    const c = [Math.cos(th), sgn * h, Math.sin(th)];
    const P = proj(c[0], c[1], c[2]);
    const A = proj(c[0], c[1] + sgn * 0.55, c[2]);
    const E = proj(c[0] + Math.cos(th) * 0.55, c[1] - sgn * 0.18, c[2] + Math.sin(th) * 0.55);
    return { x: P.x, y: P.y, ax: { x: A.x - P.x, y: A.y - P.y }, eq: { x: E.x - P.x, y: E.y - P.y }, axArriba: sgn > 0 };
  });
}

/**
 * Silla con sustituyentes.
 * subs: {carbono(0-5): {texto, pos: 'ax'|'eq'}} ; opts: { pliegue, numeros, onTapPos(carbono, pos), editables: [carbonos] }
 */
export function sillaSVG(subs = {}, opts = {}) {
  const geo = geometriaSilla(opts.pliegue ?? 1);
  const svg = svgBase('silla', [-150, -100, 300, 200], 'Ciclohexano en silla');
  const g = el('g', {}, svg);
  for (let k = 0; k < 6; k++) {
    const a = geo[k], b = geo[(k + 1) % 6];
    el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'pline ring' }, g);
  }
  geo.forEach((c, k) => {
    const sub = subs[k];
    const editable = opts.editables?.includes(k);
    for (const pos of ['ax', 'eq']) {
      const d = c[pos];
      const lleno = sub && sub.pos === pos;
      if (!editable && !lleno && !opts.mostrarH) continue;
      const x2 = c.x + d.x, y2 = c.y + d.y;
      const grp = el('g', { class: 'slot ' + pos + (lleno ? ' lleno' : '') + (editable ? ' tappable' : '') }, g);
      el('line', { x1: c.x, y1: c.y, x2, y2, class: 'pline ' + (lleno ? '' : 'h') }, grp);
      if (lleno) texto(grp, x2 + d.x * 0.45, y2 + d.y * 0.45, sub.texto, { class: 'plbl grupo' });
      else if (editable) el('circle', { cx: x2, cy: y2, r: 5, class: 'slot-dot' }, grp);
      else texto(grp, x2 + d.x * 0.3, y2 + d.y * 0.3, 'H', { class: 'plbl hsmall' });
      if (editable) {
        el('line', { x1: c.x, y1: c.y, x2: x2 + d.x * 0.5, y2: y2 + d.y * 0.5, class: 'hit' }, grp);
        grp.addEventListener('click', () => opts.onTapPos?.(k, pos));
      }
    }
    if (opts.numeros) texto(g, c.x - c.eq.x * 0.28, c.y - c.eq.y * 0.28 + (c.axArriba ? 9 : -9), String(k + 1), { class: 'plbl num' });
  });
  return svg;
}
