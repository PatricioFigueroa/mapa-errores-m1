# Mapa de errores M1 — diseño y arquitectura

Fecha: 2026-11-09 · Versión 2 (dos caras) · Nombre de trabajo, se puede cambiar.

Leyenda: **[Patricio]** = decidido por el autor. **[Propuesta]** = decisión de diseño, revisable. **[Verificado]** = comprobado en la fuente el 2026-11-09. **[Sin verificar]** = falta comprobar; quien lo use debe comprobarlo antes.

## 1. Qué es

Una herramienta web abierta que explica **por qué** se falla una pregunta de alternativas de matemática. Tiene un motor y dos caras **[Patricio]**:

- **Cara estudiante (principal).** El estudiante elige un tema, responde entre 5 y 10 preguntas de un banco y recibe su *mapa de errores*: los errores conceptuales que mejor explican el conjunto de sus respuestas incorrectas, con práctica dirigida a cada uno.
- **Cara profesor.** El profesor pega una pregunta propia en texto libre; la herramienta la ordena en enunciado y alternativas, y muestra por cada distractor los errores conceptuales más probables.

No es un chatbot ni resuelve ejercicios. No es un agente ni usa base de datos vectorial: el catálogo tiene unas 100 entradas y se compara en memoria.

Fines **[Patricio]**: mostrar de punta a punta un modelo entrenado, su evaluación honesta y su uso real, y publicarse como subpágina de matematicas.cl si es factible; si no, funcionar en local.

Diferencia con un generador de pruebas como ThatQuiz: aquel entrega nota y lista de respuestas malas; este entrega la causa probable y qué practicar.

## 2. Objetivos, no objetivos y antiobjetivos

Objetivos:

- Un recuperador **entrenado por el autor**: dado (pregunta, respuesta correcta, distractor), ordena los errores de un catálogo.
- Una medición honesta de la transferencia inglés a español, con intervalos de confianza y criterio de fracaso fijado antes de mirar la prueba.
- Una demo que cualquiera prueba en 30 segundos sin instalar nada ni crear cuenta.
- Un repositorio reproducible: paquete Python, scripts, tests, CI, resultados en el README.

No objetivos:

- Cuentas de usuario, seguimiento por estudiante en servidor o cualquier dato personal. El progreso vive solo en el dispositivo.
- Chatbot libre, lectura de imágenes, preguntas con figuras (versión 1), respuestas abiertas, generación de preguntas nuevas para el banco, reentrenamiento automático.
- Reordenamiento con LLM, salvo que antes se demuestre que mejora el ranking.
- LangChain, LangGraph, Chroma u otra infraestructura que el problema no pide.

Antiobjetivos:

- Presentar el diagnóstico como certeza. Toda salida es una hipótesis.
- Publicar material sin derecho a hacerlo (sección 4).

## 3. Lo que ya existe

- matematicas.cl: WordPress 7.1.4 sobre Apache, con sección PAES M1, sin herramientas interactivas, con AdSense y Google Analytics. **[Verificado]**
- Guías PAES M1 del autor (fuera del repositorio): 7 guías con 15 preguntas de alternativas cada una (105 preguntas, 315 distractores), en `.md`, `.docx`, `.pdf` y fuente LaTeX en `tex/`. Cada pregunta tiene clave, habilidad, contenido, dificultad y solución. Temas: potencias y raíces enésimas; productos notables, factorización y operatoria algebraica; proporcionalidad directa e inversa; ecuaciones e inecuaciones; sistemas 2x2; función lineal y afín; función cuadrática.
- Equipo de entrenamiento: GTX 1650 de 4 GB, Windows 11, `uv` con Python 3.9 a 3.14, 58 GB libres. Sin Ollama ni modelos locales.
- El autor usa Groq (`openai/gpt-oss-120b` y `openai/gpt-oss-20b`) en otro proyecto y tiene cuenta de Cloudflare. No hay presupuesto para API de pago.

## 4. Datos y licencias

| Fuente | Condición | Uso |
|---|---|---|
| Eedi, competencia Kaggle 2024 "Mining Misconceptions in Mathematics" (inglés) | Datos y pesos entrenados: CC BY-NC 4.0. La regla 7.B prohíbe redistribuir los datos. **[Verificado]** Tamaño aproximado: 1.900 preguntas, 2.600 errores. **[Sin verificar]** | Entrenar y evaluar en inglés, en local. Nunca se sube al repositorio ningún CSV ni texto del catálogo Eedi. |
| Pruebas PAES de DEMRE | Prohibido su uso "para entrenar, desarrollar o mejorar modelos de inteligencia artificial" sin autorización escrita. **[Verificado]** | **No se usan** para nada sin esa autorización. |
| Guías PAES M1 del autor | Material propio; autoría y permiso de publicación por confirmar (D1). | Banco inicial de la cara estudiante y conjunto de evaluación en español. |
| Otero et al., MaE (220 ejemplos, inglés) | MIT según su repositorio. **[Sin verificar]** | Opcional: entrenamiento sin restricción no comercial. |

Consecuencias **[Propuesta]**:

- **Catálogo propio en español**, redactado por el autor. El modelo aprende con Eedi la tarea de emparejar; el catálogo es intercambiable. La demo no redistribuye textos de Eedi.
- **Dos variantes de pesos**: `eedi` (afinada con Eedi, resultado de investigación, no comercial) y `libre` (modelo base, o afinado solo con datos MIT y propios). Cuál se sirve al público depende de D2; por defecto, `libre`.

## 5. Arquitectura

### 5.1 Componentes

```
ml/ (Python)  ──genera──►  artefactos (archivos estáticos)  ──consume──►  web/ (Angular + Ionic, PWA)
                                                                              │ opcional
                                                                              ▼
                                                                         server/ (Express)  ──►  Groq
```

- **`ml/`**: carga de datos, líneas base, entrenamiento, evaluación, exportación. Solo corre en el equipo del autor.
- **Artefactos**: el único contrato entre `ml/` y `web/`. Archivos estáticos versionados (5.3).
- **`web/`**: Angular con Ionic y TypeScript, instalable como PWA **[Patricio]**. Compila a archivos estáticos alojables en una subcarpeta de matematicas.cl o en cualquier hosting estático.
- **`server/`**: Express en TypeScript **[Patricio]**, sin estado ni base de datos, solo para las dos funciones que usan LLM. La web funciona completa sin él.

### 5.2 Dónde corre la IA

| Función | Qué la hace | Dónde | Costo |
|---|---|---|---|
| Etiquetar los distractores del banco | Etiquetas del autor (oro) o del modelo | Antes, en `ml/` | 0 |
| Diagnosticar una pregunta nueva (cara profesor) | Recuperador ONNX cuantizado, 118 MB | CPU del navegador, WebAssembly | 0 |
| Ordenar texto pegado en enunciado y alternativas | LLM vía `server/` | Groq | Cuota gratuita |
| Redactar un ejercicio de refuerzo | LLM vía `server/` | Groq | Cuota gratuita |

La cara estudiante usa etiquetas ya calculadas: carga al instante y no descarga el modelo. El modelo se descarga solo al entrar a la cara profesor, se guarda en el dispositivo y después funciona sin conexión. La GPU solo se usa para entrenar.

### 5.3 Contrato de artefactos

Claves en inglés, contenido en español. Todo texto matemático es Markdown con LaTeX entre `$...$`.

`catalog.json`
```json
{"version": 1, "language": "es",
 "items": [{"id": "E001", "name": "Suma numeradores y denominadores por separado",
            "description": "...", "topic": "fracciones", "activity": "..."}]}
```
`name` es el texto que se convierte en embedding. `activity` es la actividad de refuerzo escrita a mano, que se muestra cuando no hay LLM.

`bank.json`
```json
{"version": 1,
 "questions": [{"id": "G1-01", "topic": "potencias-raices", "skill": "Resolver problemas",
                "difficulty": "media", "stem": "...", "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
                "answer": "B", "solution": "...",
                "tags": {"A": [{"error": "E001", "score": 0.83, "source": "gold"}]}}]}
```
`tags` tiene una entrada por distractor, ordenada de mayor a menor puntaje, con a lo más 3 errores. `source` es `gold` (etiqueta del autor, `score` = 1) o `model`.

`catalog.f32`: float32 little-endian, forma `[n, 384]`, filas normalizadas en L2, en el mismo orden que `catalog.json`.

`model/`: disposición que espera `transformers.js` (`onnx/model_quantized.onnx`, `tokenizer.json`, `config.json`).

`manifest.json`: `{model_id, variant ("eedi" | "libre"), dim, n_catalog, catalog_sha256, threshold, metrics, created}`.

Formato de texto, idéntico en entrenamiento, exportación y navegador:
```
query: Wrong answer: {wrong}\nCorrect answer: {correct}\nQuestion: {stem}
passage: {name}
```
El distractor va primero para que un enunciado largo, al truncarse, no lo elimine.

Puntaje: similitud coseno. **Abstención**: si el mejor puntaje queda bajo `threshold`, la respuesta es "sin diagnóstico claro". El umbral se fija con las preguntas de desarrollo en español.

### 5.4 Mapa de errores (cara estudiante)

Para cada respuesta incorrecta se toman las etiquetas de ese distractor (hasta 3), con peso 1, 0,5 y 0,25 según su posición. Se suma por error. Un error respaldado por dos o más preguntas distintas se muestra como **patrón**; con una sola, como **posible**. Para cada patrón se ofrecen otras preguntas del banco etiquetadas con ese error y su `activity`. **[Propuesta]** Es una heurística transparente, no validada con estudiantes reales; la página lo dice.

### 5.5 Cara profesor

1. Pega texto libre. Si `server/` responde, el LLM lo ordena en enunciado, cuatro alternativas y LaTeX; si no, el profesor llena el formulario a mano.
2. Siempre revisa y corrige en un formulario con vista previa compuesta (KaTeX) **[Patricio]** y marca la correcta.
3. El recuperador corre en un Web Worker y devuelve, por distractor, hasta 3 errores con puntaje, o "sin diagnóstico claro".
4. Opcional: ingresa cuántos estudiantes marcaron cada distractor; eso solo ordena la pantalla, no entra al modelo.
5. Opcional: pide un ejercicio de refuerzo al LLM; si no hay cuota, ve la `activity` del catálogo.
6. Puede descargar la pregunta en el formato de `bank.json` para proponerla al banco. No hay escritura en servidor.

### 5.6 `server/`

| Ruta | Entrada | Salida |
|---|---|---|
| `POST /api/structure` | `{text}` (máx. 4.000 caracteres) | `{stem, options: {A,B,C,D}, answer: "A".."D" o null}` |
| `POST /api/reinforce` | `{stem, correct, wrong, error: {id, name}}` | `{exercise}` |

Clave de Groq propia del proyecto en variable de entorno; modelo por defecto `openai/gpt-oss-20b`. Límite por IP y tope diario global; al superarlos responde `429` y la web usa su respaldo. Lista de orígenes permitidos por CORS. La salida del LLM se valida contra un esquema antes de devolverla. No guarda nada. Dónde alojarlo gratis queda **[Sin verificar]**; el hosting del sitio probablemente no ejecuta Node.

### 5.7 Privacidad

Sin cuentas. Las respuestas del estudiante y los conteos del profesor no salen del dispositivo (`localStorage` o IndexedDB). La aplicación no envía eventos de respuestas a analítica.

## 6. Modelo y evaluación

**Recuperador [Propuesta].** `intfloat/multilingual-e5-small` (MIT, 384 dimensiones). Afinado completo con `sentence-transformers`, pérdida `CachedMultipleNegativesRankingLoss`, precisión mixta, negativos difíciles minados con el modelo sin afinar. Si no cabe en 4 GB: bajar longitud máxima, luego lote, y como último recurso LoRA. Si el modelo pequeño no alcanza: `multilingual-e5-base`, que ya no se serviría en el navegador.

**Inglés (Eedi).** Partición por pregunta: un mismo enunciado nunca queda en dos particiones. Resultados separados para errores vistos y no vistos en entrenamiento. Líneas base: frecuencia de etiqueta, BM25, e5 sin afinar, e5 afinado. Tres semillas. Métrica principal MAP@25.

**Español (guías del autor).**

- Alcance de la versión 1: los siete temas de las guías.
- Catálogo de 60 a 100 errores escrito por el autor a partir del temario, la literatura y 20 preguntas de desarrollo (dos o tres por guía). Un LLM puede proponer borradores; el autor decide cada entrada.
- Las otras 85 preguntas son prueba y no se miran antes. Pauta de etiquetado escrita antes de etiquetar, con las categorías "ambiguo" y "fuera del catálogo"; se etiqueta sin ver predicciones.
- Sesgo de etiquetador único: el autor repite a ciegas el 20 % dos semanas después y un segundo docente etiqueta 30 distractores (kappa de Cohen).
- Métricas: top-1, recall@5, MRR, cobertura tras abstención; intervalos del 95 % por bootstrap sobre preguntas. Para comparar con el inglés se evalúa además sobre submuestras del catálogo Eedi del mismo tamaño.
- Variantes: catálogo en español; catálogo traducido al inglés; consulta traducida al inglés.
- Si más del 30 % de la prueba cae "fuera del catálogo", el catálogo se declara insuficiente y se amplía con preguntas nuevas, nunca con las de prueba.
- **Criterio de fracaso**, fijado antes de la prueba: si el modelo afinado no supera a BM25 y a e5 sin afinar en español, se declara que el afinado no transfiere y se publica así. El umbral de "útil" lo fija el autor (D4).

Las etiquetas de oro de las 105 preguntas pasan a ser las `tags` del banco inicial. El modelo etiqueta lo que llegue después.

## 7. Repositorio

```
ml/                 paquete Python y scripts (uv)
data/               eval en español: catálogo, banco, pauta, etiquetas. Datos Eedi: ignorados por git
artifacts/          generados por ml/; ignorados por git, se publican aparte
web/                Angular + Ionic (PWA)
server/             Express
docs/               este diseño, planes, resultados
.github/workflows/  CI en CPU
AGENTS.md           reglas para cualquier modelo que trabaje aquí
```

Idioma **[Propuesta]**: código, comentarios, commits y README en inglés (audiencia internacional); interfaz, catálogo y banco en español; documentos de diseño en español.

README, primera pantalla: una frase, GIF de la cara estudiante, enlace a la demo, tabla de resultados con intervalos y una línea de límites.

## 8. Riesgos

1. **Licencias.** Sección 4 y decisiones D1 a D3.
2. **El afinado no transfiere al español.** Se mide y se publica tal cual. La cara estudiante no depende de ello, porque usa etiquetas de oro.
3. **Banco chico (105 preguntas).** Se agota rápido. Crece con preguntas propuestas por profesores y revisadas por el autor; no se generan preguntas con LLM en la versión 1.
4. **Mapa de errores no validado.** Se presenta como hipótesis; validarlo con un curso real es trabajo posterior y requiere permiso del establecimiento.
5. **Texto pegado mal ordenado por el LLM.** La revisión en el formulario es obligatoria.
6. **Abuso del endpoint.** Límite por IP, tope diario, CORS y entradas acotadas.
7. **Hosting.** Si el del sitio no sirve archivos de 118 MB o `.wasm`, los archivos estáticos van a otro hosting y el sitio enlaza o incrusta.

## 9. Decisiones abiertas (del autor)

- **D1.** ¿Las 105 preguntas son de autoría propia y se pueden publicar en un repositorio abierto y en la demo? Bloquea el banco y la evaluación en español.
- **D2.** Pesos que sirve la demo pública: `libre` (por defecto) o `eedi` en una página sin publicidad y con permiso pedido a los organizadores.
- **D3.** ¿Pedir autorización escrita a DEMRE?
- **D4.** Umbral numérico de "útil para un profesor" (propuesta de referencia: 60 % de acierto top-1 con 70 % de cobertura).
- **D5.** Quién es el segundo docente etiquetador.
- **D6.** Nombre definitivo del repositorio y confirmación del idioma inglés para el código.

## 10. Lo que queda a quien construye

Hiperparámetros, estructura interna de cada paquete, diseño visual, textos de interfaz, límites exactos del servidor y elección del hosting gratuito.
