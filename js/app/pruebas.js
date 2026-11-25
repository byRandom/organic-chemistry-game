// Pruebas de evaluación (simulacros de las PEC): selección de variantes, orden y puntuación.

/** Generador pseudoaleatorio reproducible (mulberry32). */
export function aleatorio(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Prepara un intento: una variante al azar de cada pregunta, en orden barajado.
 * Devuelve [{pregunta, variante, indiceVariante}].
 */
export function prepararIntento(prueba, semilla = Date.now()) {
  if (prueba.ordenFijo) return prueba.preguntas.map((p) => ({ pregunta: p, variante: p.variantes[0], indiceVariante: 0 }));
  const rnd = aleatorio(semilla);
  const items = prueba.preguntas.map((p) => {
    const k = Math.floor(rnd() * p.variantes.length);
    return { pregunta: p, variante: p.variantes[k], indiceVariante: k };
  });
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** Puntos de una pregunta: 1 sin fallos, 0,5 con un fallo, 0 con más. */
export const puntos = (fallos) => (fallos === 0 ? 1 : fallos === 1 ? 0.5 : 0);

/** Nota sobre 10 y desglose por tema. */
export function calificar(resultados) {
  const total = resultados.reduce((s, r) => s + puntos(r.fallos), 0);
  const nota = Math.round((total / resultados.length) * 100) / 10;
  const porTema = {};
  for (const r of resultados) {
    const t = r.tema;
    porTema[t] = porTema[t] || { puntos: 0, max: 0 };
    porTema[t].puntos += puntos(r.fallos);
    porTema[t].max += 1;
  }
  return { nota, porTema };
}
