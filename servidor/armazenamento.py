"""Camada de dados do Painel de Escolas (SQLAlchemy 2).

Tudo o que a API lê ou grava passa por aqui, com os mesmos métodos e formatos de antes.
Por padrão o banco é um SQLite em <pasta>/painel.db; com PAINEL_DB_URL o mesmo código
usa PostgreSQL. As tabelas são criadas pelas migrações do Alembic (servidor/migracoes)
quando o servidor sobe. Os arquivos enviados ficam em disco, em <pasta>/arquivos.
"""
import json
import os
import secrets
import time
from contextlib import contextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import JSON, BigInteger, String, create_engine, delete, event, func, select, update
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker


class CotaEsgotada(Exception):
    pass


class Conflito(Exception):
    pass


COLECOES = ("links", "arquivos", "nte_registros", "escola_fotos", "orcamentos", "relatorios_salvos")
SEED = Path(__file__).parent / "seed" / "escolas.json"
MIGRACOES = Path(__file__).parent / "migracoes"
# campos da escola que viram coluna; o resto do cadastro (wifi, parque, sala...) vai na coluna JSON
ESCOLA_COLUNAS = ("nome", "inep", "sre", "mun", "alunos", "turmas")


def _agora() -> int:
    return int(time.time() * 1000)


def url_do_banco(pasta: Path) -> str:
    return os.environ.get("PAINEL_DB_URL") or f"sqlite:///{Path(pasta) / 'painel.db'}"


# ---------- tabelas ----------
class Base(DeclarativeBase):
    pass


class VersaoDB(Base):
    """Uma linha só. O número sobe a cada gravação; o front compara para saber se recarrega."""
    __tablename__ = "versao"
    id: Mapped[int] = mapped_column(primary_key=True)
    n: Mapped[int]


class EscolaDB(Base):
    __tablename__ = "escolas"
    id: Mapped[int] = mapped_column(primary_key=True)
    rev: Mapped[int] = mapped_column(default=0)
    nome: Mapped[str] = mapped_column(String(200))
    inep: Mapped[str | None] = mapped_column(String(8))
    sre: Mapped[int | None]
    mun: Mapped[str | None] = mapped_column(String(100))
    alunos: Mapped[int | None]
    turmas: Mapped[int | None]
    dados: Mapped[dict] = mapped_column(JSON)


class RegistroDB(Base):
    """Linhas das coleções (links, arquivos, fotos, NTE, orçamentos, relatórios)."""
    __tablename__ = "registros"
    seq: Mapped[int] = mapped_column(primary_key=True)  # ordem de criação
    id: Mapped[str] = mapped_column(String(16), unique=True)
    colecao: Mapped[str] = mapped_column(String(32), index=True)
    criado_em: Mapped[int] = mapped_column(BigInteger)
    asset: Mapped[str | None] = mapped_column(String(64), index=True)
    dados: Mapped[dict] = mapped_column(JSON)


class MetaDB(Base):
    __tablename__ = "meta"
    ek: Mapped[str] = mapped_column(String(64), primary_key=True)
    atualizado_em: Mapped[int] = mapped_column(BigInteger)
    dados: Mapped[dict] = mapped_column(JSON)


class BlobDB(Base):
    __tablename__ = "blobs"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tipo: Mapped[str] = mapped_column(String(100))
    tam: Mapped[int] = mapped_column(BigInteger)


# ---------- conversões linha <-> dict da API ----------
def _escola_dict(e: EscolaDB) -> dict:
    colunas = {c: getattr(e, c) for c in ESCOLA_COLUNAS if getattr(e, c) is not None}
    return {**e.dados, **colunas, "id": e.id, "rev": e.rev}


def _escola_campos(dados: dict) -> dict:
    resto = {k: v for k, v in dados.items() if k not in ESCOLA_COLUNAS and k not in ("id", "rev")}
    return {**{c: dados.get(c) for c in ESCOLA_COLUNAS}, "dados": resto}


def _registro_dict(r: RegistroDB) -> dict:
    asset = {"asset": r.asset} if r.asset is not None else {}
    return {**r.dados, **asset, "id": r.id, "criadoEm": r.criado_em}


def _motor(url: str):
    """Devolve (motor de escrita, motor de leitura)."""
    if not url.startswith("sqlite"):
        motor = create_engine(url, pool_pre_ping=True)
        # a leitura completa (/api/tudo) vê um retrato só, mesmo com gravações no meio
        return motor, motor.execution_options(isolation_level="REPEATABLE READ")

    motor = create_engine(url)

    # o driver sqlite3 do Python não abre transação antes de SELECT; sem isto, as várias
    # consultas de tudo_json() poderiam ver estados diferentes. Receita da doc do SQLAlchemy.
    @event.listens_for(motor, "connect")
    def _ao_conectar(con, _):
        con.isolation_level = None
        con.execute("PRAGMA journal_mode=WAL")  # leitura não espera gravação
        con.execute("PRAGMA busy_timeout=5000")

    @event.listens_for(motor, "begin")
    def _ao_iniciar(conexao):
        conexao.exec_driver_sql("BEGIN")

    return motor, motor


def migrar(motor) -> None:
    cfg = Config()
    cfg.set_main_option("script_location", str(MIGRACOES))
    with motor.begin() as con:
        cfg.attributes["connection"] = con
        command.upgrade(cfg, "head")


class Armazenamento:
    def __init__(self, pasta: Path, url: str | None = None):
        self.blobs = Path(pasta) / "arquivos"
        self.blobs.mkdir(parents=True, exist_ok=True)
        self.motor, leitor = _motor(url or url_do_banco(pasta))
        self.Sessao = sessionmaker(self.motor, expire_on_commit=False)
        self.Leitura = sessionmaker(leitor)
        migrar(self.motor)
        self._semear()

    def _semear(self) -> None:
        """Banco novo (sem a linha de versão) recebe as escolas fictícias do seed."""
        with self.Sessao.begin() as s:
            if s.get(VersaoDB, 1) is not None:
                return
            s.add(VersaoDB(id=1, n=1))
            for e in json.loads(SEED.read_text(encoding="utf-8")):
                s.add(EscolaDB(rev=0, **_escola_campos(e)))

    @contextmanager
    def _escrita(self):
        """Transação de gravação. O primeiro comando sobe a versão: isso trava a linha de
        versão até o commit, então duas gravações nunca se intercalam (SQLite e PostgreSQL)."""
        # ponytail: todas as escritas passam em fila por essa linha; ok para o volume do painel
        with self.Sessao.begin() as s:
            s.execute(update(VersaoDB).values(n=VersaoDB.n + 1))
            yield s

    # ---------- leitura ----------
    def versao(self) -> int:
        with self.Leitura() as s:
            return s.scalar(select(VersaoDB.n))

    def tudo_json(self) -> str:
        """Retrato completo lido numa transação só (nada muda no meio)."""
        with self.Leitura() as s:
            versao = s.scalar(select(VersaoDB.n))
            escolas = [_escola_dict(e) for e in s.scalars(select(EscolaDB).order_by(EscolaDB.id))]
            meta = {m.ek: {**m.dados, "atualizadoEm": m.atualizado_em} for m in s.scalars(select(MetaDB))}
            colecoes = {c: [] for c in COLECOES}
            for r in s.scalars(select(RegistroDB).order_by(RegistroDB.seq.desc())):
                colecoes[r.colecao].append(_registro_dict(r))
        return json.dumps({"versao": versao, "escolas": escolas, "meta": meta, **colecoes},
                          ensure_ascii=False, separators=(",", ":"))

    # ---------- escolas ----------
    def criar_escola(self, dados: dict) -> dict:
        with self._escrita() as s:
            e = EscolaDB(rev=0, **_escola_campos(dados))
            s.add(e)
            s.flush()
            return _escola_dict(e)

    def atualizar_escola(self, id_: int, dados: dict) -> dict | None:
        # trava otimista: o UPDATE só acontece se a revisão no banco ainda for a que o
        # cliente leu. Se outra pessoa gravou nesse meio tempo, 0 linhas mudam → Conflito.
        try:
            with self._escrita() as s:
                r = s.execute(
                    update(EscolaDB)
                    .where(EscolaDB.id == id_, EscolaDB.rev == dados.get("rev", 0))
                    .values(**_escola_campos(dados), rev=EscolaDB.rev + 1)
                    .execution_options(synchronize_session=False)
                )
                if r.rowcount == 0:
                    raise Conflito if s.get(EscolaDB, id_) else LookupError
                return _escola_dict(s.get(EscolaDB, id_))
        except LookupError:
            return None

    def remover_escolas(self, ids: list[int]) -> int:
        with self._escrita() as s:
            return s.execute(delete(EscolaDB).where(EscolaDB.id.in_(ids))).rowcount

    # ---------- coleções (links, arquivos, fotos, NTE, orçamentos, relatórios) ----------
    def adicionar(self, col: str, dados: dict) -> dict:
        resto = {k: v for k, v in dados.items() if k not in ("id", "criadoEm")}
        asset = resto.pop("asset") if isinstance(resto.get("asset"), str) else None
        with self._escrita() as s:
            r = RegistroDB(id=secrets.token_hex(8), colecao=col, criado_em=_agora(), asset=asset, dados=resto)
            s.add(r)
            s.flush()
            return _registro_dict(r)

    def _registro(self, s, col: str, id_: str) -> RegistroDB | None:
        return s.scalar(select(RegistroDB).where(RegistroDB.colecao == col, RegistroDB.id == id_))

    def atualizar(self, col: str, id_: str, patch: dict) -> dict | None:
        try:
            with self._escrita() as s:
                r = self._registro(s, col, id_)
                if r is None:
                    raise LookupError
                r.dados = {**r.dados, **{k: v for k, v in patch.items() if k not in ("id", "criadoEm", "asset")}}
                return _registro_dict(r)
        except LookupError:
            return None

    def remover(self, col: str, id_: str) -> bool:
        apagar = None
        try:
            with self._escrita() as s:
                r = self._registro(s, col, id_)
                if r is None:
                    raise LookupError
                s.delete(r)
                s.flush()
                # o arquivo só sai quando nenhuma outra linha aponta para ele
                if r.asset and not s.scalar(select(func.count()).where(RegistroDB.asset == r.asset)):
                    s.execute(delete(BlobDB).where(BlobDB.id == r.asset))
                    apagar = r.asset
        except LookupError:
            return False
        if apagar:  # depois do commit: se a transação falhasse, o arquivo continuaria lá
            (self.blobs / apagar).unlink(missing_ok=True)
        return True

    def definir_meta(self, ek: str, dados: dict) -> None:
        with self._escrita() as s:
            m = s.get(MetaDB, ek) or MetaDB(ek=ek)
            m.dados, m.atualizado_em = dados, _agora()
            s.add(m)

    # ---------- arquivos enviados ----------
    def salvar_blob(self, conteudo: bytes, tipo: str, limite: int) -> str:
        id_ = secrets.token_hex(16)
        caminho = self.blobs / id_
        try:
            with self._escrita() as s:
                usado = s.scalar(select(func.coalesce(func.sum(BlobDB.tam), 0)))
                if usado + len(conteudo) > limite:
                    raise CotaEsgotada
                caminho.write_bytes(conteudo)
                s.add(BlobDB(id=id_, tipo=tipo, tam=len(conteudo)))
        except BaseException:
            caminho.unlink(missing_ok=True)
            raise
        return id_

    def blob(self, id_: str):
        with self.Leitura() as s:
            info = s.get(BlobDB, id_)
        return (self.blobs / id_, info.tipo) if info else (None, None)

    def uso(self) -> dict:
        with self.Leitura() as s:
            n, total = s.execute(select(func.count(), func.coalesce(func.sum(BlobDB.tam), 0))).one()
        return {"files": n, "bytes": int(total)}  # PostgreSQL devolve SUM como Decimal
