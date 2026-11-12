# AGENTS.md — Mapa de errores M1

Reglas para cualquier modelo que trabaje en este repositorio (Claude, Codex u otro).

## Antes de tocar nada

1. Lee `docs/diseno.md` (qué se construye y por qué) y `docs/plan-maestro.md` (qué paquete te toca).
2. Trabaja un solo paquete por sesión, en su rama, y solo en sus carpetas.

## Reglas duras

- **Licencias.** Nunca subas al repositorio datos de Eedi (CSV, textos de preguntas o de su catálogo) ni material de DEMRE. `data/eedi/` y `artifacts/` están ignorados por git; no fuerces su inclusión.
- **Datos reales.** No inventes métricas, etiquetas ni resultados. Todo número del README o de `docs/results/` sale de una ejecución reproducible. El catálogo y las etiquetas en español los escribe el autor; puedes proponer borradores marcados como tales.
- **Privacidad.** Sin cuentas, sin datos personales, sin enviar respuestas de estudiantes a ningún servidor ni analítica.
- **Secretos.** Las claves van en variables de entorno. No las escribas en código, pruebas, commits ni registros.
- **Alcance.** No agregues LangChain, LangGraph, bases vectoriales ni funciones que `diseno.md` deja fuera.

## Convenciones

- Código, comentarios, commits y README en inglés. Interfaz, catálogo y banco en español. Commits con Conventional Commits.
- Python 3.12 con `uv` (`uv run`, `uv add`). TypeScript estricto en `web/` y `server/`.
- Los tests no requieren GPU, red ni datos de Eedi: usan fixtures con filas inventadas.
- Antes de usar la API de una biblioteca, confirma la firma en su documentación actual; no confíes en la memoria.
- Los contratos de `contracts/` y el formato de texto de `diseno.md` 5.3 no se cambian dentro de otro paquete.
- Equipo de entrenamiento: GTX 1650 de 4 GB, Windows 11. Las rutas y comandos deben funcionar en Windows.

## Al terminar

Actualiza la tabla de estado de `docs/plan-maestro.md` y agrega una línea a `docs/bitacora.md` (archivo local, ignorado por git): fecha, paquete, modelo, hecho, no verificado.
