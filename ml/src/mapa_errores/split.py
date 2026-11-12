"""Question text grouped folds and unseen-label detection."""

import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold


def assign_folds(pairs: pd.DataFrame, n_folds: int = 5, seed: int = 0) -> np.ndarray:
    groups = pairs.stem.astype(str).str.lower().str.split().str.join(" ")
    folds = np.empty(len(pairs), dtype=int)
    splitter = GroupKFold(n_splits=n_folds, shuffle=True, random_state=seed)
    for fold, (_, test_index) in enumerate(splitter.split(pairs, groups=groups)):
        folds[test_index] = fold
    return folds


def unseen_mask(train: pd.DataFrame, test: pd.DataFrame) -> np.ndarray:
    return ~test.error_id.isin(train.error_id).to_numpy()
