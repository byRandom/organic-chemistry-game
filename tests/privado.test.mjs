// Contenido privado cifrado (PEC reales). Solo se comprueba si se conoce el código:
//   PK_CODIGO="..." npm test
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadRDKitNode, root } from './helpers.mjs';
import { revisarNivel } from './revisar.mjs';
import { descifrar } from '../js/app/cifrado.js';

const dir = path.join(root, 'content/qo1/privado');
const indicePath = path.join(dir, 'indice.json');
const archivos = existsSync(indicePath) ? JSON.parse(readFileSync(indicePath, 'utf8')).archivos : [];

test('los archivos privados están cifrados y no son legibles', () => {
  for (const a of archivos) {
    const p = JSON.parse(readFileSync(path.join(dir, a), 'utf8'));
    assert.equal(p.kdf, 'PBKDF2-SHA256');
    assert.ok(p.iteraciones >= 100000);
    assert.ok(!/pregunt|smiles|enunciado/i.test(p.datos), `${a} parece contener texto en claro`);
  }
});

test('contenido privado válido (solo con PK_CODIGO)', { skip: !process.env.PK_CODIGO }, async () => {
  await loadRDKitNode();
  for (const a of archivos) {
    const prueba = await descifrar(JSON.parse(readFileSync(path.join(dir, a), 'utf8')), process.env.PK_CODIGO);
    assert.ok(prueba, `${a}: el código no abre el archivo`);
    for (const p of prueba.preguntas) p.variantes.forEach((v, k) => revisarNivel({ titulo: p.titulo, ...v }, { fichas: {} }, `${prueba.id}/${p.id}/v${k + 1}`));
  }
});
