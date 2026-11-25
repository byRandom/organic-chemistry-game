// Utilidades de interfaz: creación de elementos, avisos y texto enriquecido mínimo.

/** h('div.clase#id', {attrs}, ...hijos) */
export function h(spec, attrs = {}, ...children) {
  const [tagPart, ...rest] = spec.split(/(?=[.#])/);
  const e = document.createElement(tagPart || 'div');
  for (const r of rest) {
    if (r[0] === '.') e.classList.add(r.slice(1));
    else if (r[0] === '#') e.id = r.slice(1);
  }
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    children.unshift(attrs);
    attrs = {};
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'class') e.className += ' ' + v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  append(e, children);
  return e;
}

function append(e, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

/**
 * Formato ligero para el contenido: **negrita**, *cursiva*, `código`,
 * subíndices automáticos en fórmulas (CH4 -> CH₄) cuando se escriben como {CH4},
 * y saltos de párrafo con línea en blanco.
 */
export function rich(text) {
  const SUB = '₀₁₂₃₄₅₆₇₈₉';
  let s = escapeHtml(text ?? '');
  s = s.replace(/\{([^{}]+)\}/g, (_, f) => '<span class="f">' + f.replace(/(?<=[A-Za-z)\]])(\d+)/g, (d) => [...d].map((x) => SUB[+x]).join('')) + '</span>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s
    .split(/\n{2,}/)
    .map((p) => (p.trim().startsWith('- ')
      ? '<ul>' + p.trim().split(/\n/).map((l) => '<li>' + l.replace(/^- /, '') + '</li>').join('') + '</ul>'
      : '<p>' + p.replace(/\n/g, '<br>') + '</p>'))
    .join('');
}

let toastTimer = null;
export function toast(text, kind = 'info', ms = 2600) {
  let box = document.getElementById('toast');
  if (!box) {
    box = h('div#toast', { role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(box);
  }
  box.className = 'show ' + kind;
  box.innerHTML = rich(text);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.className = ''; }, ms);
}

export function ocultarToast() {
  clearTimeout(toastTimer);
  document.getElementById('toast')?.classList.remove('show');
}

export function clear(e) {
  while (e.firstChild) e.removeChild(e.firstChild);
  return e;
}

/** Ventana modal simple. Devuelve una función para cerrarla. */
export function modal(content, { onClose, className = '' } = {}) {
  const back = h('div.modal-back', { class: className });
  const box = h('div.modal', { role: 'dialog', 'aria-modal': 'true' }, content);
  back.appendChild(box);
  const close = () => { back.remove(); onClose?.(); };
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.appendChild(back);
  return close;
}
