"""Ranking metrics for one true catalogue position per query."""

from collections.abc import Hashable, Sequence

import numpy as np


def average_precision_at_k(ranked: Sequence[int], truth: int, k: int = 25) -> float:
    return next((1.0 / (i + 1) for i, pos in enumerate(ranked[:k]) if pos == truth), 0.0)


def map_at_k(rankings: Sequence[Sequence[int]], truths: Sequence[int], k: int = 25) -> float:
    return float(np.mean([average_precision_at_k(row, truth, k) for row, truth in zip(rankings, truths, strict=True)]))


def recall_at_k(rankings: Sequence[Sequence[int]], truths: Sequence[int], k: int) -> float:
    return float(np.mean([truth in row[:k] for row, truth in zip(rankings, truths, strict=True)]))


def mrr(rankings: Sequence[Sequence[int]], truths: Sequence[int]) -> float:
    return map_at_k(rankings, truths, k=max((len(row) for row in rankings), default=0))


def bootstrap_ci(
    values: Sequence[float], groups: Sequence[Hashable], n_resamples: int = 10000,
    seed: int = 0, alpha: float = 0.05,
) -> tuple[float, float]:
    if len(values) != len(groups) or not values:
        raise ValueError("values and groups must have equal, nonzero length")
    group_values: dict[Hashable, list[float]] = {}
    for value, group in zip(values, groups, strict=True):
        group_values.setdefault(group, []).append(value)
    grouped = list(group_values.values())
    rng = np.random.default_rng(seed)
    means = []
    for _ in range(n_resamples):
        sample = [value for i in rng.integers(len(grouped), size=len(grouped)) for value in grouped[i]]
        means.append(np.mean(sample))
    return tuple(float(x) for x in np.quantile(means, [alpha / 2, 1 - alpha / 2]))
