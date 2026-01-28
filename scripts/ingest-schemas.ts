import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CACHE_DIR = path.join(process.cwd(), 'schema-cache');

function resolveRefs(obj: unknown, definitions: Record<string, unknown>, seen = new Set<string>()): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveRefs(item, definitions, seen));
  }
  if (obj && typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    if (record.$ref && typeof record.$ref === 'string') {
      const match = record.$ref.match(/#\/definitions\/(.+)/);
      if (match) {
        const key = match[1];
        if (seen.has(key)) return {};
        seen.add(key);
        const ref = definitions[key];
        if (!ref) return {};
        return resolveRefs(ref, definitions, seen);
      }
    }
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      resolved[k] = resolveRefs(v, definitions, seen);
    }
    return resolved;
  }
  return obj;
}

type GVK = { group: string; version: string; kind: string };

async function downloadSchemas(version: string): Promise<void> {
  const targetPath = path.join(CACHE_DIR, version, 'raw');

  // Check if already downloaded
  try {
    const stat = await fs.stat(path.join(targetPath, '_definitions.json'));
    if (stat.isFile()) {
      console.log(`  Schema files already cached for ${version}`);
      return;
    }
  } catch {
    // Not cached, download
  }

  const zipUrl = `https://github.com/kubenote/kubernetes-schema/archive/refs/heads/${version}.zip`;
  console.log(`  Downloading ${zipUrl}...`);

  const res = await fetch(zipUrl);
  if (!res.ok) {
    throw new Error(`Failed to download schemas: HTTP ${res.status} ${res.statusText}`);
  }

  const buf = await res.arrayBuffer();
  console.log(`  Downloaded ${(buf.byteLength / 1024 / 1024).toFixed(1)}MB, extracting...`);

  // Dynamic import for JSZip (it's a project dependency)
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buf);

  await fs.mkdir(targetPath, { recursive: true });

  const entries = Object.entries(zip.files);
  let extracted = 0;

  for (const [relativePath, file] of entries) {
    if (!file.dir) {
      const content = await file.async('nodebuffer');
      const parts = relativePath.split('/');
      const relativeWithinSchema = parts.slice(1).join('/');
      const fullPath = path.join(targetPath, relativeWithinSchema);

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content);
      extracted++;
    }
  }

  console.log(`  Extracted ${extracted} files`);
}

async function ingest(version: string) {
  const basePath = path.join(CACHE_DIR, version, 'raw');
  const definitionsPath = path.join(basePath, '_definitions.json');

  console.log(`Ingesting schemas for ${version} from ${basePath}...`);

  const defsRaw = await fs.readFile(definitionsPath, 'utf-8');
  const definitionsJson = JSON.parse(defsRaw) as { definitions?: Record<string, unknown> };
  const definitions = definitionsJson.definitions || {};

  // 1. Ingest GVKs
  let gvkCount = 0;
  for (const schema of Object.values(definitions)) {
    const schemaObj = schema as Record<string, unknown>;
    if (Array.isArray(schemaObj['x-kubernetes-group-version-kind'])) {
      for (const gvk of schemaObj['x-kubernetes-group-version-kind'] as GVK[]) {
        await prisma.schemaGvk.upsert({
          where: {
            version_group_gvkVersion_kind: {
              version,
              group: gvk.group,
              gvkVersion: gvk.version,
              kind: gvk.kind,
            },
          },
          create: {
            version,
            group: gvk.group,
            gvkVersion: gvk.version,
            kind: gvk.kind,
          },
          update: {},
        });
        gvkCount++;
      }
    }
  }
  console.log(`  Ingested ${gvkCount} GVKs`);

  // 2. Ingest individual schema files (both resolved and unresolved)
  let schemaCount = 0;
  const walk = async (dir: string) => {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await walk(fullPath);
      } else if (file.name.endsWith('.json') && file.name !== '_definitions.json') {
        const raw = await fs.readFile(fullPath, 'utf-8');
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const name = path.basename(file.name, '.json');

        // Store unresolved
        await prisma.kubernetesSchema.upsert({
          where: {
            version_schemaKey_isFullyResolved: {
              version,
              schemaKey: name.toLowerCase(),
              isFullyResolved: false,
            },
          },
          create: {
            version,
            schemaKey: name.toLowerCase(),
            schemaData: JSON.stringify(parsed),
            isFullyResolved: false,
          },
          update: {
            schemaData: JSON.stringify(parsed),
          },
        });

        // Store resolved
        const resolved = resolveRefs(parsed, definitions);
        await prisma.kubernetesSchema.upsert({
          where: {
            version_schemaKey_isFullyResolved: {
              version,
              schemaKey: name.toLowerCase(),
              isFullyResolved: true,
            },
          },
          create: {
            version,
            schemaKey: name.toLowerCase(),
            schemaData: JSON.stringify(resolved),
            isFullyResolved: true,
          },
          update: {
            schemaData: JSON.stringify(resolved),
          },
        });

        schemaCount++;
      }
    }
  };

  await walk(basePath);
  console.log(`  Ingested ${schemaCount} schemas (resolved + unresolved)`);
  console.log(`Done ingesting ${version}.`);
}

async function main() {
  const version = process.argv[2];
  if (!version) {
    console.error('Usage: npm run db:ingest-schemas -- <version>');
    console.error('Example: npm run db:ingest-schemas -- v1.33.3');
    process.exit(1);
  }

  try {
    await downloadSchemas(version);
    await ingest(version);
  } catch (err) {
    console.error('Ingestion failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
