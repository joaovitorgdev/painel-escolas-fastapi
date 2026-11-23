"""Confere o caminho completo da API num diretório de dados temporário.

uv run python -m pytest
"""
import importlib
import os

from fastapi.testclient import TestClient


def cliente(tmp_path) -> TestClient:
    os.environ["PAINEL_DADOS"] = str(tmp_path)
    import servidor.app as m

    return TestClient(importlib.reload(m).app)


def test_fluxo_completo(tmp_path):
    c = cliente(tmp_path)

    boot = c.get("/api/boot.js")
    assert boot.status_code == 200 and "escolas" in boot.text
    tudo = c.get("/api/tudo").json()
    n, v0 = len(tudo["escolas"]), tudo["versao"]
    assert n == 94

    # coleção: cria, edita, remove; a versão sobe a cada gravação
    r = c.post("/api/c/links", json={"titulo": "Drive da equipe", "url": "https://example.org"}).json()
    assert r["id"] and r["criadoEm"]
    assert c.patch(f"/api/c/links/{r['id']}", json={"titulo": "Novo"}).json()["titulo"] == "Novo"
    assert c.get("/api/versao").json()["versao"] > v0
    assert c.delete(f"/api/c/links/{r['id']}").status_code == 204
    assert c.delete(f"/api/c/links/{r['id']}").status_code == 404
    assert c.post("/api/c/nada", json={}).json()["code"] == "colecao_inexistente"
    assert c.post("/api/c/links", content=b"[1]", headers={"Content-Type": "application/json"}).status_code == 422

    # arquivo: envia, baixa, apaga junto com a linha que o referencia
    up = c.post("/api/arquivos?nome=foto.png", content=b"\x89PNG teste").json()
    assert c.get(f"/_blob/{up['id']}").content == b"\x89PNG teste"
    assert c.get("/api/uso").json()["files"] == 1
    foto = c.post("/api/c/escola_fotos", json={"asset": up["id"], "ek": "90000001"}).json()
    c.delete(f"/api/c/escola_fotos/{foto['id']}")
    assert c.get(f"/_blob/{up['id']}").status_code == 404
    assert c.post("/api/arquivos?nome=x.html", content=b"<script>").json()["code"] == "unsupported_type"
    assert c.post("/api/arquivos?nome=x.svg", content=b"<svg/>").status_code == 415

    # escolas: cadastra, edita, remove
    e = c.post("/api/escolas", json={"nome": "E.E. Teste", "sre": 0}).json()
    assert e["id"] == max(x["id"] for x in tudo["escolas"]) + 1
    assert c.put(f"/api/escolas/{e['id']}", json={"nome": "E.E. Teste 2", "sre": 0}).json()["nome"] == "E.E. Teste 2"
    assert c.post("/api/escolas/remover", json={"ids": [e["id"]]}).json() == {"removidas": 1}
    assert len(c.get("/api/tudo").json()["escolas"]) == n

    # outro site não lê nem grava; corpo JSON grande é recusado
    assert c.get("/api/boot.js", headers={"Sec-Fetch-Site": "cross-site"}).status_code == 403
    assert c.post("/api/c/links", json={"x": "a" * (1024 * 1024)}).status_code == 413

    # arquivo compartilhado por duas linhas só sai quando a última some
    up = c.post("/api/arquivos?nome=doc.pdf", content=b"%PDF").json()
    a = c.post("/api/c/arquivos", json={"asset": up["id"]}).json()
    b = c.post("/api/c/arquivos", json={"asset": up["id"]}).json()
    c.delete(f"/api/c/arquivos/{a['id']}")
    assert c.get(f"/_blob/{up['id']}").status_code == 200
    c.delete(f"/api/c/arquivos/{b['id']}")
    assert c.get(f"/_blob/{up['id']}").status_code == 404

    # os dados sobrevivem a um reinício do servidor
    c.post("/api/c/orcamentos", json={"valor": 1500})
    assert cliente(tmp_path).get("/api/tudo").json()["orcamentos"][0]["valor"] == 1500


def test_edicao_concorrente_nao_sobrescreve(tmp_path):
    c = cliente(tmp_path)
    original = c.get("/api/tudo").json()["escolas"][0]

    # duas pessoas abrem a mesma escola; a primeira grava, a segunda chega atrasada
    primeira = c.put(f"/api/escolas/{original['id']}", json={**original, "nome": "E.E. Ana"})
    assert primeira.status_code == 200 and primeira.json()["rev"] == 1
    atrasada = c.put(f"/api/escolas/{original['id']}", json={**original, "nome": "E.E. Bia"})
    assert atrasada.status_code == 409 and atrasada.json()["code"] == "conflito"

    # quem recarrega (rev atual) grava normalmente
    assert c.put(f"/api/escolas/{original['id']}", json={**primeira.json(), "nome": "E.E. Bia"}).json()["rev"] == 2


def test_escola_invalida_e_corpo_sem_tamanho_sao_recusados(tmp_path):
    c = cliente(tmp_path)

    assert c.post("/api/escolas", json={"nome": "X"}).status_code == 422
    assert c.post("/api/escolas", json={"nome": "E.E. Teste", "inep": "123"}).status_code == 422
    nova = c.post("/api/escolas", json={"nome": "E.E. Teste", "inep": "90000002", "wifi": {"ok": 1}})
    assert nova.status_code == 201 and nova.json()["wifi"] == {"ok": 1}  # campo extra preservado

    def pedacos():
        yield b'{"nome": "E.E. Chunk"}'

    r = c.post("/api/escolas", content=pedacos(), headers={"content-type": "application/json"})
    assert r.status_code == 411
