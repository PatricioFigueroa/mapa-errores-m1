from pathlib import Path

import pandas as pd

from mapa_errores.data import load_pairs
from mapa_errores.split import assign_folds, unseen_mask

FIXTURE = Path(__file__).parent / "fixtures" / "eedi"


def test_no_stem_in_two_folds():
    pairs = load_pairs(FIXTURE)
    folds = assign_folds(pairs, n_folds=3)
    assert pairs.assign(fold=folds).groupby("stem").fold.nunique().max() == 1


def test_same_stem_different_id_same_fold():
    pairs = pd.concat([load_pairs(FIXTURE), load_pairs(FIXTURE).assign(question_id=lambda d: d.question_id + 100)])
    folds = assign_folds(pairs, n_folds=3)
    assert pairs.assign(fold=folds).groupby("stem").fold.nunique().max() == 1


def test_assign_folds_is_deterministic():
    pairs = load_pairs(FIXTURE)
    assert (assign_folds(pairs, 3, seed=7) == assign_folds(pairs, 3, seed=7)).all()


def test_unseen_mask():
    pairs = load_pairs(FIXTURE)
    train, test = pairs[pairs.question_id != 3], pairs[pairs.question_id == 3]
    assert unseen_mask(train, test).tolist() == [True]
