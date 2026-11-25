// Puzles con el editor: construir, descubrir (evento) y caza de isómeros.
import { h, toast } from '../app/ui.js';
import { MolEditor } from '../editor/editor.js';
import { crearToolbar } from '../editor/toolbar.js';
import { formula, prettyFormula } from '../chem/mol.js';
import { molFromSmiles } from '../chem/rdkit.js';
import { molSVG } from '../render/svg.js';
import { comprobarConstruccion, comprobarIsomero, canonMap } from './validate.js';

export function montarEditor(cont, nivel, ctx) {
  const obj = nivel.objetivo || {};
  const cfg = nivel.editor || {};
  let fallos = 0;
  let terminado = false;

  const status = h('div.ed-status', { 'aria-live': 'polite' });
  const host = h('div.ed-host');
  const wrap = h('div.ed-wrap', host, status);
  cont.appendChild(wrap);

  const editor = new MolEditor(host, {
    showCarbons: !!cfg.mostrarC,
    onChange: (m) => {
      status.innerHTML = m.atoms.length ? 'Fórmula: <span class="f">' + prettyFormula(formula(m)) + '</span>' : '<span class="muted">Toca el lienzo para colocar un átomo</span>';
    },
    onEvent: (name, detail) => {
      if (name === 'toast') toast(detail.text, detail.kind);
      if (!terminado && obj.evento && name === obj.evento && (!obj.elemento || detail.el === obj.elemento)) {
        terminado = true;
        setTimeout(() => ctx.completar({ fallos: 0 }), 900);
      }
    },
  });
  const tb = crearToolbar(editor, cfg);
  wrap.insertBefore(tb.el, host);
  if (nivel.inicial) {
    const m = molFromSmiles(nivel.inicial, { keepH: !!cfg.inicialConH });
    if (m) editor.setMol(m, { record: false });
  } else editor.changed();

  const cleanup = [() => editor.destroy()];

  if (nivel.tipo === 'isomeros') {
    const encontrados = [];
    const nombres = canonMap(obj.nombres);
    const lista = h('div.iso-list');
    const contador = h('div.iso-count');
    const pintar = () => {
      contador.innerHTML = `Encontrados: <strong>${encontrados.length}</strong> de ${obj.total}`;
    };
    pintar();
    cont.appendChild(h('div.iso-panel', contador, lista));
    ctx.setAcciones([
      h('button.btn.primary', {
        type: 'button',
        onclick: () => {
          const r = comprobarIsomero(editor.mol, obj, encontrados);
          if (!r.ok) {
            if (!r.repetido) fallos++;
            toast(r.msg, r.repetido ? 'info' : 'error');
            return;
          }
          encontrados.push(r.canon);
          const mm = molFromSmiles(r.canon);
          const chip = h('div.iso-chip', { title: r.canon }, mm ? molSVG(mm, { minSize: 60 }) : r.canon);
          const nombre = nombres[r.canon];
          if (nombre) chip.appendChild(h('div.iso-name', nombre));
          lista.appendChild(chip);
          pintar();
          if (encontrados.length >= obj.total) {
            ctx.completar({ fallos });
          } else {
            toast(`¡Nuevo isómero! Te quedan ${obj.total - encontrados.length}.`, 'ok');
            editor.clear();
          }
        },
      }, '＋ Añadir isómero'),
    ]);
  } else if (!obj.evento) {
    ctx.setAcciones([
      h('button.btn.primary', {
        type: 'button',
        onclick: () => {
          const r = comprobarConstruccion(editor.mol, obj);
          if (r.ok) ctx.completar({ fallos });
          else { fallos++; toast(r.msg, 'error', 4200); }
        },
      }, '✓ Comprobar'),
    ]);
  } else {
    ctx.setAcciones([]);
  }

  setTimeout(() => editor.fit(), 0);
  return { destroy: () => cleanup.forEach((f) => f()) };
}
