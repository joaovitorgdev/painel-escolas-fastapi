"""Modelos de entrada da API: só passam os campos que a página realmente envia.

Todos recusam chave desconhecida (extra="forbid"). Os de criação exigem os campos
obrigatórios; os de edição parcial (PATCH) são gerados por `parcial()` com tudo opcional,
mas mantendo tipos e limites.
"""
from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints, create_model


def texto(maximo: int, minimo: int = 0, padrao: str | None = None):
    return Annotated[str, StringConstraints(max_length=maximo, min_length=minimo, pattern=padrao)]


Texto = texto(2000)
Curto = texto(200)
Data = texto(10, padrao=r"^(\d{4}-\d{2}-\d{2})?$")  # 'AAAA-MM-DD' ou vazio
Url = texto(2000, padrao=r"^https?://\S+$")
Ek = texto(16, padrao=r"^(\d{8}|id\d+)$")  # INEP da escola ou 'id' + id interno
Asset = texto(32, padrao=r"^[0-9a-f]{32}$")  # id devolvido por POST /api/arquivos
Contagem = Annotated[int, Field(ge=0)]
ContagemOuVazio = Contagem | Literal[""]  # campo numérico deixado em branco no formulário


class Modelo(BaseModel):
    model_config = ConfigDict(extra="forbid")


def parcial(modelo: type[Modelo]) -> type[Modelo]:
    """Mesmo modelo com todos os campos opcionais, para PATCH (limites de Field preservados)."""
    def opcional(f):
        tipo = Annotated[(f.annotation, *f.metadata)] if f.metadata else f.annotation
        return tipo | None

    campos = {n: (opcional(f), None) for n, f in modelo.model_fields.items()}
    return create_model(f"{modelo.__name__}Parcial", __base__=Modelo, **campos)


# ---------- escola ----------
class Conexao(Modelo):
    oper: Curto | None = None
    tipo: Curto | None = None
    links: Contagem | None = None
    vel: Contagem | None = None
    prog: Curto | None = None
    pontos: Contagem | None = None
    rack: Curto | None = None
    obra: Curto | None = None


class Sala(Modelo):
    possui: bool | None = None
    pcs: Contagem | None = None
    estado: Curto | None = None
    area: Contagem | None = None


class Wifi(Modelo):
    possui: bool | None = None
    aps: Contagem | None = None
    cob: Annotated[int, Field(ge=0, le=100)] | None = None
    ctrl: Curto | None = None
    ssid: Curto | None = None


class Parque(Modelo):
    chromebooks: Contagem | None = None
    pos81: Contagem | None = None
    pos230: Contagem | None = None
    daten: Contagem | None = None
    pos06: Contagem | None = None
    outros: Contagem | None = None


class Escola(Modelo):
    """Cadastro completo da escola. Na edição a página devolve o objeto inteiro (com id)."""
    id: int | None = Field(default=None, description="Ignorado; o id vem da URL")
    rev: int = Field(default=0, ge=0, description="Revisão lida pelo cliente; diferente da atual → 409")
    nome: str = Field(min_length=2, max_length=200)
    inep: str = Field(default="", pattern=r"^(\d{8}|—)?$", description="8 dígitos; vazio ou '—' quando não informado")
    sre: int | None = Field(default=None, ge=0)
    # a página manda o código IBGE como número; guardamos como texto, igual ao seed
    mun: Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, int) else v),
                   StringConstraints(max_length=100)] | None = None
    x: float | None = None
    y: float | None = None
    end: Curto | None = None
    bairro: Curto | None = None
    cep: Curto | None = None
    tel: Curto | None = None
    email: Curto | None = None  # aceita '—' quando vazio, por isso não é EmailStr
    turnos: Curto | None = None
    alunos: Contagem | None = None
    turmas: Contagem | None = None
    proj: Contagem | None = None
    lousas: Contagem | None = None
    impr: Contagem | None = None
    mods: Annotated[list[Curto], Field(max_length=20)] | None = None
    con: Conexao | None = None
    sala: Sala | None = None
    wifi: Wifi | None = None
    parque: Parque | None = None


# ---------- coleções ----------
class DaEscola(Modelo):
    """Campos de linhas ligadas a uma escola."""
    ek: Ek
    sre: Contagem | None = None
    escNome: Curto | None = None


class ComArquivo(Modelo):
    """Arquivo enviado antes por POST /api/arquivos, ou um link externo."""
    asset: Asset | None = None
    tam: Contagem | None = None
    nome: texto(255) | None = None
    link: Url | None = None


class Link(Modelo):
    titulo: texto(120, 1)
    url: Url
    cat: Literal["Contratos e ARPs", "Obras e cabeamento", "Escolas", "Equipe", "Outros"] = "Outros"
    sre: Contagem | None = None  # vazio = vale para toda a rede
    desc: texto(400) = ""


class Arp(Modelo):
    num: Curto = ""
    org: Curto = ""
    forn: Curto = ""
    vig: Data = ""
    obj: Texto = ""


class Arquivo(ComArquivo):
    cat: Literal["arp", "manual", "norma", "outro", "escola"]
    titulo: texto(160, 1)
    desc: Texto = ""
    arp: Arp | None = None
    tipo: Literal["planta", "projeto", "laudo", "outro"] | None = None  # só documentos de escola
    ek: Ek | None = None
    sre: Contagem | None = None
    escNome: Curto | None = None


class RegistroNte(DaEscola):
    tipo: Literal["Atualização de dados", "Visita técnica", "Ocorrência"]
    data: Data = ""
    resp: Curto = ""
    cont: Curto = ""
    rede: Literal["", "ok", "parcial", "parada", "nv"] = ""
    pcOk: ContagemOuVazio = ""
    pcDef: ContagemOuVazio = ""
    obs: Texto = ""


class Foto(DaEscola):
    asset: Asset
    cat: Literal["fachada", "salas", "info", "rack", "cabo", "wifi", "outra"] = "outra"
    legenda: Curto = ""
    tam: Contagem | None = None
    nome: texto(255) | None = None


class Orcamento(DaEscola, ComArquivo):
    forn: texto(200, 1)
    valor: float = Field(gt=0)
    tipo: Literal["logica", "eletrica", "ambas"] = "ambas"
    status: Literal["rec", "ana", "apr", "rep"] = "rec"
    munNome: Curto = ""
    pontos: ContagemOuVazio = ""
    data: Data = ""
    validade: Data = ""
    ref: Curto = ""
    obs: Texto = ""


class Filtro(Modelo):
    k: texto(40, 1)
    op: Literal["eq", "ne", "gt", "ge", "lt", "le", "has", "nhas"]
    v: Curto


class Relatorio(Modelo):
    nome: texto(80, 1)
    cols: Annotated[list[texto(40)], Field(max_length=100)] = []
    filters: Annotated[list[Filtro], Field(max_length=100)] = []
    group: texto(40) = ""


# coleção -> (modelo de criação, modelo de edição parcial)
COLECOES = {
    "links": Link,
    "arquivos": Arquivo,
    "nte_registros": RegistroNte,
    "escola_fotos": Foto,
    "orcamentos": Orcamento,
    "relatorios_salvos": Relatorio,
}
MODELOS = {col: (m, parcial(m)) for col, m in COLECOES.items()}


class Meta(Modelo):
    capa: texto(16, padrao=r"^[0-9a-f]{16}$") = Field(description="id da foto escolhida como capa")
