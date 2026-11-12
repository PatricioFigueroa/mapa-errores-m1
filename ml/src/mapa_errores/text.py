"""Shared E5 input format for training, export, and inference."""


def format_query(stem: str, correct: str, wrong: str) -> str:
    return f"query: Wrong answer: {wrong}\nCorrect answer: {correct}\nQuestion: {stem}"


def format_passage(name: str) -> str:
    return f"passage: {name}"
