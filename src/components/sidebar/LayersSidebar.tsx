'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { ListTree, FileText, Braces, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreeNode {
    id: string;
    label: string;
    type: string;
    children: TreeNode[];
}

function buildTree(nodes: any[], edges: any[]): TreeNode[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const childIds = new Set<string>();

    // Build parent->children map from edges
    const childrenMap = new Map<string, string[]>();
    for (const edge of edges) {
        // edge.target is the parent-side in many flow graphs, but in this codebase
        // edges go source(child) -> target(parent) for ObjectRefNodes,
        // and source(integration) -> target(KindNode) for plugin edges.
        // Actually let's check both directions - find ObjectRefNodes connected to KindNodes
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) continue;

        // ObjectRefNode or integration node pointing to a KindNode or ObjectRefNode
        if (targetNode.type === 'KindNode' || targetNode.type === 'ObjectRefNode') {
            if (!childrenMap.has(edge.target)) childrenMap.set(edge.target, []);
            childrenMap.get(edge.target)!.push(edge.source);
            childIds.add(edge.source);
        }
    }

    function buildNode(nodeId: string): TreeNode {
        const node = nodeMap.get(nodeId)!;
        const childNodeIds = childrenMap.get(nodeId) || [];
        const children = childNodeIds
            .map(id => nodeMap.get(id))
            .filter(Boolean)
            .map(child => buildNode(child!.id));

        let label: string;
        if (node.type === 'KindNode') {
            label = `${node.data?.kind || 'Unknown'}.yaml`;
        } else if (node.type === 'ObjectRefNode') {
            label = node.data?.objectRef || 'ref';
        } else {
            label = node.data?.item?.name || node.type?.replace('Node', '') || node.id;
        }

        return { id: node.id, label, type: node.type, children };
    }

    const roots: TreeNode[] = [];

    // KindNodes are always roots
    for (const node of nodes) {
        if (node.type === 'KindNode') {
            roots.push(buildNode(node.id));
        }
    }

    // Orphan nodes (not KindNode, not a child of anything)
    for (const node of nodes) {
        if (node.type !== 'KindNode' && !childIds.has(node.id)) {
            roots.push(buildNode(node.id));
        }
    }

    return roots;
}

function TreeItem({
    node,
    depth,
    selectedId,
    onSelect,
}: {
    node: TreeNode;
    depth: number;
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children.length > 0;
    const isKind = node.type === 'KindNode';
    const isObjectRef = node.type === 'ObjectRefNode';

    return (
        <div>
            <button
                onClick={() => onSelect(node.id)}
                className={cn(
                    'flex items-center gap-1.5 w-full text-left text-sm py-1 px-2 rounded-md transition-colors hover:bg-sidebar-accent/50',
                    selectedId === node.id && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
                {hasChildren ? (
                    <span
                        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                        className="shrink-0 cursor-pointer"
                    >
                        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </span>
                ) : (
                    <span className="w-3.5 shrink-0" />
                )}
                {isKind ? (
                    <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                ) : isObjectRef ? (
                    <Braces className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                ) : (
                    <Braces className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{node.label}</span>
            </button>
            {hasChildren && expanded && (
                <div>
                    {node.children.map(child => (
                        <TreeItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function LayersSidebar() {
    const { fitView } = useReactFlow();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Subscribe reactively to node/edge changes
    const nodes = useStore(useCallback((s: any) => s.nodes, []));
    const edges = useStore(useCallback((s: any) => s.edges, []));

    const tree = useMemo(() => buildTree(nodes, edges), [nodes, edges]);

    const handleSelect = useCallback((nodeId: string) => {
        setSelectedId(nodeId);
        fitView({ nodes: [{ id: nodeId }], duration: 400, padding: 0.3 });
    }, [fitView]);

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-3 py-2 pb-4 border-b">
                <ListTree className="w-4 h-4" />
                <span className="font-medium text-sm">Layers</span>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
                {tree.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-3 py-2">No nodes in graph</p>
                ) : (
                    tree.map(node => (
                        <TreeItem
                            key={node.id}
                            node={node}
                            depth={0}
                            selectedId={selectedId}
                            onSelect={handleSelect}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
