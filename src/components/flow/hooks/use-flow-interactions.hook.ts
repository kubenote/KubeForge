import { useState, useCallback, useRef } from 'react'
import {
    Node,
    Edge,
    Connection,
    NodeChange,
    EdgeChange,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge
} from '@xyflow/react'
import { isPluginNodeType } from '@/lib/pluginAttachments'
import { PluginSlotEntry } from '@/types'

export const useFlowInteractions = () => {
    const [menu, setMenu] = useState<{
        id: string
        top: number
        left: number
        right?: number
        bottom?: number
    } | null>(null)

    const ref = useRef<HTMLDivElement>(null)

    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: Node) => {
            event.preventDefault()

            if (!ref.current) return

            const pane = ref.current.getBoundingClientRect()
            setMenu({
                id: node.id,
                top: event.clientY < pane.height - 200 ? event.clientY - 100 : 0,
                left: event.clientX < pane.width - 200 ? event.clientX - 300 : 0,
                right: event.clientX >= pane.width - 200 ? pane.width - event.clientX : undefined,
                bottom: event.clientY >= pane.height - 200 ? pane.height - event.clientY : undefined,
            })
        },
        []
    )

    // Close the context menu if it's open whenever the window is clicked
    const onPaneClick = useCallback(() => setMenu(null), [])

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => (nodesSnapshot: Node[]) => applyNodeChanges(changes, nodesSnapshot),
        []
    )

    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => (edgesSnapshot: Edge[]) => applyEdgeChanges(changes, edgesSnapshot),
        []
    )

    const onConnect = useCallback(
        (params: Connection) => (edgesSnapshot: Edge[]) => addEdge(params, edgesSnapshot),
        []
    )

    /**
     * When a plugin connects to a target-plugin-* handle, add a PluginSlotEntry
     * to the target node's data.pluginSlots.
     */
    const handlePluginConnect = useCallback(
        (params: Connection, nodesSnapshot: Node[]): Node[] => {
            const targetHandle = params.targetHandle || ''
            if (!targetHandle.startsWith('target-plugin-')) return nodesSnapshot

            const sourceNodeType = nodesSnapshot.find((n) => n.id === params.source)?.type || ''
            if (!isPluginNodeType(sourceNodeType)) return nodesSnapshot

            const targetId = params.target
            return nodesSnapshot.map((node) => {
                if (node.id !== targetId) return node
                const currentSlots: PluginSlotEntry[] = (node.data?.pluginSlots as PluginSlotEntry[] | undefined) || []
                if (currentSlots.some((s) => s.sourceNodeId === params.source)) return node
                const newSlot: PluginSlotEntry = {
                    sourceNodeId: params.source!,
                    sourceNodeType,
                }
                return { ...node, data: { ...node.data, pluginSlots: [...currentSlots, newSlot] } }
            })
        },
        []
    )

    /**
     * When edges are deleted, remove corresponding PluginSlotEntry from target nodes.
     */
    const handlePluginEdgeDelete = useCallback(
        (deletedEdges: Edge[], nodesSnapshot: Node[]): Node[] => {
            const pluginEdges = deletedEdges.filter(
                (e) => e.targetHandle && e.targetHandle.startsWith('target-plugin-')
            )
            if (pluginEdges.length === 0) return nodesSnapshot

            return nodesSnapshot.map((node) => {
                const slotsToRemove = pluginEdges
                    .filter((e) => e.target === node.id)
                    .map((e) => e.source)

                if (slotsToRemove.length === 0) return node

                const currentSlots: PluginSlotEntry[] = (node.data?.pluginSlots as PluginSlotEntry[] | undefined) || []
                const updatedSlots = currentSlots.filter((s) => !slotsToRemove.includes(s.sourceNodeId))
                return { ...node, data: { ...node.data, pluginSlots: updatedSlots } }
            })
        },
        []
    )

    return {
        menu,
        ref,
        onNodeContextMenu,
        onPaneClick,
        onNodesChange,
        onEdgesChange,
        onConnect,
        handlePluginConnect,
        handlePluginEdgeDelete,
    }
}
