#!/usr/bin/env bash
# Chạy schema + kiểm thử cô lập User A / User B trên PostgreSQL 16 + pgvector (Docker).
# Cùng phiên bản engine với Cloud SQL POSTGRES_16 trong terraform/modules/data.
# Dùng: bash tv3_data/run_isolation_test.sh
set -euo pipefail
cd "$(dirname "$0")"
NAME=vbot-tv3-pgtest
IMAGE=pgvector/pgvector:0.8.0-pg16

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test -e POSTGRES_DB=vbot "$IMAGE" >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 30); do
  docker exec "$NAME" pg_isready -U postgres -d vbot >/dev/null 2>&1 && break
  sleep 1
done
sleep 2

docker exec -i "$NAME" psql -q -U postgres -d vbot -v ON_ERROR_STOP=1 < sql/001_schema.sql
docker exec -i "$NAME" psql -q -U postgres -d vbot -v ON_ERROR_STOP=1 < sql/002_test_isolation.sql
