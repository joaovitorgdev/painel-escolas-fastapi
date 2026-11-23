# Painel de Escolas — FastAPI (demo)

Painel web para acompanhar o **parque tecnológico e a conectividade de uma rede de escolas**:
mapa por regional e município, indicadores, relatórios montados pelo usuário, cadastro de
escolas e uma área de documentos com upload de arquivos e fotos, compartilhada pela equipe.

> **Dados fictícios.** Escolas, códigos INEP, endereços, telefones e indicadores são inventados
> (gerados por `servidor/seed/gerar_seed.py`). Só a malha de municípios e regionais é real e
> pública (IBGE). Projeto inspirado num sistema interno que o autor desenvolveu.

## Funcionalidades

- **Dashboard com mapa** (SVG) por regional e município, indicadores que mudam conforme o recorte e
  mapa de calor (Wi-Fi, sala de informática, velocidade, obras, computadores).
- **Relatórios**: o usuário escolhe colunas, filtros e agrupamento; salva para a equipe e exporta
  em Excel, PDF ou CSV.
- **Escolas**: busca, ficha completa da escola, cadastro, edição e remoção.
- **Documentos**: atalhos para drives, repositório de arquivos, pasta de fotos por escola e
  orçamentos com comparativo.
- **Trabalho em equipe**: tudo é gravado no servidor; a página confere a versão a cada 15 s e se
  atualiza quando outra pessoa muda algo.

## Arquitetura

```
 navegador                         servidor (Python)
┌──────────────────────┐  HTTP   ┌───────────────────────┐      ┌──────────────────────────┐
│ web/  HTML+CSS+JS    │ ──────► │ servidor/app.py       │ ───► │ servidor/armazenamento.py │
│ sem build, sem       │  JSON   │ FastAPI: rotas,       │      │ ÚNICA camada de dados     │
│ framework            │ ◄────── │ validação, limites    │ ◄─── │ hoje: JSON + trava        │
└──────────────────────┘         └───────────────────────┘      │ amanhã: banco de dados    │
                                                                 └──────────────────────────┘
```

```
web/          site estático (o próprio FastAPI serve)
servidor/     API (app.py), camada de dados (armazenamento.py) e seed fictício
testes/       testes da API (pytest + TestClient)
deploy/       exemplo de serviço systemd
dados/        criado ao rodar: banco.json e arquivos enviados (fora do git)
```

## Decisões de projeto

- **Armazenamento atrás de um único módulo.** Toda leitura e gravação passa por
  `armazenamento.py`. Hoje é um arquivo JSON gravado de forma atômica (arquivo temporário +
  `fsync` + `os.replace`) sob uma trava global. Trocar por PostgreSQL/SQLite é reescrever só esse
  módulo, com os mesmos métodos; a API e o site não mudam.
- **Trava otimista contra sobrescrita entre usuários.** Cada escola tem um `rev`. O `PUT` precisa
  enviar o `rev` que leu; se outra pessoa gravou antes, a API responde **409 `conflito`**, a página
  recarrega os dados e avisa, em vez de apagar silenciosamente a edição alheia.
- **Upload sem multipart.** O arquivo vai cru no corpo (`POST /api/arquivos?nome=foto.png`),
  lido em streaming com teto de 20 MB, só com extensões permitidas (PDF, imagens, CSV, TXT, MD,
  JSON; HTML e SVG são recusados com 415) e cota total configurável. Os downloads saem com
  `X-Content-Type-Options: nosniff`. Arquivos referenciados por várias linhas só são apagados quando
  a última referência some.
- **Guarda anti-CSRF / anti-inclusão.** Um middleware recusa (403) chamadas a `/api/*` cujo
  cabeçalho `Sec-Fetch-Site` indique outro site, e limita corpos JSON a 1 MB (413).
- **Boot em uma requisição.** `/api/boot.js` entrega os dados como script, então a página abre já
  preenchida, sem esperar um segundo `fetch`.
- **Sem etapa de build no front.** JS clássico, carregado em ordem; bibliotecas de exportação
  (xlsx, jsPDF) só são baixadas quando o usuário exporta.

## Como rodar

### Local (Python 3.12)

Com [uv](https://docs.astral.sh/uv/):

```bash
uv run python -m servidor.app
```

Ou com pip:

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt pytest httpx
python -m servidor.app
```

Abre em http://127.0.0.1:8000. **Documentação interativa da API (OpenAPI): `/api/docs`.**

Variáveis de ambiente: `PAINEL_HOST` (padrão `127.0.0.1`), `PAINEL_PORTA` (`8000`),
`PAINEL_DADOS` (pasta de dados, padrão `./dados`) e `PAINEL_MAX_GB` (cota de arquivos, `5`).

### Docker

```bash
docker build -t painel-escolas .
docker run --rm -p 8000:8000 -v painel-dados:/app/dados painel-escolas
```

A imagem usa `python:3.12-slim`, roda como usuário sem privilégios e guarda os dados no volume.

### Dados de exemplo

```bash
python servidor/seed/gerar_seed.py   # regera servidor/seed/escolas.json (semente fixa)
```

O seed entra só no primeiro uso; depois valem os dados em `dados/banco.json`.

## Testes

```bash
uv run python -m pytest -v      # ou: python -m pytest -v
```

Os testes sobem a API num diretório temporário e percorrem o fluxo completo: coleções (criar,
editar, remover), upload e download, recusa de tipos e tamanhos, bloqueio de outra origem,
contagem de referências de arquivos, persistência após reinício e o conflito de edição
concorrente (409). O CI (GitHub Actions) roda os testes e o `docker build` a cada push.

## Próximos passos

1. Banco de dados no lugar do JSON (só `armazenamento.py` muda).
2. Login e papéis (leitor, colaborador, editor). Até lá, não exponha o serviço publicamente.

## Licença

[MIT](LICENSE)
