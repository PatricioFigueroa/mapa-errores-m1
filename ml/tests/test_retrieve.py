import pandas as pd
import pytest

from mapa_errores.retrieve import BM25Retriever, EmbeddingRetriever, FrequencyRetriever
from mapa_errores.text import format_query


def test_frequency_ranks_most_common_first():
    r = FrequencyRetriever()
    r.fit(["a", "b", "c"], train=pd.DataFrame({"error_pos": [2, 2, 0]}))
    assert r.rank(["q"], k=3)[0][0].tolist() == [2, 0, 1]


def test_bm25_prefers_lexical_match():
    r = BM25Retriever()
    r.fit(["adds numerators and denominators", "forgets the negative sign"])
    assert r.rank(["student adds numerators"], k=2)[0][0, 0] == 0


def test_rank_shapes():
    r = BM25Retriever(); r.fit(["a b", "c d", "e f"])
    idx, scores = r.rank(["a", "c"], k=2)
    assert idx.shape == (2, 2) and scores.shape == (2, 2)


@pytest.mark.slow
def test_embedding_retriever_runs_on_cpu():
    r = EmbeddingRetriever("intfloat/multilingual-e5-small", device="cpu")
    r.fit(["adds numerators and denominators", "forgets the negative sign"])
    assert r.rank([format_query("1/2+1/3", "5/6", "2/5")], k=2)[0].shape == (1, 2)
