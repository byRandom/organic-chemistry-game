// Diálogos de la historia (K.E.K.U.L.É. y registros de la nave).
import { h, rich } from './ui.js';
import { store } from './store.js';

export const AVATAR_SVG = `
<svg viewBox="0 0 64 64" aria-hidden="true" class="avatar-svg">
  <defs>
    <linearGradient id="kg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#5eead4"/><stop offset="1" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
  <polygon points="32,6 54,19 54,45 32,58 10,45 10,19" fill="none" stroke="url(#kg)" stroke-width="3.5" stroke-linejoin="round"/>
  <path d="M32 6 L54 19" stroke="#0b1020" stroke-width="5"/>
  <path d="M33.5 7.2 L52 18" stroke="url(#kg)" stroke-width="2" stroke-dasharray="2 3"/>
  <circle cx="32" cy="32" r="9" fill="#0b1020" stroke="url(#kg)" stroke-width="2.5"/>
  <circle class="eye" cx="32" cy="32" r="4" fill="#5eead4"/>
</svg>`;

const NOMBRES = { kekule: 'K.E.K.U.L.É.', registro: 'Registro de la nave', tu: 'Tú', sistema: 'Sistema' };

/**
 * Muestra una secuencia de líneas de diálogo. Devuelve una promesa que se resuelve al terminar.
 * @param {Array<{quien?: string, texto: string}>} lineas
 * @param {{id?: string, forzar?: boolean}} opts si `id` ya se vio, no se vuelve a mostrar salvo `forzar`
 */
export function dialogo(lineas, { id = null, forzar = false } = {}) {
  if (!lineas?.length) return Promise.resolve();
  if (!forzar && (!store.ajuste('historia') || (id && store.visto(id)))) return Promise.resolve();
  document.getElementById('toast')?.classList.remove('show');
  return new Promise((resolve) => {
    let i = 0;
    const avatar = h('div.dlg-avatar', { html: AVATAR_SVG });
    const nombre = h('div.dlg-name');
    const texto = h('div.dlg-text', { 'aria-live': 'polite' });
    const sig = h('button.dlg-next', { type: 'button' }, 'Continuar ▸');
    const saltar = h('button.dlg-skip', { type: 'button' }, 'Saltar');
    const box = h('div.dlg', { role: 'dialog', 'aria-label': 'Diálogo' },
      avatar, h('div.dlg-body', nombre, texto, h('div.dlg-actions', saltar, sig)));
    const back = h('div.dlg-back', box);
    let typing = null;

    function fin() {
      clearInterval(typing);
      back.remove();
      document.removeEventListener('keydown', onKey);
      if (id) store.marcarVisto(id);
      resolve();
    }

    function mostrar() {
      const l = lineas[i];
      const quien = l.quien || 'kekule';
      box.dataset.quien = quien;
      avatar.hidden = quien !== 'kekule';
      nombre.textContent = NOMBRES[quien] || quien;
      sig.textContent = i < lineas.length - 1 ? 'Continuar ▸' : 'Entendido ▸';
      // efecto máquina de escribir sobre el texto plano; al terminar se pone el formato
      const full = rich(l.texto);
      const plain = h('div', { html: full }).textContent;
      let k = 0;
      clearInterval(typing);
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { texto.innerHTML = full; return; }
      texto.textContent = '';
      typing = setInterval(() => {
        k += 2;
        texto.textContent = plain.slice(0, k);
        if (k >= plain.length) { clearInterval(typing); typing = null; texto.innerHTML = full; }
      }, 16);
      texto.dataset.full = full;
    }

    function avanzar() {
      if (typing) { clearInterval(typing); typing = null; texto.innerHTML = texto.dataset.full; return; }
      i++;
      if (i >= lineas.length) fin(); else mostrar();
    }

    function onKey(e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); avanzar(); }
      if (e.key === 'Escape') fin();
    }

    sig.addEventListener('click', (e) => { e.stopPropagation(); avanzar(); });
    saltar.addEventListener('click', (e) => { e.stopPropagation(); fin(); });
    box.addEventListener('click', avanzar);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    mostrar();
    sig.focus();
  });
}
