# Plan maestro

Especificación: [diseno.md](diseno.md). Este documento reparte el trabajo en paquetes que pueden ejecutar modelos distintos (Claude, Codex u otros) sin pisarse. Cada paquete toca solo sus carpetas y termina en algo comprobable.

El paso a paso con comandos, resultados esperados y fuentes está en [hoja-de-ruta.md](hoja-de-ruta.md). Agrega un paquete que esta tabla no tenía: **L1**, la herramienta local de etiquetado (fase 6.2).

## Cómo se trabaja

1. Un paquete, una rama (`pkg/<id>-<slug>`), un pull request o merge a `main`.
2. Antes de empezar un paquete que no tiene plan detallado, el modelo que lo toma escribe ese plan en `docs/planes/AAAA-MM-DD-<id>.md` a partir de `diseno.md`, con tareas, firmas y pruebas, y lo deja revisar por el autor.
3. Al terminar, actualiza la tabla de estado de este archivo y anota en `docs/bitacora.md` una línea: fecha, paquete, modelo, qué quedó hecho y qué no se verificó.
4. Los contratos (`contracts/`) solo cambian con un commit propio que actualice también `diseno.md` y los fixtures.

Texto para entregar un paquete a cualquier modelo:

```
Lee AGENTS.md y docs/diseno.md. Ejecuta el paquete <ID> de docs/plan-maestro.md
(plan detallado: docs/planes/<archivo>, si existe; si no, escríbelo primero y detente
para revisión). Toca solo las carpetas del paquete. Termina cuando pasen los criterios
de aceptación; actualiza la tabla de estado y docs/bitacora.md.
```

## Paquetes

Tamaño: S = una sesión, M = dos o tres, L = una semana de tardes.

| ID | Paquete | Carpetas | Depende de | Tamaño | Criterio de aceptación |
|---|---|---|---|---|---|
| C0 | Contratos y fixtures: JSON Schema de `catalog.json`, `bank.json` y `manifest.json`; fixture con 5 preguntas inventadas y 6 errores, con `catalog.f32` falso | `contracts/` | — | S | Un test valida los fixtures contra los esquemas |
| P1 | Núcleo ML: métricas, carga de Eedi, líneas base, primer afinado, CLI. Plan: [planes/2026-11-09-nucleo-ml.md](planes/2026-11-09-nucleo-ml.md) | `ml/`, raíz | H1 | M | El afinado supera a e5 sin afinar en la partición 0 |
| P2 | Validación completa: 5 particiones, 3 semillas, vistos y no vistos, variante `libre` | `ml/`, `docs/results/` | P1 | M | Tabla con media y dispersión para las cuatro líneas base |
| P3 | Activos en español: script que convierte las guías a `bank.json`; plantillas de catálogo, pauta y etiquetas | `ml/scripts/`, `data/es/` | C0, D1 | M | `bank.json` con 105 preguntas valida contra el esquema; LaTeX compila en KaTeX |
| P4 | Evaluación en español: tres variantes, bootstrap, umbral de abstención, decisión escrita | `ml/`, `docs/results/` | P2, H2, H3 | M | Tabla de brecha con intervalos y decisión frente al criterio de fracaso |
| P5 | Exportación: ONNX cuantizado, paridad con Python, `catalog.f32`, `manifest.json`, etiquetas del banco | `ml/`, `artifacts/` | P4 | M | Top-25 de ONNX igual al de PyTorch en 20 consultas; artefactos validan contra `contracts/` |
| W1 | Esqueleto web: Angular + Ionic, rutas, componente de matemática con KaTeX, servicios que leen artefactos (con fixtures), CI | `web/` | C0 | M | `ng build` y tests pasan; la página muestra una fracción compuesta desde el fixture |
| W2 | Cara estudiante: selección de tema, cuestionario, mapa de errores (diseño 5.4), práctica dirigida, progreso en el dispositivo | `web/` | W1 | L | Test de la agregación con casos conocidos; recorrido completo con fixtures |
| W3 | Cara profesor: formulario con vista previa, recuperador en Web Worker con `transformers.js`, abstención, conteos, descarga de la pregunta | `web/` | W1 | L | Con el modelo base sin afinar, la página ordena los 6 errores del fixture sin servidor |
| W4 | PWA: instalación, caché del modelo, uso sin conexión, tiempos de carga medidos | `web/` | W2, W3 | M | Segunda visita sin red funciona; tiempos anotados en `docs/results/` |
| S1 | Servidor Express: `/api/structure` y `/api/reinforce`, límites, validación de esquema, proveedor simulado en tests | `server/` | C0 | M | Tests pasan sin red; con la cuota agotada responde `429` |
| I1 | Integración: artefactos reales en la web, respaldo sin servidor, despliegue, README en inglés, ficha del modelo | todo | P5, W4, S1, D2 | L | Un tercero reproduce la evaluación en 30 minutos; demo pública arriba |

Tres pistas avanzan en paralelo desde el primer día: **ML** (P1, P2, P4, P5), **web** (W1, W2, W3, W4) y **servidor** (S1). C0 las desbloquea a todas y va primero.

## Tareas que solo puede hacer el autor

| ID | Tarea | Bloquea |
|---|---|---|
| H1 | Cuenta de Kaggle, aceptar las reglas de la competencia Eedi, token en `~/.kaggle/kaggle.json` | P1 |
| H2 | Redactar el catálogo en español (60 a 100 errores) y la pauta de etiquetado, sobre 20 preguntas de desarrollo | P4 |
| H3 | Etiquetar las 85 preguntas de prueba; repetir a ciegas el 20 % dos semanas después; conseguir segundo docente para 30 distractores | P4 |
| H4 | Escribir la actividad de refuerzo de cada error del catálogo | I1 |
| H5 | Resolver D1 a D6 de `diseno.md` | P3, I1 |
| H6 | Acordar con el dueño de matematicas.cl la subpágina y probar si el hosting sirve los archivos | I1 |

Un modelo puede proponer borradores para H2 y H4. No puede cerrarlos ni inventar etiquetas para H3: esas etiquetas son el dato con que se mide el proyecto.

## Calendario de referencia

| Cuándo | ML | Web y servidor | Autor |
|---|---|---|---|
| Fin de semana | C0, P1 | — | H1, D1 |
| Semana 1 | P2 | W1 | H2 |
| Semana 2 | P3 | W2 | H2, H3 |
| Semana 3 | — | W2, S1 | H3 |
| Semana 4 | P4 | W3 | H3 (repetición), H4 |
| Semana 5 | P5 | W3, W4 | H6 |
| Semana 6 | — | I1 | D2 |
| Semana 7 | — | I1, publicación | — |

## Estado

| ID | Estado | Rama | Modelo | Notas |
|---|---|---|---|---|
| C0 | hecho | main | Fable | validador en verde |
| P1 | parcial | main | Codex gpt-6-sol | 26 pruebas en verde; falta todo lo que usa datos reales (H1) |
| P2 | pendiente | | | |
| P3 | pendiente | | | |
| P4 | pendiente | | | |
| P5 | pendiente | | | |
| W1 | hecho | main | Sonnet | visto en navegador |
| W2 | fusionado sin verificar | main | Codex gpt-6-luna | pruebas y build nunca corrieron |
| W3 | fusionado sin verificar | main | Codex gpt-6-sol | modelo real en navegador sin probar |
| W4 | pendiente | | | |
| S1 | hecho | main | Codex gpt-6-luna + Fable | probado contra Ollama |
| I1 | pendiente | | | |
