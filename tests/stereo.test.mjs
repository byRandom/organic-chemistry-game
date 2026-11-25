import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadRDKitNode } from './helpers.mjs';
import { molFromSmiles } from '../js/chem/rdkit.js';
import { etiquetaDesdeDibujo, fischer, newman, etiquetaGrupo, etiquetaDesdePosiciones } from '../js/chem/stereo.js';

before(async () => { await loadRDKitNode(); });

const QUIRALES = [
  'C[C@H](O)CC', 'C[C@@H](O)CC', 'C[C@@H](Br)[C@H](O)C', 'C[C@H]1CCCC[C@@H]1C', 'C[C@@H]1CCCC[C@@H]1C',
  'O=C[C@H](O)CO', 'O=C[C@@H](O)CO', 'C[C@@H](C(=O)O)N', 'C[C@H](C(=O)O)N', 'CC(C)[C@@H]1CC[C@@H](C)C[C@H]1O',
  'CC(C)CC1=CC=C(C=C1)[C@@H](C)C(=O)O', 'O[C@H]([C@@H](O)C(=O)O)C(=O)O', 'F[C@](Cl)(Br)I', 'C[C@](O)(CC)C=C',
  'CC(C)CCC[C@@H](C)[C@H]1CC[C@H]2[C@@H]3CC=C4C[C@@H](O)CC[C@]4(C)[C@H]3CC[C@]12C',
];

test('R/S desde las cuñas coincide con RDKit (convenio de signos)', () => {
  let n = 0;
  for (const s of QUIRALES) {
    const m = molFromSmiles(s);
    for (const [c, lab] of Object.entries(m.cip)) {
      assert.equal(etiquetaDesdeDibujo(m, +c), lab, `${s} átomo ${c}`);
      n++;
    }
  }
  assert.ok(n > 20);
});

test('D-gliceraldehído: R, con el OH a la derecha en Fischer', () => {
  const smi = ['O=C[C@H](O)CO', 'O=C[C@@H](O)CO'].find((s) => Object.values(molFromSmiles(s).cip)[0] === 'R');
  const f = fischer(smi);
  assert.equal(f.arriba, 'CHO');
  assert.equal(f.abajo, 'CH₂OH');
  assert.equal(f.filas[0].der, 'OH');
  assert.equal(f.filas[0].izq, 'H');
});

test('L-alanina: S, con el NH₂ a la izquierda en Fischer', () => {
  const m = molFromSmiles('C[C@@H](C(=O)O)N');
  assert.equal(Object.values(m.cip)[0], 'S');
  const f = fischer('C[C@@H](C(=O)O)N');
  assert.equal(f.arriba, 'COOH');
  assert.equal(f.abajo, 'CH₃');
  assert.equal(f.filas[0].izq, 'NH₂');
});

test('Fischer con dos centros y orientación invertida conserva las etiquetas', () => {
  for (const s of ['C[C@@H](Br)[C@H](O)C', 'O[C@H]([C@@H](O)C(=O)O)C(=O)O', 'C[C@@H](Br)[C@@H](Br)C']) {
    for (const invertir of [false, true]) {
      const f = fischer(s, { invertir });
      assert.equal(f.filas.length, 2, s);
      const m = molFromSmiles(s);
      for (const fila of f.filas) assert.equal(fila.etiqueta, m.cip[fila.centro]);
    }
  }
});

test('Newman: genera disposiciones alternadas con 3 grupos delante y 3 detrás', () => {
  const n = newman('C[C@@H](Br)[C@H](O)C');
  assert.equal(n.delante.length, 3);
  assert.equal(n.detras.length, 3);
  const textos = [...n.delante, ...n.detras].map((x) => x.texto).sort();
  assert.deepEqual(textos, ['Br', 'CH₃', 'CH₃', 'H', 'H', 'OH']);
});

test('etiquetas de grupos condensadas', () => {
  const m = molFromSmiles('CC(C)CC(C(=O)O)C(C)(C)C');
  // vecinos del carbono 4 (el CH central)
  const textos = [3, 5, 8].map((a) => etiquetaGrupo(m, 4, a)).sort();
  assert.deepEqual(textos, ['C(CH₃)₃', 'CH₂CH(CH₃)₂', 'COOH']);
});

test('etiqueta desde posiciones: caso de referencia', () => {
  // d hacia atrás; a (arriba), b (abajo derecha), c (abajo izquierda) en sentido horario => R
  const r = etiquetaDesdePosiciones([
    { rank: 4, pos: [0, 1, 0.3] }, { rank: 3, pos: [0.87, -0.5, 0.3] }, { rank: 2, pos: [-0.87, -0.5, 0.3] }, { rank: 1, pos: [0, 0, -1] },
  ]);
  assert.equal(r, 'R');
});
