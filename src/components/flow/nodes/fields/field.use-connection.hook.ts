import { useEffect } from "react"
import { publish, subscribe } from "@/lib/eventBus"
import { FlowEdge } from "@/types"

interface UseFieldConnectionProps {
    edges: FlowEdge[]
    nodeId: string
    label: string
    valueType: string
    path: string
    onChange: (path: string, val: unknown) => void
}

export const useFieldConnection = ({
    edges,
    nodeId,
    label,
    valueType,
    path,
    onChange
}: UseFieldConnectionProps) => {
    const targetHandleId = `target-${label}`
    const edge = edges.find((e) => e.target === nodeId && e.targetHandle === targetHandleId)
    const isConnected = !!edge

    useEffect(() => {
        if (!isConnected || !edge?.source || !edge.sourceHandle) return

        const field = edge.sourceHandle.replace("source-", "")
        const sourceFieldId = `${edge.source}.${field}`

        if (valueType !== "objectRef") {
            const unsub = subscribe(sourceFieldId, (val) => {
                onChange(path, val)
            })
            return unsub
        } else {
            const refValue = edge.source
            onChange(path, `#ref-${refValue}`)

            const selfId = `${nodeId}.${label}`
            publish(selfId, `#ref-${refValue}`)
        }
    }, [isConnected, edge?.source, edge?.sourceHandle, nodeId, label, path, onChange, valueType])

    return {
        isConnected,
        edge,
        targetHandleId
    }
}