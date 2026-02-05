/**
 * Shared schema fetch service — module-level singleton that deduplicates
 * in-flight HTTP requests to /api/schema/load.
 *
 * Two public functions:
 *   fetchGvks(version)              → Promise<GVK[]>
 *   fetchSchemas(version, kinds, full) → Promise<SchemaData | null>
 *
 * Concurrent callers with the same cache key share a single Promise.
 * The Promise self-cleans from the map in .finally(), so subsequent
 * calls after completion will issue a fresh request.
 */

import { schemaUrls } from '@/lib/apiUrls';

interface GVK {
  group: string;
  version: string;
  kind: string;
}

type SchemaData = Record<string, unknown>;

// In-flight request maps
const gvkInflight = new Map<string, Promise<GVK[]>>();
const schemaInflight = new Map<string, Promise<SchemaData | null>>();

export function fetchGvks(version: string): Promise<GVK[]> {
  const key = version;

  const existing = gvkInflight.get(key);
  if (existing) return existing;

  const promise = fetch(schemaUrls.load(version))
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(d => (d.gvks ?? []) as GVK[])
    .finally(() => {
      gvkInflight.delete(key);
    });

  gvkInflight.set(key, promise);
  return promise;
}

export function fetchSchemas(
  version: string,
  kinds: string[],
  full: boolean,
): Promise<SchemaData | null> {
  const sortedKinds = [...kinds].sort();
  const key = `${version}:${sortedKinds.join(',')}:${full}`;

  const existing = schemaInflight.get(key);
  if (existing) return existing;

  const promise = fetch(
    schemaUrls.loadSchemas(version, sortedKinds, full),
  )
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(raw => (raw && typeof raw === 'object' ? (raw as SchemaData) : null))
    .catch(() => null)
    .finally(() => {
      schemaInflight.delete(key);
    });

  schemaInflight.set(key, promise);
  return promise;
}
