#!/usr/bin/env node

/**
 * Docker startup script: checks if any schemas exist in the DB.
 * If empty, ingests a default Kubernetes version so the app is usable.
 */

const DEFAULT_VERSION = 'v1.33.3';

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const count = await prisma.schemaGvk.count();
    if (count > 0) {
      console.log(`Schemas already present (${count} GVK rows). Skipping ingestion.`);
      return;
    }

    console.log(`No schemas found. Ingesting ${DEFAULT_VERSION}...`);

    // Use tsx to run the TypeScript ingestion script
    const { execSync } = require('child_process');
    execSync(`npx tsx scripts/ingest-schemas.ts ${DEFAULT_VERSION}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    console.log('Default schema ingestion complete.');
  } catch (err) {
    console.error('ensure-schemas failed:', err.message);
    // Non-fatal: app can start without schemas, user can ingest later
  } finally {
    await prisma.$disconnect();
  }
}

main();
