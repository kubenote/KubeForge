import { useEffect, useCallback } from 'react';
import { Node, Edge, useReactFlow } from '@xyflow/react';
import { nanoid } from 'nanoid';

interface UseKeyboardShortcutsOptions {
    isReadOnly: boolean;
    onSave?: () => void;
    setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
    setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

/**
 * Hook for handling keyboard shortcuts in the flow editor
 * Shortcuts:
 * - Delete/Backspace: Remove selected nodes and connected edges
 * - Ctrl+S: Trigger manual save
 * - Ctrl+D: Duplicate selected nodes
 * - Escape: Deselect all
 */
export function useKeyboardShortcuts({
    isReadOnly,
    onSave,
    setNodes,
    setEdges,
}: UseKeyboardShortcutsOptions) {
    const { getNodes, getEdges, setNodes: rfSetNodes, setEdges: rfSetEdges } = useReactFlow();

    /**
     * Delete selected nodes and their connected edges
     */
    const deleteSelected = useCallback(() => {
        if (isReadOnly) return;

        const nodes = getNodes();
        const edges = getEdges();

        const selectedNodeIds = nodes
            .filter((node) => node.selected)
            .map((node) => node.id);

        if (selectedNodeIds.length === 0) return;

        // Remove selected nodes
        const remainingNodes = nodes.filter((node) => !node.selected);

        // Remove edges connected to deleted nodes
        const remainingEdges = edges.filter(
            (edge) =>
                !selectedNodeIds.includes(edge.source) &&
                !selectedNodeIds.includes(edge.target)
        );

        setNodes(remainingNodes);
        setEdges(remainingEdges);
    }, [isReadOnly, getNodes, getEdges, setNodes, setEdges]);

    /**
     * Duplicate selected nodes with offset
     */
    const duplicateSelected = useCallback(() => {
        if (isReadOnly) return;

        const nodes = getNodes();
        const edges = getEdges();

        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length === 0) return;

        // Create mapping from old IDs to new IDs
        const idMapping: Record<string, string> = {};
        selectedNodes.forEach((node) => {
            idMapping[node.id] = nanoid();
        });

        // Clone nodes with new IDs and offset position
        const newNodes: Node[] = selectedNodes.map((node) => ({
            ...node,
            id: idMapping[node.id],
            position: {
                x: node.position.x + 50,
                y: node.position.y + 50,
            },
            selected: true,
            data: JSON.parse(JSON.stringify(node.data)), // Deep clone data
        }));

        // Clone edges between selected nodes (with new source/target IDs)
        const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
        const newEdges: Edge[] = edges
            .filter(
                (edge) =>
                    selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target)
            )
            .map((edge) => ({
                ...edge,
                id: nanoid(),
                source: idMapping[edge.source],
                target: idMapping[edge.target],
            }));

        // Deselect original nodes
        const updatedNodes = nodes.map((node) =>
            node.selected ? { ...node, selected: false } : node
        );

        setNodes([...updatedNodes, ...newNodes]);
        setEdges([...edges, ...newEdges]);
    }, [isReadOnly, getNodes, getEdges, setNodes, setEdges]);

    /**
     * Deselect all nodes and edges
     */
    const deselectAll = useCallback(() => {
        const nodes = getNodes();
        const edges = getEdges();

        const updatedNodes = nodes.map((node) =>
            node.selected ? { ...node, selected: false } : node
        );
        const updatedEdges = edges.map((edge) =>
            edge.selected ? { ...edge, selected: false } : edge
        );

        setNodes(updatedNodes);
        setEdges(updatedEdges);
    }, [getNodes, getEdges, setNodes, setEdges]);

    /**
     * Handle keyboard events
     */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if target is an input field
            const target = e.target as HTMLElement;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target.isContentEditable
            ) {
                return;
            }

            // Delete/Backspace - Delete selected
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteSelected();
                return;
            }

            // Ctrl+S / Cmd+S - Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (onSave) {
                    onSave();
                }
                return;
            }

            // Ctrl+D / Cmd+D - Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                duplicateSelected();
                return;
            }

            // Escape - Deselect all
            if (e.key === 'Escape') {
                e.preventDefault();
                deselectAll();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deleteSelected, duplicateSelected, deselectAll, onSave]);

    return {
        deleteSelected,
        duplicateSelected,
        deselectAll,
    };
}
