import { PrismaClient } from '@prisma/client';
import { ingestFromSwagger } from '../src/lib/schema/swaggerIngestion';
import { discoverVersions, getLatestVersion } from '../src/lib/schema/versionDiscovery';

const prisma = new PrismaClient();

async function ingest(version: string) {
  console.log(`\nIngesting schemas for ${version}...`);

  const result = await ingestFromSwagger(version);
  console.log(
    `  Parsed ${result.definitionCount} definitions → ${result.schemas.length} schema rows, ${result.gvks.length} GVKs`
  );

  // Batch upsert GVKs
  const GVK_BATCH = 100;
  for (let i = 0; i < result.gvks.length; i += GVK_BATCH) {
    const batch = result.gvks.slice(i, i + GVK_BATCH);
    await prisma.$transaction(
      batch.map((gvk) =>
        prisma.schemaGvk.upsert({
          where: {
            version_group_gvkVersion_kind: {
              version,
              group: gvk.group,
              gvkVersion: gvk.gvkVersion,
              kind: gvk.kind,
            },
          },
          create: {
            version,
            group: gvk.group,
            gvkVersion: gvk.gvkVersion,
            kind: gvk.kind,
          },
          update: {},
        })
      )
    );
  }
  console.log(`  Ingested ${result.gvks.length} GVKs`);

  // Batch upsert schemas
  const SCHEMA_BATCH = 100;
  for (let i = 0; i < result.schemas.length; i += SCHEMA_BATCH) {
    const batch = result.schemas.slice(i, i + SCHEMA_BATCH);
    await prisma.$transaction(
      batch.map((s) =>
        prisma.kubernetesSchema.upsert({
          where: {
            version_schemaKey_isFullyResolved: {
              version,
              schemaKey: s.schemaKey,
              isFullyResolved: s.isFullyResolved,
            },
          },
          create: {
            version,
            schemaKey: s.schemaKey,
            schemaData: s.schemaData,
            isFullyResolved: s.isFullyResolved,
          },
          update: {
            schemaData: s.schemaData,
          },
        })
      )
    );
  }
  console.log(`  Ingested ${result.schemas.length} schema rows`);
  console.log(`Done ingesting ${version}.`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--discover')) {
    console.log('Discovering available Kubernetes versions...');
    const versions = await discoverVersions();
    console.log(`Found ${versions.length} versions:`);
    for (const v of versions) {
      console.log(`  ${v}`);
    }
    return;
  }

  let versions: string[];

  if (args.includes('--latest')) {
    const latest = await getLatestVersion();
    console.log(`Latest stable version: ${latest}`);
    versions = [latest];
  } else if (args.length === 0 || args[0].startsWith('-')) {
    console.error('Usage: npm run db:ingest-schemas -- <version> [version2 ...]');
    console.error('       npm run db:ingest-schemas -- --latest');
    console.error('       npm run db:ingest-schemas -- --discover');
    console.error('Example: npm run db:ingest-schemas -- v1.33.3');
    process.exit(1);
  } else {
    versions = args.filter((a) => !a.startsWith('-'));
  }

  try {
    for (const version of versions) {
      await ingest(version);
    }
  } catch (err) {
    console.error('Ingestion failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
