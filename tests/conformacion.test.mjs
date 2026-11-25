import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perfilNewman, analizarSilla, girarSilla } from '../js/chem/conformacion.js';
import { geometriaSilla } from '../js/render/proyecciones.js';

const E = (perfil, g) => perfil.find((p) => p.giro === g).e;

test('etano: barrera de 3 kcal/mol (Tema 2)', () => {
  const p = perfilNewman(['H', 'H', 'H'], ['H', 'H', 'H']);
  assert.equal(E(p, 0), 3);
  assert.equal(E(p, 60), 0);
});

test('butano: anti 0, gauche 0,9, anticlinal 3,8 y sinperiplanar la más alta (Tema 2, Fig. 2.5)', () => {
  const p = perfilNewman(['CH₃', 'H', 'H'], ['CH₃', 'H', 'H']);
  assert.equal(E(p, 180), 0); // anti
  assert.equal(E(p, 60), 0.9); // gauche
  assert.equal(E(p, 300), 0.9);
  assert.equal(E(p, 120), 3.8); // eclipsada anticlinal
  assert.equal(E(p, 240), 3.8);
  assert.ok(E(p, 0) > 3.8); // totalmente eclipsada
});

// En la silla de pliegue +1 el carbono 0 tiene el axial hacia abajo y alterna.
const ax = (p) => geometriaSilla(p).map((g) => g.axArriba);

test('geometría de la silla: axiales alternan y el giro los invierte', () => {
  const a = ax(1), b = ax(-1);
  for (let k = 0; k < 6; k++) {
    assert.notEqual(a[k], a[(k + 1) % 6]);
    assert.notEqual(a[k], b[k]);
  }
});

test('metilciclohexano: ecuatorial 1,7 kcal/mol más estable (Tabla 3.3)', () => {
  const s = [{ carbono: 0, texto: 'CH₃', pos: 'ax' }];
  assert.equal(analizarSilla(s, ax(1)).energia, 1.7);
  assert.equal(analizarSilla(girarSilla(s), ax(-1)).energia, 0);
});

test('el giro de silla conserva la cara (cis/trans) de cada sustituyente', () => {
  const s = [{ carbono: 0, texto: 'CH₃', pos: 'ax' }, { carbono: 2, texto: 'CH₃', pos: 'eq' }];
  const a = analizarSilla(s, ax(1)).arriba;
  const b = analizarSilla(girarSilla(s), ax(-1)).arriba;
  assert.deepEqual(a, b);
});

test('cis-1,3-dimetilciclohexano: diecuatorial frente a diaxial (con interacción 1,3-diaxial)', () => {
  // en C1 y C3 el axial apunta igual: ambos axiales = misma cara = cis
  const diax = [{ carbono: 0, texto: 'CH₃', pos: 'ax' }, { carbono: 2, texto: 'CH₃', pos: 'ax' }];
  const r = analizarSilla(diax, ax(1));
  assert.equal(r.arriba[0], r.arriba[1]);
  assert.ok(r.energia > 2 * 1.7);
  assert.equal(analizarSilla(girarSilla(diax), ax(-1)).energia, 0);
});
