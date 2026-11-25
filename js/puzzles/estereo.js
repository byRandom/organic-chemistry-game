// Puzles de estereoquímica: centros quirales, R/S y paso a proyección de Fischer.
import { h, toast } from '../app/ui.js';
import { molFromSmiles } from '../chem/rdkit.js';
import { fischer } from '../chem/stereo.js';
import { molSVG } from '../render/svg.js';
import { fischerSVG } from '../render/proyecciones.js';
import { representar, NOMBRE_REPR } from '../render/depict.js';

/** Marca los centros quirales tocando los átomos. */
export function montarQuirales(cont, nivel, ctx) {
  const m = molFromSmiles(nivel.smiles.replace(/[@/\\]/g, ''));
  const verdad = new Set(m.centros);
  const marcados = new Set();
  let fallos = 0;
  const caja = h('div.q-mol.tapbox');
  const estado = h('div.ed-status', { 'aria-live': 'polite' });
  cont.append(caja, estado);
  const pintar = () => {
    const svg = molSVG(m, { scale: nivel.escala ?? 2, marcados: [...marcados], showCarbons: !!nivel.mostrarC });
    svg.classList.add('tap');
    svg.addEventListener('click', (e) => {
      const g = e.target.closest('[data-atom]');
      if (!g) return;
      const i = +g.dataset.atom;
      if (marcados.has(i)) marcados.delete(i); else marcados.add(i);
      pintar();
    });
    caja.replaceChildren(svg);
    estado.textContent = `Marcados: ${marcados.size}` + (nivel.mostrarTotal ? ` · hay ${verdad.size}` : '');
  };
  pintar();
  ctx.setAcciones([h('button.btn.primary', {
    type: 'button',
    onclick: () => {
      const sobran = [...marcados].filter((i) => !verdad.has(i));
      const faltan = [...verdad].filter((i) => !marcados.has(i));
      if (!sobran.length && !faltan.length) return ctx.completar({ fallos });
      fallos++;
      const partes = [];
      if (sobran.length) partes.push(`${sobran.length} de los marcados **no** es centro quiral (¿tiene dos sustituyentes iguales o un doble enlace?)`);
      if (faltan.length) partes.push(`te ${faltan.length === 1 ? 'falta 1 centro' : `faltan ${faltan.length} centros`}`);
      toast(partes.join(' y ') + '.', 'error', 4500);
    },
  }, '✓ Comprobar')]);
  return { destroy() {} };
}

const NOMBRE_CENTRO = {
  'cuña': (k, n) => (n > 1 ? `Centro ${k + 1}` : 'Centro quiral'),
  fischer: (k, n) => (n > 1 ? `Fila ${k + 1} (de arriba abajo)` : 'Centro quiral'),
  newman: (k) => (k === 0 ? 'Carbono delantero' : 'Carbono trasero'),
  caballete: (k) => (k === 0 ? 'Carbono delantero (abajo)' : 'Carbono trasero (arriba)'),
};

/** Asigna R o S a cada centro en la representación indicada. */
export function montarRS(cont, nivel, ctx) {
  const repr = nivel.repr || 'cuña';
  const r = representar({ ...nivel, repr, numerar: true }, { resaltar: [] });
  const cip = molFromSmiles(nivel.smiles).cip || {};
  const centros = r.centros.filter((c) => cip[c]);
  const elegido = {};
  let fallos = 0;
  cont.append(h('div.proj-box', r.svg));
  const filas = h('div.rs-rows');
  centros.forEach((c, k) => {
    const botones = ['R', 'S'].map((l) => h('button.rs-btn', {
      type: 'button', 'aria-pressed': 'false',
      onclick: () => {
        elegido[c] = l;
        botones.forEach((b) => b.setAttribute('aria-pressed', b.textContent === l ? 'true' : 'false'));
      },
    }, l));
    filas.appendChild(h('div.rs-row', h('span', NOMBRE_CENTRO[repr](k, centros.length)), h('span.rs-btns', botones)));
  });
  cont.appendChild(filas);
  ctx.setAcciones([h('button.btn.primary', {
    type: 'button',
    onclick: () => {
      if (centros.some((c) => !elegido[c])) return toast('Asigna R o S a todos los centros.', 'warn');
      const mal = centros.filter((c) => elegido[c] !== cip[c]);
      if (!mal.length) return ctx.completar({ fallos });
      fallos++;
      toast(mal.length === centros.length && centros.length > 1
        ? 'Todos están al revés. ¿Está el grupo de menor prioridad hacia el observador? Entonces hay que invertir.'
        : `${mal.length === 1 ? 'Hay un centro mal asignado' : `Hay ${mal.length} centros mal asignados`}. Revisa las prioridades CIP.`, 'error', 4500);
    },
  }, '✓ Comprobar')]);
  return { destroy() {} };
}

/** Pasa la molécula de otra representación a Fischer: hay que intercambiar los grupos horizontales que estén mal. */
export function montarAFischer(cont, nivel, ctx) {
  const verdad = fischer(nivel.smiles, { invertir: nivel.invertir });
  const origen = representar({ smiles: nivel.smiles, repr: nivel.desde || 'cuña', giro: nivel.giro, inicio: nivel.inicio, numerar: false });
  // estado inicial: algunas filas intercambiadas (al menos una)
  const swap = verdad.filas.map((_, i) => (nivel.semilla ?? 7) * (i + 3) % 3 === 0);
  if (!swap.some(Boolean)) swap[0] = true;
  const actual = () => ({ ...verdad, filas: verdad.filas.map((f, i) => (swap[i] ? { ...f, izq: f.der, der: f.izq } : f)) });
  let fallos = 0;
  const cajaF = h('div.proj-box');
  cont.append(
    h('div.repr-pair',
      h('figure', h('div.proj-box', origen.svg), h('figcaption', 'Original · ' + NOMBRE_REPR[nivel.desde || 'cuña'])),
      h('figure', cajaF, h('figcaption', 'Tu Fischer · toca un grupo horizontal para intercambiarlo'))),
  );
  const pintar = () => cajaF.replaceChildren(fischerSVG(actual(), { onTapGrupo: (i) => { swap[i] = !swap[i]; pintar(); } }));
  pintar();
  ctx.setAcciones([h('button.btn.primary', {
    type: 'button',
    onclick: () => {
      const mal = swap.filter(Boolean).length;
      if (!mal) return ctx.completar({ fallos });
      fallos++;
      toast(`${mal === 1 ? 'Una fila no coincide' : `${mal} filas no coinciden`} con la molécula original. Recuerda: en Fischer, los grupos horizontales salen **hacia ti**.`, 'error', 4500);
    },
  }, '✓ Comprobar')]);
  return { destroy() {} };
}
