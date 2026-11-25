// Carga del contenido (mundos, niveles, fichas) desde content/.
import { store } from './store.js';

const BASE = './content/qo1/';
let indice = null;
const mundos = new Map();

export async function cargarIndice() {
  if (!indice) indice = await (await fetch(BASE + 'mundos.json')).json();
  return indice;
}

export async function cargarMundo(id) {
  if (mundos.has(id)) return mundos.get(id);
  const idx = await cargarIndice();
  const meta = idx.mundos.find((m) => m.id === id);
  if (!meta?.archivo) return null;
  const data = await (await fetch(BASE + meta.archivo)).json();
  const mundo = { ...meta, ...data };
  mundos.set(id, mundo);
  return mundo;
}

/** Todas las fichas de los mundos cargados (para la bitácora). */
export async function todasLasFichas() {
  const idx = await cargarIndice();
  const out = [];
  for (const meta of idx.mundos) {
    if (!meta.archivo) continue;
    const m = await cargarMundo(meta.id);
    for (const [id, f] of Object.entries(m.fichas || {})) out.push({ id, mundo: m, ...f });
  }
  return out;
}

export function nivelCompletado(id) {
  return !!store.nivel(id);
}

/** Un nivel está disponible si es el primero o el anterior está completado (o modo estudio). */
export function nivelDisponible(mundo, i) {
  if (store.ajuste('modoEstudio')) return true;
  if (i === 0) return true;
  return nivelCompletado(mundo.niveles[i - 1].id);
}

export function mundoCompletado(mundo) {
  return mundo.niveles?.length > 0 && mundo.niveles.every((n) => nivelCompletado(n.id));
}

/** Un mundo está disponible si el anterior está completado. */
export async function mundoDisponible(idx, i) {
  if (store.ajuste('modoEstudio')) return !!idx.mundos[i].archivo;
  if (!idx.mundos[i].archivo) return false;
  if (i === 0) return true;
  const prev = await cargarMundo(idx.mundos[i - 1].id);
  return prev ? mundoCompletado(prev) : false;
}

export function estrellasMundo(mundo) {
  return (mundo.niveles || []).reduce((s, n) => s + (store.nivel(n.id)?.estrellas || 0), 0);
}
