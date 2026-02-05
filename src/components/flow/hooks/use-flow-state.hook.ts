import { useState, useEffect, useRef, useCallback } from 'react'
import { Node, Edge } from '@xyflow/react'
import DefaultFlow from '../../data/defaultFlow.json'
import { DefaultFlowData, PluginSlotEntry } from '@/types'
import { isPluginNodeType } from '@/lib/pluginAttachments'

interface UseFlowStateProps {
    initialNodes: Node[]
    initialEdges: Edge[]
    skipTemplate: boolean
    onGetCurrentState?: (callback: () => { nodes: Node[]; edges: Edge[] }) => void
}

const defaultFlowData = DefaultFlow as DefaultFlowData;

/**
 * On load: migrate old target-storage-* edges to target-plugin-* format.
 * Returns the same references if nothing changed.
 */
function migrateOldEdges(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[]; changed: boolean } {
    const hasOldEdges = edges.some((e) => e.targetHandle?.startsWith('target-storage-'));
    if (!hasOldEdges) return { nodes, edges, changed: false };

    let updatedNodes = nodes;
    const migratedEdges: Edge[] = [];

    for (const edge of edges) {
        if (edge.targetHandle?.startsWith('target-storage-')) {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const sourceType = sourceNode?.type || '';
            if (isPluginNodeType(sourceType)) {
                migratedEdges.push({
                    ...edge,
                    targetHandle: `target-plugin-${edge.target}-${edge.source}`,
                });
                updatedNodes = updatedNodes.map((node) => {
                    if (node.id !== edge.target) return node;
                    const slots: PluginSlotEntry[] = (node.data?.pluginSlots as PluginSlotEntry[] | undefined) || [];
                    if (slots.some((s) => s.sourceNodeId === edge.source)) return node;
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            pluginSlots: [...slots, { sourceNodeId: edge.source, sourceNodeType: sourceType }],
                        },
                    };
                });
            } else {
                migratedEdges.push(edge);
            }
        } else {
            migratedEdges.push(edge);
        }
    }

    return { nodes: updatedNodes, edges: migratedEdges, changed: true };
}

export const useFlowState = ({
    initialNodes,
    initialEdges,
    skipTemplate,
    onGetCurrentState
}: UseFlowStateProps) => {
    const [nodes, setNodes] = useState<Node[]>(initialNodes)
    const [edges, setEdges] = useState<Edge[]>(initialEdges)

    // Use ref to provide stable callback that always returns current state
    const stateRef = useRef({ nodes, edges })
    stateRef.current = { nodes, edges }


    // Create stable callback to get current state
    const getCurrentState = useCallback(() => stateRef.current, [])

    // Register callback to get current state
    useEffect(() => {
        if (onGetCurrentState) {
            onGetCurrentState(getCurrentState)
        }
    }, [onGetCurrentState, getCurrentState])


    // Load default flow if no initial data provided
    useEffect(() => {
        if (initialNodes.length === 0 && initialEdges.length === 0 && !skipTemplate) {
            setNodes(defaultFlowData.nodes as Node[])
            setEdges(defaultFlowData.edges as Edge[])
        }
    }, []) // Empty dependency array - only run once on mount

    // Update state when initialNodes/initialEdges change (e.g., loading a version)
    // Only reset when the prop reference actually changes (version switch, project load)
    const lastInitialNodesRef = useRef<Node[]>(initialNodes)
    const lastInitialEdgesRef = useRef<Edge[]>(initialEdges)
    const lastMigratedRef = useRef<Node[] | null>(null)
    useEffect(() => {
        if (lastInitialNodesRef.current === initialNodes && lastInitialEdgesRef.current === initialEdges) {
            return // Same references — don't overwrite user changes
        }
        lastInitialNodesRef.current = initialNodes
        lastInitialEdgesRef.current = initialEdges

        if (initialNodes.length > 0 || initialEdges.length > 0) {
            // Migrate old edge handles once per unique initialNodes reference
            if (lastMigratedRef.current !== initialNodes) {
                lastMigratedRef.current = initialNodes
                const result = migrateOldEdges(initialNodes, initialEdges)
                if (result.changed) {
                    setNodes(result.nodes)
                    setEdges(result.edges)
                    return
                }
            }
            setNodes(initialNodes)
            setEdges(initialEdges)
        }
    }, [initialNodes, initialEdges])

    return {
        nodes,
        edges,
        setNodes,
        setEdges,
        getCurrentState
    }
}
