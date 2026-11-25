// Puzles de análisis conformacional: Newman (girar el carbono trasero) y sillas de ciclohexano.
import { h, toast } from '../app/ui.js';
import { el } from '../render/svg.js';
import { newmanSVG, sillaSVG, geometriaSilla } from '../render/proyecciones.js';
import { energiaNewman, disposicionNewman, perfilNewman, analizarSilla, girarSilla, valorA, DEL_LIBRO } from '../chem/conformacion.js';

const fmt = (x) => x.toFixed(1).replace('.', ',');

/** Diagrama de energía potencial frente al ángulo de giro, con un marcador en el giro actual. */
function diagrama(perfil, giro, mostrarValores) {
  const W = 300, H = 120, pad = 22;
  const maxE = Math.max(...perfil.map((p) => p.e), 1);
  const X = (g) => pad + (g / 360) * (W - 2 * pad);
  const Y = (e) => H - pad - (e / maxE) * (H - 2 * pad);
  const svg = el('svg', { class: 'ediag', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Diagrama de energía' });
  el('line', { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, class: 'axis' }, svg);
  el('line', { x1: pad, y1: pad / 2, x2: pad, y2: H - pad, class: 'axis' }, svg);
  const pts = [...perfil, { giro: 360, e: perfil[0].e }];
  let d = '';
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1];
    for (let s = 0; s <= 12; s++) {
      const u = s / 12;
      const e = a.e + (b.e - a.e) * (1 - Math.cos(Math.PI * u)) / 2; // perfil suave, pendiente nula en los extremos
      d += (d ? ' L ' : 'M ') + X(a.giro + 60 * u).toFixed(1) + ' ' + Y(e).toFixed(1);
    }
  }
  el('path', { d, class: 'curve' }, svg);
  const cur = perfil.find((p) => p.giro === ((giro % 360) + 360) % 360);
  if (cur) el('circle', { cx: X(cur.giro), cy: Y(cur.e), r: 5, class: 'marker' }, svg);
  for (const g of [0, 60, 120, 180, 240, 300, 360]) {
    const t = el('text', { x: X(g), y: H - 6, class: 'tick', 'text-anchor': 'middle' }, svg);
    t.textContent = g + '°';
  }
  const t = el('text', { x: 4, y: 12, class: 'tick' }, svg);
  t.textContent = mostrarValores ? 'E (kcal/mol)' : 'E';
  return svg;
}

/**
 * Newman: delante y detrás son 3 grupos cada uno; el jugador gira el carbono trasero de 60 en 60°.
 * objetivo: {tipo: 'min'|'max'} o {tipo: 'angulo', grupos: [a, b], angulo: 0|60|180}
 */
export function montarNewman(cont, nivel, ctx) {
  const obj = nivel.objetivo || { tipo: 'min' };
  let giro = nivel.giroInicial ?? 60;
  let fallos = 0;
  const perfil = perfilNewman(nivel.delante, nivel.detras);
  const energias = perfil.map((p) => p.e);
  const caja = h('div.proj-box.newman-box');
  const info = h('div.ed-status', { 'aria-live': 'polite' });
  const diag = h('div.diag-box');
  const girar = (d) => { giro = (giro + d + 360) % 360; pintar(); };
  cont.append(
    caja,
    h('div.rot-ctrl',
      h('button.btn', { type: 'button', onclick: () => girar(-60), 'aria-label': 'Girar el carbono trasero −60°' }, '⟲ −60°'),
      h('span.rot-label', 'Girar carbono trasero'),
      h('button.btn', { type: 'button', onclick: () => girar(60), 'aria-label': 'Girar el carbono trasero +60°' }, '+60° ⟳')),
    info, diag,
  );
  function pintar() {
    const d = disposicionNewman(nivel.delante, nivel.detras, giro);
    caja.replaceChildren(newmanSVG(d));
    const e = energiaNewman(d.delante, d.detras);
    const tipo = giro % 120 === 0 ? 'eclipsada' : 'alternada';
    info.innerHTML = `Ángulo de giro: <strong>${giro}°</strong> · conformación <strong>${tipo}</strong>` +
      (nivel.mostrarEnergia !== false ? ` · E ≈ <strong>${fmt(e)}</strong> kcal/mol` : '');
    diag.replaceChildren(nivel.mostrarDiagrama !== false ? diagrama(perfil, giro, nivel.mostrarEnergia !== false) : '');
  }
  pintar();
  ctx.setAcciones([h('button.btn.primary', {
    type: 'button',
    onclick: () => {
      const d = disposicionNewman(nivel.delante, nivel.detras, giro);
      const e = energiaNewman(d.delante, d.detras);
      let ok = false, msg = '';
      if (obj.tipo === 'min') { ok = e === Math.min(...energias); msg = 'Hay otra conformación con menos energía. Busca la que aleja más los grupos grandes.'; }
      else if (obj.tipo === 'max') { ok = e === Math.max(...energias); msg = 'Hay otra conformación con más energía. ¿Qué pasa si eclipsas los dos grupos más grandes?'; }
      else if (obj.tipo === 'angulo') {
        const [a, b] = obj.grupos;
        const fa = d.delante.find((x) => x.texto === a), fb = d.detras.find((x) => x.texto === b);
        const dd = Math.abs((((fa.ang - fb.ang) % 360) + 360) % 360);
        ok = Math.min(dd, 360 - dd) === obj.angulo;
        msg = `El ángulo diedro entre ${a} y ${b} debe ser de ${obj.angulo}°.`;
      }
      if (ok) ctx.completar({ fallos });
      else { fallos++; toast(msg, 'error', 4200); }
    },
  }, '✓ Comprobar')]);
  return { destroy() {} };
}

/**
 * Silla: colocar sustituyentes (axial/ecuatorial) en los carbonos indicados, con relación cis/trans
 * y, si se pide, en la silla más estable.
 * nivel.sustituyentes: [{carbono: 0-5, texto}], nivel.relacion: 'cis'|'trans' (entre los dos primeros),
 * nivel.objetivo: 'estable' | 'inestable' | 'cualquiera'
 */
export function montarSilla(cont, nivel, ctx) {
  let pliegue = 1;
  let subs = nivel.sustituyentes.map((s) => ({ ...s, pos: null }));
  let fallos = 0;
  const caja = h('div.proj-box');
  const info = h('div.ed-status', { 'aria-live': 'polite' });
  cont.append(caja,
    h('div.rot-ctrl',
      h('button.btn', {
        type: 'button',
        onclick: () => {
          // al girar, cada sustituyente conserva su cara y pasa de axial a ecuatorial (o al revés)
          pliegue = -pliegue;
          subs = subs.map((s) => (s.pos ? { ...s, pos: s.pos === 'ax' ? 'eq' : 'ax' } : s));
          pintar();
        },
      }, '↻ Girar la silla')),
    info);
  const geo = () => geometriaSilla(pliegue);
  function pintar() {
    const mapa = {};
    subs.forEach((s) => { if (s.pos) mapa[s.carbono] = { texto: s.texto, pos: s.pos }; });
    caja.replaceChildren(sillaSVG(mapa, {
      pliegue, numeros: true, editables: subs.map((s) => s.carbono),
      onTapPos: (c, pos) => { subs = subs.map((s) => (s.carbono === c ? { ...s, pos } : s)); pintar(); },
    }));
    const colocados = subs.filter((s) => s.pos);
    if (colocados.length === subs.length) {
      const { energia, arriba } = analizarSilla(subs, geo().map((g) => g.axArriba));
      const rel = subs.length >= 2 ? (arriba[0] === arriba[1] ? 'cis' : 'trans') : null;
      info.innerHTML = (rel ? `Isómero dibujado: <strong>${rel}</strong> · ` : '') +
        `sustituyentes axiales: <strong>${subs.filter((s) => s.pos === 'ax').map((s) => s.texto).join(', ') || 'ninguno'}</strong>` +
        (nivel.mostrarEnergia ? ` · tensión ≈ <strong>${fmt(energia)}</strong> kcal/mol` : '');
    } else info.textContent = 'Toca un círculo (posición axial o ecuatorial) en cada carbono marcado.';
  }
  pintar();
  ctx.setAcciones([h('button.btn.primary', {
    type: 'button',
    onclick: () => {
      if (subs.some((s) => !s.pos)) return toast('Coloca todos los sustituyentes.', 'warn');
      const ax = geo().map((g) => g.axArriba);
      const { energia, arriba } = analizarSilla(subs, ax);
      if (nivel.relacion && subs.length >= 2) {
        const rel = arriba[0] === arriba[1] ? 'cis' : 'trans';
        if (rel !== nivel.relacion) {
          fallos++;
          return toast(`Has dibujado el isómero **${rel}** y se pide el **${nivel.relacion}**. Cis = los dos sustituyentes en la misma cara (los dos hacia arriba o los dos hacia abajo).`, 'error', 5000);
        }
      }
      const otra = analizarSilla(girarSilla(subs), ax.map((x) => !x)).energia;
      const obj = nivel.objetivo || 'estable';
      if (obj === 'estable' && energia > otra + 1e-9) {
        fallos++;
        return toast('Es el isómero correcto, pero **no** la silla más estable. Gira la silla: ¿qué sustituyente prefiere estar ecuatorial?', 'error', 5000);
      }
      if (obj === 'inestable' && energia < otra - 1e-9) {
        fallos++;
        return toast('Esa es la silla más estable; se pide la otra.', 'error');
      }
      ctx.completar({ fallos });
    },
  }, '✓ Comprobar')]);
  return { destroy() {} };
}

export function textoValoresA(subs) {
  return subs.map((s) => `${s.texto}: ${String(valorA(s.texto)).replace('.', ',')} kcal/mol${DEL_LIBRO.has(s.texto) ? '' : ' (aprox.)'}`).join(' · ');
}
