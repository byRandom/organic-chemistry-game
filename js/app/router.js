// Enrutador por hash (#/mapa, #/mundo/m1, #/nivel/m1/m1-01...). Funciona en GitHub Pages sin configuración.
const routes = [];
let cleanup = null;
let root = null;

export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ re, keys, handler });
}

export function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

export async function render() {
  const path = (location.hash || '#/').slice(1) || '/';
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* nada */ } }
  cleanup = null;
  // cierra ventanas y diálogos que quedaran abiertos (p. ej. al usar el botón atrás)
  document.querySelectorAll('.modal-back, .dlg-back').forEach((e) => e.remove());
  document.getElementById('toast')?.classList.remove('show');
  root.replaceChildren();
  window.scrollTo(0, 0);
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params = m.slice(1).map(decodeURIComponent);
      cleanup = await r.handler(root, ...params);
      return;
    }
  }
  location.hash = '#/';
}

export function startRouter(el) {
  root = el;
  window.addEventListener('hashchange', render);
  render();
}
