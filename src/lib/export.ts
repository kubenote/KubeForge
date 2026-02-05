import { Node, Edge } from '@xyflow/react';
import yaml from 'js-yaml';
import { buildVolumeSpec, buildVolumeMountSpec } from './volumeProviders';
import {
    buildSecretEnvFrom, buildImagePullSecret, buildConfigMapEnvFrom, buildConfigMapVolume,
    buildIngressSpec, buildDatabaseEnvVars, buildQueueEnvVars, buildLoggingSidecar,
    buildMonitoringAnnotations, buildServiceAccountSpec
} from './integrationBuilders';
import { PLUGIN_ATTACHMENTS } from './pluginAttachments';
import { PluginSlotEntry } from '@/types';

export type ExportFormat = 'yaml' | 'json' | 'kustomize';

const INTEGRATION_NODE_TYPES = new Set([
    'SecretRefNode', 'RegistryNode', 'ConfigMapNode', 'IngressNode',
    'DatabaseNode', 'MessageQueueNode', 'LoggingSidecarNode', 'MonitoringNode', 'ServiceAccountNode'
]);

/**
 * Find a named container in the resolved object's containers array.
 * Returns the container object so fields can be injected directly into it.
 */
function findContainer(resolved: Record<string, unknown>, containerName?: string): Record<string, unknown> | null {
    if (!containerName) return null;
    const containers = resolved.containers as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(containers)) return null;
    return containers.find((c) => c.name === containerName) || null;
}

/**
 * Get the injection target for container-scoped fields.
 * If a containerName is set on the slot and a matching container exists, inject there.
 * Otherwise fall back to the resolved object itself (legacy behavior).
 */
function getContainerTarget(resolved: Record<string, unknown>, containerName?: string): Record<string, unknown> {
    const container = findContainer(resolved, containerName);
    return container || resolved;
}

/**
 * Look up the pluginSlot entry for a given source node on the target node.
 */
function findSlotForSource(targetNode: Node, sourceNodeId: string): PluginSlotEntry | undefined {
    const slots = (targetNode.data?.pluginSlots as PluginSlotEntry[] | undefined) || [];
    return slots.find((s) => s.sourceNodeId === sourceNodeId);
}

/**
 * Resolve references in node values and return clean Kubernetes objects
 */
export function resolveNodeValues(nodes: Node[], edges: Edge[]): Record<string, unknown>[] {
    const nodeValuesMap = Object.fromEntries(
        nodes.map((n) => [n.id, structuredClone(n.data?.values || {})])
    );

    // Create a map of connected ObjectRef nodes
    const connectedRefs = new Set<string>();
    edges.forEach((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode?.type === 'ObjectRefNode') {
            connectedRefs.add(edge.source);
        }
    });

    const resolveRefs = (value: unknown): unknown => {
        if (Array.isArray(value)) {
            return value.map(resolveRefs);
        } else if (typeof value === 'object' && value !== null) {
            return Object.fromEntries(
                Object.entries(value).map(([k, v]) => [k, resolveRefs(v)])
            );
        } else if (typeof value === 'string' && value.startsWith('#ref-')) {
            const refNodeId = value.slice(5);
            if (connectedRefs.has(refNodeId)) {
                return nodeValuesMap[refNodeId] || {};
            }
            return {};
        }
        return value;
    };

    const resolved = nodes
        .filter((node) => node.type !== 'ObjectRefNode' && node.type !== 'StorageBucketNode' && !INTEGRATION_NODE_TYPES.has(node.type || ''))
        .map((node) => {
            const r = resolveRefs(structuredClone(node.data?.values || {}));
            return r as Record<string, unknown>;
        });

    // Resolve StorageBucketNode connections — inject volumes[] and volumeMounts[] into target nodes.
    // StorageBucketNodes are the sole authority for volumes/volumeMounts on any node they target.
    // For any node targeted by a storage edge, we strip existing volumes/volumeMounts from the
    // resolved output first, then re-inject only from currently-connected bucket nodes.
    const bucketNodes = nodes.filter((n) => n.type === 'StorageBucketNode');

    // Collect all node IDs currently targeted by any bucket node
    const currentStorageTargetIds = new Set<string>();
    for (const bn of bucketNodes) {
        const e = edges.find(
            (e) => e.source === bn.id && e.sourceHandle === `source-${bn.id}`
        );
        if (e) currentStorageTargetIds.add(e.target);
    }

    // Strip volumes/volumeMounts from targeted nodes so we rebuild them purely from edges
    for (const targetId of currentStorageTargetIds) {
        const targetNode = nodes.find((n) => n.id === targetId);
        if (!targetNode) continue;
        const targetResolved = findResolvedObject(resolved, targetNode, nodes, edges);
        if (targetResolved) {
            delete targetResolved.volumes;
            delete targetResolved.volumeMounts;
        }
    }

    // Inject volumes/volumeMounts from each connected bucket node
    for (const bucketNode of bucketNodes) {
        const data = bucketNode.data as Record<string, unknown>;

        const bucketEdge = edges.find(
            (e) => e.source === bucketNode.id && e.sourceHandle === `source-${bucketNode.id}`
        );
        if (!bucketEdge) continue;

        const targetNode = nodes.find((n) => n.id === bucketEdge.target);
        if (!targetNode) continue;

        const targetResolved = findResolvedObject(resolved, targetNode, nodes, edges);
        if (!targetResolved) continue;

        const slot = findSlotForSource(targetNode, bucketNode.id);
        const containerTarget = getContainerTarget(targetResolved, slot?.containerName);

        const item = (data.item || {}) as Record<string, unknown>;
        const bucketConfig = (item.config || {}) as Record<string, unknown>;
        const bucketData = {
            volumeName: (data.volumeName as string) || '',
            mountPath: (data.mountPath as string) || '/mnt/data',
            readOnly: (data.readOnly as boolean) || false,
            bucket: {
                provider: (item.provider as string) || 'aws-s3',
                config: { provider: (item.provider as string) || 'aws-s3', ...bucketConfig },
            },
        };
        const volumeSpec = buildVolumeSpec(bucketData);
        const mountSpec = buildVolumeMountSpec(bucketData);

        // volumes are always pod-level
        if (!targetResolved.volumes) targetResolved.volumes = [];
        (targetResolved.volumes as unknown[]).push(volumeSpec);

        // volumeMounts go on the container if specified
        if (!containerTarget.volumeMounts) containerTarget.volumeMounts = [];
        (containerTarget.volumeMounts as unknown[]).push(mountSpec);
    }

    // Resolve integration nodes — inject K8s spec fragments into target nodes
    const integrationNodes = nodes.filter((n) => INTEGRATION_NODE_TYPES.has(n.type || ''));
    const additionalResources: Record<string, unknown>[] = [];

    for (const intNode of integrationNodes) {
        const intData = intNode.data as Record<string, unknown>;
        const intEdge = edges.find(
            (e) => e.source === intNode.id && e.sourceHandle === `source-${intNode.id}`
        );
        if (!intEdge) continue;

        const targetNode = nodes.find((n) => n.id === intEdge.target);
        if (!targetNode) continue;

        const targetResolved = findResolvedObject(resolved, targetNode, nodes, edges);
        if (!targetResolved) continue;

        const item = (intData.item || {}) as Record<string, unknown>;
        const config = (item.config || {}) as Record<string, unknown>;
        const slug = item.slug as string | undefined;

        // Look up slot for container-scoped injection
        const slot = findSlotForSource(targetNode, intNode.id);
        const containerTarget = getContainerTarget(targetResolved, slot?.containerName);

        switch (intNode.type) {
            case 'SecretRefNode': {
                if (!containerTarget.envFrom) containerTarget.envFrom = [];
                (containerTarget.envFrom as unknown[]).push(buildSecretEnvFrom(config));
                break;
            }
            case 'RegistryNode': {
                // pod-level
                if (!targetResolved.imagePullSecrets) targetResolved.imagePullSecrets = [];
                (targetResolved.imagePullSecrets as unknown[]).push(buildImagePullSecret(config));
                break;
            }
            case 'ConfigMapNode': {
                if (config.mountType === 'volume') {
                    const { volume, volumeMount } = buildConfigMapVolume(config, slug);
                    // volumes are pod-level
                    if (!targetResolved.volumes) targetResolved.volumes = [];
                    (targetResolved.volumes as unknown[]).push(volume);
                    // volumeMounts are container-scoped
                    if (!containerTarget.volumeMounts) containerTarget.volumeMounts = [];
                    (containerTarget.volumeMounts as unknown[]).push(volumeMount);
                } else {
                    if (!containerTarget.envFrom) containerTarget.envFrom = [];
                    (containerTarget.envFrom as unknown[]).push(buildConfigMapEnvFrom(config));
                }
                break;
            }
            case 'IngressNode': {
                const ingressSpec = buildIngressSpec(config);
                const metadata = targetResolved.metadata as Record<string, unknown> | undefined;
                const name = (metadata?.name as string) || 'app';
                additionalResources.push({
                    apiVersion: 'networking.k8s.io/v1',
                    kind: 'Ingress',
                    metadata: { name: `${name}-ingress` },
                    spec: ingressSpec,
                });
                break;
            }
            case 'DatabaseNode': {
                const envVars = buildDatabaseEnvVars(config);
                if (!containerTarget.env) containerTarget.env = [];
                (containerTarget.env as unknown[]).push(...envVars);
                break;
            }
            case 'MessageQueueNode': {
                const envVars = buildQueueEnvVars(config);
                if (!containerTarget.env) containerTarget.env = [];
                (containerTarget.env as unknown[]).push(...envVars);
                break;
            }
            case 'LoggingSidecarNode': {
                // pod-level: volumes and sidecar container
                const { container, volumes, appVolumeMount } = buildLoggingSidecar(config, slug);
                if (!targetResolved.volumes) targetResolved.volumes = [];
                (targetResolved.volumes as unknown[]).push(...volumes);
                // volumeMount for the app container is container-scoped
                if (!containerTarget.volumeMounts) containerTarget.volumeMounts = [];
                (containerTarget.volumeMounts as unknown[]).push(appVolumeMount);
                // Add sidecar as additional container (pod-level)
                if (!targetResolved.containers) targetResolved.containers = [];
                (targetResolved.containers as unknown[]).push(container);
                break;
            }
            case 'MonitoringNode': {
                const annotations = buildMonitoringAnnotations(config);
                if (!targetResolved.metadata) targetResolved.metadata = {};
                const meta = targetResolved.metadata as Record<string, unknown>;
                if (!meta.annotations) meta.annotations = {};
                Object.assign(meta.annotations as Record<string, string>, annotations);
                break;
            }
            case 'ServiceAccountNode': {
                // pod-level
                const { serviceAccountName } = buildServiceAccountSpec(config);
                targetResolved.serviceAccountName = serviceAccountName;
                break;
            }
        }
    }

    resolved.push(...additionalResources);

    return resolved;
}

/**
 * Find the resolved output object for a given target node.
 * If the target is a KindNode, return the corresponding resolved object directly.
 * If the target is an ObjectRefNode, walk up the edge chain to find the root KindNode's resolved object,
 * then navigate into the nested path to find the right sub-object.
 */
function findResolvedObject(
    resolved: Record<string, unknown>[],
    targetNode: Node,
    allNodes: Node[],
    allEdges: Edge[]
): Record<string, unknown> | null {
    if (targetNode.type === 'KindNode') {
        const kindNodes = allNodes.filter((n) => n.type === 'KindNode');
        const idx = kindNodes.findIndex((n) => n.id === targetNode.id);
        return idx >= 0 ? resolved[idx] : null;
    }

    if (targetNode.type === 'ObjectRefNode') {
        // Find the edge from this ObjectRefNode to its parent
        const outEdge = allEdges.find(
            (e) => e.source === targetNode.id && e.sourceHandle === `source-${targetNode.id}`
        );
        if (!outEdge) return null;

        const parentNode = allNodes.find((n) => n.id === outEdge.target);
        if (!parentNode) return null;

        const parentResolved = findResolvedObject(resolved, parentNode, allNodes, allEdges);
        if (!parentResolved) return null;

        // Navigate into the objectRef field
        const objectRef = (targetNode.data as Record<string, unknown>).objectRef as string;
        if (objectRef && parentResolved[objectRef] && typeof parentResolved[objectRef] === 'object') {
            return parentResolved[objectRef] as Record<string, unknown>;
        }
    }

    return null;
}

/**
 * Export nodes to YAML format
 */
export function exportToYaml(nodes: Node[], edges: Edge[]): string {
    const data = resolveNodeValues(nodes, edges);

    try {
        if (Array.isArray(data)) {
            return data.map((doc) => yaml.dump(doc)).join('\n---\n');
        }
        return yaml.dump(data);
    } catch (e) {
        return '# Error converting to YAML:\n' + (e instanceof Error ? e.message : String(e));
    }
}

/**
 * Export nodes to JSON format with pretty printing
 */
export function exportToJson(nodes: Node[], edges: Edge[]): string {
    const data = resolveNodeValues(nodes, edges);

    try {
        return JSON.stringify(data, null, 2);
    } catch (e) {
        return '// Error converting to JSON:\n' + (e instanceof Error ? e.message : String(e));
    }
}

/**
 * Generate a slug from a Kubernetes resource
 */
function getResourceSlug(resource: Record<string, unknown>): string {
    const kind = (resource.kind as string || 'resource').toLowerCase();
    const metadata = resource.metadata as Record<string, unknown> | undefined;
    const name = (metadata?.name as string || 'unnamed').toLowerCase();
    return `${kind}-${name}`;
}

/**
 * Export nodes to Kustomize format (returns a zip file as Blob)
 */
export async function exportToKustomize(nodes: Node[], edges: Edge[]): Promise<Blob> {
    const JSZip = (await import('jszip')).default;
    const data = resolveNodeValues(nodes, edges);
    const zip = new JSZip();

    // Create base directory
    const baseDir = zip.folder('base');
    if (!baseDir) {
        throw new Error('Failed to create base directory');
    }

    const resourceFiles: string[] = [];

    // Create individual resource files
    data.forEach((resource, index) => {
        const slug = getResourceSlug(resource);
        const filename = `${slug}.yaml`;
        resourceFiles.push(filename);

        try {
            const yamlContent = yaml.dump(resource);
            baseDir.file(filename, yamlContent);
        } catch (e) {
            console.error(`Failed to export resource ${index}:`, e);
        }
    });

    // Create kustomization.yaml
    const kustomization = {
        apiVersion: 'kustomize.config.k8s.io/v1beta1',
        kind: 'Kustomization',
        resources: resourceFiles,
    };

    baseDir.file('kustomization.yaml', yaml.dump(kustomization));

    // Create a README
    const readme = `# Kustomize Base

This directory contains Kubernetes resources exported from KubeForge.

## Usage

Apply with kustomize:
\`\`\`bash
kubectl apply -k base/
\`\`\`

Or preview the output:
\`\`\`bash
kubectl kustomize base/
\`\`\`

## Resources

${resourceFiles.map((f) => `- ${f}`).join('\n')}
`;

    zip.file('README.md', readme);

    return await zip.generateAsync({ type: 'blob' });
}

/**
 * Download content as a file
 */
export function downloadFile(content: string | Blob, filename: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Get file extension for export format
 */
export function getFileExtension(format: ExportFormat): string {
    switch (format) {
        case 'yaml':
            return 'yaml';
        case 'json':
            return 'json';
        case 'kustomize':
            return 'zip';
        default:
            return 'txt';
    }
}

/**
 * Get content type for export format
 */
export function getContentType(format: ExportFormat): string {
    switch (format) {
        case 'yaml':
            return 'text/yaml';
        case 'json':
            return 'application/json';
        case 'kustomize':
            return 'application/zip';
        default:
            return 'text/plain';
    }
}
