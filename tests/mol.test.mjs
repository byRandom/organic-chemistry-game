import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadRDKitNode } from './helpers.mjs';
import { canonical, canonicalOf, molFromSmiles } from '../js/chem/rdkit.js';
import { createMol, addAtom, addBond, formula, toSmiles, valenceErrors, implicitH } from '../js/chem/mol.js';

before(async () => { await loadRDKitNode(); });

// Moléculas variadas de QO I: anillos, policíclicos, dobles y triples enlaces, cargas.
const CASES = [
  'C', 'CC', 'C=C', 'C#C', 'CCO', 'CC(C)(C)Br', 'C1CCCCC1', 'C1CC1', 'C1=CC=CC=C1',
  'C1CC2CCC1C2', // norbornano
  'C1CCC2CCCCC2C1', // decalina
  'C1C2CC3CC1CC(C2)C3', // adamantano
  'CC1(C)C2CCC1(Cl)C2', 'C1CCC2(C1)CCCC2', 'O=C(O)C#CC(=O)O', 'C[N+](C)(C)C', '[O-]C',
  'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O',
  'CC12CCC3C(C1CCC2O)CCC4=CC(=O)CCC34C', // testosterona
  'CC1=C2C(C(=O)C3(C(CC4C(C3C(C(C2(C)C)(CC1OC(=O)C(C(C5=CC=CC=C5)NC(=O)C6=CC=CC=C6)O)O)OC(=O)C7=CC=CC=C7)(CO4)OC(=O)C)O)C)OC(=O)C', // taxol
  'CCO.CC',
];

test('toSmiles conserva la estructura (ida y vuelta con RDKit)', () => {
  for (const smi of CASES) {
    const mol = molFromSmiles(smi);
    assert.ok(mol, `RDKit no pudo leer ${smi}`);
    assert.equal(canonicalOf(mol), canonical(smi), `fallo en ${smi} -> ${toSmiles(mol)}`);
  }
});

test('fórmula molecular (Hill) con H implícitos y explícitos', () => {
  assert.equal(formula(molFromSmiles('CCO')), 'C2H6O');
  assert.equal(formula(molFromSmiles('CC(C)(C)Br')), 'C4H9Br');
  assert.equal(formula(molFromSmiles('C1=CC=CC=C1')), 'C6H6');
  const m = createMol();
  const c = addAtom(m, 'C');
  for (let i = 0; i < 4; i++) addBond(m, c, addAtom(m, 'H'));
  assert.equal(formula(m), 'CH4');
  assert.equal(canonicalOf(m), 'C');
  assert.equal(implicitH(m, c), 0);
});

test('detecta carbonos con más de 4 enlaces', () => {
  const m = createMol();
  const c = addAtom(m, 'C');
  for (let i = 0; i < 5; i++) addBond(m, c, addAtom(m, 'C'));
  assert.deepEqual(valenceErrors(m), [c]);
});

test('cargas formales: amonio y alcóxido', () => {
  const m = createMol();
  const n = addAtom(m, 'N', 0, 0, 1);
  assert.equal(implicitH(m, n), 4);
  assert.equal(formula(m), 'H4N+');
});
