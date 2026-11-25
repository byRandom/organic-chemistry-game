// Carga del contenido (mundos, niveles, fichas) desde content/.
import { store } from './store.js';

const BASE = './content/qo1/';
let indice = null;
const mundos = new Map();

export async function cargarIndice() {
  if (!indice) indice = await (await fetch(BASE + 'mundos.json')).json();
  return indice;
}

let pruebas = null;
const CLAVE_PRIVADO = 'protocolo-kekule:privado';

/** Pruebas desbloqueadas con un código (guardadas solo en este dispositivo). */
export function pruebasPrivadas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_PRIVADO) || '[]'); } catch { return []; }
}

export function guardarPrivada(prueba) {
  const lista = pruebasPrivadas().filter((p) => p.id !== prueba.id);
  lista.push(prueba);
  localStorage.setItem(CLAVE_PRIVADO, JSON.stringify(lista));
}

export function borrarPrivadas() { localStorage.removeItem(CLAVE_PRIVADO); }

/** Prueba con todos los archivos cifrados; devuelve las pruebas que abre el código. */
export async function canjearCodigo(codigo) {
  const { descifrar } = await import('./cifrado.js');
  const { archivos } = await (await fetch(BASE + 'privado/indice.json')).json();
  const abiertas = [];
  for (const a of archivos) {
    const paquete = await (await fetch(BASE + 'privado/' + a)).json();
    const prueba = await descifrar(paquete, codigo);
    if (prueba) { guardarPrivada({ ...prueba, privada: true }); abiertas.push(prueba); }
  }
  return abiertas;
}

export async function cargarPruebas() {
  if (!pruebas) pruebas = (await (await fetch(BASE + 'pruebas.json')).json()).pruebas;
  return [...pruebas, ...pruebasPrivadas()];
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
