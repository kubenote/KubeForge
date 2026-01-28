#!/bin/bash
set -e

echo "Starting Postgres..."
docker compose up -d

echo "Waiting for Postgres to be ready..."
until docker compose exec -T postgres pg_isready -U kubeforge > /dev/null 2>&1; do
  sleep 1
done

echo "Running database setup..."
npm run db:setup

echo ""
echo "Setup complete! Run 'npm run dev' to start the development server."
echo ""
echo "To ingest Kubernetes schemas:"
echo "  npm run db:ingest-schemas -- v1.33.3"
