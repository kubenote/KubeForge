/**
 * Normalizes a raw DB integration row into a flat config object.
 *
 * Problem: Some integration tables store fields at top-level columns
 * (e.g. container_registries.registry_url, ingress_domains.domain),
 * while others store them inside a `config` JSONB column. Builders,
 * rendering, and export all need a single consistent shape.
 *
 * After normalization, `item.config` is a flat object containing ALL
 * relevant fields — both those from top-level columns and from the
 * original config JSONB. The top-level columns still exist on `item`
 * for display purposes (name, slug, provider, etc.), but all
 * operational fields live in `config`.
 */

// Fields that are common to all integration rows and should NOT be
// merged into config — they're structural, not operational.
const STRUCTURAL_FIELDS = new Set([
    'id', 'org_id', 'name', 'slug', 'created_at', 'updated_at',
])

// Top-level columns per integration type that should be merged INTO config
// so builders only need to look in one place.
const TOP_LEVEL_OPERATIONAL_FIELDS: Record<string, string[]> = {
    SecretRefNode: ['provider'],
    RegistryNode: ['registry_url', 'secret_name', 'secret_namespace'],
    ConfigMapNode: [],
    IngressNode: ['domain', 'tls_secret_name', 'ingress_class'],
    DatabaseNode: ['provider'],
    MessageQueueNode: ['provider'],
    LoggingSidecarNode: ['sidecar_type'],
    MonitoringNode: [],
    ServiceAccountNode: ['provider'],
}

export interface NormalizedIntegrationData {
    type: string
    item: {
        name: string
        slug: string
        provider?: string
        sidecar_type?: string
        config: Record<string, unknown>
        [key: string]: unknown
    }
}

/**
 * Normalize a raw DB row for a given node type.
 * Merges top-level operational fields into config so all consumers
 * can read from item.config consistently.
 */
export function normalizeIntegrationItem(
    nodeType: string,
    rawItem: Record<string, unknown>
): NormalizedIntegrationData {
    const operationalFields = TOP_LEVEL_OPERATIONAL_FIELDS[nodeType] || []
    const rawConfig = (rawItem.config || {}) as Record<string, unknown>

    // Merge top-level operational fields into config
    const mergedConfig: Record<string, unknown> = { ...rawConfig }
    for (const field of operationalFields) {
        if (rawItem[field] !== undefined && mergedConfig[field] === undefined) {
            mergedConfig[field] = rawItem[field]
        }
    }

    // Also ensure provider/sidecar_type is in config if present at top-level
    if (rawItem.provider && !mergedConfig.provider) {
        mergedConfig.provider = rawItem.provider
    }
    if (rawItem.sidecar_type && !mergedConfig.sidecar_type) {
        mergedConfig.sidecar_type = rawItem.sidecar_type
    }

    // Build the normalized item — keep structural fields at top level
    const item: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(rawItem)) {
        if (key !== 'config') {
            item[key] = val
        }
    }
    item.config = mergedConfig

    return {
        type: nodeType,
        item: item as NormalizedIntegrationData['item'],
    }
}
