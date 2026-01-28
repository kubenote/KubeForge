"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { ChevronDown, ChevronRight } from "lucide-react"
import { getTypeColor } from "../flow.node.types"
import { BaseFieldProps, ComplexFieldResult } from "./types"
// We'll use a forward reference to avoid circular imports
import { Schema } from "@/types"

interface ObjectFieldProps extends BaseFieldProps {
    valueType: string
    FieldComponent: React.ComponentType<BaseFieldProps>
}

export const ObjectField = ({ 
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
}: ObjectFieldProps): ComplexFieldResult => {
    const [collapsed, setCollapsed] = useState(mode === 'kind')

    const renderAddFieldDropdown = () => {
        if (mode !== 'objectRef') return null
        
        const existingKeys = Object.keys(value || {})
        const availableFields = Object.keys(schema?.properties || {}).filter(
            (k) => !existingKeys.includes(k)
        )
        
        return availableFields.length > 0 ? (
            <Select
                onValueChange={readOnly ? undefined : (field) => {
                    const newValue = { ...(value || {}), [field]: undefined }
                    onChange(path, newValue)
                }}
                disabled={readOnly}
            >
                <SelectTrigger className="h-6 w-full cursor-pointer">
                    <SelectValue placeholder="Add field" />
                </SelectTrigger>
                <SelectContent>
                    {availableFields.map((k) => (
                        <SelectItem key={k} value={k}>
                            {k}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        ) : null
    }

    const renderObjectFields = () => {
        if (mode === 'kind') {
            // Kind mode: show all properties from schema
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
            // ObjectRef mode: only show properties that have values
            return Object.keys(value || {}).map((k) => {
                const valueAsRecord = value as Record<string, unknown>
                return (
                    <FieldComponent
                        key={k}
                        label={k}
                        value={valueAsRecord?.[k]}
                        schema={schema?.properties?.[k] || {}}
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

                <span className={`text-xs ml-2 ${getTypeColor(valueType)}`}>
                    {valueType}
                </span>
                <span className="text-xs ml-auto text-foreground">
                    {"{"}
                </span>
            </>
        ),
        // Expanded content that goes below the flex row
        expandedContent: !collapsed && (
            <div className="space-y-1 ml-2">
                {renderObjectFields()}
                {renderAddFieldDropdown()}
                <Button
                    onClick={() => setCollapsed(!collapsed)}
                    variant="ghost"
                    size="sm"
                >
                    <span className="text-xs ml-auto text-foreground">{"}"}</span>
                </Button>
            </div>
        )
    }
}