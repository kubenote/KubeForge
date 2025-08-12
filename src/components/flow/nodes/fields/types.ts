import { Schema, FlowEdge } from "@/types"

export interface BaseFieldProps {
    label: string
    value: unknown
    schema: Schema
    path: string
    nodeId: string
    edges: FlowEdge[]
    mode?: 'kind' | 'objectRef'
    readOnly?: boolean
    kind?: string
    onChange: (path: string, val: unknown) => void
}

export interface FieldContextValue {
    isConnected: boolean
    edge?: FlowEdge
    targetHandleId: string
    valueType: string
    publish: (selfId: string, value: unknown) => void
}

export interface ComplexFieldResult {
    inlineContent: React.ReactNode
    expandedContent: React.ReactNode
}