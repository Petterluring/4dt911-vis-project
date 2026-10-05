# ---------Build Stage---------
FROM python:3.14-slim AS builder

WORKDIR /build

RUN pip install --upgrade pip
RUN pip install --no-cache-dir poetry

COPY pyproject.toml poetry.lock ./

RUN poetry config virtualenvs.create false
RUN poetry install --only main --no-root

# ---------Runtime Stage---------
FROM python:3.14-slim
WORKDIR /backend

COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY app ./app
