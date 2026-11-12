"""Download licensed Eedi competition files to the ignored local data directory."""

import os
from pathlib import Path


def main() -> None:
    credentials = Path.home() / ".kaggle" / "kaggle.json"
    if not (os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY")) and not credentials.is_file():
        raise SystemExit("Kaggle credentials missing: set KAGGLE_USERNAME and KAGGLE_KEY or provide ~/.kaggle/kaggle.json")
    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()
    target = Path(__file__).resolve().parents[2] / "data" / "eedi"
    target.mkdir(parents=True, exist_ok=True)
    api.competition_download_files("eedi-mining-misconceptions-in-mathematics", path=str(target), quiet=False)


if __name__ == "__main__":
    main()
