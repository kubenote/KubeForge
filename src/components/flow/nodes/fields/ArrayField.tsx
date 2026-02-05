"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { getTypeColor } from "../flow.node.types"
import { publish } from "@/lib/eventBus"
import { BaseFieldProps, ComplexFieldResult } from "./types"
// Using prop-based FieldComponent to avoid circular imports
import { Schema } from "@/types"

interface ArrayFieldProps extends BaseFieldProps {
    valueType: string
    FieldComponent: React.ComponentType<BaseFieldProps>
}

export const ArrayField = ({
    label,
    value,
    schema,
    path,
    nodeId,
    edges,
    mode = 'kind',
    readOnly = false,
    kind,
    onChange,
    valueType,
    FieldComponent,
    depth = 0
}: ArrayFieldProps & { depth?: number }): ComplexFieldResult => {
    const [collapsed, setCollapsed] = useState(mode === 'kind')

    const handleAddItem = () => {
        const newItem = {}
        const updatedArray = Array.isArray(value) ? [...value, newItem] : [newItem]
        onChange(path, updatedArray)

        const selfId = `${nodeId}.${label}`
        publish(selfId, updatedArray)
        setCollapsed(false)
    }

    const renderArrayFields = () => {
        if (mode === 'kind') {
            return Object.entries(schema?.properties ?? {}).map(([k, s]) => {
                const valueAsRecord = value as Record<string, unknown>
                return (
                    <FieldComponent
                        key={k}
                        label={k}
                        value={valueAsRecord?.[k]}
                        schema={s as Schema}
                        path={`${path}.${k}`}
                        onChange={onChange}
                        nodeId={nodeId}
                        kind={kind}
                        edges={edges}
                        mode={mode}
                        readOnly={readOnly}
                        depth={depth + 1}
                    />
                )
            })
        } else {
            return Array.isArray(value) && value.map((item, index) => (
                <FieldComponent
                    key={index}
                    label={`${label}[${index}]`}
                    value={item}
                    schema={schema?.items || {}}
                    path={`${path}.${index}`}
                    onChange={onChange}
                    nodeId={nodeId}
                    edges={edges}
                    mode={mode}
                    readOnly={readOnly}
                    depth={depth + 1}
                    onRemove={() => {
                        const updated = (value as unknown[]).filter((_, i) => i !== index)
                        onChange(path, updated)
                    }}
                />
            ))
        }
    }

    return {
        // Inline content that goes in the flex row
        inlineContent: (
            <>
                <button
                    className="shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-muted order-0"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </button>

                {mode === 'objectRef' && !readOnly && (
                    <button
                        className="shrink-0 w-4 h-4 flex items-center justify-center rounded text-xs hover:bg-muted order-2"
                        onClick={handleAddItem}
                    >
                        +
                    </button>
                )}

                <span className={`text-xs shrink-0 ${getTypeColor(valueType)} order-2`}>
                    {valueType}
                </span>
            </>
        ),
        // Expanded content that goes below the flex row
        expandedContent: !collapsed && (
            <div className="ml-[11px] pl-3 space-y-1 pb-1 border-l border-border">
                {renderArrayFields()}
            </div>
        )
    }
}
