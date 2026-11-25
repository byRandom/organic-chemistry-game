// Pruebas de evaluación: simulacros de las PEC dentro de la bitácora.
import { h, rich, ocultarToast } from './ui.js';
import { store } from './store.js';
import { cargarPruebas, cargarIndice } from './content.js';
import { montarPuzle } from '../puzzles/index.js';
import { prepararIntento, calificar, puntos } from './pruebas.js';

const fmtNota = (n) => n.toFixed(1).replace('.', ',');

export function pestanasBitacora(activa) {
  return h('nav.tabs', { 'aria-label': 'Secciones de la bitácora' },
    h('a.tab', { href: '#/bitacora', 'aria-current': activa === 'fichas' ? 'page' : null }, '📓 Fichas'),
    h('a.tab', { href: '#/pruebas', 'aria-current': activa === 'pruebas' ? 'page' : null }, '📝 Pruebas de evaluación'));
}

function topbar(titulo, back) {
  return h('header.topbar', h('a.back', { href: back, 'aria-label': 'Volver' }, '‹'), h('h1', titulo), h('span'));
}

export async function pantallaPruebas(root) {
  const pruebas = await cargarPruebas();
  const main = h('main.page',
    pestanasBitacora('pruebas'),
    h('p.lead', { html: rich('Simulacros de las **pruebas de evaluación continua**: las mismas clases de preguntas que la PEC, con otras moléculas y en otro orden en cada intento. Así practicas sin copiar la PEC real.') }));
  for (const p of pruebas) {
    const prog = store.prueba(p.id);
    const disp = p.disponible !== false;
    main.appendChild(h(disp ? 'a.sec' : 'div.sec', { href: disp ? `#/prueba/${p.id}` : null, class: (disp ? '' : 'locked') + (p.privada ? ' privada' : '') },
      h('div.sec-num', p.privada ? '🔓' : '📝'),
      h('div.sec-body',
        h('div.sec-name', p.titulo),
        h('div.sec-tema', p.subtitulo),
        h('div.sec-meta', disp
          ? (prog ? `Mejor nota: ${fmtNota(prog.mejor)} · ${prog.intentos} intento${prog.intentos > 1 ? 's' : ''}` : `${p.preguntas.length} preguntas · sin intentos todavía`)
          : `Disponible ${p.fase}`)),
      h('div.sec-state', disp ? '▸' : '🔒')));
  }
  root.append(topbar('Bitácora', '#/'), main);
}

export async function pantallaPrueba(root, id) {
  const prueba = (await cargarPruebas()).find((p) => p.id === id);
  if (!prueba || prueba.disponible === false) { location.hash = '#/pruebas'; return; }
  const indice = await cargarIndice();
  const main = h('main.level');
  root.append(topbar(prueba.titulo, '#/pruebas'), main);
  let actual = null;

  const portada = () => {
    const prog = store.prueba(id);
    main.replaceChildren(h('section.brief',
      h('h2', prueba.titulo + ' · ' + prueba.subtitulo),
      h('div', { html: rich(prueba.descripcion) }),
      prueba.ordenFijo ? null : h('ul.exam-list', prueba.preguntas.map((q) => h('li', `${q.titulo} (Tema ${q.tema})`))),
      prueba.ordenFijo ? h('p.small', `${prueba.preguntas.length} apartados, en el orden del enunciado.`) : null,
      prog ? h('p', { html: rich(`Mejor nota: **${fmtNota(prog.mejor)}** · última: ${fmtNota(prog.ultima)}`) }) : null,
      h('div.result-actions', h('button.btn.primary.big', { type: 'button', onclick: empezar }, prog ? 'Nuevo intento' : 'Empezar'))));
  };

  function empezar() {
    const items = prepararIntento(prueba);
    const resultados = [];
    let k = 0;
    const cab = h('div.exam-head');
    const brief = h('section.brief');
    const cuerpo = h('div.puzzle');
    const acciones = h('div.actions');
    main.replaceChildren(cab, brief, cuerpo, h('footer.level-foot', h('span'), acciones));
    const siguiente = () => {
      actual?.destroy?.();
      ocultarToast();
      if (k >= items.length) return final(items, resultados);
      const { pregunta, variante } = items[k];
      cab.replaceChildren(
        h('div.exam-progress', items.map((_, i) => h('span.seq-dot' + (i < k ? '.done' : i === k ? '.cur' : ''), String(i + 1)))),
        h('div.exam-title', `Pregunta ${k + 1} de ${items.length} · ${pregunta.titulo} · Tema ${pregunta.tema}`));
      brief.innerHTML = rich(variante.enunciado || '');
      cuerpo.replaceChildren();
      window.scrollTo(0, 0);
      const ctxPuzle = {
        setAcciones: (b) => acciones.replaceChildren(...b),
        completar: ({ fallos = 0 }) => {
          resultados.push({ id: pregunta.id, titulo: pregunta.titulo, tema: pregunta.tema, fallos });
          k++;
          siguiente();
        },
      };
      // atajo solo para las pruebas automáticas (no se activa en uso normal)
      if (localStorage.getItem('pk-dev')) window.__pkCompletar = ctxPuzle.completar;
      actual = montarPuzle(cuerpo, { id: `${id}-${pregunta.id}`, titulo: pregunta.titulo, ...variante }, ctxPuzle);
    };
    siguiente();
  }

  function final(items, resultados) {
    const { nota, porTema } = calificar(resultados);
    store.registrarPrueba(id, nota);
    const mundoDeTema = (t) => indice.mundos.find((m) => m.num === t);
    const flojos = Object.entries(porTema).filter(([, v]) => v.puntos / v.max < 0.75).map(([t]) => +t);
    const mensaje = nota >= 9 ? 'Excelente. Estás preparado.' : nota >= 7 ? 'Muy bien. Repasa los temas marcados y estarás listo.' : nota >= 5 ? 'Aprobado, pero hay temas que necesitan repaso.' : 'Todavía no. Vuelve a las secciones de la nave marcadas abajo.';
    main.replaceChildren(h('section.brief.result',
      h('div.exam-nota', fmtNota(nota)),
      h('h2', 'Nota del simulacro'),
      h('p', mensaje),
      h('table.exam-table',
        h('thead', h('tr', h('th', 'Pregunta'), h('th', 'Tema'), h('th', 'Puntos'))),
        h('tbody', resultados.map((r) => h('tr',
          h('td', r.titulo), h('td', String(r.tema)),
          h('td', puntos(r.fallos) === 1 ? '✔ 1' : puntos(r.fallos) === 0.5 ? '½' : '✘ 0'))))),
      flojos.length ? h('div.exam-repaso',
        h('h3', 'Para repasar'),
        h('ul', flojos.map((t) => {
          const m = mundoDeTema(t);
          return h('li', m ? h('a', { href: `#/mundo/${m.id}` }, `${m.seccion} · ${m.tema}`) : `Tema ${t}`);
        }))) : null,
      h('div.result-actions',
        h('a.btn', { href: '#/pruebas' }, 'Volver'),
        h('button.btn.primary', { type: 'button', onclick: empezar }, 'Otro intento'))));
    window.scrollTo(0, 0);
  }

  portada();
  return () => actual?.destroy?.();
}
