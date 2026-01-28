import { useState, useEffect, useRef, useCallback } from 'react'
import { Node, Edge } from '@xyflow/react'
import DefaultFlow from '../../data/defaultFlow.json'
import { DefaultFlowData } from '@/types'

interface UseFlowStateProps {
    initialNodes: Node[]
    initialEdges: Edge[]
    skipTemplate: boolean
    onGetCurrentState?: (callback: () => { nodes: Node[]; edges: Edge[] }) => void
}

const defaultFlowData = DefaultFlow as DefaultFlowData;

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
    useEffect(() => {
        if (initialNodes.length > 0 || initialEdges.length > 0) {
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