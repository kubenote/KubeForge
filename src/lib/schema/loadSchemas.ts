import fs from 'fs/promises';
import path from 'path';
import { safeJsonParseOrThrow } from '@/lib/safeJson';
import { getSchemaRepository } from '@/repositories/registry';

const CACHE_DIR = path.join(process.cwd(), 'schema-cache');

// --- Filesystem functions (used by ingestion script and as dev fallback) ---

export async function loadSchemasFromFilesystem(version: string, preRef = true): Promise<Record<string, unknown>> {
  const basePath = path.join(CACHE_DIR, version, "raw");
  const definitionsPath = path.join(basePath, '_definitions.json');
  const schemaMap: Record<string, unknown> = {};

  const defsRaw = await fs.readFile(definitionsPath, 'utf-8');
  const definitionsJson = safeJsonParseOrThrow<{ definitions?: Record<string, unknown> }>(defsRaw, 'schema definitions');
  const definitions = definitionsJson.definitions || {};

  const walk = async (dir: string) => {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await walk(fullPath);
      } else if (file.name.endsWith('.json') && file.name !== '_definitions.json') {
        const raw = await fs.readFile(fullPath, 'utf-8');
        const parsed = safeJsonParseOrThrow<Record<string, unknown>>(raw, `schema file ${file.name}`);
        const name = path.basename(file.name, '.json');
        preRef ? schemaMap[name] = resolveRefs(parsed, definitions) : schemaMap[name] = parsed;
      }
    }
  };

  await walk(basePath);
  return schemaMap;
}

export async function loadGvksFromFilesystem(version: string) {
  const basePath = path.join(CACHE_DIR, version, "raw");
  const definitionsPath = path.join(basePath, '_definitions.json');

  const defsRaw = await fs.readFile(definitionsPath, 'utf-8');
  const definitionsJson = safeJsonParseOrThrow<{ definitions?: Record<string, unknown> }>(defsRaw, 'GVK definitions');
  const definitions = definitionsJson.definitions || {};

  const gvkList: { group: string; version: string; kind: string }[] = [];

  for (const schema of Object.values(definitions)) {
    const schemaObj = schema as Record<string, unknown>;
    if (Array.isArray(schemaObj['x-kubernetes-group-version-kind'])) {
      for (const gvk of schemaObj['x-kubernetes-group-version-kind'] as GVK[]) {
        gvkList.push(gvk);
      }
    }
  }

  const seen = new Set<string>();
  const uniqueGvks = gvkList.filter(gvk => {
    const key = `${gvk.group}|${gvk.version}|${gvk.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return filterRealResources(uniqueGvks);
}

export async function loadSpecificSchemasFromFilesystem(version: string, schemas: string[] = [], full = true): Promise<Record<string, unknown>> {
  const basePath = path.join(CACHE_DIR, version, "raw");
  const definitionsPath = path.join(basePath, '_definitions.json');
  const schemaMap: Record<string, unknown> = {};

  const defsRaw = await fs.readFile(definitionsPath, 'utf-8');
  const definitionsJson = safeJsonParseOrThrow<{ definitions?: Record<string, unknown> }>(defsRaw, 'specific schema definitions');
  const definitions = definitionsJson.definitions || {};

  const walk = async (dir: string) => {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await walk(fullPath);
      } else if (file.name.endsWith('.json') && file.name !== '_definitions.json') {
        const raw = await fs.readFile(fullPath, 'utf-8');
        const parsed = safeJsonParseOrThrow<Record<string, unknown>>(raw, `specific schema file ${file.name}`);
        const name = path.basename(file.name, '.json');
        if (schemas.includes(name.toLowerCase())) full ? schemaMap[name] = resolveRefs(parsed, definitions) : schemaMap[name] = parsed;
      }
    }
  };

  await walk(basePath);
  return schemaMap;
}

// --- DB-backed functions (primary), with filesystem fallback ---

export async function loadGvks(version: string) {
  const repo = getSchemaRepository();
  const hasVersion = await repo.hasVersion(version);

  if (hasVersion) {
    const gvkRecords = await repo.getGvks(version);
    return filterRealResources(
      gvkRecords.map(r => ({ group: r.group, version: r.gvkVersion, kind: r.kind }))
    );
  }

  // Fallback to filesystem only if files exist
  return loadGvksFromFilesystem(version);
}

export async function loadSpecificSchemas(version: string, schemas: string[] = [], full = true): Promise<Record<string, unknown>> {
  const repo = getSchemaRepository();
  const hasVersion = await repo.hasVersion(version);

  if (hasVersion) {
    const records = await repo.getSchemas(version, schemas, full);
    if (records.length > 0) {
      const schemaMap: Record<string, unknown> = {};
      for (const record of records) {
        try {
          schemaMap[record.schemaKey] = JSON.parse(record.schemaData);
        } catch {
          // Skip invalid JSON
        }
      }
      if (Object.keys(schemaMap).length > 0) return schemaMap;
    }
  }

  // Fallback to filesystem only if files exist
  return loadSpecificSchemasFromFilesystem(version, schemas, full);
}

// Keep old name as alias
export const loadSchemas = loadSchemasFromFilesystem;

// --- Shared helpers ---

export function resolveRefs(obj: unknown, definitions: Record<string, unknown>, seen = new Set()): unknown {
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

function rankVersion(v: string): [major: number, maturity: number, betaAlphaNum: number] {
  const m = v.match(/^v(\d+)(alpha|beta)?(\d+)?$/);
  if (!m) return [-1, -1, -1];
  const major = parseInt(m[1], 10);
  const stage = m[2] ?? "";
  const stageNum = parseInt(m[3] ?? "0");
  const maturity = stage === "" ? 3 : (stage === "beta" ? 2 : 1);
  return [major, maturity, stageNum];
}

export function filterRealResources(gvks: GVK[]): GVK[] {
  const excludedKinds = new Set([
    'Status', 'APIGroup', 'APIGroupList', 'APIResourceList', 'APIVersions',
    'WatchEvent', 'DeleteOptions', 'Scale', 'Eviction',
    'Binding', 'ComponentStatus', 'SelfSubjectAccessReview', 'SelfSubjectRulesReview',
    'SelfSubjectReview', 'SubjectAccessReview', 'LocalSubjectAccessReview',
    'TokenRequest', 'TokenReview', 'StorageVersion', 'StorageVersionMigration',
  ]);

  const filtered = gvks.filter(
    gvk => !gvk.kind.endsWith('List') && !excludedKinds.has(gvk.kind)
  );

  const best = new Map<string, GVK>();
  for (const gvk of filtered) {
    const key = `${gvk.group}|${gvk.kind}`;
    const curr = best.get(key);
    if (!curr) {
      best.set(key, gvk);
      continue;
    }
    const a = rankVersion(gvk.version);
    const b = rankVersion(curr.version);
    if (
      a[0] > b[0] ||
      (a[0] === b[0] && a[1] > b[1]) ||
      (a[0] === b[0] && a[1] === b[1] && a[2] > b[2])
    ) {
      best.set(key, gvk);
    }
  }

  return Array.from(best.values()).sort((x, y) =>
    (x.group || '').localeCompare(y.group || '') ||
    x.kind.localeCompare(y.kind) ||
    x.version.localeCompare(y.version)
  );
}
