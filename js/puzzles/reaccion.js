// Puzles con el motor de reacciones: producto mayoritario, esquemas A→B→C y síntesis por programa.
import { h, rich, toast, ocultarToast } from '../app/ui.js';
import { molFromSmiles, canonical } from '../chem/rdkit.js';
import { molSVG } from '../render/svg.js';
import { reaccionar, alternativas } from '../chem/reacciones.js';
import { reactivo, etiquetaReactivo } from '../chem/reactivos.js';

const MECANISMOS = ['SN1', 'SN2', 'E1', 'E2'];

/** Barajado determinista (mismo orden cada vez que se abre el nivel). */
function barajar(lista, semilla) {
  let s = [...String(semilla)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const out = [...lista];
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function dibujo(smiles, { racemico = null, escala = 1.5 } = {}) {
  const m = molFromSmiles(smiles);
  // sin indicarlo, se marca como racémico si tiene estereocentros sin configuración y alguno definido falta
  if (racemico == null) racemico = !!m && m.centros.length > 0 && Object.keys(m.cip || {}).length < m.centros.length;
  const box = h('div.mol-card', m ? molSVG(m, { scale: escala, minSize: 60 }) : h('code', smiles));
  if (racemico) box.appendChild(h('div.mol-tag', '(±) mezcla racémica'));
  return box;
}

export function cartaReactivo(id, extra = {}) {
  const r = reactivo(id);
  return h('span.reagent', { title: r.descripcion, ...extra }, h('strong', r.nombre), r.condiciones ? h('small', r.condiciones) : null);
}

function flecha(contenido) {
  return h('div.arrow', h('div.arrow-label', contenido), h('div.arrow-line', '⟶'));
}

const sinEstereo = (s) => canonical(s, { stereo: false });

/** Producto mayoritario (y mecanismo) de un sustrato con un reactivo. */
export function montarReaccion(cont, nivel, ctx) {
  const res = reaccionar(nivel.sustrato, nivel.reactivo);
  const pedirMec = nivel.pedirMecanismo !== false;
  let fallos = 0;
  cont.appendChild(h('div.scheme', dibujo(nivel.sustrato), flecha(cartaReactivo(nivel.reactivo)), h('div.mol-card.unknown', '?')));
  const zona = h('div.rx-zone');
  cont.appendChild(zona);

  const pasoMecanismo = () => {
    zona.replaceChildren(h('p.rx-q', { html: rich('¿Por qué **mecanismo** transcurre principalmente?') }));
    const opciones = [...MECANISMOS, 'No reacciona'];
    const correcta = res.ok ? res.mecanismo : 'No reacciona';
    const fila = h('div.mech-row');
    for (const o of opciones) {
      const b = h('button.mech-btn', { type: 'button' }, o);
      b.addEventListener('click', () => {
        if (o === correcta) {
          b.classList.add('ok');
          if (!res.ok) return fin();
          setTimeout(pasoProducto, 350);
        } else {
          fallos++;
          b.classList.add('bad');
          b.disabled = true;
          toast(o === 'No reacciona' ? 'Sí que reacciona. Fíjate en el sustrato y en el reactivo.' : 'No. Mira el tipo de halogenuro (1°, 2°, 3°) y si el reactivo es buen nucleófilo, base fuerte o base débil.', 'error', 4000);
        }
      });
      fila.appendChild(b);
    }
    zona.appendChild(fila);
    ctx.setAcciones([]);
  };

  const pasoProducto = () => {
    const mayores = res.productos.filter((p) => p.papel !== 'minoritario');
    const correcto = mayores[0];
    const distract = new Set();
    for (const p of res.productos) if (p.papel === 'minoritario') distract.add(p.smiles);
    for (const s of alternativas(nivel.sustrato, nivel.reactivo)) distract.add(s);
    for (const m of mayores) distract.delete(m.smiles);
    // el racémico se dibuja sin estereo: no ofrecer como distractor un enantiómero puro de la misma molécula si la respuesta es racémica
    const lista = [...distract].filter((s) => !(correcto.racemico && sinEstereo(s) === sinEstereo(correcto.smiles) && s !== correcto.smiles && !/[/\\]/.test(s))).slice(0, 3);
    const opciones = barajar([{ smiles: correcto.smiles, ok: true, racemico: correcto.racemico }, ...lista.map((s) => ({ smiles: s, ok: false, racemico: null }))], nivel.id || nivel.sustrato);
    zona.replaceChildren(h('p.rx-q', { html: rich('¿Cuál es el **producto mayoritario**?') }));
    const grid = h('div.q-opts.q-opts-mol');
    for (const o of opciones) {
      const b = h('button.q-opt', { type: 'button' }, dibujo(o.smiles, { racemico: o.racemico, escala: 1.2 }));
      b.addEventListener('click', () => {
        if (o.ok) { b.classList.add('ok'); grid.querySelectorAll('button').forEach((x) => { x.disabled = true; }); fin(); }
        else {
          fallos++;
          b.classList.add('bad');
          b.disabled = true;
          const menor = res.productos.find((p) => p.smiles === o.smiles);
          toast(menor ? 'Ese producto se forma, pero es **minoritario**.' : 'Ese no es el producto mayoritario. Revisa la regioquímica, la estereoquímica o si hay transposición.', 'error', 4200);
        }
      });
      grid.appendChild(b);
    }
    zona.appendChild(grid);
  };

  const fin = () => {
    ocultarToast();
    const menores = res.ok ? res.productos.filter((p) => p.papel === 'minoritario') : [];
    const expl = h('div.q-expl.ok', { html: '<strong>¡Correcto!</strong> ' + rich(res.ok ? res.razon : res.mensaje) });
    if (res.transposicion) expl.insertAdjacentHTML('beforeend', rich(`Antes de que entre el nucleófilo, el carbocatión se **transpone** (desplazamiento 1,2 de ${res.transposicion === 'hidruro' ? 'hidruro' : 'un grupo ' + res.transposicion}) a otro más estable.`));
    if (res.productos?.[0]?.racemico) expl.insertAdjacentHTML('beforeend', rich('El nucleófilo ataca al carbocatión **plano** por las dos caras: se forma una **mezcla racémica**.'));
    if (res.ok && res.mecanismo === 'SN2' && /@/.test(nivel.sustrato)) expl.insertAdjacentHTML('beforeend', rich('La SN2 ocurre con **inversión de la configuración**: el nucleófilo entra por el lado opuesto al grupo saliente.'));
    zona.appendChild(expl);
    if (menores.length) zona.appendChild(h('div.minor', h('div.minor-t', 'Productos minoritarios:'), h('div.minor-list', menores.map((p) => dibujo(p.smiles, { escala: 1 })))));
    ctx.setAcciones([h('button.btn.primary', { type: 'button', onclick: () => ctx.completar({ fallos }) }, 'Continuar ▸')]);
  };

  if (pedirMec) pasoMecanismo();
  else if (res.ok) pasoProducto();
  else pasoMecanismo();
  return { destroy() {} };
}

/** Ejecuta una lista de reactivos sobre una molécula; devuelve los pasos con su resultado. */
export function ejecutarPrograma(partida, programa) {
  const pasos = [];
  let actual = partida;
  for (const id of programa) {
    const res = reaccionar(actual, id);
    if (!res.ok) { pasos.push({ id, ok: false, res }); break; }
    const mayores = res.productos.filter((p) => p.papel !== 'minoritario');
    const distintos = new Set(mayores.map((p) => sinEstereo(p.smiles)));
    const p = mayores[0];
    pasos.push({ id, ok: true, res, producto: p.smiles, mezcla: distintos.size > 1, racemico: p.racemico });
    actual = p.smiles;
  }
  return { pasos, final: pasos.length && pasos[pasos.length - 1].ok ? pasos[pasos.length - 1].producto : null };
}

/** ¿El producto obtenido coincide con el objetivo? Si el objetivo tiene estereo, también la exige. */
export function coincide(obtenido, objetivo) {
  if (!obtenido) return false;
  const conEstereo = /[@/\\]/.test(objetivo);
  return conEstereo ? canonical(obtenido) === canonical(objetivo) : sinEstereo(obtenido) === sinEstereo(objetivo);
}

/** Síntesis: monta un programa de reactivos que convierta la partida en el objetivo. */
export function montarSintesis(cont, nivel, ctx) {
  const programa = [];
  const max = nivel.maxPasos || 4;
  let fallos = 0;
  cont.appendChild(h('div.synth-goal',
    h('figure', dibujo(nivel.partida), h('figcaption', 'Partida')),
    h('div.goal-arrow', '⟹'),
    h('figure', dibujo(nivel.objetivo), h('figcaption', 'Objetivo'))));
  const prog = h('ol.program', { 'aria-label': 'Programa de síntesis' });
  const caja = h('div.toolbox');
  const traza = h('div.trace', { 'aria-live': 'polite' });
  cont.append(h('div.prog-head', h('span', 'Programa'), h('small', `máx. ${max} pasos · óptimo ${nivel.optimo ?? '?'}`)), prog, h('div.prog-head', h('span', 'Reactivos disponibles')), caja, traza);

  const pintarPrograma = () => {
    prog.replaceChildren(...programa.map((id, i) => h('li.slot-step', h('span.step-n', String(i + 1)), cartaReactivo(id),
      h('button.step-del', { type: 'button', 'aria-label': 'Quitar paso', onclick: () => { programa.splice(i, 1); pintarPrograma(); } }, '✕'))));
    if (!programa.length) prog.appendChild(h('li.slot-empty', 'Toca un reactivo para añadirlo al programa'));
  };
  for (const id of nivel.reactivos) {
    caja.appendChild(h('button.reagent-btn', {
      type: 'button',
      onclick: () => {
        if (programa.length >= max) return toast(`Como máximo ${max} pasos.`, 'warn');
        programa.push(id);
        pintarPrograma();
        traza.replaceChildren();
      },
    }, cartaReactivo(id)));
  }
  pintarPrograma();

  ctx.setAcciones([h('button.btn.primary', {
    type: 'button',
    onclick: async () => {
      if (!programa.length) return toast('Añade al menos un reactivo al programa.', 'warn');
      traza.replaceChildren(h('div.trace-start', dibujo(nivel.partida, { escala: 1 })));
      const { pasos, final } = ejecutarPrograma(nivel.partida, programa);
      for (const p of pasos) {
        await new Promise((r) => setTimeout(r, 380));
        const r = reactivo(p.id);
        const fila = h('div.trace-step' + (p.ok ? '' : '.fail'), flecha(h('span', etiquetaReactivo(r))));
        if (p.ok) {
          fila.appendChild(dibujo(p.producto, { racemico: p.racemico, escala: 1 }));
          fila.appendChild(h('div.trace-note', { html: rich(`**${p.res.mecanismo}**` + (p.res.transposicion ? ' · con transposición' : '') + (p.mezcla ? ' · ⚠ mezcla de productos' : '')) }));
        } else fila.appendChild(h('div.trace-note', { html: rich('✗ ' + p.res.mensaje) }));
        traza.appendChild(fila);
      }
      if (coincide(final, nivel.objetivo)) {
        const extra = nivel.optimo && programa.length > nivel.optimo ? 1 : 0;
        if (extra) toast(`¡Lo has conseguido! Pero se puede hacer en ${nivel.optimo} paso${nivel.optimo > 1 ? 's' : ''}.`, 'ok', 4000);
        setTimeout(() => ctx.completar({ fallos: fallos + extra }), 700);
      } else {
        fallos++;
        const estereo = final && !coincide(final, nivel.objetivo) && sinEstereo(final) === sinEstereo(nivel.objetivo);
        toast(estereo ? 'Casi: tienes la molécula correcta, pero con **otra configuración**. Revisa la estereoquímica de cada paso.' : 'El programa no llega al objetivo. Revisa la traza paso a paso.', 'error', 4500);
      }
    },
  }, '▶ Ejecutar')]);
  return { destroy() {} };
}

/**
 * Esquema A → B → C: cada eslabón es una molécula conocida o una incógnita, y cada flecha
 * un reactivo conocido o una incógnita. Se resuelven de izquierda a derecha.
 * nivel.cadena: [{smiles} | {letra}], nivel.flechas: [{reactivo} | {letra}], nivel.reactivos (para elegir).
 */
export function montarEsquema(cont, nivel, ctx) {
  const cadena = nivel.cadena.map((c) => ({ ...c }));
  const flechas = nivel.flechas.map((f) => ({ ...f }));
  // las moléculas incógnita se calculan con el motor (para validar y para mostrar al resolver)
  for (let i = 1; i < cadena.length; i++) {
    if (!cadena[i].smiles && flechas[i - 1].reactivo) {
      const r = reaccionar(cadena[i - 1].smiles, flechas[i - 1].reactivo);
      cadena[i].real = r.ok ? r.productos.find((p) => p.papel !== 'minoritario').smiles : null;
      cadena[i].res = r;
    }
    cadena[i].smiles = cadena[i].smiles || null;
    if (!cadena[i].real) cadena[i].real = cadena[i].smiles;
  }
  let fallos = 0;
  const vista = h('div.scheme.scroll');
  const zona = h('div.rx-zone');
  cont.append(vista, zona);

  const pintar = () => {
    const items = [];
    cadena.forEach((c, i) => {
      if (i > 0) {
        const f = flechas[i - 1];
        items.push(flecha(f.reactivo ? cartaReactivo(f.reactivo) : h('span.letter', f.letra)));
      }
      items.push(c.resuelto || c.smiles ? dibujo(c.resuelto || c.smiles, { escala: 1.35 }) : h('div.mol-card.unknown', h('span.letter', c.letra)));
    });
    vista.replaceChildren(...items);
  };

  const siguiente = () => {
    pintar();
    const iMol = cadena.findIndex((c, i) => i > 0 && !c.smiles && !c.resuelto && flechas[i - 1].reactivo);
    const iFle = flechas.findIndex((f) => !f.reactivo && !f.resuelto);
    const candidatos = [];
    if (iMol >= 0) candidatos.push({ tipo: 'mol', i: iMol });
    if (iFle >= 0) candidatos.push({ tipo: 'flecha', i: iFle + 1 });
    candidatos.sort((a, b) => a.i - b.i);
    const sig = candidatos[0];
    if (!sig) {
      ocultarToast();
      zona.replaceChildren(h('div.q-expl.ok', { html: rich('**¡Esquema completo!**') }));
      ctx.setAcciones([h('button.btn.primary', { type: 'button', onclick: () => ctx.completar({ fallos }) }, 'Continuar ▸')]);
      return;
    }
    ctx.setAcciones([]);
    if (sig.tipo === 'mol') {
      const c = cadena[sig.i];
      const prev = cadena[sig.i - 1].resuelto || cadena[sig.i - 1].smiles;
      const idR = flechas[sig.i - 1].reactivo;
      const res = reaccionar(prev, idR);
      const correcta = res.productos.find((p) => p.papel !== 'minoritario');
      const distract = new Set(alternativas(prev, idR));
      res.productos.forEach((p) => distract.add(p.smiles));
      res.productos.filter((p) => p.papel !== 'minoritario').forEach((p) => distract.delete(p.smiles));
      const ops = barajar([{ s: correcta.smiles, ok: true, rac: correcta.racemico }, ...[...distract].slice(0, 3).map((s) => ({ s, ok: false }))], (nivel.id || '') + sig.i);
      zona.replaceChildren(h('p.rx-q', { html: rich(`¿Qué es **${c.letra}**?`) }));
      const grid = h('div.q-opts.q-opts-mol');
      for (const o of ops) {
        const b = h('button.q-opt', { type: 'button' }, dibujo(o.s, { racemico: o.rac, escala: 1.1 }));
        b.addEventListener('click', () => {
          if (o.ok) { c.resuelto = o.s; toast(res.razon, 'ok', 4000); siguiente(); }
          else { fallos++; b.classList.add('bad'); b.disabled = true; toast('No. Piensa qué mecanismo domina con ese reactivo.', 'error'); }
        });
        grid.appendChild(b);
      }
      zona.appendChild(grid);
    } else {
      const f = flechas[sig.i - 1];
      const prev = cadena[sig.i - 1].resuelto || cadena[sig.i - 1].smiles;
      const objetivo = cadena[sig.i].smiles || cadena[sig.i].resuelto;
      zona.replaceChildren(h('p.rx-q', { html: rich(`¿Qué reactivo es **${f.letra}**?`) }));
      const grid = h('div.reagent-grid');
      for (const id of nivel.reactivos) {
        const b = h('button.reagent-btn', { type: 'button' }, cartaReactivo(id));
        b.addEventListener('click', () => {
          const r = reaccionar(prev, id);
          const p = r.ok ? r.productos.find((x) => x.papel !== 'minoritario') : null;
          if (p && coincide(p.smiles, objetivo)) { f.resuelto = id; f.reactivo = id; siguiente(); }
          else { fallos++; b.classList.add('bad'); b.disabled = true; toast(p ? 'Con ese reactivo se obtiene otra cosa como producto mayoritario.' : 'Con ese reactivo no hay reacción.', 'error'); }
        });
        grid.appendChild(b);
      }
      zona.appendChild(grid);
    }
  };
  siguiente();
  return { destroy() {} };
}
