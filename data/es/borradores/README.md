# Borradores del catálogo

Nada de esta carpeta es el catálogo del proyecto. El catálogo definitivo lo decide el autor y vivirá en `data/es/catalog.json`.

`catalog.borrador.json`: 74 errores en los siete temas, en el formato de `contracts/catalog.schema.json`. Propuesta para que el autor acepte, corrija, fusione o descarte cada entrada.

- Se redactó **sin leer las preguntas de las guías**, a partir de los títulos de los temas y de errores frecuentes conocidos. Así las preguntas de prueba siguen sin haberse mirado, como exige el protocolo de evaluación (`docs/diseno.md`, sección 6). Por lo mismo, puede faltar algún error que las guías sí provocan: eso se detecta con las 20 preguntas de desarrollo.
- Los identificadores (`E001` a `E074`) son provisionales.
- Los valores de `topic` son una propuesta de nombres para el banco: `potencias-raices`, `algebra`, `proporcionalidad`, `ecuaciones-inecuaciones`, `sistemas`, `funcion-lineal-afin`, `funcion-cuadratica`.
- El campo `name` es el texto que el modelo convierte en embedding: conviene que describa lo que hace el estudiante, en una frase, sin fórmulas.
- Las actividades (`activity`) son sugerencias breves; el autor las reescribe a su criterio.
