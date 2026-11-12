"""Evaluate three baselines on one question-grouped Eedi fold."""

import argparse
import json
from pathlib import Path

from mapa_errores.data import load_catalog, load_pairs
from mapa_errores.evaluate import evaluate
from mapa_errores.retrieve import BM25Retriever, EmbeddingRetriever, FrequencyRetriever
from mapa_errores.split import assign_folds


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--fold", type=int, default=0)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    pairs, catalog = load_pairs(args.data), load_catalog(args.data)
    folds = assign_folds(pairs)
    train, test = pairs[folds != args.fold].copy(), pairs[folds == args.fold]
    positions = {error_id: i for i, error_id in enumerate(catalog.error_id)}
    train["error_pos"] = train.error_id.map(positions)
    results = {}
    for name, retriever in {
        "frequency": FrequencyRetriever(),
        "bm25": BM25Retriever(),
        "e5_base": EmbeddingRetriever("intfloat/multilingual-e5-small"),
    }.items():
        retriever.fit(list(catalog.name), train)
        results[name] = evaluate(retriever, test, catalog, train)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(results, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
