import { FIELD_RECOMMENDATIONS, NESTED_FIELD_RECOMMENDATIONS } from '@/data/field-recommendations'
import type { Schema } from '@/types'

export type FieldClassification = 'required' | 'recommended' | 'common' | 'optional' | 'readOnly'

export const CLASSIFICATION_META: Record<FieldClassification, {
    label: string
    colorClass: string
    dotColor: string
    description: string
    defaultExpanded: boolean
}> = {
    required: {
        label: 'Required',
        colorClass: 'text-red-500',
        dotColor: 'bg-red-500',
        description: 'Must be set for a valid resource',
        defaultExpanded: true,
    },
    recommended: {
        label: 'Recommended',
        colorClass: 'text-amber-500',
        dotColor: 'bg-amber-500',
        description: 'Strongly recommended for production use',
        defaultExpanded: true,
    },
    common: {
        label: 'Common',
        colorClass: 'text-muted-foreground',
        dotColor: 'bg-muted-foreground',
        description: 'Commonly configured fields',
        defaultExpanded: true,
    },
    optional: {
        label: 'Optional',
        colorClass: 'text-muted-foreground/50',
        dotColor: 'bg-muted-foreground/50',
        description: 'Optional configuration',
        defaultExpanded: false,
    },
    readOnly: {
        label: 'Read-Only',
        colorClass: 'text-muted-foreground/50',
        dotColor: 'bg-muted-foreground/50',
        description: 'Set by the system, not user-configurable',
        defaultExpanded: false,
    },
}

export const GLOBAL_READ_ONLY_FIELDS = new Set([
    'status',
    'metadata.uid',
    'metadata.resourceVersion',
    'metadata.generation',
    'metadata.creationTimestamp',
    'metadata.deletionTimestamp',
    'metadata.deletionGracePeriodSeconds',
    'metadata.selfLink',
    'metadata.managedFields',
])

export const TOP_LEVEL_READ_ONLY = new Set(['status'])

export function isReadOnlyField(fieldName: string, _kind: string, parentPath?: string): boolean {
    if (TOP_LEVEL_READ_ONLY.has(fieldName) && !parentPath) return true
    const fullPath = parentPath ? `${parentPath}.${fieldName}` : fieldName
    return GLOBAL_READ_ONLY_FIELDS.has(fullPath)
}

/**
 * Look up nested recommendations for a field.
 * Checks kind-specific key first (e.g. "deployment.spec"), then wildcard (e.g. "*.metadata").
 */
function getNestedRecommendations(kind: string, parentPath: string) {
    const kindKey = kind.toLowerCase()
    return NESTED_FIELD_RECOMMENDATIONS[`${kindKey}.${parentPath}`]
        ?? NESTED_FIELD_RECOMMENDATIONS[`*.${parentPath}`]
        ?? null
}

export function classifyField(
    fieldName: string,
    kind: string,
    schemaRequiredArray: string[],
    parentPath?: string,
): FieldClassification {
    // 1. Top-level read-only
    if (!parentPath && TOP_LEVEL_READ_ONLY.has(fieldName)) return 'readOnly'

    // 2. Global read-only by full path
    const fullPath = parentPath ? `${parentPath}.${fieldName}` : fieldName
    if (GLOBAL_READ_ONLY_FIELDS.has(fullPath)) return 'readOnly'

    // 3. Schema required
    if (schemaRequiredArray.includes(fieldName)) return 'required'

    // 4. Per-kind recommendations — nested or top-level
    if (parentPath) {
        const nestedRecs = getNestedRecommendations(kind, parentPath)
        if (nestedRecs) {
            if (nestedRecs.recommended[fieldName]) return 'recommended'
            if (nestedRecs.common.includes(fieldName)) return 'common'
        }
    } else {
        const kindKey = kind.toLowerCase()
        const recs = FIELD_RECOMMENDATIONS[kindKey]
        if (recs) {
            if (recs.recommended[fieldName]) return 'recommended'
            if (recs.common.includes(fieldName)) return 'common'
        }
    }

    // 5. Default
    return 'optional'
}

export function classifyFields(
    schemaProperties: Record<string, Schema> | undefined,
    kind: string,
    schemaRequiredArray: string[],
    parentPath?: string,
): Map<string, FieldClassification> {
    const map = new Map<string, FieldClassification>()
    if (!schemaProperties) return map
    for (const fieldName of Object.keys(schemaProperties)) {
        map.set(fieldName, classifyField(fieldName, kind, schemaRequiredArray, parentPath))
    }
    return map
}

const CLASSIFICATION_ORDER: FieldClassification[] = ['required', 'recommended', 'common', 'optional', 'readOnly']

export function groupFieldsByClassification(
    fieldEntries: [string, Schema][],
    classifications: Map<string, FieldClassification>,
): { classification: FieldClassification; label: string; fields: [string, Schema][] }[] {
    const groups = new Map<FieldClassification, [string, Schema][]>()

    for (const entry of fieldEntries) {
        const cls = classifications.get(entry[0]) ?? 'optional'
        if (!groups.has(cls)) groups.set(cls, [])
        groups.get(cls)!.push(entry)
    }

    return CLASSIFICATION_ORDER
        .filter((cls) => groups.has(cls))
        .map((cls) => ({
            classification: cls,
            label: CLASSIFICATION_META[cls].label,
            fields: groups.get(cls)!,
        }))
}

export function getFieldEducation(fieldName: string, kind: string, parentPath?: string): string | null {
    if (parentPath) {
        const nestedRecs = getNestedRecommendations(kind, parentPath)
        if (nestedRecs) return nestedRecs.recommended[fieldName] ?? null
    } else {
        const kindKey = kind.toLowerCase()
        const recs = FIELD_RECOMMENDATIONS[kindKey]
        if (recs) return recs.recommended[fieldName] ?? null
    }
    return null
}
