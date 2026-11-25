# Documento de diseño — *Protocolo Kekulé* (Química Orgánica I)

> Título provisional. Versión 0.1 · 25 de noviembre de 2026 · Estado: **borrador para aprobar**

---

## 1. Visión

Un juego de puzles para estudiar **Química Orgánica I (UNED, código 6103205)** desde cero hasta nivel de examen. La dificultad sube poco a poco.

La inspiración es *Turing Complete*. Allí empiezas con una puerta lógica y acabas construyendo un ordenador. Aquí empiezas con un átomo de carbono y acabas diseñando síntesis de varios pasos de moléculas reales, como feromonas o aditivos industriales. Cada concepto que dominas se convierte en una **herramienta** que necesitarás más adelante.

**Frase guía:** *«Si puedes superar el juego, puedes aprobar el examen».*

**Aprender jugando:** el juego no empieza con teoría. Cada concepto nuevo se presenta como un **puzle o un reto** donde descubres la regla por ti mismo. Solo después de resolverlo se desbloquea la ficha que le pone nombre a lo que acabas de descubrir. Ver §3.1.

### Pilares de diseño

1. **Fiel al temario.** Cada mundo es un tema del programa oficial, en el mismo orden que la guía. La notación y los nombres son los del texto base (por ejemplo «oxaciclopropano», «regla de Saytzeff», «2-butanol»).
2. **Puzles con forma de examen.** Cada tipo de puzle entrena un tipo de pregunta real de la prueba presencial o de las PEC.
3. **Química correcta, también en 3D.** El juego valida estereoquímica (R/S, *cis/trans*, *E/Z*, *sin/anti*, inversión, racemización). Si el juego aceptara una respuesta que en el examen es incorrecta, el juego habría fallado.
4. **Aprender del error.** Una respuesta incorrecta no es solo un «✗». El juego enseña qué producto se obtiene realmente y por qué; por ejemplo, «obtienes una mezcla, porque los haluros secundarios con base fuerte compiten entre SN2 y E2».
5. **Funciona en el bolsillo.** Es una PWA instalable en el móvil, funciona sin conexión y se puede jugar con el dedo.

---

## 1.1 Historia: *Protocolo Kekulé*

> Propuesta original. El tono es parecido a *Turing Complete* (una situación absurda que te obliga a aprender desde cero), pero con otro planteamiento.

### Premisa
Año 2412. Despiertas de la criosueño a bordo de la **nave colonia *Ouroboros***, en ruta hacia un planeta habitable. Algo ha salido mal: una tormenta solar ha **borrado el módulo de química orgánica** de la IA de la nave, **K.E.K.U.L.É.** (*Kernel Experimental de Química Universal y Lógica Estructural*). Sin ese módulo, las **biofábricas** de la nave no pueden sintetizar nada: ni combustible, ni medicamentos, ni plásticos, ni refrigerante para el reactor.

Eres la única persona despierta. Y, para desgracia de todos, has estudiado química.

K.E.K.U.L.É. ha decidido que la única forma de recuperar su módulo es **reaprenderlo contigo**, desde el átomo de carbono. Lo que tú resuelves, la IA lo reincorpora. Pero no se fía: te pondrá a prueba en cada paso antes de entregarte el control de cada sección de la nave.

### Personaje: K.E.K.U.L.É.
- Una IA seca, pedante y algo dramática, con un humor muy de laboratorio. Le encanta citar «sus» descubrimientos, que en realidad son de químicos históricos que va recordando poco a poco.
- Tiene **lagunas** de memoria que se rellenan cuando superas un mundo: «Ah. Ahora recuerdo por qué los carbocationes terciarios son más estables. Hiperconjugación. Qué vergüenza haberlo olvidado».
- Detalle oculto: la IA sueña con una serpiente que se muerde la cola. Es la anécdota del sueño de Kekulé con el benceno, y deja preparado el gancho para la segunda parte (QO II, aromáticos).

### Cada mundo es una sección de la nave
Cada sección recuperada tiene **una consecuencia visible** en la nave y en el mapa.

| Mundo | Sección de la nave | Lo que recuperas |
|---|---|---|
| 1 Átomo de carbono | **Bahía de criosueño** | Te despiertas y la IA te hace las primeras pruebas: «¿cuántos enlaces forma el carbono?» |
| 2 Alcanos | **Depósitos de combustible** | Combustibles y cadenas; la halogenación como primera reacción |
| 3 Cicloalcanos | **Hangar de estructuras** | Materiales y anillos; tensión y estabilidad |
| 4 Estereoisomería | **Laboratorio de espejos** | Simulación de «el mundo al revés»: las moléculas quirales y su imagen especular |
| 5 Sustitución | **Enfermería** | Primeras síntesis útiles: intercambiar grupos |
| 6 Eliminación | **Planta de polímeros** | Fabricar alquenos, la materia prima de los plásticos |
| 7 Alcoholes | **Destilería y laboratorio de disolventes** | Disolventes, Grignard y construir enlaces C–C |
| 8 Éteres y epóxidos | **Sala de anestesia** | Éteres (dietiléter como anestésico histórico), epóxidos |
| 9 Alquenos | **Invernaderos** | Química del doble enlace; feromonas para proteger los cultivos |
| 10 Dienos | **Fábrica de caucho** | Polímeros de dienos y Diels-Alder para construir anillos |
| 11 Alquinos | **Puente de mando** | Acetileno y alquinos; la IA recupera los sistemas de navegación |
| ★ Laboratorio final | **Reactor y aproximación al planeta** | Síntesis reales: MTBE (combustible), etilenglicol (refrigerante del reactor), disparlure y muscalure (control de plagas en la colonia) |

### Final de la primera parte y gancho para la segunda
Al superar el Laboratorio final, la nave entra en órbita del planeta. K.E.K.U.L.É. ha recuperado su módulo de **Química Orgánica I**… y descubre que el planeta está lleno de **anillos aromáticos** que no sabe manejar. *Continuará en Química Orgánica II: el aterrizaje* (aromáticos, carbonilos, fármacos reales).

### Cómo se cuenta
- **Breve y opcional.** Unas pocas líneas de diálogo al empezar y al acabar cada mundo y en los jefes. Nunca más de unos segundos y siempre se pueden saltar.
- **Registros de la nave.** Mensajes de la tripulación dormida y documentos que se van encontrando en el mapa. Aportan curiosidades químicas reales (por qué el mentol da frío, cómo funciona el anticongelante…).
- **Jefes con contexto.** Cada jefe es una **emergencia** de la sección: «El depósito de combustible se ha contaminado con un isómero. Identifica los 8 isómeros de C₅H₁₁Br antes de que…».
- La historia **no interfiere con el estudio**: en modo estudio y en el modo Examen se puede desactivar.

---

## 2. Base académica

| Fuente | Uso en el juego |
|---|---|
| **Guía de estudio 2026/27** | Estructura de mundos, resultados de aprendizaje y horas por tema (para dimensionar cada mundo) |
| **Texto base**: *Química Orgánica*, Cabildo, García, López y Santa María (UNED, 2011), temas 1-8 y 10-12 | Contenido teórico, notación y modelo de los puzles a partir de los *ejercicios de autocomprobación* |
| **PEC-1 y PEC-2 (2026/27)** | Tipos de pregunta y nivel de dificultad. La PEC-1 cubre los temas 1-6 y la PEC-2 los temas 7-11 |
| **Exámenes 2022 y 2023** (1.ª y 2.ª semana) | Jefes de mundo y modo Examen |
| **Introducción a la nomenclatura IUPAC** (Alvarado, UCR) | Material de apoyo para los puzles de nomenclatura |

**Derechos de autor.** El material de la UNED **no se incluye en el repositorio**. Las explicaciones y los puzles del juego son originales: están *inspirados* en el tipo de ejercicio, pero no copian enunciados ni figuras.

### Formato del examen (según la guía)

Son 5 preguntas de desarrollo de 2 puntos cada una, en 2 horas y sin material. Los tipos de pregunta habituales son:

1. Formular los productos de una reacción
2. Completar esquemas de reacciones (A → B → C)
3. Síntesis sencillas a partir de un material de partida
4. Razonar o justificar (reactividad, acidez, estabilidad, mecanismos)
5. Representar en una proyección (Fischer, Newman, caballete, silla)

Fechas clave del curso 2026/27: **PEC-1 el 30/11/2026** · **PEC-2 el 04/01/2027** · prueba presencial en la convocatoria de enero/febrero.

---

## 3. Estructura del juego: los mundos

Hay 11 mundos, uno por tema del programa. Cada mundo es una sección de la nave (§1.1), tiene entre 8 y 15 niveles y termina con un **Jefe**, un nivel de estilo examen que combina todo lo del mundo. Superar al Jefe desbloquea el mundo siguiente.

| # | Mundo | Tema del libro (págs. PDF) | Horas en la guía | Mecánicas principales | Herramientas que desbloquea |
|---|---|---|---|---|---|
| 1 | **El átomo de carbono** | T1 (16-44) | 4,3 | Construir moléculas por hibridación sp³/sp²/sp, reconocer grupos funcionales, estructuras de resonancia, efectos inductivo y conjugativo (+I/−I, +M/−M), tipos de isomería | El editor de moléculas |
| 2 | **Alcanos** | T2 (45-74) | 8,5 | Nomenclatura IUPAC, caza de isómeros, Newman de máxima y mínima energía (etano, butano), estabilidad de radicales, halogenación radicalaria (selectividad Br frente a Cl) | Br₂/hν, Cl₂/hν, Wurtz (Na), Corey-House (R₂CuLi), Zn/HCl, H₂/Pt |
| 3 | **Cicloalcanos** | T3 (75-103) | 10,3 | Tensión de anillo, sillas con posiciones axial/ecuatorial, isómeros *cis/trans*, la silla más estable, policíclicos (biciclo[x.y.z], decalina, norbornano, adamantano) | Herramienta «silla» |
| 4 | **Estereoisomería** | T4 (104-131) | 12,2 | Marcar centros quirales, reglas CIP y R/S, proyecciones de Fischer, Newman y caballete, clasificar parejas (idénticos, enantiómeros o diastereoisómeros), formas *meso*, 2ⁿ estereoisómeros | Herramienta «proyección» |
| 5 | **Sustitución nucleófila** | T5 (132-164) | 12,2 | SN1 frente a SN2: sustrato, nucleófilo, grupo saliente y disolvente; inversión frente a racemización; estabilidad de carbocationes y **transposiciones** | NaOH, NaCN/DMSO, NaN₃/DMF, NaI/acetona, CH₃SNa, NH₃, H₂O/ROH (solvólisis) |
| 6 | **Eliminación** | T6 (165-190) | 12,2 | E1 frente a E2, regla de Saytzeff frente a Hofmann, E2 antiperiplanar (lleva al alqueno *E* o *Z*), competencia entre eliminación y sustitución | EtO⁻Na⁺/EtOH, (CH₃)₃CO⁻K⁺, Δ |
| 7 | **Alcoholes** | T7 (191-226) | 12,2 | Acidez (pKa) y alcóxidos; ROH → RX (HX, PBr₃, SOCl₂, PCl₅); deshidratación con transposición; oxidación (1°/2°/3°); NaBH₄ y LiAlH₄; organometálicos | HBr, PBr₃, SOCl₂, PCl₅, H₂SO₄/Δ, CrO₃/piridina (PCC), K₂Cr₂O₇/H⁺, NaBH₄, LiAlH₄, Mg/éter, RLi, carbonilos (HCHO, RCHO, R₂CO, ésteres) |
| 8 | **Éteres y epóxidos** | T8 (227-258) | 8,5 | Síntesis de Williamson (qué combinación funciona y cuál da E2), apertura de epóxidos en **medio básico** (carbono menos sustituido, inversión) y en **medio ácido** (carbono más sustituido), ruptura con HI/HBr, tioles | NaH + RX, RO⁻, H⁺/ROH, HI, RCO₃H, HIO₄ |
| 9 | **Alquenos** | T10 (285-320) | 12,2 | Markovnikov frente a anti-Markovnikov (peróxidos), adiciones *sin* y *anti*, halohidrinas, carbenos, hidrogenación, OsO₄, KMnO₄, ozonólisis, polimerización | HBr, HBr/ROOR, H₂O/H⁺, Hg(OAc)₂/NaBH₄, BH₃ y luego H₂O₂/OH⁻, Br₂, Br₂/H₂O, CH₂I₂/Zn-Cu, H₂/Pd, OsO₄, KMnO₄ (frío/caliente), O₃ y Zn o H₂O₂ |
| 10 | **Dienos** | T11 (321-347) | 10,2 | Dienos aislados, conjugados y acumulados; adición 1,2 frente a 1,4 (control cinético o termodinámico, con la temperatura como parámetro); Diels-Alder (regla *endo*, estereoespecificidad) | HX a T baja/alta, dienófilos (anhídrido maleico, acetilendicarboxilato…) |
| 11 | **Alquinos** | T12 (348-375) | 10,2 | Acidez y acetiluros, alquilación; hidratación y tautomería; hidroboración (Sia₂BH); Lindlar (*Z*) frente a Na/NH₃ (*E*); doble eliminación desde dihalogenuros | NaNH₂ + RX, HgSO₄/H₂SO₄, Sia₂BH, H₂/Lindlar, Na/NH₃(l), 2 NaNH₂, HX (1 y 2 equivalentes), X₂ |
| ★ | **Laboratorio final** | Todo | — | Síntesis largas (mínimo 4-6 pasos) con todo el arsenal. Ver §6 | Toda la caja de herramientas |

### 3.1 Aprender jugando: primero el puzle, después la teoría

En el juego no hay lecciones de teoría al empezar un mundo. Cada concepto nuevo sigue cuatro pasos:

1. **Descubrir.** Un puzle te pone ante el fenómeno **antes de nombrarlo**. El juego deja que intentes cosas y te muestra lo que pasa.
2. **Nombrar.** Cuando lo resuelves, K.E.K.U.L.É. «recuerda» el concepto y se desbloquea su **ficha en la bitácora**: definición, regla y su relación con el tema del libro.
3. **Practicar.** Varios niveles aplican la regla con variaciones.
4. **Dominar.** En el jefe tienes que usar el concepto junto con otros, sin ayuda.

**Ejemplos de puzles de descubrimiento:**

| Concepto | Cómo se descubre |
|---|---|
| Tetravalencia del carbono | Construyes metano. Al intentar unir un 5.º enlace al carbono, el editor se resiste («el carbono se niega»). Ficha: *el carbono forma 4 enlaces* |
| Isomería | Te piden «una molécula C₄H₁₀» y aceptan dos respuestas distintas. Luego te retan a encontrar todas las de C₅H₁₂ |
| Selectividad de la halogenación | Usas Cl₂/hν y obtienes una mezcla «sucia»; con Br₂/hν, un solo producto. Te toca averiguar por qué y ordenar los radicales por estabilidad |
| Quiralidad | Dos moléculas con «el mismo dibujo» que no se pueden superponer por mucho que las gires en 3D. Ficha: *enantiómeros* |
| SN2 frente a SN1 | El mismo reactivo funciona con un haluro primario y «falla» con uno terciario. Cambias el disolvente o el nucleófilo y deduces qué controla el mecanismo |
| Transposición | Esperas un producto y sale otro. Sigues los intermedios hasta ver que el carbocatión «se ha movido» |
| Regla de Markovnikov | Pruebas HBr con varios alquenos y anotas dónde acaba el Br, hasta que puedes predecirlo |
| Lindlar frente a Na/NH₃ | Dos reactivos «hacen lo mismo», pero un detector de la nave distingue *Z* de *E* |

### 3.2 Ritmo dentro de cada mundo

1. **Niveles de descubrimiento** (2-4): un concepto nuevo cada uno, con pistas generosas. Cada uno desbloquea su ficha.
2. **Niveles de práctica** (4-8): combinan ideas y añaden distractores.
3. **Niveles «trampa»** (1-2): parece que funciona la herramienta obvia, pero no. Por ejemplo, NaCN sobre un haluro terciario, o Williamson con el haluro equivocado.
4. **Jefe**: la emergencia de la sección. Es un nivel compuesto que imita una pregunta de examen real, con varios apartados.

La **bitácora** reúne todas las fichas desbloqueadas, junto con el reactivario. Funciona como resumen de estudio del tema.

---

## 4. Tipos de puzle

Cada tipo se corresponde con un tipo de pregunta de examen.

### 4.1 Construir 🧱 — *«Formular o nombrar»*
El juego da un **nombre IUPAC** o una descripción, y tú **dibujas la molécula** en el editor. También existe la variante inversa: el juego muestra una molécula y eliges o escribes su nombre.
- **Variante «caza de isómeros»:** encuentra los N isómeros de una fórmula, por ejemplo C₄H₉Br (4), C₅H₁₁Br (8) o C₄H₁₀O (7). Un marcador muestra cuántos llevas.
- **Validación:** se comparan las estructuras con SMILES canónico (RDKit). Si el puzle pide estereoquímica, se compara también.

### 4.2 Estereo 🪞 — *«Determinar la configuración absoluta»*
- Tocar los centros quirales de una molécula.
- Asignar **R/S** en una representación dada: cuña/raya, **Fischer**, **Newman** o **caballete**.
- **Clasificar parejas** de moléculas: idénticas, enantiómeros, diastereoisómeros o meso.
- **Convertir** de una proyección a otra, por ejemplo de caballete a Fischer, que es el formato de pregunta más repetido.
- **Validación:** las etiquetas CIP se calculan con RDKit y las proyecciones se generan desde la estructura 3D.

### 4.3 Conformación 🪑 — *«Análisis conformacional»*
- **Newman:** girar el carbono trasero (arrastrando) hasta la conformación de mínima o máxima energía. El juego muestra un diagrama de energía en directo.
- **Silla:** colocar los sustituyentes en posiciones axial o ecuatorial, hacer el giro de silla (*ring flip*) y elegir la conformación más estable. También se identifica si un isómero es *cis* o *trans*.
- **Validación:** reglas de valores A (energías de los sustituyentes) e interacciones 1,3-diaxiales y *gauche*.

### 4.4 Reacción ⚗️ — *«Formular los productos»*
Se da un sustrato y unas condiciones, y tú **dibujas el producto mayoritario** con su estereoquímica. Opcionalmente indicas también el mecanismo (SN1, SN2, E1 o E2).

### 4.5 Esquema 🧩 — *«Completar el esquema de reacciones»*
El formato de la pregunta 4 del examen: un esquema con huecos (A, B, C…) que pueden ser **productos** o **reactivos**. Rellenas cada hueco dibujando la molécula o eligiendo el reactivo de tu caja.

### 4.6 Síntesis 🔬 — *«Sintetizar X a partir de Y»* (el corazón tipo Turing Complete)
- Se dan una molécula de **partida** y una molécula **objetivo**.
- Tienes una **caja de reactivos**, con todos los que has desbloqueado hasta ese momento.
- Montas un **programa**, es decir, una secuencia de pasos (reactivo y condiciones).
- Le das a **▶ Ejecutar**: el motor aplica cada paso y muestra el producto real, como un depurador paso a paso.
  - Si un paso da una **mezcla**, el programa se detiene y te explica por qué.
  - Si un paso **no reacciona**, te dice qué faltaba, por ejemplo «PBr₃ no reacciona con alcoholes terciarios».
  - Si el producto es **otro estereoisómero**, te lo marca, por ejemplo «obtienes el *E*, no el *Z*».
- **Puntuación**, al estilo de los histogramas de los juegos de programación:
  - ⭐ conseguirlo
  - ⭐⭐ conseguirlo en ≤ N pasos (el óptimo del diseñador)
  - ⭐⭐⭐ sin pistas y sin intentos fallidos
- Algunos niveles añaden **restricciones** tipo examen: «único reactivo orgánico: acetileno», «usando Williamson», «sin usar HBr».

### 4.7 Mecanismo ↪️ — *«Escribir el mecanismo detallado»*
Se muestra la reacción con sus intermedios en blanco. El jugador:
1. **Coloca flechas curvas** (arrastrando del par de electrones al átomo o al enlace).
2. Indica cargas e intermedios (carbocatión, ion bromonio, ion oxonio…).
3. Si hay **transposición** posible (desplazamiento 1,2 de hidruro o de metilo), debe hacerla para llegar al producto correcto.

El mecanismo se valida contra una secuencia de pasos elementales definida en el nivel. Es el tipo de puzle más caro de crear, así que se introduce en la Fase 4.

### 4.8 Razonar ✅ — *«Verdadero/falso razonado» y ordenar*
- **Verdadero/falso** con elección de la justificación correcta entre varias.
- **Ordenar** por acidez, estabilidad de carbocationes o radicales, reactividad SN1/SN2, o puntos de ebullición.

---

## 5. Progresión y economía

- **Caja de herramientas.** Cada mundo añade reactivos (ver tabla §3). Cada reactivo tiene una **carta** con su nombre, sus condiciones, qué hace, su mecanismo, la estereoquímica y sus limitaciones. Las cartas forman un **reactivario** consultable: es tu chuleta de estudio y además el inventario del juego.
- **Desbloqueo.** Los niveles se desbloquean en orden dentro de cada mundo, y el Jefe abre el mundo siguiente. Un interruptor de **«modo estudio»** desbloquea todo para repasar libremente.
- **Estrellas.** Las estrellas abren niveles extra opcionales y los Retos finales.
- **Repaso espaciado.** Los niveles fallados vuelven a aparecer en un mazo de **«Repaso diario»** (5 minutos, pensado para el móvil).
- **Progreso.** Se guarda en el dispositivo (localStorage/IndexedDB), con exportar e importar a un archivo para pasar el progreso de un dispositivo a otro.

---

## 6. Retos finales y modo Examen

### Laboratorio final: moléculas reales con química de QO I

| Reto | Uso real | Ruta (resumen) | Qué pone a prueba |
|---|---|---|---|
| **MTBE** (terc-butil metil éter) | Antidetonante de gasolinas | Williamson eligiendo bien qué fragmento es el alcóxido | Williamson frente a E2 (está en la PEC-2) |
| **Disparlure** | Feromona de la polilla gitana, usada en trampas de control de plagas | Acetileno → dos alquilaciones → Lindlar (*Z*) → epoxidación | Acetiluros, estereoquímica *cis*, epóxidos |
| **Muscalure** ((*Z*)-9-tricoseno) | Feromona de la mosca común, usada en cebos | Alquilación de alquino → Lindlar | Alquenos *Z* |
| **Mentol** | Saborizante y analgésico | Estereoquímica y silla más estable (3 centros quirales) | Mundos 3 y 4 |
| **Etilenglicol** | Anticongelante | Etileno → epóxido → apertura | Epóxidos |
| *(ampliable)* | | | |

Además hay **jefes de construcción**: moléculas grandes que se dibujan y analizan, como colesterol (8 centros quirales), morfina, testosterona o taxol. La tarea es construirlas, contar sus centros quirales, asignar R/S y encontrar la silla más estable de los anillos.

### Modo Examen
- Genera **5 preguntas** al azar (una por cada tipo de pregunta de examen), ponderadas según las horas de la guía.
- **Reloj de 2 horas**, sin pistas y sin acceso al reactivario («material permitido: ninguno»).
- Al terminar da una **nota sobre 10** y un informe por tema con los puntos débiles.
- Tiene un modo **«Simulacro PEC-1»** (temas 1-6) y otro **«Simulacro PEC-2»** (temas 7-11).

---

## 7. Experiencia de usuario

- **Pensado primero para el móvil.** Se juega en vertical con el pulgar y en tableta u ordenador aprovecha la pantalla ancha.
- **Editor de moléculas táctil**, que es la pieza clave:
  - Barra de elementos (C, H, N, O, S, F, Cl, Br, I, P) y tipos de enlace (simple, doble, triple, cuña y raya).
  - Tocar un átomo le añade una cadena en zigzag. Tocar un enlace cambia su orden. Arrastrar crea un enlace nuevo.
  - Plantillas de anillos (3-8 eslabones, silla) y fusión de anillos sobre un enlace.
  - Deshacer y rehacer. Fórmula molecular en directo y aviso de valencias imposibles (átomo en rojo).
  - Atajos de teclado en el ordenador.
- **Pantallas:** Inicio → Mapa de la nave (mundos) → Mundo (lista de niveles) → Nivel → Resultado. A esto se suman el Reactivario, el Repaso diario, el modo Examen y los Ajustes.
- **Lienzo de moléculas con paleta oscura** (predeterminada): moléculas, proyecciones, sillas y esquemas se dibujan sobre fondo oscuro, con trazos claros y colores de elementos más vivos, para no deslumbrar. En *Ajustes* se puede elegir el **lienzo claro** (como el libro), útil para capturas o para estudiar con luz de día.
- **Estilo visual:** tema oscuro con tema claro opcional. El código de colores es el del libro: **nucleófilos en rojo, electrófilos en azul, radicales y grupos salientes en verde**, que la guía pide memorizar.
- **Accesibilidad:** contraste AA, sin depender solo del color (iconos y texto) y tamaños táctiles ≥ 44 px.

---

## 8. Arquitectura técnica

### 8.1 Plataforma
- **Web estática** con HTML, CSS y JavaScript (módulos ES) **sin paso de compilación**: se publica tal cual en GitHub Pages.
- **PWA instalable**:
  - `manifest.webmanifest` con nombre, iconos (192/512, *maskable*), `display: standalone`, color de tema y `start_url`/`scope` relativos.
  - Un *service worker* que precachea toda la app (incluido RDKit, unos 7,5 MB) para que funcione **sin conexión**. La caché lleva versión y la app muestra «Hay una versión nueva, toca para actualizar».
  - Rutas **relativas**, porque en GitHub Pages la app vive en `/<repo>/` y no en la raíz.
- **GitHub Pages**: se despliega con GitHub Actions (`actions/deploy-pages`) en cada push a `main`. Antes de publicar se ejecutan los tests de química.
  - URL prevista: `https://byrandom.github.io/organic-chemistry-game/`.
  - ⚠️ En una cuenta gratuita, GitHub Pages solo funciona si el **repositorio es público**. El código del juego puede serlo, porque el material de la UNED no está en él.

### 8.2 Motor químico
- **[RDKit.js](https://www.rdkit.org/docs/JSMolInterface.html)** (WebAssembly, licencia BSD, incluido en `vendor/`). Se encarga de:
  - Leer SMILES y generar **SMILES canónico** para comparar respuestas.
  - Calcular **etiquetas CIP (R/S, E/Z)** y coordenadas 2D.
  - Ya se ha comprobado que la versión 2026.09 funciona en el contenedor de desarrollo y devuelve `cipCodes` y coordenadas.
- **Motor de reacciones propio** (`js/chem/reactions/`). Cada reactivo es una regla programada, no una plantilla genérica. Así se controlan con precisión:
  - **Regioquímica:** Markovnikov, Saytzeff/Hofmann, epóxidos ácido/básico.
  - **Estereoquímica:** SN2 con inversión, SN1 con racémico, adiciones *sin/anti*, E2 antiperiplanar, Lindlar *Z* y Na/NH₃ *E*.
  - **Transposiciones** de carbocationes en SN1, E1, HX y deshidratación.
  - **Selectividad y mezclas:** si hay varios productos no equivalentes, se informa una «mezcla».
  - **Incompatibilidades**, por ejemplo Grignard con grupos OH o NH, o SN2 sobre un carbono terciario.
  - Un **mensaje didáctico** para cada resultado («por qué»).
- **Representación interna:** un grafo molecular con estereo (configuraciones tetraédricas y dobles enlaces E/Z), que se convierte a SMILES isomérico para validar con RDKit.
- **Dibujo:** renderizador SVG propio, con el estilo del juego y elementos clicables, usando las coordenadas de RDKit. Las proyecciones de Fischer, Newman, caballete y silla tienen renderizadores específicos.

### 8.3 Contenido orientado a datos
- Los niveles se describen en archivos de datos (`content/qo1/mundo-05.json`…) con este formato:
  ```json
  {
    "id": "m5-07",
    "tipo": "sintesis",
    "titulo": "Inversión de Walden",
    "partida": "C[C@H](Br)CC",
    "objetivo": "C[C@@H](C#N)CC",
    "reactivos": ["NaCN_DMSO", "H2O_solvolisis", "NaI_acetona"],
    "optimo": 1,
    "pistas": ["La SN2 ataca por la cara opuesta al grupo saliente."],
    "explicacion": "…"
  }
  ```
- Así, **QO II** será otra carpeta (`content/qo2/`) con sus mundos y reactivos. No hará falta tocar el motor salvo para añadir reglas nuevas.

### 8.4 Calidad
- **Tests automáticos** (Node + RDKit):
  - Cada nivel de síntesis se resuelve con su solución de referencia y tiene que llegar al objetivo exacto, con su estereoquímica.
  - Cada regla de reacción tiene casos de prueba sacados de los exámenes y de los ejercicios del libro.
  - Cada nombre IUPAC de los puzles tiene su estructura verificada.
- La integración continua bloquea el despliegue si falla algún test.
- **Pruebas en navegador** con Playwright: instalación de la PWA, uso sin conexión, editor táctil (emulando un móvil) y una partida completa del Mundo 1.

### 8.5 Estructura del repositorio (prevista)
```
/
├─ index.html              # punto de entrada de la app
├─ manifest.webmanifest
├─ sw.js                   # service worker (caché sin conexión)
├─ css/
├─ js/
│  ├─ app/                 # pantallas, navegación, progreso
│  ├─ editor/              # editor de moléculas táctil
│  ├─ render/              # SVG: 2D, Fischer, Newman, silla
│  ├─ chem/                # grafo molecular, estereo, RDKit
│  │  └─ reactions/        # una regla por reactivo
│  └─ puzzles/             # un módulo por tipo de puzle
├─ content/qo1/            # mundos, niveles, fichas, reactivos (datos)
├─ vendor/rdkit/           # RDKit_minimal.js + .wasm
├─ icons/
├─ tests/
├─ docs/DISENO.md          # este documento
└─ .github/workflows/pages.yml
```

---

## 9. Fases de desarrollo

Cada fase termina con algo **jugable y publicado** en GitHub Pages. Así puedes usarlo para estudiar desde el primer momento y darme tu opinión.

### Fase 0 · Cimientos *(primera sesión de trabajo)*
- Esqueleto de la app: pantallas de inicio y mapa de mundos (vacío), y navegación.
- **PWA**: manifest, iconos y *service worker* con caché sin conexión. Instalable en Android/iOS.
- **Despliegue en GitHub Pages** con GitHub Actions.
- RDKit cargado y funcionando sin conexión.
- ✅ **Terminada cuando:** abres la URL en el móvil, le das a «Instalar», la abres en modo avión y la app carga.

### Fase 1 · Motor y editor
- Editor de moléculas táctil (§7).
- Grafo molecular, conversión a y desde SMILES, comparación canónica, fórmula molecular y validación de valencias.
- Renderizador SVG 2D.
- Motor de puzles con dos tipos: **Construir** y **Razonar**. Progreso guardado.
- Sistema de diálogos de K.E.K.U.L.É. y **bitácora** de fichas desbloqueables.
- ✅ **Terminada cuando:** puedes dibujar cualquier molécula de QO I en el móvil, el juego la reconoce y el prólogo de la historia se puede jugar.

### Fase 2 · Mundos 1-4 (estructura y estereoquímica · primera mitad de la PEC-1)
- **Mundo 1** (construir, grupos funcionales, resonancia), **Mundo 2** (nomenclatura, isómeros, Newman, halogenación radicalaria), **Mundo 3** (sillas, *cis/trans*, policíclicos) y **Mundo 4** (centros quirales, R/S, Fischer, Newman, caballete, relaciones entre estereoisómeros).
- Nuevos tipos de puzle: **Estereo** y **Conformación**.
- Primeras reglas del motor: halogenación radicalaria, Wurtz, Corey-House y reducciones.
- ✅ **Terminada cuando:** los cuatro mundos y sus jefes se pueden jugar y todos los tests pasan.

### Fase 3 · Mundos 5-6 (SN y eliminación · completa la PEC-1)
- Motor con **estereoquímica dinámica**: SN2 con inversión, SN1 con racemización, E2 antiperiplanar y **transposiciones**.
- Nuevos tipos de puzle: **Reacción**, **Esquema** y **Síntesis**, con su mecánica de programa paso a paso.
- **Paleta oscura** para el lienzo de moléculas (petición durante la Fase 3) y opción de lienzo claro en Ajustes.
- El simulacro de la **PEC-1** pasa a la Fase 6, junto con el modo Examen, que comparte su mecánica.
- ✅ **Terminada cuando:** los casos de la PEC-1 y de los exámenes de los temas 5-6 se resuelven correctamente en el motor.

### Fase 4 · Mundos 7-8 (alcoholes, éteres y epóxidos)
- Reglas de alcoholes (HX con transposición, PBr₃, SOCl₂, deshidratación, oxidaciones), hidruros y **organometálicos** (Grignard y organolíticos con aldehídos, cetonas, ésteres y epóxidos).
- Williamson y apertura de epóxidos (regio y estereo).
- Nuevo tipo de puzle: **Mecanismo** (flechas curvas).
- ✅ **Terminada cuando:** la PEC-2 se resuelve en el motor en su parte de los temas 7-8.

### Fase 5 · Mundos 9-11 (alquenos, dienos y alquinos · completa la PEC-2)
- Todas las adiciones a alquenos con su estereo (*sin/anti*), oxidaciones y ozonólisis.
- Dienos: 1,2 frente a 1,4 con la temperatura como parámetro, y Diels-Alder (*endo*, estereoespecífico).
- Alquinos: acetiluros, hidratación, hidroboración, Lindlar y Na/NH₃.
- Simulacro de la **PEC-2**.
- ✅ **Terminada cuando:** toda la PEC-2 y los exámenes de 2022-2023 se resuelven en el motor.

### Fase 6 · Final del juego
- **Laboratorio final** (MTBE, disparlure, muscalure, mentol…) y jefes de construcción.
- **Modo Examen** con reloj y nota.
- **Repaso diario** con repetición espaciada.
- ✅ **Terminada cuando:** se puede hacer un examen simulado completo de principio a fin en el móvil.

### Fase 7 · Pulido
- Animaciones, sonido opcional y logros.
- Exportar e importar el progreso.
- Revisión de accesibilidad y rendimiento (arranque rápido en un móvil modesto).
- Revisión de contenido contigo: erratas, nivel de dificultad y huecos del temario.

### Fase futura · Química Orgánica II
- `content/qo2/` con los temas 13-24 del libro (aromáticos, carbonilos, aminas, ácidos y derivados, heterociclos, biomoléculas).
- Desbloquea un **segundo mapa** y el Laboratorio de fármacos: paracetamol, benzocaína, lidocaína, ibuprofeno…

### Calendario orientativo

| Fase | Objetivo temporal | Motivo |
|---|---|---|
| 0-1 | Lo antes posible | Base para todo lo demás |
| 2-3 | Diciembre 2026 | Repaso de los temas 1-6. ⚠️ La PEC-1 se entrega el 30/11, así que **no llega a tiempo para ella**, pero sí para el examen |
| 4-5 | Antes del 04/01/2027 | Apoyo para la PEC-2 |
| 6 | Antes de la prueba presencial | Simulacros de examen |
| 7 | Continuo | — |

---

## 10. Riesgos y decisiones abiertas

| Riesgo | Mitigación |
|---|---|
| **Errores químicos en el motor** (el riesgo más grave: el juego enseñaría algo falso) | Tests con casos de examen y del libro; cada regla documentada con su referencia al tema; botón «Reportar error» en cada nivel |
| El editor de moléculas resulta incómodo en el móvil | Se prototipa en la Fase 1 antes de crear contenido; en niveles donde dibujar no es el objetivo, se ofrecen alternativas de elección múltiple |
| Puzles de mecanismo caros de crear | Se dejan para la Fase 4; se empieza con mecanismos cortos (SN2, E2, adición de HBr) |
| RDKit pesa unos 7,5 MB | Se descarga una vez y queda en caché; mientras tanto se muestra una pantalla de carga |
| Las reglas de la química tienen excepciones | Los niveles usan sustratos donde la regla del libro es clara; los casos ambiguos se tratan como «mezcla» y se explican |

**Decisiones tomadas (25/11/2026):**
1. **Título e historia:** *Protocolo Kekulé*, con la nave *Ouroboros* y la IA K.E.K.U.L.É. (§1.1).
2. **Repositorio público** para publicar gratis en GitHub Pages.
3. **Sin penalizaciones** en los niveles normales: intentos ilimitados, que solo afectan a las estrellas. La presión queda para el modo Examen.

---

## 11. Registro de avance

| Fecha | Fase | Hecho |
|---|---|---|
| 25/11/2026 | 0 | PWA (manifest, iconos, *service worker* con caché sin conexión y aviso de actualización), flujo de GitHub Actions (tests y publicación) |
| 25/11/2026 | 1 | Núcleo químico (grafo, valencias, fórmula, SMILES, RDKit), editor táctil (átomos, enlaces, anillos, fusión, cargas, deshacer, pellizcar para hacer zoom), puzles *construir / descubrir / isómeros / test / secuencia*, historia (prólogo y diálogos), bitácora, laboratorio libre, ajustes y exportar/importar el progreso |
| 25/11/2026 | 2 (inicio) | **Mundo 1 completo**: 14 niveles y un jefe de 3 fases, con 9 fichas de bitácora |
| 25/11/2026 | 2 | **Mundos 2, 3 y 4 completos** (alcanos, cicloalcanos, estereoisomería): 47 niveles nuevos (3 de ellos jefes) y 20 fichas. Motor de estereoquímica (R/S verificado con RDKit y con casos de libro: D-gliceraldehído y L-alanina), proyecciones de **Fischer, Newman, caballete y silla**, y 5 tipos de puzle nuevos: *newman*, *silla*, *quirales*, *rs* y *fischer*. Energías conformacionales con los valores del texto base (etano 3; butano gauche 0,9 y anticlinal 3,8; Tabla 3.3) |
| 25/11/2026 | 3 | **Mundos 5 y 6 completos** (sustitución y eliminación): 31 niveles (2 de ellos jefes) y 12 fichas. **Motor de reacciones** con la Tabla 6.1 del libro: SN2 con inversión, SN1 con racemización y transposiciones de hidruro y de metilo, E2 antiperiplanar (E/Z estereoespecífico y trans-diaxial en ciclohexanos), E1, Saytzeff y Hofmann; verificado con los ejemplos del texto base, la PEC-1 y los exámenes. Puzles **reacción**, **esquema** y **síntesis** (programa de reactivos ejecutado paso a paso). **Lienzo de moléculas oscuro** |
