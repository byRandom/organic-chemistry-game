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
import { reaccionar } from '../js/chem/reacciones.js';
import { REACTIVOS } from '../js/chem/reactivos.js';
import { ejecutarPrograma, coincide } from '../js/puzzles/reaccion.js';

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
    case 'reaccion': {
      assert.ok(REACTIVOS[n.reactivo], `${donde}: reactivo desconocido ${n.reactivo}`);
      const r = reaccionar(n.sustrato, n.reactivo);
      if (n.noReacciona) { assert.equal(r.ok, false, `${donde}: debería no reaccionar`); break; }
      assert.ok(r.ok, `${donde}: no reacciona: ${r.mensaje}`);
      const mayor = r.productos.find((p) => p.papel !== 'minoritario');
      if (n.esperado) assert.ok(coincide(mayor.smiles, n.esperado), `${donde}: el motor da ${mayor.smiles} y se esperaba ${n.esperado}`);
      if (n.mecanismo) assert.equal(r.mecanismo, n.mecanismo, `${donde}: mecanismo`);
      if (n.racemico != null) assert.equal(!!mayor.racemico, n.racemico, `${donde}: racémico`);
      if (n.transposicion != null) assert.equal(r.transposicion, n.transposicion, `${donde}: transposición`);
      break;
    }
    case 'sintesis': {
      n.reactivos.forEach((id) => assert.ok(REACTIVOS[id], `${donde}: reactivo ${id}`));
      assert.ok(n.solucion?.length, `${donde}: falta la solución de referencia`);
      const { final } = ejecutarPrograma(n.partida, n.solucion);
      assert.ok(coincide(final, n.objetivo), `${donde}: la solución da ${final} y no ${n.objetivo}`);
      if (n.optimo) assert.ok(n.solucion.length <= n.optimo, `${donde}: la solución es más larga que el óptimo`);
      break;
    }
    case 'esquema': {
      let prev = n.cadena[0].smiles;
      n.flechas.forEach((f, k) => {
        const sig = n.cadena[k + 1];
        if (f.reactivo) {
          const r = reaccionar(prev, f.reactivo);
          assert.ok(r.ok, `${donde}: paso ${k + 1} no reacciona`);
          const p = r.productos.find((x) => x.papel !== 'minoritario').smiles;
          if (sig.smiles) assert.ok(coincide(p, sig.smiles), `${donde}: paso ${k + 1} da ${p}`);
          if (sig.esperado) assert.ok(coincide(p, sig.esperado), `${donde}: ${sig.letra} es ${p}, no ${sig.esperado}`);
          prev = sig.smiles || p;
        } else {
          assert.ok(sig.smiles, `${donde}: tras un reactivo incógnita la molécula debe ser conocida`);
          const vale = n.reactivos.filter((id) => {
            const r = reaccionar(prev, id);
            return r.ok && coincide(r.productos.find((x) => x.papel !== 'minoritario').smiles, sig.smiles);
          });
          assert.ok(vale.length, `${donde}: ningún reactivo disponible lleva al paso ${k + 1}`);
          if (f.esperado) assert.ok(vale.includes(f.esperado), `${donde}: ${f.letra} debería ser ${f.esperado}`);
          prev = sig.smiles;
        }
      });
      break;
    }
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
