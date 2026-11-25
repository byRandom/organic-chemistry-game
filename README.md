# Protocolo Kekulé · Química Orgánica I

Juego de puzles para estudiar **Química Orgánica I** (Grado en Química, UNED). Despiertas en la nave colonia *Ouroboros*, cuya IA, K.E.K.U.L.É., ha perdido su módulo de química orgánica, y tienes que ayudarla a reaprenderla desde el átomo de carbono. Cada sección de la nave es un tema del programa.

- Se instala en el móvil (PWA) y funciona **sin conexión**.
- No necesita compilación: HTML, CSS y JavaScript estáticos, publicados en GitHub Pages.
- La química se valida con [RDKit.js](https://www.rdkit.org/) (WebAssembly).

El diseño completo y las fases de desarrollo están en [`docs/DISENO.md`](docs/DISENO.md).

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 0 | PWA instalable, sin conexión, despliegue en GitHub Pages | ✅ |
| 1 | Editor de moléculas táctil, puzles «construir» y «razonar», historia y bitácora | ✅ |
| 2 | Mundos 1-4 (estructura, conformaciones y estereoquímica) | ✅ |
| 3 | Mundos 5-6 (SN1/SN2, E1/E2), motor de reacciones y puzles de síntesis · lienzo oscuro | ✅ |
| 4-7 | Ver el documento de diseño | Pendiente |

## Desarrollo

Requisitos: Node 20+ (solo para los tests) y Python 3 (o cualquier servidor estático).

```sh
npm run serve       # http://localhost:8080
npm test            # tests del motor químico y del contenido
npm run precache    # regenera la lista de archivos para el modo sin conexión
```

> Después de modificar cualquier archivo de la app, ejecuta `npm run precache`. El test `precache` falla si se te olvida, y así la versión publicada se actualiza en los móviles.

### Estructura

```
index.html, manifest.webmanifest, sw.js   PWA
js/chem/       grafo molecular, valencias, SMILES y envoltorio de RDKit
js/editor/     editor de moléculas táctil y barra de herramientas
js/chem/stereo.js        R/S, Fischer, Newman y caballete que respetan la configuración real
js/chem/conformacion.js  energías de Newman y sillas (valores del texto base)
js/chem/reacciones.js    motor de reacciones SN1/SN2/E1/E2 con estereoquímica (Tabla 6.1)
js/chem/reactivos.js     catálogo de reactivos (las cartas de la caja de herramientas)
js/render/     dibujo de moléculas en SVG y proyecciones (Fischer, Newman, caballete, silla)
js/puzzles/    tipos de puzle y validación de respuestas
js/app/        pantallas, enrutador, progreso, diálogos, PWA
content/qo1/   mundos, niveles y fichas (datos JSON)
tests/         tests con Node (node --test)
dev/           páginas de prueba visual para desarrollo (no se publican)
```

### Añadir niveles

Los niveles son datos en `content/qo1/mundo-XX.json`. Hay ejemplos de todos los tipos en `mundo-01.json`:
`construir`, `descubrir`, `isomeros`, `test` y `secuencia` (jefes). Los Mundos 2-4 añaden
`newman`, `silla`, `quirales`, `rs` y `fischer`, y las preguntas `test` admiten ilustraciones
(`repr`, `par`, `silla`, `newman`). En las preguntas con `par` los tests comprueban
automáticamente que la relación marcada como correcta (idénticos, enantiómeros o
diastereoisómeros) es la real. Los Mundos 5-6 añaden `reaccion`, `esquema` y `sintesis`: cada
nivel indica el producto esperado (o la solución de referencia) y los tests comprueban que el
motor de reacciones lo reproduce. Los tests comprueban automáticamente que cada nivel tiene una solución válida.

### Contenido privado cifrado

`content/qo1/privado/` guarda contenido que no debe ser público (las PEC reales del curso, ya entregadas) **cifrado** con AES-256-GCM. Se desbloquea desde *Ajustes → Códigos*. Para cifrar un archivo nuevo:

```sh
PK_CODIGO="el código" node tools/cifrar-privado.mjs pec.json content/qo1/privado/pec.enc.json
```

y añadirlo a `content/qo1/privado/indice.json`. El archivo en claro **nunca** se sube al repositorio. Con `PK_CODIGO` definido, `npm test` también valida el contenido descifrado.

## Publicar en GitHub Pages

1. El repositorio tiene que ser **público** (o tu cuenta, GitHub Pro).
2. En GitHub: *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. Cada push a `main` ejecuta los tests y publica en `https://<usuario>.github.io/organic-chemistry-game/`.

## Licencia

© 2026 Tomás Pérez Villares. Código y contenido bajo licencia **[Creative Commons Atribución-NoComercial-CompartirIgual 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es)** (CC BY-NC-SA 4.0). Ver [`LICENSE`](LICENSE).

- **Atribución:** cita al autor e indica si has hecho cambios.
- **NoComercial:** no se puede usar con fines comerciales. Para cualquier uso comercial, pide permiso.
- **CompartirIgual:** las versiones modificadas deben distribuirse con la misma licencia.

Excepción: RDKit (`vendor/rdkit/`) mantiene su licencia BSD de 3 cláusulas.

## Aviso

Proyecto de estudio no oficial. Los textos y puzles son originales. El material de la UNED (libro, guía, PEC y exámenes) **no** se incluye en este repositorio ni está cubierto por la licencia.
