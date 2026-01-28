import { useCallback, useRef } from 'react';
import { Node, Edge, useReactFlow } from '@xyflow/react';
import { nanoid } from 'nanoid';

interface ClipboardData {
    nodes: Node[];
    edges: Edge[];
}

interface UseClipboardOptions {
    isReadOnly: boolean;
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

const CLIPBOARD_KEY = 'kubeforge-clipboard';

/**
 * Hook for handling copy/paste operations on flow nodes
 * Supports Ctrl+C, Ctrl+V, Ctrl+X with proper ID regeneration
 */
export function useClipboard({
    isReadOnly,
    setNodes,
    setEdges,
}: UseClipboardOptions) {
    const { getNodes, getEdges } = useReactFlow();
    const clipboardRef = useRef<ClipboardData | null>(null);

    /**
     * Copy selected nodes and their interconnecting edges to clipboard
     */
    const copySelected = useCallback(async () => {
        const nodes = getNodes();
        const edges = getEdges();

        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length === 0) return;

        const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

        // Get edges that connect selected nodes
        const selectedEdges = edges.filter(
            (edge) =>
                selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
        );

        // Deep clone to avoid reference issues
        const clipboardData: ClipboardData = {
            nodes: JSON.parse(JSON.stringify(selectedNodes)),
            edges: JSON.parse(JSON.stringify(selectedEdges)),
        };

        // Store in local ref
        clipboardRef.current = clipboardData;

        // Also try to write to system clipboard
        try {
            await navigator.clipboard.writeText(JSON.stringify(clipboardData));
        } catch (err) {
            // Fallback to localStorage if system clipboard fails
            try {
                localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(clipboardData));
            } catch (storageErr) {
                console.error('Failed to write to clipboard:', storageErr);
            }
        }
    }, [getNodes, getEdges]);

    /**
     * Paste nodes from clipboard with regenerated IDs
     */
    const pasteFromClipboard = useCallback(async () => {
        if (isReadOnly) return;

        let clipboardData: ClipboardData | null = null;

        // Try to read from local ref first
        clipboardData = clipboardRef.current;

        // If no local data, try system clipboard
        if (!clipboardData) {
            try {
                const text = await navigator.clipboard.readText();
                const parsed = JSON.parse(text);
                if (parsed.nodes && Array.isArray(parsed.nodes)) {
                    clipboardData = parsed;
                }
            } catch (err) {
                // Try localStorage fallback
                try {
                    const stored = localStorage.getItem(CLIPBOARD_KEY);
                    if (stored) {
                        clipboardData = JSON.parse(stored);
                    }
                } catch (storageErr) {
                    console.error('Failed to read from clipboard:', storageErr);
                }
            }
        }

        if (!clipboardData || clipboardData.nodes.length === 0) return;

        // Create mapping from old IDs to new IDs
        const idMapping: Record<string, string> = {};
        clipboardData.nodes.forEach((node) => {
            idMapping[node.id] = nanoid();
        });

        // Clone nodes with new IDs and offset position
        const newNodes: Node[] = clipboardData.nodes.map((node) => ({
            ...node,
            id: idMapping[node.id],
            position: {
                x: node.position.x + 50,
                y: node.position.y + 50,
            },
            selected: true,
            data: JSON.parse(JSON.stringify(node.data)),
        }));

        // Clone edges with remapped source/target IDs
        const newEdges: Edge[] = clipboardData.edges.map((edge) => ({
            ...edge,
            id: nanoid(),
            source: idMapping[edge.source],
            target: idMapping[edge.target],
        }));

        // Deselect existing nodes before adding new ones
        setNodes((prev) => {
            const deselected = prev.map((node) =>
                node.selected ? { ...node, selected: false } : node
            );
            return [...deselected, ...newNodes];
        });

        setEdges((prev) => [...prev, ...newEdges]);
    }, [isReadOnly, setNodes, setEdges]);

    /**
     * Cut selected nodes (copy then delete)
     */
    const cutSelected = useCallback(async () => {
        if (isReadOnly) return;

        const nodes = getNodes();
        const edges = getEdges();

        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length === 0) return;

        // First copy
        await copySelected();

        // Then delete
        const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

        const remainingNodes = nodes.filter((node) => !node.selected);
        const remainingEdges = edges.filter(
            (edge) =>
                !selectedNodeIds.has(edge.source) &&
                !selectedNodeIds.has(edge.target)
        );

        setNodes(remainingNodes);
        setEdges(remainingEdges);
    }, [isReadOnly, getNodes, getEdges, copySelected, setNodes, setEdges]);

    /**
     * Check if there's data in clipboard
     */
    const hasClipboardData = useCallback(() => {
        return clipboardRef.current !== null && clipboardRef.current.nodes.length > 0;
    }, []);

    return {
        copySelected,
        pasteFromClipboard,
        cutSelected,
        hasClipboardData,
    };
}
