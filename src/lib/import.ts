import { nanoid } from 'nanoid';
import { Node, Edge } from '@xyflow/react';

interface NodeData {
  kind: string;
  apiVersion: string;
  [key: string]: unknown;
}

export interface YamlDocWithSource {
  doc: NodeData;
  sourceFile?: string;
}

export function importYamlToNodes(
  input: NodeData[] | YamlDocWithSource[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let yOffset = 50;

  // Normalize input
  const docs: YamlDocWithSource[] = input.map((item) => {
    if ('doc' in item && typeof item.doc === 'object') {
      return item as YamlDocWithSource;
    }
    return { doc: item as NodeData };
  });

  docs.forEach(({ doc: yamlData, sourceFile }, docIndex) => {
    try {
      const kind = yamlData.kind;
      const mainNodeId = nanoid();
      const xOffset = 200 + docIndex * 400;

      const mainNodeValues: Record<string, unknown> = {};
      const refNodes: { id: string; key: string; values: Record<string, unknown> }[] = [];

      let refYOffset = yOffset + 200;

      for (const key of Object.keys(yamlData)) {
        const value = yamlData[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const refId = nanoid();
          mainNodeValues[key] = `#ref-${refId}`;
          refNodes.push({ id: refId, key, values: value as Record<string, unknown> });
        } else {
          mainNodeValues[key] = value;
        }
      }

      nodes.push({
        id: mainNodeId,
        type: 'KindNode',
        position: { x: xOffset, y: yOffset },
        data: {
          type: kind.toLowerCase(),
          kind,
          values: mainNodeValues,
          ...(sourceFile ? { sourceFile } : {}),
        },
      });

      for (const refNode of refNodes) {
        nodes.push({
          id: refNode.id,
          type: 'ObjectRefNode',
          position: { x: xOffset - 300, y: refYOffset },
          data: {
            kind,
            objectRef: refNode.key,
            values: refNode.values,
            ...(sourceFile ? { sourceFile } : {}),
          },
        });

        edges.push({
          id: `${refNode.id}-${mainNodeId}`,
          source: refNode.id,
          sourceHandle: `source-${refNode.id}`,
          target: mainNodeId,
          targetHandle: `target-${refNode.key}`,
        });

        refYOffset += 300;
      }

      yOffset += Math.max(600, refYOffset - yOffset + 100);
    } catch (err) {
      console.error('Error importing YAML to flow nodes:', err);
    }
  });

  return { nodes, edges };
}
