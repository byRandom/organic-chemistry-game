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
| 2 | Mundos 1-4 | Mundo 1 ✅ · 2-4 pendientes |
| 3-7 | Ver el documento de diseño | Pendiente |

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
js/render/     dibujo de moléculas en SVG
js/puzzles/    tipos de puzle y validación de respuestas
js/app/        pantallas, enrutador, progreso, diálogos, PWA
content/qo1/   mundos, niveles y fichas (datos JSON)
tests/         tests con Node (node --test)
```

### Añadir niveles

Los niveles son datos en `content/qo1/mundo-XX.json`. Hay ejemplos de todos los tipos en `mundo-01.json`:
`construir`, `descubrir`, `isomeros`, `test` y `secuencia` (jefes). Los tests comprueban automáticamente que cada nivel tiene una solución válida.

## Publicar en GitHub Pages

1. El repositorio tiene que ser **público** (o tu cuenta, GitHub Pro).
2. En GitHub: *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
3. Cada push a `main` ejecuta los tests y publica en `https://<usuario>.github.io/organic-chemistry-game/`.

## Aviso

Proyecto de estudio no oficial. Los textos y puzles son originales. El material de la UNED (libro, guía, PEC y exámenes) **no** se incluye en este repositorio.

RDKit se distribuye bajo licencia BSD (ver `vendor/rdkit/README.md`).
