"""Load Eedi files locally without redistributing their contents."""

from pathlib import Path

import pandas as pd


def load_catalog(data_dir: Path) -> pd.DataFrame:
    catalog = pd.read_csv(data_dir / "misconception_mapping.csv")
    return catalog.rename(columns={"MisconceptionId": "error_id", "MisconceptionName": "name"})[["error_id", "name"]]


def _distractors(data_dir: Path) -> tuple[pd.DataFrame, int]:
    questions = pd.read_csv(data_dir / "train.csv")
    rows = []
    unlabelled = 0
    for question in questions.itertuples(index=False):
        for option in "ABCD":
            if option == question.CorrectAnswer:
                continue
            error_id = getattr(question, f"Misconception{option}Id")
            if pd.isna(error_id):
                unlabelled += 1
                continue
            rows.append({
                "question_id": question.QuestionId,
                "subject": question.SubjectName,
                "construct": question.ConstructName,
                "stem": question.QuestionText,
                "correct": getattr(question, f"Answer{question.CorrectAnswer}Text"),
                "option": option,
                "wrong": getattr(question, f"Answer{option}Text"),
                "error_id": int(error_id),
            })
    return pd.DataFrame(rows), unlabelled


def load_pairs(data_dir: Path) -> pd.DataFrame:
    return _distractors(data_dir)[0]


def count_unlabelled(data_dir: Path) -> int:
    return _distractors(data_dir)[1]
