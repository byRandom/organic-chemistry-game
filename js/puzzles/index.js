// Registro de tipos de puzle.
import { h, rich } from '../app/ui.js';
import { montarEditor } from './build.js';
import { montarTest } from './quiz.js';
import { montarQuirales, montarRS, montarAFischer } from './estereo.js';
import { montarNewman, montarSilla } from './conformacion.js';
import { montarReaccion, montarSintesis, montarEsquema } from './reaccion.js';

const TIPOS = {
  construir: montarEditor,
  descubrir: montarEditor,
  isomeros: montarEditor,
  test: montarTest,
  secuencia: montarSecuencia,
  quirales: montarQuirales,
  rs: montarRS,
  fischer: montarAFischer,
  newman: montarNewman,
  silla: montarSilla,
  reaccion: montarReaccion,
  sintesis: montarSintesis,
  esquema: montarEsquema,
};

export function montarPuzle(cont, nivel, ctx) {
  const fn = TIPOS[nivel.tipo];
  if (!fn) {
    cont.appendChild(h('p', `Tipo de puzle desconocido: ${nivel.tipo}`));
    return { destroy() {} };
  }
  return fn(cont, nivel, ctx);
}

/** Jefes: varias fases seguidas, cada una con su propio tipo de puzle. */
function montarSecuencia(cont, nivel, ctx) {
  const pasos = nivel.pasos || [];
  let i = 0;
  let fallos = 0;
  let actual = null;
  const cab = h('div.seq-head');
  const enunciado = h('div.seq-text');
  const cuerpo = h('div.seq-body');
  cont.append(cab, enunciado, cuerpo);

  function mostrar() {
    actual?.destroy();
    cuerpo.replaceChildren();
    const paso = pasos[i];
    cab.replaceChildren(...pasos.map((_, k) => h('span.seq-dot' + (k < i ? '.done' : k === i ? '.cur' : ''), String(k + 1))));
    enunciado.innerHTML = rich(paso.enunciado || '');
    actual = montarPuzle(cuerpo, paso, {
      ...ctx,
      completar: (r) => {
        fallos += r.fallos || 0;
        i++;
        if (i >= pasos.length) ctx.completar({ fallos });
        else mostrar();
      },
    });
  }
  mostrar();
  return { destroy: () => actual?.destroy() };
}
