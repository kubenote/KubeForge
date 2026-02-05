import { NodeWarning } from './warnings.rules.types'
import deprecations from '../../data/k8s-deprecations.json'

type RuleFunction = (node: any, index: number, context?: any) => NodeWarning | null

let warningIdCounter = 1000
function nextId(): number {
    return warningIdCounter++
}

/** Reset counter — called at the start of each evaluation cycle via the sentinel rule. */
export function resetPreDeploymentIds() {
    warningIdCounter = 1000
}

/**
 * Resolves a KindNode's full values by following #ref-<id> links to ObjectRefNodes.
 * Returns a deeply merged object representing the complete resource spec.
 */
export function resolveKindNodeValues(kindNode: any, allNodes: any[]): Record<string, any> {
    const base = kindNode.data?.values || {}
    const result = structuredClone(base)

    function resolveRefs(obj: any): any {
        if (obj === null || obj === undefined) return obj
        if (typeof obj === 'string' && obj.startsWith('#ref-')) {
            const refId = obj.replace('#ref-', '')
            const refNode = allNodes.find((n: any) => n.id === refId)
            if (refNode?.data?.values) {
                return resolveRefs(structuredClone(refNode.data.values))
            }
            return obj
        }
        if (Array.isArray(obj)) {
            return obj.map(resolveRefs)
        }
        if (typeof obj === 'object') {
            const resolved: any = {}
            for (const [key, value] of Object.entries(obj)) {
                resolved[key] = resolveRefs(value)
            }
            return resolved
        }
        return obj
    }

    return resolveRefs(result)
}

/**
 * Given a KindNode and a dot-path like "spec.template.spec.containers[0].image",
 * walk the KindNode's values following #ref- links and return { nodeId, localPath }
 * where nodeId is the ObjectRefNode (or KindNode) that actually holds the leaf value,
 * and localPath is the field path relative to that node's values.
 */
function resolveFieldOwner(
    kindNode: any,
    fieldPath: string,
    allNodes: any[]
): { nodeId: string; localPath: string } {
    // Normalise array brackets: "containers[0].image" → "containers.0.image"
    const parts = fieldPath.replace(/\[(\d+)\]/g, '.$1').split('.')
    let currentNodeId = kindNode.id
    let currentValues = kindNode.data?.values || {}
    let localParts: string[] = []

    for (let i = 0; i < parts.length; i++) {
        const key = parts[i]
        if (currentValues == null || typeof currentValues !== 'object') break
        const val = currentValues[key]

        if (typeof val === 'string' && val.startsWith('#ref-')) {
            const refId = val.replace('#ref-', '')
            const refNode = allNodes.find((n: any) => n.id === refId)
            if (refNode) {
                currentNodeId = refId
                currentValues = refNode.data?.values || {}
                localParts = [] // reset — remaining path is relative to this ref node
                continue
            }
        }

        localParts.push(key)

        if (val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val)) {
            currentValues = val
        } else if (Array.isArray(val)) {
            // Next part should be an index
            currentValues = val as any
        } else if (currentValues && typeof currentValues === 'object') {
            // Could be an array element access
            const idx = parseInt(key)
            if (!isNaN(idx) && Array.isArray(currentValues)) {
                currentValues = (currentValues as any[])[idx] || {}
            } else {
                currentValues = val as any
            }
        }
    }

    return { nodeId: currentNodeId, localPath: localParts.join('.') }
}

/**
 * Extract containers from resolved values based on resource kind.
 */
function extractContainers(resolved: Record<string, any>, kind: string): any[] {
    const workloadKinds = ['deployment', 'statefulset', 'daemonset', 'job', 'replicaset']
    const k = kind.toLowerCase()

    if (workloadKinds.includes(k)) {
        return resolved?.spec?.template?.spec?.containers || []
    }
    if (k === 'pod') {
        return resolved?.spec?.containers || []
    }
    if (k === 'cronjob') {
        return resolved?.spec?.jobTemplate?.spec?.template?.spec?.containers || []
    }
    return []
}

function isWorkloadOrPod(kind: string): boolean {
    return ['deployment', 'statefulset', 'daemonset', 'job', 'replicaset', 'pod', 'cronjob']
        .includes(kind.toLowerCase())
}

/** Helper: build a warning with resolved field owner */
function makeWarning(
    kindNode: any,
    allNodes: any[],
    opts: { ruleId: string; title: string; message: string; level: 'danger' | 'warn'; fieldPath: string }
): NodeWarning {
    const { nodeId, localPath } = resolveFieldOwner(kindNode, opts.fieldPath, allNodes)
    return {
        id: nextId(),
        ruleId: opts.ruleId,
        nodes: [nodeId],
        title: opts.title,
        message: opts.message,
        level: opts.level,
        fieldPath: localPath,
    }
}

// ─── Danger rules (1000–1999) ───

const missingResourceRequests: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode' || !isWorkloadOrPod(node.data?.kind)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const containers = extractContainers(resolved, node.data.kind)
    for (let i = 0; i < containers.length; i++) {
        const c = containers[i]
        const req = c?.resources?.requests
        if (!req?.cpu || !req?.memory) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'missing-resource-requests',
                title: 'Missing resource requests',
                message: `Container "${c.name || `[${i}]`}" in ${node.data.kind} is missing resources.requests.cpu or .memory.`,
                level: 'danger',
                fieldPath: `spec.template.spec.containers[${i}].resources`,
            })
        }
    }
    return null
}

const invalidResourceConstraints: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode' || !isWorkloadOrPod(node.data?.kind)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const containers = extractContainers(resolved, node.data.kind)
    for (let i = 0; i < containers.length; i++) {
        const c = containers[i]
        const req = c?.resources?.requests
        const lim = c?.resources?.limits
        if (!req || !lim) continue
        const parseResource = (v: any) => {
            if (typeof v === 'number') return v
            const s = String(v)
            if (s.endsWith('m')) return parseFloat(s) / 1000
            if (s.endsWith('Mi')) return parseFloat(s)
            if (s.endsWith('Gi')) return parseFloat(s) * 1024
            return parseFloat(s)
        }
        if (lim.cpu && req.cpu && parseResource(lim.cpu) < parseResource(req.cpu)) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'invalid-resource-constraints',
                title: 'Invalid resource constraints',
                message: `Container "${c.name || `[${i}]`}" has CPU limits < requests.`,
                level: 'danger',
                fieldPath: `spec.template.spec.containers[${i}].resources`,
            })
        }
        if (lim.memory && req.memory && parseResource(lim.memory) < parseResource(req.memory)) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'invalid-resource-constraints',
                title: 'Invalid resource constraints',
                message: `Container "${c.name || `[${i}]`}" has memory limits < requests.`,
                level: 'danger',
                fieldPath: `spec.template.spec.containers[${i}].resources`,
            })
        }
    }
    return null
}

const runningAsRoot: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode' || !isWorkloadOrPod(node.data?.kind)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const containers = extractContainers(resolved, node.data.kind)
    for (let i = 0; i < containers.length; i++) {
        const sc = containers[i]?.securityContext
        if (!sc) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'missing-security-context',
                title: 'Missing securityContext',
                message: `Container "${containers[i].name || `[${i}]`}" in ${node.data.kind} has no securityContext.`,
                level: 'danger',
                fieldPath: `spec.template.spec.containers[${i}].securityContext`,
            })
        }
        if (sc.runAsUser === 0 || sc.privileged === true || sc.allowPrivilegeEscalation === true) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'running-as-root',
                title: 'Running as root',
                message: `Container "${containers[i].name || `[${i}]`}" may run as root (runAsUser: 0, privileged, or allowPrivilegeEscalation).`,
                level: 'danger',
                fieldPath: `spec.template.spec.containers[${i}].securityContext`,
            })
        }
    }
    return null
}

const missingLivenessProbe: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode' || !isWorkloadOrPod(node.data?.kind)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const containers = extractContainers(resolved, node.data.kind)
    for (let i = 0; i < containers.length; i++) {
        if (!containers[i]?.livenessProbe) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'missing-liveness-probe',
                title: 'Missing liveness probe',
                message: `Container "${containers[i].name || `[${i}]`}" in ${node.data.kind} has no livenessProbe.`,
                level: 'danger',
                fieldPath: `spec.template.spec.containers[${i}].livenessProbe`,
            })
        }
    }
    return null
}

const missingReadinessProbe: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode' || !isWorkloadOrPod(node.data?.kind)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const containers = extractContainers(resolved, node.data.kind)
    for (let i = 0; i < containers.length; i++) {
        if (!containers[i]?.readinessProbe) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'missing-readiness-probe',
                title: 'Missing readiness probe',
                message: `Container "${containers[i].name || `[${i}]`}" in ${node.data.kind} has no readinessProbe.`,
                level: 'danger',
                fieldPath: `spec.template.spec.containers[${i}].readinessProbe`,
            })
        }
    }
    return null
}

const unsafeImageUsage: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode' || !isWorkloadOrPod(node.data?.kind)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const containers = extractContainers(resolved, node.data.kind)
    for (let i = 0; i < containers.length; i++) {
        const c = containers[i]
        const image = c?.image || ''
        if (image.endsWith(':latest') || (!image.includes(':') && image.length > 0)) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'unsafe-image-tag',
                title: 'Unsafe image tag',
                message: `Container "${c.name || `[${i}]`}" uses ":latest" or untagged image "${image}".`,
                level: 'danger',
                fieldPath: `spec.template.spec.containers[${i}].image`,
            })
        }
        if (image && !c?.imagePullPolicy) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'missing-image-pull-policy',
                title: 'Missing imagePullPolicy',
                message: `Container "${c.name || `[${i}]`}" has no explicit imagePullPolicy.`,
                level: 'danger',
                fieldPath: `spec.template.spec.containers[${i}].imagePullPolicy`,
            })
        }
    }
    return null
}

const defaultNamespace: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode') return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const ns = resolved?.metadata?.namespace
    if (!ns || ns === 'default') {
        return makeWarning(node, context.allNodes, {
            ruleId: 'default-namespace',
            title: 'Default or missing namespace',
            message: `${node.data.kind} is in the "default" namespace or has no namespace set.`,
            level: 'danger',
            fieldPath: 'metadata.namespace',
        })
    }
    return null
}

// ─── Warn rules (2000–2999) ───

const hardcodedReplicas: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode') return null
    const k = node.data?.kind?.toLowerCase()
    if (!['deployment', 'statefulset'].includes(k)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    if (resolved?.spec?.replicas === undefined) return null
    const allNodes = context.allNodes || []
    const hasHPA = allNodes.some((n: any) => {
        if (n.data?.kind?.toLowerCase() !== 'horizontalpodautoscaler') return false
        const hpaVals = resolveKindNodeValues(n, allNodes)
        const ref = hpaVals?.spec?.scaleTargetRef
        return ref?.name === resolved?.metadata?.name || ref?.kind?.toLowerCase() === k
    })
    if (hasHPA) return null
    return makeWarning(node, context.allNodes, {
        ruleId: 'hardcoded-replicas',
        title: 'Hardcoded replicas without HPA',
        message: `${node.data.kind} has hardcoded replicas without a HorizontalPodAutoscaler.`,
        level: 'warn',
        fieldPath: 'spec.replicas',
    })
}

const secretsInConfigMaps: RuleFunction = (node) => {
    if (node.type !== 'KindNode' || node.data?.kind?.toLowerCase() !== 'configmap') return null
    const values = node.data?.values || {}
    const data = values?.data || {}
    const sensitivePattern = /password|token|secret|api[_-]?key/i
    for (const key of Object.keys(data)) {
        if (sensitivePattern.test(key)) {
            return {
                id: nextId(),
                ruleId: 'secrets-in-configmap',
                nodes: [node.id],
                title: 'Possible secret in ConfigMap',
                message: `ConfigMap key "${key}" looks like a secret. Use a Secret resource instead.`,
                level: 'warn',
                fieldPath: `data.${key}`,
            }
        }
    }
    return null
}

const missingServiceAccount: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode' || !isWorkloadOrPod(node.data?.kind)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const k = node.data.kind.toLowerCase()
    const podSpec = ['deployment', 'statefulset', 'daemonset', 'job', 'replicaset'].includes(k)
        ? resolved?.spec?.template?.spec
        : k === 'cronjob'
            ? resolved?.spec?.jobTemplate?.spec?.template?.spec
            : resolved?.spec
    if (!podSpec?.serviceAccountName) {
        return makeWarning(node, context.allNodes, {
            ruleId: 'missing-service-account',
            title: 'Missing ServiceAccount',
            message: `${node.data.kind} has no explicit serviceAccountName set.`,
            level: 'warn',
            fieldPath: 'spec.template.spec.serviceAccountName',
        })
    }
    return null
}

const excessiveCapabilities: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode' || !isWorkloadOrPod(node.data?.kind)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const containers = extractContainers(resolved, node.data.kind)
    for (let i = 0; i < containers.length; i++) {
        const caps = containers[i]?.securityContext?.capabilities
        if (!caps) continue
        if (caps.add && caps.add.length > 0) {
            const drop = (caps.drop || []).map((d: string) => d.toUpperCase())
            if (!drop.includes('ALL')) {
                return makeWarning(node, context.allNodes, {
                    ruleId: 'excessive-capabilities',
                    title: 'Excessive Linux capabilities',
                    message: `Container "${containers[i].name || `[${i}]`}" adds capabilities without dropping ALL first.`,
                    level: 'warn',
                    fieldPath: `spec.template.spec.containers[${i}].securityContext.capabilities`,
                })
            }
        }
    }
    return null
}

const writableRootFilesystem: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode' || !isWorkloadOrPod(node.data?.kind)) return null
    const resolved = resolveKindNodeValues(node, context.allNodes)
    const containers = extractContainers(resolved, node.data.kind)
    for (let i = 0; i < containers.length; i++) {
        const sc = containers[i]?.securityContext
        if (!sc?.readOnlyRootFilesystem) {
            return makeWarning(node, context.allNodes, {
                ruleId: 'writable-root-filesystem',
                title: 'Writable root filesystem',
                message: `Container "${containers[i].name || `[${i}]`}" does not set readOnlyRootFilesystem: true.`,
                level: 'warn',
                fieldPath: `spec.template.spec.containers[${i}].securityContext.readOnlyRootFilesystem`,
            })
        }
    }
    return null
}

/**
 * Parse a version string like "v1.30.2" or "1.30" into a comparable number (1.30).
 */
function parseMinorVersion(v: string): number {
    const cleaned = v.replace(/^v/, '')
    const parts = cleaned.split('.')
    return parseFloat(`${parts[0]}.${parts[1] || '0'}`)
}

/**
 * Parse an apiVersion string like "networking.k8s.io/v1beta1" into group + version.
 */
function parseApiVersion(apiVersion: string): { group: string; version: string } {
    if (!apiVersion) return { group: '', version: '' }
    const slash = apiVersion.indexOf('/')
    if (slash === -1) {
        // core API group, e.g. "v1"
        return { group: '', version: apiVersion }
    }
    return { group: apiVersion.slice(0, slash), version: apiVersion.slice(slash + 1) }
}

const deprecatedApiVersion: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode') return null
    const kind = node.data?.kind
    const apiVersion = node.data?.apiVersion || node.data?.values?.apiVersion
    if (!kind || !apiVersion) return null

    const projectVersion = context?.projectVersion
    if (!projectVersion) return null
    const projectMinor = parseMinorVersion(projectVersion)

    const { group, version } = parseApiVersion(apiVersion)

    for (const dep of deprecations) {
        if (dep.kind !== kind || dep.group !== group || dep.version !== version) continue

        const removedMinor = parseFloat(dep.removedIn)
        const deprecatedMinor = parseFloat(dep.deprecatedIn)

        if (projectMinor >= removedMinor) {
            const replacement = dep.replacementGroup && dep.replacementVersion
                ? `Use ${dep.replacementGroup ? dep.replacementGroup + '/' : ''}${dep.replacementVersion} instead.`
                : ((dep as any).note || 'This API has been removed.')
            return {
                id: nextId(),
                ruleId: 'deprecated-api-version',
                nodes: [node.id],
                title: 'Removed API version',
                message: `${apiVersion} ${kind} was removed in Kubernetes ${dep.removedIn}. ${replacement}`,
                level: 'danger',
                fieldPath: 'apiVersion',
            }
        }

        if (projectMinor >= deprecatedMinor) {
            const replacement = dep.replacementGroup && dep.replacementVersion
                ? `Use ${dep.replacementGroup ? dep.replacementGroup + '/' : ''}${dep.replacementVersion} instead.`
                : ''
            return {
                id: nextId(),
                ruleId: 'deprecated-api-version',
                nodes: [node.id],
                title: 'Deprecated API version',
                message: `${apiVersion} ${kind} is deprecated since Kubernetes ${dep.deprecatedIn} and will be removed in ${dep.removedIn}. ${replacement}`,
                level: 'warn',
                fieldPath: 'apiVersion',
            }
        }
    }

    return null
}

const resourceNotInVersion: RuleFunction = (node, _index, context) => {
    if (node.type !== 'KindNode') return null
    const kind = node.data?.kind
    if (!kind) return null

    const projectVersion = context?.projectVersion
    const schemaGvks = context?.schemaGvks
    if (!projectVersion || !schemaGvks || !Array.isArray(schemaGvks) || schemaGvks.length === 0) return null

    // Check if any GVK entry matches this kind
    const kindExists = schemaGvks.some((gvk: any) => gvk.kind === kind)
    if (!kindExists) {
        return {
            id: nextId(),
            ruleId: 'resource-not-in-version',
            nodes: [node.id],
            title: 'Resource not in target version',
            message: `${kind} does not exist in the schema for Kubernetes ${projectVersion}. It may be a CRD or not available in this version.`,
            level: 'warn',
            fieldPath: 'kind',
        }
    }

    return null
}

export const preDeploymentRules: RuleFunction[] = [
    // Danger (1000–1999)
    missingResourceRequests,
    invalidResourceConstraints,
    runningAsRoot,
    missingLivenessProbe,
    missingReadinessProbe,
    unsafeImageUsage,
    defaultNamespace,
    // Warn (2000–2999)
    hardcodedReplicas,
    secretsInConfigMaps,
    missingServiceAccount,
    excessiveCapabilities,
    writableRootFilesystem,
    // Version-aware rules
    deprecatedApiVersion,
    resourceNotInVersion,
]
