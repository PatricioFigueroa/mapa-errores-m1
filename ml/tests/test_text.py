from mapa_errores.text import format_passage, format_query


def test_query_format_exact():
    assert format_query("S", "c", "w") == "query: Wrong answer: w\nCorrect answer: c\nQuestion: S"


def test_passage_format_exact():
    assert format_passage("n") == "passage: n"


def test_wrong_answer_survives_long_stem():
    assert format_query("S" * 5000, "c", "w").index("Wrong answer: w") < 30
