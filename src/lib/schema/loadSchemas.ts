import fs from 'fs/promises';
import path from 'path';

//Group Version Kinds

const CACHE_DIR = path.join(process.cwd(), '.next', 'schema-cache');

export async function loadSchemas(version: string, preRef = true): Promise<Record<string, any>> {
  const basePath = path.join(CACHE_DIR, version);
  const definitionsPath = path.join(basePath, '_definitions.json');
  const schemaMap: Record<string, any> = {};

  const defsRaw = await fs.readFile(definitionsPath, 'utf-8');
  const definitionsJson = JSON.parse(defsRaw);
  const definitions = definitionsJson.definitions || {};

  const walk = async (dir: string) => {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await walk(fullPath);
      } else if (file.name.endsWith('.json') && file.name !== '_definitions.json') {
        const raw = await fs.readFile(fullPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const name = path.basename(file.name, '.json');
        preRef ? schemaMap[name] = resolveRefs(parsed, definitions) : schemaMap[name] = parsed;
      }
    }
  };

  await walk(basePath);
  return schemaMap; // fully expanded schemas keyed by filename (e.g., "deployment")
}

function resolveRefs(obj: any, definitions: Record<string, any>, seen = new Set()): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveRefs(item, definitions, seen));
  }

  if (obj && typeof obj === 'object') {
    if (obj.$ref && typeof obj.$ref === 'string') {
      const match = obj.$ref.match(/#\/definitions\/(.+)/);
      if (match) {
        const key = match[1];
        if (seen.has(key)) return {}; // prevent circular refs
        seen.add(key);
        const ref = definitions[key];
        if (!ref) return {}; // or throw error if strict
        return resolveRefs(ref, definitions, seen);
      }
    }

    const resolved: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      resolved[k] = resolveRefs(v, definitions, seen);
    }
    return resolved;
  }

  return obj;
}

export async function loadGvks(version: string) {
  const basePath = path.join(CACHE_DIR, version);
  const definitionsPath = path.join(basePath, '_definitions.json');

  const defsRaw = await fs.readFile(definitionsPath, 'utf-8');
  const definitionsJson = JSON.parse(defsRaw);
  const definitions = definitionsJson.definitions || {};

  const gvkList: { group: string; version: string; kind: string }[] = [];

  for (const schema of Object.values<any>(definitions)) {
    if (Array.isArray(schema['x-kubernetes-group-version-kind'])) {
      for (const gvk of schema['x-kubernetes-group-version-kind']) {
        gvkList.push(gvk);
      }
    }
  }

  // Deduplicate (some kinds appear multiple times for different versions)
  const seen = new Set<string>();
  const uniqueGvks = gvkList.filter(gvk => {
    const key = `${gvk.group}|${gvk.version}|${gvk.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return filterRealResources(uniqueGvks);
}

type GVK = { group: string; version: string; kind: string };

function rankVersion(v: string): [major: number, maturity: number, betaAlphaNum: number] {
  // Parses v1, v1beta1, v2alpha2, etc.
  const m = v.match(/^v(\d+)(alpha|beta)?(\d+)?$/);
  if (!m) return [-1, -1, -1]; // unknown => lowest
  const major = parseInt(m[1], 10);
  const stage = m[2] ?? "";               // "", "beta", "alpha"
  const stageNum = parseInt(m[3] ?? "0"); // e.g., beta1 -> 1
  // Higher is better: GA(3) > beta(2) > alpha(1)
  const maturity = stage === "" ? 3 : (stage === "beta" ? 2 : 1);
  // For beta/alpha, prefer higher numbered series (beta2 > beta1).
  return [major, maturity, stageNum];
}

export function filterRealResources(gvks: GVK[]): GVK[] {
  const excludedKinds = new Set([
    // Meta / plumbing
    'Status','APIGroup','APIGroupList','APIResourceList','APIVersions',
    'WatchEvent','DeleteOptions','Scale','Eviction',
    // Rarely hand-authored / system-generated
    'Binding','ComponentStatus','SelfSubjectAccessReview','SelfSubjectRulesReview',
    'SelfSubjectReview','SubjectAccessReview','LocalSubjectAccessReview',
    'TokenRequest','TokenReview','StorageVersion','StorageVersionMigration',
  ]);

  // 1) Remove lists & excluded kinds
  const filtered = gvks.filter(
    gvk => !gvk.kind.endsWith('List') && !excludedKinds.has(gvk.kind)
  );

  // 2) Dedup by (group, kind) keeping best version per rank
  const best = new Map<string, GVK>();
  for (const gvk of filtered) {
    const key = `${gvk.group}|${gvk.kind}`; // group can be ""
    const curr = best.get(key);
    if (!curr) {
      best.set(key, gvk);
      continue;
    }
    const a = rankVersion(gvk.version);
    const b = rankVersion(curr.version);
    // Compare: major, then maturity (GA>beta>alpha), then series number
    if (
      a[0] > b[0] ||
      (a[0] === b[0] && a[1] > b[1]) ||
      (a[0] === b[0] && a[1] === b[1] && a[2] > b[2])
    ) {
      best.set(key, gvk);
    }
  }

  // 3) Stable sort for display
  return Array.from(best.values()).sort((x, y) =>
    (x.group || '').localeCompare(y.group || '') ||
    x.kind.localeCompare(y.kind) ||
    x.version.localeCompare(y.version)
  );
}
