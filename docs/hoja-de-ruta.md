# Hoja de ruta — de esqueleto a versión 1 publicada

Fecha: 2026-11-15. Complementa a [diseno.md](diseno.md) (qué y por qué) y a [plan-maestro.md](plan-maestro.md) (paquetes). Este documento dice **qué hacer, en qué orden, con qué comando, qué resultado esperar y dónde mirar si falla**.

Convenciones:

- **[Tú]** = solo el autor puede hacerlo. **[Modelo]** = se puede encargar a un asistente. **[Ambos]** = el modelo prepara, el autor decide.
- **[Sin verificar]** = dato que hay que comprobar en la fuente antes de apoyarse en él.
- Los comandos están escritos para Git Bash, desde la raíz del repositorio salvo que se indique otra carpeta.
- Cada fase termina con un **criterio de salida**. No se pasa a la siguiente sin cumplirlo o sin anotar por qué se omite.

## Estado al 2026-11-15

| Pieza | Estado | Verificado cómo |
|---|---|---|
| `contracts/` | Completo | `uv run contracts/validate.py` y CI |
| `ml/` métricas, cargador, particiones, recuperadores, afinado, CLI | Escrito | 26 pruebas con fixtures inventados; **nada probado con datos reales ni en GPU** |
| `server/` | Completo | 17 pruebas; probado contra un modelo local de Ollama |
| `web/` esqueleto, cara estudiante, cara profesor | Escrito | 34 pruebas, lint y build; **ninguna cara recorrida a mano con el modelo real** |
| Catálogo en español | Borrador de 74 entradas, siete temas | Valida contra el esquema; sin revisión del autor |
| Banco en español, etiquetas, evaluación, exportación, PWA, despliegue | No empezado | — |

Hallazgos de la inspección de hoy que cambian el plan:

1. **Ya hay 10 guías, no 7** (se sumaron geometría, probabilidad y una más), además de un ensayo. El banco inicial puede llegar a unas 150 preguntas. El borrador de catálogo no cubre los temas nuevos.
2. **Las soluciones de las guías ya explican cada distractor** ("A multiplica…; B calcula…"). Eso acelera mucho el etiquetado: el motivo de cada alternativa incorrecta ya está escrito por el autor.
3. **Disco C: con 24 GB libres (96 % usado).** El entorno de Python con PyTorch pesa cerca de 5 GB y hay copias de trabajo descartables que ocupan varios GB. La fase 0 es obligatoria antes de entrenar.
4. Al revisar el formato se vieron las soluciones de las preguntas 1 a 10 de la guía 1. Por eso la guía 1 completa pasa al conjunto de desarrollo (fase 5).

---

## Fase 0 — Orden y espacio en disco (30 minutos) **[Tú]**

Objetivo: dejar una sola copia del proyecto, espacio para entrenar y el perfil de GitHub apuntando al repositorio.

1. **Borrar el repositorio antiguo.** `https://github.com/PatricioFigueroa/mapa-errores-m1-old/settings` → "Danger Zone" → "Delete this repository". Es irreversible; su contenido útil ya está en el repositorio público.
2. **Borrar las copias de trabajo descartables** (todo su contenido ya está en `main`):
   ```bash
   git worktree prune
   rm -rf .worktrees .claude/worktrees
   ```
3. **Borrar las ramas locales antiguas.** Contienen el historial previo a la publicación y no deben subirse nunca:
   ```bash
   git branch -D main-old backup/pre-public backup/pre-public-final
   git branch --list 'pkg/*' | xargs -r git branch -D
   git branch            # debe quedar solo main
   ```
4. **Comprobar el espacio:** `df -h /c`. Meta: al menos 20 GB libres antes de la fase 2. Si no alcanza, revisar la carpeta de descargas y `~/.ollama/models` (cada modelo local pesa de 3 a 4 GB).
5. **Recrear los entornos en la copia principal:**
   ```bash
   cd ml && uv sync && uv run pytest && uv run ruff check . && cd ..
   cd server && npm ci && npm test && cd ..
   cd web && npm ci && npm run lint && npm test && npm run build && cd ..
   ```
   Esperado: 26, 17 y 34 pruebas en verde. `uv sync` descarga PyTorch con CUDA (unos 2,5 GB).
6. **GitHub:** fijar el repositorio en el perfil ("Customize your pins"); agregar temas en "About" (`education`, `mathematics`, `information-retrieval`, `sentence-transformers`, `onnx`, `angular`, `ionic`); en Settings → Profile activar "Private contributions" si se quiere que el gráfico cuente trabajo privado.

**Criterio de salida:** `git branch` muestra solo `main`; las tres suites pasan en la copia principal; 20 GB libres.

---

## Fase 1 — Recorrer ambas caras en el navegador (1 hora) **[Tú]** o **[Modelo]** con navegador

Objetivo: confirmar que lo fusionado funciona de verdad, no solo en pruebas. Usa los fixtures (5 preguntas inventadas).

```bash
cd web && npm start        # http://localhost:4200
```

Cara estudiante:

1. Inicio → "Practicar" → tema "fracciones" → responder **mal** las dos preguntas eligiendo la alternativa A en ambas.
2. Esperado en el resultado: puntaje 0 de 2; un **patrón** con el error `E001` (suma numeradores y denominadores), su actividad, y el aviso de que es una hipótesis.
3. Repetir con "Todos los temas" respondiendo una bien y una con una alternativa sin etiqueta (por ejemplo la D de la primera pregunta). Esperado: aparece "sin diagnóstico claro" para esa respuesta.
4. "Borrar mi progreso" → recargar → no queda historial.
5. Recargar la página a mitad de un cuestionario. Esperado: vuelve a la selección de tema, sin error en la consola.

Cara profesor:

1. Inicio → "Diagnosticar una pregunta" → "Cargar modelo". Anotar el tiempo de descarga y si la barra de avance se mueve.
2. Escribir a mano: enunciado `¿Cuánto es $\frac{1}{2}+\frac{1}{3}$?`, alternativas `$\frac{2}{5}$`, `$\frac{5}{6}$`, `$\frac{1}{6}$`, `$\frac{2}{6}$`, correcta B. Comprobar la vista previa compuesta.
3. Diagnosticar. Anotar el tiempo y los tres errores que devuelve para cada distractor. Con el modelo base sin afinar el orden puede ser malo: lo que se verifica aquí es que **funciona**, no que acierte.
4. Probar la validación: dos alternativas iguales; ninguna marcada como correcta. Esperado: mensaje claro y no diagnostica.
5. "Descargar pregunta" → abrir el JSON → tiene `tags` solo para A, C y D.

Dónde mirar si falla:

| Síntoma | Archivo |
|---|---|
| El patrón no aparece o el peso es raro | `web/src/app/core/error-map.ts` y su `.spec.ts` |
| El cuestionario no avanza o pierde respuestas | `web/src/app/practice/practice-session.service.ts`, `quiz.page.ts` |
| El modelo no carga | consola del navegador; `web/src/app/core/embedder.worker.ts`, `embedder.service.ts` |
| La matemática no se compone | `web/src/app/shared/math-text.component.ts` |
| Los artefactos no cargan | `web/scripts/copy-fixtures.mjs`, `web/src/app/core/artifacts.service.ts` |

Limpieza menor **[Modelo]**: `web/src/app/pages/practicar.page.ts` y `web/src/app/pages/diagnosticar.page.ts` quedaron sin uso; borrarlos si `grep -rn "pages/practicar.page\|pages/diagnosticar.page" web/src` no devuelve nada.

Registrar lo observado en `docs/results/navegador.md`: fecha, navegador, tiempos, capturas, fallos.

**Criterio de salida:** los diez pasos se cumplen o cada fallo tiene un issue abierto con el archivo sospechoso.

---

## Fase 2 — Datos de Eedi y líneas base reales (2 horas) **[Tú]** + **[Modelo]**

Objetivo: tener los datos en local, confirmar su forma y obtener los primeros números reales.

1. **[Tú] Cuenta y reglas.** Entrar a `https://www.kaggle.com/competitions/eedi-mining-misconceptions-in-mathematics`, pulsar "Late Submission" o "Join" y aceptar las reglas. Sin esto la descarga responde 403.
2. **[Tú] Token.** `https://www.kaggle.com/settings` → sección API → crear token. Guardar el archivo en `C:\Users\<usuario>\.kaggle\kaggle.json`. El formato del token cambió con el tiempo: si el script no lo reconoce, seguir `https://www.kaggle.com/docs/api` **[Sin verificar]**.
3. **Descargar:**
   ```bash
   cd ml && uv run python scripts/download_eedi.py
   ls ../data/eedi
   ```
   Esperado: `train.csv`, `test.csv`, `misconception_mapping.csv`, `sample_submission.csv`. Si llega un `.zip`, descomprimirlo ahí mismo.
4. **Confirmar la forma.** El cargador asume estas columnas **[Sin verificar]**: `QuestionId`, `ConstructName`, `SubjectName`, `CorrectAnswer`, `QuestionText`, `AnswerAText`…`AnswerDText`, `MisconceptionAId`…`MisconceptionDId`; y `MisconceptionId`, `MisconceptionName`.
   ```bash
   uv run python -c "import pandas as pd; d=pd.read_csv('../data/eedi/train.csv'); print(list(d.columns)); print(len(d))"
   uv run python -c "from pathlib import Path; from mapa_errores.data import load_pairs, load_catalog, count_unlabelled as c; p=Path('../data/eedi'); x=load_pairs(p); print(len(x), x.question_id.nunique(), len(load_catalog(p)), c(p))"
   ```
   Si las columnas difieren: corregir `ml/src/mapa_errores/data.py`, el fixture `ml/tests/fixtures/eedi/*.csv` y `ml/tests/test_data.py` en el mismo commit.
5. **Anotar en `docs/datos-eedi.md`, solo conteos:** preguntas, distractores etiquetados y sin etiquetar, tamaño del catálogo, errores con un solo ejemplo, notación matemática usada (`\( … \)`, `$…$` u otra). **Ningún texto de Eedi entra al repositorio.**
6. **Notación.** El modelo se entrenará con la notación de Eedi y se usará con `$…$`. Si Eedi usa `\( … \)`, decidir y anotar: normalizar todo a `$…$` dentro de `format_query` y `formatQuery` (un cambio de contrato: actualizar `diseno.md` 5.3, `ml/src/mapa_errores/text.py`, `web/src/app/core/format.ts` y sus dos pruebas a la vez).
7. **Líneas base:**
   ```bash
   mkdir -p ../docs/results
   uv run python scripts/baselines.py --data ../data/eedi --fold 0 --out ../docs/results/baselines-fold0.json
   ```
   Comprobaciones de cordura: `n` igual al tamaño de la partición 0; todas las métricas entre 0 y 1; `map25_unseen` existe; e5 sin afinar por encima de la línea base de frecuencia. Si BM25 supera a e5 sin afinar no es un error: se anota.

Dónde mirar: `ml/src/mapa_errores/{data,split,retrieve,evaluate}.py`. Documentación de la API de Kaggle: `https://www.kaggle.com/docs/api`.

**Criterio de salida:** `docs/datos-eedi.md` y `docs/results/baselines-fold0.json` existen y están en `main`.

---

## Fase 3 — Primer afinado en GPU (medio día) **[Tú]** ejecuta, **[Modelo]** asiste

Objetivo: demostrar que el afinado mejora al modelo base y medir cuánto cuesta una corrida.

Antes de lanzar:

```bash
"$LOCALAPPDATA/Programs/Ollama/ollama.exe" ps      # si hay un modelo cargado, detenerlo con: ollama stop <nombre>
nvidia-smi --query-gpu=memory.used,memory.total --format=csv   # usada debe quedar bajo 500 MiB
```

Lanzar:

```bash
cd ml
uv run python scripts/train.py --data ../data/eedi --fold 0 --seed 0 --out runs/e5s-fold0-seed0
```

Qué observar y qué hacer:

| Síntoma | Acción, en este orden |
|---|---|
| Pérdida `nan` en los primeros pasos | Repetir con `--no-fp16`. Las GTX de la serie 16 tienen fallas conocidas con media precisión **[Sin verificar en este equipo]** |
| `CUDA out of memory` | En `finetune` (`ml/src/mapa_errores/train.py`): `max_seq_length` 192 → 128; `mini_batch_size` 16 → 8; `batch_size` 32 → 16. Exponerlos como argumentos de `scripts/train.py` si hace falta |
| Traza de "access violation" al terminar pero el proceso sale con código 0 | Se vio en la prueba de humo en CPU. Comprobar que la carpeta de salida carga: `uv run mapa-errores diagnose --model runs/e5s-fold0-seed0 --catalog ../data/eedi --stem "x" --correct "1" --wrong "2"` |
| Más de 90 minutos por corrida | Bajar `epochs` a 2 y anotarlo; afecta el presupuesto de la fase 4 |

Al terminar, `docs/results/finetuned-fold0-seed0.json` debe traer métricas, minutos y memoria máxima. Escribir `docs/results/README.md` con la tabla de cuatro filas (frecuencia, BM25, e5 sin afinar, e5 afinado) para la partición 0 y la configuración que funcionó.

**Si el afinado no supera a e5 sin afinar**, revisar en este orden antes de cambiar nada más:

1. Que consultas y pasajes lleven los prefijos `query: ` y `passage: ` en entrenamiento **y** en evaluación (`text.py`, `retrieve.py`, `train.py`).
2. Que los negativos difíciles no incluyan el positivo ni un duplicado textual suyo (el `assert` de `build_training_dataset`).
3. Separar `map25_seen` de `map25_unseen`: si solo mejora en vistos, el modelo memoriza; subir negativos difíciles o bajar épocas.
4. Probar `lr` 1e-5 y 5e-5, una corrida cada uno.
5. Probar `multilingual-e5-base` solo para diagnóstico (no se sirve en el navegador).

Documentación: `https://sbert.net/docs/sentence_transformer/training_overview.html` y `https://sbert.net/docs/package_reference/sentence_transformer/losses.html`.

**Criterio de salida (cierra el paquete P1):** `map25` del modelo afinado mayor que el de e5 sin afinar en la partición 0, con la tabla publicada. Si no se logra tras los cinco pasos, se publica el resultado negativo y se sigue con el modelo base.

---

## Fase 4 — Validación completa (paquete P2) **[Modelo]** escribe, **[Tú]** ejecuta

Objetivo: números defendibles, no una sola corrida.

1. Crear `ml/scripts/crossval.py`: argumentos `--data`, `--folds` (lista, por defecto `0 1 2 3 4`), `--seeds` (por defecto `0 1 2`), `--out-dir`. Por cada par ejecuta lo mismo que `train.py` y escribe `docs/results/runs/eedi-fold{k}-seed{s}.json` con las claves de `evaluate` más `fold`, `seed`, `minutes`, `peak_vram_mb` y la configuración. Si el archivo ya existe, salta esa corrida (permite reanudar).
2. Crear `ml/scripts/report.py`: lee `docs/results/runs/*.json` y `baselines-fold*.json` y regenera `docs/results/README.md` con media y desviación estándar de `map25`, `recall25`, `top1`, `map25_seen`, `map25_unseen` por método. Prueba unitaria con dos JSON inventados.
3. Presupuesto: si una corrida de la fase 3 tomó más de 40 minutos, usar 3 particiones y 2 semillas (6 corridas) y decirlo en la tabla.
4. Borrar los puntos de control intermedios de `ml/runs/` al terminar cada corrida, dejando solo el modelo final de la mejor configuración: cada carpeta pesa cerca de 500 MB.
5. Variante `libre`: es el modelo base sin afinar, salvo que se verifique la licencia MIT del conjunto MaE (`https://github.com/nancyotero-projects/math-misconceptions`, leer el archivo `LICENSE`) y se decida afinarlo con él. Anotar la decisión.

**Criterio de salida:** `docs/results/README.md` generado por `report.py`, con dispersión, y enlazado desde el README principal.

---

## Fase 5 — Banco en español (paquete P3) **[Modelo]** + decisión **[Tú]**

Objetivo: convertir las guías a `bank.json` y fijar la partición desarrollo/prueba antes de mirar nada más.

**Decisión D1 primero [Tú]:** confirmar que las preguntas de las guías son de autoría propia y pueden publicarse. Hasta entonces, el banco se genera en `data/es/private/` (agregar esa ruta a `.gitignore`) y no se sube.

Formato observado de `guiaN.md` (carpeta local de las guías, subcarpeta `tex/`):

| Elemento | Patrón |
|---|---|
| Título | línea `**GUÍA N.º N: <título>**` |
| Pregunta | `**N.** <enunciado>`; puede ocupar varias líneas hasta la primera alternativa |
| Alternativas | `**A)** <texto>` … `**D)** <texto>` |
| Tabla del profesor | filas `\| N \| Habilidad \| Contenido \| Dificultad \| Clave \|` |
| Solución | `**Pregunta N.** <texto> … **Clave: X**`; incluye el motivo de cada distractor |

Pasos:

1. Crear `ml/scripts/guides_to_bank.py` con argumentos `--guides-dir` y `--out`. Por cada guía produce preguntas con `id` `G{NN}-{QQ}` (por ejemplo `G03-07`), `topic` según la tabla de abajo, `skill`, `difficulty`, `stem`, `options`, `answer`, `solution`, y `tags` con una lista vacía por cada distractor.
2. Reglas de calidad del conversor, cada una con su prueba sobre un fragmento **inventado** con el mismo formato (no copiar preguntas reales al fixture):
   - falla con mensaje claro si una pregunta no tiene exactamente cuatro alternativas o si su clave no está en la tabla;
   - marca `"has_figure": true` si el enunciado o una alternativa contiene `![`, `\includegraphics` o la palabra "figura"; esas preguntas se excluyen del banco de la versión 1 y se listan en la salida (esto exige agregar el campo opcional al esquema, en un commit propio de `contracts/`);
   - conserva el LaTeX tal cual y normaliza solo espacios.
3. Temas (`topic`):

   | Guía | `topic` |
   |---|---|
   | 1 | `potencias-raices` |
   | 2 | `algebra` |
   | 3 | `proporcionalidad` |
   | 4 | `ecuaciones-inecuaciones` |
   | 5 | `sistemas` |
   | 6 | `funcion-lineal-afin` |
   | 7 | `funcion-cuadratica` |
   | 8 | `geometria` |
   | 9 | `probabilidad` |
   | 10 | definir al leer su título |

4. **Partición fija, decidida hoy:** desarrollo = toda la guía 1 más las preguntas 1, 6 y 11 de cada una de las demás guías; prueba = el resto. Con 10 guías de 15 preguntas son 42 de desarrollo y 108 de prueba, menos las excluidas por figura. Escribir `data/es/split.json` (`{"dev": [...], "test": [...]}`) generado por el mismo script, con una prueba que verifique que la regla se cumple y que no hay intersección.
5. Comprobar que todo el LaTeX compila: crear `web/scripts/check-latex.mjs`, que recorre `stem`, `options` y `solution` de un `bank.json` y llama a `katex.renderToString` con `throwOnError: true`, imprimiendo `id` y campo de cada fallo. Arreglar las guías en su origen, no el JSON.
6. Extender `contracts/validate.py` con `--only bank` para validar un banco suelto (hoy exige el directorio completo).

Límite honesto que debe quedar escrito en `docs/results/`: el autor escribió las preguntas, así que el diseño del catálogo no es ciego a ellas. Lo que sí se controla: partición fijada antes, catálogo congelado por commit antes de etiquetar la prueba, umbrales ajustados solo con desarrollo, y tasa de "fuera del catálogo" reportada.

**Criterio de salida:** `bank.json` valida con `--only bank`, `check-latex` sin fallos, `split.json` generado, lista de preguntas excluidas por figura.

---

## Fase 6 — Catálogo y etiquetas **[Tú]**, con herramienta de **[Modelo]**

Es el trabajo que más valor aporta y el único que no se puede delegar.

### 6.1 Catálogo (tarea H2)

1. Partir de `data/es/borradores/catalog.borrador.json` (74 entradas, temas 1 a 7).
2. Pedir a un modelo un borrador para `geometria`, `probabilidad` y el tema de la guía 10, con las mismas reglas, y revisarlo igual que el resto.
3. Recorrer las 42 preguntas de desarrollo. Para cada distractor: ¿hay una entrada que lo explique? Si no, crearla; si dos entradas lo explican igual de bien, fusionarlas.
4. Criterios de una buena entrada:
   - `name` describe **lo que hace el estudiante**, en una frase que empieza con verbo, sin fórmulas y sin el nombre del tema ("Suma los exponentes al…", no "Error de potencias");
   - es específica: dos distractores distintos no deberían caer en ella por razones distintas;
   - es reutilizable: aplica a más de una pregunta posible;
   - `description` trae un ejemplo mínimo en LaTeX; `activity` propone algo que el estudiante puede hacer solo en cinco minutos.
5. Guardar como `data/es/catalog.json`, validar (`uv run contracts/validate.py --only catalog`, a agregar junto con `--only bank`) y **congelar**: commit y etiqueta `git tag catalogo-v1`. Después de esa etiqueta el catálogo no cambia hasta terminar la fase 7.

Dónde buscar ideas de errores (pistas para búsqueda; confirmar cada referencia antes de citarla):

- Buscar en Google Scholar o Semantic Scholar: "errores y dificultades en el aprendizaje del álgebra", "student misconceptions algebra", "common errors exponents radicals", "proportional reasoning additive strategy", "misconceptions linear functions slope", "errores ecuaciones cuadráticas estudiantes secundaria".
- Autores clásicos del área para usar como punto de partida: Radatz (análisis de errores), Movshovitz-Hadar, Zaslavsky e Inbar (clasificación de errores en secundaria), Socas y Rico (dificultades y errores, en español), Booth y Kieran (álgebra), Brown y Burton (errores de procedimiento como reglas).
- Los nombres de errores de Eedi sirven para inspirarse leyéndolos en local, pero **no se copian ni se traducen literalmente** al catálogo.
- Las propias soluciones de las guías de desarrollo.

### 6.2 Herramienta de etiquetado (paquete nuevo L1) **[Modelo]**

Etiquetar 300 distractores en una planilla con LaTeX crudo es inviable. Se construye una página local:

- Ruta `/etiquetar` en `web/`, disponible solo en desarrollo (no se incluye en el build de producción).
- Carga `bank.json`, `catalog.json` y `split.json`. Muestra una pregunta por pantalla, compuesta, con su solución desplegable.
- Por cada distractor: selector con búsqueda sobre el catálogo (filtrado primero por el tema de la pregunta), más las opciones "ambiguo" y "fuera del catálogo", y un segundo error opcional.
- Guarda el avance en `localStorage`; botón "Exportar" que descarga `labels.json` con `{question_id, option, error, second_error, labeller, timestamp}` por fila.
- Modo "repetición": recibe una semilla y un porcentaje, elige esa muestra de la prueba y **oculta las etiquetas previas**.
- Pruebas: exportación con el formato exacto; la muestra de repetición es determinista para una semilla; nunca muestra predicciones del modelo.

### 6.3 Etiquetado (tarea H3)

1. Escribir `data/es/pauta.md` antes de etiquetar: cuándo usar "ambiguo", cuándo "fuera del catálogo", qué hacer si dos errores aplican (el más específico primero).
2. Etiquetar desarrollo (42 preguntas). Ajustar la pauta si algo no quedó claro. **Aquí** todavía se puede tocar el catálogo; después se congela (6.1, paso 5).
3. Etiquetar prueba (hasta 108 preguntas, unas 320 distractores). Ritmo de referencia: 40 distractores por sesión de 45 minutos, es decir unas ocho sesiones. Es una estimación, no una medición.
4. Dos semanas después: modo repetición con el 20 % de la prueba, sin ver las etiquetas anteriores.
5. Segundo docente: 30 distractores de la prueba, con la misma herramienta y la misma pauta.
6. `ml/scripts/agreement.py` **[Modelo]**: lee dos `labels.json` y entrega acuerdo simple y kappa de Cohen, con prueba sobre un caso de valor conocido. Publicar ambos números (autor contra sí mismo, autor contra segundo docente) en `docs/results/etiquetado.md`.

**Criterio de salida:** `data/es/catalog.json` con etiqueta `catalogo-v1`, `data/es/labels.json` completo, `docs/results/etiquetado.md` con los dos acuerdos y la tasa de "fuera del catálogo". Si esa tasa supera 30 % en la prueba, el catálogo se declara insuficiente: se amplía con preguntas **nuevas** y se repite desde 6.1.

---

## Fase 7 — Evaluación en español (paquete P4) **[Modelo]** escribe, **[Tú]** decide

1. `ml/scripts/eval_es.py` con `--bank`, `--catalog`, `--labels`, `--split`, `--model`, `--variant`, `--out`. Usa solo filas con etiqueta de error (ni "ambiguo" ni "fuera del catálogo"); cuenta aparte las descartadas.
2. Métodos a comparar, todos sobre **prueba**: frecuencia (ajustada con desarrollo), BM25, e5 sin afinar, e5 afinado con Eedi.
3. Variantes de idioma:
   - `es`: consulta y catálogo en español;
   - `catalogo-en`: catálogo traducido al inglés. La traducción se genera una vez con un LLM, la revisa el autor y se guarda en `data/es/catalog.en.json` para que la evaluación sea reproducible;
   - `consulta-en`: consultas traducidas al inglés, generadas una vez y guardadas en `data/es/private/queries.en.json`.
4. Métricas: `top1`, `recall5`, `mrr`, con intervalo del 95 % por bootstrap **sobre preguntas** (`bootstrap_ci` de `metrics.py`, 10.000 remuestreos). Diferencias entre métodos con bootstrap pareado.
5. Abstención: barrer el umbral sobre **desarrollo** y graficar acierto entre respondidas contra cobertura. Elegir el umbral según la decisión D4 del autor y solo entonces medir en prueba. Guardar el umbral en el manifiesto.
6. Brecha con el inglés: evaluar el mismo modelo en Eedi contra submuestras aleatorias del catálogo Eedi del mismo tamaño que el catálogo en español (20 submuestras, siempre incluyendo el error correcto), y reportar media e intervalo.
7. Escribir `docs/results/decision-es.md` con la tabla y **una** de estas frases, según el criterio fijado en `diseno.md`: "el afinado transfiere" o "el afinado no transfiere", más qué modelo se servirá.
8. Las etiquetas de oro pasan a ser las `tags` del banco (`source: "gold"`, `score: 1`). Para preguntas sin etiqueta, las pone el modelo elegido (`source: "model"`), solo sobre el umbral.

**Criterio de salida:** `decision-es.md` publicado, con intervalos y con el resultado tal como salió.

---

## Fase 8 — Exportación al navegador (paquete P5) **[Modelo]**

1. Exportar a ONNX cuantizado. Dos caminos, confirmar cuál está vigente antes de usarlo: la exportación integrada de `sentence-transformers` (`https://sbert.net/docs/sentence_transformer/usage/efficiency.html`) o `optimum-cli export onnx` (`https://huggingface.co/docs/optimum`).
2. Disposición que espera `transformers.js` para un modelo local, según `web/src/app/core/embedder.worker.ts` (usa `dtype: 'q8'`): carpeta `<nombre>/` con `config.json`, `tokenizer.json`, `tokenizer_config.json` y `onnx/model_quantized.onnx`.
3. `ml/scripts/export_artifacts.py` con `--model`, `--catalog`, `--bank`, `--labels`, `--variant`, `--threshold`, `--out artifacts/<variante>/`. Escribe `catalog.json`, `catalog.f32` (calculado con el modelo **cuantizado**, filas normalizadas), `bank.json` con sus `tags`, `manifest.json` y `model/`.
4. Paridad, con pruebas marcadas como lentas:
   - PyTorch contra ONNX cuantizado: mismo top-5 en al menos 18 de 20 consultas de desarrollo, y diferencia de `top1` en desarrollo menor a 2 puntos. Si no se cumple, usar cuantización menos agresiva y anotar el tamaño.
   - Navegador contra Python: un script de Node que carga el mismo modelo con `@huggingface/transformers` y compara los cinco primeros de 20 consultas con un JSON generado por Python.
5. `uv run contracts/validate.py artifacts/<variante>` en verde.
6. Web: `web/scripts/copy-fixtures.mjs` acepta la variable `ARTIFACTS_DIR` (por defecto, los fixtures); `MODEL_SOURCE` pasa a `local` cuando el manifiesto no es el de fixture.

**Criterio de salida:** con `ARTIFACTS_DIR=../artifacts/libre npm start`, las dos caras funcionan con el banco y el catálogo reales.

---

## Fase 9 — PWA y rendimiento (paquete W4) **[Modelo]** + medición **[Tú]**

1. Agregar el service worker de Angular (`https://angular.dev/ecosystem/service-workers`; confirmar el comando para la versión instalada).
2. Los archivos del modelo los guarda `transformers.js` en la caché del navegador; comprobar que no se descargan dos veces y que el service worker no intenta precargarlos.
3. Prueba manual: cargar, activar "sin conexión" en las herramientas del navegador, recargar. Deben funcionar la cara estudiante completa y, si el modelo ya se había cargado, la cara profesor.
4. Medir y anotar en `docs/results/rendimiento.md`, en un notebook corriente y en un teléfono: primera carga, descarga del modelo, tiempo por diagnóstico, memoria.
5. Accesibilidad mínima: recorrer ambas caras solo con teclado; contraste; textos alternativos.

**Criterio de salida:** segunda visita sin red funciona; tiempos publicados.

---

## Fase 10 — Servidor en línea (opcional) **[Tú]** + **[Modelo]**

La web funciona sin servidor. Esta fase solo agrega "ordenar texto pegado" y "ejercicio de refuerzo".

1. **[Tú]** Crear una clave de Groq nueva solo para este proyecto y leer los límites reales del plan gratuito en `https://console.groq.com/docs/rate-limits`.
2. Elegir alojamiento gratuito para Node comprobando en su documentación actual: que ejecute Express, que no cobre, cuánto tarda en despertar y si permite variables de entorno secretas. Candidatos a revisar: Vercel, Render. **[Sin verificar]**
3. Configurar `LLM_*`, `ALLOWED_ORIGINS` (solo el origen público de la web), `DAILY_CAP`, `PER_MINUTE`.
4. Probar con `server/scripts/smoke.ts` contra la URL pública, y agotar el tope a propósito para ver el respaldo en la web.
5. Si ningún alojamiento gratuito sirve: se publica sin servidor. No es un fracaso; el diseño lo contempla.

---

## Fase 11 — Publicación de la demo (paquete I1) **[Ambos]**

1. **Modelo en Hugging Face Hub.** Subir la variante `libre` a un repositorio público de modelos con su ficha (datos, métricas, límites, licencia). Así la web lo carga con `MODEL_SOURCE` `hub` y no hay que servir 118 MB desde un alojamiento propio. La variante afinada con Eedi, si se publica, va con licencia CC BY-NC 4.0 y atribución; ante la duda, consultar a los organizadores.
2. **Web en GitHub Pages**, desde Actions, con `--base-href /mapa-errores-m1/`. Los artefactos pequeños (`catalog.json`, `catalog.f32`, `bank.json`, `manifest.json`) viajan dentro del sitio.
3. **matematicas.cl** (tarea H6): acordar con el dueño una entrada en la sección PAES M1 que enlace a la demo. Enlace antes que incrustación: evita depender del alojamiento del sitio y de su publicidad.
4. **README:** enlace a la demo, GIF de la cara estudiante, tabla de resultados con intervalos (inglés y español), límites en una línea.
5. **Ensayo final:** una persona que no conoce el proyecto sigue el README y reproduce la evaluación en español en 30 minutos. Anotar dónde se trabó y corregir el README.

**Criterio de salida:** demo pública enlazada desde el README y desde matematicas.cl.

---

## Después de la versión 1

Ideas ya conversadas, en orden de valor. Ninguna está comprometida.

1. **Generador paramétrico.** Cada error del catálogo se escribe como una regla que produce su distractor (por ejemplo, "suma numeradores y denominadores" produce $\frac{a+c}{b+d}$). Una plantilla por tipo de ejercicio genera preguntas ilimitadas con etiqueta exacta, sin LLM y sin etiquetar a mano. Resuelve el banco chico y permite medir al modelo con miles de casos. Primer paso: tres plantillas de fracciones y potencias, con pruebas que verifiquen que los cuatro valores son distintos y que el distractor coincide con la regla.
2. **Seguimiento local por estudiante.** Por error: oportunidades y caídas en el tiempo; estados "activo", "en mejora", "superado"; pantalla "qué practicar hoy". Todo en el dispositivo, con conteos simples. Necesita al menos tres preguntas por error, por eso va después del generador.
3. **Preguntas con figura** (geometría).
4. **Vista de curso para el profesor.** Exige cuentas, servidor, base de datos y consentimiento para datos de menores: es otro proyecto, con asesoría legal.

---

## Decisiones pendientes del autor

| ID | Decisión | Bloquea |
|---|---|---|
| D1 | ¿Las preguntas de las guías son propias y publicables? | Subir `bank.json` (fase 5) |
| D2 | Pesos de la demo pública: `libre` por defecto | Fase 11 |
| D3 | ¿Pedir autorización escrita a DEMRE? Sin ella no se usa su material | Nada |
| D4 | Umbral de "útil para un profesor" (referencia: 60 % de acierto con 70 % de cobertura) | Fase 7, paso 5 |
| D5 | Quién es el segundo docente | Fase 6.3, paso 5 |
| D6 | Nombre definitivo del repositorio | Fase 11 |
| D7 | Tema (`topic`) de la guía 10 y si el ensayo entra al banco | Fase 5 |
| D8 | Normalizar la notación de Eedi a `$…$` | Fase 2, paso 6 |

## Orden y dependencias

```
Fase 0 ─► Fase 1
   │
   ├─► Fase 2 ─► Fase 3 ─► Fase 4 ──────────────┐
   │                                            ▼
   └─► Fase 5 ─► Fase 6 ───────────────────► Fase 7 ─► Fase 8 ─► Fase 9 ─► Fase 11
                                                                    Fase 10 ─┘ (opcional)
```

Las fases 2 a 4 (máquina) y 5 a 6 (autor) avanzan en paralelo: mientras la GPU entrena, se etiqueta.

## Dónde buscar, en resumen

| Necesito | Fuente |
|---|---|
| Reglas y datos de Eedi | `https://www.kaggle.com/competitions/eedi-mining-misconceptions-in-mathematics` (pestañas Data y Rules) |
| API de Kaggle | `https://www.kaggle.com/docs/api` |
| Entrenamiento de embeddings | `https://sbert.net/docs/sentence_transformer/training_overview.html` |
| Pérdidas y muestreo por lotes | `https://sbert.net/docs/package_reference/sentence_transformer/losses.html` |
| Modelo base | `https://huggingface.co/intfloat/multilingual-e5-small` |
| Modelo en el navegador | `https://huggingface.co/docs/transformers.js` |
| Exportación ONNX | `https://huggingface.co/docs/optimum` |
| Sintaxis de LaTeX soportada | `https://katex.org/docs/supported.html` |
| Service worker de Angular | `https://angular.dev/ecosystem/service-workers` |
| Componentes de Ionic | `https://ionicframework.com/docs` |
| Límites de Groq | `https://console.groq.com/docs/rate-limits` |
| Temario PAES M1 | `https://demre.cl` (publicaciones, temario de la prueba) |
| Qué construye el proyecto y por qué | [diseno.md](diseno.md) |
| Contrato entre `ml/` y `web/` | `contracts/README.md` |
