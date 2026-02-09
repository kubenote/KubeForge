import { getSchemaRepository } from '@/repositories/registry';

// --- DB-backed functions ---

export async function loadGvks(version: string) {
  const repo = getSchemaRepository();
  const gvkRecords = await repo.getGvks(version);
  return filterRealResources(
    gvkRecords.map(r => ({ group: r.group, version: r.gvkVersion, kind: r.kind }))
  );
}

export async function loadSpecificSchemas(version: string, schemas: string[] = [], full = true): Promise<Record<string, unknown>> {
  const repo = getSchemaRepository();
  const records = await repo.getSchemas(version, schemas, full);
  const schemaMap: Record<string, unknown> = {};
  for (const record of records) {
    try {
      schemaMap[record.schemaKey] = JSON.parse(record.schemaData);
    } catch {
      // Skip invalid JSON
    }
  }
  return schemaMap;
}

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
