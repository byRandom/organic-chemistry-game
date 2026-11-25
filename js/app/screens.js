// Pantallas de la app.
import { h, rich, toast, modal } from './ui.js';
import { store } from './store.js';
import { dialogo, AVATAR_SVG } from './dialog.js';
import {
  cargarIndice, cargarMundo, nivelDisponible, nivelCompletado, mundoDisponible,
  mundoCompletado, estrellasMundo, todasLasFichas,
} from './content.js';
import { montarPuzle } from '../puzzles/index.js';
import { calcularEstrellas } from '../puzzles/validate.js';
import { MolEditor } from '../editor/editor.js';
import { crearToolbar } from '../editor/toolbar.js';
import { formula, prettyFormula, toSmiles } from '../chem/mol.js';
import { canonical } from '../chem/rdkit.js';
import { go } from './router.js';
import { installState, promptInstall } from './pwa.js';

const estrellas = (n, total = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, total - n));

function topbar(titulo, back = '#/mapa', extra = null) {
  return h('header.topbar',
    back ? h('a.back', { href: back, 'aria-label': 'Volver' }, '‹') : h('span'),
    h('h1', titulo),
    extra || h('span'));
}

// ---------- Inicio ----------
export async function pantallaInicio(root) {
  const empezado = Object.keys(store.get().niveles).length > 0;
  const install = h('button.btn.ghost', { type: 'button', hidden: !installState().canPrompt, onclick: promptInstall }, '📲 Instalar en el dispositivo');
  root.append(h('main.home',
    h('div.home-logo', { html: AVATAR_SVG }),
    h('h1.home-title', 'Protocolo Kekulé'),
    h('p.home-sub', 'Química Orgánica I · reaprende la química desde el átomo de carbono'),
    h('div.home-actions',
      h('button.btn.primary.big', {
        type: 'button',
        onclick: async () => {
          await dialogo(PROLOGO, { id: 'prologo' });
          go('#/mapa');
        },
      }, empezado ? 'Continuar' : 'Despertar'),
      h('a.btn', { href: '#/bitacora' }, '📓 Bitácora'),
      h('a.btn', { href: '#/laboratorio' }, '🧪 Laboratorio libre'),
      h('a.btn', { href: '#/ajustes' }, '⚙ Ajustes'),
      install),
    h('p.home-foot', 'Basado en el programa de Química Orgánica I (UNED, 6103205). Proyecto de estudio no oficial.')));
  document.addEventListener('pk-install-available', () => { install.hidden = false; }, { once: true });
}

const PROLOGO = [
  { quien: 'sistema', texto: 'NAVE COLONIA *OUROBOROS* · AÑO 2412 · CICLO DE CRIOSUEÑO INTERRUMPIDO' },
  { texto: 'Ah. Estás despierta. O despierto. Mis sensores de criosueño no distinguen bien entre humanos todavía recién descongelados.' },
  { texto: 'Soy **K.E.K.U.L.É.**, la IA de esta nave. *Kernel Experimental de Química Universal y Lógica Estructural.* Sí, el acrónimo lo elegí yo.' },
  { texto: 'Malas noticias: una tormenta solar ha borrado mi **módulo de química orgánica**. Sin él, las biofábricas no pueden sintetizar combustible, medicinas ni refrigerante para el reactor.' },
  { texto: 'Buenas noticias: según tu expediente, estudiaste química orgánica. Vamos a reconstruir mi módulo juntos, desde el átomo de carbono.' },
  { texto: 'Cada sección de la nave que recuperemos será una prueba. Yo no me fío de nadie que no haya pasado mis pruebas. Ni siquiera de mí.' },
];

// ---------- Mapa de la nave ----------
export async function pantallaMapa(root) {
  const idx = await cargarIndice();
  const lista = h('ol.ship');
  root.append(topbar('Nave Ouroboros', '#/'), h('main.page', h('p.lead', 'Recupera cada sección de la nave superando sus pruebas. Cada sección es un tema del programa.'), lista));
  for (let i = 0; i < idx.mundos.length; i++) {
    const meta = idx.mundos[i];
    const disp = await mundoDisponible(idx, i);
    const mundo = meta.archivo ? await cargarMundo(meta.id) : null;
    const hecho = mundo && mundoCompletado(mundo);
    const total = (mundo?.niveles?.length || 0) * 3;
    const card = h(disp ? 'a.sec' : 'div.sec', {
      href: disp ? `#/mundo/${meta.id}` : null,
      class: (hecho ? 'done ' : '') + (disp ? '' : 'locked'),
      'aria-disabled': disp ? null : 'true',
    },
    h('div.sec-num', meta.num === '★' ? '★' : String(meta.num)),
    h('div.sec-body',
      h('div.sec-name', meta.seccion),
      h('div.sec-tema', meta.tema),
      h('div.sec-meta', meta.archivo
        ? (disp ? (total ? `★ ${estrellasMundo(mundo)} / ${total}` : '') : '🔒 Supera la sección anterior')
        : `Próximamente · ${meta.fase}`)),
    h('div.sec-state', hecho ? '✔' : disp ? '▸' : '🔒'));
    lista.appendChild(h('li', card));
  }
}

// ---------- Mundo ----------
export async function pantallaMundo(root, id) {
  const mundo = await cargarMundo(id);
  if (!mundo) return go('#/mapa');
  const lista = h('ol.levels');
  root.append(topbar(mundo.seccion, '#/mapa'),
    h('main.page',
      h('div.world-head', h('div.world-tema', mundo.tema), h('p', { html: rich(mundo.descripcion) })),
      lista));
  mundo.niveles.forEach((n, i) => {
    const disp = nivelDisponible(mundo, i);
    const prog = store.nivel(n.id);
    const jefe = n.jefe;
    lista.appendChild(h('li', h(disp ? 'a.lvl' : 'div.lvl', {
      href: disp ? `#/nivel/${mundo.id}/${n.id}` : null,
      class: (jefe ? 'boss ' : '') + (prog ? 'done ' : '') + (disp ? '' : 'locked'),
    },
    h('span.lvl-num', jefe ? '☠' : String(i + 1)),
    h('span.lvl-body', h('span.lvl-title', n.titulo), h('span.lvl-type', TIPO_NOMBRE[n.tipo] || n.tipo)),
    h('span.lvl-stars', prog ? estrellas(prog.estrellas) : disp ? '' : '🔒'))));
  });
  await dialogo(mundo.intro, { id: 'intro-' + mundo.id });
}

const TIPO_NOMBRE = {
  construir: '🧱 Construir', descubrir: '🔍 Descubrir', isomeros: '🧩 Caza de isómeros',
  test: '✅ Razonar', secuencia: '☠ Jefe',
};

// ---------- Nivel ----------
export async function pantallaNivel(root, mundoId, nivelId) {
  const mundo = await cargarMundo(mundoId);
  const i = mundo?.niveles.findIndex((n) => n.id === nivelId) ?? -1;
  if (i < 0) return go('#/mapa');
  if (!nivelDisponible(mundo, i)) return go(`#/mundo/${mundoId}`);
  const nivel = mundo.niveles[i];
  let pistasUsadas = 0;

  const acciones = h('div.actions');
  const pistaBox = h('div.hint', { hidden: true, 'aria-live': 'polite' });
  const pistas = nivel.pistas || [];
  const btnPista = h('button.btn.ghost', {
    type: 'button',
    hidden: !pistas.length,
    onclick: () => {
      if (pistasUsadas < pistas.length) pistasUsadas++;
      pistaBox.hidden = false;
      pistaBox.innerHTML = pistas.slice(0, pistasUsadas).map((p, k) => `<p><strong>Pista ${k + 1}:</strong> ${rich(p).replace(/^<p>|<\/p>$/g, '')}</p>`).join('');
      btnPista.textContent = pistasUsadas < pistas.length ? `💡 Otra pista (${pistas.length - pistasUsadas})` : '💡 Sin más pistas';
    },
  }, `💡 Pista (${pistas.length})`);

  const cuerpo = h('div.puzzle');
  root.append(
    topbar(nivel.titulo, `#/mundo/${mundoId}`, h('span.topbar-sub', TIPO_NOMBRE[nivel.tipo] || '')),
    h('main.level',
      h('section.brief', h('div.brief-text', { html: rich(nivel.enunciado) }), pistaBox),
      cuerpo,
      h('footer.level-foot', btnPista, acciones)));

  await dialogo(nivel.dialogo, { id: 'dlg-' + nivel.id });

  const ctx = {
    setAcciones: (btns) => acciones.replaceChildren(...btns),
    completar: async ({ fallos = 0 }) => {
      const n = calcularEstrellas({ fallos, pistas: pistasUsadas });
      if (nivel.dialogoFinal) await dialogo(nivel.dialogoFinal, { id: 'fin-' + nivel.id });
      store.completarNivel(nivel.id, n);
      const nueva = nivel.ficha ? store.desbloquearFicha(nivel.ficha) : false;
      const ficha = nivel.ficha ? mundo.fichas?.[nivel.ficha] : null;
      const siguiente = mundo.niveles[i + 1];
      const close = modal(h('div.result',
        h('div.result-stars', { 'aria-label': `${n} estrellas de 3` }, estrellas(n)),
        h('h2', nivel.jefe ? '¡Sección recuperada!' : '¡Prueba superada!'),
        nivel.exito ? h('div.result-text', { html: rich(nivel.exito) }) : null,
        ficha ? h('div.ficha-unlock',
          h('div.ficha-tag', nueva ? '📓 Nueva entrada en la bitácora' : '📓 Bitácora'),
          h('h3', ficha.titulo),
          h('div.ficha-body', { html: rich(ficha.texto) })) : null,
        h('div.result-actions',
          h('button.btn', { type: 'button', onclick: () => { close(); go(`#/mundo/${mundoId}`); } }, 'Volver'),
          siguiente
            ? h('button.btn.primary', { type: 'button', onclick: () => { close(); go(`#/nivel/${mundoId}/${siguiente.id}`); } }, 'Siguiente ▸')
            : h('button.btn.primary', { type: 'button', onclick: () => { close(); go('#/mapa'); } }, 'Al mapa ▸'))));
      if (nivel.jefe && mundo.outro) await dialogo(mundo.outro, { id: 'outro-' + mundo.id });
    },
  };
  const puzzle = montarPuzle(cuerpo, nivel, ctx);
  return () => puzzle.destroy();
}

// ---------- Bitácora ----------
export async function pantallaBitacora(root) {
  const fichas = await todasLasFichas();
  const main = h('main.page');
  root.append(topbar('Bitácora', '#/'), main);
  main.appendChild(h('p.lead', 'Todo lo que K.E.K.U.L.É. ha recordado gracias a ti. Es tu resumen de estudio.'));
  let mundoActual = null;
  for (const f of fichas) {
    if (f.mundo.id !== mundoActual) {
      mundoActual = f.mundo.id;
      main.appendChild(h('h2.bit-world', `${f.mundo.seccion} · ${f.mundo.tema}`));
    }
    const ok = store.tieneFicha(f.id) || store.ajuste('modoEstudio');
    main.appendChild(ok
      ? h('details.ficha', h('summary', f.titulo), h('div.ficha-body', { html: rich(f.texto) }), f.libro ? h('div.ficha-ref', `Libro: ${f.libro}`) : null)
      : h('div.ficha.locked', '🔒 Entrada sin recuperar'));
  }
}

// ---------- Laboratorio libre ----------
export async function pantallaLaboratorio(root) {
  const info = h('div.lab-info', { 'aria-live': 'polite' });
  const host = h('div.ed-host');
  const wrap = h('div.ed-wrap');
  root.append(topbar('Laboratorio libre', '#/'), h('main.level', h('section.brief', h('p', 'Dibuja lo que quieras. El laboratorio calcula la fórmula y comprueba que la estructura sea válida.')), wrap));
  const editor = new MolEditor(host, {
    onChange: (m) => {
      if (!m.atoms.length) { info.textContent = ''; return; }
      const c = canonical(toSmiles(m));
      info.innerHTML = `Fórmula: <span class="f">${prettyFormula(formula(m))}</span>` + (c ? ` · SMILES: <code>${c}</code>` : ' · <span class="warn">estructura no válida</span>');
    },
    onEvent: (name, d) => { if (name === 'toast') toast(d.text, d.kind); },
  });
  const tb = crearToolbar(editor, { cargas: true });
  wrap.append(tb.el, host, info);
  editor.changed();
  return () => editor.destroy();
}

// ---------- Ajustes ----------
export async function pantallaAjustes(root) {
  const toggle = (k, label, desc) => h('label.setting',
    h('input', { type: 'checkbox', checked: store.ajuste(k) || null, onchange: (e) => store.setAjuste(k, e.target.checked) }),
    h('span', h('strong', label), h('small', desc)));
  root.append(topbar('Ajustes', '#/'), h('main.page',
    toggle('historia', 'Mostrar la historia', 'Diálogos de K.E.K.U.L.É. al entrar en secciones y niveles.'),
    toggle('modoEstudio', 'Modo estudio', 'Desbloquea todos los niveles y toda la bitácora para repasar libremente.'),
    h('h2', 'Progreso'),
    h('div.row',
      h('button.btn', {
        type: 'button',
        onclick: () => {
          const blob = new Blob([store.exportar()], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: 'protocolo-kekule-progreso.json' });
          a.click();
          URL.revokeObjectURL(a.href);
        },
      }, '⬇ Exportar'),
      h('label.btn', '⬆ Importar', h('input', {
        type: 'file', accept: 'application/json', hidden: true,
        onchange: async (e) => {
          try { store.importar(await e.target.files[0].text()); toast('Progreso importado', 'ok'); } catch (err) { toast(err.message, 'error'); }
        },
      })),
      h('button.btn.danger', {
        type: 'button',
        onclick: () => { if (confirm('¿Borrar todo tu progreso? No se puede deshacer.')) { store.reiniciar(); toast('Progreso borrado'); } },
      }, 'Reiniciar')),
    h('h2', 'Acerca de'),
    h('p.small', { html: rich('Proyecto de estudio no oficial basado en el programa de **Química Orgánica I** del Grado en Química de la UNED. Los textos y puzles son originales.\n\nMotor químico: RDKit (rdkit.org, licencia BSD).') })));
}
