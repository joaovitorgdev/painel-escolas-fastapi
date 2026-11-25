"""Camada SQL (servidor/armazenamento.py) testada direto, sem HTTP."""
import json
import threading

import pytest
from alembic import command
from alembic.config import Config

from servidor.armazenamento import MIGRACOES, SEED, Armazenamento, Conflito, CotaEsgotada

ESCOLAS_SEED = json.loads(SEED.read_text(encoding="utf-8"))


def tudo(db) -> dict:
    return json.loads(db.tudo_json())


def test_banco_novo_recebe_o_seed_com_os_mesmos_ids(banco):
    escolas = tudo(banco)["escolas"]
    assert [e["id"] for e in escolas] == [e["id"] for e in ESCOLAS_SEED]
    assert escolas[0] == {**ESCOLAS_SEED[0], "rev": 0}  # colunas + JSON voltam no mesmo formato


def test_migracoes_batem_com_os_modelos(banco):
    """Se alguém mudar uma tabela em armazenamento.py sem criar migração, isto falha."""
    cfg = Config()
    cfg.set_main_option("script_location", str(MIGRACOES))
    with banco.motor.connect() as con:
        cfg.attributes["connection"] = con
        command.check(cfg)


def test_versao_sobe_a_cada_gravacao_e_nao_sobe_em_conflito(banco):
    v = banco.versao()
    banco.adicionar("links", {"titulo": "a"})
    assert banco.versao() == v + 1
    with pytest.raises(Conflito):
        banco.atualizar_escola(1, {**ESCOLAS_SEED[0], "rev": 7})
    assert banco.versao() == v + 1  # a transação do conflito foi desfeita


def test_conflito_nao_altera_a_escola(banco):
    banco.atualizar_escola(1, {**ESCOLAS_SEED[0], "nome": "Primeira", "rev": 0})
    with pytest.raises(Conflito):
        banco.atualizar_escola(1, {**ESCOLAS_SEED[0], "nome": "Atrasada", "rev": 0})
    e = tudo(banco)["escolas"][0]
    assert e["nome"] == "Primeira" and e["rev"] == 1


def test_escola_inexistente(banco):
    assert banco.atualizar_escola(999, {"nome": "X", "rev": 0}) is None
    assert banco.remover_escolas([999]) == 0


def test_gravacoes_simultaneas_na_mesma_revisao_so_uma_vence(banco):
    """Oito threads tentam salvar a mesma escola lida na rev 0: exatamente uma consegue."""
    resultados = []
    largada = threading.Barrier(8)

    def salvar(i: int) -> None:
        largada.wait()
        try:
            banco.atualizar_escola(1, {**ESCOLAS_SEED[0], "nome": f"Pessoa {i}", "rev": 0})
            resultados.append("ok")
        except Conflito:
            resultados.append("409")

    threads = [threading.Thread(target=salvar, args=(i,)) for i in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert sorted(resultados) == ["409"] * 7 + ["ok"]
    assert tudo(banco)["escolas"][0]["rev"] == 1


def test_criacoes_simultaneas_nao_perdem_linhas(banco):
    v = banco.versao()
    threads = [threading.Thread(target=banco.adicionar, args=("links", {"titulo": str(i)})) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert len(tudo(banco)["links"]) == 10 and banco.versao() == v + 10


def test_patch_nao_troca_campos_do_servidor(banco):
    r = banco.adicionar("links", {"titulo": "a", "asset": "x" * 32})
    novo = banco.atualizar("links", r["id"], {"titulo": "b", "id": "outro", "criadoEm": 1, "asset": "y"})
    assert novo == {**r, "titulo": "b"}
    assert banco.atualizar("arquivos", r["id"], {"titulo": "c"}) is None  # id de outra coleção


def test_cota_de_arquivos(banco):
    banco.salvar_blob(b"12345", "text/plain", limite=8)
    with pytest.raises(CotaEsgotada):
        banco.salvar_blob(b"6789", "text/plain", limite=8)
    assert banco.uso() == {"files": 1, "bytes": 5}
    assert len(list(banco.blobs.iterdir())) == 1  # o arquivo recusado não ficou no disco


def test_arquivo_sai_do_disco_com_a_ultima_linha(banco):
    id_ = banco.salvar_blob(b"%PDF", "application/pdf", limite=100)
    a = banco.adicionar("arquivos", {"asset": id_})
    b = banco.adicionar("escola_fotos", {"asset": id_})
    banco.remover("arquivos", a["id"])
    assert banco.blob(id_)[0].exists()
    banco.remover("escola_fotos", b["id"])
    assert banco.blob(id_) == (None, None) and not (banco.blobs / id_).exists()
    assert banco.remover("escola_fotos", b["id"]) is False


def test_meta_substitui(banco):
    banco.definir_meta("id95", {"capa": "a"})
    banco.definir_meta("id95", {"capa": "b"})
    assert tudo(banco)["meta"]["id95"]["capa"] == "b"


def test_reabrir_mantem_os_dados_e_nao_semeia_de_novo(banco, tmp_path):
    banco.remover_escolas([1, 2])
    banco.adicionar("orcamentos", {"valor": 10})
    banco.motor.dispose()
    de_novo = Armazenamento(tmp_path)
    try:
        t = tudo(de_novo)
        assert len(t["escolas"]) == len(ESCOLAS_SEED) - 2 and t["orcamentos"][0]["valor"] == 10
    finally:
        de_novo.motor.dispose()
