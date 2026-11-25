// Puzles de razonar: preguntas de elección con explicación.
import { h, rich } from '../app/ui.js';
import { molFromSmiles } from '../chem/rdkit.js';
import { molSVG } from '../render/svg.js';

function mol(smiles, resaltar, opts = {}) {
  const m = molFromSmiles(smiles);
  return m ? molSVG(m, { highlight: resaltar || [], minSize: 80, scale: 2.2, ...opts }) : h('code', smiles);
}

export function montarTest(cont, nivel, ctx) {
  const preguntas = nivel.preguntas || [];
  let i = 0;
  let fallos = 0;
  const box = h('div.quiz');
  const progreso = h('div.quiz-progress');
  cont.append(progreso, box);
  ctx.setAcciones([]);

  function mostrar() {
    const p = preguntas[i];
    box.replaceChildren();
    progreso.textContent = preguntas.length > 1 ? `Pregunta ${i + 1} de ${preguntas.length}` : '';
    box.appendChild(h('div.q-text', { html: rich(p.texto) }));
    if (p.smiles) box.appendChild(h('div.q-mol', mol(p.smiles, p.resaltar)));
    const opts = h('div.q-opts' + (p.opciones.some((o) => o.smiles) ? '.q-opts-mol' : ''));
    const expl = h('div.q-expl', { hidden: true, 'aria-live': 'polite' });
    let resuelta = false;
    p.opciones.forEach((o, k) => {
      const contenido = typeof o === 'string' ? h('span', { html: rich(o) }) : o.smiles ? mol(o.smiles, o.resaltar) : h('span', { html: rich(o.texto) });
      const b = h('button.q-opt', { type: 'button' }, contenido);
      if (o.texto && o.smiles) b.appendChild(h('span.q-opt-cap', { html: rich(o.texto) }));
      b.addEventListener('click', () => {
        if (resuelta || b.disabled) return;
        if (k === p.correcta) {
          resuelta = true;
          b.classList.add('ok');
          opts.querySelectorAll('button').forEach((x) => { x.disabled = true; });
          expl.hidden = false;
          expl.className = 'q-expl ok';
          expl.innerHTML = '<strong>¡Correcto!</strong> ' + rich(p.explicacion || '');
          const ultima = i === preguntas.length - 1;
          ctx.setAcciones([
            h('button.btn.primary', {
              type: 'button',
              onclick: () => { if (ultima) ctx.completar({ fallos }); else { i++; mostrar(); } },
            }, ultima ? 'Terminar ▸' : 'Siguiente ▸'),
          ]);
        } else {
          fallos++;
          b.classList.add('bad');
          b.disabled = true;
          expl.hidden = false;
          expl.className = 'q-expl bad';
          expl.innerHTML = '<strong>No es correcto.</strong> ' + rich((typeof o === 'object' && o.porque) || p.pistaFallo || 'Vuelve a intentarlo.');
        }
      });
      opts.appendChild(b);
    });
    box.append(opts, expl);
    ctx.setAcciones([]);
  }
  mostrar();
  return { destroy() {} };
}
