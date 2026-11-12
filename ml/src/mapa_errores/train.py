"""Fine-tune multilingual E5 with hard negatives and cached MNRL."""

from pathlib import Path

import pandas as pd
from datasets import Dataset
from sentence_transformers import (
    SentenceTransformer,
    SentenceTransformerTrainer,
    SentenceTransformerTrainingArguments,
)
from sentence_transformers.sentence_transformer import losses
from sentence_transformers.sentence_transformer.training_args import BatchSamplers
from sentence_transformers.util import mine_hard_negatives

from mapa_errores.text import format_passage, format_query


def build_training_dataset(
    train: pd.DataFrame, catalog: pd.DataFrame, model: SentenceTransformer, hard_negatives: int = 2,
) -> Dataset:
    names = dict(zip(catalog.error_id, catalog.name, strict=True))
    anchors = [format_query(row.stem, row.correct, row.wrong) for row in train.itertuples()]
    positives = [format_passage(names[row.error_id]) for row in train.itertuples()]
    source = Dataset.from_dict({"anchor": anchors, "positive": positives})
    if hard_negatives == 0:
        return source
    mined = mine_hard_negatives(
        source, model, corpus=[format_passage(name) for name in catalog.name],
        num_negatives=hard_negatives, output_format="n-tuple", verbose=False,
    )
    for row in mined:
        assert all(row[f"negative_{i}"] != row["positive"] for i in range(1, hard_negatives + 1))
    return mined


def finetune(
    train: pd.DataFrame, catalog: pd.DataFrame, out_dir: Path,
    base_model: str = "intfloat/multilingual-e5-small", epochs: int = 3,
    batch_size: int = 32, mini_batch_size: int = 16, max_seq_length: int = 192,
    lr: float = 2e-5, hard_negatives: int = 2, seed: int = 0, fp16: bool = True,
) -> Path:
    model = SentenceTransformer(base_model)
    model.max_seq_length = max_seq_length
    dataset = build_training_dataset(train, catalog, model, hard_negatives)
    out_dir.mkdir(parents=True, exist_ok=True)
    args = SentenceTransformerTrainingArguments(
        output_dir=str(out_dir), num_train_epochs=epochs,
        per_device_train_batch_size=batch_size, learning_rate=lr, fp16=fp16,
        batch_sampler=BatchSamplers.NO_DUPLICATES, seed=seed,
        save_strategy="no", report_to="none", dataloader_num_workers=0,
    )
    trainer = SentenceTransformerTrainer(
        model=model, args=args, train_dataset=dataset,
        loss=losses.CachedMultipleNegativesRankingLoss(model, mini_batch_size=mini_batch_size),
    )
    trainer.train()
    model.save(str(out_dir))
    return out_dir
