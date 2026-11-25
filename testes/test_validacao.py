"""Os modelos Pydantic recusam o que a página nunca envia e aceitam o que ela envia."""
import pytest

from testes.corpos import ASSET, COLECOES, ESCOLA_NOVA


def test_aceita_cadastro_igual_ao_da_pagina(cliente):
    assert cliente.post("/api/escolas", json=ESCOLA_NOVA).status_code == 201


def test_aceita_edicao_igual_a_da_pagina(cliente):
    # a página devolve a escola inteira (com id e rev), mun como número e '—' no INEP vazio
    e = cliente.get("/api/tudo").json()["escolas"][0]
    r = cliente.put(f"/api/escolas/{e['id']}", json={**e, "inep": "—", "mun": int(e["mun"]), "mods": []})
    assert r.status_code == 200
    assert r.json()["inep"] == "—" and r.json()["mun"] == e["mun"]


@pytest.mark.parametrize("campos", [
    {"nome": "X"},                          # nome curto demais
    {"inep": "123"},                        # INEP sem 8 dígitos
    {"alunos": -1},
    {"wifi": {"cob": 150}},                 # cobertura é porcentagem
    {"wifi": {"ok": 1}},                    # chave desconhecida dentro do objeto
    {"campo_inventado": 1},                 # chave desconhecida na escola
    {"mods": "Ensino Médio"},               # lista, não texto
    {"rev": -1},
])
def test_recusa_escola_invalida(cliente, campos):
    assert cliente.post("/api/escolas", json={**ESCOLA_NOVA, **campos}).status_code == 422


@pytest.mark.parametrize("col,campos", [
    ("links", {"url": "javascript:alert(1)"}),
    ("links", {"cat": "Categoria nova"}),
    ("links", {"titulo": ""}),
    ("links", {"extra": True}),
    ("arquivos", {"cat": "planilha"}),
    ("arquivos", {"arp": {"vig": "31/12/2026"}}),
    ("nte_registros", {"ek": "abc"}),
    ("nte_registros", {"pcOk": -2}),
    ("nte_registros", {"rede": "caiu"}),
    ("escola_fotos", {"asset": "../../etc/passwd"}),
    ("orcamentos", {"valor": 0}),
    ("orcamentos", {"status": "pago"}),
    ("relatorios_salvos", {"filters": [{"k": "sre", "op": "like", "v": "x"}]}),
])
def test_recusa_colecao_invalida(cliente, col, campos):
    assert cliente.post(f"/api/c/{col}", json={**COLECOES[col], **campos}).status_code == 422


@pytest.mark.parametrize("col,falta", [("links", "url"), ("escola_fotos", "asset"), ("orcamentos", "valor")])
def test_criacao_exige_obrigatorios(cliente, col, falta):
    corpo = {k: v for k, v in COLECOES[col].items() if k != falta}
    assert cliente.post(f"/api/c/{col}", json=corpo).status_code == 422


def test_patch_aceita_parcial_mas_valida_o_que_vem(cliente):
    orc = cliente.post("/api/c/orcamentos", json=COLECOES["orcamentos"]).json()
    url = f"/api/c/orcamentos/{orc['id']}"
    assert cliente.patch(url, json={"status": "ana"}).status_code == 200
    assert cliente.patch(url, json={"status": "pago"}).status_code == 422
    assert cliente.patch(url, json={"valor": -5}).status_code == 422  # limite do Field vale no PATCH
    assert cliente.patch(url, json={"novo": 1}).status_code == 422


def test_corpo_que_nao_e_objeto(cliente):
    r = cliente.post("/api/c/links", content=b"[1]", headers={"Content-Type": "application/json"})
    assert r.status_code == 422


@pytest.mark.parametrize("ek,corpo", [
    ("90000001", {"capa": "curta"}),
    ("90000001", {"capa": "a" * 16, "outra": 1}),
    ("escola-x", {"capa": "a" * 16}),
])
def test_recusa_meta_invalida(cliente, ek, corpo):
    assert cliente.put(f"/api/meta/{ek}", json=corpo).status_code == 422


def test_meta_aceita_ek_por_id(cliente):
    assert cliente.put("/api/meta/id95", json={"capa": ASSET[:16]}).status_code == 204
