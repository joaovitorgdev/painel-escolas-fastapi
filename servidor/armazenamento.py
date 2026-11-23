"""Camada de dados do Painel de Escolas.

Tudo o que a API lê ou grava passa por aqui. Hoje é um arquivo JSON; o banco de
dados entra trocando só este módulo (mesmos métodos, mesmos formatos).
"""
import json
import os
import secrets
import threading
import time
from pathlib import Path

class CotaEsgotada(Exception):
    pass


class Conflito(Exception):
    pass


COLECOES = ("links", "arquivos", "nte_registros", "escola_fotos", "orcamentos", "relatorios_salvos")
SEED = Path(__file__).parent / "seed" / "escolas.json"


def _agora():
    return int(time.time() * 1000)


class Armazenamento:
    # ponytail: arquivo JSON único com trava global; trocar pelo banco quando ele existir
    def __init__(self, pasta: Path):
        self.pasta = Path(pasta)
        self.blobs = self.pasta / "arquivos"
        self.blobs.mkdir(parents=True, exist_ok=True)
        self.caminho = self.pasta / "banco.json"
        self.trava = threading.Lock()
        if self.caminho.exists():
            self.d = json.loads(self.caminho.read_text(encoding="utf-8"))
        else:
            escolas = json.loads(SEED.read_text(encoding="utf-8"))
            self.d = {"versao": 1, "escolas": escolas, "meta": {}, "blobs": {}, **{c: [] for c in COLECOES}}
            self._gravar()

    def _gravar(self):
        self.d["versao"] += 1
        tmp = self.caminho.with_suffix(".tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.d, f, ensure_ascii=False)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, self.caminho)

    # ---------- leitura ----------
    def versao(self) -> int:
        return self.d["versao"]

    def tudo_json(self) -> str:
        """Retrato completo já serializado dentro da trava (nada muda no meio)."""
        with self.trava:
            return json.dumps({k: self.d[k] for k in ("versao", "escolas", "meta", *COLECOES)},
                              ensure_ascii=False, separators=(",", ":"))

    # ---------- escolas ----------
    def criar_escola(self, dados: dict):
        with self.trava:
            dados = {**dados, "id": max((e["id"] for e in self.d["escolas"]), default=0) + 1, "rev": 0}
            self.d["escolas"].append(dados)
            self._gravar()
            return dados

    def atualizar_escola(self, id_: int, dados: dict):
        with self.trava:
            for i, e in enumerate(self.d["escolas"]):
                if e["id"] == id_:
                    # trava otimista: quem editou uma cópia antiga (rev menor) não apaga
                    # a edição que outra pessoa gravou nesse meio tempo
                    rev = e.get("rev", 0)
                    if dados.get("rev", 0) != rev:
                        raise Conflito
                    self.d["escolas"][i] = {**dados, "id": id_, "rev": rev + 1}
                    self._gravar()
                    return self.d["escolas"][i]
        return None

    def remover_escolas(self, ids: list[int]):
        with self.trava:
            antes = len(self.d["escolas"])
            fora = set(ids)
            self.d["escolas"] = [e for e in self.d["escolas"] if e["id"] not in fora]
            self._gravar()
            return antes - len(self.d["escolas"])

    # ---------- coleções (links, arquivos, fotos, NTE, orçamentos, relatórios) ----------
    def adicionar(self, col: str, dados: dict):
        with self.trava:
            dados = {**dados, "id": secrets.token_hex(8), "criadoEm": _agora()}
            self.d[col].insert(0, dados)
            self._gravar()
            return dados

    def atualizar(self, col: str, id_: str, patch: dict):
        with self.trava:
            for r in self.d[col]:
                if r["id"] == id_:
                    r.update({k: v for k, v in patch.items() if k not in ("id", "criadoEm", "asset")})
                    self._gravar()
                    return r
        return None

    def remover(self, col: str, id_: str):
        with self.trava:
            r = next((x for x in self.d[col] if x["id"] == id_), None)
            if r is None:
                return False
            self.d[col].remove(r)
            # o arquivo só sai quando nenhuma outra linha aponta para ele
            a = r.get("asset")
            if isinstance(a, str) and not any(x.get("asset") == a for c in COLECOES for x in self.d[c]):
                self._apagar_blob(a)
            self._gravar()
            return True

    def definir_meta(self, ek: str, dados: dict):
        with self.trava:
            self.d["meta"][ek] = {**dados, "atualizadoEm": _agora()}
            self._gravar()

    # ---------- arquivos enviados ----------
    def salvar_blob(self, conteudo: bytes, tipo: str, limite: int) -> str:
        id_ = secrets.token_hex(16)
        with self.trava:
            if sum(x["tam"] for x in self.d["blobs"].values()) + len(conteudo) > limite:
                raise CotaEsgotada
            caminho = self.blobs / id_
            caminho.write_bytes(conteudo)
            try:
                self.d["blobs"][id_] = {"tipo": tipo, "tam": len(conteudo)}
                self._gravar()
            except Exception:
                self.d["blobs"].pop(id_, None)
                caminho.unlink(missing_ok=True)
                raise
        return id_

    def blob(self, id_: str):
        with self.trava:
            info = self.d["blobs"].get(id_)
        return (self.blobs / id_, info["tipo"]) if info else (None, None)

    def _apagar_blob(self, id_: str):
        if self.d["blobs"].pop(id_, None):
            (self.blobs / id_).unlink(missing_ok=True)

    def uso(self) -> dict:
        with self.trava:
            b = list(self.d["blobs"].values())
        return {"files": len(b), "bytes": sum(x["tam"] for x in b)}
