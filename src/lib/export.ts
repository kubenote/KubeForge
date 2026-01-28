import { Node, Edge } from '@xyflow/react';
import yaml from 'js-yaml';
import JSZip from 'jszip';

export type ExportFormat = 'yaml' | 'json' | 'kustomize';

/**
 * Resolve references in node values and return clean Kubernetes objects
 */
export function resolveNodeValues(nodes: Node[], edges: Edge[]): Record<string, unknown>[] {
    const nodeValuesMap = Object.fromEntries(
        nodes.map((n) => [n.id, n.data?.values || {}])
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

    return nodes
        .filter((node) => node.type !== 'ObjectRefNode')
        .map((node) => {
            const resolved = resolveRefs(structuredClone(node.data?.values || {}));
            return resolved as Record<string, unknown>;
        });
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
