from pathlib import Path

import pytest

from mapa_errores.data import load_catalog, load_pairs
from mapa_errores.retrieve import EmbeddingRetriever
from mapa_errores.train import finetune

FIXTURE = Path(__file__).parent / "fixtures" / "eedi"


@pytest.mark.slow
def test_finetune_smoke(tmp_path):
    pairs, catalog = load_pairs(FIXTURE), load_catalog(FIXTURE)
    out = finetune(pairs, catalog, tmp_path / "m", epochs=1, batch_size=2, mini_batch_size=2,
                   hard_negatives=1, fp16=False)
    r = EmbeddingRetriever(str(out), device="cpu")
    r.fit(list(catalog.name))
    assert r.rank(["query: x"], k=5)[0].shape == (1, 5)
