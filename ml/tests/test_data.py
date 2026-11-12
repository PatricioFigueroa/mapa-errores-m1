from pathlib import Path

from mapa_errores.data import count_unlabelled, load_catalog, load_pairs

FIXTURE = Path(__file__).parent / "fixtures" / "eedi"


def test_one_row_per_labelled_distractor():
    assert len(load_pairs(FIXTURE)) == 5


def test_correct_option_never_a_row():
    pairs = load_pairs(FIXTURE)
    assert not ((pairs.question_id == 1) & (pairs.option == "B")).any()


def test_row_content():
    row = load_pairs(FIXTURE).query("question_id == 1 and option == 'A'").iloc[0]
    assert row.wrong == r"\( \frac{2}{5} \)" and row.correct == r"\( \frac{5}{6} \)" and row.error_id == 0


def test_unlabelled_are_counted():
    assert count_unlabelled(FIXTURE) == 4


def test_catalog_keeps_file_order():
    assert list(load_catalog(FIXTURE).error_id) == [0, 1, 2, 3, 4]
