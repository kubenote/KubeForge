#!/bin/sh
set -e

PGDATA="/var/lib/postgresql/data"

# If DATABASE_URL is provided, use external database directly
if [ -n "$DATABASE_URL" ]; then
  echo "[kubeforge] Using external database"
else
  echo "[kubeforge] No DATABASE_URL provided — starting embedded PostgreSQL..."

  # Initialize database if needed
  if [ ! -f "$PGDATA/PG_VERSION" ]; then
    mkdir -p "$PGDATA"
    chown postgres:postgres "$PGDATA"
    su-exec postgres initdb -D "$PGDATA" --auth=trust --no-locale --encoding=UTF8
    # Allow local connections without password
    echo "host all all 127.0.0.1/32 trust" >> "$PGDATA/pg_hba.conf"
  fi

  # Start PostgreSQL in the background
  PGLOG="/var/lib/postgresql/postgresql.log"
  touch "$PGLOG" && chown postgres:postgres "$PGLOG"
  su-exec postgres pg_ctl start -D "$PGDATA" -l "$PGLOG" -o "-k /tmp"

  # Wait for it to be ready
  echo "[kubeforge] Waiting for PostgreSQL..."
  for i in $(seq 1 30); do
    if su-exec postgres pg_isready -h 127.0.0.1 -q 2>/dev/null; then
      break
    fi
    sleep 0.5
  done

  # Create database if it doesn't exist
  su-exec postgres psql -h 127.0.0.1 -tc "SELECT 1 FROM pg_database WHERE datname = 'kubeforge'" | grep -q 1 \
    || su-exec postgres createdb -h 127.0.0.1 kubeforge

  export DATABASE_URL="postgresql://postgres@127.0.0.1:5432/kubeforge"
  echo "[kubeforge] Embedded PostgreSQL ready"
fi

# Run migrations, seed schemas, start the app
echo "[kubeforge] Running migrations..."
npx prisma migrate deploy

echo "[kubeforge] Ensuring schemas..."
node scripts/ensure-schemas.js

echo "[kubeforge] Starting KubeForge..."
exec npm start
