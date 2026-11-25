"""Fixtures: cada teste ganha um banco novo.

Por padrão é um SQLite numa pasta temporária. Com PAINEL_DB_URL (o CI faz isso) os mesmos
testes rodam no PostgreSQL; aí as tabelas são apagadas antes de cada teste.
"""
import importlib
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from servidor.armazenamento import Armazenamento, Base

URL = os.environ.get("PAINEL_DB_URL")


def _zerar() -> None:
    if not URL:
        return
    motor = create_engine(URL)
    Base.metadata.drop_all(motor)
    with motor.begin() as con:
        con.execute(text("DROP TABLE IF EXISTS alembic_version"))
    motor.dispose()


@pytest.fixture
def banco(tmp_path):
    """A camada de dados sozinha, sem HTTP."""
    _zerar()
    db = Armazenamento(tmp_path)
    yield db
    db.motor.dispose()


@pytest.fixture
def abrir(tmp_path, monkeypatch):
    """Sobe o app; chamar de novo simula reiniciar o servidor no mesmo banco."""
    _zerar()
    monkeypatch.setenv("PAINEL_DADOS", str(tmp_path))
    motores = []

    def _abrir() -> TestClient:
        import servidor.app as m

        m = importlib.reload(m)
        motores.append(m.db.motor)
        return TestClient(m.app)

    yield _abrir
    for motor in motores:
        motor.dispose()


@pytest.fixture
def cliente(abrir) -> TestClient:
    return abrir()
