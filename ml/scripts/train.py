"""Train and evaluate one fold of the locally held Eedi dataset."""

import argparse
import json
import time
from pathlib import Path

import torch

from mapa_errores.data import load_catalog, load_pairs
from mapa_errores.evaluate import evaluate
from mapa_errores.retrieve import EmbeddingRetriever
from mapa_errores.split import assign_folds
from mapa_errores.train import finetune


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--fold", type=int, default=0)
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--no-fp16", action="store_true")
    args = parser.parse_args()
    pairs, catalog = load_pairs(args.data), load_catalog(args.data)
    folds = assign_folds(pairs, seed=args.seed)
    train, test = pairs[folds != args.fold], pairs[folds == args.fold]
    if torch.cuda.is_available():
        torch.cuda.reset_peak_memory_stats()
    start = time.monotonic()
    model_dir = finetune(train, catalog, args.out, seed=args.seed, fp16=not args.no_fp16)
    minutes = (time.monotonic() - start) / 60
    retriever = EmbeddingRetriever(str(model_dir))
    retriever.fit(list(catalog.name))
    result = evaluate(retriever, test, catalog, train)
    result["training_minutes"] = minutes
    result["peak_gpu_bytes"] = torch.cuda.max_memory_allocated() if torch.cuda.is_available() else 0
    output = Path("../docs/results") / f"finetuned-fold{args.fold}-seed{args.seed}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
