// Progreso del jugador, guardado en el dispositivo (localStorage).
const KEY = 'protocolo-kekule:v1';

const DEFAULT = {
  niveles: {}, // id -> { estrellas, completado: fecha }
  fichas: {}, // id -> fecha de desbloqueo
  vistos: {}, // diálogos ya vistos
  ajustes: { historia: true, modoEstudio: false, sonido: false, lienzoClaro: false },
};

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const data = JSON.parse(raw);
    return { ...structuredClone(DEFAULT), ...data, ajustes: { ...DEFAULT.ajustes, ...(data.ajustes || {}) } };
  } catch {
    return structuredClone(DEFAULT);
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* almacenamiento lleno o privado */ }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  nivel(id) { return state.niveles[id]; },
  completarNivel(id, estrellas) {
    const prev = state.niveles[id];
    state.niveles[id] = {
      estrellas: Math.max(estrellas, prev?.estrellas || 0),
      completado: prev?.completado || new Date().toISOString(),
    };
    save();
  },

  tieneFicha(id) { return !!state.fichas[id]; },
  desbloquearFicha(id) {
    if (state.fichas[id]) return false;
    state.fichas[id] = new Date().toISOString();
    save();
    return true;
  },

  visto(id) { return !!state.vistos[id]; },
  marcarVisto(id) { state.vistos[id] = true; save(); },

  ajuste(k) { return state.ajustes[k]; },
  setAjuste(k, v) { state.ajustes[k] = v; save(); },

  exportar() { return JSON.stringify(state, null, 2); },
  importar(json) {
    const data = JSON.parse(json);
    if (typeof data !== 'object' || !data.niveles) throw new Error('Archivo de progreso no válido');
    state = { ...structuredClone(DEFAULT), ...data };
    save();
  },
  reiniciar() { state = structuredClone(DEFAULT); save(); },
};
