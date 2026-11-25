// Barra de herramientas del editor.
import { h } from '../app/ui.js';

const ALL_ELEMENTS = ['C', 'H', 'O', 'N', 'Cl', 'Br', 'F', 'I', 'S', 'P'];
const RINGS = [
  { size: 3, label: '△', name: 'Ciclopropano' },
  { size: 4, label: '□', name: 'Ciclobutano' },
  { size: 5, label: '⬠', name: 'Ciclopentano' },
  { size: 6, label: '⬡', name: 'Ciclohexano' },
  { size: 6, aromatic: true, label: '⌬', name: 'Benceno' },
  { size: 7, label: '7', name: 'Cicloheptano' },
  { size: 8, label: '8', name: 'Ciclooctano' },
];

/**
 * @param {import('./editor.js').MolEditor} editor
 * @param {object} cfg { elementos?: string[], enlaces?: bool, anillos?: bool|number[], cargas?: bool }
 */
export function crearToolbar(editor, cfg = {}) {
  const elementos = cfg.elementos || ALL_ELEMENTS;
  const enlaces = cfg.enlaces !== false;
  const anillos = cfg.anillos === false ? [] : RINGS.filter((r) => !Array.isArray(cfg.anillos) || cfg.anillos.includes(r.aromatic ? 'benceno' : r.size));
  const cargas = !!cfg.cargas;

  const buttons = [];
  const bar = h('div.toolbar', { role: 'toolbar', 'aria-label': 'Herramientas de dibujo' });
  const row1 = h('div.tool-row');
  const row2 = h('div.tool-row');
  bar.append(row1, row2);

  function toolBtn(row, label, tool, title, extraClass = '') {
    const b = h('button.tool', { type: 'button', title, 'aria-label': title, class: extraClass, 'aria-pressed': 'false' }, label);
    b._tool = tool;
    b.addEventListener('click', () => select(tool));
    row.appendChild(b);
    buttons.push(b);
    return b;
  }

  function same(a, b) {
    return a.kind === b.kind && a.el === b.el && a.order === b.order && a.size === b.size && !!a.aromatic === !!b.aromatic;
  }

  function select(tool) {
    editor.setTool(tool);
    for (const b of buttons) b.setAttribute('aria-pressed', same(b._tool, tool) ? 'true' : 'false');
    ringBtn?.setAttribute('aria-pressed', tool.kind === 'ring' ? 'true' : 'false');
    if (ringBtn && tool.kind === 'ring') ringBtn.textContent = RINGS.find((r) => same({ kind: 'ring', size: r.size, aromatic: r.aromatic }, tool))?.label || '⬡';
  }

  for (const e of elementos) toolBtn(row1, e, { kind: 'atom', el: e }, `Elemento: ${e}`, 'tool-el el-' + e);

  if (enlaces) {
    toolBtn(row2, '—', { kind: 'bond', order: 1 }, 'Enlace sencillo');
    toolBtn(row2, '=', { kind: 'bond', order: 2 }, 'Enlace doble');
    toolBtn(row2, '≡', { kind: 'bond', order: 3 }, 'Enlace triple');
  }

  let ringBtn = null;
  if (anillos.length) {
    ringBtn = h('button.tool', { type: 'button', title: 'Anillos', 'aria-label': 'Anillos', 'aria-haspopup': 'true' }, '⬡');
    const menu = h('div.ring-menu', { hidden: true });
    for (const r of anillos) {
      const t = { kind: 'ring', size: r.size, aromatic: !!r.aromatic };
      const b = h('button.tool', { type: 'button', title: r.name, 'aria-label': r.name }, r.label);
      b.addEventListener('click', () => { select(t); menu.hidden = true; });
      menu.appendChild(b);
    }
    ringBtn.addEventListener('click', () => { menu.hidden = !menu.hidden; });
    row2.append(h('div.ring-wrap', ringBtn, menu));
  }
  if (cargas) toolBtn(row2, '±', { kind: 'charge' }, 'Carga formal (+ / −)');
  toolBtn(row2, '⌫', { kind: 'erase' }, 'Borrar átomo o enlace', 'tool-erase');

  row2.append(
    h('span.tool-sep'),
    h('button.tool', { type: 'button', title: 'Deshacer', 'aria-label': 'Deshacer', onclick: () => editor.undo() }, '↶'),
    h('button.tool', { type: 'button', title: 'Rehacer', 'aria-label': 'Rehacer', onclick: () => editor.redo() }, '↷'),
    h('button.tool', { type: 'button', title: 'Encajar en pantalla', 'aria-label': 'Encajar en pantalla', onclick: () => editor.fit() }, '⤢'),
    h('button.tool', {
      type: 'button', title: 'Borrar todo', 'aria-label': 'Borrar todo',
      onclick: () => { if (!editor.mol.atoms.length || confirm('¿Borrar todo el dibujo?')) editor.clear(); },
    }, '🗑'),
  );

  editor.opts.onToolKey = (tool) => {
    if (tool.kind === 'atom' && !elementos.includes(tool.el)) return;
    if (tool.kind === 'bond' && !enlaces) return;
    select(tool);
  };
  select({ kind: 'atom', el: elementos.includes('C') ? 'C' : elementos[0] });
  return { el: bar, select };
}
