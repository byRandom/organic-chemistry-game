// Editor de moléculas táctil (ratón, dedo y teclado).
import {
  createMol, cloneMol, addAtom, addBond, findBond, removeAtom, removeBond,
  neighbors, canAddBondOrder, bondOrderSum, maxValence, ELEMENTS,
} from '../chem/mol.js';
import { drawMol, el, bbox } from '../render/svg.js';

export const BOND_LEN = 40;
const TAP_SLOP = 8; // píxeles de pantalla
const MERGE_DIST = 12;

const EL_NAMES = Object.fromEntries(Object.entries(ELEMENTS).map(([k, v]) => [k, v.name]));

export class MolEditor {
  /**
   * @param {HTMLElement} host contenedor
   * @param {object} opts { onChange(mol), onEvent(name, detail), showCarbons }
   */
  constructor(host, opts = {}) {
    this.host = host;
    this.opts = opts;
    this.mol = createMol();
    this.undoStack = [];
    this.redoStack = [];
    this.tool = { kind: 'atom', el: 'C' };
    this.view = { x: -160, y: -160, w: 320, h: 320 };
    this.pointers = new Map();
    this.gesture = null;

    this.svg = el('svg', { class: 'editor-svg', tabindex: '0', 'aria-label': 'Lienzo de dibujo de moléculas' });
    this.gGrid = el('g', { class: 'grid' }, this.svg);
    this.gMol = el('g', {}, this.svg);
    this.gPreview = el('g', { class: 'preview' }, this.svg);
    host.appendChild(this.svg);

    this.svg.addEventListener('pointerdown', (e) => this.onDown(e));
    this.svg.addEventListener('pointermove', (e) => this.onMove(e));
    this.svg.addEventListener('pointerup', (e) => this.onUp(e));
    this.svg.addEventListener('pointercancel', (e) => this.onCancel(e));
    this.svg.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    this.svg.addEventListener('keydown', (e) => this.onKey(e));
    this.resizeObs = new ResizeObserver(() => this.applyView());
    this.resizeObs.observe(this.svg);
    this.render();
  }

  destroy() {
    this.resizeObs.disconnect();
    this.svg.remove();
  }

  // ---------- estado ----------
  setTool(tool) { this.tool = tool; }

  setMol(m, { record = true } = {}) {
    if (record) this.snapshot();
    this.mol = cloneMol(m);
    this.changed();
    this.fit();
  }

  snapshot() {
    this.undoStack.push(cloneMol(this.mol));
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
  }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(cloneMol(this.mol));
    this.mol = this.undoStack.pop();
    this.changed();
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(cloneMol(this.mol));
    this.mol = this.redoStack.pop();
    this.changed();
  }

  clear() {
    if (!this.mol.atoms.length) return;
    this.snapshot();
    this.mol = createMol();
    this.changed();
    this.view = { x: -160, y: -160, w: 320, h: 320 };
    this.applyView();
  }

  changed() {
    this.render();
    this.opts.onChange?.(this.mol);
  }

  emit(name, detail = {}) {
    this.opts.onEvent?.(name, detail);
  }

  render() {
    drawMol(this.gMol, this.mol, { showCarbons: this.opts.showCarbons, showDots: true });
    this.ensureVisible();
  }

  // ---------- vista ----------
  applyView() {
    const r = this.svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // Mantiene la proporción del elemento en pantalla.
    const aspect = r.width / r.height;
    const v = this.view;
    let w = v.w, h = v.h;
    if (w / h > aspect) h = w / aspect; else w = h * aspect;
    const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
    this.view = { x: cx - w / 2, y: cy - h / 2, w, h };
    this.svg.setAttribute('viewBox', `${this.view.x} ${this.view.y} ${w} ${h}`);
  }

  fit() {
    const b = bbox(this.mol, 40);
    const w = Math.max(b.w, 320), h = Math.max(b.h, 320);
    this.view = { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
    this.applyView();
  }

  ensureVisible() {
    if (!this.mol.atoms.length) return;
    const b = bbox(this.mol, 26);
    const v = this.view;
    if (b.x < v.x || b.y < v.y || b.x + b.w > v.x + v.w || b.y + b.h > v.y + v.h) {
      const x0 = Math.min(b.x, v.x), y0 = Math.min(b.y, v.y);
      const x1 = Math.max(b.x + b.w, v.x + v.w), y1 = Math.max(b.y + b.h, v.y + v.h);
      this.view = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      this.applyView();
    }
  }

  zoom(factor, cx = null, cy = null) {
    const v = this.view;
    const px = cx ?? v.x + v.w / 2, py = cy ?? v.y + v.h / 2;
    const w = Math.min(Math.max(v.w * factor, 120), 4000);
    const f = w / v.w;
    this.view = { x: px - (px - v.x) * f, y: py - (py - v.y) * f, w: v.w * f, h: v.h * f };
    this.applyView();
  }

  toWorld(e) {
    const pt = this.svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const ctm = this.svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  pxToWorld(px) {
    const r = this.svg.getBoundingClientRect();
    return (px * this.view.w) / (r.width || 1);
  }

  // ---------- localizar ----------
  hitAtom(p, exclude = -1) {
    let best = -1, bd = this.pxToWorld(22);
    bd = Math.max(bd, 14);
    this.mol.atoms.forEach((a, i) => {
      if (i === exclude) return;
      const d = Math.hypot(a.x - p.x, a.y - p.y);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  hitBond(p) {
    let best = -1, bd = Math.max(this.pxToWorld(14), 9);
    this.mol.bonds.forEach((b, i) => {
      const A = this.mol.atoms[b.a], B = this.mol.atoms[b.b];
      const d = distToSegment(p, A, B);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  // ---------- eventos de puntero ----------
  onDown(e) {
    this.svg.focus({ preventScroll: true });
    this.svg.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      // Empieza gesto de pellizco / desplazamiento con dos dedos.
      this.clearPreview();
      const [p1, p2] = [...this.pointers.values()];
      this.gesture = {
        kind: 'pinch',
        dist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
        mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
        view: { ...this.view },
      };
      return;
    }
    if (this.pointers.size > 2) return;
    if (e.button === 1 || e.button === 2) {
      this.gesture = { kind: 'pan', start: { x: e.clientX, y: e.clientY }, view: { ...this.view } };
      return;
    }
    const p = this.toWorld(e);
    const atom = this.hitAtom(p);
    const bond = atom < 0 ? this.hitBond(p) : -1;
    this.gesture = { kind: 'press', startPx: { x: e.clientX, y: e.clientY }, startW: p, atom, bond, moved: false };
  }

  onMove(e) {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = this.gesture;
    if (!g) return;
    if (g.kind === 'pinch' && this.pointers.size >= 2) {
      const [p1, p2] = [...this.pointers.values()];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1;
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const r = this.svg.getBoundingClientRect();
      const scale = g.dist / dist;
      const w = Math.min(Math.max(g.view.w * scale, 120), 4000);
      const f = w / g.view.w;
      // punto del mundo bajo el centro inicial del gesto
      const wx = g.view.x + ((g.mid.x - r.left) / r.width) * g.view.w;
      const wy = g.view.y + ((g.mid.y - r.top) / r.height) * g.view.h;
      const nw = g.view.w * f, nh = g.view.h * f;
      this.view = {
        x: wx - ((mid.x - r.left) / r.width) * nw,
        y: wy - ((mid.y - r.top) / r.height) * nh,
        w: nw, h: nh,
      };
      this.applyView();
      return;
    }
    if (g.kind === 'pan') {
      const r = this.svg.getBoundingClientRect();
      const k = g.view.w / r.width;
      this.view = { ...g.view, x: g.view.x - (e.clientX - g.start.x) * k, y: g.view.y - (e.clientY - g.start.y) * k };
      this.applyView();
      return;
    }
    if (g.kind === 'press') {
      const d = Math.hypot(e.clientX - g.startPx.x, e.clientY - g.startPx.y);
      if (d > TAP_SLOP) g.moved = true;
      if (g.moved && g.atom >= 0 && this.tool.kind !== 'erase') this.showDragPreview(g.atom, this.toWorld(e));
    }
  }

  onUp(e) {
    const g = this.gesture;
    this.pointers.delete(e.pointerId);
    if (!g) return;
    if (g.kind === 'pinch') {
      if (this.pointers.size === 0) this.gesture = null;
      return;
    }
    this.gesture = null;
    if (g.kind !== 'press') return;
    this.clearPreview();
    const p = this.toWorld(e);
    if (g.moved && g.atom >= 0) this.dragFromAtom(g.atom, p);
    else if (!g.moved) this.tap(g.startW, g.atom, g.bond);
  }

  onCancel(e) {
    this.pointers.delete(e.pointerId);
    this.gesture = null;
    this.clearPreview();
  }

  onWheel(e) {
    e.preventDefault();
    const p = this.toWorld(e);
    this.zoom(e.deltaY > 0 ? 1.12 : 1 / 1.12, p.x, p.y);
  }

  onKey(e) {
    const k = e.key;
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return; }
    const map = { c: 'C', h: 'H', o: 'O', n: 'N', s: 'S', f: 'F', l: 'Cl', b: 'Br', i: 'I', p: 'P' };
    if (map[k]) { this.opts.onToolKey?.({ kind: 'atom', el: map[k] }); return; }
    if (k === '1' || k === '2' || k === '3') { this.opts.onToolKey?.({ kind: 'bond', order: +k }); return; }
    if (k === 'Delete' || k === 'Backspace' || k === 'e') { this.opts.onToolKey?.({ kind: 'erase' }); }
  }

  // ---------- vista previa de arrastre ----------
  showDragPreview(from, p) {
    this.clearPreview();
    const A = this.mol.atoms[from];
    const target = this.hitAtom(p, from);
    const q = target >= 0 ? this.mol.atoms[target] : snapPoint(A, p);
    el('line', { x1: A.x, y1: A.y, x2: q.x, y2: q.y }, this.gPreview);
    el('circle', { cx: q.x, cy: q.y, r: 5 }, this.gPreview);
  }

  clearPreview() {
    while (this.gPreview.firstChild) this.gPreview.removeChild(this.gPreview.firstChild);
  }

  // ---------- acciones ----------
  refuse(atomIdx, extra = '') {
    const a = this.mol.atoms[atomIdx];
    const name = EL_NAMES[a.el] || a.el;
    const max = maxValence(a.el, a.chg);
    this.emit('valence-blocked', { atom: atomIdx, el: a.el });
    this.emit('toast', {
      text: `El ${name} no admite más enlaces: ya tiene ${bondOrderSum(this.mol, atomIdx)} de ${max}.${extra}`,
      kind: 'warn',
    });
    this.flash(atomIdx);
  }

  flash(i) {
    const g = this.gMol.querySelector(`[data-atom="${i}"]`);
    if (!g) return;
    g.classList.remove('shake');
    void g.getBBox();
    g.classList.add('shake');
  }

  currentElement() {
    return this.tool.kind === 'atom' ? this.tool.el : 'C';
  }

  currentOrder() {
    return this.tool.kind === 'bond' ? this.tool.order : 1;
  }

  tap(p, atom, bond) {
    const t = this.tool;
    if (t.kind === 'erase') {
      if (atom >= 0) { this.snapshot(); removeAtom(this.mol, atom); this.changed(); }
      else if (bond >= 0) { this.snapshot(); removeBond(this.mol, bond); this.changed(); }
      return;
    }
    if (t.kind === 'charge') {
      if (atom < 0) return;
      const a = this.mol.atoms[atom];
      const next = a.chg === 0 ? 1 : a.chg === 1 ? -1 : 0;
      this.snapshot();
      a.chg = next;
      if (bondOrderSum(this.mol, atom) > maxValence(a.el, a.chg)) {
        a.chg = next === 1 ? -1 : 0;
        if (bondOrderSum(this.mol, atom) > maxValence(a.el, a.chg)) a.chg = 0;
      }
      this.changed();
      return;
    }
    if (t.kind === 'ring') {
      this.placeRing(p, atom, bond, t.size, t.aromatic);
      return;
    }
    if (atom >= 0) {
      const a = this.mol.atoms[atom];
      if (t.kind === 'atom' && t.el !== a.el && t.el !== 'H') {
        // cambiar el elemento si la valencia lo permite
        const sum = bondOrderSum(this.mol, atom);
        if (sum > maxValence(t.el, 0)) {
          this.emit('toast', { text: `No se puede cambiar a ${EL_NAMES[t.el]}: tendría demasiados enlaces.`, kind: 'warn' });
          this.flash(atom);
          return;
        }
        this.snapshot();
        a.el = t.el;
        a.chg = 0;
        this.changed();
        return;
      }
      this.growFrom(atom, this.currentElement(), this.currentOrder());
      return;
    }
    if (bond >= 0) {
      const b = this.mol.bonds[bond];
      let order;
      if (t.kind === 'bond' && b.o !== t.order) order = t.order;
      else order = (b.o % 3) + 1;
      const delta = order - b.o;
      if (delta > 0) {
        if (!canAddBondOrder(this.mol, b.a, delta)) return this.refuse(b.a);
        if (!canAddBondOrder(this.mol, b.b, delta)) return this.refuse(b.b);
      }
      this.snapshot();
      b.o = order;
      this.changed();
      this.emit('bond-order', { order });
      return;
    }
    // toque en vacío: átomo nuevo
    this.snapshot();
    const elx = this.currentElement();
    addAtom(this.mol, elx, p.x, p.y);
    this.changed();
  }

  growFrom(atom, elx, order) {
    if (!canAddBondOrder(this.mol, atom, order)) return this.refuse(atom);
    if (maxValence(elx, 0) < order) {
      this.emit('toast', { text: `El ${EL_NAMES[elx]} no puede formar un enlace ${order === 2 ? 'doble' : 'triple'}.`, kind: 'warn' });
      return;
    }
    const pos = newAtomPosition(this.mol, atom);
    this.snapshot();
    const j = addAtom(this.mol, elx, pos.x, pos.y);
    addBond(this.mol, atom, j, order);
    this.changed();
  }

  dragFromAtom(from, p) {
    const target = this.hitAtom(p, from);
    const order = this.currentOrder();
    if (target >= 0) {
      const existing = findBond(this.mol, from, target);
      const newOrder = existing >= 0 ? (this.mol.bonds[existing].o % 3) + 1 : order;
      const delta = newOrder - (existing >= 0 ? this.mol.bonds[existing].o : 0);
      if (delta > 0) {
        if (!canAddBondOrder(this.mol, from, delta)) return this.refuse(from);
        if (!canAddBondOrder(this.mol, target, delta)) return this.refuse(target);
      }
      this.snapshot();
      addBond(this.mol, from, target, newOrder);
      this.changed();
      return;
    }
    if (!canAddBondOrder(this.mol, from, order)) return this.refuse(from);
    const q = snapPoint(this.mol.atoms[from], p);
    this.snapshot();
    const j = addAtom(this.mol, this.currentElement(), q.x, q.y);
    addBond(this.mol, from, j, order);
    this.changed();
  }

  placeRing(p, atom, bond, size, aromatic) {
    const m = this.mol;
    const R = BOND_LEN / (2 * Math.sin(Math.PI / size));
    let verts, shared = [];
    if (bond >= 0) {
      // anillo fusionado sobre el enlace tocado
      const b = m.bonds[bond];
      const A = m.atoms[b.a], B = m.atoms[b.b];
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
      let nx = -(B.y - A.y), ny = B.x - A.x;
      const nl = Math.hypot(nx, ny) || 1;
      nx /= nl; ny /= nl;
      // lado con menos átomos
      let s = 0;
      for (const idx of [b.a, b.b]) for (const { atom: k } of neighbors(m, idx)) {
        if (k === b.a || k === b.b) continue;
        s += (m.atoms[k].x - mx) * nx + (m.atoms[k].y - my) * ny;
      }
      if (s > 0) { nx = -nx; ny = -ny; }
      const apo = BOND_LEN / (2 * Math.tan(Math.PI / size));
      const cx = mx + nx * apo, cy = my + ny * apo;
      verts = polygon(cx, cy, R, Math.atan2(A.y - cy, A.x - cx), size, B, cx, cy);
      shared = [b.a, b.b];
    } else if (atom >= 0) {
      // anillo como sustituyente (unido por un enlace sencillo)
      if (!canAddBondOrder(m, atom, 1)) return this.refuse(atom);
      const A = m.atoms[atom];
      const pos = newAtomPosition(m, atom);
      const dx = pos.x - A.x, dy = pos.y - A.y;
      const dl = Math.hypot(dx, dy) || 1;
      const cx = pos.x + (dx / dl) * R, cy = pos.y + (dy / dl) * R;
      verts = polygon(cx, cy, R, Math.atan2(pos.y - cy, pos.x - cx), size);
    } else {
      verts = polygon(p.x, p.y, R, -Math.PI / 2 - (size % 2 ? 0 : Math.PI / size), size);
    }
    this.snapshot();
    // fusiona vértices que coinciden con átomos existentes
    const idx = verts.map((v, k) => {
      if (bond >= 0 && k < 2) return shared[k];
      const ex = m.atoms.findIndex((a) => Math.hypot(a.x - v.x, a.y - v.y) < MERGE_DIST);
      return ex >= 0 ? ex : addAtom(m, 'C', v.x, v.y);
    });
    if (atom >= 0 && bond < 0) addBond(m, atom, idx[0], 1);
    const ringEdges = [];
    for (let k = 0; k < size; k++) {
      const a = idx[k], b = idx[(k + 1) % size];
      if (a === b) continue;
      if (findBond(m, a, b) < 0) addBond(m, a, b, 1);
      ringEdges.push(findBond(m, a, b));
    }
    if (aromatic) kekulize(m, ringEdges);
    // si algún átomo quedó con demasiados enlaces, se deshace
    if (idx.some((i) => bondOrderSum(m, i) > maxValence(m.atoms[i].el, m.atoms[i].chg))) {
      this.mol = this.undoStack.pop();
      const bad = idx.find((i) => bondOrderSum(m, i) > maxValence(m.atoms[i].el, m.atoms[i].chg));
      this.render();
      this.refuse(bad);
      return;
    }
    this.changed();
  }
}

// ---------- geometría ----------
function distToSegment(p, A, B) {
  const dx = B.x - A.x, dy = B.y - A.y;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((p.x - A.x) * dx + (p.y - A.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (A.x + t * dx), p.y - (A.y + t * dy));
}

function snapPoint(A, p) {
  const ang = Math.atan2(p.y - A.y, p.x - A.x);
  const step = Math.PI / 6;
  const s = Math.round(ang / step) * step;
  return { x: A.x + Math.cos(s) * BOND_LEN, y: A.y + Math.sin(s) * BOND_LEN };
}

/** Vértices de un polígono regular. Si se da `second`, orienta el giro para que el vértice 1 sea `second`. */
function polygon(cx, cy, R, startAngle, n, second = null) {
  let dir = 1;
  if (second) {
    const a1 = startAngle + (2 * Math.PI) / n;
    const p1 = { x: cx + R * Math.cos(a1), y: cy + R * Math.sin(a1) };
    if (Math.hypot(p1.x - second.x, p1.y - second.y) > 1) dir = -1;
  }
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = startAngle + dir * k * ((2 * Math.PI) / n);
    out.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
  }
  return out;
}

/** Posición para un átomo nuevo unido a `i`: zigzag en cadenas, hueco más grande si hay ramas. */
export function newAtomPosition(m, i) {
  const A = m.atoms[i];
  const nb = neighbors(m, i).map(({ atom }) => m.atoms[atom]);
  let angles = [];
  if (nb.length === 0) angles = [-Math.PI / 6];
  else if (nb.length === 1) {
    const B = nb[0];
    const t = Math.atan2(B.y - A.y, B.x - A.x);
    const c1 = t + (2 * Math.PI) / 3, c2 = t - (2 * Math.PI) / 3;
    const wantDown = A.y - B.y <= 0; // si A está por encima de B, el nuevo va hacia abajo
    const s1 = Math.sin(c1);
    angles = (s1 > 0) === wantDown ? [c1, c2] : [c2, c1];
    // en un enlace triple, mantener la línea recta
    const bo = m.bonds[findBond(m, i, m.atoms.indexOf(B))]?.o;
    if (bo === 3) angles = [t + Math.PI];
  } else {
    const ts = nb.map((B) => Math.atan2(B.y - A.y, B.x - A.x)).sort((a, b) => a - b);
    let best = 0, bestGap = -1;
    for (let k = 0; k < ts.length; k++) {
      const a = ts[k], b = k + 1 < ts.length ? ts[k + 1] : ts[0] + 2 * Math.PI;
      if (b - a > bestGap) { bestGap = b - a; best = a + (b - a) / 2; }
    }
    angles = [best, best + 0.5, best - 0.5];
  }
  for (const ang of angles) {
    const p = { x: A.x + Math.cos(ang) * BOND_LEN, y: A.y + Math.sin(ang) * BOND_LEN };
    if (!m.atoms.some((a) => Math.hypot(a.x - p.x, a.y - p.y) < MERGE_DIST)) return p;
  }
  // sin hueco libre: rota hasta encontrar sitio
  for (let k = 1; k < 12; k++) {
    const ang = angles[0] + (k * Math.PI) / 6;
    const p = { x: A.x + Math.cos(ang) * BOND_LEN, y: A.y + Math.sin(ang) * BOND_LEN };
    if (!m.atoms.some((a) => Math.hypot(a.x - p.x, a.y - p.y) < MERGE_DIST)) return p;
  }
  return { x: A.x + BOND_LEN, y: A.y };
}

/** Coloca dobles enlaces alternos en un anillo (benceno), respetando valencias. */
function kekulize(m, ringEdges) {
  for (let start = 0; start < 2; start++) {
    const trial = cloneMol(m);
    let ok = true;
    for (let k = start; k < ringEdges.length; k += 2) {
      const b = trial.bonds[ringEdges[k]];
      if (b.o !== 1) continue;
      if (canAddBondOrder(trial, b.a, 1) && canAddBondOrder(trial, b.b, 1)) b.o = 2;
      else ok = false;
    }
    if (ok) { m.bonds = trial.bonds; return; }
  }
}
