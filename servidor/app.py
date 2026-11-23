"""API e site do Painel de Escolas (demo).

Rodar:  uv run python -m servidor.app      (abre em http://127.0.0.1:8000)
"""
import os
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException, Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool

from servidor.armazenamento import COLECOES, Armazenamento, Conflito, CotaEsgotada

RAIZ = Path(__file__).resolve().parent.parent
DADOS = Path(os.environ.get("PAINEL_DADOS", RAIZ / "dados"))
MAX_ARQUIVO = 20 * 1024 * 1024
MAX_JSON = 1024 * 1024
MAX_TOTAL = int(os.environ.get("PAINEL_MAX_GB", "5")) * 1024**3
TIPOS = {
    "pdf": "application/pdf", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "gif": "image/gif", "webp": "image/webp", "csv": "text/csv", "txt": "text/plain",
    "md": "text/markdown", "json": "application/json",
}

db = Armazenamento(DADOS)
app = FastAPI(title="Painel de Escolas — FastAPI (demo)", docs_url="/api/docs", redoc_url=None)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def guarda(req: Request, chamar):
    """Só a própria página fala com a API (barra outro site de incluir /api/boot.js ou
    de gravar em nome de quem está logado) e corpos JSON têm teto de 1 MB."""
    if req.url.path.startswith("/api/"):
        if req.headers.get("sec-fetch-site", "same-origin") not in ("same-origin", "none"):
            return JSONResponse({"code": "origem_bloqueada"}, status_code=403)
        try:
            tam = int(req.headers.get("content-length") or 0)
        except ValueError:
            return JSONResponse({"code": "tamanho_invalido"}, status_code=400)
        # sem Content-Length (Transfer-Encoding: chunked) o teto acima não vale; o upload
        # de arquivos confere o tamanho lendo o stream, o JSON exige o cabeçalho
        if req.headers.get("transfer-encoding") and req.url.path != "/api/arquivos":
            return JSONResponse({"code": "length_required"}, status_code=411)
        if tam > MAX_JSON and req.url.path != "/api/arquivos":
            return JSONResponse({"code": "too_large"}, status_code=413)
    return await chamar(req)


class Escola(BaseModel):
    """Campos validados; os demais (wifi, parque, sala...) passam como estão."""
    model_config = ConfigDict(extra="allow")
    nome: str = Field(min_length=2, max_length=200)
    inep: str = Field(default="", pattern=r"^(\d{8}|—)?$", description="8 dígitos; vazio ou '—' quando não informado")
    sre: int | None = Field(default=None, ge=0)
    mun: str | None = Field(default=None, max_length=100)
    alunos: int | None = Field(default=None, ge=0)
    turmas: int | None = Field(default=None, ge=0)
    rev: int = Field(default=0, ge=0, description="Revisão lida pelo cliente; diferente da atual → 409")


def erro(status: int, code: str) -> HTTPException:
    return HTTPException(status, detail={"code": code})


@app.exception_handler(HTTPException)
async def _erro(_: Request, e: HTTPException) -> JSONResponse:
    corpo = e.detail if isinstance(e.detail, dict) else {"code": str(e.detail)}
    return JSONResponse(corpo, status_code=e.status_code)


def colecao(col: str) -> str:
    if col not in COLECOES:
        raise erro(404, "colecao_inexistente")
    return col


# ---------- leitura ----------
@app.get("/api/boot.js")
def boot() -> Response:
    """Dados iniciais como script: a página abre já com tudo, sem esperar outra requisição."""
    js = "Object.assign(window.PAINEL," + db.tudo_json() + ");"
    return Response(js, media_type="text/javascript", headers={"Cache-Control": "no-store"})


@app.get("/api/tudo")
def tudo() -> Response:
    return Response(db.tudo_json(), media_type="application/json", headers={"Cache-Control": "no-store"})


@app.get("/api/versao")
def versao() -> dict:
    return {"versao": db.versao()}


@app.get("/api/uso")
def uso() -> dict:
    return {**db.uso(), "maxBytes": MAX_TOTAL}


# ---------- escolas ----------
@app.post("/api/escolas", status_code=201)
def criar_escola(dados: Escola) -> dict:
    return db.criar_escola(dados.model_dump(exclude_unset=True))


@app.put("/api/escolas/{id_}")
def atualizar_escola(id_: int, dados: Escola) -> dict:
    """Envie o `rev` que você leu; se outra pessoa gravou antes, a resposta é 409."""
    try:
        e = db.atualizar_escola(id_, dados.model_dump(exclude_unset=True))
    except Conflito:
        raise erro(409, "conflito")
    if e is None:
        raise erro(404, "nao_encontrada")
    return e


@app.post("/api/escolas/remover")
def remover_escolas(ids: list[int] = Body(embed=True)) -> dict:
    return {"removidas": db.remover_escolas(ids)}


# ---------- coleções ----------
@app.post("/api/c/{col}", status_code=201)
def adicionar(col: str, dados: dict = Body()) -> dict:
    return db.adicionar(colecao(col), dados)


@app.patch("/api/c/{col}/{id_}")
def atualizar(col: str, id_: str, patch: dict = Body()) -> dict:
    r = db.atualizar(colecao(col), id_, patch)
    if r is None:
        raise erro(404, "nao_encontrado")
    return r


@app.delete("/api/c/{col}/{id_}", status_code=204)
def remover(col: str, id_: str) -> Response:
    if not db.remover(colecao(col), id_):
        raise erro(404, "nao_encontrado")
    return Response(status_code=204)


@app.put("/api/meta/{ek}", status_code=204)
def definir_meta(ek: str, dados: dict = Body()) -> Response:
    db.definir_meta(ek, dados)
    return Response(status_code=204)


# ---------- arquivos (corpo cru, nome na query: sem multipart) ----------
@app.post("/api/arquivos", status_code=201)
async def enviar(req: Request, nome: str) -> dict:
    tipo = TIPOS.get(nome.rsplit(".", 1)[-1].lower())
    if not tipo:
        raise erro(415, "unsupported_type")
    if int(req.headers.get("content-length") or 0) > MAX_ARQUIVO:  # já validado na guarda
        raise erro(413, "too_large")
    conteudo = bytearray()
    async for parte in req.stream():
        conteudo += parte
        if len(conteudo) > MAX_ARQUIVO:
            raise erro(413, "too_large")
    try:
        id_ = await run_in_threadpool(db.salvar_blob, bytes(conteudo), tipo, MAX_TOTAL)
    except CotaEsgotada:
        raise erro(507, "quota_or_state")
    return {"id": id_, "sizeBytes": len(conteudo)}


@app.get("/_blob/{id_}")
def baixar(id_: str) -> FileResponse:
    caminho, tipo = db.blob(id_)
    if not caminho or not caminho.exists():
        raise erro(404, "nao_encontrado")
    return FileResponse(caminho, media_type=tipo, headers={
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
    })


app.mount("/", StaticFiles(directory=RAIZ / "web", html=True), name="web")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("servidor.app:app", host=os.environ.get("PAINEL_HOST", "127.0.0.1"), port=int(os.environ.get("PAINEL_PORTA", "8000")))
