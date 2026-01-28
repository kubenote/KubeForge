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

    return {
        menu,
        ref,
        onNodeContextMenu,
        onPaneClick,
        onNodesChange,
        onEdgesChange,
        onConnect
    }
}