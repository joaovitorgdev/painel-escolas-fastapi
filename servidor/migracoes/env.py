"""Ambiente do Alembic.

O servidor chama as migrações sozinho ao subir (servidor.armazenamento.migrar).
Pela linha de comando:  uv run alembic upgrade head   (usa PAINEL_DB_URL ou dados/painel.db)
"""
import os
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine

from servidor.armazenamento import Base, url_do_banco

alvo = Base.metadata


def rodar(con) -> None:
    context.configure(connection=con, target_metadata=alvo, render_as_batch=True)
    with context.begin_transaction():
        context.run_migrations()


con = context.config.attributes.get("connection")
if con is not None:
    rodar(con)
else:
    pasta = Path(os.environ.get("PAINEL_DADOS", "dados"))
    with create_engine(url_do_banco(pasta)).connect() as con:
        rodar(con)
