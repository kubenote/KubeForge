import { resolveRefs } from './loadSchemas';

const SWAGGER_BASE_URL =
  'https://raw.githubusercontent.com/kubernetes/kubernetes';

export interface SwaggerDefinition {
  description?: string;
  properties?: Record<string, unknown>;
  'x-kubernetes-group-version-kind'?: Array<{
    group: string;
    version: string;
    kind: string;
  }>;
  [key: string]: unknown;
}

export interface ParsedSchema {
  schemaKey: string;
  schemaData: string;
  isFullyResolved: boolean;
}

export interface ParsedGvk {
  group: string;
  gvkVersion: string;
  kind: string;
}

export interface IngestionResult {
  schemas: ParsedSchema[];
  gvks: ParsedGvk[];
  definitionCount: number;
}

/**
 * Convert a swagger definition key to the schema_key format used in the DB.
 *
 * Examples:
 *   io.k8s.api.apps.v1.Deployment       → { versioned: "deployment-apps-v1", unversioned: "deployment" }
 *   io.k8s.api.core.v1.Pod              → { versioned: "pod-v1",            unversioned: "pod" }
 *   io.k8s.apimachinery.pkg.apis.meta.v1.ObjectMeta → { versioned: "objectmeta-meta-v1", unversioned: "objectmeta" }
 */
export function definitionKeyToSchemaKeys(defKey: string): {
  versioned: string;
  unversioned: string;
} {
  const parts = defKey.split('.');
  const kind = parts[parts.length - 1].toLowerCase();
  const apiVersion = parts[parts.length - 2].toLowerCase();
  const group = parts[parts.length - 3].toLowerCase();

  const versioned =
    group === 'core' || group === 'api'
      ? `${kind}-${apiVersion}`
      : `${kind}-${group}-${apiVersion}`;

  return { versioned, unversioned: kind };
}

/**
 * Fetch the swagger.json for a given Kubernetes version tag.
 */
export async function fetchSwaggerJson(
  version: string
): Promise<{ definitions: Record<string, SwaggerDefinition> }> {
  const url = `${SWAGGER_BASE_URL}/${version}/api/openapi-spec/swagger.json`;
  console.log(`  Fetching swagger.json from ${url}...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch swagger.json for ${version}: HTTP ${res.status} ${res.statusText}`
    );
  }

  const json = (await res.json()) as {
    definitions?: Record<string, SwaggerDefinition>;
  };
  if (!json.definitions) {
    throw new Error(`swagger.json for ${version} has no definitions`);
  }

  console.log(
    `  Fetched ${Object.keys(json.definitions).length} definitions`
  );
  return { definitions: json.definitions };
}

/**
 * Parse swagger definitions into schema rows and GVK rows ready for DB insertion.
 *
 * For each definition:
 *   - Generate versioned + unversioned schema_keys
 *   - Store both resolved (full=true) and unresolved (full=false) variants
 *   - Extract x-kubernetes-group-version-kind for GVK rows
 */
export function parseSwaggerDefinitions(
  definitions: Record<string, SwaggerDefinition>
): IngestionResult {
  // Use Maps to deduplicate: multiple definitions can map to the same
  // unversioned key (e.g. apps.v1.Deployment and apps.v1beta1.Deployment
  // both → "deployment"). Last-wins is fine; versioned keys are unique.
  const schemaMap = new Map<string, ParsedSchema>();
  const gvkSet = new Map<string, ParsedGvk>();

  for (const [defKey, defValue] of Object.entries(definitions)) {
    const { versioned, unversioned } = definitionKeyToSchemaKeys(defKey);

    // Build the schema object similar to what openapi2jsonschema produced:
    // top-level properties only (unresolved), with $ref kept as #/definitions/...
    const schemaObj: Record<string, unknown> = {};
    if (defValue.description) schemaObj.description = defValue.description;
    if (defValue.properties) schemaObj.properties = defValue.properties;
    if (defValue.required) schemaObj.required = defValue.required;
    if (defValue.type) schemaObj.type = defValue.type;
    if (defValue['x-kubernetes-group-version-kind']) {
      schemaObj['x-kubernetes-group-version-kind'] =
        defValue['x-kubernetes-group-version-kind'];
    }

    const unresolvedJson = JSON.stringify(schemaObj);
    const resolvedObj = resolveRefs(schemaObj, definitions);
    const resolvedJson = JSON.stringify(resolvedObj);

    // Store both versioned and unversioned keys, each with resolved + unresolved
    // Using Map ensures no duplicate (schemaKey, isFullyResolved) pairs
    for (const key of [versioned, unversioned]) {
      schemaMap.set(`${key}:false`, {
        schemaKey: key,
        schemaData: unresolvedJson,
        isFullyResolved: false,
      });
      schemaMap.set(`${key}:true`, {
        schemaKey: key,
        schemaData: resolvedJson,
        isFullyResolved: true,
      });
    }

    // Extract GVKs
    if (Array.isArray(defValue['x-kubernetes-group-version-kind'])) {
      for (const gvk of defValue['x-kubernetes-group-version-kind']) {
        const gvkKey = `${gvk.group}|${gvk.version}|${gvk.kind}`;
        if (!gvkSet.has(gvkKey)) {
          gvkSet.set(gvkKey, {
            group: gvk.group,
            gvkVersion: gvk.version,
            kind: gvk.kind,
          });
        }
      }
    }
  }

  return {
    schemas: Array.from(schemaMap.values()),
    gvks: Array.from(gvkSet.values()),
    definitionCount: Object.keys(definitions).length,
  };
}

/**
 * Full ingestion pipeline: fetch swagger.json → parse → return rows for DB insertion.
 */
export async function ingestFromSwagger(
  version: string
): Promise<IngestionResult> {
  const { definitions } = await fetchSwaggerJson(version);
  return parseSwaggerDefinitions(definitions);
}
