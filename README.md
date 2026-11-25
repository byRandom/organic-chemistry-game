# Protocolo Kekulé · Química Orgánica I

**Un juego de puzles para aprender química orgánica jugando.** Gratis, en español, en el móvil y sin conexión.

▶️ **Jugar:** <https://byrandom.github.io/organic-chemistry-game/>

Despiertas del criosueño en la nave colonia *Ouroboros*. Su inteligencia artificial, **K.E.K.U.L.É.**, ha perdido el módulo de química orgánica, y sin él la nave no puede fabricar combustible, medicinas ni materiales. Tienes que ayudarla a reaprenderlo todo desde el átomo de carbono, sección a sección, hasta reparar la nave antes de llegar al planeta.

Está pensado para estudiar la asignatura **Química Orgánica I** del Grado en Química de la UNED, pero sirve a cualquiera que esté aprendiendo química orgánica.

## Cómo se juega

- **Primero el puzle, después la teoría.** Cada concepto se descubre resolviendo un reto. Al superarlo, la explicación se guarda en la **bitácora** para repasarla cuando quieras.
- **Dibujas moléculas con el dedo** en un editor táctil, y el juego comprueba la química de verdad: valencias, isómeros, configuración R/S, cis/trans y E/Z.
- **Sin castigos.** Equivocarte no te bloquea. Solo cambia las estrellas que consigues (de una a tres).
- **Dificultad progresiva.** Se empieza contando enlaces del metano y se acaba planeando síntesis de varios pasos, con un **jefe** al final de cada sección de la nave.

### Tipos de puzle

| | Puzle | Qué practicas |
|---|---|---|
| 🧱 | Construir | Formular a partir del nombre, encontrar todos los isómeros |
| 🪞 | Estereo | Centros quirales, R/S, proyecciones de Fischer, Newman y caballete |
| 🪑 | Conformación | Conformaciones de Newman y sillas del ciclohexano |
| ⚗️ | Reacción | Mecanismo (SN1, SN2, E1, E2) y producto mayoritario con su estereoquímica |
| 🧩 | Esquema | Completar secuencias de reacciones A → B → C |
| 🔬 | Síntesis | Elegir los reactivos para llegar de una molécula a otra, al estilo de los juegos de programación |
| ✅ | Razonar | Preguntas razonadas con explicación |

En la bitácora también hay **simulacros de evaluación**: preguntas como las de examen, con otras moléculas, en orden aleatorio y con nota final por temas.

## Contenido

Cada sección de la nave es un tema del programa:

| | Sección de la nave | Tema | |
|---|---|---|---|
| 1 | Bahía de criosueño | Introducción a la química orgánica | ✅ |
| 2 | Depósitos de combustible | Alcanos | ✅ |
| 3 | Hangar de estructuras | Cicloalcanos | ✅ |
| 4 | Laboratorio de espejos | Estereoisomería | ✅ |
| 5 | Enfermería | Sustitución nucleófila | ✅ |
| 6 | Planta de polímeros | Reacciones de eliminación | ✅ |
| 7 | Destilería | Alcoholes | En desarrollo |
| 8 | Sala de anestesia | Éteres y epóxidos | En desarrollo |
| 9 | Invernaderos | Alquenos | Próximamente |
| 10 | Fábrica de caucho | Dienos | Próximamente |
| 11 | Puente de mando | Alquinos | Próximamente |
| ★ | Reactor | Laboratorio final: síntesis de moléculas reales | Próximamente |

## Instalarlo en el móvil

Abre el enlace de **Jugar** en el navegador del móvil y:

- **Android (Chrome):** menú ⋮ → *Instalar aplicación* (o *Añadir a pantalla de inicio*).
- **iPhone (Safari):** botón *Compartir* → *Añadir a pantalla de inicio*.

Una vez instalado funciona **sin conexión**. Tu progreso se guarda solo en tu dispositivo: no hay cuentas ni se envían datos a ningún sitio.

## Para desarrolladores

Es una web estática (HTML, CSS y JavaScript sin compilación). La química se valida con [RDKit.js](https://www.rdkit.org/) en WebAssembly, y encima hay un motor propio de estereoquímica y de reacciones.

Necesitas Node 20 o superior (solo para los tests) y Python 3, o cualquier otro servidor estático.

```sh
npm run serve       # http://localhost:8080
npm test            # tests del motor químico y del contenido
npm run precache    # actualiza la lista de archivos del modo sin conexión
```

Después de cambiar cualquier archivo de la app, ejecuta `npm run precache`. Si se te olvida, el test `precache` falla.

**Los niveles son datos.** Cada sección de la nave es un archivo `content/qo1/mundo-XX.json`, y en los primeros mundos hay ejemplos de todos los tipos de puzle. Los tests comprueban que cada nivel tiene una solución válida y que las respuestas son químicamente correctas. Por ejemplo, ejecutan las reacciones con el motor y comprueban que sale el producto esperado. Si el ejercicio no evalúa la nomenclatura, usa el campo `referencias` para que los compuestos del enunciado aparezcan dibujados.

El diseño completo del juego (historia, mundos, tipos de puzle y plan de desarrollo) está en [`docs/DISENO.md`](docs/DISENO.md).

```
js/chem/      grafo molecular, RDKit, estereoquímica, conformaciones y reacciones
js/editor/    editor de moléculas táctil
js/render/    dibujo de moléculas y proyecciones en SVG
js/puzzles/   tipos de puzle y validación
js/app/       pantallas, progreso y PWA
content/qo1/  mundos, niveles y fichas de la bitácora
tests/        tests (node --test)
```

¿Has encontrado un error químico o un fallo? Abre una *issue*.

## Licencia

© 2026 Tomás Pérez Villares. Código y contenido bajo licencia **[Creative Commons Atribución-NoComercial-CompartirIgual 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es)** (CC BY-NC-SA 4.0). Ver [`LICENSE`](LICENSE).

- **Atribución:** cita al autor e indica si has hecho cambios.
- **NoComercial:** no se puede usar con fines comerciales. Para cualquier uso comercial, pide permiso.
- **CompartirIgual:** las versiones modificadas deben distribuirse con la misma licencia.

Excepción: RDKit (`vendor/rdkit/`) mantiene su licencia BSD de 3 cláusulas.

## Aviso

Proyecto personal de estudio, **no oficial** y sin relación con la UNED. Los textos, la historia y los puzles son originales. Este repositorio **no** incluye material de la UNED (libro, guía, pruebas de evaluación ni exámenes), y ese material no está cubierto por la licencia.
