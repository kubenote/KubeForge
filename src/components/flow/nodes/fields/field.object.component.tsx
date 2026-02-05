"use client"

import { useState } from "react"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight } from "lucide-react"
import { getTypeColor } from "../flow.node.types"
import { BaseFieldProps, ComplexFieldResult } from "./field.types"
import { Schema } from "@/types"

const TYPE_DEFAULTS: Record<string, unknown> = {
    string: '',
    integer: 0,
    boolean: false,
    object: {},
    array: [],
};

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
    FieldComponent,
    depth = 0
}: ObjectFieldProps & { depth?: number }): ComplexFieldResult => {
    const [collapsed, setCollapsed] = useState(mode === 'kind')
    const [addFieldOpen, setAddFieldOpen] = useState(false)
    const [newFieldName, setNewFieldName] = useState('')
    const [newFieldType, setNewFieldType] = useState('string')

    const renderAddFieldDropdown = () => {
        if (mode !== 'objectRef' || readOnly) return null

        const existingKeys = Object.keys(value || {})
        const availableFields = Object.keys(schema?.properties || {}).filter(
            (k) => !existingKeys.includes(k)
        )

        return (
            <>
                <Select
                    value=""
                    onValueChange={(field) => {
                        if (field === '__custom__') {
                            setAddFieldOpen(true)
                            setNewFieldName('')
                            setNewFieldType('string')
                        } else {
                            const newValue = { ...(value || {}), [field]: undefined }
                            onChange(path, newValue)
                        }
                    }}
                >
                    <SelectTrigger className="h-6 w-full cursor-pointer bg-background">
                        <SelectValue placeholder="Add field" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableFields.map((k) => (
                            <SelectItem key={k} value={k}>
                                {k}
                            </SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-muted-foreground italic border-t mt-1 pt-1">
                            + Custom field...
                        </SelectItem>
                    </SelectContent>
                </Select>
                <Dialog open={addFieldOpen} onOpenChange={setAddFieldOpen}>
                    <DialogContent className="max-w-xs">
                        <DialogHeader>
                            <DialogTitle>Add Custom Field</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <Input
                                placeholder="Field name"
                                value={newFieldName}
                                onChange={(e) => setNewFieldName(e.target.value)}
                            />
                            <Select value={newFieldType} onValueChange={setNewFieldType}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {['string', 'integer', 'boolean', 'object', 'array'].map((t) => (
                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button
                                size="sm"
                                disabled={!newFieldName.trim() || existingKeys.includes(newFieldName.trim())}
                                onClick={() => {
                                    const name = newFieldName.trim()
                                    const newValue = { ...(value || {}), [name]: TYPE_DEFAULTS[newFieldType] ?? '' }
                                    onChange(path, newValue)
                                    setAddFieldOpen(false)
                                }}
                            >
                                Add
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        )
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
                        depth={depth + 1}
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
                        depth={depth + 1}
                        onRemove={() => {
                            const updated = { ...(value as Record<string, unknown>) }
                            delete updated[k]
                            onChange(path, updated)
                        }}
                    />
                )
            })
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

                <span className={`text-xs shrink-0 ${getTypeColor(valueType)} order-2`}>
                    {valueType}
                </span>
            </>
        ),
        // Expanded content that goes below the flex row
        expandedContent: !collapsed && (
            <div className="ml-[11px] pl-3 space-y-1 pb-1 border-l border-border">
                {renderObjectFields()}
                {renderAddFieldDropdown()}
            </div>
        )
    }
}
