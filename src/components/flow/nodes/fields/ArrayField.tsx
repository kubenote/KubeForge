"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
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
    FieldComponent
}: ArrayFieldProps): ComplexFieldResult => {
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
                />
            ))
        }
    }

    return {
        // Inline content that goes in the flex row
        inlineContent: (
            <>
                <Button
                    variant="ghost"
                    size="icon"
                    className="w-4 h-4 p-0 absolute left-[-8] top-1/2 -translate-y-1/2"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                </Button>

                {mode === 'objectRef' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-4 h-4 p-0"
                        onClick={handleAddItem}
                        disabled={readOnly}
                    >
                        +
                    </Button>
                )}

                <span className={`text-xs ml-2 ${getTypeColor(valueType)}`}>
                    {valueType}
                </span>
                <span className="text-xs ml-auto text-foreground">
                    {"["}
                </span>
            </>
        ),
        // Expanded content that goes below the flex row
        expandedContent: !collapsed && (
            <div className="space-y-1">
                <div className={mode === 'kind' ? "ml-2" : "ml-4"}>
                    {renderArrayFields()}
                </div>
                <Button
                    onClick={() => setCollapsed(!collapsed)}
                    variant="ghost"
                    size="sm"
                >
                    <span className="text-xs ml-auto text-foreground">{"]"}</span>
                </Button>
            </div>
        )
    }
}