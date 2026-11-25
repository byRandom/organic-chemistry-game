// Ejemplos del texto base (Temas 5 y 6) y de exámenes de cursos anteriores.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadRDKitNode } from './helpers.mjs';
import { canonical } from '../js/chem/rdkit.js';
import { reaccionar } from '../js/chem/reacciones.js';

before(async () => { await loadRDKitNode(); });

const C = (s) => canonical(s);
const mayores = (r) => r.productos.filter((p) => p.papel !== 'minoritario').map((p) => p.smiles).sort();
const menores = (r) => r.productos.filter((p) => p.papel === 'minoritario').map((p) => p.smiles).sort();

test('2-bromopropano + acetato: 100 % SN2', () => {
  const r = reaccionar('CC(C)Br', 'CH3COONa');
  assert.equal(r.mecanismo, 'SN2');
  assert.deepEqual(mayores(r), [C('CC(C)OC(C)=O')]);
  assert.equal(menores(r).length, 0);
});

test('2-bromopropano + EtO⁻: E2 mayoritaria (propeno) y SN2 minoritaria', () => {
  const r = reaccionar('CC(C)Br', 'EtONa');
  assert.equal(r.mecanismo, 'E2');
  assert.deepEqual(mayores(r), [C('C=CC')]);
  assert.deepEqual(menores(r), [C('CCOC(C)C')]);
});

test('2-bromopropano + EtOH: SN1 (éter) y E1', () => {
  const r = reaccionar('CC(C)Br', 'EtOH');
  assert.equal(r.mecanismo, 'SN1');
  assert.deepEqual(mayores(r), [C('CCOC(C)C')]);
});

test('bromuro de terc-butilo: E2 con EtO⁻; SN1 (80 %) + E1 en EtOH', () => {
  const a = reaccionar('CC(C)(C)Br', 'EtONa');
  assert.equal(a.mecanismo, 'E2');
  assert.deepEqual(mayores(a), [C('C=C(C)C')]);
  const b = reaccionar('CC(C)(C)Br', 'EtOH');
  assert.equal(b.mecanismo, 'SN1');
  assert.deepEqual(mayores(b), [C('CCOC(C)(C)C')]);
  assert.deepEqual(menores(b), [C('C=C(C)C')]);
});

test('1-bromopropano: terc-butóxido → E2; metóxido → SN2', () => {
  assert.deepEqual(mayores(reaccionar('CCCBr', 'tBuOK')), [C('C=CC')]);
  assert.deepEqual(mayores(reaccionar('CCCBr', 'CH3ONa')), [C('CCCOC')]);
  assert.deepEqual(mayores(reaccionar('CCCCCl', 'NaCN')), [C('CCCCC#N')]);
});

test('bromuro de isobutilo: CN⁻ → SN2; EtO⁻ → E2 (60 %); CH₃OH → SN1 con transposición', () => {
  assert.deepEqual(mayores(reaccionar('CC(C)CBr', 'NaCN')), [C('CC(C)CC#N')]);
  const b = reaccionar('CC(C)CBr', 'EtONa');
  assert.deepEqual(mayores(b), [C('C=C(C)C')]);
  assert.deepEqual(menores(b), [C('CCOCC(C)C')]);
  const c = reaccionar('CC(C)CBr', 'CH3OH');
  assert.equal(c.transposicion, 'hidruro');
  assert.deepEqual(mayores(c), [C('COC(C)(C)C')]);
});

test('SN2 con inversión de la configuración (Walden)', () => {
  // (R)-2-bromobutano + CH3S⁻ → (S)-2-(metiltio)butano
  const r = reaccionar('CC[C@@H](C)Br', 'CH3SNa');
  assert.equal(r.mecanismo, 'SN2');
  const p = mayores(r)[0];
  assert.match(p, /@/);
  assert.equal(p, C('CC[C@H](C)SC')); // inversión
  // halogenuro bencílico secundario + NaN3 (DMF) → SN2 con inversión
  const az = reaccionar('C[C@H](Br)c1ccccc1', 'NaN3');
  assert.equal(az.mecanismo, 'SN2');
  assert.equal(mayores(az)[0], C('C[C@@H](N=[N+]=[N-])c1ccccc1'));
});

test('doble inversión: dos SN2 seguidas conservan la configuración', () => {
  const a = mayores(reaccionar('CC[C@@H](C)Br', 'NaI'))[0];
  const b = mayores(reaccionar(a, 'CH3SNa'))[0];
  assert.equal(b, C('CC[C@@H](C)SC'));
});

test('SN1: racemización ((R)-2-bromopentano + CH₃OH)', () => {
  const r = reaccionar('CCC[C@@H](C)Br', 'CH3OH');
  assert.equal(r.mecanismo, 'SN1');
  const p = r.productos.find((x) => x.mecanismo === 'SN1');
  assert.ok(p.racemico);
  assert.equal(p.smiles, C('CCCC(C)OC'));
});

test('SN1 con desplazamiento de metilo (examen 2022: 3-bromo-2,2-dimetilbutano + EtOH)', () => {
  const r = reaccionar('CC(Br)C(C)(C)C', 'EtOH');
  assert.equal(r.transposicion, 'metilo');
  assert.deepEqual(mayores(r), [C('CCOC(C)(C)C(C)C')]);
  assert.deepEqual(menores(r), [C('CC(C)=C(C)C')]);
});

test('transposición de metilo en un anillo (2-bromo-1,1-dimetilciclopentano + EtOH)', () => {
  const r = reaccionar('CC1(C)CCCC1Br', 'EtOH');
  assert.equal(r.transposicion, 'metilo');
  assert.deepEqual(mayores(r), [C('CCOC1(C)CCCC1C')]);
});

test('E2 Saytzeff frente a Hofmann (2-bromo-2-metilbutano)', () => {
  assert.deepEqual(mayores(reaccionar('CCC(C)(C)Br', 'EtONa')), [C('CC=C(C)C')]);
  assert.deepEqual(mayores(reaccionar('CCC(C)(C)Br', 'tBuOK')), [C('C=C(C)CC')]);
});

test('E2: 2-bromobutano da el (E)-2-buteno como mayoritario', () => {
  const r = reaccionar('CCC(C)Br', 'EtONa');
  assert.deepEqual(mayores(r), [C('C/C=C/C')]);
  assert.ok(menores(r).includes(C('C/C=C\\C')));
});

test('E2 estereoespecífica: cada diastereoisómero da un alqueno E o Z distinto', () => {
  // 2-bromo-3-fenilbutano: (2R,3R) y (2R,3S) dan isómeros geométricos opuestos
  const a = mayores(reaccionar('C[C@@H](Br)[C@@H](C)c1ccccc1', 'EtONa'));
  const b = mayores(reaccionar('C[C@@H](Br)[C@H](C)c1ccccc1', 'EtONa'));
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  assert.notEqual(a[0], b[0]);
  assert.equal(C(a[0].replace(/[/\\]/g, '')), C(b[0].replace(/[/\\]/g, '')));
});

test('E2 en ciclohexanos: el H tiene que ser trans al halógeno (cloruro de neomentilo frente a mentilo)', () => {
  // cloruro de mentilo: solo un H trans-diaxial → el alqueno menos sustituido (anti-Saytzeff)
  const mentilo = reaccionar('CC(C)[C@@H]1CC[C@@H](C)C[C@H]1Cl', 'EtONa');
  const neomentilo = reaccionar('CC(C)[C@@H]1CC[C@@H](C)C[C@@H]1Cl', 'EtONa');
  const sinEstereo = (s) => C(s.replace(/[@/\\]/g, '').replace(/\[C(H?)\]/g, 'C'));
  const m1 = mayores(mentilo).map(sinEstereo);
  const m2 = mayores(neomentilo).map(sinEstereo);
  // mentilo: solo el H del C6 es trans-diaxial → 2-menteno (disustituido), contra Saytzeff
  assert.deepEqual(m1, [C('CC(C)C1CCC(C)C=C1')]);
  // neomentilo: el H del carbono con el isopropilo es trans → 3-menteno (trisustituido, Saytzeff)
  assert.ok(m2.includes(C('CC(C)C1=CCC(C)CC1')));
});

test('no reacciona: sin grupo saliente, halogenuro vinílico, primario con nucleófilo débil', () => {
  assert.equal(reaccionar('CCCC', 'NaOH').ok, false);
  assert.equal(reaccionar('C=CBr', 'NaOH').ok, false);
  assert.equal(reaccionar('CCCBr', 'EtOH').ok, false);
  assert.equal(reaccionar('CC(C)(C)CBr', 'NaCN').ok, false);
});
