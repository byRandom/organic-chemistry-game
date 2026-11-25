// Puzles de razonar: preguntas de elección con explicación.
import { h, rich, ocultarToast } from '../app/ui.js';
import { molFromSmiles } from '../chem/rdkit.js';
import { molSVG } from '../render/svg.js';
import { representar, NOMBRE_REPR } from '../render/depict.js';
import { sillaSVG, newmanSVG } from '../render/proyecciones.js';
import { disposicionNewman } from '../chem/conformacion.js';

/** Ilustración de una pregunta: molécula, representación estereoquímica, pareja, silla o Newman. */
export function ilustracion(p) {
  if (p.par) {
    return h('div.repr-pair', p.par.map((spec, k) => h('figure',
      h('div.proj-box', representar(spec).svg),
      h('figcaption', (k === 0 ? 'A · ' : 'B · ') + NOMBRE_REPR[spec.repr || 'cuña']))));
  }
  if (p.repr) return h('div.proj-box', representar(p.repr).svg);
  if (p.silla) {
    const mapa = Object.fromEntries(p.silla.sustituyentes.map((s) => [s.carbono, { texto: s.texto, pos: s.pos }]));
    return h('div.proj-box', sillaSVG(mapa, { pliegue: p.silla.pliegue ?? 1, numeros: true }));
  }
  if (p.newman) return h('div.proj-box', newmanSVG(disposicionNewman(p.newman.delante, p.newman.detras, p.newman.giro ?? 60)));
  return null;
}

function mol(smiles, resaltar, opts = {}) {
  const m = molFromSmiles(smiles);
  return m ? molSVG(m, { highlight: resaltar || [], minSize: 80, scale: 2.2, ...opts }) : h('code', smiles);
}

function barajarIndices(opciones, semilla) {
  const n = opciones.length;
  let s = [...String(semilla)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17);
  const idx = [...Array(n).keys()];
  // las parejas cis/trans conservan su orden natural
  if (opciones.every((o) => typeof o === 'string' && /^(cis|trans)$/i.test(o))) return idx;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = Math.floor((s / 4294967296) * (i + 1)); // bits altos: los bajos de un LCG apenas varían
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
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
    const ilu = ilustracion(p);
    if (ilu) box.appendChild(ilu);
    const opts = h('div.q-opts' + (p.opciones.some((o) => o.smiles) ? '.q-opts-mol' : ''));
    const expl = h('div.q-expl', { hidden: true, 'aria-live': 'polite' });
    let resuelta = false;
    // las opciones se barajan (de forma estable) para que la correcta no esté siempre en el mismo sitio
    const orden = barajarIndices(p.opciones, (nivel.id || '') + i + p.texto);
    orden.forEach((k) => {
      const o = p.opciones[k];
      const contenido = typeof o === 'string' ? h('span', { html: rich(o) }) : o.smiles ? mol(o.smiles, o.resaltar) : h('span', { html: rich(o.texto) });
      const b = h('button.q-opt', { type: 'button' }, contenido);
      if (o.texto && o.smiles) b.appendChild(h('span.q-opt-cap', { html: rich(o.texto) }));
      b.addEventListener('click', () => {
        if (resuelta || b.disabled) return;
        if (k === p.correcta) {
          resuelta = true;
          ocultarToast();
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
