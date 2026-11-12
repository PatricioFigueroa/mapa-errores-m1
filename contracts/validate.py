# /// script
# requires-python = ">=3.10"
# dependencies = ["jsonschema>=4"]
# ///
"""Validate an artifact directory against the contracts.

Usage: uv run contracts/validate.py [ARTIFACT_DIR]   (default: contracts/fixtures)
Exits non-zero and prints every problem found.
"""
from __future__ import annotations

import hashlib
import json
import math
import struct
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

HERE = Path(__file__).parent
LETTERS = ("A", "B", "C", "D")


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def schema_errors(name: str, data: dict) -> list[str]:
    validator = Draft202012Validator(load(HERE / f"{name}.schema.json"))
    return [f"{name}.json: {'/'.join(map(str, e.path))}: {e.message}" for e in validator.iter_errors(data)]


def validate(directory: Path) -> list[str]:
    problems: list[str] = []
    catalog, bank, manifest = (load(directory / f"{n}.json") for n in ("catalog", "bank", "manifest"))
    for name, data in (("catalog", catalog), ("bank", bank), ("manifest", manifest)):
        problems += schema_errors(name, data)
    if problems:
        return problems  # cross-checks below assume valid shapes

    ids = [item["id"] for item in catalog["items"]]
    if len(set(ids)) != len(ids):
        problems.append("catalog.json: duplicate error ids")

    question_ids = [q["id"] for q in bank["questions"]]
    if len(set(question_ids)) != len(question_ids):
        problems.append("bank.json: duplicate question ids")
    for q in bank["questions"]:
        distractors = [letter for letter in LETTERS if letter != q["answer"]]
        if sorted(q["tags"]) != distractors:
            problems.append(f"bank.json: {q['id']}: tags must cover exactly the distractors {distractors}")
        for letter, tags in q["tags"].items():
            scores = [t["score"] for t in tags]
            if scores != sorted(scores, reverse=True):
                problems.append(f"bank.json: {q['id']}/{letter}: tags not sorted by score")
            for t in tags:
                if t["error"] not in ids:
                    problems.append(f"bank.json: {q['id']}/{letter}: unknown error {t['error']}")

    n, dim = len(ids), manifest["dim"]
    if manifest["n_catalog"] != n:
        problems.append(f"manifest.json: n_catalog={manifest['n_catalog']} but catalogue has {n} items")
    digest = hashlib.sha256((directory / "catalog.json").read_bytes().replace(b"\r\n", b"\n")).hexdigest()
    if manifest["catalog_sha256"] != digest:
        problems.append(f"manifest.json: catalog_sha256 mismatch (expected {digest})")

    raw = (directory / "catalog.f32").read_bytes()
    if len(raw) != n * dim * 4:
        problems.append(f"catalog.f32: {len(raw)} bytes, expected {n * dim * 4}")
    else:
        for row in range(n):
            values = struct.unpack_from(f"<{dim}f", raw, row * dim * 4)
            norm = math.sqrt(sum(v * v for v in values))
            if abs(norm - 1.0) > 1e-3:
                problems.append(f"catalog.f32: row {row} has L2 norm {norm:.4f}, expected 1")
    return problems


if __name__ == "__main__":
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "fixtures"
    found = validate(target)
    for line in found:
        print(line)
    print(f"{target}: {'OK' if not found else f'{len(found)} problem(s)'}")
    sys.exit(1 if found else 0)
