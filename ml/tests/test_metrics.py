import pytest

from mapa_errores.metrics import (
    average_precision_at_k,
    bootstrap_ci,
    map_at_k,
    mrr,
    recall_at_k,
)


def test_ap_truth_at_rank_2():
    assert average_precision_at_k([3, 1, 2], truth=1) == 0.5

def test_ap_truth_beyond_k_is_zero():
    assert average_precision_at_k([3, 1, 2], truth=2, k=2) == 0.0

def test_map_is_mean_of_ap():
    assert map_at_k([[1, 2], [2, 1]], [1, 1]) == 0.75

def test_recall_at_k():
    assert recall_at_k([[1, 2], [2, 1]], [1, 1], k=1) == 0.5

def test_mrr_counts_missing_as_zero():
    assert mrr([[1, 2], [2, 1], [3, 4]], [1, 1, 9]) == pytest.approx(0.5)

def test_bootstrap_ci_constant_values():
    assert bootstrap_ci([0.5] * 10, groups=list(range(10))) == (0.5, 0.5)

def test_bootstrap_ci_resamples_whole_groups():
    lo, hi = bootstrap_ci([0, 0, 1, 1], groups=[0, 0, 1, 1], n_resamples=200)
    assert (lo, hi) == (0.0, 1.0)
