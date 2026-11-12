"""Evaluate a fitted retriever against catalogue positions."""

import pandas as pd

from mapa_errores.metrics import map_at_k, mrr, recall_at_k
from mapa_errores.retrieve import Retriever
from mapa_errores.split import unseen_mask
from mapa_errores.text import format_query


def evaluate(
    retriever: Retriever, test: pd.DataFrame, catalog: pd.DataFrame,
    train: pd.DataFrame | None = None, k: int = 25,
) -> dict:
    positions = {error_id: i for i, error_id in enumerate(catalog.error_id)}
    truths = [positions[error_id] for error_id in test.error_id]
    queries = [format_query(row.stem, row.correct, row.wrong) for row in test.itertuples()]
    rankings, _ = retriever.rank(queries, k=k)
    seen = unseen_mask(train, test) if train is not None else None
    out = {
        "map25": map_at_k(rankings, truths, k=k),
        "recall25": recall_at_k(rankings, truths, k=k),
        "top1": recall_at_k(rankings, truths, k=1),
        "mrr": mrr(rankings, truths),
        "n": len(test),
        "map25_seen": None,
        "map25_unseen": None,
        "n_unseen": 0,
    }
    if seen is not None:
        out["n_unseen"] = int(seen.sum())
        if seen.any():
            out["map25_unseen"] = map_at_k(rankings[seen], [t for t, mask in zip(truths, seen, strict=True) if mask], k=k)
        if (~seen).any():
            out["map25_seen"] = map_at_k(rankings[~seen], [t for t, mask in zip(truths, seen, strict=True) if not mask], k=k)
    return out
