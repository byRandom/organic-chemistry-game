// PWA: registro del service worker, aviso de actualización e instalación.
import { h } from './ui.js';

let deferredPrompt = null;

export function installState() {
  return { canPrompt: !!deferredPrompt };
}

export async function promptInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
}

export function initPWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.dispatchEvent(new Event('pk-install-available'));
  });

  if (!('serviceWorker' in navigator)) return;
  // En desarrollo local (localhost) también se registra, para poder probar el modo sin conexión.
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    const avisar = (worker) => {
      const bar = h('div.update-bar', { role: 'status' },
        h('span', 'Hay una versión nueva del juego.'),
        h('button.btn.primary', { type: 'button', onclick: () => worker.postMessage({ type: 'SKIP_WAITING' }) }, 'Actualizar'));
      document.body.appendChild(bar);
    };
    if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) avisar(nw);
      });
    });
  }).catch(() => { /* sin SW (p. ej. file://) el juego sigue funcionando en línea */ });

  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) return;
    recargando = true;
    location.reload();
  });
}
