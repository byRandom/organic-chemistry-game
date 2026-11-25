// Comprueba que todo el contenido es coherente y que cada puzle tiene solución válida.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadRDKitNode, root } from './helpers.mjs';
import { molFromSmiles, canonical } from '../js/chem/rdkit.js';
import { comprobarConstruccion, comprobarIsomero } from '../js/puzzles/validate.js';
import { fischer, newman, relacion, esMeso } from '../js/chem/stereo.js';
import { perfilNewman, analizarSilla, girarSilla } from '../js/chem/conformacion.js';
import { geometriaSilla } from '../js/render/proyecciones.js';

function revisarRepr(spec, donde) {
  if (!spec) return;
  const repr = spec.repr || 'cuña';
  assert.ok(molFromSmiles(spec.smiles), `${donde}: SMILES no válido ${spec.smiles}`);
  if (repr === 'fischer') fischer(spec.smiles, { invertir: spec.invertir });
  if (repr === 'newman' || repr === 'caballete') newman(spec.smiles, { giro: spec.giro, inicio: spec.inicio, enlace: spec.enlace });
}

before(async () => { await loadRDKitNode(); });

const dir = path.join(root, 'content/qo1');
const indice = JSON.parse(readFileSync(path.join(dir, 'mundos.json'), 'utf8'));
const mundos = indice.mundos.filter((m) => m.archivo).map((m) => ({ ...m, ...JSON.parse(readFileSync(path.join(dir, m.archivo), 'utf8')) }));

function revisarNivel(n, mundo, ruta) {
  const donde = `${ruta} (${n.tipo})`;
  if (n.ficha) assert.ok(mundo.fichas?.[n.ficha], `${donde}: ficha "${n.ficha}" no existe`);
  if (n.inicial) assert.ok(molFromSmiles(n.inicial, { keepH: true }), `${donde}: SMILES inicial no válido`);
  const obj = n.objetivo || {};
  for (const k of Object.keys(obj.errores || {})) assert.ok(canonical(k), `${donde}: SMILES de error no válido ${k}`);

  switch (n.tipo) {
    case 'construir': {
      assert.ok(obj.smiles?.length || obj.formula, `${donde}: falta objetivo`);
      const sol = obj.smiles?.[0];
      if (sol) {
        const m = molFromSmiles(sol, { keepH: obj.hExplicitos != null });
        const r = comprobarConstruccion(m, obj);
        assert.ok(r.ok, `${donde}: la solución ${sol} no pasa su propia validación: ${r.msg}`);
        for (const k of Object.keys(obj.errores || {})) {
          assert.ok(!comprobarConstruccion(molFromSmiles(k), obj).ok, `${donde}: el error ${k} se acepta como correcto`);
        }
      }
      if (obj.hExplicitos != null) {
        const m = molFromSmiles('[H]C([H])([H])[H]', { keepH: true });
        assert.ok(comprobarConstruccion(m, obj).ok, `${donde}: metano con H explícitos no pasa`);
        assert.ok(!comprobarConstruccion(molFromSmiles('C'), obj).ok, `${donde}: metano sin H explícitos no debería pasar`);
      }
      break;
    }
    case 'descubrir':
      assert.ok(obj.evento, `${donde}: falta evento`);
      break;
    case 'isomeros': {
      const sols = Object.keys(obj.nombres || {});
      assert.equal(sols.length, obj.total, `${donde}: hay ${sols.length} soluciones con nombre y total=${obj.total}`);
      const encontrados = [];
      for (const s of sols) {
        const r = comprobarIsomero(molFromSmiles(s), obj, encontrados);
        assert.ok(r.ok, `${donde}: ${s} no se acepta: ${r.msg}`);
        encontrados.push(r.canon);
      }
      assert.equal(new Set(encontrados).size, obj.total, `${donde}: soluciones repetidas`);
      break;
    }
    case 'test':
      assert.ok(n.preguntas?.length, `${donde}: sin preguntas`);
      n.preguntas.forEach((p, k) => {
        assert.ok(p.correcta >= 0 && p.correcta < p.opciones.length, `${donde} p${k + 1}: índice correcto fuera de rango`);
        if (p.smiles) {
          const m = molFromSmiles(p.smiles);
          assert.ok(m, `${donde} p${k + 1}: SMILES no válido`);
          for (const i of p.resaltar || []) assert.ok(i < m.atoms.length, `${donde} p${k + 1}: átomo resaltado ${i} no existe`);
        }
        for (const o of p.opciones) if (o.smiles) assert.ok(molFromSmiles(o.smiles), `${donde} p${k + 1}: opción ${o.smiles} no válida`);
        revisarRepr(p.repr, `${donde} p${k + 1}`);
        if (p.par) {
          p.par.forEach((spec) => revisarRepr(spec, `${donde} p${k + 1}`));
          // la respuesta marcada como correcta debe coincidir con la relación calculada
          const rel = relacion(p.par[0].smiles, p.par[1].smiles);
          const txt = (o) => (typeof o === 'string' ? o : o.texto).toLowerCase();
          assert.ok(txt(p.opciones[p.correcta]).startsWith(rel), `${donde} p${k + 1}: la relación real es «${rel}»`);
        }
        if (p.esMeso != null) assert.equal(esMeso(p.repr?.smiles ?? p.smiles), p.esMeso, `${donde} p${k + 1}: esMeso no coincide`);
      });
      break;
    case 'quirales': {
      const m = molFromSmiles(n.smiles.replace(/[@/\\]/g, ''));
      assert.ok(m.centros.length > 0 || n.ninguno, `${donde}: sin centros quirales`);
      if (n.centrosEsperados != null) assert.equal(m.centros.length, n.centrosEsperados, `${donde}: número de centros`);
      break;
    }
    case 'rs': {
      const m = molFromSmiles(n.smiles);
      assert.ok(Object.keys(m.cip || {}).length, `${donde}: el SMILES no define configuración`);
      revisarRepr({ smiles: n.smiles, repr: n.repr, giro: n.giro, inicio: n.inicio }, donde);
      break;
    }
    case 'fischer':
      revisarRepr({ smiles: n.smiles, repr: 'fischer', invertir: n.invertir }, donde);
      revisarRepr({ smiles: n.smiles, repr: n.desde || 'cuña', giro: n.giro, inicio: n.inicio }, donde);
      break;
    case 'newman': {
      assert.equal(n.delante.length, 3, `${donde}: 3 grupos delante`);
      assert.equal(n.detras.length, 3, `${donde}: 3 grupos detrás`);
      const e = perfilNewman(n.delante, n.detras).map((x) => x.e);
      const t = n.objetivo.tipo;
      if (t === 'min' || t === 'max') {
        const objetivo = t === 'min' ? Math.min(...e) : Math.max(...e);
        assert.equal(e.filter((x) => x === objetivo).length >= 1, true);
        const ini = perfilNewman(n.delante, n.detras).find((x) => x.giro === (n.giroInicial ?? 60)).e;
        assert.notEqual(ini, objetivo, `${donde}: la posición inicial ya es la solución`);
      }
      break;
    }
    case 'silla': {
      // existe una colocación que cumple la relación y es la más estable
      const subs0 = n.sustituyentes;
      let ok = false;
      const pos = ['ax', 'eq'];
      for (let mask = 0; mask < 2 ** subs0.length; mask++) {
        const subs = subs0.map((s2, i) => ({ ...s2, pos: pos[(mask >> i) & 1] }));
        const ax = geometriaSilla(1).map((g) => g.axArriba);
        const r = analizarSilla(subs, ax);
        if (n.relacion && subs.length >= 2 && (r.arriba[0] === r.arriba[1] ? 'cis' : 'trans') !== n.relacion) continue;
        const otra = analizarSilla(girarSilla(subs), ax.map((x) => !x)).energia;
        if ((n.objetivo || 'estable') === 'estable' ? r.energia <= otra : r.energia >= otra) ok = true;
      }
      assert.ok(ok, `${donde}: no hay ninguna colocación válida`);
      break;
    }
    case 'secuencia':
      assert.ok(n.pasos?.length, `${donde}: sin pasos`);
      n.pasos.forEach((p, k) => revisarNivel(p, mundo, `${ruta}/paso${k + 1}`));
      break;
    default:
      assert.fail(`${donde}: tipo desconocido`);
  }
}

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
