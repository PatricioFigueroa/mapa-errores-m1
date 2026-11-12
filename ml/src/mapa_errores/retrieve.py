"""Interchangeable catalogue retrievers."""

import re
from typing import Protocol

import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi

from mapa_errores.text import format_passage


class Retriever(Protocol):
    def fit(self, catalog_names: list[str], train: pd.DataFrame | None = None) -> None: ...
    def rank(self, queries: list[str], k: int = 25) -> tuple[np.ndarray, np.ndarray]: ...


def _top(scores: np.ndarray, k: int) -> tuple[np.ndarray, np.ndarray]:
    indices = np.argsort(-scores, axis=1, kind="stable")[:, :k]
    return indices, np.take_along_axis(scores, indices, axis=1)


class FrequencyRetriever:
    def fit(self, catalog_names: list[str], train: pd.DataFrame | None = None) -> None:
        self.scores = np.zeros(len(catalog_names))
        if train is not None:
            for position in train.error_pos:
                self.scores[int(position)] += 1

    def rank(self, queries: list[str], k: int = 25) -> tuple[np.ndarray, np.ndarray]:
        return _top(np.tile(self.scores, (len(queries), 1)), k)


def _tokens(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


class BM25Retriever:
    def fit(self, catalog_names: list[str], train: pd.DataFrame | None = None) -> None:
        self.model = BM25Okapi([_tokens(name) for name in catalog_names])

    def rank(self, queries: list[str], k: int = 25) -> tuple[np.ndarray, np.ndarray]:
        return _top(np.array([self.model.get_scores(_tokens(query)) for query in queries]), k)


class EmbeddingRetriever:
    def __init__(self, model_name_or_path: str, max_seq_length: int = 192, batch_size: int = 64, device: str | None = None):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(model_name_or_path, device=device)
        self.model.max_seq_length = max_seq_length
        self.batch_size = batch_size

    def fit(self, catalog_names: list[str], train: pd.DataFrame | None = None) -> None:
        self.catalog_embeddings = self.model.encode(
            [format_passage(name) for name in catalog_names], batch_size=self.batch_size,
            normalize_embeddings=True, convert_to_numpy=True,
        )

    def rank(self, queries: list[str], k: int = 25) -> tuple[np.ndarray, np.ndarray]:
        query_embeddings = self.model.encode(
            queries, batch_size=self.batch_size, normalize_embeddings=True, convert_to_numpy=True,
        )
        return _top(query_embeddings @ self.catalog_embeddings.T, k)
