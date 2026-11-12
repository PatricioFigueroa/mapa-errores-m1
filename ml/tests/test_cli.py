import numpy as np

from mapa_errores.cli import diagnose


def test_diagnose_returns_top_names_per_wrong_answer():
    class Fixed:
        def fit(self, catalog_names, train=None): pass
        def rank(self, queries, k=25):
            return np.tile([1, 0], (len(queries), 1))[:, :k], np.tile([0.9, 0.1], (len(queries), 1))[:, :k]
    out = diagnose(Fixed(), ["a", "b"], "S", "c", ["w1", "w2"], top=1)
    assert out == [[("b", 0.9)], [("b", 0.9)]]
