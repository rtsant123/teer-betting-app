#!/bin/sh
set -e

echo "[start] Applying database migrations..."
alembic upgrade head || { echo "[start][error] Alembic migration failed" >&2; exit 1; }

echo "[start] Launching Gunicorn (workers=${WORKERS:-1})..."
exec gunicorn app.main:app \
  -w ${WORKERS:-1} \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --worker-tmp-dir /dev/shm \
  --access-logfile - \
  --error-logfile - \
  --log-level info
