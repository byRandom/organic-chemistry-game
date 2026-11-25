// Comprueba que todo el contenido es coherente y que cada puzle tiene solución válida.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadRDKitNode, root } from './helpers.mjs';
import { revisarNivel } from './revisar.mjs';

before(async () => { await loadRDKitNode(); });

const dir = path.join(root, 'content/qo1');
const indice = JSON.parse(readFileSync(path.join(dir, 'mundos.json'), 'utf8'));
const mundos = indice.mundos.filter((m) => m.archivo).map((m) => ({ ...m, ...JSON.parse(readFileSync(path.join(dir, m.archivo), 'utf8')) }));

test('índice de mundos', () => {
  assert.equal(indice.mundos.length, 12);
  assert.ok(mundos.length >= 1);
});

for (const mundo of mundos) {
  test(`mundo ${mundo.id}: niveles válidos y con solución`, () => {
    const ids = new Set();
    for (const n of mundo.niveles) {
      assert.ok(!ids.has(n.id), `id repetido ${n.id}`);
      ids.add(n.id);
      assert.ok(n.titulo && n.enunciado, `${n.id}: falta título o enunciado`);
      revisarNivel(n, mundo, n.id);
    }
    for (const n of mundo.niveles) if (n.ficha) assert.ok(mundo.fichas[n.ficha], n.ficha);
    assert.ok(mundo.niveles.at(-1).jefe, 'el último nivel del mundo debe ser el jefe');
  });
}

// ---------- pruebas de evaluación (simulacros) ----------
import { prepararIntento, calificar } from '../js/app/pruebas.js';
const pruebas = JSON.parse(readFileSync(path.join(dir, 'pruebas.json'), 'utf8')).pruebas;

for (const prueba of pruebas.filter((p) => p.disponible !== false)) {
  test(`simulacro ${prueba.id}: todas las variantes tienen solución`, () => {
    const temasMundo = new Set(indice.mundos.filter((m) => m.archivo).map((m) => m.num));
    for (const p of prueba.preguntas) {
      assert.ok(p.variantes.length >= 2, `${p.id}: hace falta más de una variante`);
      assert.ok(temasMundo.has(p.tema), `${p.id}: el tema ${p.tema} aún no tiene mundo`);
      p.variantes.forEach((v, k) => revisarNivel({ titulo: p.titulo, ...v }, { fichas: {} }, `${prueba.id}/${p.id}/v${k + 1}`));
    }
  });
  test(`simulacro ${prueba.id}: intentos barajados y nota`, () => {
    const a = prepararIntento(prueba, 1), b = prepararIntento(prueba, 2);
    assert.equal(a.length, prueba.preguntas.length);
    assert.notDeepEqual(a.map((x) => x.pregunta.id + x.indiceVariante), b.map((x) => x.pregunta.id + x.indiceVariante));
    const r = calificar(a.map((x, i) => ({ tema: x.pregunta.tema, fallos: i % 3 })));
    assert.ok(r.nota >= 0 && r.nota <= 10);
  });
}
