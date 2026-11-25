"""tabelas iniciais

Revision ID: 0001
Revises:
Create Date: 2026-11-24
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "versao",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("n", sa.Integer(), nullable=False),
    )
    op.create_table(
        "escolas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rev", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("inep", sa.String(8), nullable=True),
        sa.Column("sre", sa.Integer(), nullable=True),
        sa.Column("mun", sa.String(100), nullable=True),
        sa.Column("alunos", sa.Integer(), nullable=True),
        sa.Column("turmas", sa.Integer(), nullable=True),
        sa.Column("dados", sa.JSON(), nullable=False),
    )
    op.create_table(
        "registros",
        sa.Column("seq", sa.Integer(), primary_key=True),
        sa.Column("id", sa.String(16), nullable=False, unique=True),
        sa.Column("colecao", sa.String(32), nullable=False),
        sa.Column("criado_em", sa.BigInteger(), nullable=False),
        sa.Column("asset", sa.String(64), nullable=True),
        sa.Column("dados", sa.JSON(), nullable=False),
    )
    op.create_index("ix_registros_colecao", "registros", ["colecao"])
    op.create_index("ix_registros_asset", "registros", ["asset"])
    op.create_table(
        "meta",
        sa.Column("ek", sa.String(64), primary_key=True),
        sa.Column("atualizado_em", sa.BigInteger(), nullable=False),
        sa.Column("dados", sa.JSON(), nullable=False),
    )
    op.create_table(
        "blobs",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("tipo", sa.String(100), nullable=False),
        sa.Column("tam", sa.BigInteger(), nullable=False),
    )


def downgrade() -> None:
    for t in ("blobs", "meta", "registros", "escolas", "versao"):
        op.drop_table(t)
