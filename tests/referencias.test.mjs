// Estructuras de apoyo («referencias»): todas se dibujan y las de las sillas
// tienen la misma relación cis/trans que pide el puzle.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { loadRDKitNode, root } from './helpers.mjs';
import { molFromSmiles } from '../js/chem/rdkit.js';

before(async () => { await loadRDKitNode(); });

const dir = path.join(root, 'content/qo1');
const archivos = readdirSync(dir).filter((f) => /^mundo-\d+\.json$/.test(f) || f === 'pruebas.json');

/** Recorre el contenido y devuelve los objetos con «referencias» (y dónde están). */
function conReferencias() {
  const out = [];
  for (const f of archivos) {
    const visitar = (o, ruta) => {
      if (Array.isArray(o)) o.forEach((x, i) => visitar(x, `${ruta}[${i}]`));
      else if (o && typeof o === 'object') {
        if (o.referencias) out.push({ obj: o, donde: `${f}${ruta}` });
        for (const [k, v] of Object.entries(o)) if (k !== 'referencias') visitar(v, `${ruta}.${k}`);
      }
    };
    visitar(JSON.parse(readFileSync(path.join(dir, f), 'utf8')), '');
  }
  return out;
}

const items = (r) => (Array.isArray(r) ? r : r.items);

/** ¿El enlace i forma parte de un ciclo? */
function enAnillo(m, i) {
  const b = m.bonds[i];
  const adj = m.atoms.map(() => []);
  m.bonds.forEach((x, k) => { if (k !== i) { adj[x.a].push(x.b); adj[x.b].push(x.a); } });
  const vistos = new Set([b.a]);
  const pila = [b.a];
  while (pila.length) for (const u of adj[pila.pop()]) if (!vistos.has(u)) { vistos.add(u); pila.push(u); }
  return vistos.has(b.b);
}

test('hay referencias en el contenido', () => {
  assert.ok(conReferencias().length >= 10);
});

test('todas las referencias son válidas y se pueden dibujar', () => {
  for (const { obj, donde } of conReferencias()) {
    const lista = items(obj.referencias);
    assert.ok(Array.isArray(lista) && lista.length, `${donde}: lista vacía`);
    for (const it of lista) {
      if (it === '+') continue;
      assert.equal(typeof it, 'object', `${donde}: elemento no válido ${JSON.stringify(it)}`);
      if ('flecha' in it || it.incognita) continue;
      assert.ok(it.smiles || it.texto, `${donde}: falta smiles o texto`);
      if (it.smiles) assert.ok(molFromSmiles(it.smiles)?.atoms.length, `${donde}: SMILES no válido ${it.smiles}`);
    }
  }
});

test('las referencias de las sillas tienen la relación cis/trans del puzle', () => {
  let n = 0;
  for (const { obj, donde } of conReferencias()) {
    if (obj.tipo !== 'silla' || !obj.relacion) continue;
    const m = molFromSmiles(items(obj.referencias)[0].smiles);
    const cunas = m.bonds.map((b, i) => [b, i]).filter(([b]) => b.w);
    assert.equal(cunas.length, 2, `${donde}: se esperaban dos enlaces en cuña/raya`);
    for (const [, i] of cunas) assert.ok(!enAnillo(m, i), `${donde}: la cuña está en un enlace del anillo`);
    const rel = cunas[0][0].w === cunas[1][0].w ? 'cis' : 'trans';
    assert.equal(rel, obj.relacion, `${donde}: la estructura es ${rel}`);
    n++;
  }
  assert.ok(n >= 8, `solo ${n} sillas comprobadas`);
});
