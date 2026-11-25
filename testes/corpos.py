"""Corpos válidos no formato que a página (web/js) envia para cada coleção."""
ESCOLA_NOVA = {  # igual ao objeto montado em web/js/escolas.js ao cadastrar
    "sre": 3, "bairro": "Centro", "cep": "—", "turmas": 4,
    "con": {"prog": "Não", "pontos": 0, "rack": "Não", "obra": "Prevista", "tipo": "Fibra óptica",
            "oper": "Ligga", "vel": 100, "links": 1},
    "sala": {"estado": "—", "area": 45, "pcs": 0, "possui": False},
    "wifi": {"cob": 75, "ctrl": "—", "ssid": "—", "aps": 0, "possui": False},
    "parque": {"chromebooks": 0, "pos81": 0, "pos230": 0, "daten": 0, "pos06": 0, "outros": 0},
    "proj": 1, "lousas": 0, "impr": 1, "nome": "E.E. Nova", "inep": "—", "end": "—", "tel": "—",
    "email": "—", "alunos": 120, "turnos": "Manhã e tarde", "mods": ["Educação Profissional"],
    "mun": 3156601, "x": 0.5, "y": 0.5,
}

BASE = {"ek": "90000001", "sre": 0, "escNome": "E.E. Teste"}
ASSET = "0123456789abcdef0123456789abcdef"

COLECOES = {
    "links": {"titulo": "Drive", "url": "https://example.org", "cat": "Equipe", "sre": None, "desc": ""},
    "arquivos": {"cat": "arp", "titulo": "ARP 1", "desc": "",
                 "arp": {"num": "1/2026", "org": "", "forn": "", "vig": "2026-12-31", "obj": ""},
                 "link": "https://example.org/arp.pdf"},
    "nte_registros": {**BASE, "tipo": "Visita técnica", "data": "", "resp": "", "cont": "", "rede": "nv",
                      "pcOk": "", "pcDef": 3, "obs": ""},
    "escola_fotos": {**BASE, "cat": "fachada", "legenda": "", "tam": 4, "nome": "f.png", "asset": ASSET},
    "orcamentos": {**BASE, "munNome": "Rubim", "tipo": "logica", "forn": "Rede Ltda", "valor": 1234.5,
                   "pontos": "", "data": "2026-11-24", "validade": "", "ref": "", "obs": "", "status": "rec"},
    "relatorios_salvos": {"nome": "Meu", "cols": ["inep", "nome"],
                          "filters": [{"k": "sre", "op": "eq", "v": "Almenara"}], "group": ""},
}
