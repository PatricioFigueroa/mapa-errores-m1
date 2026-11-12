"""Local command-line diagnosis of math distractors."""

import argparse
import json
from pathlib import Path

from mapa_errores.data import load_catalog
from mapa_errores.retrieve import EmbeddingRetriever, Retriever
from mapa_errores.text import format_query


def diagnose(
    retriever: Retriever, catalog_names: list[str], stem: str, correct: str,
    wrongs: list[str], top: int = 3,
) -> list[list[tuple[str, float]]]:
    queries = [format_query(stem, correct, wrong) for wrong in wrongs]
    indices, scores = retriever.rank(queries, k=top)
    return [
        [(catalog_names[int(position)], float(score)) for position, score in zip(row, row_scores, strict=True)]
        for row, row_scores in zip(indices, scores, strict=True)
    ]


def main() -> None:
    parser = argparse.ArgumentParser(prog="mapa-errores")
    commands = parser.add_subparsers(dest="command", required=True)
    command = commands.add_parser("diagnose")
    command.add_argument("--model", required=True)
    command.add_argument("--catalog", type=Path, required=True)
    command.add_argument("--stem", required=True)
    command.add_argument("--correct", required=True)
    command.add_argument("--wrong", action="append", required=True)
    command.add_argument("--top", type=int, default=3)
    args = parser.parse_args()
    if args.catalog.is_dir():
        names = list(load_catalog(args.catalog).name)
    else:
        data = json.loads(args.catalog.read_text(encoding="utf-8"))
        names = [item["name"] for item in data["items"]]
    retriever = EmbeddingRetriever(args.model)
    retriever.fit(names)
    for wrong, results in zip(args.wrong, diagnose(retriever, names, args.stem, args.correct, args.wrong, args.top), strict=True):
        print(json.dumps({"wrong": wrong, "errors": results}, ensure_ascii=False))


if __name__ == "__main__":
    main()
