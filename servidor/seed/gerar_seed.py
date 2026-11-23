"""Gera escolas.json com escolas FICTÍCIAS (nomes, INEP, endereço, telefone e indicadores
inventados). Só a malha de municípios e regionais (pública, IBGE) vem de web/js/geo.js,
para que cada escola caia dentro do seu município no mapa.

    python -m servidor.seed.gerar_seed      (mesma semente = mesmo arquivo)
"""
import json
import random
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
GEO = RAIZ / "web" / "js" / "geo.js"
SAIDA = Path(__file__).with_name("escolas.json")
POR_REGIONAL = 2

PREFIXOS = ["", "", "Professor ", "Professora ", "Dona ", "Doutor "]
NOMES = ["Helena", "Otávio", "Lúcia", "Raimundo", "Cecília", "Joaquim", "Marta", "Aurélio", "Iracema",
         "Benedito", "Clarice", "Geraldo", "Rosana", "Severino", "Lívia", "Teodoro", "Augusta", "Valdir"]
SOBRENOMES = ["Duarte", "Rezende", "Moura", "Paixão", "Valadão", "Bittencourt", "Siqueira", "Lacerda",
              "Fontoura", "Quintela", "Arantes", "Brandão", "Coimbra", "Nogueira", "Prates", "Viana"]
TEMAS = ["Vale Verde", "Serra Azul", "Ipê Amarelo", "Sol Nascente", "Bela Vista", "Três Rios", "Boa Esperança"]
RUAS = ["Rua das Flores", "Avenida Central", "Rua do Comércio", "Praça da Matriz", "Rua São José",
        "Travessa Primavera", "Avenida dos Ipês", "Rua Sete de Setembro"]
BAIRROS = ["Centro", "Jardim América", "Vila Nova", "São Cristóvão", "Bom Jesus", "Santa Rita"]
MODS = ["Ensino Fundamental – Anos Iniciais", "Ensino Fundamental – Anos Finais", "Ensino Médio",
        "Ensino Médio em Tempo Integral", "EJA"]
TURNOS = ["Manhã e noite", "Manhã e tarde", "Integral", "Manhã, tarde e noite"]
OPERADORAS = ["TIM", "Claro", "Ligga", "Oi", "Algar Telecom", "Vivo", "Starlink"]
TIPOS = ["Fibra óptica"] * 7 + ["Rádio"] * 2 + ["Satélite"]
PROGRAMAS = ["Contrato estadual", "PIEC – Educação Conectada", "Wi-Fi Brasil (GESAC)"]
RACKS = ["Rack 24U", "Sem rack", "Rack 12U", "Rack 44U"]
OBRAS = ["Em execução", "Concluída 2024", "Não prevista", "Concluída 2025", "Prevista 2026"]
CONTROLADORAS = ["Sem controladora", "Controladora local", "Controladora em nuvem"]


def carregar_geo() -> dict:
    texto = GEO.read_text(encoding="utf-8")
    return json.loads(texto[texto.index("{"):texto.rindex("}") + 1])


def aneis(d: str) -> list[list[tuple[float, float]]]:
    """Caminho SVG só com M/L/Z -> lista de polígonos."""
    out = []
    for cmd, x, y in re.findall(r"([ML])(-?[\d.]+),(-?[\d.]+)", d):
        if cmd == "M":
            out.append([])
        out[-1].append((float(x), float(y)))
    return out


def dentro(px: float, py: float, polis: list) -> bool:
    """Par-ímpar (ray casting) somando todos os anéis."""
    ok = False
    for p in polis:
        for (x1, y1), (x2, y2) in zip(p, p[1:] + p[:1]):
            if (y1 > py) != (y2 > py) and px < x1 + (py - y1) * (x2 - x1) / (y2 - y1):
                ok = not ok
    return ok


def ponto_no_municipio(rnd: random.Random, mun: dict) -> tuple[float, float]:
    x, y, w, h = mun["bb"]
    polis = aneis(mun["d"])
    for _ in range(200):
        px, py = x + rnd.random() * w, y + rnd.random() * h
        if dentro(px, py, polis):
            return round(px, 2), round(py, 2)
    return round(x + w / 2, 2), round(y + h / 2, 2)


def nome_escola(rnd: random.Random, usados: set) -> str:
    while True:
        if rnd.random() < 0.2:
            n = f"E.E. {rnd.choice(TEMAS)}"
        else:
            n = f"E.E. {rnd.choice(PREFIXOS)}{rnd.choice(NOMES)} {rnd.choice(SOBRENOMES)}"
        if n not in usados:
            usados.add(n)
            return n


def escola(rnd: random.Random, id_: int, sre: int, mun: dict, nome: str) -> dict:
    x, y = ponto_no_municipio(rnd, mun)
    alunos = rnd.randint(100, 1350)
    tem_sala, tem_wifi = rnd.random() < 0.8, rnd.random() < 0.9
    pcs = rnd.randint(10, 30) if tem_sala else 0
    aps = rnd.randint(4, 22) if tem_wifi else 0
    inep = f"9{rnd.randint(0, 9_999_999):07d}"  # começa com 9: não colide com INEP real de MG (31...)
    return {
        "id": id_, "inep": inep, "nome": nome, "sre": sre, "mun": mun["id"], "x": x, "y": y,
        "end": f"{rnd.choice(RUAS)}, {rnd.randint(10, 2000)}", "bairro": rnd.choice(BAIRROS),
        "cep": f"3{rnd.randint(0, 9999):04d}-{rnd.randint(0, 999):03d}",
        "tel": f"(00) 3{rnd.randint(0, 999):03d}-{rnd.randint(0, 9999):04d}",  # DDD 00 não existe
        "email": f"escola.{inep}@example.org",
        "alunos": alunos, "turmas": max(4, round(alunos / 30)),
        "mods": sorted(rnd.sample(MODS, rnd.randint(1, 3)), key=MODS.index),
        "turnos": rnd.choice(TURNOS),
        "con": {"oper": rnd.choice(OPERADORAS), "tipo": rnd.choice(TIPOS), "links": rnd.randint(1, 3),
                "vel": rnd.choice([50, 100, 200, 300, 400, 600, 800, 1000, 1500]),
                "prog": rnd.choice(PROGRAMAS), "pontos": rnd.randint(25, 120),
                "rack": rnd.choice(RACKS), "obra": rnd.choice(OBRAS)},
        "sala": {"possui": tem_sala, "pcs": pcs, "estado": rnd.choice(["Em uso", "Parcialmente em uso", "Desativada"]) if tem_sala else "—",
                 "area": rnd.randint(35, 75) if tem_sala else 0},
        "wifi": {"possui": tem_wifi, "aps": aps, "cob": rnd.choice([60, 75, 85, 100]) if tem_wifi else 0,
                 "ctrl": rnd.choice(CONTROLADORAS) if tem_wifi else "—",
                 "ssid": "Escola-Estudante / Escola-Admin" if tem_wifi else "—"},
        "parque": {"chromebooks": rnd.randint(0, 80), "pos81": rnd.randint(0, 25), "pos230": rnd.randint(0, 20),
                   "daten": rnd.randint(0, 15), "pos06": rnd.randint(0, 12), "outros": rnd.randint(0, 10)},
        "proj": rnd.randint(1, 12), "lousas": rnd.randint(0, 6), "impr": rnd.randint(1, 5),
    }


def gerar(semente: int = 42) -> list[dict]:
    rnd, geo, usados = random.Random(semente), carregar_geo(), set()
    escolas = []
    for reg in geo["regionais"]:
        muns = [m for m in geo["municipios"] if m["sre"] == reg["id"]]
        for mun in rnd.sample(muns, min(POR_REGIONAL, len(muns))):
            escolas.append(escola(rnd, len(escolas) + 1, reg["id"], mun, nome_escola(rnd, usados)))
    return escolas


if __name__ == "__main__":
    dados = gerar()
    assert len({e["inep"] for e in dados}) == len(dados), "INEP repetido"
    SAIDA.write_text(json.dumps(dados, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(dados)} escolas fictícias -> {SAIDA}")
