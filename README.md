# Painel de Escolas — FastAPI (demo)

Painel web para acompanhar o **parque tecnológico e a conectividade de uma rede de escolas**:
mapa por regional e município, indicadores, relatórios montados pelo usuário, cadastro de
escolas e uma área de documentos com upload de arquivos e fotos, compartilhada pela equipe.

> **Dados fictícios.** Escolas, códigos INEP, endereços, telefones e indicadores são inventados
> (gerados por `servidor/seed/gerar_seed.py`). Só a malha de municípios e regionais é real e
> pública (IBGE). Projeto inspirado num sistema interno que o autor desenvolveu.

![Dashboard com mapa por regional](docs/painel.png)

![Documentação interativa da API (Swagger)](docs/swagger.png)

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
│ framework            │ ◄────── │ servidor/modelos.py   │ ◄─── │ SQLAlchemy 2 + Alembic    │
└──────────────────────┘         │ (Pydantic: validação) │      │ SQLite ou PostgreSQL      │
                                 └───────────────────────┘      └──────────────────────────┘
```

```
web/          site estático (o próprio FastAPI serve)
servidor/     API (app.py), modelos Pydantic (modelos.py), camada de dados (armazenamento.py),
              migrações Alembic (migracoes/) e seed fictício
testes/       pytest: API, validação e camada SQL
deploy/       exemplo de serviço systemd
dados/        criado ao rodar: painel.db (SQLite) e arquivos enviados (fora do git)
```

## Decisões de projeto

- **Banco relacional (SQLAlchemy 2) em vez de arquivo JSON.** A primeira versão gravava tudo num
  `banco.json` sob uma trava global: funcionava, mas cada gravação reescrevia o arquivo inteiro e a
  consistência dependia de código meu. Com SQL, quem garante atomicidade e isolamento é o banco
  (transações), e o mesmo código roda em **SQLite** (padrão, zero configuração) e **PostgreSQL**
  (`PAINEL_DB_URL`, ou `docker compose up`). O CI roda todos os testes nos dois. As tabelas
  nascem de migrações do **Alembic**, aplicadas quando o servidor sobe; um teste falha se o modelo
  mudar sem migração. Campos usados em consulta (nome, INEP, regional, município...) são colunas;
  o inventário de cada escola (Wi-Fi, sala, parque de computadores) é um documento que a página lê
  inteiro, então fica numa coluna JSON, já validado pelo Pydantic.
- **Como funciona o 409 (trava otimista).** Cada escola tem um número de revisão, `rev`. A página
  envia de volta o `rev` que leu, e a gravação é um único comando:
  `UPDATE escolas SET ..., rev = rev + 1 WHERE id = :id AND rev = :rev_lido`. Se outra pessoa
  salvou antes, o `rev` no banco já subiu, o `UPDATE` não altera nenhuma linha e a API responde
  **409 `conflito`**; a página recarrega e avisa, em vez de apagar a edição alheia. Como a
  comparação e a escrita acontecem no mesmo comando, dentro de uma transação, duas gravações
  simultâneas não passam juntas (há um teste com 8 threads na mesma revisão: só uma vence).
- **Versão global para a página saber quando recarregar.** Toda gravação começa somando 1 numa
  tabela `versao` de uma linha só, na mesma transação. Isso também enfileira as gravações (a linha
  fica travada até o commit), simples e suficiente para o volume de um painel interno.
  A leitura completa (`/api/tudo`) é feita numa transação só, então versão e dados vêm sempre do
  mesmo instante.
- **Validação explícita com Pydantic.** Cada rota tem seu modelo (`servidor/modelos.py`), com
  tipos, tamanhos, formatos (INEP com 8 dígitos ou `—`, datas `AAAA-MM-DD`, URL `http(s)`) e listas
  de valores permitidos. Chave desconhecida é recusada (422). Os modelos de edição parcial (PATCH)
  são derivados dos de criação, com tudo opcional mas os mesmos limites.
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
`PAINEL_DADOS` (pasta de dados, padrão `./dados`), `PAINEL_DB_URL` (banco; padrão SQLite em
`dados/painel.db`, ex.: `postgresql+psycopg://usuario:senha@host/painel`) e `PAINEL_MAX_GB`
(cota de arquivos, `5`).

As migrações rodam sozinhas ao subir. Para rodá-las à mão: `uv run alembic upgrade head`.

### Docker

```bash
docker build -t painel-escolas .
docker run --rm -p 8000:8000 -v painel-dados:/app/dados painel-escolas
```

A imagem usa `python:3.12-slim`, roda como usuário sem privilégios e guarda os dados no volume.

Com PostgreSQL:

```bash
docker compose up --build     # app em http://localhost:8000, banco no serviço "db"
```

### Dados de exemplo

```bash
python servidor/seed/gerar_seed.py   # regera servidor/seed/escolas.json (semente fixa)
```

O seed entra só quando o banco é criado; depois valem os dados do banco.

## Testes

```bash
uv run python -m pytest -v      # ou: python -m pytest -v
```

Cada teste ganha um banco novo (SQLite temporário). São três grupos:

- `test_api.py`: CRUD de cada coleção, escolas, arquivos, guarda de origem e tamanho, persistência
  após reinício e o conflito de edição (409).
- `test_validacao.py`: aceita os corpos no formato que a página envia e recusa campo desconhecido,
  formato errado e valor fora da lista (422).
- `test_armazenamento.py`: a camada SQL direto: seed, versão, conflito com threads simultâneas,
  cota e remoção de arquivos, migrações conferidas contra os modelos.

Com `PAINEL_DB_URL` apontando para um PostgreSQL, os mesmos testes rodam nele. O CI (GitHub
Actions) roda a suíte em SQLite e em PostgreSQL, o `docker build` e sobe o `docker compose`.

## Próximos passos

1. Login e papéis (leitor, colaborador, editor). Até lá, não exponha o serviço publicamente.
2. Mensagem de erro de validação mais específica na página (hoje ela mostra um aviso genérico).

## Licença

[MIT](LICENSE)
