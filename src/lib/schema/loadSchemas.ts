import fs from 'fs/promises';
import path from 'path';

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