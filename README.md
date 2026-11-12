# Mapa de errores M1

**Work in progress.** A tool that explains *why* a multiple-choice math answer is wrong, not just *that* it is wrong.

Every wrong option in a well-written math question encodes a specific misconception: picking $\frac{2}{5}$ for $\frac{1}{2}+\frac{1}{3}$ means "adds numerators and denominators separately". This project trains a small retrieval model to map each wrong option to the misconception most likely behind it, and builds two faces on top of it, in Spanish, for the Chilean university admission test (PAES M1):

- **Student:** answer a short quiz and get an *error map*, the misconceptions that best explain your wrong answers across questions, with practice aimed at each one.
- **Teacher:** paste your own question and see, for each wrong option, the most likely misconceptions from a fixed catalogue.

Diagnoses are always presented as hypotheses, never as certainties.

## How it works

```
ml/ (Python)  --builds-->  static artifacts  --read by-->  web/ (Angular + Ionic PWA)
                           (contracts/)                      |  optional
                                                             v
                                                        server/ (Express) --> LLM
```

- **`ml/`**: fine-tunes `intfloat/multilingual-e5-small` as a retriever (wrong answer + correct answer + question, matched to a misconception description) with `sentence-transformers` and a cached multiple-negatives ranking loss, using the Eedi "Mining Misconceptions in Mathematics" data (English). Evaluation splits by question to avoid leakage and reports seen and unseen misconceptions separately, against frequency, BM25 and zero-shot baselines.
- **`contracts/`**: JSON Schemas for the artifacts (`catalog.json`, `bank.json`, `manifest.json`, `catalog.f32` embeddings) plus a validator. The only interface between `ml/` and `web/`.
- **`web/`**: the model runs **in the browser** (ONNX, `transformers.js`, Web Worker), so no GPU or paid API is needed to use it and student answers never leave the device. Math is rendered with KaTeX.
- **`server/`**: a stateless Express service for two optional LLM features (turning pasted text into a structured question, drafting a reinforcement exercise), with rate limits, schema-validated output and graceful fallback. Works with any OpenAI-compatible endpoint, including a local Ollama model.

The full design (in Spanish) is in [`docs/diseno.md`](docs/diseno.md); the work plan in [`docs/plan-maestro.md`](docs/plan-maestro.md).

## Status

| Part | State |
|---|---|
| Artifact contracts and fixtures | Done; validator passes |
| `ml/` metrics, data loader, leakage-safe folds, retrievers, fine-tuning, CLI | Done and tested on invented fixtures (26 tests). **Not yet trained or evaluated on real data.** |
| `server/` | Done; 17 tests; checked end to end against a local Ollama model |
| `web/` skeleton, student face, teacher face | Done; 34 tests, lint and build pass. Not yet exercised end to end with a trained model |
| Spanish misconception catalogue | 74-entry draft under review |
| Spanish evaluation set, real results, in-browser model export, PWA, deployment | Not started |

No result numbers are published yet: every figure that appears here will come from a reproducible run.

## Run it

```bash
# contracts
uv run contracts/validate.py

# ML (Python 3.12, uv)
cd ml && uv sync && uv run pytest -m "not slow"

# server (Node 24)
cd server && npm ci && npm test

# web app with fixture data, at http://localhost:4200
cd web && npm ci && npm start
```

Training needs the Eedi competition data, which cannot be redistributed: `ml/scripts/download_eedi.py` fetches it with your own Kaggle credentials.

## Data and licences

- Code: MIT (see [`LICENSE`](LICENSE)).
- The Eedi competition data and any weights trained on it are CC BY-NC 4.0 and are never committed here.
- Official PAES test items (DEMRE) are not used: their terms forbid using them to train or improve AI models without written permission.
- The Spanish questions come from the author's own study guides.
