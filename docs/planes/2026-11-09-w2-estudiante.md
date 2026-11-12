# W2 — cara estudiante

**Objetivo:** el estudiante elige un tema, responde un cuestionario del banco y recibe su mapa de errores con práctica dirigida. Todo corre en el navegador con los artefactos ya cargados; no usa modelo ni servidor.

**Especificación:** `docs/diseno.md`, secciones 5.3, 5.4 y 5.7. **Base:** lo que dejó W1 (`ArtifactsService`, `MathTextComponent`, tipos de `core/contracts.ts`).

**Carpetas que tocas:** `web/src/app/practice/**`, `web/src/app/core/error-map.ts`, `web/src/app/core/progress.service.ts`, sus pruebas, y en `app.routes.ts` solo la ruta `practicar`. Informe en `docs/informes/w2.md`.

## Lógica pura — `web/src/app/core/error-map.ts`

```ts
export interface Answer { questionId: string; chosen: OptionLetter }
export interface ErrorEvidence { error: string; weight: number; questionIds: string[]; kind: 'pattern' | 'possible' }
export interface QuizSummary { total: number; correct: number; undiagnosed: number }

export function buildErrorMap(bank: Bank, answers: Answer[]): ErrorEvidence[]
export function summarize(bank: Bank, answers: Answer[]): QuizSummary
export function pickPractice(bank: Bank, error: string, exclude: string[], limit?: number): Question[]  // limit = 3
export function pickQuiz(bank: Bank, topic: string | null, size: number, seed: number): Question[]
```

Reglas, fijadas por la especificación 5.4:

- Solo cuentan las respuestas incorrectas. Por cada una se toman las etiquetas del distractor elegido (a lo más 3), con peso 1, 0,5 y 0,25 según su posición.
- Se suma por error. `questionIds` son las preguntas distintas que lo respaldan, en el orden respondido.
- `kind` es `'pattern'` si lo respaldan dos o más preguntas distintas; si no, `'possible'`.
- Orden de salida: patrones primero; dentro de cada grupo, peso descendente; a igual peso, `error` ascendente.
- `summarize.undiagnosed` cuenta las respuestas incorrectas cuyo distractor tiene lista de etiquetas vacía.
- `pickPractice` devuelve, en el orden del banco, preguntas con ese error en alguna etiqueta, sin las de `exclude`.
- `pickQuiz` filtra por tema (`null` = todos), baraja de forma determinista según `seed` y corta a `size`; si hay menos, devuelve todas.
- Una respuesta cuyo `questionId` no existe en el banco se ignora.

## Progreso — `web/src/app/core/progress.service.ts`

`save(attempt: { date: string; topic: string | null; answers: Answer[] }): void`, `list(): Attempt[]`, `clear(): void`. Guarda en `localStorage` bajo la clave `mapa-errores:v1`, conserva los 50 intentos más recientes y, si el contenido guardado está corrupto, lo descarta y devuelve `[]`. Nada se envía a ningún servidor.

## Pantallas

1. `/practicar` — temas del banco con su número de preguntas, más "Todos los temas". El cuestionario tiene 5 preguntas, o las que haya.
2. `/practicar/cuestionario` — una pregunta por pantalla; alternativas como grupo de opciones operable con teclado; enunciado y alternativas con `app-math-text`. Sin corrección hasta el final. Si se recarga a mitad, vuelve a `/practicar`.
3. `/practicar/resultado` —
   - puntaje (`correct` de `total`);
   - por cada **patrón**: nombre y descripción del error (del catálogo), su `activity`, las preguntas que lo respaldan, y un botón "Practicar este error" que inicia un cuestionario con `pickPractice` (si no quedan preguntas, el botón no aparece);
   - los errores **posibles**, con menor énfasis;
   - si `undiagnosed > 0`: cuántas respuestas quedaron "sin diagnóstico claro";
   - revisión de cada pregunta: elegida, correcta y `solution`;
   - aviso visible: el mapa es una hipótesis, no un diagnóstico seguro;
   - botón "Borrar mi progreso".

## Pruebas obligatorias (con el banco de fixture)

- Respuestas `F-01:A`, `F-05:A`, `F-02:A`, `F-03:B` → `[{error:'E001', weight:2, questionIds:['F-01','F-05'], kind:'pattern'}, {error:'E003', weight:1, questionIds:['F-02'], kind:'possible'}]`.
- `summarize` de esas respuestas → `{total:4, correct:1, undiagnosed:0}`; añadiendo `F-04:C` → `undiagnosed:1`.
- Banco sintético con un distractor de tres etiquetas → pesos 1, 0,5 y 0,25.
- Dos errores con igual peso y mismo `kind` salen en orden ascendente de `error`.
- Respuesta con `questionId` inexistente no altera el resultado.
- `pickPractice(bank,'E001',['F-01'])` → solo `F-05`.
- `pickQuiz(bank,'fracciones',5,1)` → 2 preguntas; misma semilla, mismo orden; `pickQuiz(bank,null,3,1)` → 3 preguntas distintas.
- `ProgressService`: guarda y lista; con JSON corrupto en `localStorage`, `list()` devuelve `[]`; no conserva más de 50.
- Página de resultado con esas respuestas: muestra el nombre de `E001` bajo "patrón" y el aviso de hipótesis.

## Criterio de aceptación

`npm run lint`, `npm test` y `npm run build` pasan en `web/`. Recorrido completo con fixtures: elegir "fracciones", responder mal ambas, ver `E001` o `E002` como patrón.

## Informe

`docs/informes/w2.md`: comandos y resultados reales, decisiones tomadas, qué no verificaste. Commits pequeños en inglés. No hagas push.
