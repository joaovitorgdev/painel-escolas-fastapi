"""Caminho completo da API (HTTP), num banco temporário.

uv run python -m pytest
"""
import pytest

from testes.corpos import COLECOES, ESCOLA_NOVA


def test_leitura_inicial(cliente):
    boot = cliente.get("/api/boot.js")
    assert boot.status_code == 200 and boot.text.startswith("Object.assign(window.PAINEL,")
    tudo = cliente.get("/api/tudo").json()
    assert len(tudo["escolas"]) == 94
    assert set(tudo) == {"versao", "escolas", "meta", *COLECOES}
    assert cliente.get("/api/versao").json() == {"versao": tudo["versao"]}
    assert cliente.get("/api/uso").json()["files"] == 0


@pytest.mark.parametrize("col", COLECOES)
def test_crud_de_cada_colecao(cliente, col):
    v0 = cliente.get("/api/versao").json()["versao"]

    r = cliente.post(f"/api/c/{col}", json=COLECOES[col])
    assert r.status_code == 201
    linha = r.json()
    assert len(linha["id"]) == 16 and linha["criadoEm"] > 0
    assert cliente.get("/api/tudo").json()[col][0] == linha
    assert cliente.get("/api/versao").json()["versao"] == v0 + 1

    assert cliente.delete(f"/api/c/{col}/{linha['id']}").status_code == 204
    assert cliente.delete(f"/api/c/{col}/{linha['id']}").status_code == 404
    assert cliente.get("/api/tudo").json()[col] == []


def test_patch_mescla_e_ignora_campos_do_servidor(cliente):
    orc = cliente.post("/api/c/orcamentos", json=COLECOES["orcamentos"]).json()
    r = cliente.patch(f"/api/c/orcamentos/{orc['id']}", json={"status": "apr"})
    assert r.status_code == 200
    assert r.json() == {**orc, "status": "apr"}  # o resto ficou como estava

    rel = cliente.post("/api/c/relatorios_salvos", json=COLECOES["relatorios_salvos"]).json()
    editado = cliente.patch(f"/api/c/relatorios_salvos/{rel['id']}", json={"nome": "Outro"}).json()
    assert editado["id"] == rel["id"] and editado["criadoEm"] == rel["criadoEm"]
    assert cliente.patch("/api/c/relatorios_salvos/naoexiste", json={"nome": "X"}).status_code == 404


def test_linhas_mais_novas_primeiro(cliente):
    for t in ("A", "B", "C"):
        cliente.post("/api/c/links", json={**COLECOES["links"], "titulo": t})
    assert [x["titulo"] for x in cliente.get("/api/tudo").json()["links"]] == ["C", "B", "A"]


def test_colecao_inexistente(cliente):
    assert cliente.post("/api/c/nada", json={}).json() == {"code": "colecao_inexistente"}
    assert cliente.patch("/api/c/nada/1", json={}).status_code == 404
    assert cliente.delete("/api/c/nada/1").status_code == 404


def test_meta_grava_e_substitui(cliente):
    assert cliente.put("/api/meta/90000001", json={"capa": "a" * 16}).status_code == 204
    assert cliente.put("/api/meta/90000001", json={"capa": "b" * 16}).status_code == 204
    meta = cliente.get("/api/tudo").json()["meta"]
    assert meta["90000001"]["capa"] == "b" * 16 and meta["90000001"]["atualizadoEm"] > 0


def test_escola_cria_edita_remove(cliente):
    escolas = cliente.get("/api/tudo").json()["escolas"]

    e = cliente.post("/api/escolas", json=ESCOLA_NOVA)
    assert e.status_code == 201
    e = e.json()
    assert e["id"] == max(x["id"] for x in escolas) + 1 and e["rev"] == 0
    assert e["mun"] == "3156601" and e["wifi"]["cob"] == 75

    editada = cliente.put(f"/api/escolas/{e['id']}", json={**e, "nome": "E.E. Nova 2"}).json()
    assert editada["nome"] == "E.E. Nova 2" and editada["rev"] == 1

    assert cliente.post("/api/escolas/remover", json={"ids": [e["id"], 99999]}).json() == {"removidas": 1}
    assert len(cliente.get("/api/tudo").json()["escolas"]) == len(escolas)
    assert cliente.put(f"/api/escolas/{e['id']}", json=editada).json() == {"code": "nao_encontrada"}


def test_edicao_concorrente_nao_sobrescreve(cliente):
    original = cliente.get("/api/tudo").json()["escolas"][0]

    # duas pessoas abrem a mesma escola; a primeira grava, a segunda chega atrasada
    primeira = cliente.put(f"/api/escolas/{original['id']}", json={**original, "nome": "E.E. Ana"})
    assert primeira.status_code == 200 and primeira.json()["rev"] == 1
    atrasada = cliente.put(f"/api/escolas/{original['id']}", json={**original, "nome": "E.E. Bia"})
    assert atrasada.status_code == 409 and atrasada.json() == {"code": "conflito"}
    assert cliente.get("/api/tudo").json()["escolas"][0]["nome"] == "E.E. Ana"  # nada foi perdido

    # quem recarrega (rev atual) grava normalmente
    nova = cliente.put(f"/api/escolas/{original['id']}", json={**primeira.json(), "nome": "E.E. Bia"})
    assert nova.json()["rev"] == 2


def test_arquivos(cliente):
    up = cliente.post("/api/arquivos?nome=foto.png", content=b"\x89PNG teste").json()
    assert up["sizeBytes"] == 10
    baixado = cliente.get(f"/_blob/{up['id']}")
    assert baixado.content == b"\x89PNG teste" and baixado.headers["content-type"] == "image/png"
    assert cliente.get("/api/uso").json() == {"files": 1, "bytes": 10, "maxBytes": 5 * 1024**3}
    assert cliente.post("/api/arquivos?nome=x.html", content=b"<script>").json()["code"] == "unsupported_type"
    assert cliente.post("/api/arquivos?nome=x.svg", content=b"<svg/>").status_code == 415
    assert cliente.get("/_blob/" + "0" * 32).status_code == 404

    # arquivo compartilhado por duas linhas só sai quando a última some
    corpo = {"cat": "manual", "titulo": "Manual", "asset": up["id"]}
    a = cliente.post("/api/c/arquivos", json=corpo).json()
    b = cliente.post("/api/c/arquivos", json=corpo).json()
    cliente.delete(f"/api/c/arquivos/{a['id']}")
    assert cliente.get(f"/_blob/{up['id']}").status_code == 200
    cliente.delete(f"/api/c/arquivos/{b['id']}")
    assert cliente.get(f"/_blob/{up['id']}").status_code == 404
    assert cliente.get("/api/uso").json()["files"] == 0


def test_guarda_de_origem_e_tamanho(cliente):
    assert cliente.get("/api/boot.js", headers={"Sec-Fetch-Site": "cross-site"}).status_code == 403
    assert cliente.post("/api/c/links", json={"titulo": "a" * (1024 * 1024)}).status_code == 413

    def pedacos():
        yield b'{"nome": "E.E. Chunk"}'

    r = cliente.post("/api/escolas", content=pedacos(), headers={"content-type": "application/json"})
    assert r.status_code == 411


def test_dados_sobrevivem_a_reinicio(abrir):
    abrir().post("/api/c/orcamentos", json=COLECOES["orcamentos"])
    assert abrir().get("/api/tudo").json()["orcamentos"][0]["valor"] == 1234.5
