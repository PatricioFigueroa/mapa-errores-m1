# Contracts

The only interface between `ml/` (which produces artifacts) and `web/` (which consumes them).
Field meanings are specified in `docs/diseno.md`, section 5.3.

- `catalog.schema.json`, `bank.schema.json`, `manifest.schema.json`: JSON Schema (draft 2020-12).
- `catalog.f32`: little-endian float32, shape `[n_catalog, dim]`, L2-normalised rows, same order as `catalog.json`.
- `fixtures/`: a tiny invented data set (5 questions, 6 misconceptions). Its `catalog.f32` holds random
  vectors, not real embeddings: enough to exercise loading and ranking code, useless for judging quality.

Check any artifact directory:

    uv run contracts/validate.py [ARTIFACT_DIR]

Changing a schema requires its own commit that also updates `docs/diseno.md` and the fixtures.
