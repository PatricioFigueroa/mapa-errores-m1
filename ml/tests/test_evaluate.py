from pathlib import Path

import numpy as np
import pytest

from mapa_errores.data import load_catalog, load_pairs
from mapa_errores.evaluate import evaluate

FIXTURE = Path(__file__).parent / "fixtures" / "eedi"


class FirstIsTruth:
    """Stub: ranks the true catalogue position first for every query."""
    def __init__(self, truths, n): self.truths, self.n = truths, n
    def fit(self, catalog_names, train=None): pass
    def rank(self, queries, k=25):
        idx = np.array([[t] + [i for i in range(self.n) if i != t] for t in self.truths])[:, :k]
        return idx, np.zeros(idx.shape)


def test_evaluate_perfect_retriever():
    pairs, catalog = load_pairs(FIXTURE), load_catalog(FIXTURE)
    truths = [list(catalog.error_id).index(e) for e in pairs.error_id]
    out = evaluate(FirstIsTruth(truths, len(catalog)), pairs, catalog)
    assert out["map25"] == 1.0 and out["top1"] == 1.0 and out["n"] == 5


def test_evaluate_distinguishes_duplicate_names():
    pairs, catalog = load_pairs(FIXTURE), load_catalog(FIXTURE)
    out = evaluate(FirstIsTruth([3] * 5, len(catalog)), pairs, catalog)
    assert out["top1"] == pytest.approx(1 / 5)


def test_evaluate_reports_unseen():
    pairs, catalog = load_pairs(FIXTURE), load_catalog(FIXTURE)
    train, test = pairs[pairs.question_id != 3], pairs[pairs.question_id == 3]
    out = evaluate(FirstIsTruth([4], len(catalog)), test, catalog, train=train)
    assert out["n_unseen"] == 1 and out["map25_unseen"] == 1.0
