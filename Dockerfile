FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 \
    PAINEL_HOST=0.0.0.0 PAINEL_PORTA=8000 PAINEL_DADOS=/app/dados

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY servidor/ servidor/
COPY web/ web/
RUN useradd --create-home --uid 10001 app && mkdir -p /app/dados && chown app /app/dados
USER app

VOLUME ["/app/dados"]
EXPOSE 8000
CMD ["python", "-m", "servidor.app"]
